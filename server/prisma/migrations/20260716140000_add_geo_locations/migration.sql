-- Sistema de localidades GeoNames (catálogo interno de país/distrito/
-- concelho/localidade com coordenadas aproximadas, sem GPS do utilizador,
-- sem geocoding em runtime — ver docs/product/LOCATION_SYSTEM.md).
--
-- Aditiva por inteiro: uma tabela nova (geo_locations, vazia até o script
-- de importação correr), duas colunas nullable em "profiles", duas
-- colunas nullable em "travel_modes", e uma coluna com DEFAULT em
-- "profiles". Nada é apagado, nada é renomeado, "city"/"country" em ambas
-- as tabelas ficam exactamente como estavam.

-- CreateEnum
CREATE TYPE "ProfileLocationVisibility" AS ENUM ('CUSTOM_LOCALITY', 'REFERENCE_LOCALITY', 'REGION_ONLY');

-- CreateTable
CREATE TABLE "geo_locations" (
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

-- CreateIndex
CREATE UNIQUE INDEX "geo_locations_geonamesId_key" ON "geo_locations"("geonamesId");

-- CreateIndex
CREATE INDEX "geo_locations_countryCode_normalizedName_idx" ON "geo_locations"("countryCode", "normalizedName");

-- CreateIndex
CREATE INDEX "geo_locations_countryCode_population_idx" ON "geo_locations"("countryCode", "population");

-- CreateIndex
CREATE INDEX "geo_locations_featureClass_featureCode_idx" ON "geo_locations"("featureClass", "featureCode");

-- AlterTable: profiles — localidade de referência + apresentação
ALTER TABLE "profiles"
    ADD COLUMN "homeLocationId" TEXT,
    ADD COLUMN "customLocality" TEXT,
    ADD COLUMN "locationVisibility" "ProfileLocationVisibility" NOT NULL DEFAULT 'REFERENCE_LOCALITY';

-- CreateIndex
CREATE INDEX "profiles_homeLocationId_idx" ON "profiles"("homeLocationId");

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_homeLocationId_fkey" FOREIGN KEY ("homeLocationId") REFERENCES "geo_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: travel_modes — localidade de destino + apresentação
ALTER TABLE "travel_modes"
    ADD COLUMN "destinationLocationId" TEXT,
    ADD COLUMN "customDestinationLocality" TEXT;

-- CreateIndex
CREATE INDEX "travel_modes_destinationLocationId_idx" ON "travel_modes"("destinationLocationId");

-- AddForeignKey
ALTER TABLE "travel_modes" ADD CONSTRAINT "travel_modes_destinationLocationId_fkey" FOREIGN KEY ("destinationLocationId") REFERENCES "geo_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
