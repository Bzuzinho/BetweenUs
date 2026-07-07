// 10.14 — Guide V2: drafts stay hidden from the public list/detail routes,
// locale filtering, and the explicit publish/unpublish action keeping
// published/publishedAt in sync (10.1's gradual-migration bridge).
import request from 'supertest'
import app from './app'
import { prisma, createTestUser } from './helpers'

const createArticle = (overrides: any = {}) =>
  (prisma as any).guideArticle.create({
    data: {
      title: overrides.title || 'Como definir limites em casal',
      slug: overrides.slug || `limites-casal-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      category: overrides.category || 'COUPLES',
      body: overrides.body || 'Corpo do artigo.',
      published: overrides.published ?? false,
      publishedAt: overrides.publishedAt ?? null,
      locale: overrides.locale || 'pt',
    }
  })

describe('Guide V2 — public visibility', () => {
  it('does not list an unpublished (draft) article', async () => {
    const user = await createTestUser({ email: 'guide-draft@test.com' })
    await createArticle({ published: false, title: 'Rascunho escondido' })

    const res = await request(app).get('/api/guide')
      .set('Authorization', `Bearer ${user.accessToken}`)
    expect(res.status).toBe(200)
    expect(res.body.articles.find((a: any) => a.title === 'Rascunho escondido')).toBeUndefined()
  })

  it('does not return a draft article via the slug detail route', async () => {
    const user = await createTestUser({ email: 'guide-draft-detail@test.com' })
    const article = await createArticle({ published: false, slug: 'draft-detail-test' })

    const res = await request(app).get(`/api/guide/${article.slug}`)
      .set('Authorization', `Bearer ${user.accessToken}`)
    expect(res.status).toBe(404)
  })

  it('lists a published article and returns its full body on detail', async () => {
    const user = await createTestUser({ email: 'guide-pub@test.com' })
    const article = await createArticle({ published: true, publishedAt: new Date(), slug: 'published-detail-test', body: 'Texto completo do artigo.' })

    const list = await request(app).get('/api/guide')
      .set('Authorization', `Bearer ${user.accessToken}`)
    expect(list.body.articles.find((a: any) => a.id === article.id)).toBeDefined()

    const detail = await request(app).get(`/api/guide/${article.slug}`)
      .set('Authorization', `Bearer ${user.accessToken}`)
    expect(detail.status).toBe(200)
    expect(detail.body.body).toBe('Texto completo do artigo.')
  })

  it('filters by locale', async () => {
    const user = await createTestUser({ email: 'guide-locale@test.com' })
    await createArticle({ published: true, publishedAt: new Date(), locale: 'en', title: 'English Article', slug: 'en-article-test' })
    await createArticle({ published: true, publishedAt: new Date(), locale: 'pt', title: 'Artigo Português', slug: 'pt-article-test' })

    const res = await request(app).get('/api/guide?locale=en')
      .set('Authorization', `Bearer ${user.accessToken}`)
    const titles = res.body.articles.map((a: any) => a.title)
    expect(titles).toContain('English Article')
    expect(titles).not.toContain('Artigo Português')
  })
})

describe('Guide V2 — admin publish/unpublish (published <-> publishedAt bridge)', () => {
  it('publishing stamps publishedAt; unpublishing clears it', async () => {
    const admin = await createTestUser({ email: 'guide-admin@test.com', adminRole: 'ADMIN' })
    const article = await createArticle({ published: false, slug: 'publish-bridge-test' })

    const pub = await request(app).post(`/api/guide/admin/${article.id}/publish`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    expect(pub.status).toBe(200)
    expect(pub.body.published).toBe(true)
    expect(pub.body.publishedAt).toBeTruthy()

    const unpub = await request(app).post(`/api/guide/admin/${article.id}/unpublish`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
    expect(unpub.status).toBe(200)
    expect(unpub.body.published).toBe(false)
    expect(unpub.body.publishedAt).toBeNull()
  })

  it('a non-admin cannot publish an article', async () => {
    const user = await createTestUser({ email: 'guide-nonadmin@test.com' })
    const article = await createArticle({ published: false, slug: 'publish-forbidden-test' })

    const res = await request(app).post(`/api/guide/admin/${article.id}/publish`)
      .set('Authorization', `Bearer ${user.accessToken}`)
    expect(res.status).toBe(403)
  })
})
