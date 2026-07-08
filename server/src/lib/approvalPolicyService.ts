// 6.5 — ApprovalPolicy: formalizes what was previously an unstated
// assumption baked directly into couples.ts's approve route ("every
// required approver must approve" = ALL, always). Profile.approvalPolicy
// (schema, Sprint 6) makes that an explicit, admin-visible value instead
// of implicit code behavior — see the field's own schema comment for why
// COUPLE is pinned to ALL regardless of what's stored (a couple always
// means both partners; there's no "majority of 2" that means anything).
import prisma from './prisma'
import { getActiveMembers } from './profileMembershipService'

export type ApprovalPolicy = 'ALL' | 'MAJORITY' | 'DESIGNATED'

export const getEffectiveApprovalPolicy = async (profileId: string): Promise<ApprovalPolicy> => {
  const profile = await prisma.profile.findUnique({ where: { id: profileId }, select: { type: true, approvalPolicy: true } })
  if (!profile) return 'ALL'
  // COUPLE always behaves as ALL — a couple's "required approvers" is at
  // most 2 people, and there's no majority/designated distinction that
  // means anything for a pair. approvalPolicy exists on Profile mainly for
  // GROUP's future use; a COUPLE's stored value (if ever set) is ignored.
  if (profile.type === 'COUPLE') return 'ALL'
  return (profile.approvalPolicy as ApprovalPolicy) || 'ALL'
}

// Whether the given profile side's approval requirement is currently met,
// given the set of user IDs that HAVE approved so far (across the whole
// match, not just this profile — caller filters to this profile's own
// active members before calling).
export const isApprovalSatisfied = async (
  profileId: string,
  approvedUserIds: Set<string>
): Promise<boolean> => {
  const activeMembers = await getActiveMembers(profileId)
  // An individual (or a couple/group with only 1 active member so far)
  // needs nothing further from itself — its single member's own like was
  // already the approval.
  if (activeMembers.length <= 1) return true

  const policy = await getEffectiveApprovalPolicy(profileId)
  const approvedCount = activeMembers.filter(m => approvedUserIds.has(m.userId)).length

  switch (policy) {
    case 'ALL':
      return approvedCount === activeMembers.length
    case 'MAJORITY':
      return approvedCount >= Math.ceil(activeMembers.length / 2)
    case 'DESIGNATED': {
      const designated = activeMembers.find(m => m.isCreator)
      return designated ? approvedUserIds.has(designated.userId) : approvedCount === activeMembers.length
    }
    default:
      return approvedCount === activeMembers.length
  }
}
