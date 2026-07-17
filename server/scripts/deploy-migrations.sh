#!/usr/bin/env bash
set -euo pipefail

# Recovery idempotente para uma migration que pode ter falhado em produção
# porque a coluna já existia antes de o histórico Prisma ser criado.
MIGRATION="20260716120000_add_home_location_updated_at"

# Se a migration estiver registada como falhada, permite que volte a correr.
# Noutros ambientes este comando pode falhar por já estar aplicada ou nunca ter
# falhado; nesse caso é seguro continuar.
npx prisma migrate resolve --rolled-back "$MIGRATION" >/dev/null 2>&1 || true

# As migrations são escritas de forma idempotente, portanto o deploy pode ser
# repetido com segurança.
npx prisma migrate deploy
