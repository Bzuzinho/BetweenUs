const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "User"
    ADD COLUMN IF NOT EXISTS "preferredLanguage" TEXT NOT NULL DEFAULT 'pt-PT'
  `)

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'User_preferredLanguage_check'
      ) THEN
        ALTER TABLE "User"
        ADD CONSTRAINT "User_preferredLanguage_check"
        CHECK ("preferredLanguage" IN ('pt-PT', 'en', 'fr'));
      END IF;
    END
    $$;
  `)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async error => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
