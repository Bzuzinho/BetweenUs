// BETA.1.20/1.21 — Consent Check scenarios (7 phases, multiple states)
// and Shared Intentions / Connection Agreement (IntentAlignment)
// versioning. Every write goes through consentCheckService /
// intentAlignmentService — never a hand-set ConsentCheck.status or
// IntentAlignment.status, both of which are cached aggregates computed
// by their respective services (see each service's header comment).
import prisma from '../../../src/lib/prisma'
import { createConsentCheck, respondToConsentCheck, revokeConsentCheckResponse, computeAndCacheStatus } from '../../../src/lib/consentCheckService'
import { proposeAlignment, approveAlignment } from '../../../src/lib/intentAlignmentService'

type ProfileMap = Record<string, { profileId: string; userId?: string; memberUserIds?: string[] }>

export const seedConsentChecks = async (
  individuals: ProfileMap, couples: ProfileMap, matchIds: Record<string, string>
): Promise<void> => {
  const marta = individuals['individual_marta']?.userId
  const joana = individuals['individual_joana']?.userId
  const matchIndividual = matchIds.match_individual_active
  const matchCouple = matchIds.match_couple_active
  let count = 0

  if (matchIndividual && marta && joana) {
    // 1. MATCH — PENDING (initiated, nobody has responded yet).
    await createConsentCheck({ matchId: matchIndividual, phase: 'MATCH', initiatedBy: marta })
    count++

    // 2. CHAT — ALL ACCEPTED.
    const chat = await createConsentCheck({ matchId: matchIndividual, phase: 'CHAT', initiatedBy: marta })
    if (chat?.check?.id) {
      await respondToConsentCheck(chat.check.id, marta, 'ACCEPTED')
      await respondToConsentCheck(chat.check.id, joana, 'ACCEPTED')
      count++
    }

    // 3. PHOTO_REQUEST — ONE DECLINED.
    const photo = await createConsentCheck({ matchId: matchIndividual, phase: 'PHOTO_REQUEST', initiatedBy: marta })
    if (photo?.check?.id) {
      await respondToConsentCheck(photo.check.id, marta, 'ACCEPTED')
      await respondToConsentCheck(photo.check.id, joana, 'DECLINED')
      count++
    }

    // 4. FACE_REVEAL — REVOKED (both accepted, then one revokes).
    const face = await createConsentCheck({ matchId: matchIndividual, phase: 'FACE_REVEAL', initiatedBy: marta })
    if (face?.check?.id) {
      await respondToConsentCheck(face.check.id, marta, 'ACCEPTED')
      await respondToConsentCheck(face.check.id, joana, 'ACCEPTED')
      await revokeConsentCheckResponse(face.check.id, joana)
      count++
    }

    // 5. VIDEO_CALL — EXPIRED (expiresAt forced into the past, then
    // recomputed through the real aggregation, not a hand-set status).
    const video = await createConsentCheck({ matchId: matchIndividual, phase: 'VIDEO_CALL', initiatedBy: marta })
    if (video?.check?.id) {
      await prisma.consentCheck.update({ where: { id: video.check.id }, data: { expiresAt: new Date(Date.now() - 60 * 60 * 1000) } })
      await computeAndCacheStatus(video.check.id)
      count++
    }
  }

  if (matchCouple) {
    const c1Members = couples['couple_1_third_match']?.memberUserIds || []
    const initiator = joana || c1Members[0]
    if (initiator) {
      // 6. MEETING_PROPOSAL — ALL ACCEPTED, multi-member required set
      // (individual + both couple members).
      const meeting = await createConsentCheck({ matchId: matchCouple, phase: 'MEETING_PROPOSAL', initiatedBy: initiator })
      if (meeting?.check?.id) {
        const required = [joana, ...c1Members].filter(Boolean) as string[]
        for (const uid of required) await respondToConsentCheck(meeting.check.id, uid, 'ACCEPTED')
        count++
      }

      // 7. SAFETY_CHECKIN — PENDING (left unanswered).
      await createConsentCheck({ matchId: matchCouple, phase: 'SAFETY_CHECKIN', initiatedBy: initiator })
      count++
    }
  }

  console.log(`  Consent Check scenarios: ${count}`)
}

// BETA.1.21 — Shared Intentions versioning across 3 rooms:
//   room_a: V1 ACTIVE only.
//   room_b: V1 ACTIVE, V2 WAITING_APPROVAL (proposed, not yet fully accepted).
//   room_c: V1 ARCHIVED, V2 ACTIVE (superseded).
export const seedSharedIntentions = async (
  roomIds: Record<string, string>, individuals: ProfileMap, couples: ProfileMap
): Promise<void> => {
  const marta = individuals['individual_marta']?.userId
  const joana = individuals['individual_joana']?.userId
  const c1Members = couples['couple_1_third_match']?.memberUserIds || []
  let count = 0

  if (roomIds.room_a_individual_active && marta && joana) {
    const v1 = await proposeAlignment(roomIds.room_a_individual_active, marta, [
      { key: 'connection_goal', value: 'RECURRING' }, { key: 'meeting_openness', value: 'OPEN_NOW' },
    ])
    if (v1.alignment) { await approveAlignment(v1.alignment.id, joana); count++ }
  }

  if (roomIds.room_b_couple_single_waiting && joana && c1Members.length) {
    // Room B's rules are still WAITING_CONSENT (BETA.1.18), but
    // IntentAlignment is a structurally separate concept (8.11) — this
    // exercises V1 ACTIVE, V2 WAITING_APPROVAL independently of room rule
    // state.
    const v1 = await proposeAlignment(roomIds.room_b_couple_single_waiting, joana, [{ key: 'connection_goal', value: 'CASUAL' }])
    if (v1.alignment) {
      for (const uid of c1Members) await approveAlignment(v1.alignment.id, uid)
      const v2 = await proposeAlignment(roomIds.room_b_couple_single_waiting, joana, [{ key: 'connection_goal', value: 'RECURRING' }])
      if (v2.alignment) count++ // left WAITING_APPROVAL deliberately — only proposer auto-approved
    }
  }

  if (roomIds.room_c_couple_couple_active) {
    const c2Members = couples['couple_2_conflict']?.memberUserIds || []
    const allMembers = [...c1Members, ...c2Members]
    if (allMembers.length >= 2) {
      const v1 = await proposeAlignment(roomIds.room_c_couple_couple_active, allMembers[0], [{ key: 'connection_goal', value: 'OPEN_TO_DISCOVER' }])
      if (v1.alignment) {
        for (const uid of allMembers.slice(1)) await approveAlignment(v1.alignment.id, uid)
        const v2 = await proposeAlignment(roomIds.room_c_couple_couple_active, allMembers[0], [{ key: 'connection_goal', value: 'CASUAL' }])
        if (v2.alignment) {
          for (const uid of allMembers.slice(1)) await approveAlignment(v2.alignment.id, uid)
          count++
        }
      }
    }
  }

  console.log(`  Shared Intentions (IntentAlignment) rooms: ${count}`)
}
