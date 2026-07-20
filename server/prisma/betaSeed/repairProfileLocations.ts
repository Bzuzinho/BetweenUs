import prisma from '../../src/lib/prisma'
import { normalizeLocationName, normalizeCountryCode } from '../../src/lib/locationNormalizationService'

// Cidades usadas pelo seed beta. Usar geonamesId torna a associação estável,
// independente do nome principal do catálogo (por exemplo, Lisbon vs Lisboa)
// e elimina ambiguidades com localidades homónimas.
const BETA_CITY_GEONAMES_IDS: Record<string, number> = {
  lisboa: 2267057,
  porto: 2735943,
  coimbra: 2740636,
  braga: 2742032,
  faro: 2268337,
}

const FEATURE_PRIORITY: Record<string, number> = {
  PPLC: 100,
  PPLA: 90,
  PPLA2: 80,
  PPLA3: 70,
  PPLA4: 60,
  PPL: 50,
  PPLX: 40,
  PPLL: 30,
  PPLS: 20,
}

const countryCodeForLegacy = (value: string | null): string | null => {
  if (!value) return null
  const normalized = normalizeCountryCode(value)
  if (normalized === 'PT' || normalizeLocationName(value) === 'portugal') return 'PT'
  return /^[A-Z]{2}$/.test(normalized) ? normalized : null
}

const populationValue = (value: bigint | number | null | undefined): bigint => {
  if (typeof value === 'bigint') return value
  if (typeof value === 'number' && Number.isFinite(value)) return BigInt(Math.trunc(value))
  return 0n
}

const chooseLocation = (city: string, candidates: any[]): any | null => {
  const cityKey = normalizeLocationName(city)
  const ranked = [...candidates].sort((a, b) => {
    const aAdminExact = [a.admin1Name, a.admin2Name].some((name: string | null) => name && normalizeLocationName(name) === cityKey) ? 1 : 0
    const bAdminExact = [b.admin1Name, b.admin2Name].some((name: string | null) => name && normalizeLocationName(name) === cityKey) ? 1 : 0
    if (aAdminExact !== bAdminExact) return bAdminExact - aAdminExact

    const featureDiff = (FEATURE_PRIORITY[b.featureCode || ''] || 0) - (FEATURE_PRIORITY[a.featureCode || ''] || 0)
    if (featureDiff !== 0) return featureDiff

    const popA = populationValue(a.population)
    const popB = populationValue(b.population)
    if (popA !== popB) return popB > popA ? 1 : -1

    return Number(a.geonamesId) - Number(b.geonamesId)
  })

  return ranked[0] || null
}

async function main() {
  const testUsers = await prisma.user.findMany({
    where: { isTestAccount: true },
    select: { id: true },
  })
  const testUserIds = testUsers.map(user => user.id)

  const [ownedProfiles, memberships] = await Promise.all([
    prisma.profile.findMany({
      where: { userId: { in: testUserIds } },
      select: { id: true },
    }),
    (prisma as any).profileMember.findMany({
      where: { userId: { in: testUserIds } },
      select: { profileId: true },
    }),
  ])

  const profileIds = [...new Set([
    ...ownedProfiles.map(profile => profile.id),
    ...memberships.map((membership: any) => membership.profileId),
  ])]

  const profiles = await prisma.profile.findMany({
    where: { id: { in: profileIds } },
    select: {
      id: true,
      displayName: true,
      city: true,
      country: true,
      homeLocationId: true,
    } as any,
  }) as any[]

  let updated = 0
  let alreadyCorrect = 0
  const unresolved: string[] = []

  for (const profile of profiles) {
    if (!profile.city) {
      unresolved.push(`${profile.displayName || profile.id}: sem city legacy`)
      continue
    }

    const countryCode = countryCodeForLegacy(profile.country)
    if (!countryCode) {
      unresolved.push(`${profile.displayName || profile.id}: país não reconhecido (${profile.country || 'vazio'})`)
      continue
    }

    const cityKey = normalizeLocationName(profile.city)
    const deterministicGeonamesId = countryCode === 'PT' ? BETA_CITY_GEONAMES_IDS[cityKey] : undefined

    let selected: any | null = null

    if (deterministicGeonamesId) {
      selected = await (prisma as any).geoLocation.findFirst({
        where: {
          geonamesId: deterministicGeonamesId,
          countryCode,
          active: true,
        },
        select: { id: true, geonamesId: true },
      })
    }

    // Fallback para cidades futuras que não estejam no mapa fixo.
    if (!selected) {
      const candidates = await (prisma as any).geoLocation.findMany({
        where: {
          countryCode,
          active: true,
          OR: [
            { normalizedName: cityKey },
            { asciiName: { equals: profile.city, mode: 'insensitive' } },
            { alternateNames: { contains: profile.city, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          geonamesId: true,
          name: true,
          featureCode: true,
          population: true,
          admin1Name: true,
          admin2Name: true,
        },
      })
      selected = chooseLocation(profile.city, candidates)
    }

    if (!selected) {
      unresolved.push(`${profile.displayName || profile.id}: ${profile.city}, ${profile.country}`)
      continue
    }

    if (profile.homeLocationId !== selected.id) {
      await prisma.profile.update({
        where: { id: profile.id },
        data: {
          homeLocationId: selected.id,
          customLocality: null,
        } as any,
      })
      updated++
    } else {
      alreadyCorrect++
    }
  }

  console.log(`Beta profile locations: ${updated} atualizado(s), ${alreadyCorrect} já correto(s), ${unresolved.length} por resolver`)

  if (unresolved.length > 0) {
    console.error('Perfis beta sem localização determinística:')
    for (const item of unresolved) console.error(`  - ${item}`)
    process.exitCode = 1
  }
}

main()
  .catch(error => {
    console.error('Falha ao reparar localizações dos perfis beta:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
