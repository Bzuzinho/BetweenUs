import { Router, Response, Request } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { requireAdmin, logAdminAction } from '../middleware/admin'
import { generateArticleSlug, estimateReadingTime, applyPublishState } from '../lib/guideService'
import { getRecommendedArticles, GUIDE_CONTEXTS } from '../lib/guideRecommendationService'

const router = Router()

// 10.2 — controlled catalog (Prisma enum), not free text anymore.
const CATEGORIES = ['CONSENT', 'COUPLES', 'OPEN_RELATIONSHIPS', 'POLYAMORY', 'PRIVACY', 'SAFETY', 'PROFILES', 'FIRST_MEETINGS', 'PRIVATE_INTERESTS'] as const
const GUIDE_LOCALES = ['pt', 'en', 'fr'] as const

export const normalizeGuideLocale = (value: unknown): typeof GUIDE_LOCALES[number] => {
  const locale = String(value || 'pt').toLowerCase().split('-')[0]
  return GUIDE_LOCALES.includes(locale as typeof GUIDE_LOCALES[number])
    ? locale as typeof GUIDE_LOCALES[number]
    : 'pt'
}

const publicSelect = {
  id: true, slug: true, title: true, category: true, summary: true, icon: true, coverPath: true,
  authorId: true, publishedAt: true, readingTime: true, locale: true, sortOrder: true, createdAt: true, updatedAt: true
}

// GET /api/guide — public list of published articles. 10.3 — category and
// locale are explicit query filters, both optional.
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category } = req.query
    const locale = normalizeGuideLocale(req.query.locale)
    const articles = await (prisma as any).guideArticle.findMany({
      where: {
        published: true,
        ...(category ? { category: category as string } : {}),
        locale,
      },
      select: publicSelect,
      orderBy: { sortOrder: 'asc' }
    })
    res.json({ articles })
  } catch {
    // Table may not exist yet — return empty
    res.json({ articles: [] })
  }
})

// GET /api/guide/:slug — public article detail (full body). 10.1 fixes a
// real bug: the list endpoint above never included `body` (it uses
// publicSelect, deliberately light for a list view), but the client's
// article-open flow used to just reuse the already-fetched list item —
// meaning no real article body was EVER shown before this. The client
// now fetches this route on open.
router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const article = await (prisma as any).guideArticle.findFirst({
      where: { slug: req.params.slug, published: true }
    })
    if (!article) return res.status(404).json({ error: 'Artigo não encontrado.' })
    res.json(article)
  } catch {
    res.status(404).json({ error: 'Artigo não encontrado.' })
  }
})

// GET /api/guide/contextual/:context — 10.4: rule-based suggestions for a
// known in-product moment (Modo Acordo, Soft Reveal, SafetyCheckin,
// Private Interests). No auth required — same visibility as the public
// list, just pre-filtered/ranked for a specific context.
router.get('/contextual/:context', async (req: Request, res: Response) => {
  const context = req.params.context as any
  if (!GUIDE_CONTEXTS.includes(context)) return res.status(400).json({ error: 'Contexto desconhecido.' })
  const articles = await getRecommendedArticles(context, 3, normalizeGuideLocale(req.query.locale))
  res.json({ articles })
})

// ─── Admin CRUD ─────────────────────────────────────────────────────────────
// GET /api/guide/admin/all — everything, draft or published.
router.get('/admin/all', requireAuth, requireAdmin('guide'), async (req: AuthRequest, res: Response) => {
  try {
    const articles = await (prisma as any).guideArticle.findMany({ orderBy: { sortOrder: 'asc' } })
    res.json({ articles })
  } catch {
    res.json({ articles: [] })
  }
})

const createSchema = z.object({
  title:     z.string().min(2).max(120),
  category:  z.enum(CATEGORIES),
  summary:   z.string().max(300).optional(),
  body:      z.string().max(20000),
  icon:      z.string().max(4).optional(),
  coverPath: z.string().optional(),
  published: z.boolean().default(false),
  sortOrder: z.number().default(0),
  locale:    z.string().default('pt'),
  readingTime: z.number().optional(),
  seoTitle:    z.string().max(160).optional(),
  seoDescription: z.string().max(320).optional(),
  slug:      z.string().optional(), // if omitted, generated from title
})

