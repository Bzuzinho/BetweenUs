// BETA.2.7 — Admin subscription financial summary.
//
// Explicit constraint from the spec: never derive "lifetime revenue" from
// Subscription.currentPeriodStart/End math (that's a snapshot of the
// CURRENT period only, not a payment history) and never call Stripe on
// every admin page render. This aggregates the local PaymentRecord ledger
// (schema.prisma, written only from routes/webhooks.ts's
// invoice.payment_succeeded/invoice.payment_failed handlers) instead.
//
// Accounts that predate this ledger (any payment that happened before
// this sprint shipped) will have zero PaymentRecord rows even though they
// really did pay — hasLocalPaymentHistory distinguishes that from "this
// user genuinely never paid," so the UI can say "dados históricos não
// disponíveis localmente" instead of a misleading €0.00.
import prisma from './prisma'

export interface SubscriptionFinancialSummary {
  hasLocalPaymentHistory: boolean
  currentPeriod: {
    amountPaid: number | null // minor units, null if hasLocalPaymentHistory=false
    currency: string | null
  }
  lifetime: {
    totalAmountPaid: number | null
    currency: string | null
    totalSuccessfulPayments: number
    lastSuccessfulPaymentAt: Date | null
  }
  recentFailedPayments: number // failed PaymentRecords in the last 90 days — surfaces "payment issues" without a separate query shape
}

export const getSubscriptionFinancialSummary = async (
  userId: string,
  currentPeriodStart: Date | null,
  currentPeriodEnd: Date | null
): Promise<SubscriptionFinancialSummary> => {
  const [allSucceeded, currentPeriodSucceeded, recentFailedCount] = await Promise.all([
    (prisma as any).paymentRecord.findMany({
      where: { userId, status: 'SUCCEEDED' },
      orderBy: { occurredAt: 'desc' }
    }),
    currentPeriodStart && currentPeriodEnd
      ? (prisma as any).paymentRecord.findMany({
          where: { userId, status: 'SUCCEEDED', occurredAt: { gte: currentPeriodStart, lte: currentPeriodEnd } }
        })
      : Promise.resolve([]),
    (prisma as any).paymentRecord.count({
      where: { userId, status: 'FAILED', occurredAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } }
    })
  ])

  const hasLocalPaymentHistory = allSucceeded.length > 0
  const currency = allSucceeded[0]?.currency || null

  return {
    hasLocalPaymentHistory,
    currentPeriod: {
      amountPaid: hasLocalPaymentHistory ? currentPeriodSucceeded.reduce((sum: number, p: any) => sum + p.amount, 0) : null,
      currency
    },
    lifetime: {
      totalAmountPaid: hasLocalPaymentHistory ? allSucceeded.reduce((sum: number, p: any) => sum + p.amount, 0) : null,
      currency,
      totalSuccessfulPayments: allSucceeded.length,
      lastSuccessfulPaymentAt: allSucceeded[0]?.occurredAt || null
    },
    recentFailedPayments: recentFailedCount
  }
}
