#!/bin/bash
set -e
echo "=== Between Us API v2.0.0 ==="
echo "--- Prisma Generate ---"
npx prisma generate
echo "--- Database Push ---"
npx prisma db push --accept-data-loss
echo "--- Seed ---"
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const intentions = [
  { name: 'Conversar primeiro', slug: 'chat_first' },
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
  { name: 'Ainda a descobrir', slug: 'exploring' },
];
async function seed() {
  for (const i of intentions) {
    await prisma.intention.upsert({ where:{slug:i.slug}, update:{}, create:i });
  }
  console.log('Seed complete');
  await prisma.\$disconnect();
}
seed().catch(e => { console.error('Seed error:', e.message); process.exit(0); });
" || echo "Seed skipped"
echo "--- Starting server ---"
node -r ts-node/register/transpile-only src/index.ts
