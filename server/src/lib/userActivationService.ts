import prisma from './prisma'

// ─── User lifecycle: activation rule + status transition matrix ──────────────
//
// Sprint 2.5.5 — before this file existed, User.status could reach ACTIVE
// through three independent, uncoordinated code paths:
//   1. POST /api/verifications/email/confirm — sets status=ACTIVE directly
//      the moment the user clicks the emailed link.
//   2. PUT /api/admin/profiles/:id/status (APPROVED) — reactivates the
//      account as a side effect, added because approving a profile
//      shouldn't need a second manual step.
//   3. PUT /api/admin/users/:id/status — the "Reactivar" button, which
//      accepted ACTIVE unconditionally with no requirement check at all.
// Approving a user's identity Verification (the selfie flow) touched none
// of these — it only ever set Verification.status + ageVerifiedAt, so an
// admin approving a verification saw no effect on the account itself. That
// mismatch is the bug this sprint reported.
//
// Requirement analysed from the current codebase (not invented): a user
// becomes eligible for ACTIVE once there is *some* authoritative signal
// that they're a real, legitimate person — any ONE of:
//   - they verified their own email (self-serve, the normal path), or
//   - an admin approved their identity verification (selfie), or
//   - an admin approved their Profile (a moderator already vouched for it).
// This matters in practice because Railway has intermittently blocked
// outbound SMTP (see project notes) — email verification alone would strand
// otherwise-legitimate users with no email path. Terms/privacy acceptance
// aren't included as separate gates because they're already required at
// registration time (registerSchema) and always stamped on User.create.

export type ActivationRequirement = 'EMAIL_VERIFICATION' | 'IDENTITY_VERIFICATION' | 'PROFILE_APPROVAL'

export interface ActivationEvaluation {
  canActivate: boolean
  satisfiedBy: ActivationRequirement[]
  missing: ActivationRequirement[]
}

interface ActivationInput {
  emailVerifiedAt: Date | null
  verification?: { status: string } | null
  profile?: { status: string } | null
}

export function canActivateUser(user: ActivationInput): ActivationEvaluation {
  const satisfiedBy: ActivationRequirement[] = []
  if (user.emailVerifiedAt) satisfiedBy.push('EMAIL_VERIFICATION')
  if (user.verification?.status === 'APPROVED') satisfiedBy.push('IDENTITY_VERIFICATION')
  if (user.profile?.status === 'APPROVED') satisfiedBy.push('PROFILE_APPROVAL')

  return {
    canActivate: satisfiedBy.length > 0,
    satisfiedBy,
    // Any one of the three would do — report all three as "missing" only when none are met,
    // so the UI can say "falta um destes" rather than implying all three are individually required.
    missing: satisfiedBy.length > 0 ? [] : ['EMAIL_VERIFICATION', 'IDENTITY_VERIFICATION', 'PROFILE_APPROVAL'],
  }
}

export interface ActivationResult {
  activated: boolean
  evaluation: ActivationEvaluation
  reason: 'NOT_PENDING' | 'REQUIREMENTS_MET' | 'REQUIREMENTS_NOT_MET'
}

// Central place to call whenever something changes that could unblock activation:
// email confirmation, identity verification approval, profile approval.
// No-ops (activated:false, reason:'NOT_PENDING') if the user isn't currently
// PENDING_VERIFICATION — never moves a SUSPENDED/BANNED/ACTIVE user by accident.
export async function evaluateAndActivateUser(userId: string): Promise<ActivationResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      status: true, emailVerifiedAt: true,
      verification: { select: { status: true } },
      profile: { select: { status: true } },
    }
  })
  if (!user) return { activated: false, evaluation: { canActivate: false, satisfiedBy: [], missing: [] }, reason: 'NOT_PENDING' }

  if (user.status !== 'PENDING_VERIFICATION') {
    return { activated: false, evaluation: canActivateUser(user), reason: 'NOT_PENDING' }
  }

  const evaluation = canActivateUser(user)
  if (!evaluation.canActivate) {
    return { activated: false, evaluation, reason: 'REQUIREMENTS_NOT_MET' }
  }

  await prisma.user.update({ where: { id: userId }, data: { status: 'ACTIVE' } })
  return { activated: true, evaluation, reason: 'REQUIREMENTS_MET' }
}

// ─── Explicit status transition matrix ────────────────────────────────────────
// PENDING_VERIFICATION → ACTIVE is deliberately NOT listed here — it must only
// happen through evaluateAndActivateUser (requirement-checked), never through a
// raw manual status write. "Reactivar" in the admin UI is for SUSPENDED → ACTIVE.
type UserStatusValue = 'ACTIVE' | 'PENDING_VERIFICATION' | 'SUSPENDED' | 'BANNED' | 'DELETED'

export const ALLOWED_STATUS_TRANSITIONS: Record<UserStatusValue, UserStatusValue[]> = {
  PENDING_VERIFICATION: ['BANNED'],
  ACTIVE:                ['SUSPENDED', 'BANNED'],
  SUSPENDED:             ['ACTIVE', 'BANNED'],
  BANNED:                [],
  DELETED:               [],
}

export function canTransitionStatus(from: string, to: string): boolean {
  const allowed = ALLOWED_STATUS_TRANSITIONS[from as UserStatusValue]
  return !!allowed && allowed.includes(to as UserStatusValue)
}
