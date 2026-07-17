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
        const { userId, plan, activeProfileType } = session.metadata || {}
        if (!userId || !plan) { console.warn('[WEBHOOK] Missing metadata'); break }

        // Nunca inventar 30 dias (secção 20) — currentPeriodEnd vem sempre
        // da própria Stripe. checkout.session.completed não traz o período
        // directamente (varia com a API version/expand), por isso a
        // subscrição é lida de volta explicitamente aqui.
        let periodStart = new Date()
        let periodEnd: Date | null = null
        if (session.subscription) {
          try {
            const stripeSub = await stripe.subscriptions.retrieve(session.subscription)
            periodStart = new Date(stripeSub.current_period_start * 1000)
            periodEnd = new Date(stripeSub.current_period_end * 1000)
          } catch (e: any) {
            console.error('[WEBHOOK] Falha ao ler subscription da Stripe para período:', e.message)
          }
        }

        // T3: use providerCustomerId/providerSubscriptionId — consistent with schema
        await prisma.subscription.upsert({
          where: { userId },
          update: {
            plan, status: 'ACTIVE', cancelAtPeriodEnd: false, cancelledAt: null,
            providerCustomerId: session.customer,
            providerSubscriptionId: session.subscription,
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd
          },
          create: {
            userId, plan, status: 'ACTIVE',
            providerCustomerId: session.customer,
            providerSubscriptionId: session.subscription,
            currentPeriodStart: periodStart,
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
        //
        // Secção 20/14 — validado de novo aqui (não só no checkout): nunca
        // GROUP, e o casal tem de ter EXACTAMENTE dois membros activos.
        // canPurchasePlan já bloqueou isto no checkout, mas o webhook é a
        // fonte de verdade que activa dinheiro real — nunca confia
        // cegamente no que a rota de checkout validou minutos antes (o
        // casal pode ter mudado de estado entretanto).
        if (plan === 'COUPLE_PREMIUM') {
          if (activeProfileType && activeProfileType !== 'COUPLE') {
            console.error('[WEBHOOK] COUPLE_PREMIUM comprado fora de contexto COUPLE — não activa parceiro(s).', userId, activeProfileType)
            break
          }
          // BETA.2 (FASE C) — must resolve to the buyer's Shared Profile
          // (not their Individual Profile, which Profile.userId now always
          // points to — see activeProfileContextService.ts) or the whole
          // partner-activation loop below silently activates nobody.
          const { resolveMyProfileId, getActiveMembers } = await import('../lib/profileMembershipService')
          const myProfileId = await resolveMyProfileId(userId)
          if (myProfileId) {
            const profileRow = await prisma.profile.findUnique({ where: { id: myProfileId }, select: { type: true } })
            const members = await getActiveMembers(myProfileId)

            if (profileRow?.type !== 'COUPLE' || members.length !== 2) {
              console.error('[WEBHOOK] COUPLE_PREMIUM exige perfil COUPLE com exactamente 2 membros — encontrado', profileRow?.type, members.length, '. Nenhum parceiro activado.')
              break
            }

            const otherMemberIds = members.map(m => m.userId).filter(id => id !== userId)
            for (const partnerUserId of otherMemberIds) {
              await prisma.subscription.upsert({
                where: { userId: partnerUserId },
                update: { plan: 'COUPLE_PREMIUM', status: 'ACTIVE', cancelAtPeriodEnd: false, cancelledAt: null, currentPeriodStart: periodStart, currentPeriodEnd: periodEnd },
                create: { userId: partnerUserId, plan: 'COUPLE_PREMIUM', status: 'ACTIVE', currentPeriodStart: periodStart, currentPeriodEnd: periodEnd }
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
              currentPeriodEnd: new Date(sub.current_period_end * 1000),
              // BETA.2.7 — was read from Stripe but never stored. Lets the
              // admin subscription tab distinguish "cancels at period end"
              // (still active until then) from an already-terminated sub.
              cancelAtPeriodEnd: !!sub.cancel_at_period_end
            }
          })
        }
        break
      }

      // BETA.2.7 — was entirely unhandled before this: no case existed for
      // a SUCCESSFUL payment/renewal at all, so there was no local record
      // of any payment ever happening beyond "subscription currently
      // active." This is the write side of the PaymentRecord ledger the
      // admin subscription tab's lifetime/current-period totals read from.
      // `providerEventId: event.id` makes this idempotent — Stripe
      // redelivers events, and an upsert on that unique key means a
      // redelivered 'invoice.payment_succeeded' never double-counts revenue.
      case 'invoice.payment_succeeded':
      case 'invoice.paid': {
        const invoice = event.data.object
        const subscription = await prisma.subscription.findFirst({
          where: { providerSubscriptionId: invoice.subscription }
        })
        if (subscription && typeof invoice.amount_paid === 'number') {
          await (prisma as any).paymentRecord.upsert({
            where: { providerEventId: event.id },
            update: {},
            create: {
              userId: subscription.userId,
              subscriptionId: subscription.id,
              providerInvoiceId: invoice.id || null,
              amount: invoice.amount_paid,
              currency: (invoice.currency || 'eur').toUpperCase(),
              status: 'SUCCEEDED',
              occurredAt: new Date((invoice.status_transitions?.paid_at || event.created) * 1000)
            }
          })
          console.log('[WEBHOOK] Payment recorded (succeeded):', subscription.userId, invoice.amount_paid)
        } else {
          console.warn('[WEBHOOK] invoice.payment_succeeded — no matching local subscription for', invoice.subscription)
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
          // BETA.2.7 — a failed payment is also recorded in the ledger
          // (status: FAILED) so the admin subscription tab's "payment
          // issues" can show it, and so a failed attempt is never silently
          // counted as if it were a successful one anywhere downstream.
          if (typeof invoice.amount_due === 'number') {
            await (prisma as any).paymentRecord.upsert({
              where: { providerEventId: event.id },
              update: {},
              create: {
                userId: subscription.userId,
                subscriptionId: subscription.id,
                providerInvoiceId: invoice.id || null,
                amount: invoice.amount_due,
                currency: (invoice.currency || 'eur').toUpperCase(),
                status: 'FAILED',
                occurredAt: new Date(event.created * 1000)
              }
            }).catch((e: any) => console.error('[WEBHOOK] failed PaymentRecord write:', e.message))
          }
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
