import { Router, Request, Response } from 'express'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

// Lazy-load Stripe to avoid crash if key not set
const getStripe = () => {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  const Stripe = require('stripe')
  return new Stripe(key, { apiVersion: '2024-04-10' })
}

const STRIPE_PRICES: Record<string, string> = {
  PREMIUM: process.env.STRIPE_PRICE_PREMIUM || '',
  COUPLE_PREMIUM: process.env.STRIPE_PRICE_COUPLE || ''
}

const PLANS = {
  premium: {
    name: 'Between Premium',
    price: 9.99,
    currency: 'EUR',
    features: [
      'Modo Invisível',
      'Travel Mode',
      'Ver quem gostou',
      'Bloqueio de contactos',
      'Soft Reveal avançado',
      'Filtros premium'
    ]
  },
  couple_premium: {
    name: 'Between Casal',
    price: 14.99,
    currency: 'EUR',
    features: [
      'Tudo do Premium',
      'Perfil de casal avançado',
      'Double Consent Match',
      'Modo Acordo completo',
      'Sala Privada a três'
    ]
  }
}

// GET /api/subscriptions/plans
router.get('/plans', (_req: Request, res: Response) => {
  const stripeConfigured = !!process.env.STRIPE_SECRET_KEY
  res.json({ plans: PLANS, stripeConfigured })
})

// GET /api/subscriptions/me
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  const sub = await prisma.subscription.findUnique({
    where: { userId: req.userId! }
  })
  res.json(sub || { plan: 'FREE', status: 'ACTIVE' })
})

// POST /api/subscriptions/checkout — create Stripe checkout session
router.post('/checkout', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { plan } = req.body
    if (!['PREMIUM', 'COUPLE_PREMIUM'].includes(plan)) {
      return res.status(400).json({ error: 'Plano inválido.' })
    }

    const stripe = getStripe()

    // No Stripe configured — direct upgrade for testing
    if (!stripe) {
      const sub = await prisma.subscription.upsert({
        where: { userId: req.userId! },
        update: {
          plan,
          status: 'ACTIVE',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        },
        create: {
          userId: req.userId!,
          plan,
          status: 'ACTIVE',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      })
      return res.json({
        mode: 'direct',
        subscription: sub,
        message: 'Stripe não configurado — upgrade direto para teste.'
      })
    }

    // Get or create Stripe customer
    const user = await prisma.user.findUnique({ where: { id: req.userId! } })
    let sub = await prisma.subscription.findUnique({ where: { userId: req.userId! } })

    let customerId = sub?.providerCustomerId
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user?.email,
        metadata: { userId: req.userId! }
      })
      customerId = customer.id
    }

    const priceId = STRIPE_PRICES[plan]
    if (!priceId) {
      return res.status(500).json({
        error: 'Price ID não configurado. Adiciona STRIPE_PRICE_PREMIUM no Railway.'
      })
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.CLIENT_URL}/profile?success=true`,
      cancel_url: `${process.env.CLIENT_URL}/profile?cancelled=true`,
      metadata: { userId: req.userId!, plan }
    })

    // Save customer ID
    await prisma.subscription.upsert({
      where: { userId: req.userId! },
      update: { providerCustomerId: customerId },
      create: {
        userId: req.userId!,
        plan: 'FREE',
        status: 'ACTIVE',
        providerCustomerId: customerId
      }
    })

    res.json({ mode: 'stripe', checkoutUrl: session.url, sessionId: session.id })
  } catch (err: any) {
    console.error('[CHECKOUT ERROR]', err.message)
    res.status(500).json({ error: 'Erro ao criar sessão de pagamento.' })
  }
})

// POST /api/subscriptions/portal — customer portal to manage subscription
router.post('/portal', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const stripe = getStripe()
    if (!stripe) {
      return res.status(503).json({ error: 'Stripe não configurado.' })
    }

    const sub = await prisma.subscription.findUnique({ where: { userId: req.userId! } })
    if (!sub?.providerCustomerId) {
      return res.status(404).json({ error: 'Sem subscrição ativa.' })
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: sub.providerCustomerId,
      return_url: `${process.env.CLIENT_URL}/profile`
    })

    res.json({ url: session.url })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao abrir portal.' })
  }
})

// POST /api/subscriptions/cancel
router.post('/cancel', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const stripe = getStripe()
    const sub = await prisma.subscription.findUnique({ where: { userId: req.userId! } })

    if (stripe && sub?.providerSubscriptionId) {
      await stripe.subscriptions.update(sub.providerSubscriptionId, {
        cancel_at_period_end: true
      })
    }

    await prisma.subscription.update({
      where: { userId: req.userId! },
      data: { status: 'CANCELLED', cancelledAt: new Date() }
    })

    res.json({ ok: true, message: 'Subscrição cancelada. Fica ativa até ao fim do período.' })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao cancelar subscrição.' })
  }
})

// POST /api/subscriptions/upgrade — direct upgrade (fallback/dev)
router.post('/upgrade', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { plan } = req.body
    if (!['PREMIUM', 'COUPLE_PREMIUM'].includes(plan)) {
      return res.status(400).json({ error: 'Plano inválido.' })
    }
    const sub = await prisma.subscription.upsert({
      where: { userId: req.userId! },
      update: {
        plan, status: 'ACTIVE',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      },
      create: {
        userId: req.userId!, plan, status: 'ACTIVE',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    })
    res.json({ ok: true, subscription: sub })
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao ativar plano.' })
  }
})

export default router
