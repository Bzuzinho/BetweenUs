// 7.5/7.6/7.7/7.10 — Private Room routes, rebuilt on top of
// RoomAuthorizationService (every action checked the same way),
// PrivateRoomStateMachine (status only ever changes through a validated
// transition, never a raw string write), and roomRuleService (versioned,
// consent-gated rules replacing the old flat `rules: String[]`).
import { Router, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { notifyAdmins, notifyUser } from '../lib/notify'
import { signMediaUrl, resolvePhotoForViewer } from '../lib/mediaAccessService'
import { canTransitionRoom } from '../lib/privateRoomStateMachine'
import {
  resolveRoomMembership, canSendMessage, canManageRoom, canModerateContent,
} from '../lib/roomAuthorizationService'
import { resolveMyProfileId } from '../lib/profileMembershipService'
import { sendRoomMessage, deleteRoomMessage } from '../lib/roomMessageService'
import {
  DEFAULT_ROOM_RULES, proposeRuleSet, acceptRuleSet, revokeRuleAcceptance, getConsentState,
} from '../lib/roomRuleService'
import {
  proposeAlignment, approveAlignment, declineAlignment, getCurrentAlignment, getPendingAlignment,
} from '../lib/intentAlignmentService'
import { listConsentChecksForMatch } from '../lib/consentCheckService'

const router = Router()

// 7.2 — new composition-based taxonomy. See migratePrivateRoomEnums.ts
// for how existing rows' old free-string values get normalized.
const ROOM_TYPES = ['INDIVIDUAL_PAIR', 'COUPLE_SINGLE', 'COUPLE_COUPLE', 'POLY_GROUP', 'CUSTOM'] as const
const MAX_MEMBERS: Record<string, number> = {
  INDIVIDUAL_PAIR: 2, COUPLE_SINGLE: 3, COUPLE_COUPLE: 4, POLY_GROUP: 8, CUSTOM: 12
}
const TTL_PRESETS = ['NONE', 'ONE_HOUR', 'ONE_DAY', 'SEVEN_DAYS'] as const
const TTL_MS: Record<string, number | null> = {
  NONE: null, ONE_HOUR: 60 * 60 * 1000, ONE_DAY: 24 * 60 * 60 * 1000, SEVEN_DAYS: 7 * 24 * 60 * 60 * 1000
}

const roomSelect = {
  id: true, title: true, roomType: true, description: true, status: true,
  defaultMessageTtl: true, matchId: true, createdAt: true,
  members: {
    where: { leftAt: null },
    include: {
      user: { select: { id: true, profile: { select: {
        displayName: true,
        photos: { where: { isPrimary: true, moderationStatus: 'APPROVED' }, take: 1 }
      }}}}
    }
  }
}

// 3.1: member thumbnails now store an R2 key (private uploads) rather than a
// public URL. Room members are an existing trust boundary (you're already in
// a private room together), so for STANDALONE rooms (no matchId) this keeps
// signing whatever primary photo is present, unchanged.
//
// Security fix (Closed Beta audit, FASE 1.2) — for MATCH-DERIVED rooms this
// used to do the exact same unconditional signing, which skipped
// mediaAccessPolicy entirely: once a match is blocked, blockService.ts only
// removes the blocking actor from rooms with 3+ members (rooms with <=2
// members are SAFETY_LOCKed instead, keeping both parties as `members` with
// leftAt: null, deliberately, to preserve evidence for reporting) and
// MATCH_BLOCKED revokes any PhotoAccessRequest — but this function never
// re-checked either signal, so a blocked/revoked party kept seeing the
// clean primary photo via the room member list. Now match-derived rooms go
// through resolvePhotoForViewer, the same access-policy gate every other
// surface (discovery, profile, photos routes) already uses — hasActiveMatch
// naturally becomes false once the match is BLOCKED, and a revoked
// PhotoAccessRequest naturally stops counting as approved. Standalone
// rooms (matchId null) have no Match to gate on and keep their original,
// unchanged trust-boundary behavior — this is not a business rule change,
// only closes the match-derived gap the audit found.
const signRoomPhotos = async (room: any, viewer: { viewerUserId: string; viewerProfileId: string | null }) => {
  if (!room?.members) return room
  const members = await Promise.all(room.members.map(async (m: any) => {
    const photo = m.user?.profile?.photos?.[0]
    if (!photo) return m

    if (!room.matchId) {
      // Standalone room — original trust-boundary behavior, unchanged.
      const signed = await signMediaUrl(photo.storagePath)
      return { ...m, user: { ...m.user, profile: { ...m.user.profile, photos: [{ ...photo, storagePath: signed }] } } }
    }

    const resolved = await resolvePhotoForViewer(photo, {
      ownerUserId: m.user.id,
      viewerUserId: viewer.viewerUserId,
      viewerProfileId: viewer.viewerProfileId,
    })
    if (!resolved) {
      // Viewer currently has no access to this member's photo at all
      // (e.g. match blocked, access request revoked) — omit it rather
      // than leak the clean or even the blurred variant.
      return { ...m, user: { ...m.user, profile: { ...m.user.profile, photos: [] } } }
    }
    return { ...m, user: { ...m.user, profile: { ...m.user.profile, photos: [{ ...photo, storagePath: resolved.url }] } } }
  }))
  return { ...room, members }
}

const emitToRoom = async (roomId: string, event: string, payload: any) => {
  try {
    // 7.12 — reads the published Server instance from socketRegistry
    // instead of `import('../index')`, which would re-execute index.ts's
    // top level (including an unconditional httpServer.listen()) any time
    // this ran inside a test process that imports routes directly via
    // __tests__/app.ts rather than booting the real server.
    const { getIo } = await import('../lib/socketRegistry')
    const io = getIo()
    if (io) io.to(`room:${roomId}`).emit(event, payload)
  } catch {}
}

// GET /api/rooms
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    // Repair ACTIVE matches created before every connection was guaranteed
    // to have a Private Room. Idempotent and scoped to the active profile.
    const viewerProfileId = await resolveMyProfileId(req.userId!)
    if (viewerProfileId) {
      const missingRooms = await prisma.match.findMany({
        where: {
          status: 'ACTIVE', privateRoom: null,
          OR: [{ profileOneId: viewerProfileId }, { profileTwoId: viewerProfileId }]
        },
        select: { id: true }
      })
      if (missingRooms.length) {
        const { createFromMatch } = await import('../lib/privateRoomService')
        await Promise.all(missingRooms.map(match => createFromMatch(match.id)))
      }
    }
    const memberships = await (prisma as any).privateRoomMember.findMany({
      where: { userId: req.userId!, leftAt: null, status: 'ACCEPTED' },
      include: { privateRoom: { select: roomSelect } },
      orderBy: { joinedAt: 'desc' }
    })
    const viewer = { viewerUserId: req.userId!, viewerProfileId }
    res.json({ rooms: await Promise.all(memberships.map((m: any) => signRoomPhotos(m.privateRoom, viewer))) })
  } catch (err: any) {
    console.error('[ROOMS GET]', err.message)
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// POST /api/rooms — create standalone private room. Starts DRAFT, seeded
// with a v1 rule set that immediately moves it to WAITING_CONSENT, and the
// creator's own acceptance is recorded right away (they proposed it — but
// still going through the same acceptRuleSet path as everyone else, not a
// bypass).
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const data = z.object({
      title: z.string().min(2).max(60),
      roomType: z.enum(ROOM_TYPES).default('CUSTOM'),
      description: z.string().max(300).optional(),
      inviteUserIds: z.array(z.string().uuid()).max(11).optional(),
      defaultMessageTtl: z.enum(TTL_PRESETS).default('NONE'),
    }).parse(req.body)

    const room = await (prisma as any).privateRoom.create({
      data: {
        title: data.title,
        roomType: data.roomType,
        description: data.description,
        status: 'DRAFT',
        defaultMessageTtl: data.defaultMessageTtl,
        // matchId intentionally omitted — standalone room
        members: { create: [{ userId: req.userId!, role: 'OWNER', status: 'ACCEPTED', joinedAt: new Date() }] }
      }
    })

    if (data.inviteUserIds?.length) {
      const max = MAX_MEMBERS[data.roomType] ?? 12
      const toInvite = data.inviteUserIds.filter(id => id !== req.userId).slice(0, max - 1)
      if (toInvite.length) {
        await (prisma as any).privateRoomMember.createMany({
          data: toInvite.map(userId => ({
            privateRoomId: room.id, userId, role: 'MEMBER', status: 'INVITED', joinedAt: new Date()
          })),
          skipDuplicates: true
        })
      }
    }

    await proposeRuleSet(room.id, req.userId!, DEFAULT_ROOM_RULES)
    await acceptRuleSet(room.id, req.userId!)

    const finalRoom = await (prisma as any).privateRoom.findUnique({ where: { id: room.id }, select: roomSelect })
    res.status(201).json(await signRoomPhotos(finalRoom, { viewerUserId: req.userId!, viewerProfileId: await resolveMyProfileId(req.userId!) }))
  } catch (err: any) {
    console.error('[ROOMS CREATE]', err.message)
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    // Closed Beta audit (FASE 2.4) — was 'Erro ao criar sala: ' + err.message
    // unconditionally, which could surface raw Prisma constraint/column text.
    res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'Erro ao criar sala.' : 'Erro ao criar sala: ' + err.message })
  }
})

