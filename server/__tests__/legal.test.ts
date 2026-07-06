// 3.9 — tests for 3.3's LegalDocument versioning + reacceptance flow.
import request from 'supertest'
import app from './app'
import { prisma, createTestUser } from './helpers'

const publish = (adminToken: string, consentType: string, body: any) =>
  request(app).post(`/api/legal/admin/${consentType}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send(body)

describe('Legal documents — public read', () => {
  it('404s when no document has been published for a type', async () => {
    const res = await request(app).get('/api/legal/MARKETING')
    expect(res.status).toBe(404)
  })

  it('returns the latest published version', async () => {
    const admin = await createTestUser({ email: 'legal-admin@test.com', adminRole: 'ADMIN' })
    await publish(admin.accessToken, 'TERMS', { version: '1.0', title: 'Termos', content: 'v1 content' })
    await publish(admin.accessToken, 'TERMS', { version: '2.0', title: 'Termos', content: 'v2 content' })

    const res = await request(app).get('/api/legal/TERMS')
    expect(res.status).toBe(200)
    expect(res.body.version).toBe('2.0')
    expect(res.body.content).toBe('v2 content')
  })
})

describe('Legal documents — admin publish', () => {
  it('blocks non-admins', async () => {
    const user = await createTestUser({ email: 'not-admin@test.com' })
    const res = await publish(user.accessToken, 'TERMS', { version: '1.0', title: 'x', content: 'y' })
    expect(res.status).toBe(403)
  })

  it('rejects publishing the same version twice', async () => {
    const admin = await createTestUser({ email: 'legal-admin2@test.com', adminRole: 'ADMIN' })
    const first = await publish(admin.accessToken, 'PRIVACY_POLICY', { version: '1.0', title: 'x', content: 'y' })
    expect(first.status).toBe(201)
    const second = await publish(admin.accessToken, 'PRIVACY_POLICY', { version: '1.0', title: 'x', content: 'z' })
    expect(second.status).toBe(409)
  })
})

describe('Reacceptance flow', () => {
  it('flags pendingLegalReacceptance when a user accepted an older version', async () => {
    const admin = await createTestUser({ email: 'legal-admin3@test.com', adminRole: 'ADMIN' })
    const user = await createTestUser({ email: 'consent-user@test.com' })
    // createTestUser seeds TERMS v1.0 as already-accepted for this user (see helpers.ts)

    await publish(admin.accessToken, 'TERMS', { version: '2.0', title: 'Termos', content: 'novo conteudo', requiresReacceptance: true })

    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${user.accessToken}`)
    expect(me.status).toBe(200)
    const pending = me.body.pendingLegalReacceptance.find((p: any) => p.consentType === 'TERMS')
    expect(pending).toBeDefined()
    expect(pending.currentVersion).toBe('2.0')
    expect(pending.acceptedVersion).toBe('1.0')
  })

  it('does not flag a document published with requiresReacceptance:false', async () => {
    const admin = await createTestUser({ email: 'legal-admin4@test.com', adminRole: 'ADMIN' })
    const user = await createTestUser({ email: 'consent-user2@test.com' })

    await publish(admin.accessToken, 'PRIVACY_POLICY', { version: '9.0', title: 'x', content: 'typo fix', requiresReacceptance: false })

    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${user.accessToken}`)
    const pending = me.body.pendingLegalReacceptance.find((p: any) => p.consentType === 'PRIVACY_POLICY')
    expect(pending).toBeUndefined()
  })

  it('POST /auth/consents/reaccept clears the pending flag', async () => {
    const admin = await createTestUser({ email: 'legal-admin5@test.com', adminRole: 'ADMIN' })
    const user = await createTestUser({ email: 'consent-user3@test.com' })
    await publish(admin.accessToken, 'TERMS', { version: '3.0', title: 'Termos', content: 'novo' })

    const before = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${user.accessToken}`)
    expect(before.body.pendingLegalReacceptance.some((p: any) => p.consentType === 'TERMS')).toBe(true)

    const reaccept = await request(app).post('/api/auth/consents/reaccept')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({ consentType: 'TERMS' })
    expect(reaccept.status).toBe(200)
    expect(reaccept.body.consent.version).toBe('3.0')

    const after = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${user.accessToken}`)
    expect(after.body.pendingLegalReacceptance.some((p: any) => p.consentType === 'TERMS')).toBe(false)
  })
})
