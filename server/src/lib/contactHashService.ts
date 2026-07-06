// 3.5 — ContactHashService: HMAC key versioning for blocked-contact hashes.
//
// Every BlockedContactHash row now records which secret (keyVersion)
// produced it. This does NOT let us "re-encrypt" hashes computed under a
// retired secret — HMAC is one-way and we never store the original email/
// phone, by design (see the T10 comment this replaces in contacts.ts). What
// it buys us:
//   1. A rotation runbook that doesn't silently break existing blocks: old
//      rows keep working (matched against the secret their keyVersion
//      points to) while new rows use the newly active secret.
//   2. Visibility into rotation progress (getKeyVersionStats) instead of
//      finding out months later that some blocks quietly stopped working.
//
// To retire an old secret entirely, the only correct path is: bump
// CONTACT_HASH_ACTIVE_VERSION, keep the OLD secret env var in place for a
// grace period, then have affected users re-submit their contact list
// (DELETE /blocked + POST /block) so their rows move to the new version —
// there's no way to force this migration server-side without the plaintext.
import { createHmac } from 'crypto'
import prisma from './prisma'

const isProd = process.env.NODE_ENV === 'production'

// Add a new version here + a new env var when rotating. Keep retired
// versions in this map (with their env var) for as long as any
// BlockedContactHash row still references them.
const SECRET_ENV_BY_VERSION: Record<number, string> = {
  1: 'CONTACT_HASH_SECRET',
  2: 'CONTACT_HASH_SECRET_V2',
}

export const getActiveKeyVersion = (): number => {
  const configured = Number(process.env.CONTACT_HASH_ACTIVE_VERSION || '1')
  return SECRET_ENV_BY_VERSION[configured] ? configured : 1
}

const DEV_FALLBACK_SECRET = 'dev-only-insecure-fallback-do-not-use-in-prod'

export const getSecretForVersion = (version: number): string => {
  const envVar = SECRET_ENV_BY_VERSION[version]
  const secret = envVar ? process.env[envVar] : undefined
  if (isProd && !secret) {
    throw new Error(`CONTACT_HASH secret for key version ${version} is required in production (${envVar || 'unknown env var'})`)
  }
  return secret || DEV_FALLBACK_SECRET
}

const hmac = (value: string, secret: string): string =>
  createHmac('sha256', secret).update(value.toLowerCase().trim()).digest('hex')

// Hashes with the CURRENTLY active version — used when writing new rows.
export const hashContact = (value: string): { hash: string; keyVersion: number } => {
  const keyVersion = getActiveKeyVersion()
  const secret = getSecretForVersion(keyVersion)
  return { hash: hmac(value, secret), keyVersion }
}

// Hashes with a SPECIFIC version — used when checking a new value against
// existing rows that may have been written under a retired version.
export const hashContactWithVersion = (value: string, keyVersion: number): string =>
  hmac(value, getSecretForVersion(keyVersion))

// Checks whether `value` matches ANY of this user's blocked contacts,
// trying each stored row's own keyVersion rather than assuming the active
// one — this is what makes rotation non-destructive for existing blocks.
export const isContactBlocked = async (userId: string, value: string): Promise<boolean> => {
  const rows: Array<{ contactHash: string; keyVersion: number }> =
    await prisma.blockedContactHash.findMany({ where: { userId }, select: { contactHash: true, keyVersion: true } })
  if (rows.length === 0) return false
  const versionsPresent = [...new Set(rows.map(r => r.keyVersion))]
  const hashesByVersion = new Map<number, string>(versionsPresent.map(v => [v, hashContactWithVersion(value, v)]))
  return rows.some(r => hashesByVersion.get(r.keyVersion) === r.contactHash)
}

export interface KeyVersionStats {
  keyVersion: number
  count: number
}

// Ops visibility for rotation progress — how many rows are still on each
// key version. Migration is "done" once only the active version remains.
export const getKeyVersionStats = async (): Promise<KeyVersionStats[]> => {
  const grouped = await prisma.blockedContactHash.groupBy({
    by: ['keyVersion'],
    _count: { _all: true }
  })
  return grouped
    .map(g => ({ keyVersion: g.keyVersion, count: g._count._all }))
    .sort((a, b) => a.keyVersion - b.keyVersion)
}
