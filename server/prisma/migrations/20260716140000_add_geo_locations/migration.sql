-- Sistema de localidades GeoNames (catálogo interno de país/distrito/
-- concelho/localidade com coordenadas aproximadas, sem GPS do utilizador,
-- sem geocoding em runtime — ver docs/product/LOCATION_SYSTEM.md).
--
-- Esta migration é deliberadamente idempotente porque a produção já recebeu
-- parte deste schema por sincronizações anteriores. Pode ser repetida sem
-- falhar quando tipos, tabelas, colunas, índices ou constraints já existem.

-- CreateEnum, apenas quando ainda não existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'ProfileLocationVisibility'
          AND n.nspname = current_schema()
    ) THEN
        CREATE TYPE "ProfileLocationVisibility" AS ENUM (
            'CUSTOM_LOCALITY',
            'REFERENCE_LOCALITY',
            'REGION_ONLY'
        );
    END IF;
END
$$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "geo_locations" (
    "id" TEXT NOT NULL,
    "geonamesId" INTEGER NOT NULL,
    "countryCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "asciiName" TEXT,
    "alternateNames" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "featureClass" TEXT NOT NULL,
    "featureCode" TEXT,
    "population" BIGINT,
    "admin1Code" TEXT,
    "admin2Code" TEXT,
    "admin1Name" TEXT,
    "admin2Name" TEXT,
    "timezone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "geo_locations_pkey" PRIMARY KEY ("id")
);

-- Garante colunas em instalações onde a tabela possa ter sido criada parcialmente
ALTER TABLE "geo_locations"
    ADD COLUMN IF NOT EXISTS "geonamesId" INTEGER,
    ADD COLUMN IF NOT EXISTS "countryCode" TEXT,
    ADD COLUMN IF NOT EXISTS "name" TEXT,
    ADD COLUMN IF NOT EXISTS "normalizedName" TEXT,
    ADD COLUMN IF NOT EXISTS "asciiName" TEXT,
    ADD COLUMN IF NOT EXISTS "alternateNames" TEXT,
    ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "featureClass" TEXT,
    ADD COLUMN IF NOT EXISTS "featureCode" TEXT,
    ADD COLUMN IF NOT EXISTS "population" BIGINT,
    ADD COLUMN IF NOT EXISTS "admin1Code" TEXT,
    ADD COLUMN IF NOT EXISTS "admin2Code" TEXT,
    ADD COLUMN IF NOT EXISTS "admin1Name" TEXT,
    ADD COLUMN IF NOT EXISTS "admin2Name" TEXT,
    ADD COLUMN IF NOT EXISTS "timezone" TEXT,
    ADD COLUMN IF NOT EXISTS "active" BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "geo_locations_geonamesId_key"
    ON "geo_locations"("geonamesId");
CREATE INDEX IF NOT EXISTS "geo_locations_countryCode_normalizedName_idx"
    ON "geo_locations"("countryCode", "normalizedName");
CREATE INDEX IF NOT EXISTS "geo_locations_countryCode_population_idx"
    ON "geo_locations"("countryCode", "population");
CREATE INDEX IF NOT EXISTS "geo_locations_featureClass_featureCode_idx"
    ON "geo_locations"("featureClass", "featureCode");

-- profiles — localidade de referência + apresentação
ALTER TABLE "profiles"
    ADD COLUMN IF NOT EXISTS "homeLocationId" TEXT,
    ADD COLUMN IF NOT EXISTS "customLocality" TEXT,
    ADD COLUMN IF NOT EXISTS "locationVisibility" "ProfileLocationVisibility" NOT NULL DEFAULT 'REFERENCE_LOCALITY';

CREATE INDEX IF NOT EXISTS "profiles_homeLocationId_idx"
    ON "profiles"("homeLocationId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'profiles_homeLocationId_fkey'
    ) THEN
        ALTER TABLE "profiles"
            ADD CONSTRAINT "profiles_homeLocationId_fkey"
            FOREIGN KEY ("homeLocationId")
            REFERENCES "geo_locations"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END
$$;

-- travel_modes — localidade de destino + apresentação
ALTER TABLE "travel_modes"
    ADD COLUMN IF NOT EXISTS "destinationLocationId" TEXT,
    ADD COLUMN IF NOT EXISTS "customDestinationLocality" TEXT;

CREATE INDEX IF NOT EXISTS "travel_modes_destinationLocationId_idx"
    ON "travel_modes"("destinationLocationId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'travel_modes_destinationLocationId_fkey'
    ) THEN
        ALTER TABLE "travel_modes"
            ADD CONSTRAINT "travel_modes_destinationLocationId_fkey"
            FOREIGN KEY ("destinationLocationId")
            REFERENCES "geo_locations"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END
$$;
