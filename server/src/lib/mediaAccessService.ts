// 3.1 — MediaAccessService
//
// Turns storage keys into short-lived signed URLs and wires MediaAccessPolicy
// up to real data (active matches, approved access requests). Every read
// route that serializes a ProfilePhoto (or verification selfie) to JSON
// should go through resolvePhotoForViewer / resolveSelfieForViewer instead of
// exposing storagePath/blurredPath/selfieStoragePath directly.
//
// Storage note: uploadPrivateFile() (storage.ts) stores objects WITHOUT a
// public ACL and this service returns keys, not URLs. isStorageKey() detects
// the difference so photos uploaded before this sprint (which have a full
// public https:// URL saved in storagePath) keep working unchanged — signing
// is a no-op for those, they're already publicly resolvable. Only new
// uploads get real access control. See Sprint 3 delivery notes for the
// migration gap this leaves on pre-existing photos.

import prisma from './prisma'
import { decideMediaAccessLevel, canAccessVerificationSelfie, type MediaAccessLevel } from './mediaAccessPolicy'

const DEFAULT_TTL_SECONDS = 300 // 5 minutes — long enough to load a page, short enough to limit link-sharing exposure

// data: URIs show up as a dev-mode fallback (see auth.ts POST /avatar when
// STORAGE_ENDPOINT isn't set) — must be treated as "already a usable URL",
// same as a real https:// one, never as something to sign as an R2 key.
export const isStorageKey = (value?: string | null): boolean =>
  !!value && !/^(https?:|data:)/i.test(value)

