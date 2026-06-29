import { Router, Response } from 'express'
import { createHmac } from 'crypto'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

// C.2: HMAC-SHA256 with server secret — more secure than plain SHA-256
const hashContact = (value: string): string => {
  const secret = process.env.CONTACT_HASH_SECRET || 'between-us-contact-secret-2026'
  return createHmac('sha256', secret)
    .update(value.toLowerCase().trim())
    .digest('hex')
}

// POST /api/contacts/block
router.post('/block', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { contacts } = req.body
    if (!Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({ error: 'Lista de contactos inválida.' })
    }
    if (contacts.length > 500) {
      return res.status(400).json({ error: 'Máximo de 500 contactos por vez.' })
    }

    const hashed = contacts
      .filter(c => c.value && ['email','phone'].includes(c.type))
      .map(c => ({
        userId: req.userId!,
        contactHash: hashContact(c.value),
        type: c.type
      }))

    await prisma.blockedContactHash.createMany({ data: hashed, skipDuplicates: true })

    res.json({
      ok: true,
      blocked: hashed.length,
      message: `${hashed.length} contactos bloqueados com HMAC-SHA256. Dados originais não guardados.`
    })
  } catch (err: any) {
    console.error('[CONTACTS BLOCK]', err.message)
    res.status(500).json({ error: 'Erro interno.' })
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
