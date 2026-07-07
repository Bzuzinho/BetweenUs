import { Router, Request, Response } from 'express'
import prisma from '../lib/prisma'
import { captureError } from '../lib/sentry'

const router = Router()
const isProd = process.env.NODE_ENV === 'production'

// POST /api/webhooks/stripe
// Registered before express.json() so body is raw Buffer
router.post('/stripe', async (req: Request, res: Response) => {
  const key = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  // T11: webhook secret is mandatory — without it we cannot verify Stripe events
  if (!webhookSecret) {
    if (isProd) {
      console.error('[WEBHOOK] STRIPE_WEBHOOK_SECRET not set — refusing all events in production')
      return res.status(500).json({ error: 'Webhook not configured.' })
    }
    // Dev: log warning but continue for local testing
    console.warn('[WEBHOOK] STRIPE_WEBHOOK_SECRET not set — skipping signature verification (dev only)')
  }

  if (!key) return res.json({ received: true })

  const Stripe = require('stripe')
  const stripe = new Stripe(key, { apiVersion: '2024-04-10' })

  const sig = req.headers['stripe-signature']
  let event: any

  if (webhookSecret) {
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret)
    } catch (err: any) {
      captureError(err, { job: 'stripeWebhook', stage: 'signature_verification' })
      return res.status(400).json({ error: `Webhook error: ${err.message}` })
    }
  } else {
    // Dev only — parse without verification
    try {
      event = JSON.parse(req.body.toString())
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' })
    }
  }

  console.log('[WEBHOOK]', event.type, new Date().toISOString())

  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object
        const { userId, plan } = session.metadata || {}
        if (!userId || !plan) { console.warn('[WEBHOOK] Missing metadata'); break }

        const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

        // T3: use providerCustomerId/providerSubscriptionId — consistent with schema
        await prisma.subscription.upsert({
          where: { userId },
          update: {
            plan, status: 'ACTIVE',
            providerCustomerId: session.customer,
            providerSubscriptionId: session.subscription,
            currentPeriodStart: new Date(),
            currentPeriodEnd: periodEnd
          },
          create: {
            userId, plan, status: 'ACTIVE',
            providerCustomerId: session.customer,
            providerSubscriptionId: session.subscription,
            currentPeriodStart: new Date(),
            currentPeriodEnd: periodEnd
          }
        })
        console.log('[WEBHOOK] Subscription activated:', userId, plan)

        const { processReferralSubscription } = await import('../lib/referralService')
        processReferralSubscription(userId).catch((e: any) => console.error('[REFERRAL]', e.message))

        // COUPLE_PREMIUM: activate every other active member of the same
        // profile for free. 4.1: goes through ProfileMembershipService
        // instead of reading CoupleProfile.partnerOneUserId/partnerTwoUserId
        // directly — also means this now correctly covers a couple whose
        // membership only exists in ProfileMember (no legacy CoupleProfile
        // row at all, e.g. created after the backfill).
        if (plan === 'COUPLE_PREMIUM') {
          const myProfile = await prisma.profile.findUnique({ where: { userId }, select: { id: true } })
          if (myProfile) {
            const { getActiveMembers } = await import('../lib/profileMembershipService')
            const members = await getActiveMembers(myProfile.id)
            const otherMemberIds = members.map(m => m.userId).filter(id => id !== userId)

            for (const partnerUserId of otherMemberIds) {
              await prisma.subscription.upsert({
                where: { userId: partnerUserId },
                update: { plan: 'COUPLE_PREMIUM', status: 'ACTIVE', currentPeriodStart: new Date(), currentPeriodEnd: periodEnd },
                create: { userId: partnerUserId, plan: 'COUPLE_PREMIUM', status: 'ACTIVE', currentPeriodStart: new Date(), currentPeriodEnd: periodEnd }
              })
              console.log('[WEBHOOK] Partner subscription activated:', partnerUserId)
            }
          }
        }
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object
        const subscription = await prisma.subscription.findFirst({
          where: { providerSubscriptionId: sub.id }
        })
        if (subscription) {
          await prisma.subscription.update({
            where: { id: subscription.id },
            data: {
              status: sub.status === 'active' ? 'ACTIVE' :
                sub.status === 'canceled' ? 'CANCELLED' :
                sub.status === 'past_due' ? 'PAST_DUE' : 'UNPAID',
              currentPeriodEnd: new Date(sub.current_period_end * 1000)
            }
          })
        }
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object
        const subscription = await prisma.subscription.findFirst({
          where: { providerSubscriptionId: sub.id }
        })
        if (subscription) {
          await prisma.subscription.update({
            where: { id: subscription.id },
            data: { status: 'CANCELLED', plan: 'FREE' }
          })
          console.log('[WEBHOOK] Subscription cancelled:', subscription.userId)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object
        const subscription = await prisma.subscription.findFirst({
          where: { providerSubscriptionId: invoice.subscription }
        })
        if (subscription) {
          await prisma.subscription.update({
            where: { id: subscription.id },
            data: { status: 'PAST_DUE' }
          })
          console.warn('[WEBHOOK] Payment failed for user:', subscription.userId)
        }
        break
      }

      default:
        console.log('[WEBHOOK] Unhandled event type:', event.type)
    }
  } catch (err: any) {
    captureError(err, { job: 'stripeWebhook', stage: 'handler' })
    return res.status(500).json({ error: 'Webhook processing failed.' })
  }

  res.json({ received: true })
})

export default router
