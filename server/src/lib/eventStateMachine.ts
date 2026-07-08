// 10.5 — EventStateMachine: same shape as matchStateMachine.ts/
// privateRoomStateMachine.ts/safetyCheckinStateMachine.ts. REJECT sends a
// PENDING_REVIEW event back to DRAFT (not a dead end — the organizer can
// edit and resubmit) rather than straight to CANCELLED, since a rejected
// draft is usually fixable (missing verification, incomplete venue info),
// not something the organizer necessarily meant to abandon.
export type EventState = 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED' | 'SUSPENDED'
export type EventTransitionEvent =
  | 'CREATE' | 'SUBMIT' | 'APPROVE' | 'REJECT' | 'CANCEL' | 'COMPLETE' | 'SUSPEND' | 'RESUME'

export interface EventTransitionCheck {
  allowed: boolean
  toState: EventState | null
  reason?: string
}

const TRANSITIONS: Record<EventTransitionEvent, { from: EventState[] | null; to: EventState }> = {
  CREATE:   { from: null,                to: 'DRAFT' },
  SUBMIT:   { from: ['DRAFT'],           to: 'PENDING_REVIEW' },
  APPROVE:  { from: ['PENDING_REVIEW'],  to: 'PUBLISHED' },
  REJECT:   { from: ['PENDING_REVIEW'],  to: 'DRAFT' },
  CANCEL:   { from: ['DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'SUSPENDED'], to: 'CANCELLED' },
  COMPLETE: { from: ['PUBLISHED'],       to: 'COMPLETED' },
  SUSPEND:  { from: ['PUBLISHED'],       to: 'SUSPENDED' },
  RESUME:   { from: ['SUSPENDED'],       to: 'PUBLISHED' },
}

export const canTransitionEvent = (fromState: EventState | null, event: EventTransitionEvent): EventTransitionCheck => {
  const rule = TRANSITIONS[event]

  if (event === 'CREATE') {
    if (fromState !== null) return { allowed: false, toState: null, reason: 'CREATE só é válido para um evento novo.' }
    return { allowed: true, toState: 'DRAFT' }
  }

  if (rule.from === null || !fromState || !rule.from.includes(fromState)) {
    return { allowed: false, toState: null, reason: `${event} não é válido a partir de ${fromState ?? 'nenhum evento'}.` }
  }
  return { allowed: true, toState: rule.to }
}

// Only these ever appear in the public discovery list — see events.ts.
export const isPubliclyVisible = (state: EventState): boolean => state === 'PUBLISHED'
