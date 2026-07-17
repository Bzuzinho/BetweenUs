/**
 * Sistema de localidades — estatísticas do catálogo GeoLocation já
 * importado. Uso: npm run geo:stats
 */
import prisma from '../lib/prisma'

async function main() {
  const rows: Array<{ countryCode: string; count: bigint }> = await prisma.$queryRawUnsafe(
    `SELECT "countryCode", COUNT(*)::bigint as count FROM "geo_locations" WHERE active = true GROUP BY "countryCode" ORDER BY "countryCode"`
  )
  const inactiveTotal: Array<{ count: bigint }> = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*)::bigint as count FROM "geo_locations" WHERE active = false`
  )

  if (rows.length === 0) {
    console.log('Catálogo vazio — corre "npm run geo:import -- --country=PT" primeiro.')
    return
  }

  console.log('── Localidades activas por país ──')
  let total = 0
  for (const r of rows) {
    console.log(`${r.countryCode}: ${Number(r.count)}`)
    total += Number(r.count)
  }
  console.log(`Total activas: ${total}`)
  console.log(`Desactivadas (histórico de --replace): ${Number(inactiveTotal[0]?.count || 0)}`)
}

if (require.main === module) {
  main()
    .catch(err => { console.error('Falhou:', err.message); process.exit(1) })
    .finally(() => prisma.$disconnect())
}
