import { Router, Request, Response } from 'express'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import {
  getEligibility, getUserSubscriptionState, resolveEffectivePlan,
  getActiveContextSubscriptionState, canPurchasePlan, MIN_COMPATIBILITY_SCORE_FREE,
  hasEntitlement, type Entitlement,
} from '../lib/subscriptionEntitlementService'

const router = Router()
const isProd = process.env.NODE_ENV === 'production'
const CLIENT_URL = (process.env.CLIENT_URL || 'https://betweenus-production.up.railway.app').replace(/\/+$/, '')

// T11: validate Stripe config at startup
const getStripe = () => {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  const Stripe = require('stripe')
  return new Stripe(key, { apiVersion: '2024-04-10' })
}

// T11: price IDs required in production
const getStripePrices = (): Record<string, string> => {
  const prices: Record<string, string> = {
    PREMIUM: process.env.STRIPE_PRICE_PREMIUM || '',
    COUPLE_PREMIUM: process.env.STRIPE_PRICE_COUPLE || ''
  }
  if (isProd && (!prices.PREMIUM || !prices.COUPLE_PREMIUM)) {
    console.error('[STRIPE] STRIPE_PRICE_PREMIUM and STRIPE_PRICE_COUPLE are required in production')
  }
  return prices
}

// T6/T11: plans describe privacy/discovery tools only — never sexual services or encounters
const PLANS = {
  premium: {
    name: 'Between Premium',
    price: 4.99,
    currency: 'EUR',
    for: 'individual',
    features: [
      'Modo Invisível — navega sem aparecer no discovery',
      'Travel Mode — procura matches numa cidade antes de chegar',
      'Ligar-te a perfis independentemente do Between Score',
      'Ver o perfil completo de quem te enviou um pedido de ligação',
      'Bloqueio de contactos da tua agenda',
      'Soft Reveal avançado — controlo total das tuas fotos',
      'Filtros premium de compatibilidade',
      'Verificação de perfil prioritária'
    ]
  },
  couple_premium: {
    name: 'Between Casal',
    price: 9.99,
    currency: 'EUR',
    for: 'couple',
    coversTwo: true,
    features: [
      'Tudo do Premium para ambos os parceiros',
      'Um pagamento cobre os dois',
      'Travel Mode do casal com aprovação conjunta',
      'Modo Acordo — ferramentas avançadas de gestão partilhada',
      'Sala Privada de casal',
      'Controlos avançados de fotografias do casal'
    ]
  }
}

// GET /api/subscriptions/plans — secção 15 do pedido de monetização: a
// elegibilidade e os entitlements são SEMPRE calculados aqui, nunca no
// frontend. Sem sessão (chamada pública, ex.: landing de preços) devolve só
// os planos estáticos; autenticado devolve o resto calculado a partir do
// contexto activo real do utilizador.
router.get('/plans', async (req: Request, res: Response) => {
  const stripeConfigured = !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_PREMIUM)
  const base = { plans: PLANS, stripeConfigured, paymentsAvailable: stripeConfigured }

  const authReq = req as AuthRequest
  if (!authReq.userId) return res.json(base)

  const [currentSub, effectivePlan, contextState, eligibility] = await Promise.all([
    getUserSubscriptionState(authReq.userId),
    resolveEffectivePlan(authReq.userId),
    getActiveContextSubscriptionState(authReq.userId),
    getEligibility(authReq.userId),
  ])

  const ENTITLEMENT_LIST: Entitlement[] = [
    'INVISIBLE_MODE', 'TRAVEL_MODE', 'CONNECTION_BELOW_SCORE_THRESHOLD',
    'VIEW_FULL_INCOMING_CONNECTION_PROFILE', 'ADVANCED_FILTERS', 'CONTACT_BLOCKING',
    'ADVANCED_SOFT_REVEAL', 'ADVANCED_PHOTO_ACCESS_CONTROLS', 'COUPLE_SHARED_PREMIUM',
  ]
  const entitlementChecks = await Promise.all(
    ENTITLEMENT_LIST.map(e => hasEntitlement(authReq.userId!, e, contextState.context.profileId))
  )
  const entitlements = ENTITLEMENT_LIST.filter((_, i) => entitlementChecks[i])

  res.json({
    ...base,
    currentPlan: currentSub.plan,
    effectivePlan,
    activeContext: {
      type: contextState.context.type,
      profileId: contextState.context.profileId,
      coupleStatus: contextState.context.coupleStatus,
      activeMemberCount: contextState.context.activeMemberCount,
    },
    eligibility,
    entitlements,
    connectionPolicy: {
      minimumScoreToSendRequest: MIN_COMPATIBILITY_SCORE_FREE,
      canConnectBelowThreshold: entitlements.includes('CONNECTION_BELOW_SCORE_THRESHOLD'),
      canViewFullIncomingProfile: entitlements.includes('VIEW_FULL_INCOMING_CONNECTION_PROFILE'),
    },
  })
})

router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  const sub = await prisma.subscription.findUnique({ where: { userId: req.userId! } })
  res.json(sub || { plan: 'FREE', status: 'ACTIVE' })
})