// 3.6 — shared with the hard-delete job: turns any stored photo/selfie
// value (legacy public URL OR post-Sprint-3 private key) into the plain R2
// object key deleteFile() expects. Mirrors the same dual-mode extraction
// already inlined in photos.ts/verifications.ts deletes.
export const extractStorageKey = (value?: string | null): string | null => {
  if (!value) return null
  if (isStorageKey(value)) return value
  try {
    return new URL(value).pathname.replace(/^\//, '') || null
  } catch {
    return null
  }
}

let s3Client: any = null
const getClient = async () => {
  if (s3Client) return s3Client
  const { S3Client } = await import('@aws-sdk/client-s3')
  s3Client = new S3Client({
    region: 'auto',
    endpoint: process.env.STORAGE_ENDPOINT,
    credentials: {
      accessKeyId: process.env.STORAGE_ACCESS_KEY!,
      secretAccessKey: process.env.STORAGE_SECRET_KEY!
    }
  })
  return s3Client
}

const isConfigured = !!(
  process.env.STORAGE_ENDPOINT &&
  process.env.STORAGE_ACCESS_KEY &&
  process.env.STORAGE_SECRET_KEY &&
  process.env.STORAGE_BUCKET
)

export const signMediaUrl = async (
  keyOrUrl?: string | null,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): Promise<string | null> => {
  if (!keyOrUrl) return null
  if (!isStorageKey(keyOrUrl)) return keyOrUrl // legacy public URL — nothing to sign
  if (!isConfigured) return keyOrUrl // dev/placeholder mode

  try {
    const { GetObjectCommand } = await import('@aws-sdk/client-s3')
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner')
    const client = await getClient()
    const cmd = new GetObjectCommand({ Bucket: process.env.STORAGE_BUCKET, Key: keyOrUrl })
    return await getSignedUrl(client, cmd, { expiresIn: ttlSeconds })
  } catch (err: any) {
    console.error('[MEDIA ACCESS] sign failed', err.message)
    return null
  }
}

interface PhotoRecord {
  id: string
  profileId: string
  storagePath: string
  blurredPath: string | null
  visibilityLevel: string
  moderationStatus: string
}

const hasActiveMatchBetween = async (viewerProfileId: string | null, ownerProfileId: string): Promise<boolean> => {
  if (!viewerProfileId) return false
  const match = await prisma.match.findFirst({
    where: {
      status: 'ACTIVE',
      OR: [
        { profileOneId: viewerProfileId, profileTwoId: ownerProfileId },
        { profileOneId: ownerProfileId, profileTwoId: viewerProfileId }
      ]
    },
    select: { id: true }
  })
  return !!match
}

const hasApprovedRequest = async (photoId: string, viewerUserId: string | null): Promise<boolean> => {
  if (!viewerUserId) return false
  const request = await prisma.photoAccessRequest.findUnique({
    where: { photoId_requesterId: { photoId, requesterId: viewerUserId } },
    select: { status: true }
  })
  return request?.status === 'APPROVED'
}

export interface ResolvedPhoto {
  id: string
  url: string
  accessLevel: MediaAccessLevel
  isPrimary?: boolean
}

// Resolves ONE photo for ONE viewer. ownerUserId/ownerProfileId are the
// photo's profile owner; viewerUserId/viewerProfileId identify who's asking
// (null for admin-moderation-only contexts where there's no "viewer").
export const resolvePhotoForViewer = async (
  photo: PhotoRecord,
  params: {
    ownerUserId: string
    viewerUserId: string | null
    viewerProfileId: string | null
    isAdminModeration?: boolean
  }
): Promise<ResolvedPhoto | null> => {
  const isOwner = !!params.viewerUserId && params.viewerUserId === params.ownerUserId
  const [hasActiveMatch, hasApprovedAccessRequest] = await Promise.all([
    isOwner ? Promise.resolve(false) : hasActiveMatchBetween(params.viewerProfileId, photo.profileId),
    isOwner ? Promise.resolve(false) : hasApprovedRequest(photo.id, params.viewerUserId)
  ])

  const level = decideMediaAccessLevel(photo, {
    isOwner,
    isAdminModeration: !!params.isAdminModeration,
    hasActiveMatch,
    hasApprovedAccessRequest
  })

  if (level === 'NONE') return null

  const sourcePath = level === 'CLEAN' ? photo.storagePath : (photo.blurredPath || photo.storagePath)
  const url = await signMediaUrl(sourcePath)
  if (!url) return null

  return { id: photo.id, url, accessLevel: level }
}

// Batch helper for list endpoints (discovery, profile detail) — resolves
// each photo in parallel and drops the ones the viewer can't see at all.
export const resolvePhotosForViewer = async (
  photos: PhotoRecord[],
  params: { ownerUserId: string; viewerUserId: string | null; viewerProfileId: string | null; isAdminModeration?: boolean }
): Promise<ResolvedPhoto[]> => {
  const resolved = await Promise.all(photos.map(p => resolvePhotoForViewer(p, params)))
  return resolved.filter((r): r is ResolvedPhoto => r !== null)
}

// Same as resolvePhotosForViewer, but preserves every other field on the
// original photo record (isPrimary, sortOrder, visibilityLevel, etc.) and
// only overwrites storagePath with the signed URL / drops blurredPath —
// for callers whose client code already expects the full ProfilePhoto shape.
export const mergePhotosForViewer = async <T extends PhotoRecord>(
  photos: T[],
  params: { ownerUserId: string; viewerUserId: string | null; viewerProfileId: string | null; isAdminModeration?: boolean }
): Promise<Array<Omit<T, 'blurredPath'> & { storagePath: string; accessLevel: MediaAccessLevel }>> => {
  const merged = await Promise.all(photos.map(async photo => {
    const resolved = await resolvePhotoForViewer(photo, params)
    if (!resolved) return null
    const { blurredPath, ...rest } = photo as any
    return { ...rest, storagePath: resolved.url, accessLevel: resolved.accessLevel }
  }))
  return merged.filter((p): p is any => p !== null)
}

export const resolveVerificationSelfieUrl = async (
  selfieStoragePath: string | null,
  ctx: { isOwner: boolean; isAdminModeration: boolean }
): Promise<string | null> => {
  if (!selfieStoragePath) return null
  if (!canAccessVerificationSelfie(ctx)) return null
  return signMediaUrl(selfieStoragePath, 120) // shorter TTL — this is the most sensitive asset in the app
}
