// 6.1/6.3/6.4 — ProfileAgreementService: "Modo Acordo", the real version.
//
// Before Sprint 6, the couple's shared intentions/boundaries were just
// whatever Profile fields either partner last PUT directly (CouplePage.jsx
// called PUT /profiles/me and PUT /profiles/me/boundaries) - no individual
// answers, no waiting for the other member, no conflict detection at all.
// This replaces that with a real per-member-answer mechanic: each member
// answers in their OWN session (profileMemberId is always resolved from
// the authenticated user, never accepted from the request body - this is
// what makes "cannot answer for your partner" structurally true rather
// than just a policy), and the shared/effective result is computed
// conservatively (never more permissive than the most restrictive member)
// and synced into the actual ProfileBoundary rows so discovery/matching
// reflect it immediately.
import prisma from './prisma'
import { getActiveMembers } from './profileMembershipService'
import { invalidateScoresForProfile } from './scoreInvalidationService'

export type AgreementPreference = 'YES' | 'MAYBE' | 'NO'
export type AgreementStatus = 'DRAFT' | 'WAITING_MEMBERS' | 'ALIGNED' | 'CONFLICT' | 'LOCKED' | 'EXPIRED'

export interface AgreementRef {
  boundaryId?: string
  agreementQuestionId?: string
}

// The conservative merge rule from the spec, applied pairwise: YES+YES=YES,
// YES+MAYBE=MAYBE, YES+NO=NO, MAYBE+MAYBE=MAYBE, MAYBE+NO=NO, NO+NO=NO.
// NO always wins, then MAYBE, then YES — order-independent, so folding any
// number of members (2 for a couple today, 3+ for a future group) works
// the same way regardless of order.
const RANK: Record<AgreementPreference, number> = { NO: 0, MAYBE: 1, YES: 2 }
export const mergePreferences = (prefs: AgreementPreference[]): AgreementPreference => {
  if (prefs.length === 0) return 'MAYBE'
  const minRank = Math.min(...prefs.map(p => RANK[p]))
  return (Object.keys(RANK) as AgreementPreference[]).find(k => RANK[k] === minRank)!
}

// Resolves the ProfileMember row backing (profileId, userId) — self-heals
// legacy couples that predate the ProfileMember dual-write (4.1) by
// creating the missing row on demand, rather than requiring a separate
// migration pass before Modo Acordo can be used. Returns null if the user
// isn't currently an active member of this profile at all (never lets a
// non-member answer, and structurally never accepts a profileMemberId
// from the caller — it's always derived from the authenticated user).
const resolveProfileMemberId = async (profileId: string, userId: string): Promise<string | null> => {
  const existing = await (prisma as any).profileMember.findFirst({ where: { profileId, userId, status: 'ACCEPTED' } })
  if (existing) return existing.id

  const activeMembers = await getActiveMembers(profileId)
  const isActive = activeMembers.some(m => m.userId === userId)
  if (!isActive) return null

  const coupleProfile = await prisma.coupleProfile.findUnique({ where: { profileId } })
  const isCreator = coupleProfile ? coupleProfile.partnerOneUserId === userId : true
  const created = await (prisma as any).profileMember.create({
    data: { profileId, userId, isCreator, status: 'ACCEPTED', respondedAt: new Date() }
  })
  return created.id
}

// Only COUPLE/GROUP profiles use Modo Acordo — an INDIVIDUAL profile has
// no "other member" to align with, so this deliberately returns null
// rather than creating a meaningless single-member agreement.
export const getOrCreateCurrentAgreement = async (profileId: string) => {
  const profile = await prisma.profile.findUnique({ where: { id: profileId }, select: { type: true } })
  if (!profile || profile.type === 'INDIVIDUAL') return null

  const latest = await (prisma as any).profileAgreement.findFirst({
    where: { profileId }, orderBy: { version: 'desc' }
  })
  if (latest && latest.status !== 'EXPIRED') return latest

  const nextVersion = (latest?.version || 0) + 1
  return (prisma as any).profileAgreement.create({
    data: { profileId, version: nextVersion, status: 'DRAFT' }
  })
}

interface QuestionResult {
  ref: AgreementRef
  label: string
  category: string | null
  sharedPreference: AgreementPreference | null // null if not every active member has answered yet
  aligned: boolean // true only if every member's answer is identical
}

