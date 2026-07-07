// 9.5 — SafetyCheckinStateMachine: replaces the ad-hoc toStatus()
// derivation in safety.ts (a boolean triple — alertSent/cancelledAt/
// confirmedAt — with no formal notion of "waiting" vs "overdue" vs
// "escalated") with an explicit status, written only through this
// machine. Mirrors matchStateMachine.ts / privateRoomStateMachine.ts's
// shape.
export type SafetyCheckinState =
  | 'SCHEDULED' | 'WAITING_CONFIRMATION' | 'SAFE_CONFIRMED' | 'OVERDUE' | 'ESCALATED' | 'CANCELLED'
export type SafetyCheckinEvent =
  | 'SCHEDULE' | 'REQUEST_CONFIRMATION' | 'CONFIRM_SAFE' | 'MARK_OVERDUE' | 'ESCALATE' | 'CANCEL'

export interface SafetyTransitionCheck {
  allowed: boolean
  toState: SafetyCheckinState | null
  reason?: string
}

// CONFIRM_SAFE is deliberately valid all the way through ESCALATED — a
// late "I'm actually fine, sorry for the scare" should still be able to
// close the loop even after the safety contact's already been alerted;
// the alert can't be unsent, but the person's current state can still be
// recorded accurately.
//
// CANCEL is NOT valid from ESCALATED: once a real alert has gone out to
// someone's safety contact, silently cancelling without an explicit "I'm
// safe" is worse than requiring CONFIRM_SAFE instead — a judgment call in
// favor of the safety contact never being left more confused than they
// already are.
const TRANSITIONS: Record<SafetyCheckinEvent, { from: SafetyCheckinState[] | null; to: SafetyCheckinState }> = {
  SCHEDULE:             { from: null,                                          to: 'SCHEDULED' },
  REQUEST_CONFIRMATION: { from: ['SCHEDULED'],                                 to: 'WAITING_CONFIRMATION' },
  CONFIRM_SAFE:         { from: ['SCHEDULED', 'WAITING_CONFIRMATION', 'OVERDUE', 'ESCALATED'], to: 'SAFE_CONFIRMED' },
  MARK_OVERDUE:         { from: ['WAITING_CONFIRMATION'],                      to: 'OVERDUE' },
  ESCALATE:             { from: ['OVERDUE'],                                   to: 'ESCALATED' },
  CANCEL:               { from: ['SCHEDULED', 'WAITING_CONFIRMATION', 'OVERDUE'], to: 'CANCELLED' },
}

export const canTransitionSafetyCheckin = (
  fromState: SafetyCheckinState | null,
  event: SafetyCheckinEvent
): SafetyTransitionCheck => {
  const rule = TRANSITIONS[event]

  if (event === 'SCHEDULE') {
    if (fromState !== null) return { allowed: false, toState: null, reason: 'SCHEDULE só é válido para um check-in novo.' }
    return { allowed: true, toState: 'SCHEDULED' }
  }

  if (rule.from === null || !fromState || !rule.from.includes(fromState)) {
    return { allowed: false, toState: null, reason: `${event} não é válido a partir de ${fromState ?? 'nenhum check-in'}.` }
  }
  return { allowed: true, toState: rule.to }
}
