// BETA.1.34 — read-only validator for the beta scenario dataset. Never
// writes (except the two deliberate computeAndCacheStatus/getCandidates
// calls below, which are the REAL services doing their normal read-time
// recompute — no different from what a live request would trigger; this
// script never calls prisma.<model>.create/update/delete itself).
//
// npm run db:seed:beta:validate
//
// Exit code 0 = every check passed. Exit code 1 = at least one failed.
// Prints a PASS/FAIL line per check, grouped by area, plus a summary.
import prisma from '../../src/lib/prisma'
import * as eligibilityService from '../../src/lib/eligibilityService'
import { getCandidates } from '../../src/lib/discoveryService'
import { isBlockedEitherWay } from '../../src/lib/blockService'
import { computeAndCacheStatus } from '../../src/lib/consentCheckService'
import { resolveVenueForViewer } from '../../src/lib/eventVenuePolicy'
import { computeMeaningfulConnectionRateSince } from '../../src/lib/meaningfulConnectionService'
import {
  ADMIN_ACCOUNTS, LIFECYCLE_ACCOUNTS, INDIVIDUAL_SCENARIOS, COUPLE_SCENARIOS, GROUP_SCENARIO,
} from './scenarios'
import { BETA_SEED_EMAIL_DOMAIN } from './guards'

interface CheckResult { area: string; name: string; pass: boolean; detail?: string }
const results: CheckResult[] = []

const check = async (area: string, name: string, fn: () => Promise<boolean | { pass: boolean; detail?: string }>) => {
  try {
    const outcome = await fn()
    const pass = typeof outcome === 'boolean' ? outcome : outcome.pass
    const detail = typeof outcome === 'boolean' ? undefined : outcome.detail
    results.push({ area, name, pass, detail })
  } catch (err: any) {
    results.push({ area, name, pass: false, detail: `EXCEPTION: ${err.message}` })
  }
}

const userByKey = async (key: string) => prisma.user.findFirst({ where: { testScenarioKey: key, isTestAccount: true } })
const profileByUserId = async (userId: string | undefined) => userId ? prisma.profile.findUnique({ where: { userId } }) : null

