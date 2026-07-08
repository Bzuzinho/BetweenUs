// 4.2 — ProfileTypePolicy
//
// ProfileType stays a fixed structural enum (INDIVIDUAL/COUPLE/GROUP) —
// deliberately NOT turned into a data-driven admin catalog the way Gender/
// Orientation/Intention/Boundary are. Those are content (labels an admin
// should be able to edit); ProfileType is structure the rest of the
// codebase branches on (matching rules, discovery grid badges, double
// consent). Letting admins invent arbitrary new types would require every
// one of those branches to handle an unknown type gracefully, which is a
// much bigger change than this sprint's taxonomy work.
import prisma from './prisma'

// GROUP profiles (groups.ts) were already fully built and live in
// production before this sprint, with no flag gating them at all. Rather
// than silently disabling a working feature by defaulting this flag to
// false, it defaults to true (preserves current behaviour) but now CAN be
// turned off centrally if the team decides the GROUP UX isn't ready for
// wider rollout — see groups.ts POST / for where this is enforced.
export const isGroupProfilesEnabled = (): boolean =>
  process.env.GROUP_PROFILES_ENABLED !== 'false'

export interface ProfileTypeValidation {
  valid: boolean
  reason?: string
}

// Structural membership rules per type. Called at the points where member
// count actually changes (accept/decline/remove) rather than as a
// blocking gate on every read — a profile can legitimately sit in an
// "invalid" transitional state (e.g. COUPLE with 1 member while
// PENDING_PARTNER) without that being an error.
export const validateMemberCount = (
  type: 'INDIVIDUAL' | 'COUPLE' | 'GROUP',
  status: string,
  activeMemberCount: number
): ProfileTypeValidation => {
  if (type === 'INDIVIDUAL') {
    return activeMemberCount === 1
      ? { valid: true }
      : { valid: false, reason: `INDIVIDUAL deve ter exatamente 1 membro ativo (tem ${activeMemberCount}).` }
  }

  if (type === 'COUPLE') {
    if (status === 'PENDING_PARTNER') {
      return activeMemberCount <= 1
        ? { valid: true }
        : { valid: false, reason: 'COUPLE em PENDING_PARTNER não deveria já ter 2 membros ativos.' }
    }
    return activeMemberCount === 2
      ? { valid: true }
      : { valid: false, reason: `COUPLE ativo deve ter exatamente 2 membros ativos (tem ${activeMemberCount}).` }
  }

  // GROUP — minimum to be defined by product; 2 is the floor (a "group" of
  // 1 is just an individual) and 8 is a placeholder upper bound, not a
  // validated product decision. Revisit before GROUP_PROFILES_ENABLED
  // rollout is treated as final.
  return activeMemberCount >= 2 && activeMemberCount <= 8
    ? { valid: true }
    : { valid: false, reason: `GROUP deve ter entre 2 e 8 membros ativos (tem ${activeMemberCount}).` }
}

export const assertGroupProfilesEnabled = (): ProfileTypeValidation =>
  isGroupProfilesEnabled()
    ? { valid: true }
    : { valid: false, reason: 'Perfis de grupo estão temporariamente desativados.' }
