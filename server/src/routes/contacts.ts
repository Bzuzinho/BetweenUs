import { Router, Response } from 'express'
import { createHmac } from 'crypto'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()
const isProd = process.env.NODE_ENV === 'production'

// T10: fail hard in production if secret not set
const getContactHashSecret = (): string => {
  const secret = process.env.CONTACT_HASH_SECRET
  if (isProd && !secret) {
    throw new Error('CONTACT_HASH_SECRET is required in production')
  }
  return secret || 'dev-only-insecure-fallback-do-not-use-in-prod'
}

const hashContact = (value: string): string =>
  createHmac('sha256', getContactHashSecret())
    .update(value.toLowerCase().trim())
    .digest('hex')

// T10: verify CONTACT_HASHING consent before accepting uploads
const hasContactHashingConsent = async (userId: string): Promise<boolean> => {
  const consent = await prisma.userConsent.findFirst({
    where: { userId, consentType: 'CONTACT_HASHING', revokedAt: null }
  })
  return !!consent
}

// POST /api/contacts/block
router.post('/block', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    // T10: require explicit CONTACT_HASHING consent
    const hasConsent = await hasContactHashingConsent(req.userId!)
    if (!hasConsent) {
      return res.status(403).json({
        error: 'É necessário aceitar o consentimento de hashing de contactos para usar esta funcionalidade.',
        code: 'CONTACT_HASHING_CONSENT_REQUIRED'
      })
    }

    const { contacts } = req.body
    if (!Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({ error: 'Lista de contactos inválida.' })
    }
    if (contacts.length > 500) {
      return res.status(400).json({ error: 'Máximo de 500 contactos por pedido.' })
    }

    const hashed = contacts
      .filter(c => c.value && ['email', 'phone'].includes(c.type))
      .map(c => ({ userId: req.userId!, contactHash: hashContact(c.value), type: c.type }))

    await prisma.blockedContactHash.createMany({ data: hashed, skipDuplicates: true })

    res.json({
      ok: true,
      blocked: hashed.length,
      message: `${hashed.length} contactos bloqueados com HMAC-SHA256. Dados originais não guardados.`
    })
  } catch (err: any) {
    console.error('[CONTACTS BLOCK]', err.message)
    const status = err.message.includes('CONTACT_HASH_SECRET') ? 503 : 500
    res.status(status).json({ error: isProd ? 'Serviço temporariamente indisponível.' : err.message })
  }
})

// GET /api/contacts/blocked/count
router.get('/blocked/count', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const count = await prisma.blockedContactHash.count({ where: { userId: req.userId! } })
    res.json({ count })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// DELETE /api/contacts/blocked
router.delete('/blocked', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.blockedContactHash.deleteMany({ where: { userId: req.userId! } })
    res.json({ ok: true, message: 'Lista de bloqueios limpa.' })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

export default router
