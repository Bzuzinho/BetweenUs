import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding Between Us database...')

  // ─── Intentions (B.2) ─────────────────────────────────────────────────────
  const intentions = [
    { name: 'Conversar primeiro', slug: 'chat_first' },
    { name: 'Encontro casual', slug: 'casual_encounter' },
    { name: 'Ligação recorrente', slug: 'recurring_connection' },
    { name: 'Envolvimento emocional', slug: 'emotional_connection' },
    { name: 'Experiência a três', slug: 'trio_experience' },
    { name: 'Casal procura terceira pessoa', slug: 'couple_seeks_third' },
    { name: 'Casal procura casal', slug: 'couple_seeks_couple' },
    { name: 'Solteiro/a procura casal', slug: 'single_seeks_couple' },
    { name: 'Swing', slug: 'swing' },
    { name: 'Relação paralela contínua', slug: 'parallel_relationship' },
    { name: 'Amizade colorida', slug: 'friends_with_benefits' },
    { name: 'Explorar fetiches', slug: 'fetish_exploration' },
    { name: 'Poliamor', slug: 'polyamory' },
    { name: 'Apenas online', slug: 'online_only' },
    { name: 'Videochamada antes de encontro', slug: 'video_first' },
    { name: 'Ainda a descobrir', slug: 'exploring' },
  ]

  for (const intention of intentions) {
    await prisma.intention.upsert({
      where: { slug: intention.slug },
      update: { name: intention.name },
      create: intention
    })
  }
  console.log('✅ Intentions seeded:', intentions.length)

  // ─── Boundaries (B.3) — 16+ categorias ───────────────────────────────────
  const boundaries = [
    // Fotos e visual
    { name: 'Fotos privadas', category: 'privacy' },
    { name: 'Fotos de rosto', category: 'privacy' },
    { name: 'Fotos íntimas', category: 'privacy' },
    // Comunicação
    { name: 'Videochamada', category: 'contact_type' },
    { name: 'Troca de contactos externos', category: 'contact_type' },
    { name: 'Sem troca de números no início', category: 'contact_type' },
    { name: 'Sem redes sociais', category: 'contact_type' },
    // Encontros
    { name: 'Encontro presencial', category: 'meeting_type' },
    { name: 'Encontro só com ambos os membros do casal', category: 'meeting_type' },
    { name: 'Encontro individual com um dos membros', category: 'meeting_type' },
    { name: 'Dormir fora', category: 'meeting_type' },
    // Relação
    { name: 'Envolvimento emocional', category: 'emotional' },
    { name: 'Sem envolvimento emocional', category: 'emotional' },
    { name: 'Contacto recorrente', category: 'frequency' },
    // Privacidade e segurança
    { name: 'Discrição total', category: 'privacy' },
    { name: 'Sem pessoas conhecidas', category: 'privacy' },
    { name: 'Apenas perfis verificados', category: 'safety' },
    // Dinâmicas
    { name: 'Exploração de fetiches', category: 'dynamics' },
    { name: 'BDSM', category: 'dynamics' },
    { name: 'Swing', category: 'dynamics' },
    { name: 'Poliamor', category: 'dynamics' },
  ]

  let boundaryCount = 0
  for (const boundary of boundaries) {
    try {
      await prisma.boundary.create({ data: boundary })
      boundaryCount++
    } catch {
      // Already exists, skip
    }
  }
  console.log('✅ Boundaries seeded:', boundaryCount)
  console.log('🌱 Seed complete')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