// POST /api/subscriptions/checkout
router.post('/checkout', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { plan } = req.body
    if (!['PREMIUM', 'COUPLE_PREMIUM'].includes(plan)) {
      return res.status(400).json({ error: 'Plano inválido.' })
    }

    // Secção 14/17 — elegibilidade validada SEMPRE no backend antes de
    // qualquer checkout: nunca GROUP em COUPLE_PREMIUM, nunca casal
    // PENDING_PARTNER, nunca um número de membros diferente de dois. O
    // activeProfileId/activeProfileType NUNCA vêm do cliente — são sempre
    // resolvidos aqui a partir do contexto activo real do utilizador.
    const eligibility = await canPurchasePlan(req.userId!, plan)
    if (!eligibility.allowed) {
      return res.status(403).json({ error: 'Não é elegível para este plano.', code: eligibility.reason })
    }
    const contextState = await getActiveContextSubscriptionState(req.userId!)

    // Impede checkout duplicado — já tem este plano efectivamente activo.
    const currentEffectivePlan = await resolveEffectivePlan(req.userId!)
    if (currentEffectivePlan === plan) {
      return res.status(409).json({ error: 'Já tens este plano activo.', code: 'ALREADY_SUBSCRIBED' })
    }

    const stripe = getStripe()

    // T6/T11: NEVER allow direct upgrade in production without Stripe
    if (!stripe) {
      if (isProd) {
        return res.status(503).json({
          error: 'Pagamentos não disponíveis de momento. Tenta novamente mais tarde.',
          code: 'PAYMENTS_NOT_CONFIGURED'
        })
      }
      // DEV/TEST only
      const sub = await prisma.subscription.upsert({
        where: { userId: req.userId! },
        update: { plan, status: 'ACTIVE', currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
        create: { userId: req.userId!, plan, status: 'ACTIVE', currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
      })
      return res.json({ mode: 'direct_dev', subscription: sub, message: '[DEV] Upgrade directo — apenas em desenvolvimento.' })
    }

    // T11: validate price IDs
    const STRIPE_PRICES = getStripePrices()
    const priceId = STRIPE_PRICES[plan]
    if (!priceId) {
      return res.status(503).json({ error: 'Configuração de pagamento incompleta.', code: 'PRICE_NOT_CONFIGURED' })
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId! } })
    // T3/T11: use providerCustomerId — consistent with schema and webhooks.ts
    const sub = await prisma.subscription.findUnique({ where: { userId: req.userId! } })
    let customerId = sub?.providerCustomerId

    if (!customerId) {
      const customer = await stripe.customers.create({ email: user!.email, metadata: { userId: req.userId! } })
      customerId = customer.id
    }

    // Metadata calculada inteiramente no backend — nunca aceite do corpo do
    // pedido. coveredCoupleProfileId só é preenchido quando o plano é
    // COUPLE_PREMIUM e a elegibilidade acima já confirmou um casal ACTIVE
    // com exactamente dois membros.
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${CLIENT_URL}/premium?success=1`,
      cancel_url: `${CLIENT_URL}/premium?cancelled=1`,
      metadata: {
        userId: req.userId!,
        plan,
        activeProfileId: contextState.context.profileId || '',
        activeProfileType: contextState.context.type || '',
        ...(plan === 'COUPLE_PREMIUM' ? { coveredCoupleProfileId: contextState.context.profileId || '' } : {}),
      }
    })

    // `url` mantido apenas por compatibilidade retroactiva (secção 17) —
    // `checkoutUrl` é o nome que o frontend (PremiumPage.jsx) já lê.
    res.json({ mode: 'stripe', checkoutUrl: session.url, url: session.url, sessionId: session.id })
  } catch (err: any) {
    console.error('[CHECKOUT ERROR]', err.message)
    res.status(500).json({ error: 'Erro ao criar sessão de pagamento.' })
  }
})

// POST /api/subscriptions/portal — Stripe Customer Portal (secção 18)
router.post('/portal', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const stripe = getStripe()
    if (!stripe) {
      return res.status(503).json({ error: 'Pagamentos não disponíveis de momento.', code: 'PAYMENTS_NOT_CONFIGURED' })
    }
    const sub = await prisma.subscription.findUnique({ where: { userId: req.userId! } })
    if (!sub?.providerCustomerId) {
      return res.status(404).json({ error: 'Sem cliente Stripe associado a esta conta.', code: 'NO_STRIPE_CUSTOMER' })
    }
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.providerCustomerId,
      return_url: `${CLIENT_URL}/premium`,
    })
    res.json({ url: session.url })
  } catch (err: any) {
    console.error('[PORTAL ERROR]', err.message)
    res.status(500).json({ error: 'Erro ao abrir o portal de gestão de subscrição.' })
  }
})

// POST /api/subscriptions/cancel
router.post('/cancel', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const stripe = getStripe()
    const sub = await prisma.subscription.findUnique({ where: { userId: req.userId! } })
    if (!sub) return res.status(404).json({ error: 'Sem subscrição activa.' })

    // T3/T11: use providerSubscriptionId — consistent with schema and webhooks.ts
    if (stripe && sub.providerSubscriptionId) {
      await stripe.subscriptions.update(sub.providerSubscriptionId, { cancel_at_period_end: true })
    }

    // Secção 19 — cancelar NÃO retira acesso imediatamente: status
    // mantém-se ACTIVE, apenas cancelAtPeriodEnd passa a true. O acesso só
    // é mesmo removido quando o webhook customer.subscription.deleted
    // chegar (fim do período actual, confirmado pela própria Stripe).
    await prisma.subscription.update({
      where: { userId: req.userId! },
      data: { cancelAtPeriodEnd: true, cancelledAt: new Date() }
    })
    res.json({ ok: true, message: 'Subscrição cancelada. O acesso Premium mantém-se até ao fim do período actual.' })
  } catch (err: any) {
    console.error('[CANCEL ERROR]', err.message)
    res.status(500).json({ error: 'Erro ao cancelar subscrição.' })
  }
})

export default router
