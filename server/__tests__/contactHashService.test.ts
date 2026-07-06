// 3.9 — tests for 3.5's ContactHashService: key-version-aware hashing plus
// the one DB-touching piece (isContactBlocked / getKeyVersionStats).
import { prisma, createTestUser } from './helpers'
import {
  hashContact, hashContactWithVersion, getActiveKeyVersion,
  isContactBlocked, getKeyVersionStats,
} from '../src/lib/contactHashService'

const ORIGINAL_ENV = { ...process.env }
afterEach(() => { process.env = { ...ORIGINAL_ENV } })

describe('hashContact / hashContactWithVersion', () => {
  it('is deterministic for the same value and version', () => {
    const a = hashContactWithVersion('someone@example.com', 1)
    const b = hashContactWithVersion('someone@example.com', 1)
    expect(a).toBe(b)
  })

  it('normalises case and whitespace before hashing (same person, same hash)', () => {
    const a = hashContactWithVersion('Someone@Example.com', 1)
    const b = hashContactWithVersion('  someone@example.com  ', 1)
    expect(a).toBe(b)
  })

  it('different values hash differently', () => {
    expect(hashContactWithVersion('a@example.com', 1)).not.toBe(hashContactWithVersion('b@example.com', 1))
  })

  it('the same value under different key versions produces different hashes (proves rotation actually changes output)', () => {
    process.env.CONTACT_HASH_SECRET = 'secret-v1'
    process.env.CONTACT_HASH_SECRET_V2 = 'secret-v2'
    const v1 = hashContactWithVersion('someone@example.com', 1)
    const v2 = hashContactWithVersion('someone@example.com', 2)
    expect(v1).not.toBe(v2)
  })

  it('hashContact() uses whatever version CONTACT_HASH_ACTIVE_VERSION currently points to', () => {
    process.env.CONTACT_HASH_SECRET = 'secret-v1'
    process.env.CONTACT_HASH_SECRET_V2 = 'secret-v2'
    process.env.CONTACT_HASH_ACTIVE_VERSION = '2'
    const result = hashContact('someone@example.com')
    expect(result.keyVersion).toBe(2)
    expect(result.hash).toBe(hashContactWithVersion('someone@example.com', 2))
  })

  it('getActiveKeyVersion falls back to 1 if the configured version has no matching secret env var', () => {
    process.env.CONTACT_HASH_ACTIVE_VERSION = '99'
    expect(getActiveKeyVersion()).toBe(1)
  })
})

describe('isContactBlocked / getKeyVersionStats (DB-backed)', () => {
  it('matches a blocked contact even after the active key version changes, using the row\'s own keyVersion', async () => {
    const user = await createTestUser()

    // Simulate a block written under key version 1 (today's default)
    process.env.CONTACT_HASH_SECRET = 'secret-v1'
    const { hash, keyVersion } = hashContact('rotate-me@example.com')
    await prisma.blockedContactHash.create({
      data: { userId: user.id, contactHash: hash, keyVersion, type: 'email' }
    })

    // Now "rotate" — v2 becomes active for anything NEW, but the row above
    // must still match when checked, because isContactBlocked re-derives
    // the hash using the version recorded on the row, not the active one.
    process.env.CONTACT_HASH_SECRET_V2 = 'secret-v2'
    process.env.CONTACT_HASH_ACTIVE_VERSION = '2'

    expect(await isContactBlocked(user.id, 'rotate-me@example.com')).toBe(true)
    expect(await isContactBlocked(user.id, 'someone-else@example.com')).toBe(false)
  })

  it('getKeyVersionStats groups counts by keyVersion', async () => {
    const user = await createTestUser()
    await prisma.blockedContactHash.createMany({
      data: [
        { userId: user.id, contactHash: 'h1', keyVersion: 1, type: 'email' },
        { userId: user.id, contactHash: 'h2', keyVersion: 1, type: 'email' },
        { userId: user.id, contactHash: 'h3', keyVersion: 2, type: 'phone' },
      ]
    })
    const stats = await getKeyVersionStats()
    const v1 = stats.find(s => s.keyVersion === 1)
    const v2 = stats.find(s => s.keyVersion === 2)
    expect(v1?.count).toBeGreaterThanOrEqual(2)
    expect(v2?.count).toBeGreaterThanOrEqual(1)
  })
})
