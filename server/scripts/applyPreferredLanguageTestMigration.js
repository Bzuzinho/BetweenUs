const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "User"
    ADD COLUMN IF NOT EXISTS "preferredLanguage" TEXT NOT NULL DEFAULT 'pt-PT'
  `)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async error => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
