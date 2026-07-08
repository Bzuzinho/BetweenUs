// 5.12 — MatchStateMachine (5.9): valid/invalid transitions. Pure function,
// no DB needed - this is exactly the kind of decision logic that should be
// testable in isolation.
import { canTransition } from '../src/lib/matchStateMachine'

describe('canTransition', () => {
  it('CREATE is only valid with no existing match, and only into PENDING/PENDING_COUPLE_APPROVAL/ACTIVE', () => {
    expect(canTransition(null, 'CREATE', 'ACTIVE')).toEqual({ allowed: true, toState: 'ACTIVE' })
    expect(canTransition(null, 'CREATE', 'PENDING_COUPLE_APPROVAL')).toEqual({ allowed: true, toState: 'PENDING_COUPLE_APPROVAL' })
    expect(canTransition(null, 'CREATE').toState).toBe('PENDING') // default when no override given
    expect(canTransition('ACTIVE', 'CREATE').allowed).toBe(false) // already has a state — can't "create" again
  })

  it('ACTIVATE is valid from PENDING and PENDING_COUPLE_APPROVAL, not from ACTIVE itself', () => {
    expect(canTransition('PENDING', 'ACTIVATE')).toEqual({ allowed: true, toState: 'ACTIVE' })
    expect(canTransition('PENDING_COUPLE_APPROVAL', 'ACTIVATE')).toEqual({ allowed: true, toState: 'ACTIVE' })
    expect(canTransition('ACTIVE', 'ACTIVATE').allowed).toBe(false)
  })

  it('PAUSE only valid from ACTIVE, RESUME only valid from PAUSED', () => {
    expect(canTransition('ACTIVE', 'PAUSE')).toEqual({ allowed: true, toState: 'PAUSED' })
    expect(canTransition('PAUSED', 'PAUSE').allowed).toBe(false)
    expect(canTransition('PAUSED', 'RESUME')).toEqual({ allowed: true, toState: 'ACTIVE' })
    expect(canTransition('ACTIVE', 'RESUME').allowed).toBe(false)
  })

  it('BLOCK is valid from every non-terminal state, never from ENDED or another BLOCKED', () => {
    for (const state of ['PENDING', 'PENDING_COUPLE_APPROVAL', 'ACTIVE', 'PAUSED'] as const) {
      expect(canTransition(state, 'BLOCK')).toEqual({ allowed: true, toState: 'BLOCKED' })
    }
    expect(canTransition('ENDED', 'BLOCK').allowed).toBe(false)
    expect(canTransition('BLOCKED', 'BLOCK').allowed).toBe(false)
  })

  it('END is valid from every non-terminal state, never from a terminal one', () => {
    for (const state of ['PENDING', 'PENDING_COUPLE_APPROVAL', 'ACTIVE', 'PAUSED'] as const) {
      expect(canTransition(state, 'END')).toEqual({ allowed: true, toState: 'ENDED' })
    }
    expect(canTransition('ENDED', 'END').allowed).toBe(false)
    expect(canTransition('BLOCKED', 'END').allowed).toBe(false)
  })

  it('APPROVE is a self-transition — stays in PENDING_COUPLE_APPROVAL, only valid from there', () => {
    expect(canTransition('PENDING_COUPLE_APPROVAL', 'APPROVE')).toEqual({ allowed: true, toState: 'PENDING_COUPLE_APPROVAL' })
    expect(canTransition('ACTIVE', 'APPROVE').allowed).toBe(false)
  })

  it('every event is rejected with no existing match except CREATE', () => {
    expect(canTransition(null, 'ACTIVATE').allowed).toBe(false)
    expect(canTransition(null, 'PAUSE').allowed).toBe(false)
    expect(canTransition(null, 'BLOCK').allowed).toBe(false)
  })
})
