// BETA.1.28/1.29/1.30 — Between Guide articles, Events (+ attendance),
// Circles (+ memberships). No dedicated service layer exists for any of
// these beyond the route bodies themselves (confirmed in the audit —
// guide.ts/events.ts/circles.ts write Prisma directly, gated by
// requireAdmin), so direct, idempotent upserts here are the correct
// equivalent, not a bypass of anything.
import prisma from '../../../src/lib/prisma'

type ProfileMap = Record<string, { profileId: string; userId?: string; memberUserIds?: string[] }>

interface GuideSpec { slug: string; title: string; category: string; body: string; published: boolean; summary: string }

const GUIDE_SPECS: GuideSpec[] = [
  { slug: 'como-definir-limites-em-casal', title: 'Como definir limites em casal', category: 'COUPLES', published: true,
    summary: 'Um guia prático para alinhar o que cada um de vocês está — e não está — confortável em explorar.',
    body: 'Definir limites em casal começa por conversas honestas, sem pressa. O Mapa de Limites da Between Us ajuda-vos a registar sim/talvez/não em conjunto, mas a conversa em si é insubstituível.' },
  { slug: 'privacidade-digital-principios-basicos', title: 'Privacidade digital: princípios básicos', category: 'PRIVACY', published: true,
    summary: 'O que controlas na Between Us — e o que isso significa na prática.',
    body: 'Modo invisível, fotos por camadas, distância aproximada — cada ferramenta de privacidade existe para te dar controlo real sobre o que partilhas e quando.' },
  { slug: 'consentimento-pode-mudar', title: 'Consentimento pode mudar', category: 'CONSENT', published: true,
    summary: 'Consentir uma vez não é consentir para sempre.',
    body: 'O Consent Check da Between Us existe precisamente porque o consentimento é revisível a qualquer momento, em qualquer fase — match, conversa, fotos, encontro.' },
  { slug: 'primeiro-encontro-seguranca', title: 'Primeiro encontro: segurança', category: 'SAFETY', published: true,
    summary: 'Como usar o Check-in de Encontro antes de saíres de casa.',
    body: 'Marca um local público, define um Check-in de Segurança com um contacto de confiança, e confirma que estás bem assim que puderes.' },
  { slug: 'como-criar-um-perfil-de-confianca', title: 'Como criar um perfil de confiança', category: 'PROFILES', published: true,
    summary: 'Fotos, bio e verificação — o que realmente ajuda outras pessoas a confiarem em ti.',
    body: 'Um perfil verificado, com bio clara sobre o que procuras, tende a gerar ligações mais alinhadas do que um perfil vago.' },
  { slug: 'poliamor-vocabulario-essencial', title: 'Poliamor: vocabulário essencial', category: 'POLYAMORY', published: false,
    summary: 'Termos comuns para quem está a começar a explorar poliamor.',
    body: 'Rascunho — glossário de termos como hierárquico, não-hierárquico, solo poly, compersão.' },
  { slug: 'relacoes-abertas-conversas-dificeis', title: 'Relações abertas: conversas difíceis', category: 'OPEN_RELATIONSHIPS', published: false,
    summary: 'Como abordar ciúme e insegurança numa relação aberta.',
    body: 'Rascunho — ainda em revisão editorial.' },
  { slug: 'fetiches-privados-como-funciona', title: 'Fetiches privados: como funciona', category: 'PRIVATE_INTERESTS', published: false,
    summary: 'Explicação do módulo de Private Interests e como a privacidade é garantida.',
    body: 'Rascunho — pendente de revisão legal sobre linguagem.' },
]

export const seedGuideArticles = async (adminIds: Record<string, string>): Promise<void> => {
  const authorId = adminIds['admin_content'] || null
  let count = 0
  for (const g of GUIDE_SPECS) {
    await prisma.guideArticle.upsert({
      where: { slug: g.slug },
      update: { title: g.title, category: g.category as any, body: g.body, summary: g.summary, published: g.published, publishedAt: g.published ? new Date() : null },
      create: { slug: g.slug, title: g.title, category: g.category as any, body: g.body, summary: g.summary, published: g.published, publishedAt: g.published ? new Date() : null, authorId, readingTime: 3, locale: 'pt' },
    })
    count++
  }
  console.log(`  Guide articles: ${count} (5 published + 3 draft)`)
}

interface EventSpec {
  key: string; organizerKey: string; title: string; city: string; venueVisibility: string; status: string
}
const EVENT_SPECS: EventSpec[] = [
  { key: 'event_a', organizerKey: 'individual_marta', title: 'Encontro Aberto — Lisboa', city: 'Lisboa', venueVisibility: 'PUBLIC_CITY_ONLY', status: 'PUBLISHED' },
  { key: 'event_b', organizerKey: 'couple_1_third_match', title: 'Serão de Casais — Porto', city: 'Porto', venueVisibility: 'APPROVED_ATTENDEES', status: 'PUBLISHED' },
  { key: 'event_c', organizerKey: 'individual_alex', title: 'Encontro Poli — Lisboa', city: 'Lisboa', venueVisibility: 'REVEAL_24H_BEFORE', status: 'PUBLISHED' },
  { key: 'event_d', organizerKey: 'individual_joana', title: 'Encontro em avaliação', city: 'Coimbra', venueVisibility: 'PUBLIC_CITY_ONLY', status: 'PENDING_REVIEW' },
  { key: 'event_e', organizerKey: 'individual_rui', title: 'Encontro cancelado', city: 'Faro', venueVisibility: 'PUBLIC_CITY_ONLY', status: 'CANCELLED' },
]

