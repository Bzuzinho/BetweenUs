import { Router, Response } from 'express'
import { createHash } from 'crypto'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

// Hash a contact value — never store emails/phones in plain text
const hashContact = (value: string): string => {
  return createHash('sha256')
    .update(value.toLowerCase().trim())
    .digest('hex')
}

// POST /api/contacts/block — import contacts to block list
// Accepts array of { type: 'email'|'phone', value: string }
// Values are hashed immediately — originals never stored
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

    // Upsert to avoid duplicates
    await prisma.blockedContactHash.createMany({
      data: hashed,
      skipDuplicates: true
    })

    res.json({
      ok: true,
      blocked: hashed.length,
      message: `${hashed.length} contactos bloqueados. Os dados originais não foram guardados.`
    })
  } catch (err: any) {
    console.error('[CONTACTS BLOCK]', err.message)
    res.status(500).json({ error: 'Erro ao bloquear contactos.' })
  }
})

// GET /api/contacts/blocked/count — how many contacts are blocked
router.get('/blocked/count', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const count = await prisma.blockedContactHash.count({
      where: { userId: req.userId! }
    })
    res.json({ count })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// DELETE /api/contacts/blocked — clear all blocked contacts
router.delete('/blocked', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.blockedContactHash.deleteMany({
      where: { userId: req.userId! }
    })
    res.json({ ok: true, message: 'Lista de bloqueios limpa.' })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

export default router
