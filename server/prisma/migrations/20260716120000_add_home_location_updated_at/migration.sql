-- Fase 3D — Travel Mode por país/cidade (sem georreferenciação)
--
-- Migration puramente aditiva: uma única coluna nullable, sem valor
-- por omissão obrigatório, sem tocar em dados existentes, sem renomear
-- nem remover nada. Guarda quando a "localização habitual" (Profile.city/
-- Profile.country, já existentes) foi confirmada pela última vez fora do
-- onboarding — usado por effectiveLocationService.canChangeHomeLocation
-- para aplicar o cooldown de correção (ver comentário no schema.prisma).

ALTER TABLE "profiles" ADD COLUMN "homeLocationUpdatedAt" TIMESTAMP(3);
