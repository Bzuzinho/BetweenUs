import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding Between Us database...')

  // Intentions
  const intentions = [
    { name: 'Encontro casual', slug: 'casual_encounter' },
    { name: 'Ligação recorrente', slug: 'recurring_connection' },
    { name: 'Envolvimento emocional', slug: 'emotional_connection' },
    { name: 'Experiência a três', slug: 'trio_experience' },
    { name: 'Swing', slug: 'swing' },
    { name: 'Explorar fetiches', slug: 'fetish_exploration' },
    { name: 'Apenas online', slug: 'online_only' },
    { name: 'Amizade colorida', slug: 'friends_with_benefits' },
    { name: 'Poliamor', slug: 'polyamory' },
    { name: 'Procurar casal', slug: 'seek_couple' },
    { name: 'Procurar terceira pessoa', slug: 'seek_third' },
  ]

  for (const intention of intentions) {
    await prisma.intention.upsert({
      where: { slug: intention.slug },
      update: {},
      create: intention
    })
  }

  // Boundaries
  const boundaries = [
    { name: 'Encontro casual', category: 'meeting_type' },
    { name: 'Ligação emocional', category: 'emotional' },
    { name: 'Experiência a três', category: 'dynamics' },
    { name: 'Swing', category: 'dynamics' },
    { name: 'Apenas online', category: 'meeting_type' },
    { name: 'Partilha de fotos', category: 'privacy' },
    { name: 'Videochamada', category: 'contact_type' },
    { name: 'Encontro presencial', category: 'meeting_type' },
    { name: 'Contacto recorrente', category: 'frequency' },
    { name: 'Explorar fetiches', category: 'dynamics' },
    { name: 'Sem envolvimento emocional', category: 'emotional' },
    { name: 'Aberto a relação paralela', category: 'relationship_type' },
  ]

  for (const boundary of boundaries) {
    await prisma.boundary.upsert({
      where: { id: boundary.name },
      update: {},
      create: boundary
    }).catch(() => prisma.boundary.create({ data: boundary }))
  }

  console.log('✅ Seed complete')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
