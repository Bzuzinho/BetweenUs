// Serviço central de entitlements de subscrição.
//
// Todas as rotas devem usar ESTE serviço para decidir o que um utilizador
// pode ou não fazer por causa do plano — nunca `plan !== 'FREE'` ad-hoc numa
// rota, e nunca duplicar a mesma regra em vários sítios (discovery.ts,
// couples.ts, photos.ts, contacts.ts, travel.ts, privacy.ts devem todos
// chamar para aqui).
//
// Princípio de segurança: entitlements de subscrição controlam apenas
// vantagens COMERCIAIS (score mínimo, Modo Invisível, Travel Mode, filtros
// avançados, bloqueio de agenda, controlos avançados de fotos). Nunca
// controlam bloqueio, denúncia, Double Consent, revogação básica de acesso a
// fotos, Safety Check-in, Safe Exit ou chat depois de ligação activa — essas
// são sempre gratuitas e não passam por `hasEntitlement`.
import prisma from './prisma'
import { getAvailableContexts, resolveActiveProfileId } from './activeProfileContextService'
import { getActiveMembers } from './profileMembershipService'

export type SubscriptionPlanValue = 'FREE' | 'PREMIUM' | 'COUPLE_PREMIUM' | 'ELITE'
export type SubscriptionStatusValue = 'ACTIVE' | 'CANCELLED' | 'PAST_DUE' | 'UNPAID' | 'TRIALING'

// PAST_DUE tolerância — política explícita (secção 19 do pedido): mantém
// acesso por um período curto depois de currentPeriodEnd para dar tempo a
// Stripe de tentar cobrar novamente (Smart Retries), depois suspende.
// UNPAID e CANCELLED nunca concedem acesso — só PAST_DUE tem tolerância.
export const PAST_DUE_GRACE_DAYS = Number(process.env.SUBSCRIPTION_PAST_DUE_GRACE_DAYS || 3)

export const MIN_COMPATIBILITY_SCORE_FREE = Number(process.env.FREE_MIN_CONNECTION_SCORE || 70)

export interface SubscriptionState {
  userId: string
  plan: SubscriptionPlanValue
  status: SubscriptionStatusValue
  currentPeriodStart: Date | null
  currentPeriodEnd: Date | null
  cancelAtPeriodEnd: boolean
  cancelledAt: Date | null
  providerCustomerId: string | null
  providerSubscriptionId: string | null
}

const DEFAULT_FREE_STATE = (userId: string): SubscriptionState => ({
  userId, plan: 'FREE', status: 'ACTIVE',
  currentPeriodStart: null, currentPeriodEnd: null,
  cancelAtPeriodEnd: false, cancelledAt: null,
  providerCustomerId: null, providerSubscriptionId: null,
})

// Lê a Subscription local tal como está — nunca chama Stripe aqui (Stripe é
// sempre escrito de volta pelos webhooks, nunca lido em tempo real numa rota
// de utilizador; ver webhooks.ts).
export const getUserSubscriptionState = async (userId: string): Promise<SubscriptionState> => {
  const sub = await prisma.subscription.findUnique({ where: { userId } })
  if (!sub) return DEFAULT_FREE_STATE(userId)
  return {
    userId,
    plan: sub.plan as SubscriptionPlanValue,
    status: sub.status as SubscriptionStatusValue,
    currentPeriodStart: sub.currentPeriodStart,
    currentPeriodEnd: sub.currentPeriodEnd,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    cancelledAt: sub.cancelledAt,
    providerCustomerId: sub.providerCustomerId,
    providerSubscriptionId: sub.providerSubscriptionId,
  }
}

// Único sítio que decide se uma Subscription concede acesso PAGO neste
// preciso momento. Nunca `plan !== 'FREE'` sozinho — tem de considerar
// status, currentPeriodEnd e a tolerância de PAST_DUE.
export const isSubscriptionEffectivelyActive = (sub: SubscriptionState): boolean => {
  if (sub.plan === 'FREE') return false

  const now = new Date()
  // cancelAtPeriodEnd=true mantém status ACTIVE até ao webhook
  // customer.subscription.deleted mudar para CANCELLED — por isso ACTIVE
  // continua a conceder acesso mesmo com cancelAtPeriodEnd=true, desde que
  // currentPeriodEnd ainda não tenha passado (defesa extra caso o webhook
  // de deleted se atrase).
  if (sub.status === 'ACTIVE' || sub.status === 'TRIALING') {
    if (sub.currentPeriodEnd && sub.currentPeriodEnd.getTime() < now.getTime()) return false
    return true
  }

  if (sub.status === 'PAST_DUE') {
    if (!sub.currentPeriodEnd) return false
    const graceEnd = new Date(sub.currentPeriodEnd.getTime() + PAST_DUE_GRACE_DAYS * 24 * 60 * 60 * 1000)
    return now.getTime() < graceEnd.getTime()
  }

  // UNPAID, CANCELLED, INCOMPLETE_EXPIRED (mapeado para CANCELLED no nosso
  // enum) nunca concedem acesso.
  return false
}

