import prisma from '../../src/lib/prisma'

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
      homeLocationId: true,
      homeLocation: {
        select: { id: true, active: true, countryCode: true },
      },
    } as any,
  }) as any[]

  const invalid = profiles.filter(profile =>
    !profile.homeLocationId ||
    !profile.homeLocation ||
    profile.homeLocation.active !== true ||
    profile.homeLocation.countryCode !== 'PT'
  )

  if (invalid.length > 0) {
    console.error(`FAIL — ${invalid.length}/${profiles.length} perfis beta sem localização GeoNames PT ativa:`)
    for (const profile of invalid) {
      console.error(`  - ${profile.displayName || profile.id}`)
    }
    process.exitCode = 1
    return
  }

  console.log(`PASS — localizações GeoNames dos perfis beta: ${profiles.length}/${profiles.length} válidas`)
}

main()
  .catch(error => {
    console.error('Falha ao validar localizações dos perfis beta:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
