// 7.3 — PrivateRoomStateMachine: the single source of truth for which
// PrivateRoom.status transitions are valid. Mirrors matchStateMachine.ts's
// pattern (5.9) — before this, PUT /rooms/:id accepted any string as
// `status` with zero validation, and the actual gating logic (POST
// /rooms/:id/messages checking `room.status !== 'ACTIVE'`) was a single
// inline check with no formal notion of what states even exist or how you
// get between them.
export type RoomState = 'DRAFT' | 'WAITING_CONSENT' | 'ACTIVE' | 'PAUSED' | 'CLOSED' | 'SAFETY_LOCKED'
export type RoomEvent =
  | 'CREATE' | 'REQUEST_CONSENT' | 'ACTIVATE' | 'PAUSE' | 'RESUME' | 'CLOSE' | 'SAFETY_LOCK' | 'UNLOCK'

export interface RoomTransitionCheck {
  allowed: boolean
  toState: RoomState | null
  reason?: string
}

// SAFETY_LOCK is valid from every non-terminal state (mirrors BLOCK in
// matchStateMachine.ts) — a safety action must be able to freeze a room
// regardless of what it was doing at the time. UNLOCK only ever returns
// to PAUSED (never straight back to ACTIVE) so a room that was safety-
// locked always requires an explicit RESUME afterwards, not a silent
// return to full activity.
const NON_TERMINAL: RoomState[] = ['DRAFT', 'WAITING_CONSENT', 'ACTIVE', 'PAUSED']

const TRANSITIONS: Record<RoomEvent, { from: RoomState[] | null; to: RoomState }> = {
  CREATE:          { from: null,                          to: 'DRAFT' },
  REQUEST_CONSENT: { from: ['DRAFT', 'ACTIVE'],            to: 'WAITING_CONSENT' }, // DRAFT: first rule set. ACTIVE: a material rule change (7.4).
  ACTIVATE:        { from: ['DRAFT', 'WAITING_CONSENT'],   to: 'ACTIVE' },
  PAUSE:           { from: ['ACTIVE'],                     to: 'PAUSED' },
  RESUME:          { from: ['PAUSED', 'SAFETY_LOCKED'],    to: 'ACTIVE' },
  CLOSE:           { from: ['DRAFT', 'WAITING_CONSENT', 'ACTIVE', 'PAUSED'], to: 'CLOSED' },
  SAFETY_LOCK:     { from: NON_TERMINAL,                   to: 'SAFETY_LOCKED' },
  UNLOCK:          { from: ['SAFETY_LOCKED'],              to: 'PAUSED' },
}

export const canTransitionRoom = (fromState: RoomState | null, event: RoomEvent): RoomTransitionCheck => {
  const rule = TRANSITIONS[event]

  if (event === 'CREATE') {
    if (fromState !== null) return { allowed: false, toState: null, reason: 'CREATE só é válido para uma sala nova.' }
    return { allowed: true, toState: 'DRAFT' }
  }

  if (rule.from === null || !fromState || !rule.from.includes(fromState)) {
    return { allowed: false, toState: null, reason: `${event} não é válido a partir de ${fromState ?? 'nenhuma sala'}.` }
  }
  return { allowed: true, toState: rule.to }
}

// New messages are only allowed while the room is ACTIVE — every other
// state (including WAITING_CONSENT, per 7.4's "mensagens novas
// bloqueadas") blocks sending. Kept as its own small predicate rather than
// inlined at each call site, since 7.8's socket handlers need the exact
// same check as the HTTP route.
export const roomAcceptsNewMessages = (state: RoomState): boolean => state === 'ACTIVE'