// Plano efectivo (considera se a subscrição está mesmo activa neste
// momento — nunca o campo `plan` em bruto).
export const resolveEffectivePlan = async (userId: string): Promise<SubscriptionPlanValue> => {
  const sub = await getUserSubscriptionState(userId)
  return isSubscriptionEffectivelyActive(sub) ? sub.plan : 'FREE'
}

export interface ActiveContextInfo {
  profileId: string | null
  type: 'INDIVIDUAL' | 'COUPLE' | 'GROUP' | null
  coupleStatus: string | null
  activeMemberCount: number
}

// Contexto activo (perfil individual, casal ou grupo) + plano efectivo
// resolvido PARA ESSE CONTEXTO: um perfil COUPLE/GROUP é premium se
// QUALQUER membro activo tiver uma Subscription paga e efectivamente activa
// (mesmo padrão já usado por matchService.isProfilePremium — reutilizado
// aqui em vez de duplicado).
export const getActiveContextSubscriptionState = async (
  userId: string
): Promise<{ context: ActiveContextInfo; effectivePlan: SubscriptionPlanValue; beneficiaryUserIds: string[] }> => {
  const profileId = await resolveActiveProfileId(userId)
  if (!profileId) {
    return { context: { profileId: null, type: null, coupleStatus: null, activeMemberCount: 0 }, effectivePlan: 'FREE', beneficiaryUserIds: [userId] }
  }

  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { id: true, type: true, userId: true, coupleProfile: { select: { coupleStatus: true } } as any },
  })
  if (!profile) {
    return { context: { profileId: null, type: null, coupleStatus: null, activeMemberCount: 0 }, effectivePlan: 'FREE', beneficiaryUserIds: [userId] }
  }

  let ownerUserIds: string[]
  if (profile.userId) {
    ownerUserIds = [profile.userId]
  } else {
    ownerUserIds = (await getActiveMembers(profileId)).map(m => m.userId)
  }

  let effectivePlan: SubscriptionPlanValue = 'FREE'
  for (const uid of ownerUserIds) {
    const plan = await resolveEffectivePlan(uid)
    if (plan !== 'FREE') { effectivePlan = plan; break }
  }

  return {
    context: {
      profileId: profile.id,
      type: profile.type as any,
      coupleStatus: (profile as any).coupleProfile?.coupleStatus || null,
      activeMemberCount: ownerUserIds.length,
    },
    effectivePlan,
    beneficiaryUserIds: ownerUserIds,
  }
}

// Entitlements comerciais — nunca incluir aqui bloqueio, denúncia, Double
// Consent, revogação básica de fotos, Safety features, pedidos/aceitação de
// ligação básica ou chat básico (essas são sempre grátis e não passam por
// hasEntitlement).
export type Entitlement =
  | 'INVISIBLE_MODE'
  | 'TRAVEL_MODE'
  | 'CONNECTION_BELOW_SCORE_THRESHOLD'
  | 'VIEW_FULL_INCOMING_CONNECTION_PROFILE'
  | 'ADVANCED_FILTERS'
  | 'CONTACT_BLOCKING'
  | 'ADVANCED_SOFT_REVEAL'
  | 'ADVANCED_PHOTO_ACCESS_CONTROLS'
  | 'COUPLE_SHARED_PREMIUM'

const PREMIUM_ENTITLEMENTS = new Set<Entitlement>([
  'INVISIBLE_MODE', 'TRAVEL_MODE', 'CONNECTION_BELOW_SCORE_THRESHOLD',
  'VIEW_FULL_INCOMING_CONNECTION_PROFILE', 'ADVANCED_FILTERS', 'CONTACT_BLOCKING',
  'ADVANCED_SOFT_REVEAL', 'ADVANCED_PHOTO_ACCESS_CONTROLS',
])

