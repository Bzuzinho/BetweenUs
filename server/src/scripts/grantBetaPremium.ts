import prisma from '../lib/prisma'

const args = Object.fromEntries(
  process.argv.slice(2).map(raw => {
    const [key, ...rest] = raw.replace(/^--/, '').split('=')
    return [key, rest.join('=')]
  })
)

const email = String(args.email || '').trim().toLowerCase()
const plan = String(args.plan || 'PREMIUM').toUpperCase()
const days = Math.max(1, Math.min(365, Number(args.days || 30)))

if (!email) {
  console.error('Uso: npx ts-node --transpile-only src/scripts/grantBetaPremium.ts --email=utilizador@example.com [--plan=PREMIUM] [--days=30]')
  process.exit(1)
}

if (!['PREMIUM', 'COUPLE_PREMIUM'].includes(plan)) {
  console.error('Plano inválido. Usa PREMIUM ou COUPLE_PREMIUM.')
  process.exit(1)
}

async function main() {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) throw new Error(`Utilizador não encontrado: ${email}`)

  const now = new Date()
  const currentPeriodEnd = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

  const subscription = await prisma.subscription.upsert({
    where: { userId: user.id },
    update: {
      plan: plan as any,
      status: 'ACTIVE',
      provider: 'complimentary_beta',
      providerCustomerId: null,
      providerSubscriptionId: null,
      currentPeriodStart: now,
      currentPeriodEnd,
      cancelAtPeriodEnd: true,
      cancelledAt: null,
    },
    create: {
      userId: user.id,
      plan: plan as any,
      status: 'ACTIVE',
      provider: 'complimentary_beta',
      currentPeriodStart: now,
      currentPeriodEnd,
      cancelAtPeriodEnd: true,
    },
  })

  console.log(`Premium beta atribuído: ${email}`)
  console.log(`Plano: ${subscription.plan}`)
  console.log(`Válido até: ${currentPeriodEnd.toISOString()}`)
  console.log('Fornecedor: complimentary_beta (sem cobrança Stripe)')
}

main()
  .catch(error => {
    console.error('Falha ao atribuir Premium beta:', error.message)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