// GET /api/rooms/:id
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const auth = await resolveRoomMembership(req.params.id, req.userId!)
    if (!auth.ok) return res.status(403).json({ error: auth.reason })

    const room = await (prisma as any).privateRoom.findUnique({ where: { id: req.params.id }, select: roomSelect })
    if (!room || room.status === 'CLOSED') return res.status(404).json({ error: 'Sala não encontrada.' })
    // 8.11 — deliberately three SEPARATE keys, never merged: `consent`
    // here means Room Rule acceptance (7.4/7.5), `sharedIntentions` means
    // IntentAlignment (8.8), and `consentChecks` means the phase-based
    // ConsentCheck system (8.2/8.3). Do not rename/collapse these.
    const consent = await getConsentState(req.params.id)
    const sharedIntentions = {
      active: await getCurrentAlignment(req.params.id),
      pending: await getPendingAlignment(req.params.id)
    }
    const consentChecks = room.matchId ? await listConsentChecksForMatch(room.matchId) : []
    const viewer = { viewerUserId: req.userId!, viewerProfileId: await resolveMyProfileId(req.userId!) }
    res.json({ ...(await signRoomPhotos(room, viewer)), consent, sharedIntentions, consentChecks })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// GET /api/rooms/:id/messages
router.get('/:id/messages', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const auth = await resolveRoomMembership(req.params.id, req.userId!)
    if (!auth.ok) return res.status(403).json({ error: auth.reason })

    const cursor = req.query.cursor as string | undefined
    const limit = Math.min(Number(req.query.limit || 50), 100)

    const messages = await (prisma as any).roomMessage.findMany({
      where: {
        roomId: req.params.id,
        deletedAt: null,
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {})
      },
      include: {
        sender: { select: { id: true, profile: { select: {
          displayName: true,
          photos: { where: { isPrimary: true }, take: 1 }
        }}}}
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    res.json({ messages: messages.reverse() })
  } catch (err: any) {
    console.error('[ROOMS MESSAGES]', err.message)
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// POST /api/rooms/:id/messages
// 7.6 — body is required for TEXT, forbidden as the ONLY content for
// IMAGE (needs mediaId) and never required for SYSTEM (system-generated).
// 7.7 — expiresAt is computed from the room's defaultMessageTtl unless the
// sender picks a different preset for this one message.
router.post('/:id/messages', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const data = z.object({
      body: z.string().max(2000).optional(),
      messageType: z.enum(['TEXT', 'IMAGE', 'CONSENT_REQUEST', 'PHOTO_UNLOCK_REQUEST']).default('TEXT'),
      mediaId: z.string().optional(),
      ttl: z.enum(TTL_PRESETS).optional(),
    }).parse(req.body)

    const result = await sendRoomMessage(req.params.id, req.userId!, data)
    if (!result.ok) return res.status(result.code === 'VALIDATION' ? 400 : 403).json({ error: result.error })

    await emitToRoom(req.params.id, 'message:created', result.message)
    res.status(201).json(result.message)
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    console.error('[ROOMS POST MSG]', err.message)
    res.status(500).json({ error: 'Erro ao enviar mensagem.' })
  }
})

// DELETE /api/rooms/:id/messages/:messageId — own message any time, or
// (per 7.5) content moderation by MODERATOR_SYSTEM only — never a normal
// OWNER removing someone else's message.
router.delete('/:id/messages/:messageId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await deleteRoomMessage(req.params.id, req.params.messageId, req.userId!)
    if (!result.ok) return res.status(result.error === 'Mensagem não encontrada.' ? 404 : 403).json({ error: result.error })
    await emitToRoom(req.params.id, 'message:delete', { messageId: req.params.messageId })
    res.json({ ok: true })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// GET /api/rooms/:id/rules — current (pending or active) rule set +
// aggregate consent state (never per-member breakdown, same privacy
// pattern as Sprint 6's Modo Acordo).
router.get('/:id/rules', requireAuth, async (req: AuthRequest, res: Response) => {
  const auth = await resolveRoomMembership(req.params.id, req.userId!)
  if (!auth.ok) return res.status(403).json({ error: auth.reason })
  const consent = await getConsentState(req.params.id)
  res.json({ consent })
})

// POST /api/rooms/:id/rules — propose a new version (material change).
// Open to any accepted member, not just OWNER — see
// roomAuthorizationService.canManageRules's doc comment.
router.post('/:id/rules', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const data = z.object({
      rules: z.array(z.object({
        ruleType: z.string().min(1), label: z.string().min(1), value: z.string().optional(), sortOrder: z.number().optional()
      })).min(1)
    }).parse(req.body)

    const auth = await resolveRoomMembership(req.params.id, req.userId!)
    if (!auth.ok) return res.status(403).json({ error: auth.reason })

    // Same zod-under-ts-jest-strict:false widening as catalog.ts
    // (required fields inferred as optional against a plain-object
    // param type, though this compiles clean under the strict main
    // tsconfig.json) -- rebuild explicitly so ruleType/label stay typed
    // as the required strings zod's schema actually enforces at runtime.
    const rules = data.rules.map(r => ({ ruleType: r.ruleType, label: r.label, value: r.value, sortOrder: r.sortOrder }))
    const result = await proposeRuleSet(req.params.id, req.userId!, rules)
    if (!result.ok) return res.status(400).json({ error: result.error })
    await emitToRoom(req.params.id, 'rules:updated', { roomId: req.params.id, roomStatus: result.roomStatus })
    res.status(201).json(result)
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// POST /api/rooms/:id/rules/accept
router.post('/:id/rules/accept', requireAuth, async (req: AuthRequest, res: Response) => {
  const auth = await resolveRoomMembership(req.params.id, req.userId!)
  if (!auth.ok) return res.status(403).json({ error: auth.reason })
  const result = await acceptRuleSet(req.params.id, req.userId!)
  if (!result.ok) return res.status(400).json({ error: result.error })
  await emitToRoom(req.params.id, 'consent:updated', { roomId: req.params.id, roomStatus: result.roomStatus })
  if (result.roomStatus === 'ACTIVE') await emitToRoom(req.params.id, 'room:status', { roomId: req.params.id, status: 'ACTIVE' })
  res.json(result)
})

// POST /api/rooms/:id/rules/revoke — "Consent can be updated anytime."
router.post('/:id/rules/revoke', requireAuth, async (req: AuthRequest, res: Response) => {
  const auth = await resolveRoomMembership(req.params.id, req.userId!)
  if (!auth.ok) return res.status(403).json({ error: auth.reason })
  const result = await revokeRuleAcceptance(req.params.id, req.userId!)
  if (!result.ok) return res.status(400).json({ error: result.error })
  await emitToRoom(req.params.id, 'consent:updated', { roomId: req.params.id, roomStatus: result.roomStatus })
  res.json(result)
})

// GET /api/rooms/:id/intent-alignment — 8.11: distinct from /rules and
// from ConsentCheck. Returns the current ACTIVE alignment (if any) and
// any proposal awaiting approval.
router.get('/:id/intent-alignment', requireAuth, async (req: AuthRequest, res: Response) => {
  const auth = await resolveRoomMembership(req.params.id, req.userId!)
  if (!auth.ok) return res.status(403).json({ error: auth.reason })
  const active = await getCurrentAlignment(req.params.id)
  const pending = await getPendingAlignment(req.params.id)
  res.json({ active, pending })
})

// POST /api/rooms/:id/intent-alignment — propose a new version. 8.10:
// never edits the ACTIVE alignment in place — always creates the next
// version and requires every active room member to approve before it
// takes over.
router.post('/:id/intent-alignment', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const data = z.object({
      items: z.array(z.object({
        key: z.string().min(1), value: z.string().min(1), label: z.string().optional()
      })).min(1)
    }).parse(req.body)

    const auth = await resolveRoomMembership(req.params.id, req.userId!)
    if (!auth.ok) return res.status(403).json({ error: auth.reason })

    // Same zod-under-ts-jest-strict:false widening as above.
    const items = data.items.map(i => ({ key: i.key, value: i.value, label: i.label }))
    const result = await proposeAlignment(req.params.id, req.userId!, items)
    if (result.error) {
      const code = result.error === 'NOT_MEMBER' ? 403 : 400
      return res.status(code).json({ error: result.error })
    }
    await emitToRoom(req.params.id, 'intent-alignment:updated', { roomId: req.params.id, alignmentId: result.alignment.id, status: result.alignment.status })
    res.status(201).json({ alignment: result.alignment })
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// POST /api/rooms/:id/intent-alignment/:alignmentId/approve
router.post('/:id/intent-alignment/:alignmentId/approve', requireAuth, async (req: AuthRequest, res: Response) => {
  const auth = await resolveRoomMembership(req.params.id, req.userId!)
  if (!auth.ok) return res.status(403).json({ error: auth.reason })
  const result = await approveAlignment(req.params.alignmentId, req.userId!)
  if (result.error) {
    const code = result.error === 'NOT_FOUND' ? 404 : result.error === 'NOT_MEMBER' ? 403 : 400
    return res.status(code).json({ error: result.error })
  }
  await emitToRoom(req.params.id, 'intent-alignment:updated', { roomId: req.params.id, alignmentId: result.alignment.id, status: result.alignment.status })
  res.json({ alignment: result.alignment })
})

// POST /api/rooms/:id/intent-alignment/:alignmentId/decline — a single
// explicit decline archives the proposal without it ever going ACTIVE;
// the previous ACTIVE alignment (if any) is untouched (8.10/8.12).
router.post('/:id/intent-alignment/:alignmentId/decline', requireAuth, async (req: AuthRequest, res: Response) => {
  const auth = await resolveRoomMembership(req.params.id, req.userId!)
  if (!auth.ok) return res.status(403).json({ error: auth.reason })
  const result = await declineAlignment(req.params.alignmentId, req.userId!)
  if (result.error) {
    const code = result.error === 'NOT_FOUND' ? 404 : result.error === 'NOT_MEMBER' ? 403 : 400
    return res.status(code).json({ error: result.error })
  }
  await emitToRoom(req.params.id, 'intent-alignment:updated', { roomId: req.params.id, alignmentId: result.alignment.id, status: result.alignment.status })
  res.json({ alignment: result.alignment })
})

// POST /api/rooms/:id/invite — OWNER only (standalone rooms only have an
// owner at all; match-derived rooms have none, so invites there always 403).
router.post('/:id/invite', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.body
    if (!userId) return res.status(400).json({ error: 'userId obrigatório.' })

    const auth = await canManageRoom(req.params.id, req.userId!)
    if (!auth.ok) return res.status(403).json({ error: auth.reason })

    const count = await (prisma as any).privateRoomMember.count({ where: { privateRoomId: req.params.id, leftAt: null } })
    const room = await (prisma as any).privateRoom.findUnique({ where: { id: req.params.id } })
    const max = MAX_MEMBERS[room?.roomType ?? 'CUSTOM'] ?? 12
    if (count >= max) return res.status(400).json({ error: 'Sala com o número máximo de membros.' })

    await (prisma as any).privateRoomMember.upsert({
      where: { privateRoomId_userId: { privateRoomId: req.params.id, userId } },
      update: { leftAt: null, role: 'MEMBER', status: 'INVITED', joinedAt: new Date() },
      create: { privateRoomId: req.params.id, userId, role: 'MEMBER', status: 'INVITED', joinedAt: new Date() }
    })
    await notifyUser(userId, 'room_invite', '💌 Convite para sala privada', 'Foste convidado/a para uma sala privada.', { roomId: req.params.id, tab: 'rooms' })
    res.json({ ok: true })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno.' })
  }
})

// POST /api/rooms/:id/accept
router.post('/:id/accept', requireAuth, async (req: AuthRequest, res: Response) => {
  await (prisma as any).privateRoomMember.updateMany({
    where: { privateRoomId: req.params.id, userId: req.userId!, status: 'INVITED' },
    data: { status: 'ACCEPTED', joinedAt: new Date() }
  })
  res.json({ ok: true })
})

// DELETE /api/rooms/:id/leave — 7.11 Safe Exit's "Leave room" action.
// Independent of block/report/hide — those are separate calls the client
// makes to their own existing endpoints (privacy.ts block, reports.ts,
// privacy settings toggle), never bundled automatically here.
router.delete('/:id/leave', requireAuth, async (req: AuthRequest, res: Response) => {
  // 11.5.6 — dedup: only a row that actually HAD leftAt: null transitions
  // here, so calling /leave again on an already-left membership (double
  // click, client retry) updates nothing and — critically — must not
  // re-fire SAFE_EXIT below, since that's a guardrail metric.
  const leaveResult = await (prisma as any).privateRoomMember.updateMany({
    where: { privateRoomId: req.params.id, userId: req.userId!, leftAt: null },
    data: { leftAt: new Date() }
  })
  await emitToRoom(req.params.id, 'member:left', { roomId: req.params.id, userId: req.userId })

  // 11.1/11.5.6 — SAFE_EXIT signal. Only recorded when the room maps to a
  // clear 1:1 match (room.matchId) — a multi-member custom room has no
  // single "other party" this signal could meaningfully be about, so it's
  // skipped there rather than fanned out to every remaining member (which
  // would misrepresent one person's exit as a signal about everyone else
  // in the room) — AND only when this call caused a genuine leave
  // transition (leaveResult.count > 0), not a repeat call.
  if (leaveResult.count > 0) {
    try {
      const room = await (prisma as any).privateRoom.findUnique({ where: { id: req.params.id }, include: { match: true } })
      if (room?.match) {
        // BETA.2 (FASE C) — Profile.userId no longer resolves a Shared
        // Profile member's profile (see activeProfileContextService.ts) —
        // use the acting-profile resolver so couple/group members' exits
        // still record the signal against the right side of the match.
        const leaverProfileId = await resolveMyProfileId(req.userId!)
        if (leaverProfileId) {
          const otherProfileId = room.match.profileOneId === leaverProfileId ? room.match.profileTwoId : room.match.profileOneId
          const { recordSignal } = await import('../lib/recommendationSignalService')
          recordSignal(leaverProfileId, otherProfileId, 'SAFE_EXIT', { roomId: req.params.id }).catch(() => {})
        }
      }
    } catch { /* best-effort */ }
  }

  const remaining = await (prisma as any).privateRoomMember.count({
    where: { privateRoomId: req.params.id, leftAt: null, status: 'ACCEPTED' }
  })
  if (remaining === 0) {
    const room = await (prisma as any).privateRoom.findUnique({ where: { id: req.params.id } })
    const check = canTransitionRoom(room?.status, 'CLOSE')
    if (check.allowed) {
      await (prisma as any).privateRoom.update({ where: { id: req.params.id }, data: { status: 'CLOSED', closedAt: new Date() } })
      await emitToRoom(req.params.id, 'room:closed', { roomId: req.params.id })
    }
  }
  res.json({ ok: true })
})

// PUT /api/rooms/:id — metadata only (title/description). Status changes
// go exclusively through the dedicated transition routes below, never a
// raw string write.
router.put('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const auth = await canManageRoom(req.params.id, req.userId!)
  if (!auth.ok) return res.status(403).json({ error: auth.reason })
  const { title, description } = req.body
  await (prisma as any).privateRoom.update({
    where: { id: req.params.id },
    data: { ...(title && { title }), ...(description !== undefined && { description }) }
  })
  res.json({ ok: true })
})

const transitionRoom = async (req: AuthRequest, res: Response, event: 'PAUSE' | 'RESUME' | 'CLOSE') => {
  const auth = await resolveRoomMembership(req.params.id, req.userId!)
  if (!auth.ok) return res.status(403).json({ error: auth.reason })
  const check = canTransitionRoom(auth.room!.status, event)
  if (!check.allowed) return res.status(400).json({ error: check.reason })
  await (prisma as any).privateRoom.update({
    where: { id: req.params.id },
    data: { status: check.toState, ...(event === 'CLOSE' ? { closedAt: new Date() } : {}) }
  })
  await emitToRoom(req.params.id, 'room:status', { roomId: req.params.id, status: check.toState })
  if (event === 'CLOSE') await emitToRoom(req.params.id, 'room:closed', { roomId: req.params.id })
  res.json({ ok: true, status: check.toState })
}

// POST /api/rooms/:id/pause | /resume | /close — any accepted member can
// pause/resume (a shared space, anyone can ask for quiet); CLOSE is also
// open to any member here (distinct from canManageRoom's OWNER-only
// metadata editing) since ending participation in a shared room is a
// safety-adjacent action nobody should need another member's permission for.
router.post('/:id/pause', requireAuth, (req: AuthRequest, res: Response) => transitionRoom(req, res, 'PAUSE'))
router.post('/:id/resume', requireAuth, (req: AuthRequest, res: Response) => transitionRoom(req, res, 'RESUME'))
router.post('/:id/close', requireAuth, (req: AuthRequest, res: Response) => transitionRoom(req, res, 'CLOSE'))

export default router