// context: se omitido, usa o contexto activo do utilizador (perfil actual).
// Passar um profileId explícito quando a rota já o resolveu, para evitar
// resolver o contexto duas vezes.
export const hasEntitlement = async (
  userId: string, entitlement: Entitlement, contextProfileId?: string | null
): Promise<boolean> => {
  if (entitlement === 'COUPLE_SHARED_PREMIUM') {
    const { effectivePlan, context } = await getActiveContextSubscriptionState(userId)
    return effectivePlan === 'COUPLE_PREMIUM' && context.type === 'COUPLE' && context.coupleStatus === 'ACTIVE'
  }

  // Fase 3D (Travel Mode por país/cidade) — cenário de teste explícito do
  // pedido: "GROUP nunca recebe Travel Mode". Não é só "não herda via
  // COUPLE_PREMIUM de outrem" (essa parte já estava coberta abaixo) — é
  // incondicional: um perfil GROUP nunca tem acesso a Travel Mode, mesmo
  // que um dos seus membros tenha PREMIUM/ELITE pessoal. Travel Mode só
  // existe para INDIVIDUAL (Premium pessoal) e COUPLE (Couple Premium,
  // com aprovação dos dois membros) — nunca para trio/poliamor em GROUP.
  // Verificado antes de qualquer resolução de plano, para não sequer
  // pagar o custo de resolver memberPlans quando o contexto já é GROUP.
  if (entitlement === 'TRAVEL_MODE') {
    const profileType = contextProfileId
      ? (await prisma.profile.findUnique({ where: { id: contextProfileId }, select: { type: true } }))?.type
      : (await getActiveContextSubscriptionState(userId)).context.type

    if (profileType === 'GROUP') return false

    let memberUserIds: string[]
    if (contextProfileId) {
      const profile = await prisma.profile.findUnique({ where: { id: contextProfileId }, select: { userId: true } })
      memberUserIds = profile?.userId ? [profile.userId] : (await getActiveMembers(contextProfileId)).map(m => m.userId)
    } else {
      memberUserIds = (await getActiveContextSubscriptionState(userId)).beneficiaryUserIds
    }

    const memberPlans = await Promise.all(memberUserIds.map(uid => resolveEffectivePlan(uid)))
    return memberPlans.some(p => p === 'PREMIUM' || p === 'COUPLE_PREMIUM' || p === 'ELITE')
  }

  if (!PREMIUM_ENTITLEMENTS.has(entitlement)) return false

  let effectivePlan: SubscriptionPlanValue
  if (contextProfileId) {
    const profile = await prisma.profile.findUnique({ where: { id: contextProfileId }, select: { userId: true } })
    if (profile?.userId) {
      effectivePlan = await resolveEffectivePlan(profile.userId)
    } else {
      const members = await getActiveMembers(contextProfileId)
      effectivePlan = 'FREE'
      for (const m of members) {
        const plan = await resolveEffectivePlan(m.userId)
        if (plan !== 'FREE') { effectivePlan = plan; break }
      }
    }
  } else {
    const state = await getActiveContextSubscriptionState(userId)
    effectivePlan = state.effectivePlan
  }

  return effectivePlan === 'PREMIUM' || effectivePlan === 'COUPLE_PREMIUM' || effectivePlan === 'ELITE'
}

export interface PlanEligibility { allowed: boolean; reason: string | null }

// PREMIUM: disponível sempre que o contexto activo é INDIVIDUAL.
// COUPLE_PREMIUM: só quando type=COUPLE, coupleStatus=ACTIVE, exactamente
// dois membros activos aceites, e o comprador é membro activo. Nunca GROUP,
// nunca PENDING_PARTNER.
export const getEligibility = async (
  userId: string
): Promise<{ PREMIUM: PlanEligibility; COUPLE_PREMIUM: PlanEligibility }> => {
  const { context } = await getActiveContextSubscriptionState(userId)

  const PREMIUM: PlanEligibility = context.type === 'GROUP'
    ? { allowed: false, reason: 'GROUP_NOT_ELIGIBLE_FOR_INDIVIDUAL_PREMIUM' }
    : { allowed: true, reason: null }

  let COUPLE_PREMIUM: PlanEligibility
  if (context.type !== 'COUPLE') {
    COUPLE_PREMIUM = { allowed: false, reason: 'COUPLE_PROFILE_REQUIRED' }
  } else if (context.coupleStatus !== 'ACTIVE') {
    COUPLE_PREMIUM = { allowed: false, reason: 'COUPLE_PENDING_PARTNER' }
  } else if (context.activeMemberCount !== 2) {
    COUPLE_PREMIUM = { allowed: false, reason: 'COUPLE_MUST_HAVE_EXACTLY_TWO_MEMBERS' }
  } else {
    COUPLE_PREMIUM = { allowed: true, reason: null }
  }

  return { PREMIUM, COUPLE_PREMIUM }
}

export const canPurchasePlan = async (userId: string, plan: 'PREMIUM' | 'COUPLE_PREMIUM'): Promise<PlanEligibility> => {
  const eligibility = await getEligibility(userId)
  return eligibility[plan]
}

