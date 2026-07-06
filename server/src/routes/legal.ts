// 3.3 — LegalDocument versioning
// Public: current version of a legal document (LegalPage.jsx fetches this).
// Admin: publish new versions — publishing is what future logins compare
// against to decide whether a user needs to re-accept (see auth.ts /me and
// POST /consents/reaccept, lib/legalDocumentService.ts).
import { Router, Response } from 'express'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { requireAdmin, logAdminAction } from '../middleware/admin'
import { getLatestDocument } from '../lib/legalDocumentService'

const router = Router()

const CONSENT_TYPES = ['TERMS', 'PRIVACY_POLICY', 'SENSITIVE_DATA', 'MARKETING', 'LOCATION', 'CONTACT_HASHING']

// GET /api/legal/:consentType — latest published version, public
router.get('/:consentType', async (req, res: Response) => {
  const consentType = req.params.consentType.toUpperCase()
  if (!CONSENT_TYPES.includes(consentType)) return res.status(400).json({ error: 'Tipo inválido.' })
  const doc = await getLatestDocument(consentType)
  if (!doc) return res.status(404).json({ error: 'Documento não encontrado.' })
  res.json({ consentType: doc.consentType, version: doc.version, title: doc.title, content: doc.content, publishedAt: doc.publishedAt })
})

// GET /api/legal/admin/:consentType/history — every published version, admin only
router.get('/admin/:consentType/history', requireAuth, requireAdmin('legal'), async (req: AuthRequest, res: Response) => {
  const consentType = req.params.consentType.toUpperCase()
  const docs = await prisma.legalDocument.findMany({ where: { consentType: consentType as any }, orderBy: { publishedAt: 'desc' } })
  res.json({ documents: docs })
})

// POST /api/legal/admin/:consentType — publish a new version
router.post('/admin/:consentType', requireAuth, requireAdmin('legal'), async (req: AuthRequest, res: Response) => {
  try {
    const consentType = req.params.consentType.toUpperCase()
    if (!CONSENT_TYPES.includes(consentType)) return res.status(400).json({ error: 'Tipo inválido.' })
    const { version, title, content, requiresReacceptance } = req.body
    if (!version || !title || !content) return res.status(400).json({ error: 'version, title e content são obrigatórios.' })

    const existing = await prisma.legalDocument.findUnique({ where: { consentType_version: { consentType: consentType as any, version } } })
    if (existing) return res.status(409).json({ error: 'Já existe um documento com esta versão.' })

    const doc = await prisma.legalDocument.create({
      data: { consentType: consentType as any, version, title, content, requiresReacceptance: requiresReacceptance !== false }
    })
    await logAdminAction(req.userId!, 'PUBLISH_LEGAL_DOCUMENT', 'legal_document', doc.id, {
      newData: { consentType, version, requiresReacceptance: doc.requiresReacceptance },
      ipAddress: req.ip
    })
    res.status(201).json({ ok: true, document: doc })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

export default router
