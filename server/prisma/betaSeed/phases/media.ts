// BETA.1.14 — synthetic, clearly-labelled test photos through the REAL
// storage pipeline (uploadFile/uploadPrivateFile — never a fake
// storagePath that resolves to nothing, per the spec's explicit
// instruction). No real person's photo is used anywhere in this file —
// every image is a generated SVG with a plain text label.
import prisma from '../../../src/lib/prisma'
import { uploadFile, uploadPrivateFile } from '../../../src/lib/storage'

const svgOf = (label: string, bg: string): Buffer => Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500">` +
  `<rect width="400" height="500" fill="${bg}"/>` +
  `<text x="200" y="250" font-size="22" fill="#ffffff" text-anchor="middle" font-family="sans-serif">${label}</text>` +
  `</svg>`
)

interface PhotoSpec {
  label: string
  bg: string
  visibilityLevel: 'PUBLIC' | 'BLURRED' | 'PRIVATE_AFTER_MATCH' | 'PRIVATE_AFTER_APPROVAL'
  moderationStatus: 'PENDING' | 'APPROVED' | 'REJECTED'
  isPrimary?: boolean
}

const uploadForSpec = async (profileKey: string, index: number, spec: PhotoSpec) => {
  const filename = `${profileKey}-${index}.svg`
  const buffer = svgOf(spec.label, spec.bg)
  if (spec.visibilityLevel === 'PUBLIC' || spec.visibilityLevel === 'BLURRED') {
    const result = await uploadFile(buffer, filename, 'image/svg+xml')
    return { storagePath: result.key, blurredPath: result.blurredUrl || null }
  }
  const result = await uploadPrivateFile(buffer, filename, 'image/svg+xml')
  return { storagePath: result.key, blurredPath: null }
}

export const ensurePhoto = async (profileId: string, profileKey: string, index: number, spec: PhotoSpec) => {
  const existing = await prisma.profilePhoto.findFirst({
    where: { profileId, sortOrder: index },
  })
  if (existing) return existing
  const { storagePath, blurredPath } = await uploadForSpec(profileKey, index, spec)
  return prisma.profilePhoto.create({
    data: {
      profileId, storagePath, blurredPath,
      visibilityLevel: spec.visibilityLevel as any, moderationStatus: spec.moderationStatus as any,
      isPrimary: !!spec.isPrimary, sortOrder: index,
    },
  })
}

// One PUBLIC primary photo for every profile passed in (individuals +
// couples), plus a handful of deliberate extra cases: a PENDING photo
// (moderation queue), a REJECTED photo (moderation history), and
// PRIVATE_AFTER_APPROVAL photos for the two Soft Reveal scenarios
// (individual_sofia, couple_5_privacy).
export const seedPhotosForProfiles = async (
  profilesByKey: Record<string, { profileId: string }>,
  labelByKey: Record<string, string>
): Promise<void> => {
  let count = 0
  for (const [key, { profileId }] of Object.entries(profilesByKey)) {
    const label = labelByKey[key] || key.toUpperCase()
    await ensurePhoto(profileId, key, 0, { label: `TEST ${label}`, bg: '#2D1B4E', visibilityLevel: 'PUBLIC', moderationStatus: 'APPROVED', isPrimary: true })
    count++
  }

  // Moderation queue diversity — reuse two existing profiles rather than
  // inventing new accounts just for this.
  if (profilesByKey['individual_tiago']) {
    await ensurePhoto(profilesByKey['individual_tiago'].profileId, 'individual_tiago', 1, { label: 'TEST PENDING PHOTO', bg: '#4E1B2D', visibilityLevel: 'PUBLIC', moderationStatus: 'PENDING' })
    count++
  }
  if (profilesByKey['individual_noa']) {
    await ensurePhoto(profilesByKey['individual_noa'].profileId, 'individual_noa', 1, { label: 'TEST REJECTED PHOTO', bg: '#4E1B2D', visibilityLevel: 'PUBLIC', moderationStatus: 'REJECTED' })
    count++
  }

  // Soft Reveal — PRIVATE_AFTER_APPROVAL, gated behind PhotoAccessRequest.
  if (profilesByKey['individual_sofia']) {
    await ensurePhoto(profilesByKey['individual_sofia'].profileId, 'individual_sofia', 1, { label: 'TEST PRIVATE GALLERY', bg: '#1B4E3A', visibilityLevel: 'PRIVATE_AFTER_APPROVAL', moderationStatus: 'APPROVED' })
    count++
  }
  if (profilesByKey['couple_5_privacy']) {
    await ensurePhoto(profilesByKey['couple_5_privacy'].profileId, 'couple_5_privacy', 1, { label: 'TEST COUPLE PRIVATE', bg: '#1B4E3A', visibilityLevel: 'PRIVATE_AFTER_APPROVAL', moderationStatus: 'APPROVED' })
    count++
  }

  console.log(`  Photos: ${count}`)
}

// BETA.1.14 Soft Reveal grants — PENDING / APPROVED / REVOKED / EXPIRED,
// built via real PhotoAccessRequest/PhotoAccessApproval rows (the schema
// models, not a fake standalone flag) so mediaAccessPolicy's real access
// check can be exercised against them.
export const seedSoftRevealGrant = async (
  photoOwnerProfileId: string, requesterUserId: string, ownerUserId: string,
  status: 'PENDING' | 'APPROVED' | 'REVOKED' | 'EXPIRED'
): Promise<void> => {
  const photo = await prisma.profilePhoto.findFirst({ where: { profileId: photoOwnerProfileId, visibilityLevel: 'PRIVATE_AFTER_APPROVAL' } })
  if (!photo) return
  const existing = await (prisma as any).photoAccessRequest.findUnique({
    where: { photoId_requesterId: { photoId: photo.id, requesterId: requesterUserId } },
  })
  const data: any = {
    status,
    respondedAt: status === 'PENDING' ? null : new Date(),
    expiresAt: status === 'EXPIRED' ? new Date(Date.now() - 24 * 60 * 60 * 1000) : null,
  }
  if (existing) {
    await (prisma as any).photoAccessRequest.update({ where: { id: existing.id }, data })
  } else {
    await (prisma as any).photoAccessRequest.create({ data: { photoId: photo.id, requesterId: requesterUserId, ownerId: ownerUserId, ...data } })
  }
}
