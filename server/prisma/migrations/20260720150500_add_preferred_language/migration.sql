-- Internacionalização da conta.
-- Utilizadores existentes permanecem em Português de Portugal.
ALTER TABLE "users"
ADD COLUMN "preferredLanguage" TEXT NOT NULL DEFAULT 'pt-PT';

ALTER TABLE "users"
ADD CONSTRAINT "users_preferredLanguage_check"
CHECK ("preferredLanguage" IN ('pt-PT', 'en', 'fr'));