// Recomputes status + per-question results from scratch every time,
// rather than trying to incrementally patch a cached status — with at
// most a handful of members and questions per couple, this is cheap, and
// avoids an entire class of "status drifted from the actual answers" bugs.
const computeAgreementState = async (agreementId: string): Promise<{
  status: AgreementStatus
  results: QuestionResult[]
}> => {
  const agreement = await (prisma as any).profileAgreement.findUnique({
    where: { id: agreementId },
    include: {
      answers: { include: { boundary: true, agreementQuestion: true } }
    }
  })
  if (!agreement) return { status: 'EXPIRED', results: [] }
  if (agreement.status === 'LOCKED' || agreement.status === 'EXPIRED') {
    return { status: agreement.status, results: [] }
  }

  const activeMembers = await getActiveMembers(agreement.profileId)
  const memberRows = activeMembers.length > 0
    ? await (prisma as any).profileMember.findMany({
        where: { profileId: agreement.profileId, userId: { in: activeMembers.map((m: any) => m.userId) }, status: 'ACCEPTED' },
        select: { id: true }
      })
    : []
  const requiredMemberIds: string[] = memberRows.map((m: any) => m.id)

  if (agreement.answers.length === 0) return { status: 'DRAFT', results: [] }

  const byQuestion = new Map<string, { label: string; category: string | null; ref: AgreementRef; answers: Map<string, AgreementPreference> }>()
  for (const a of agreement.answers) {
    const key = a.boundaryId ? `b:${a.boundaryId}` : `q:${a.agreementQuestionId}`
    if (!byQuestion.has(key)) {
      byQuestion.set(key, {
        label: a.boundary?.name || a.agreementQuestion?.label || key,
        category: a.boundary?.category || a.agreementQuestion?.category || null,
        ref: a.boundaryId ? { boundaryId: a.boundaryId } : { agreementQuestionId: a.agreementQuestionId },
        answers: new Map()
      })
    }
    byQuestion.get(key)!.answers.set(a.profileMemberId, a.preference)
  }

  // Fewer than 2 active members (e.g. a COUPLE still waiting for its
  // partner to accept the invite) can never reach ALIGNED/CONFLICT - it's
  // structurally still "waiting for members", regardless of how complete
  // the one existing member's own answers are.
  const notEnoughMembers = requiredMemberIds.length < 2

  let anyIncomplete = notEnoughMembers
  let anyConflict = false
  const results: QuestionResult[] = []

  for (const [, q] of byQuestion) {
    const answeredIds = [...q.answers.keys()]
    const allAnswered = !notEnoughMembers && requiredMemberIds.every(id => answeredIds.includes(id))
    if (!allAnswered) {
      anyIncomplete = true
      results.push({ ref: q.ref, label: q.label, category: q.category, sharedPreference: null, aligned: false })
      continue
    }
    const prefs = requiredMemberIds.map(id => q.answers.get(id)!)
    const uniquePrefs = new Set(prefs)
    const aligned = uniquePrefs.size === 1
    if (!aligned) anyConflict = true
    results.push({ ref: q.ref, label: q.label, category: q.category, sharedPreference: mergePreferences(prefs), aligned })
  }

  const status: AgreementStatus = anyIncomplete ? 'WAITING_MEMBERS' : (anyConflict ? 'CONFLICT' : 'ALIGNED')
  return { status, results }
}

// Syncs every question with a computed sharedPreference into the real
// ProfileBoundary rows (boundaryId refs only — AgreementQuestion refs like
// BOTH_VALIDATE_MATCH have no Profile.boundaries equivalent, they're
// informational/process-only, see the schema comment on AgreementQuestion).
// This is what makes Modo Acordo actually DRIVE discovery/matching instead
// of being a separate, disconnected form - the conservative merge becomes
// the couple's real BoundaryCompatibilityService input the moment every
// member has weighed in on a question, even before the whole agreement
// reaches ALIGNED (a CONFLICT question still has a well-defined
// conservative merged value).
const syncSharedBoundaries = async (profileId: string, results: QuestionResult[]) => {
  let changed = false
  for (const r of results) {
    if (!r.ref.boundaryId || r.sharedPreference === null) continue
    await prisma.profileBoundary.upsert({
      where: { profileId_boundaryId: { profileId, boundaryId: r.ref.boundaryId } },
      update: { preference: r.sharedPreference as any },
      create: { profileId, boundaryId: r.ref.boundaryId, preference: r.sharedPreference as any }
    })
    changed = true
  }
  if (changed) await invalidateScoresForProfile(profileId).catch(() => {})
}

export interface SubmitAnswerResult {
  ok: boolean
  error?: string
  status?: AgreementStatus
}

// The ONLY way an answer gets written. profileId+userId together resolve
// profileMemberId server-side - there is no code path anywhere that lets
// a request specify "answer on behalf of profileMemberId X", which is
// exactly what makes "member answers own questions only" a structural
// guarantee rather than a check someone could forget to add at a call site.
export const submitAnswer = async (
  profileId: string, userId: string, ref: AgreementRef, preference: AgreementPreference
): Promise<SubmitAnswerResult> => {
  if (!ref.boundaryId && !ref.agreementQuestionId) return { ok: false, error: 'Referência de pergunta inválida.' }
  if (ref.boundaryId && ref.agreementQuestionId) return { ok: false, error: 'Referência de pergunta ambígua.' }

  const profileMemberId = await resolveProfileMemberId(profileId, userId)
  if (!profileMemberId) return { ok: false, error: 'Não pertences a este perfil.' }

  const agreement = await getOrCreateCurrentAgreement(profileId)
  if (!agreement) return { ok: false, error: 'Modo Acordo não se aplica a perfis individuais.' }
  if (agreement.status === 'LOCKED') return { ok: false, error: 'O acordo atual está bloqueado. Inicia uma nova ronda para alterar respostas.' }

  const existing = await (prisma as any).profileAgreementAnswer.findFirst({
    where: {
      agreementId: agreement.id, profileMemberId,
      ...(ref.boundaryId ? { boundaryId: ref.boundaryId } : { agreementQuestionId: ref.agreementQuestionId })
    }
  })
  if (existing) {
    await (prisma as any).profileAgreementAnswer.update({ where: { id: existing.id }, data: { preference } })
  } else {
    await (prisma as any).profileAgreementAnswer.create({
      data: { agreementId: agreement.id, profileMemberId, boundaryId: ref.boundaryId || null, agreementQuestionId: ref.agreementQuestionId || null, preference }
    })
  }

  const { status, results } = await computeAgreementState(agreement.id)
  await (prisma as any).profileAgreement.update({ where: { id: agreement.id }, data: { status } })
  await syncSharedBoundaries(profileId, results)

  return { ok: true, status }
}

