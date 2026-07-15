/**
 * Backfill script — Closed Beta audit (FASE 1.2)
 *
 * mediaAccessService.ts's own top comment documents the gap this closes:
 * photos/selfies uploaded before Sprint 3 have a full public https:// URL
 * saved in storagePath/blurredPath/selfieStoragePath (uploaded via the old
 * uploadFile() with ACL: 'public-read', storage.ts). isStorageKey() treats
 * any such value as "already usable" and signMediaUrl() returns it
 * unchanged — mediaAccessPolicy.ts still decides CLEAN/BLURRED/NONE
 * correctly, but the underlying R2 object itself is publicly reachable
 * forever: once someone has the URL (viewed it, cached it, shared it
 * before being blocked/revoked), it keeps working with no TTL and no
 * per-request permission check, because a public bucket object has no
 * concept of "revoke".
 *
 * This script re-uploads every legacy public object through
 * uploadPrivateFile() (no ACL — only reachable via a short-TTL presigned
 * URL minted per-viewer through mediaAccessPolicy), rewrites the DB row to
 * point at the new private key, and deletes the old public object so the
 * previously-shared/cached URL stops resolving. From that point on, the
 * row is indistinguishable from a normal Sprint-3+ upload and goes through
 * the exact same signed-URL/access-policy path as everything else — no
 * schema change, no route change, no behavior change for any caller.
 *
 * Safe to run multiple times (idempotent — isStorageKey() already-private
 * rows are skipped). Requires STORAGE_* env vars (same ones the app needs
 * to serve photos at all) and outbound network access to fetch the
 * existing public STORAGE_PUBLIC_URL objects.
 *
 * Run once, manually, against production, after deploying this sprint:
 *   npm run db:backfill-legacy-media
 *   npm run db:backfill-legacy-media -- --dry-run   (report only, no writes)
 */
import prisma from '../lib/prisma'
import { uploadPrivateFile, deleteFile } from '../lib/storage'
import { isStorageKey, extractStorageKey } from '../lib/mediaAccessService'

const DRY_RUN = process.argv.includes('--dry-run')

const migrateLegacyUrl = async (
  url: string,
  label: string
): Promise<{ key: string } | null> => {
  try {
    const res = await fetch(url)
    if (!res.ok) {
      console.error(`[BACKFILL] ${label}: fetch failed (${res.status}) for ${url}`)
      return null
    }
    const buffer = Buffer.from(await res.arrayBuffer())
    const contentType = res.headers.get('content-type') || 'image/jpeg'
    const filename = url.split('/').pop() || `${label}-${Date.now()}`

    if (DRY_RUN) {
      console.log(`[BACKFILL] (dry-run) would migrate ${label} <- ${url} (${buffer.length} bytes)`)
      return { key: '(dry-run)' }
    }

    const { key } = await uploadPrivateFile(buffer, filename, contentType)
    return { key }
  } catch (err: any) {
    console.error(`[BACKFILL] ${label}: error migrating ${url} — ${err.message}`)
    return null
  }
}

async function migratePhotos() {
  const photos = await prisma.profilePhoto.findMany({
    select: { id: true, storagePath: true, blurredPath: true }
  })
  const legacy = photos.filter(p => !isStorageKey(p.storagePath) || (p.blurredPath && !isStorageKey(p.blurredPath)))
  console.log(`[BACKFILL] ProfilePhoto: ${photos.length} total, ${legacy.length} with a legacy public URL.`)

  let migrated = 0
  for (const photo of legacy) {
    const oldStorageKey = !isStorageKey(photo.storagePath) ? extractStorageKey(photo.storagePath) : null
    const oldBlurredKey = photo.blurredPath && !isStorageKey(photo.blurredPath) ? extractStorageKey(photo.blurredPath) : null

    const newStorage = !isStorageKey(photo.storagePath) ? await migrateLegacyUrl(photo.storagePath, `photo ${photo.id} storagePath`) : null
    const newBlurred = photo.blurredPath && !isStorageKey(photo.blurredPath) ? await migrateLegacyUrl(photo.blurredPath, `photo ${photo.id} blurredPath`) : null

    if (DRY_RUN) continue

    const data: { storagePath?: string; blurredPath?: string } = {}
    if (newStorage) data.storagePath = newStorage.key
    if (newBlurred) data.blurredPath = newBlurred.key
    if (Object.keys(data).length === 0) continue

    await prisma.profilePhoto.update({ where: { id: photo.id }, data })
    if (oldStorageKey && newStorage) await deleteFile(oldStorageKey)
    if (oldBlurredKey && newBlurred) await deleteFile(oldBlurredKey)
    migrated++
  }
  console.log(`[BACKFILL] ProfilePhoto: migrated ${migrated}/${legacy.length}.`)
}

async function migrateSelfies() {
  const verifications = await prisma.verification.findMany({
    where: { selfieStoragePath: { not: null } },
    select: { id: true, selfieStoragePath: true }
  })
  const legacy = verifications.filter(v => v.selfieStoragePath && !isStorageKey(v.selfieStoragePath))
  console.log(`[BACKFILL] Verification: ${verifications.length} with a selfie, ${legacy.length} with a legacy public URL.`)

  let migrated = 0
  for (const v of legacy) {
    const oldKey = extractStorageKey(v.selfieStoragePath)
    const migratedResult = await migrateLegacyUrl(v.selfieStoragePath!, `verification ${v.id} selfie`)
    if (DRY_RUN || !migratedResult) continue

    await prisma.verification.update({ where: { id: v.id }, data: { selfieStoragePath: migratedResult.key } })
    if (oldKey) await deleteFile(oldKey)
    migrated++
  }
  console.log(`[BACKFILL] Verification: migrated ${migrated}/${legacy.length}.`)
}

async function main() {
  if (DRY_RUN) console.log('[BACKFILL] --dry-run: reporting only, no writes, no deletes.')
  await migratePhotos()
  await migrateSelfies()
  console.log('[BACKFILL] Done.')
}

main()
  .catch(err => { console.error('[BACKFILL] Failed:', err); process.exit(1) })
  .finally(() => process.exit(0))
