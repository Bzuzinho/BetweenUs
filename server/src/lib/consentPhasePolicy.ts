// 8.4 — ConsentPhasePolicy: per-phase rules for who must respond, how long
// a check stays open, whether accepting new members re-opens it, and what
// it unlocks. Centralizing this means consentCheckService never hardcodes
// "both sides of the match" — a phase that needs a different participant
// set (PHOTO_REQUEST, SAFETY_CHECKIN) only needs a different resolver here.
//
// FACE_REVEAL note: ConsentCheck is match+phase scoped, not tied to a
// specific photoId — per-photo consent for MULTIPLE_MEMBERS/SHARED_PROFILE
// media is already handled separately by sharedMediaConsentService (6.8).
// This phase represents the relationship-level milestone ("are we moving
// to face reveal"), so its required participants default to everyone
// active on both sides of the match, same as CHAT/VIDEO_CALL/
// MEETING_PROPOSAL. Do not conflate the two systems.
import prisma from './prisma'
import { getActiveMembers } from './profileMembershipService'

export type ConsentCheckPhaseValue =
  | 'MATCH' | 'CHAT' | 'PHOTO_REQUEST' | 'FACE_REVEAL'
  | 'VIDEO_CALL' | 'MEETING_PROPOSAL' | 'SAFETY_CHECKIN'

interface ResolveParams {
  matchId: string
  initiatorUserId: string
}

const bothMatchSides = async (matchId: string): Promise<string[]> => {
  const match = await prisma.match.findUnique({ where: { id: matchId } })
  if (!match) return []
  const [one, two] = await Promise.all([
    getActiveMembers(match.profileOneId),
    getActiveMembers(match.profileTwoId)
  ])
  return Array.from(new Set([...one, ...two].map(m => m.userId)))
}

// PHOTO_REQUEST is initiated by one side asking to view/share the OTHER
// side's photos — only the target side needs to answer this particular
// consent check (the requester's own consent isn't in question here).
const targetMatchSide = async (matchId: string, initiatorUserId: string): Promise<string[]> => {
  const match = await prisma.match.findUnique({ where: { id: matchId } })
  if (!match) return []
  const [one, two] = await Promise.all([
    getActiveMembers(match.profileOneId),
    getActiveMembers(match.profileTwoId)
  ])
  const oneIds = one.map(m => m.userId)
  const twoIds = two.map(m => m.userId)
  const initiatorOnOne = oneIds.includes(initiatorUserId)
  return initiatorOnOne ? twoIds : oneIds
}

// SAFETY_CHECKIN is a self-check ("are you safe right now") — only the
// initiator's own profile members are required, never the other match side.
const initiatorMatchSide = async (matchId: string, initiatorUserId: string): Promise<string[]> => {
  const match = await prisma.match.findUnique({ where: { id: matchId } })
  if (!match) return []
  const [one, two] = await Promise.all([
    getActiveMembers(match.profileOneId),
    getActiveMembers(match.profileTwoId)
  ])
  const oneIds = one.map(m => m.userId)
  const twoIds = two.map(m => m.userId)
  return oneIds.includes(initiatorUserId) ? oneIds : twoIds
}

export interface PhasePolicyConfig {
  expirationHours: number
  unlocksAction: string
  // If a new member is accepted into either match side's couple/group
  // profile while a check for this phase is ACCEPTED, should it be
  // reopened (fresh PENDING response added for the newcomer, aggregate
  // falls back to PENDING) so the newcomer explicitly consents too?
  reConsentOnNewMember: boolean
  resolveRequiredParticipants: (params: ResolveParams) => Promise<string[]>
}

export const CONSENT_PHASE_POLICY: Record<ConsentCheckPhaseValue, PhasePolicyConfig> = {
  MATCH: {
    expirationHours: 72,
    unlocksAction: 'MATCH_ACTIVATION',
    reConsentOnNewMember: true,
    resolveRequiredParticipants: ({ matchId }) => bothMatchSides(matchId)
  },
  CHAT: {
    expirationHours: 24,
    unlocksAction: 'CHAT',
    reConsentOnNewMember: false,
    resolveRequiredParticipants: ({ matchId }) => bothMatchSides(matchId)
  },
  PHOTO_REQUEST: {
    expirationHours: 24,
    unlocksAction: 'PRIVATE_PHOTO_ACCESS',
    reConsentOnNewMember: false,
    resolveRequiredParticipants: ({ matchId, initiatorUserId }) => targetMatchSide(matchId, initiatorUserId)
  },
  FACE_REVEAL: {
    expirationHours: 24,
    unlocksAction: 'FACE_REVEAL',
    reConsentOnNewMember: true,
    resolveRequiredParticipants: ({ matchId }) => bothMatchSides(matchId)
  },
  VIDEO_CALL: {
    expirationHours: 12,
    unlocksAction: 'VIDEO_CALL',
    reConsentOnNewMember: false,
    resolveRequiredParticipants: ({ matchId }) => bothMatchSides(matchId)
  },
  MEETING_PROPOSAL: {
    expirationHours: 48,
    unlocksAction: 'MEETING_PROPOSAL',
    reConsentOnNewMember: true,
    resolveRequiredParticipants: ({ matchId }) => bothMatchSides(matchId)
  },
  SAFETY_CHECKIN: {
    expirationHours: 3,
    unlocksAction: 'SAFETY_CHECKIN',
    reConsentOnNewMember: false,
    resolveRequiredParticipants: ({ matchId, initiatorUserId }) => initiatorMatchSide(matchId, initiatorUserId)
  }
}

export const getPhasePolicy = (phase: string): PhasePolicyConfig => {
  const policy = CONSENT_PHASE_POLICY[phase as ConsentCheckPhaseValue]
  if (!policy) throw new Error(`Unknown consent phase: ${phase}`)
  return policy
}
