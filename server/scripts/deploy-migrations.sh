#!/usr/bin/env bash
set -euo pipefail

# Recupera automaticamente migrations idempotentes que possam ter ficado
# registadas como falhadas em produção após sincronizações anteriores do schema.
MIGRATIONS=(
  "20260716120000_add_home_location_updated_at"
  "20260716140000_add_geo_locations"
  "20260722190000_publish_between_guide_editorial"
)

for migration in "${MIGRATIONS[@]}"; do
  npx prisma migrate resolve --rolled-back "$migration" >/dev/null 2>&1 || true
done

# Todas as migrations acima são idempotentes; o deploy pode ser repetido com
# segurança e o Prisma mantém o histórico correto quando terminarem.
npx prisma migrate deploy