// Member-facing summary — NEVER includes per-member answers, only the
// merged/shared result and whether the group is aligned on each question.
// "You aren't aligned on 2 points yet", never "Sofia selected NO".
export const getAgreementSummary = async (profileId: string) => {
  const agreement = await getOrCreateCurrentAgreement(profileId)
  if (!agreement) return null
  const { status, results } = agreement.status === 'LOCKED' || agreement.status === 'EXPIRED'
    ? { status: agreement.status as AgreementStatus, results: [] as QuestionResult[] }
    : await computeAgreementState(agreement.id)

  const conflicts = results.filter(r => !r.aligned && r.sharedPreference !== null)
  const missing = results.filter(r => r.sharedPreference === null)

  return {
    id: agreement.id,
    version: agreement.version,
    status,
    lockedAt: agreement.lockedAt,
    expiresAt: agreement.expiresAt,
    results: results.map(r => ({ label: r.label, category: r.category, sharedPreference: r.sharedPreference, aligned: r.aligned })),
    conflictCount: conflicts.length,
    missingCount: missing.length,
  }
}

// Member-facing — a member's OWN answers only (fine to show yourself your
// own choices), for prefilling their own edit view. Still resolves
// profileMemberId server-side from userId, same as submitAnswer.
export const getMyAnswers = async (profileId: string, userId: string) => {
  const profileMemberId = await resolveProfileMemberId(profileId, userId)
  if (!profileMemberId) return null
  const agreement = await getOrCreateCurrentAgreement(profileId)
  if (!agreement) return null
  const answers = await (prisma as any).profileAgreementAnswer.findMany({
    where: { agreementId: agreement.id, profileMemberId },
    select: { boundaryId: true, agreementQuestionId: true, preference: true }
  })
  return { agreementId: agreement.id, version: agreement.version, status: agreement.status, answers }
}

// 6.4 — locking is a deliberate, separate action, not automatic on
// reaching ALIGNED. A couple can lock while still in CONFLICT (the spec
// is explicit: "Um acordo pode permanecer CONFLICT. Perfil pode continuar
// a existir" - locking just freezes the current round, it doesn't require
// resolution first, which would create exactly the "pressure to reach
// YES" the spec warns against).
export const lockAgreement = async (profileId: string): Promise<SubmitAnswerResult> => {
  const agreement = await getOrCreateCurrentAgreement(profileId)
  if (!agreement) return { ok: false, error: 'Modo Acordo não se aplica a perfis individuais.' }
  if (agreement.status === 'DRAFT') return { ok: false, error: 'Ainda não há respostas para bloquear.' }
  await (prisma as any).profileAgreement.update({ where: { id: agreement.id }, data: { status: 'LOCKED', lockedAt: new Date() } })
  return { ok: true, status: 'LOCKED' }
}

// Starts a fresh round (new version) — e.g. after a LOCKED agreement, or
// if members want to reconsider from scratch rather than editing answers
// within the current version.
export const startNewRound = async (profileId: string): Promise<SubmitAnswerResult> => {
  const profile = await prisma.profile.findUnique({ where: { id: profileId }, select: { type: true } })
  if (!profile || profile.type === 'INDIVIDUAL') return { ok: false, error: 'Modo Acordo não se aplica a perfis individuais.' }
  const latest = await (prisma as any).profileAgreement.findFirst({ where: { profileId }, orderBy: { version: 'desc' } })
  const nextVersion = (latest?.version || 0) + 1
  const created = await (prisma as any).profileAgreement.create({ data: { profileId, version: nextVersion, status: 'DRAFT' } })
  return { ok: true, status: created.status }
}

// 6.1 — membership changes (a new partner joining, someone leaving)
// invalidate the current agreement: it no longer represents who's
// actually on the profile. Hooked into ProfileMembershipService's
// acceptMembership/removeMember, same pattern as 5.8's score invalidation.
export const expireAgreementOnMembershipChange = async (profileId: string): Promise<void> => {
  const latest = await (prisma as any).profileAgreement.findFirst({ where: { profileId }, orderBy: { version: 'desc' } })
  if (!latest || latest.status === 'EXPIRED') return
  await (prisma as any).profileAgreement.update({ where: { id: latest.id }, data: { status: 'EXPIRED' } }).catch(() => {})
}