// POST /api/guide/admin — create article
router.post('/admin', requireAuth, requireAdmin('guide'), async (req: AuthRequest, res: Response) => {
  try {
    const data = createSchema.parse(req.body)
    const slug = data.slug ? data.slug : await generateArticleSlug(data.title)
    const readingTime = data.readingTime ?? estimateReadingTime(data.body)
    const publishState = applyPublishState({ publishedAt: null }, data.published)

    const article = await (prisma as any).guideArticle.create({
      data: { ...data, slug, readingTime, authorId: req.userId, ...publishState }
    })
    await logAdminAction(req.userId!, 'CREATE_GUIDE_ARTICLE', 'guide_article', article.id, { newData: { title: data.title, slug }, ipAddress: req.ip })
    res.status(201).json(article)
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    if (err.code === 'P2002') return res.status(400).json({ error: 'Slug já em uso.' })
    res.status(500).json({ error: 'Erro interno.' })
  }
})

const updateSchema = createSchema.partial()

// PUT /api/guide/admin/:id — update article
router.put('/admin/:id', requireAuth, requireAdmin('guide'), async (req: AuthRequest, res: Response) => {
  try {
    const data = updateSchema.parse(req.body)
    const prev = await (prisma as any).guideArticle.findUnique({ where: { id: req.params.id } })
    if (!prev) return res.status(404).json({ error: 'Artigo não encontrado.' })

    const publishState = data.published !== undefined ? applyPublishState(prev, data.published) : {}
    const readingTime = data.body ? (data.readingTime ?? estimateReadingTime(data.body)) : data.readingTime

    const article = await (prisma as any).guideArticle.update({
      where: { id: req.params.id },
      data: { ...data, ...(readingTime !== undefined ? { readingTime } : {}), ...publishState }
    })
    await logAdminAction(req.userId!, 'UPDATE_GUIDE_ARTICLE', 'guide_article', article.id, {
      previousData: { title: prev.title, published: prev.published },
      newData: data, ipAddress: req.ip
    })
    res.json(article)
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// POST /api/guide/admin/:id/publish — 10.3 explicit publish action.
router.post('/admin/:id/publish', requireAuth, requireAdmin('guide'), async (req: AuthRequest, res: Response) => {
  const prev = await (prisma as any).guideArticle.findUnique({ where: { id: req.params.id } })
  if (!prev) return res.status(404).json({ error: 'Artigo não encontrado.' })
  const article = await (prisma as any).guideArticle.update({ where: { id: req.params.id }, data: applyPublishState(prev, true) })
  await logAdminAction(req.userId!, 'PUBLISH_GUIDE_ARTICLE', 'guide_article', article.id, { ipAddress: req.ip })
  res.json(article)
})

// POST /api/guide/admin/:id/unpublish
router.post('/admin/:id/unpublish', requireAuth, requireAdmin('guide'), async (req: AuthRequest, res: Response) => {
  const prev = await (prisma as any).guideArticle.findUnique({ where: { id: req.params.id } })
  if (!prev) return res.status(404).json({ error: 'Artigo não encontrado.' })
  const article = await (prisma as any).guideArticle.update({ where: { id: req.params.id }, data: applyPublishState(prev, false) })
  await logAdminAction(req.userId!, 'UNPUBLISH_GUIDE_ARTICLE', 'guide_article', article.id, { ipAddress: req.ip })
  res.json(article)
})

// DELETE /api/guide/admin/:id
router.delete('/admin/:id', requireAuth, requireAdmin('guide'), async (req: AuthRequest, res: Response) => {
  try {
    const article = await (prisma as any).guideArticle.findUnique({ where: { id: req.params.id } })
    await (prisma as any).guideArticle.delete({ where: { id: req.params.id } })
    await logAdminAction(req.userId!, 'DELETE_GUIDE_ARTICLE', 'guide_article', req.params.id, {
      previousData: article ? { title: article.title } : undefined, ipAddress: req.ip
    })
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

export default router
