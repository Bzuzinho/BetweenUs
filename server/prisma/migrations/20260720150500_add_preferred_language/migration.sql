-- Internacionalização da conta.
-- Utilizadores existentes permanecem em Português de Portugal.
ALTER TABLE "User"
ADD COLUMN "preferredLanguage" TEXT NOT NULL DEFAULT 'pt-PT';

ALTER TABLE "User"
ADD CONSTRAINT "User_preferredLanguage_check"
CHECK ("preferredLanguage" IN ('pt-PT', 'en', 'fr'));
