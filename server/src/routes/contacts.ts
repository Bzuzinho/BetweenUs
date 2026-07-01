import { Router, Response } from 'express'
import { createHmac } from 'crypto'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()
const isProd = process.env.NODE_ENV === 'production'

// T10: fail hard in production if secret not defined — no insecure fallback
const getContactHashSecret = (): string => {
  const secret = process.env.CONTACT_HASH_SECRET
  if (isProd && !secret) {
    throw new Error('CONTACT_HASH_SECRET obrigatório em produção. Define a variável de ambiente.')
  }
  return secret || 'dev-only-insecure-fallback-do-not-use-in-prod'
}

const hashContact = (value: string): string =>
  createHmac('sha256', getContactHashSecret())
    .update(value.toLowerCase().trim())
    .digest('hex')

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
    const status = err.message.includes('CONTACT_HASH_SECRET') ? 503 : 500
    res.status(status).json({ error: isProd ? 'Serviço temporariamente indisponível.' : err.message })
  }
})

router.get('/blocked/count', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const count = await prisma.blockedContactHash.count({ where: { userId: req.userId! } })
    res.json({ count })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

router.delete('/blocked', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.blockedContactHash.deleteMany({ where: { userId: req.userId! } })
    res.json({ ok: true, message: 'Lista de bloqueios limpa.' })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

export default router
