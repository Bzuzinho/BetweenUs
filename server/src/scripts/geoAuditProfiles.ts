/**
 * Sistema de localidades — auditoria de perfis (secção 17/24 do pedido:
 * nunca migrar sem visibilidade honesta do estado actual primeiro).
 * Só leitura — nunca escreve nada na BD.
 *
 * Uso:
 *   npm run geo:audit-profiles
 */
import prisma from '../lib/prisma'

async function main() {
  const total = await (prisma as any).profile.count()
  const withReference = await (prisma as any).profile.count({ where: { homeLocationId: { not: null } } })
  const withLegacyCity = await (prisma as any).profile.count({ where: { homeLocationId: null, city: { not: null } } })
  const withNothing = await (prisma as any).profile.count({
    where: { homeLocationId: null, city: null, country: null },
  })

  console.log('── Auditoria de perfis — sistema de localidades ──')
  console.log(`Total de perfis:                            ${total}`)
  console.log(`Com localidade de referência (catálogo):    ${withReference}`)
  console.log(`Só com city legacy (candidatos a migração):  ${withLegacyCity}`)
  console.log(`Sem localização nenhuma:                     ${withNothing}`)

  if (total === 0) return

  // Distribuição do `country` legacy (texto livre — nunca normalizado
  // aqui de propósito: "Portugal"/"PT"/"portugal" aparecem SEPARADOS, para
  // mostrar a variação real dos dados a quem for decidir a migração).
  const legacyCountries: Array<{ country: string | null; count: bigint }> = await prisma.$queryRawUnsafe(`
    SELECT country, COUNT(*)::bigint as count FROM profiles
    WHERE "homeLocationId" IS NULL AND country IS NOT NULL
    GROUP BY country ORDER BY count DESC LIMIT 15
  `)
  if (legacyCountries.length) {
    console.log('')
    console.log('Valores de country legacy mais comuns (perfis ainda sem catálogo):')
    legacyCountries.forEach(r => console.log(`  "${r.country}": ${Number(r.count)}`))
    console.log('  (só valores que já são um código ISO2 válido, ou um nome conhecido de')
    console.log('   locationNormalizationService.countryCodeForName, são elegíveis para')
    console.log('   correspondência automática em geo:map-profiles — os restantes ficam')
    console.log('   por resolver manualmente no admin, nunca adivinhados.)')
  }

  const catalogTotal = await (prisma as any).geoLocation.count({ where: { active: true } })
  console.log('')
  console.log(`Localidades activas no catálogo: ${catalogTotal}`)
  if (catalogTotal === 0) {
    console.log('Catálogo vazio — corre "npm run geo:import -- --country=PT" antes de tentar geo:map-profiles.')
  }
}

if (require.main === module) {
  main()
    .catch(err => { console.error('Falhou:', err.message); process.exit(1) })
    .finally(() => prisma.$disconnect())
}
