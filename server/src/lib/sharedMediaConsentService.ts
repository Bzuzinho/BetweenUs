// 6.8 — Shared media consent.
//
// SINGLE_MEMBER photos keep the pre-Sprint-6 behavior exactly: the
// uploading profile's owner decides alone (PhotoAccessRequest.ownerId is
// enough, no approvals table involved). MULTIPLE_MEMBERS/SHARED_PROFILE
// photos depict more than one real person, and consent to reveal them is
// about THEIR own image, not the couple's approval-policy setting used
// for matches/travel (ApprovalPolicy's MAJORITY/DESIGNATED would let one
// partner override a depicted person's own veto — wrong for "shows my
// body/face"). So this is deliberately its own ALL-of-the-depicted-set,
// any-single-decline-blocks model, independent of approvalPolicyService.
//
// depictedMemberIds is a plain string[] of userIds (manual tagging by
// whoever uploads/edits the photo, picking from the profile's own active
// members) — explicitly NOT facial recognition, per the spec.
import prisma from './prisma'
import { getActiveMembers } from './profileMembershipService'

export const getRequiredApproverUserIds = async (photo: { profileId: string; memberScope: string; depictedMemberIds: string[] }): Promise<string[]> => {
  if (photo.memberScope === 'SHARED_PROFILE') {
    return (await getActiveMembers(photo.profileId)).map(m => m.userId)
  }
  if (photo.memberScope === 'MULTIPLE_MEMBERS') {
    return photo.depictedMemberIds || []
  }
  return [] // SINGLE_MEMBER — caller falls back to the existing ownerId-only path
}

export const isRequiredApprover = async (photo: { profileId: string; memberScope: string; depictedMemberIds: string[] }, userId: string): Promise<boolean> => {
  if (photo.memberScope === 'SINGLE_MEMBER') return false
  const required = await getRequiredApproverUserIds(photo)
  return required.includes(userId)
}

export interface RecordApprovalResult {
  ok: boolean
  error?: string
  finalStatus?: 'PENDING' | 'APPROVED' | 'DECLINED'
}

// Any single decline blocks access outright (a veto model — consistent
// with "this is someone's own image", not a majority vote). Approval only
// resolves to APPROVED once every required approver has said yes.
export const recordApproval = async (
  photoAccessRequestId: string, userId: string, decision: 'APPROVED' | 'DECLINED'
): Promise<RecordApprovalResult> => {
  const request = await prisma.photoAccessRequest.findUnique({
    where: { id: photoAccessRequestId }, include: { photo: true }
  })
  if (!request) return { ok: false, error: 'Pedido não encontrado.' }
  const photo = request.photo as any
  const required = await getRequiredApproverUserIds(photo)
  if (!required.includes(userId)) return { ok: false, error: 'Não pertences ao grupo de aprovação desta foto.' }

  await (prisma as any).photoAccessApproval.upsert({
    where: { photoAccessRequestId_userId: { photoAccessRequestId, userId } },
    update: { approvedAt: decision === 'APPROVED' ? new Date() : null, rejectedAt: decision === 'DECLINED' ? new Date() : null },
    create: { photoAccessRequestId, userId, approvedAt: decision === 'APPROVED' ? new Date() : null, rejectedAt: decision === 'DECLINED' ? new Date() : null }
  })

  if (decision === 'DECLINED') {
    await prisma.photoAccessRequest.update({ where: { id: photoAccessRequestId }, data: { status: 'DECLINED', respondedAt: new Date() } })
    return { ok: true, finalStatus: 'DECLINED' }
  }

  const approvals = await (prisma as any).photoAccessApproval.findMany({
    where: { photoAccessRequestId, approvedAt: { not: null } }
  })
  const approvedUserIds = new Set<string>(approvals.map((a: any) => a.userId))
  const allApproved = required.every(uid => approvedUserIds.has(uid))

  if (allApproved) {
    await prisma.photoAccessRequest.update({ where: { id: photoAccessRequestId }, data: { status: 'APPROVED', respondedAt: new Date() } })
    return { ok: true, finalStatus: 'APPROVED' }
  }
  return { ok: true, finalStatus: 'PENDING' }
}
