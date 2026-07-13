#!/bin/bash
# Between Us API — production start command.
#
# BETA.3 fix: this used to run `prisma db push --accept-data-loss` on every
# boot, plus an inline duplicate re-seed of Intentions. `db push` computes a
# live schema diff against the database and applies it immediately — with
# `--accept-data-loss` baked in, any destructive diff (dropped/narrowed
# column, changed type, etc.) that a future schema.prisma edit introduces
# would be applied AUTOMATICALLY on the next deploy, silently, against a
# database that by then holds real user data. That is not acceptable once
# the app has real user data (BETA.3 gate).
#
# Schema changes now go through Prisma Migrate instead:
#   - `npm run db:deploy` (`prisma migrate deploy`) applies already-reviewed,
#     committed migration files — no live diffing, no interactive prompts,
#     nothing destructive that wasn't already reviewed as a checked-in SQL
#     file. Wired as this service's Railway "Pre-Deploy Command" (see
#     railway.json) so it runs once, before the new instance takes traffic —
#     never as part of this start script, which can run multiple times
#     (restarts, scale-out).
#   - `npm run db:push:safe` (`prisma db push`, WITHOUT --accept-data-loss)
#     still exists for manual/local use only. If Prisma detects a
#     destructive change it refuses and prints a warning instead of
#     silently applying it — a human has to re-run it with
#     --accept-data-loss themselves, on purpose, after taking a backup. See
#     docs/product/CLOSED_BETA_GATE.md for the full migration strategy and
#     the one-time baseline-migration cutover steps.
#
# The one-off Intentions re-seed that used to live here is redundant with
# `npm run db:seed` (prisma/seed.ts already seeds Intentions idempotently
# via upsert) and ran on every single boot for no reason — removed.
set -e
echo "=== Between Us API v2.6.0 ==="
echo "--- Starting server ---"
exec node -r ts-node/register/transpile-only src/index.ts