// Utilizadores que ficam com o plano activado quando alguém compra
// COUPLE_PREMIUM — sempre e só os membros activos do perfil de casal
// (exactamente dois, verificado antes do checkout por canPurchasePlan).
// Nunca inclui GROUP nem terceiros.
export const getPremiumBeneficiaryUserIds = async (userId: string, plan: SubscriptionPlanValue): Promise<string[]> => {
  if (plan !== 'COUPLE_PREMIUM') return [userId]
  const { context, beneficiaryUserIds } = await getActiveContextSubscriptionState(userId)
  if (context.type !== 'COUPLE' || context.coupleStatus !== 'ACTIVE' || beneficiaryUserIds.length !== 2) {
    // Nunca activar terceiros — se o contexto não corresponder mesmo a um
    // casal completo, apenas o comprador é beneficiário.
    return [userId]
  }
  return beneficiaryUserIds
}

export interface ConnectionRequestDecision {
  allowed: boolean
  code?: 'MIN_COMPATIBILITY_REQUIRED' | 'BLOCKED' | 'CANDIDATE_CONSTRAINT' | 'NOT_ELIGIBLE'
  message?: string
  requiredScore?: number
  actualScore?: number
}

// Decide se `actorProfileId` pode enviar um pedido de ligação a
// `targetProfileId`. O score é SEMPRE recalculado/lido do backend
// (getOrCalculateScore) — nunca aceite do cliente. Premium ignora o limiar
// de score, mas nunca ignora bloqueios, candidate constraints ou
// segurança — essas verificações continuam a acontecer sempre, antes e
// independentemente desta função (ver matchService.createLikeOrMatch).
export const canSendConnectionRequest = async (
  actorProfileId: string, targetProfileId: string
): Promise<ConnectionRequestDecision> => {
  const actorProfile = await prisma.profile.findUnique({ where: { id: actorProfileId }, select: { userId: true, type: true } })
  if (!actorProfile) return { allowed: false, code: 'NOT_ELIGIBLE', message: 'Perfil não encontrado.' }

  let effectivePlan: SubscriptionPlanValue = 'FREE'
  if (actorProfile.userId) {
    effectivePlan = await resolveEffectivePlan(actorProfile.userId)
  } else {
    const members = await getActiveMembers(actorProfileId)
    for (const m of members) {
      const plan = await resolveEffectivePlan(m.userId)
      if (plan !== 'FREE') { effectivePlan = plan; break }
    }
  }

  if (effectivePlan === 'PREMIUM' || effectivePlan === 'COUPLE_PREMIUM' || effectivePlan === 'ELITE') {
    return { allowed: true }
  }

  // FREE — calcular o Between Score real no backend (nunca confiar no
  // cliente). Reutiliza o mesmo pipeline de scoring do Discovery
  // (compatibilityScoreService.getOrCalculateScore), incluindo cache.
  const { buildScoreInput } = await import('./discoveryService')
  const { getOrCalculateScore } = await import('./compatibilityScoreService')

  const [sourceInput, targetInput] = await Promise.all([
    buildScoreInput(actorProfileId),
    buildScoreInput(targetProfileId),
  ])
  if (!sourceInput || !targetInput) return { allowed: false, code: 'NOT_ELIGIBLE', message: 'Perfil não encontrado.' }

  const result = await getOrCalculateScore(sourceInput, targetInput)
  const actualScore = result.score
  if (actualScore >= MIN_COMPATIBILITY_SCORE_FREE) return { allowed: true, actualScore }

  return {
    allowed: false,
    code: 'MIN_COMPATIBILITY_REQUIRED',
    message: `No plano Free só podes enviar pedidos de ligação para perfis com compatibilidade igual ou superior a ${MIN_COMPATIBILITY_SCORE_FREE}%.`,
    requiredScore: MIN_COMPATIBILITY_SCORE_FREE,
    actualScore,
  }
}

// Pode o utilizador ver o perfil completo de quem lhe enviou um pedido de
// ligação, antes de aceitar? Sim se ele (ou o perfil partilhado do
// contexto activo) tiver a entitlement VIEW_FULL_INCOMING_CONNECTION_PROFILE.
export const canViewIncomingConnectionProfile = async (userId: string): Promise<boolean> =>
  hasEntitlement(userId, 'VIEW_FULL_INCOMING_CONNECTION_PROFILE')

export interface AvailablePlan { plan: SubscriptionPlanValue; eligible: boolean; reason: string | null }

export const getAvailablePlansForUser = async (userId: string): Promise<AvailablePlan[]> => {
  const eligibility = await getEligibility(userId)
  return [
    { plan: 'PREMIUM', eligible: eligibility.PREMIUM.allowed, reason: eligibility.PREMIUM.reason },
    { plan: 'COUPLE_PREMIUM', eligible: eligibility.COUPLE_PREMIUM.allowed, reason: eligibility.COUPLE_PREMIUM.reason },
  ]
}
