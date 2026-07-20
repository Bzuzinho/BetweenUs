-- Fase 3D — Travel Mode por país/cidade (sem georreferenciação)
--
-- Migration puramente aditiva e idempotente. A coluna pode já existir em
-- ambientes que receberam o campo antes de o histórico Prisma ser baselined.
-- IF NOT EXISTS permite repetir o deploy sem falhar nem alterar dados.

ALTER TABLE "profiles"
ADD COLUMN IF NOT EXISTS "homeLocationUpdatedAt" TIMESTAMP(3);
