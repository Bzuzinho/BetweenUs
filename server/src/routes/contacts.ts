import { Router, Response } from 'express'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { hashContact } from '../lib/contactHashService'

const router = Router()

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

    // 3.5: each row records the key version that produced it, so a future
    // secret rotation doesn't silently orphan hashes written today.
    const hashed = contacts
      .filter(c => c.value && ['email', 'phone'].includes(c.type))
      .map(c => {
        const { hash, keyVersion } = hashContact(c.value)
        return { userId: req.userId!, contactHash: hash, keyVersion, type: c.type }
      })

    await prisma.blockedContactHash.createMany({ data: hashed, skipDuplicates: true })

    res.json({
      ok: true,
      blocked: hashed.length,
      message: `${hashed.length} contactos bloqueados com HMAC-SHA256. Dados originais não guardados.`
    })
  } catch (err: any) {
    console.error('[CONTACTS BLOCK]', err.message)
    const status = err.message.includes('CONTACT_HASH') ? 503 : 500
    res.status(status).json({ error: process.env.NODE_ENV === 'production' ? 'Serviço temporariamente indisponível.' : err.message })
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
