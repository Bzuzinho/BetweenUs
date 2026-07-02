import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding intentions...')

  const intentions = [
    { slug: 'casual_encounter',     name: 'Encontro casual',            description: 'Encontro pontual sem compromisso' },
    { slug: 'recurring_connection', name: 'Ligação recorrente',         description: 'Encontros regulares ao longo do tempo' },
    { slug: 'trio_experience',      name: 'Experiência a três',         description: 'Experiência entre três pessoas' },
    { slug: 'swing',                name: 'Swing',                      description: 'Troca de parceiros entre casais' },
    { slug: 'polyamory',            name: 'Poliamor',                   description: 'Relações múltiplas consensuais' },
    { slug: 'online_only',          name: 'Apenas online',              description: 'Ligação exclusivamente digital' },
    { slug: 'friends_with_benefits',name: 'Amizade colorida',           description: 'Amizade com componente íntima' },
    { slug: 'fetish_exploration',   name: 'Explorar fetiches',          description: 'Exploração de interesses específicos' },
    { slug: 'seek_couple',          name: 'Procurar casal',             description: 'Solteiro/a interessado/a em casal' },
    { slug: 'seek_third',           name: 'Procurar terceira pessoa',   description: 'Casal à procura de terceira pessoa' },
    { slug: 'conversation_only',    name: 'Apenas conversa',            description: 'Conversa discreta sem encontro' },
    { slug: 'open_relationship',    name: 'Relação aberta',             description: 'Pessoa em relação aberta' },
    { slug: 'still_exploring',      name: 'Ainda a descobrir',          description: 'Sem certeza do que procuro' },
  ]

  for (const intention of intentions) {
    await prisma.intention.upsert({
      where: { slug: intention.slug },
      update: { name: intention.name, description: intention.description },
      create: { slug: intention.slug, name: intention.name, description: intention.description, active: true },
    })
  }
  console.log(`Seeded ${intentions.length} intentions`)

  console.log('Seeding boundaries...')

  const boundaries = [
    // relationship_type
    { slug: 'no_emotional_involvement', name: 'Sem envolvimento emocional', category: 'relationship_type' },
    { slug: 'open_to_emotional',        name: 'Aberto a envolvimento emocional', category: 'relationship_type' },
    { slug: 'no_couples',               name: 'Não quero casais',          category: 'relationship_type' },
    { slug: 'couples_only',             name: 'Apenas casais',             category: 'relationship_type' },
    { slug: 'singles_only',             name: 'Apenas solteiros',          category: 'relationship_type' },
    // meeting_type
    { slug: 'online_only',              name: 'Apenas online',             category: 'meeting_type' },
    { slug: 'open_to_meeting',          name: 'Aberto a encontro presencial', category: 'meeting_type' },
    { slug: 'one_time_only',            name: 'Apenas uma vez',            category: 'meeting_type' },
    { slug: 'recurring_ok',             name: 'Aberto a encontros recorrentes', category: 'meeting_type' },
    // privacy
    { slug: 'no_face_photos',           name: 'Sem fotos de rosto',        category: 'privacy' },
    { slug: 'no_known_contacts',        name: 'Sem pessoas conhecidas',    category: 'privacy' },
    { slug: 'verified_only',            name: 'Apenas perfis verificados', category: 'privacy' },
    { slug: 'discretion_required',      name: 'Discrição obrigatória',     category: 'privacy' },
    // conversation_style
    { slug: 'talk_first',               name: 'Conversar primeiro',        category: 'conversation_style' },
    { slug: 'direct_approach',          name: 'Abordagem directa',         category: 'conversation_style' },
    { slug: 'slow_pace',                name: 'Ritmo lento',               category: 'conversation_style' },
    { slug: 'fast_pace',                name: 'Ritmo rápido',              category: 'conversation_style' },
  ]

  for (const boundary of boundaries) {
    await prisma.boundary.upsert({
      where: { slug: boundary.slug },
      update: { name: boundary.name, category: boundary.category },
      create: { slug: boundary.slug, name: boundary.name, category: boundary.category, active: true },
    })
  }
  console.log(`Seeded ${boundaries.length} boundaries`)

  console.log('✅ Seed complete')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
