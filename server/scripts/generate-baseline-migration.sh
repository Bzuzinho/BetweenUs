#!/bin/bash
# BETA.3 — one-time baseline migration generator.
#
# WHY THIS SCRIPT EXISTS (READ BEFORE RUNNING)
# ---------------------------------------------
# This project has never used `prisma migrate` — every schema change so far
# went live via `prisma db push --accept-data-loss` directly against
# production (see start.sh's old behaviour, removed in BETA.3). There is no
# migrations/ history, so `prisma migrate deploy` currently has nothing to
# apply. This script creates the FIRST migration: a "baseline" that
# describes the schema AS IT ALREADY EXISTS in the production database
# today, so Prisma Migrate can take over from here without trying to
# re-create tables/columns that are already there.
#
# This script only WRITES a migration file locally. It does not touch any
# database. Run it once, review the generated SQL, commit it — then follow
# the "Baseline cutover" section in docs/product/CLOSED_BETA_GATE.md, which
# covers marking it as already-applied against the real production database
# (`prisma migrate resolve --applied`) BEFORE the next deploy runs
# `db:deploy`. Skipping that step means `migrate deploy` will try to
# CREATE TABLE on tables that already exist and fail the deploy (safe —
# it refuses rather than dropping/overwriting anything — but it will block
# the release until resolved).
#
# Requires network access to Prisma's engine binaries (binaries.prisma.sh) —
# run this from a normal dev machine or CI, not a network-restricted sandbox.
set -e
cd "$(dirname "$0")/.."

TIMESTAMP=$(date -u +%Y%m%d%H%M%S)
NAME="${1:-baseline}"
DIR="prisma/migrations/${TIMESTAMP}_${NAME}"

echo "--- Validating current schema ---"
npx prisma validate

echo "--- Generating baseline SQL (schema diff from empty database) ---"
mkdir -p "$DIR"
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > "${DIR}/migration.sql"

echo
echo "Baseline migration written to: ${DIR}/migration.sql"
echo "Next steps (see docs/product/CLOSED_BETA_GATE.md → 'Baseline cutover'):"
echo "  1. Review the SQL file — it should CREATE every table/enum/index in schema.prisma, nothing else."
echo "  2. Commit prisma/migrations/ to git."
echo "  3. Against the REAL production database (after taking a backup):"
echo "       npx prisma migrate resolve --applied ${TIMESTAMP}_${NAME}"
echo "  4. Only after step 3 succeeds, deploy with the new start.sh / preDeployCommand (npm run db:deploy)."
