import { Router, Request, Response } from 'express'
import prisma from '../lib/prisma'

const router = Router()

// POST /api/webhooks/stripe
// Must use raw body — registered before express.json() middleware
router.post('/stripe', async (req: Request, res: Response) => {
  const stripe = (() => {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) return null
    const Stripe = require('stripe')
    return new Stripe(key, { apiVersion: '2024-04-10' })
  })()

  if (!stripe) return res.json({ received: true })

  const sig = req.headers['stripe-signature']
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  let event: any
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret)
  } catch (err: any) {
    console.error('[WEBHOOK] Signature failed:', err.message)
    return res.status(400).json({ error: `Webhook error: ${err.message}` })
  }

  console.log('[WEBHOOK]', event.type)

  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object
        const { userId, plan } = session.metadata || {}
        if (!userId || !plan) break

        await prisma.subscription.upsert({
          where: { userId },
          update: {
            plan,
            status: 'ACTIVE',
            providerCustomerId: session.customer,
            providerSubscriptionId: session.subscription,
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          },
          create: {
            userId, plan, status: 'ACTIVE',
            providerCustomerId: session.customer,
            providerSubscriptionId: session.subscription,
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          }
        })
        console.log('[WEBHOOK] Subscription activated for user:', userId, plan)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object
        const subId = invoice.subscription
        if (!subId) break

        const sub = await prisma.subscription.findFirst({
          where: { providerSubscriptionId: subId }
        })
        if (sub) {
          await prisma.subscription.update({
            where: { id: sub.id },
            data: {
              status: 'ACTIVE',
              currentPeriodEnd: new Date(invoice.period_end * 1000)
            }
          })
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object
        const subId = invoice.subscription
        if (!subId) break

        const sub = await prisma.subscription.findFirst({
          where: { providerSubscriptionId: subId }
        })
        if (sub) {
          await prisma.subscription.update({
            where: { id: sub.id },
            data: { status: 'PAST_DUE' }
          })
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        const sub = await prisma.subscription.findFirst({
          where: { providerSubscriptionId: subscription.id }
        })
        if (sub) {
          await prisma.subscription.update({
            where: { id: sub.id },
            data: { status: 'CANCELLED', plan: 'FREE', cancelledAt: new Date() }
          })
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object
        const sub = await prisma.subscription.findFirst({
          where: { providerSubscriptionId: subscription.id }
        })
        if (sub) {
          await prisma.subscription.update({
            where: { id: sub.id },
            data: {
              status: subscription.status === 'active' ? 'ACTIVE' : 'CANCELLED',
              currentPeriodEnd: new Date(subscription.current_period_end * 1000)
            }
          })
        }
        break
      }
    }
  } catch (err: any) {
    console.error('[WEBHOOK PROCESSING ERROR]', err.message)
  }

  res.json({ received: true })
})

export default router
