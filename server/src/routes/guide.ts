import { Router, Response, Request } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

const CATEGORIES = ['Casais','Comunicação','Privacidade','Consentimento','Relações','Segurança','Perfil','Outro'] as const

// GET /api/guide — public list of published articles
router.get('/', async (_req: Request, res: Response) => {
  try {
    const articles = await (prisma as any).guideArticle.findMany({
      where: { published: true },
      select: { id:true, title:true, category:true, summary:true, icon:true, createdAt:true, updatedAt:true },
      orderBy: { sortOrder: 'asc' }
    })
    res.json({ articles })
  } catch {
    // Table may not exist yet — return empty
    res.json({ articles: [] })
  }
})

// GET /api/guide/:id — public article detail
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const article = await (prisma as any).guideArticle.findUnique({
      where: { id: req.params.id, published: true }
    })
    if (!article) return res.status(404).json({ error: 'Artigo não encontrado.' })
    res.json(article)
  } catch {
    res.status(404).json({ error: 'Artigo não encontrado.' })
  }
})

// Admin CRUD — requires auth
// GET /api/guide/admin/all
router.get('/admin/all', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const articles = await (prisma as any).guideArticle.findMany({
      orderBy: { sortOrder: 'asc' }
    })
    res.json({ articles })
  } catch {
    res.json({ articles: [] })
  }
})

// POST /api/guide/admin — create article
router.post('/admin', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const data = z.object({
      title:     z.string().min(2).max(120),
      category:  z.enum(CATEGORIES),
      summary:   z.string().max(300).optional(),
      body:      z.string().max(10000),
      icon:      z.string().max(4).optional(),
      published: z.boolean().default(false),
      sortOrder: z.number().default(0),
    }).parse(req.body)

    const article = await (prisma as any).guideArticle.create({ data })
    res.status(201).json(article)
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// PUT /api/guide/admin/:id — update article
router.put('/admin/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const data = z.object({
      title:     z.string().min(2).max(120).optional(),
      category:  z.enum(CATEGORIES).optional(),
      summary:   z.string().max(300).optional(),
      body:      z.string().max(10000).optional(),
      icon:      z.string().max(4).optional(),
      published: z.boolean().optional(),
      sortOrder: z.number().optional(),
    }).parse(req.body)

    const article = await (prisma as any).guideArticle.update({
      where: { id: req.params.id },
      data
    })
    res.json(article)
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// DELETE /api/guide/admin/:id
router.delete('/admin/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await (prisma as any).guideArticle.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

export default router
