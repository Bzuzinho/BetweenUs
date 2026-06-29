import { Router, Response } from 'express'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { sendEmail } from '../utils/email'

const router = Router()

// Modelo em memória (sem tabela própria — guarda no Redis ou ficheiro simples)
// Para MVP: usa uma tabela JSON via Prisma custom model
// Por agora, usamos a tabela AdminAction como log de check-ins

// POST /api/checkin/start — iniciar check-in de encontro
router.post('/start', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const {
      matchId,          // match associado (opcional)
      location,         // local do encontro (texto livre, ex: "Café X, Lisboa")
      scheduledAt,      // hora do encontro
      checkInAfterHours = 3,  // horas até ao check-in automático
      safetyEmail       // email de contacto de emergência
    } = req.body

    if (!scheduledAt) {
      return res.status(400).json({ error: 'Data/hora do encontro obrigatória.' })
    }
    if (!safetyEmail) {
      return res.status(400).json({ error: 'Email de contacto de segurança obrigatório.' })
    }

    const scheduledDate = new Date(scheduledAt)
    if (isNaN(scheduledDate.getTime())) {
      return res.status(400).json({ error: 'Data/hora inválida.' })
    }

    const checkInAt = new Date(scheduledDate.getTime() + checkInAfterHours * 60 * 60 * 1000)

    // Guardar como AdminAction (reutilizando a tabela para logs)
    // Em produção: criar tabela MeetingCheckIn própria
    const log = await prisma.adminAction.create({
      data: {
        adminId: req.userId!,
        targetType: 'meeting_checkin',
        targetId: matchId || 'none',
        action: JSON.stringify({
          status: 'SCHEDULED',
          location: location || null,
          scheduledAt: scheduledDate.toISOString(),
          checkInAt: checkInAt.toISOString(),
          safetyEmail,
          checkInAfterHours
        }),
        reason: `Encontro agendado para ${scheduledDate.toLocaleString('pt-PT')}`
      }
    })

    // Enviar email de confirmação ao utilizador
    const user = await prisma.user.findUnique({ where: { id: req.userId! } })
    if (user) {
      try {
        await sendEmail({
          to: user.email,
          subject: '🔒 Between Us — Encontro registado',
          html: `
            <div style="font-family:sans-serif;max-width:500px;margin:0 auto">
              <h2 style="color:#C9956B">Encontro registado com segurança</h2>
              <p>O teu encontro foi registado no Between Us.</p>
              <ul>
                <li><strong>Local:</strong> ${location || 'Não especificado'}</li>
                <li><strong>Data/hora:</strong> ${scheduledDate.toLocaleString('pt-PT')}</li>
                <li><strong>Check-in automático:</strong> ${checkInAt.toLocaleString('pt-PT')}</li>
                <li><strong>Contacto de emergência:</strong> ${safetyEmail}</li>
              </ul>
              <p>Se não fizeres check-in até às ${checkInAt.toLocaleTimeString('pt-PT')},
              será enviado um alerta para ${safetyEmail}.</p>
              <p style="color:#7A6E88;font-size:12px">
                Para cancelar ou fazer check-in antecipado, usa a app.
              </p>
            </div>
          `
        })
      } catch (e) {
        console.warn('[CHECKIN] Email não enviado:', (e as Error).message)
      }
    }

    res.status(201).json({
      ok: true,
      checkInId: log.id,
      checkInAt: checkInAt.toISOString(),
      message: `Check-in agendado para ${checkInAt.toLocaleString('pt-PT')}. `
        + `Se não confirmares, será enviado alerta para ${safetyEmail}.`
    })
  } catch (err: any) {
    console.error('[CHECKIN START]', err.message)
    res.status(500).json({ error: 'Erro ao iniciar check-in.' })
  }
})

// POST /api/checkin/:id/confirm — utilizador confirma que está bem
router.post('/:id/confirm', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const log = await prisma.adminAction.findUnique({ where: { id: req.params.id } })

    if (!log || log.targetType !== 'meeting_checkin') {
      return res.status(404).json({ error: 'Check-in não encontrado.' })
    }
    if (log.adminId !== req.userId) {
      return res.status(403).json({ error: 'Sem permissão.' })
    }

    const data = JSON.parse(log.action || '{}')
    if (data.status === 'CONFIRMED') {
      return res.json({ ok: true, message: 'Já confirmado anteriormente.' })
    }

    await prisma.adminAction.update({
      where: { id: req.params.id },
      data: {
        action: JSON.stringify({ ...data, status: 'CONFIRMED', confirmedAt: new Date().toISOString() }),
        reason: (log.reason || '') + ' | Confirmado pelo utilizador'
      }
    })

    res.json({ ok: true, message: 'Check-in confirmado. Fica bem! 💚' })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao confirmar check-in.' })
  }
})

// POST /api/checkin/:id/cancel — cancelar check-in
router.post('/:id/cancel', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const log = await prisma.adminAction.findUnique({ where: { id: req.params.id } })

    if (!log || log.targetType !== 'meeting_checkin') {
      return res.status(404).json({ error: 'Check-in não encontrado.' })
    }
    if (log.adminId !== req.userId) {
      return res.status(403).json({ error: 'Sem permissão.' })
    }

    const data = JSON.parse(log.action || '{}')

    await prisma.adminAction.update({
      where: { id: req.params.id },
      data: {
        action: JSON.stringify({ ...data, status: 'CANCELLED', cancelledAt: new Date().toISOString() }),
        reason: (log.reason || '') + ' | Cancelado pelo utilizador'
      }
    })

    res.json({ ok: true, message: 'Check-in cancelado.' })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao cancelar check-in.' })
  }
})

// GET /api/checkin/me — listar check-ins do utilizador
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const logs = await prisma.adminAction.findMany({
      where: { adminId: req.userId!, targetType: 'meeting_checkin' },
      orderBy: { createdAt: 'desc' },
      take: 10
    })

    const checkins = logs.map(log => {
      const data = JSON.parse(log.action || '{}')
      return {
        id: log.id,
        status: data.status,
        location: data.location,
        scheduledAt: data.scheduledAt,
        checkInAt: data.checkInAt,
        safetyEmail: data.safetyEmail ? data.safetyEmail.replace(/(.{3}).+(@.+)/, '$1***$2') : null,
        confirmedAt: data.confirmedAt,
        createdAt: log.createdAt
      }
    })

    res.json({ checkins })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

export default router
