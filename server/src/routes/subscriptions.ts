import { Router, Request, Response } from 'express'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()
const isProd = process.env.NODE_ENV === 'production'

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
      'Ver quem gostou de ti',
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
      'Perfil de casal vinculado com Double Consent',
      'Modo Acordo — definição de limites partilhados',
      'Sala Privada de casal',
      'Um pagamento cobre os dois parceiros'
    ]
  }
}

router.get('/plans', (_req: Request, res: Response) => {
  const stripeConfigured = !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_PREMIUM)
  res.json({ plans: PLANS, stripeConfigured, paymentsAvailable: stripeConfigured })
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

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.CLIENT_URL}/premium?success=1`,
      cancel_url: `${process.env.CLIENT_URL}/premium?cancelled=1`,
      metadata: { userId: req.userId!, plan }
    })

    res.json({ mode: 'stripe', url: session.url, sessionId: session.id })
  } catch (err: any) {
    console.error('[CHECKOUT ERROR]', err.message)
    res.status(500).json({ error: 'Erro ao criar sessão de pagamento.' })
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

    await prisma.subscription.update({ where: { userId: req.userId! }, data: { status: 'CANCELLED' } })
    res.json({ ok: true, message: 'Subscrição cancelada. O acesso Premium mantém-se até ao fim do período actual.' })
  } catch (err: any) {
    console.error('[CANCEL ERROR]', err.message)
    res.status(500).json({ error: 'Erro ao cancelar subscrição.' })
  }
})

export default router
