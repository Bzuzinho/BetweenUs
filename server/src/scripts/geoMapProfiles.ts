/**
 * Sistema de localidades — mapeamento best-effort de perfis legacy
 * (city/country em texto livre) para o catálogo GeoLocation, por
 * correspondência exacta de nome normalizado dentro do país certo.
 *
 * Regra inegociável (secção 24 do pedido): NUNCA resolve uma ambiguidade
 * sozinho. Se o nome normalizado da cidade corresponder a MAIS DE UMA
 * localidade activa nesse país (ex.: duas freguesias chamadas "São Pedro"
 * em distritos diferentes), o perfil fica marcado como AMBÍGUO e não é
 * tocado — nem em modo real. Resolver isso é sempre uma decisão humana,
 * feita no admin (Configurações → Localidades → "Perfis sem localidade de
 * referência" → Corrigir, ver routes/locations.ts PUT
 * /admin/profiles/:id/location).
 *
 * O `country` legacy é texto livre (ex.: "Portugal", nunca garantidamente
 * um código ISO2 — ver Profile.country no schema.prisma), por isso passa
 * por locationNormalizationService.countryCodeForName antes de procurar no
 * catálogo: resolve tanto um código ISO2 já correcto como os nomes de país
 * conhecidos (COUNTRY_NAMES). Um `country` que não seja nenhum dos dois
 * fica de fora — nunca adivinhado a partir de meia palavra.
 *
 * Corrida sem --dry-run só escreve `homeLocationId` — nunca
 * `homeLocationUpdatedAt`: ligar o texto livre já existente à entrada
 * certa do catálogo não é uma MUDANÇA de localização pedida pelo
 * utilizador, é só apontar para o mesmo sítio de forma mais precisa, por
 * isso o relógio do cooldown (ver effectiveLocationService.
 * canChangeHomeLocation) nunca deve reiniciar por causa disto.
 *
 * Uso:
 *   npm run geo:map-profiles -- --dry-run
 *   npm run geo:map-profiles -- --dry-run --country=PT
 *   npm run geo:map-profiles
 */
import prisma from '../lib/prisma'
import { normalizeLocationName, countryCodeForName } from '../lib/locationNormalizationService'

interface ParsedArgs {
  dryRun: boolean
  country?: string
}

const parseArgs = (argv: string[]): ParsedArgs => {
  const args: ParsedArgs = { dryRun: false }
  for (const raw of argv) {
    const [flag, value] = raw.replace(/^--/, '').split('=')
    if (flag === 'dry-run') args.dryRun = true
    else if (flag === 'country') args.country = value
  }
  return args
}

interface Summary {
  candidates: number
  matched: number
  ambiguous: number
  noCountryMatch: number
  noNameMatch: number
  ambiguousSamples: string[]
  noCountrySamples: string[]
}

async function run(args: ParsedArgs) {
  const where: any = { homeLocationId: null, city: { not: null } }
  if (args.country) where.country = { equals: args.country, mode: 'insensitive' }

  const profiles: Array<{ id: string; displayName: string | null; city: string | null; country: string | null }> =
    await (prisma as any).profile.findMany({ where, select: { id: true, displayName: true, city: true, country: true } })

  const summary: Summary = {
    candidates: profiles.length, matched: 0, ambiguous: 0, noCountryMatch: 0, noNameMatch: 0,
    ambiguousSamples: [], noCountrySamples: [],
  }

  for (const profile of profiles) {
    const normalizedCity = normalizeLocationName(profile.city)
    if (!normalizedCity) { summary.noNameMatch++; continue }

    const countryCode = countryCodeForName(profile.country)
    if (!countryCode) {
      summary.noCountryMatch++
      if (summary.noCountrySamples.length < 10) {
        summary.noCountrySamples.push(`${profile.displayName || profile.id} — country="${profile.country}"`)
      }
      continue
    }

    const candidates: Array<{ id: string; name: string; admin1Name: string | null }> = await (prisma as any).geoLocation.findMany({
      where: { countryCode, normalizedName: normalizedCity, active: true },
      select: { id: true, name: true, admin1Name: true },
    })

    if (candidates.length === 0) { summary.noNameMatch++; continue }

    if (candidates.length > 1) {
      summary.ambiguous++
      if (summary.ambiguousSamples.length < 10) {
        const regions = candidates.map(c => c.admin1Name || c.name).join(', ')
        summary.ambiguousSamples.push(`${profile.displayName || profile.id} — "${profile.city}" (${candidates.length} correspondências: ${regions})`)
      }
      continue
    }

    summary.matched++
    if (!args.dryRun) {
      await (prisma as any).profile.update({ where: { id: profile.id }, data: { homeLocationId: candidates[0].id } })
    }
  }

  console.log(`── Mapeamento de perfis legacy → catálogo${args.dryRun ? ' (DRY-RUN — nada foi escrito na BD)' : ''} ──`)
  console.log(`Perfis candidatos (city preenchida, sem homeLocationId):        ${summary.candidates}`)
  console.log(`Resolvidos sem ambiguidade${args.dryRun ? ' (seriam ligados)' : ' (ligados)'}:              ${summary.matched}`)
  console.log(`Ambíguos — nunca resolvidos automaticamente:                    ${summary.ambiguous}`)
  console.log(`Sem país reconhecível (nem ISO2 nem nome conhecido):            ${summary.noCountryMatch}`)
  console.log(`Sem correspondência de nome no catálogo desse país:             ${summary.noNameMatch}`)

  if (summary.ambiguousSamples.length) {
    console.log('')
    console.log('Amostra de casos ambíguos (corrigir manualmente no admin):')
    summary.ambiguousSamples.forEach(s => console.log(`  - ${s}`))
  }
  if (summary.noCountrySamples.length) {
    console.log('')
    console.log('Amostra de casos sem país reconhecível:')
    summary.noCountrySamples.forEach(s => console.log(`  - ${s}`))
  }
}

if (require.main === module) {
  run(parseArgs(process.argv.slice(2)))
    .catch(err => { console.error('Falhou:', err.message); process.exit(1) })
    .finally(() => prisma.$disconnect())
}