export const seedEvents = async (individuals: ProfileMap, couples: ProfileMap): Promise<void> => {
  const eventIds: Record<string, string> = {}
  let count = 0
  const roster = { ...individuals, ...couples }
  for (const spec of EVENT_SPECS) {
    const organizerProfileId = roster[spec.organizerKey]?.profileId
    if (!organizerProfileId) continue
    const existing = await prisma.event.findFirst({ where: { title: spec.title, organizerProfileId } })
    const event = existing || await prisma.event.create({
      data: {
        organizerProfileId, title: spec.title,
        description: `${spec.title} — encontro de teste organizado para validar o fluxo de eventos.`,
        city: spec.city, country: 'Portugal',
        venueDetail: 'TEST VENUE — NOT A REAL LOCATION',
        venueVisibility: spec.venueVisibility as any,
        startsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        endsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
        capacity: 10, verificationRequired: true, approvalRequired: spec.venueVisibility === 'APPROVED_ATTENDEES',
        status: spec.status as any,
      },
    })
    eventIds[spec.key] = event.id
    count++
  }

  // Attendance — one of each status, on event_a (PUBLISHED).
  const eventA = eventIds['event_a']
  if (eventA) {
    const attendeeSpecs: Array<{ key: string; status: string }> = [
      { key: 'individual_leonor', status: 'REQUESTED' }, { key: 'individual_tiago', status: 'APPROVED' },
      { key: 'individual_ines', status: 'DECLINED' }, { key: 'individual_diogo', status: 'CANCELLED' },
      { key: 'individual_rui', status: 'ATTENDED' },
    ]
    for (const a of attendeeSpecs) {
      const profileId = individuals[a.key]?.profileId
      if (!profileId) continue
      await prisma.eventAttendance.upsert({
        where: { eventId_profileId: { eventId: eventA, profileId } },
        update: { status: a.status as any },
        create: { eventId: eventA, profileId, status: a.status as any, approvedAt: a.status === 'APPROVED' || a.status === 'ATTENDED' ? new Date() : null },
      })
    }
  }

  console.log(`  Events: ${count} (+ attendance em event_a)`)
}

interface CircleSpec { slug: string; name: string; city: string | null; visibility: string }
const CIRCLE_SPECS: CircleSpec[] = [
  { slug: 'lisbon-open-connections', name: 'Lisbon Open Connections', city: 'Lisboa', visibility: 'DISCOVERABLE' },
  { slug: 'porto-couples', name: 'Porto Couples', city: 'Porto', visibility: 'DISCOVERABLE' },
  { slug: 'portugal-poly-community', name: 'Portugal Poly Community', city: null, visibility: 'PRIVATE' },
  { slug: 'algarve-travellers', name: 'Algarve Travellers', city: 'Faro', visibility: 'INVITE_ONLY' },
]

export const seedCircles = async (individuals: ProfileMap, couples: ProfileMap, adminIds: Record<string, string>): Promise<void> => {
  const createdByAdminId = adminIds['admin_super']
  if (!createdByAdminId) return
  const roster = { ...individuals, ...couples }
  const circleIds: Record<string, string> = {}
  for (const c of CIRCLE_SPECS) {
    const circle = await prisma.circle.upsert({
      where: { slug: c.slug },
      update: { name: c.name, city: c.city, visibility: c.visibility as any, status: 'ACTIVE' },
      create: { slug: c.slug, name: c.name, description: `${c.name} — comunidade de teste.`, city: c.city, country: 'Portugal', visibility: c.visibility as any, status: 'ACTIVE', createdByAdminId },
    })
    circleIds[c.slug] = circle.id
  }

  const membershipSpecs: Array<{ circleSlug: string; profileKey: string; status: string; role?: string }> = [
    { circleSlug: 'lisbon-open-connections', profileKey: 'individual_marta', status: 'APPROVED', role: 'LOCAL_MODERATOR' },
    { circleSlug: 'lisbon-open-connections', profileKey: 'individual_joana', status: 'APPROVED' },
    { circleSlug: 'lisbon-open-connections', profileKey: 'individual_tiago', status: 'REQUESTED' },
    { circleSlug: 'porto-couples', profileKey: 'couple_4_travel', status: 'APPROVED' },
    { circleSlug: 'portugal-poly-community', profileKey: 'individual_alex', status: 'APPROVED' },
    { circleSlug: 'algarve-travellers', profileKey: 'individual_catarina', status: 'DECLINED' },
    { circleSlug: 'algarve-travellers', profileKey: 'individual_rui', status: 'LEFT' },
  ]
  let count = 0
  for (const m of membershipSpecs) {
    const circleId = circleIds[m.circleSlug]
    const profileId = roster[m.profileKey]?.profileId
    if (!circleId || !profileId) continue
    await prisma.circleMembership.upsert({
      where: { circleId_profileId: { circleId, profileId } },
      update: { status: m.status as any, role: (m.role as any) || 'MEMBER' },
      create: { circleId, profileId, status: m.status as any, role: (m.role as any) || 'MEMBER' },
    })
    count++
  }
  console.log(`  Circles: ${CIRCLE_SPECS.length} (+ ${count} memberships)`)
}
