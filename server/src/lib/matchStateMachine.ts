// 5.9 — MatchStateMachine: the single source of truth for which Match
// status transitions are valid. Before this, `status` was written directly
// in at least 4 places (discovery.ts's like route, matchService.ts,
// couples.ts's approve route, privacy.ts's block route) with no shared
// validation - each one just trusted its own reasoning about what state
// the match was "supposed" to be in.
//
// PENDING exists in the MatchStatus enum but, as found in the Sprint 5
// audit, is never actually written by any current code path: a Match row
// is only ever created at the moment of mutual reciprocity, at which point
// the creator already knows whether double consent is required - so it
// goes straight to ACTIVE or PENDING_COUPLE_APPROVAL. PENDING is kept as a
// valid state/transition here (for a future "one-sided pending match"
// concept) without forcing any current caller to use it.
export type MatchState = 'PENDING' | 'PENDING_COUPLE_APPROVAL' | 'ACTIVE' | 'PAUSED' | 'ENDED' | 'BLOCKED'
export type MatchEvent =
  | 'CREATE' | 'REQUIRE_COUPLE_APPROVAL' | 'APPROVE' | 'REJECT' | 'ACTIVATE' | 'PAUSE' | 'RESUME' | 'END' | 'BLOCK'

export interface TransitionCheck {
  allowed: boolean
  toState: MatchState | null
  reason?: string
}

// Each entry: which state(s) an event is valid FROM, and what state it
// leads TO. `from: null` means "no existing Match row" (creation only).
// BLOCK is intentionally valid from every non-terminal state, matching
// today's behavior in privacy.ts (you can block someone regardless of
// what state your match with them is currently in).
const NON_TERMINAL: MatchState[] = ['PENDING', 'PENDING_COUPLE_APPROVAL', 'ACTIVE', 'PAUSED']

const TRANSITIONS: Record<MatchEvent, { from: MatchState[] | null; to: MatchState }> = {
  CREATE:                  { from: null,                                to: 'PENDING' }, // caller picks the real target state via toStateOverride below
  REQUIRE_COUPLE_APPROVAL: { from: ['PENDING'],                         to: 'PENDING_COUPLE_APPROVAL' },
  APPROVE:                 { from: ['PENDING_COUPLE_APPROVAL'],         to: 'PENDING_COUPLE_APPROVAL' }, // self-transition: records one approver, doesn't move the FSM by itself
  // 6.5 — reject flow: any required approver on either side can reject a
  // pending double-consent match. Lands on ENDED, same terminal state as a
  // manually-ended match — the point isn't a distinct status, it's that the
  // MATCH_REJECTED domain event (vs MATCH_ENDED) can carry neutral copy
  // that never reveals WHICH side or WHICH member rejected.
  REJECT:                  { from: ['PENDING_COUPLE_APPROVAL'],         to: 'ENDED' },
  ACTIVATE:                { from: ['PENDING', 'PENDING_COUPLE_APPROVAL'], to: 'ACTIVE' },
  PAUSE:                   { from: ['ACTIVE'],                          to: 'PAUSED' },
  RESUME:                  { from: ['PAUSED'],                          to: 'ACTIVE' },
  END:                     { from: ['PENDING', 'PENDING_COUPLE_APPROVAL', 'ACTIVE', 'PAUSED'], to: 'ENDED' },
  BLOCK:                   { from: NON_TERMINAL,                        to: 'BLOCKED' },
}

// CREATE is special: the target state depends on whether double consent is
// required, decided by the caller (matchService already has this logic),
// not by the state machine itself - so CREATE accepts an explicit
// toStateOverride instead of always producing PENDING.
export const canTransition = (
  fromState: MatchState | null,
  event: MatchEvent,
  toStateOverride?: MatchState
): TransitionCheck => {
  const rule = TRANSITIONS[event]

  if (event === 'CREATE') {
    if (fromState !== null) return { allowed: false, toState: null, reason: 'CREATE só é válido para um match novo.' }
    const target = toStateOverride || 'PENDING'
    if (!['PENDING', 'PENDING_COUPLE_APPROVAL', 'ACTIVE'].includes(target)) {
      return { allowed: false, toState: null, reason: `Estado inicial inválido: ${target}.` }
    }
    return { allowed: true, toState: target }
  }

  if (rule.from === null || !fromState || !rule.from.includes(fromState)) {
    return { allowed: false, toState: null, reason: `${event} não é válido a partir de ${fromState ?? 'nenhum match'}.` }
  }
  return { allowed: true, toState: rule.to }
}