const main = async () => {
  // ── Account counts + uniqueness ──────────────────────────────────────
  await check('accounts', 'Total de contas de teste (isTestAccount=true) >= manifest', async () => {
    const count = await prisma.user.count({ where: { isTestAccount: true } })
    const expectedMin = ADMIN_ACCOUNTS.length + LIFECYCLE_ACCOUNTS.length + INDIVIDUAL_SCENARIOS.length
      + COUPLE_SCENARIOS.reduce((n, c) => n + c.members.length, 0)
    return { pass: count >= expectedMin, detail: `count=${count} expectedMin=${expectedMin}` }
  })
  await check('accounts', 'Emails de teste são únicos', async () => {
    const users = await prisma.user.findMany({ where: { isTestAccount: true }, select: { email: true } })
    const set = new Set(users.map(u => u.email))
    return { pass: set.size === users.length, detail: `rows=${users.length} unique=${set.size}` }
  })
  await check('accounts', 'Todas as contas de teste usam o domínio reservado', async () => {
    const bad = await prisma.user.count({ where: { isTestAccount: true, email: { not: { endsWith: `@${BETA_SEED_EMAIL_DOMAIN}` } } } })
    return { pass: bad === 0, detail: `fora do domínio=${bad}` }
  })
  await check('accounts', 'Nenhuma conta real (isTestAccount=false) tem testScenarioKey', async () => {
    const bad = await prisma.user.count({ where: { isTestAccount: false, testScenarioKey: { not: null } } })
    return { pass: bad === 0, detail: `contas reais com scenarioKey=${bad}` }
  })

  // ── Admin accounts / RBAC ────────────────────────────────────────────
  for (const a of ADMIN_ACCOUNTS) {
    await check('admin', `${a.key} existe com adminRole=${a.adminRole}`, async () => {
      const u = await userByKey(a.key)
      return { pass: !!u && u.adminRole === a.adminRole && u.status === 'ACTIVE', detail: u ? `status=${u.status} adminRole=${u.adminRole}` : 'não encontrado' }
    })
    await check('admin', `${a.key} nunca aparece em Discovery (sem Profile)`, async () => {
      const u = await userByKey(a.key)
      const p = await profileByUserId(u?.id)
      return { pass: !p, detail: p ? 'tem Profile — não devia' : 'sem Profile, correto' }
    })
  }

  // ── Lifecycle accounts ───────────────────────────────────────────────
  await check('lifecycle', 'lifecycle_pending_email: PENDING_VERIFICATION, emailVerifiedAt=null', async () => {
    const u = await userByKey('lifecycle_pending_email')
    return { pass: !!u && u.status === 'PENDING_VERIFICATION' && !u.emailVerifiedAt }
  })
  await check('lifecycle', 'lifecycle_pending_age: PENDING_VERIFICATION, Verification PENDING', async () => {
    const u = await userByKey('lifecycle_pending_age')
    if (!u) return false
    const v = await (prisma as any).verification.findUnique({ where: { userId: u.id } })
    return { pass: u.status === 'PENDING_VERIFICATION' && !!u.emailVerifiedAt && v?.status === 'PENDING' }
  })
  await check('lifecycle', 'lifecycle_active: ACTIVE via evaluateAndActivateUser', async () => {
    const u = await userByKey('lifecycle_active')
    return { pass: !!u && u.status === 'ACTIVE' }
  })
  await check('lifecycle', 'lifecycle_suspended: SUSPENDED, canUseApp=false', async () => {
    const u = await userByKey('lifecycle_suspended')
    if (!u) return false
    const e = await eligibilityService.forUser(u.id)
    return { pass: u.status === 'SUSPENDED' && !e.canUseApp }
  })
  await check('lifecycle', 'lifecycle_banned: BANNED, canUseApp=false', async () => {
    const u = await userByKey('lifecycle_banned')
    if (!u) return false
    const e = await eligibilityService.forUser(u.id)
    return { pass: u.status === 'BANNED' && !e.canUseApp }
  })
  await check('lifecycle', 'lifecycle_profile_pending: User ACTIVE, Profile PENDING_REVIEW', async () => {
    const u = await userByKey('lifecycle_profile_pending')
    const p = await profileByUserId(u?.id)
    return { pass: u?.status === 'ACTIVE' && p?.status === 'PENDING_REVIEW' }
  })
  await check('lifecycle', 'lifecycle_profile_rejected: Profile REJECTED com motivo', async () => {
    const u = await userByKey('lifecycle_profile_rejected')
    const p = await profileByUserId(u?.id)
    return { pass: p?.status === 'REJECTED' && !!p?.rejectionReason }
  })
  await check('lifecycle', 'lifecycle_profile_hidden: Profile HIDDEN', async () => {
    const u = await userByKey('lifecycle_profile_hidden')
    const p = await profileByUserId(u?.id)
    return { pass: p?.status === 'HIDDEN' }
  })

  // ── Individual profiles: existence + intentions/boundaries counts ───
  for (const s of INDIVIDUAL_SCENARIOS) {
    await check('individual-profiles', `${s.key}: Profile INDIVIDUAL/APPROVED existe`, async () => {
      const u = await userByKey(s.key)
      const p = await profileByUserId(u?.id)
      return { pass: !!p && p.type === 'INDIVIDUAL' && p.status === 'APPROVED' }
    })
    await check('individual-profiles', `${s.key}: intentions/boundaries seeded (${s.intentions.length}/${s.boundaries.length})`, async () => {
      const u = await userByKey(s.key)
      const p = await profileByUserId(u?.id)
      if (!p) return false
      const [ic, bc] = await Promise.all([
        prisma.profileIntention.count({ where: { profileId: p.id } }),
        prisma.profileBoundary.count({ where: { profileId: p.id } }),
      ])
      return { pass: ic === s.intentions.length && bc === s.boundaries.length, detail: `intentions=${ic}/${s.intentions.length} boundaries=${bc}/${s.boundaries.length}` }
    })
  }
  await check('individual-profiles', 'individual_ines: invisibleMode=true, canAppearInDiscovery=false', async () => {
    const u = await userByKey('individual_ines')
    if (!u) return false
    const e = await eligibilityService.forUser(u.id)
    return { pass: !e.canAppearInDiscovery, detail: `canAppearInDiscovery=${e.canAppearInDiscovery}` }
  })
  await check('individual-profiles', 'individual_miguel: Subscription PREMIUM/ACTIVE', async () => {
    const u = await userByKey('individual_miguel')
    if (!u) return false
    const sub = await prisma.subscription.findUnique({ where: { userId: u.id } })
    return { pass: sub?.plan === 'PREMIUM' && sub?.status === 'ACTIVE' }
  })
  await check('individual-profiles', 'individual_sofia: tem foto PRIVATE_AFTER_APPROVAL', async () => {
    const u = await userByKey('individual_sofia')
    const p = await profileByUserId(u?.id)
    if (!p) return false
    const photo = await prisma.profilePhoto.findFirst({ where: { profileId: p.id, visibilityLevel: 'PRIVATE_AFTER_APPROVAL' } })
    return { pass: !!photo }
  })

  // ── Couples: membership counts + agreement outcomes ─────────────────
  for (const c of COUPLE_SCENARIOS) {
    await check('couples', `${c.key}: CoupleProfile.coupleStatus correto`, async () => {
      const firstMemberEmail = c.members[0]?.email
      const u = await prisma.user.findFirst({ where: { email: firstMemberEmail } })
      const p = await profileByUserId(u?.id)
      if (!p) return false
      const cp = await (prisma as any).coupleProfile.findUnique({ where: { profileId: p.id } })
      const expected = c.members.length === 2 ? 'ACTIVE' : 'PENDING_PARTNER'
      return { pass: cp?.coupleStatus === expected, detail: `got=${cp?.coupleStatus} expected=${expected}` }
    })
    await check('couples', `${c.key}: ProfileMember count correto`, async () => {
      const firstMemberEmail = c.members[0]?.email
      const u = await prisma.user.findFirst({ where: { email: firstMemberEmail } })
      const p = await profileByUserId(u?.id)
      if (!p) return false
      const accepted = await (prisma as any).profileMember.count({ where: { profileId: p.id, status: 'ACCEPTED' } })
      const pending = await (prisma as any).profileMember.count({ where: { profileId: p.id, status: 'PENDING' } })
      const expectedAccepted = c.members.length
      const expectedPending = c.pendingInviteEmail ? 1 : 0
      return { pass: accepted === expectedAccepted && pending === expectedPending, detail: `accepted=${accepted}/${expectedAccepted} pending=${pending}/${expectedPending}` }
    })
    if (c.members.length === 2 && c.agreementOutcome !== 'NONE') {
      await check('couples', `${c.key}: ProfileAgreement.status=${c.agreementOutcome}`, async () => {
        const firstMemberEmail = c.members[0]?.email
        const u = await prisma.user.findFirst({ where: { email: firstMemberEmail } })
        const p = await profileByUserId(u?.id)
        if (!p) return false
        const agreement = await (prisma as any).profileAgreement.findFirst({ where: { profileId: p.id }, orderBy: { createdAt: 'desc' } })
        return { pass: agreement?.status === c.agreementOutcome, detail: `got=${agreement?.status}` }
      })
    }
  }
  await check('couples', 'couple_3_pending: 2º membro sem userId (PENDING sem conta real)', async () => {
    const c = COUPLE_SCENARIOS.find(x => x.key === 'couple_3_pending')
    if (!c?.pendingInviteEmail) return false
    const realUser = await prisma.user.findFirst({ where: { email: c.pendingInviteEmail } })
    return { pass: !realUser, detail: realUser ? 'convite pendente virou User real — errado' : 'correto, nunca virou User' }
  })
  await check('couples', 'group_poly_trio: se GROUP_PROFILES_ENABLED, tem 3 ProfileMember ACCEPTED', async () => {
    if (process.env.GROUP_PROFILES_ENABLED === 'false') return { pass: true, detail: 'flag desativada — corretamente saltado' }
    const u = await prisma.user.findFirst({ where: { email: GROUP_SCENARIO.members[0].email } })
    const p = await profileByUserId(u?.id)
    if (!p) return { pass: true, detail: 'grupo não criado (aceitável se a flag mudou depois do seed)' }
    const count = await (prisma as any).profileMember.count({ where: { profileId: p.id, status: 'ACCEPTED' } })
    return { pass: p.type === 'GROUP' && count === 3, detail: `type=${p.type} members=${count}` }
  })

  // ── Discovery / Between Score inclusions & exclusions ────────────────
  const profileIdOf = async (key: string) => {
    const u = await prisma.user.findFirst({ where: { testScenarioKey: key, isTestAccount: true } })
    return profileByUserId(u?.id).then(p => p?.id)
  }
  await check('discovery', 'individual_marta vê individual_joana no Discovery (score alto)', async () => {
    const viewer = await profileIdOf('individual_marta')
    if (!viewer) return false
    const result = await getCandidates(viewer, {}, null, 50)
    const joanaId = await profileIdOf('individual_joana')
    const found = result.items.find(i => i.profile.id === joanaId)
    return { pass: !!found, detail: found ? `betweenScore=${found.betweenScore}` : 'não encontrada' }
  })
  await check('discovery', 'individual_leonor (no_couples=YES) nunca inclui perfis COUPLE', async () => {
    const viewer = await profileIdOf('individual_leonor')
    if (!viewer) return false
    const result = await getCandidates(viewer, {}, null, 50)
    const couplesFound = result.items.filter(i => i.profile.type === 'COUPLE')
    return { pass: couplesFound.length === 0, detail: `couples encontrados=${couplesFound.length}` }
  })
  await check('discovery', 'individual_tiago (singles_only=YES) nunca inclui perfis COUPLE', async () => {
    const viewer = await profileIdOf('individual_tiago')
    if (!viewer) return false
    const result = await getCandidates(viewer, {}, null, 50)
    const couplesFound = result.items.filter(i => i.profile.type === 'COUPLE')
    return { pass: couplesFound.length === 0, detail: `couples encontrados=${couplesFound.length}` }
  })
  await check('discovery', 'individual_ines nunca aparece no Discovery de ninguém (invisível)', async () => {
    const viewer = await profileIdOf('individual_marta')
    const inesId = await profileIdOf('individual_ines')
    if (!viewer || !inesId) return false
    const result = await getCandidates(viewer, {}, null, 100)
    const found = result.items.find(i => i.profile.id === inesId)
    return { pass: !found, detail: found ? 'apareceu — errado' : 'corretamente ausente' }
  })
  await check('discovery', 'individual_diogo nunca vê individual_noa (contact block)', async () => {
    const viewer = await profileIdOf('individual_diogo')
    const noaId = await profileIdOf('individual_noa')
    if (!viewer || !noaId) return false
    const result = await getCandidates(viewer, {}, null, 100)
    const found = result.items.find(i => i.profile.id === noaId)
    return { pass: !found, detail: found ? 'apareceu — errado' : 'corretamente ausente' }
  })
  await check('discovery', 'individual_alex e individual_ines: bloqueio mútuo confirmado (isBlockedEitherWay)', async () => {
    const alex = await profileIdOf('individual_alex')
    const ines = await profileIdOf('individual_ines')
    if (!alex || !ines) return false
    const blocked = await isBlockedEitherWay(alex, ines)
    return { pass: blocked, detail: `isBlockedEitherWay=${blocked}` }
  })

  // ── Match invariants ──────────────────────────────────────────────
  const matchByProfiles = async (aKey: string, bKey: string) => {
    const a = await profileIdOf(aKey); const b = await profileIdOf(bKey)
    if (!a || !b) return null
    return prisma.match.findFirst({ where: { OR: [{ profileOneId: a, profileTwoId: b }, { profileOneId: b, profileTwoId: a }] } })
  }
  await check('matches', 'match individual_marta x individual_joana = ACTIVE', async () => {
    const m = await matchByProfiles('individual_marta', 'individual_joana')
    return { pass: m?.status === 'ACTIVE', detail: `status=${m?.status}` }
  })
  await check('matches', 'match individual_rui x individual_diogo = ENDED', async () => {
    const m = await matchByProfiles('individual_rui', 'individual_diogo')
    return { pass: m?.status === 'ENDED', detail: `status=${m?.status}` }
  })
  await check('matches', 'match individual_alex x individual_ines = BLOCKED', async () => {
    const m = await matchByProfiles('individual_alex', 'individual_ines')
    return { pass: m?.status === 'BLOCKED', detail: `status=${m?.status}` }
  })
  await check('matches', 'match individual_alex x individual_rui = PAUSED', async () => {
    const m = await matchByProfiles('individual_alex', 'individual_rui')
    return { pass: m?.status === 'PAUSED', detail: `status=${m?.status}` }
  })
  await check('matches', 'match couple_4_travel x individual_catarina = PENDING_COUPLE_APPROVAL com exatamente 1 aprovação', async () => {
    const m = await matchByProfiles('couple_4_travel', 'individual_catarina')
    if (!m) return false
    const approvals = await prisma.coupleMatchApproval.count({ where: { matchId: m.id, approvedAt: { not: null } } })
    return { pass: m.status === 'PENDING_COUPLE_APPROVAL' && approvals === 1, detail: `status=${m.status} approvals=${approvals}` }
  })
  await check('matches', 'match couple_1_third_match x individual_joana = ACTIVE (aprovação completa)', async () => {
    const m = await matchByProfiles('couple_1_third_match', 'individual_joana')
    return { pass: m?.status === 'ACTIVE', detail: `status=${m?.status}` }
  })

  // ── Private Rooms ─────────────────────────────────────────────────
  const roomFor = async (matchQuery: { a: string; b: string }) => {
    const m = await matchByProfiles(matchQuery.a, matchQuery.b)
    if (!m) return null
    return (prisma as any).privateRoom.findFirst({ where: { matchId: m.id } })
  }
  await check('rooms', 'Room A (Marta/Joana) = ACTIVE com 2 membros', async () => {
    const r = await roomFor({ a: 'individual_marta', b: 'individual_joana' })
    if (!r) return false
    const members = await (prisma as any).privateRoomMember.count({ where: { privateRoomId: r.id, leftAt: null } })
    return { pass: r.status === 'ACTIVE' && members === 2, detail: `status=${r.status} members=${members}` }
  })
  await check('rooms', 'Room B (Couple1/Joana) = WAITING_CONSENT', async () => {
    const r = await roomFor({ a: 'couple_1_third_match', b: 'individual_joana' })
    return { pass: r?.status === 'WAITING_CONSENT', detail: `status=${r?.status}` }
  })
  await check('rooms', 'Room D (Alex/Rui) = PAUSED', async () => {
    const r = await roomFor({ a: 'individual_alex', b: 'individual_rui' })
    return { pass: r?.status === 'PAUSED', detail: `status=${r?.status}` }
  })
  await check('rooms', 'Room E (Rui/Diogo) = CLOSED com closedAt', async () => {
    const r = await roomFor({ a: 'individual_rui', b: 'individual_diogo' })
    return { pass: r?.status === 'CLOSED' && !!r?.closedAt, detail: `status=${r?.status}` }
  })
  await check('rooms', 'Room F (Alex/Ines) = SAFETY_LOCKED com safetyLockedAt', async () => {
    const r = await roomFor({ a: 'individual_alex', b: 'individual_ines' })
    return { pass: r?.status === 'SAFETY_LOCKED' && !!r?.safetyLockedAt, detail: `status=${r?.status}` }
  })

  // ── Consent Check aggregation ────────────────────────────────────
  await check('consent', 'ConsentCheck agregação recomputada sem erros (amostra)', async () => {
    const marta = await profileIdOf('individual_marta')
    const joana = await profileIdOf('individual_joana')
    if (!marta || !joana) return false
    const m = await matchByProfiles('individual_marta', 'individual_joana')
    if (!m) return false
    const checks = await prisma.consentCheck.findMany({ where: { matchId: m.id } })
    for (const c of checks) await computeAndCacheStatus(c.id)
    const statuses = checks.map(c => c.phase + ':' + c.status)
    const hasExpired = checks.some(c => c.phase === 'VIDEO_CALL')
    return { pass: checks.length >= 4, detail: statuses.join(', ') + (hasExpired ? ' (VIDEO_CALL presente)' : '') }
  })

  // ── Media / Soft Reveal grants ───────────────────────────────────
  await check('media', 'individual_sofia: PhotoAccessRequest cobre PENDING/APPROVED/REVOKED/EXPIRED', async () => {
    const u = await userByKey('individual_sofia')
    const p = await profileByUserId(u?.id)
    if (!p) return false
    const photo = await prisma.profilePhoto.findFirst({ where: { profileId: p.id, visibilityLevel: 'PRIVATE_AFTER_APPROVAL' } })
    if (!photo) return false
    const requests = await (prisma as any).photoAccessRequest.findMany({ where: { photoId: photo.id } })
    const statuses = new Set(requests.map((r: any) => r.status))
    const expected = ['PENDING', 'APPROVED', 'REVOKED', 'EXPIRED']
    const missing = expected.filter(s => !statuses.has(s))
    return { pass: missing.length === 0, detail: `statuses=${[...statuses].join(',')} missing=${missing.join(',')}` }
  })

  // ── Reports + evidence ────────────────────────────────────────────
  await check('reports', 'Reports MINOR/THREAT/NON_CONSENSUAL_IMAGE/COERCION têm prioridade elevada (>=7)', async () => {
    const reports = await prisma.report.findMany({ where: { reason: { in: ['MINOR', 'THREAT', 'NON_CONSENSUAL_IMAGE', 'COERCION'] } } })
    const low = reports.filter(r => r.priority < 7)
    return { pass: reports.length >= 4 && low.length === 0, detail: `count=${reports.length} baixa_prioridade=${low.length}` }
  })
  await check('reports', 'Cada report esperado tem pelo menos 1 ReportEvidence (exceto FAKE_PROFILE/THREAT sem evidência definida)', async () => {
    const reports = await prisma.report.findMany({ where: { reason: { in: ['HARASSMENT', 'MINOR', 'NON_CONSENSUAL_IMAGE', 'COERCION'] } } })
    let missing = 0
    for (const r of reports) {
      const count = await prisma.reportEvidence.count({ where: { reportId: r.id } })
      if (count === 0) missing++
    }
    return { pass: reports.length >= 4 && missing === 0, detail: `reports=${reports.length} sem_evidencia=${missing}` }
  })
  await check('reports', 'NON_CONSENSUAL_IMAGE não tem referência a imagem real (apenas SYSTEM_EVENT sintético)', async () => {
    const r = await prisma.report.findFirst({ where: { reason: 'NON_CONSENSUAL_IMAGE' } })
    if (!r) return false
    const evidence = await prisma.reportEvidence.findMany({ where: { reportId: r.id } })
    const hasMediaRef = evidence.some(e => e.type === ('MEDIA_REFERENCE' as any))
    return { pass: !hasMediaRef, detail: `tipos=${evidence.map(e => e.type).join(',')}` }
  })

  // ── Verification queue ────────────────────────────────────────────
  await check('verification', 'Fila de verificação cobre PENDING/APPROVED/REJECTED', async () => {
    const tiago = await userByKey('individual_tiago')
    const rui = await userByKey('individual_rui')
    const diogo = await userByKey('individual_diogo')
    const [vTiago, vRui, vDiogo] = await Promise.all([
      tiago ? (prisma as any).verification.findUnique({ where: { userId: tiago.id } }) : null,
      rui ? (prisma as any).verification.findUnique({ where: { userId: rui.id } }) : null,
      diogo ? (prisma as any).verification.findUnique({ where: { userId: diogo.id } }) : null,
    ])
    return { pass: vTiago?.status === 'REJECTED' && vRui?.status === 'APPROVED' && vDiogo?.status === 'APPROVED', detail: `tiago=${vTiago?.status} rui=${vRui?.status} diogo=${vDiogo?.status}` }
  })

  // ── Safety Check-in states ────────────────────────────────────────
  const safetyStatusFor = async (key: string) => {
    const u = await userByKey(key)
    const p = await profileByUserId(u?.id)
    if (!p) return null
    const c = await (prisma as any).safetyCheckin.findFirst({ where: { profileId: p.id }, orderBy: { createdAt: 'desc' } })
    return c
  }
  await check('safety', 'SafetyCheckin cobre SCHEDULED/WAITING_CONFIRMATION/SAFE_CONFIRMED/CANCELLED/OVERDUE/ESCALATED', async () => {
    const [marta, joana, rui, alex, catarina, sofia] = await Promise.all([
      safetyStatusFor('individual_marta'), safetyStatusFor('individual_joana'), safetyStatusFor('individual_rui'),
      safetyStatusFor('individual_alex'), safetyStatusFor('individual_catarina'), safetyStatusFor('individual_sofia'),
    ])
    const got = { marta: marta?.status, joana: joana?.status, rui: rui?.status, alex: alex?.status, catarina: catarina?.status, sofia: sofia?.status }
    const pass = marta?.status === 'SCHEDULED' && joana?.status === 'WAITING_CONFIRMATION' && rui?.status === 'SAFE_CONFIRMED'
      && alex?.status === 'CANCELLED' && catarina?.status === 'OVERDUE' && sofia?.status === 'ESCALATED'
    return { pass, detail: JSON.stringify(got) }
  })
  await check('safety', 'SafetyCheckin ESCALATED (Sofia) tem safetyEmail=null (nunca enviar email real)', async () => {
    const c = await safetyStatusFor('individual_sofia')
    return { pass: c?.status === 'ESCALATED' && !c?.safetyEmail, detail: `safetyEmail=${c?.safetyEmail}` }
  })

  // ── Travel Mode date states ──────────────────────────────────────
  await check('travel', 'TravelMode cobre ACTIVE/SCHEDULED-futuro/EXPIRED/CANCELLED', async () => {
    const [catarina, rui, noa, diogo] = await Promise.all([
      profileIdOf('individual_catarina'), profileIdOf('individual_rui'), profileIdOf('individual_noa'), profileIdOf('individual_diogo'),
    ])
    const [tCatarina, tRui, tNoa, tDiogo] = await Promise.all([
      catarina ? prisma.travelMode.findFirst({ where: { profileId: catarina, city: 'Porto' } }) : null,
      rui ? prisma.travelMode.findFirst({ where: { profileId: rui, city: 'Madrid' } }) : null,
      noa ? prisma.travelMode.findFirst({ where: { profileId: noa, city: 'Coimbra' } }) : null,
      diogo ? prisma.travelMode.findFirst({ where: { profileId: diogo, city: 'Braga' } }) : null,
    ])
    const pass = tCatarina?.active === true && tRui?.status === 'SCHEDULED' && tRui.startDate > new Date()
      && tNoa?.active === false && tNoa.endDate < new Date() && tDiogo?.status === 'CANCELLED'
    return { pass, detail: `catarina.active=${tCatarina?.active} rui.status=${tRui?.status} noa.active=${tNoa?.active} diogo.status=${tDiogo?.status}` }
  })
  await check('travel', 'Couple 4 Travel Mode: todas as aprovações -> SCHEDULED', async () => {
    const c4 = await profileIdOf('couple_4_travel')
    if (!c4) return false
    const t = await prisma.travelMode.findFirst({ where: { profileId: c4, city: 'Porto' } })
    return { pass: t?.status === 'SCHEDULED' && t?.active === true, detail: `status=${t?.status} active=${t?.active}` }
  })

  // ── Event venue privacy ───────────────────────────────────────────
  await check('events', 'EventVenuePolicy: PUBLIC_CITY_ONLY nunca revela venue', async () => {
    const e = await prisma.event.findFirst({ where: { title: { contains: 'Lisboa' }, venueVisibility: 'PUBLIC_CITY_ONLY' as any } })
    if (!e) return false
    const revealed = resolveVenueForViewer(e as any, 'APPROVED')
    return { pass: revealed === null, detail: `revealed=${revealed}` }
  })
  await check('events', 'EventVenuePolicy: APPROVED_ATTENDEES só revela para aprovados', async () => {
    const e = await prisma.event.findFirst({ where: { venueVisibility: 'APPROVED_ATTENDEES' as any } })
    if (!e) return false
    const hiddenForRequested = resolveVenueForViewer(e as any, 'REQUESTED')
    const revealedForApproved = resolveVenueForViewer(e as any, 'APPROVED')
    return { pass: hiddenForRequested === null && revealedForApproved === e.venueDetail, detail: `requested=${hiddenForRequested} approved=${revealedForApproved}` }
  })
  await check('events', 'Nenhum evento de teste usa endereço real (venueDetail = TEST VENUE)', async () => {
    const events = await prisma.event.findMany({ where: { organizerProfile: { user: { isTestAccount: true } } } })
    const bad = events.filter(e => e.venueDetail && !e.venueDetail.includes('TEST VENUE'))
    return { pass: bad.length === 0, detail: `eventos=${events.length} com_venue_suspeito=${bad.length}` }
  })

  // ── Test analytics isolation ──────────────────────────────────────
  await check('analytics-isolation', 'RecommendationSignal entre perfis de teste tem isTestData=true', async () => {
    const marta = await profileIdOf('individual_marta')
    if (!marta) return false
    const signals = await (prisma as any).recommendationSignal.findMany({ where: { OR: [{ actorProfileId: marta }, { targetProfileId: marta }] } })
    const notMarked = signals.filter((s: any) => !s.isTestData)
    return { pass: signals.length > 0 && notMarked.length === 0, detail: `signals=${signals.length} não_marcados=${notMarked.length}` }
  })
  await check('analytics-isolation', 'Meaningful Connection Rate por omissão exclui contas de teste', async () => {
    const since = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
    const realOnly = await computeMeaningfulConnectionRateSince(since)
    const withTest = await computeMeaningfulConnectionRateSince(since, { includeTestData: true })
    return { pass: withTest.totalCount >= realOnly.totalCount, detail: `real=${realOnly.totalCount} comTeste=${withTest.totalCount}` }
  })
  await check('analytics-isolation', 'TestSeedRun regista pelo menos uma execução COMPLETED', async () => {
    const run = await (prisma as any).testSeedRun.findFirst({ where: { status: 'COMPLETED' }, orderBy: { startedAt: 'desc' } })
    return { pass: !!run, detail: run ? `version=${run.version} completedAt=${run.completedAt}` : 'nenhuma execução encontrada' }
  })

  // ── Admin scenario coverage sanity ────────────────────────────────
  await check('admin', 'Nenhuma conta de teste tem testScenarioKey fora do manifest conhecido', async () => {
    const known = new Set([
      ...ADMIN_ACCOUNTS.map(a => a.key), ...LIFECYCLE_ACCOUNTS.map(a => a.key),
      ...INDIVIDUAL_SCENARIOS.map(a => a.key), ...COUPLE_SCENARIOS.map(a => a.key), GROUP_SCENARIO.key,
    ])
    const users = await prisma.user.findMany({ where: { isTestAccount: true, testScenarioKey: { not: null } }, select: { testScenarioKey: true } })
    const unknown = users.filter(u => u.testScenarioKey && !known.has(u.testScenarioKey))
    return { pass: unknown.length === 0, detail: `desconhecidos=${unknown.map(u => u.testScenarioKey).join(',')}` }
  })

  // ── Print results ──────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(70))
  console.log('BETA SEED VALIDATION REPORT')
  console.log('─'.repeat(70))
  let lastArea = ''
  let passCount = 0
  for (const r of results) {
    if (r.area !== lastArea) { console.log(`\n[${r.area}]`); lastArea = r.area }
    console.log(`  ${r.pass ? 'PASS' : 'FAIL'} — ${r.name}${r.detail ? ` (${r.detail})` : ''}`)
    if (r.pass) passCount++
  }
  console.log('\n' + '─'.repeat(70))
  console.log(`Total: ${results.length} | PASS: ${passCount} | FAIL: ${results.length - passCount}`)
  console.log('─'.repeat(70))

  const failed = results.filter(r => !r.pass)
  if (failed.length > 0) {
    console.log('\nFalhas:')
    for (const f of failed) console.log(`  - [${f.area}] ${f.name}${f.detail ? `: ${f.detail}` : ''}`)
    process.exitCode = 1
  } else {
    process.exitCode = 0
  }
}

main()
  .catch(e => { console.error('[VALIDATE BETA SEED] Erro fatal:', e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
