# Between Us

**Adult connections. Private by design.**

Plataforma privada para adultos 18+ centrada em privacidade, consentimento e compatibilidade.
Serve casais, solteiros, relações abertas e pessoas poliamorosas que procuram ligações adultas consensuais e discretas.

> ⚠️ Esta plataforma é **exclusivamente para adultos (18+)**. Consulta as [Directrizes da Comunidade](docs/legal/COMMUNITY_GUIDELINES.md) para perceber o que é e não é permitido.

---

## Estado actual

| Componente | Estado |
|---|---|
| Backend Node.js/Express/TypeScript | ✅ Em produção (Railway) |
| Base de dados PostgreSQL (Prisma) | ✅ Em produção (Railway volume) |
| Redis (refresh tokens) | ✅ Em produção (Railway) |
| Cloudflare R2 (fotos) | ✅ Configurado |
| Stripe (pagamentos) | ⚠️ Modo teste — requer revisão legal antes de activar live |
| Socket.io (chat em tempo real) | ✅ Activo |
| Admin panel | ✅ Activo (RBAC com 6 roles) |
| Sistema de reports | ✅ 14 categorias + prioridade automática |
| Fotos privadas (Soft Reveal) | ✅ EXIF removido, versão blurred, moderação em produção |
| Consentimento por fase (ConsentCheck) | ✅ 7 fases |
| Safety checkins | ✅ Activo |
| Beta gate | ✅ Via BETA_CLOSED=true |
| Testes automatizados | ✅ 39+ testes, GitHub Actions CI |
| Email verification | ❌ SMTP por configurar (Resend) |
| Stripe live | ❌ Requer revisão legal |

---

## Arquitectura

```
Frontend (React + Vite + PWA)
        ↕ HTTPS
Backend (Node.js + Express + TypeScript)
        ↕ Prisma ORM
PostgreSQL (Railway)    Redis (Railway)
        ↕
Cloudflare R2 (fotos)   Stripe (pagamentos)
```

**Deploy:** Railway — `fearless-stillness` (backend) + `BetweenUs` (frontend)

---

## Funcionalidades implementadas

- ✅ Registo com consentimento granular (5 obrigatórios + 3 opcionais) e validação de idade
- ✅ Auth com JWT (15min) + refresh token (30 dias) em cookies httpOnly
- ✅ Perfis individuais e de casal com onboarding progressivo (10 passos)
- ✅ Between Score — compatibilidade por intenções, limites e contexto
- ✅ Double Consent Match — casais exigem aprovação de ambos os parceiros
- ✅ Soft Reveal — 4 níveis de visibilidade de fotos
- ✅ Safe Exit — 6 opções de saída segura de conversas
- ✅ Modo Acordo — acordo antes do chat (5 perguntas)
- ✅ Travel Mode — procurar matches numa cidade antes de chegar
- ✅ Contact blocking (HMAC-SHA256 — dados originais nunca guardados)
- ✅ Admin panel com 9 tabs e audit log obrigatório
- ✅ Risk score automático por utilizador
- ✅ Reports com 14 categorias e prioridade automática
- ✅ Verificação de identidade (selfie → admin aprova)
- ✅ Safety checkins para encontros presenciais
- ✅ RGPD: eliminação de conta + exportação de dados
- ✅ Documentos legais em /docs/legal/

## Funcionalidades parciais

- ⚠️ Email verification — código implementado, falta configurar Resend/SMTP
- ⚠️ Localização — coarsening recomendado (ver docs/product/LOCATION_PRIVACY_REVIEW.md)
- ⚠️ Mensagens temporárias — job de limpeza em /server/src/jobs/ (não corre automaticamente)
- ⚠️ Fotos privadas — URLs permanentes públicas (signed URLs recomendados)

---

## Segurança e privacidade

- Passwords: bcrypt cost 12
- Tokens: JWT httpOnly + Secure + SameSite=Lax
- EXIF: removido em todos os uploads de foto
- HMAC: contactos nunca guardados em claro
- Admin: acesso a conversas exige motivo (auditado)
- Rate limiting: auth (10/15min), uploads (10/15min)
- Zod: validação de todos os inputs

---

## Legal & Safety First

> ⚠️ Todos os documentos em /docs/legal/ são **templates internos** e requerem revisão jurídica profissional antes do lançamento público.

- [Termos de Utilização](docs/legal/TERMS_OF_SERVICE.md)
- [Política de Privacidade](docs/legal/PRIVACY_POLICY.md)
- [Directrizes da Comunidade](docs/legal/COMMUNITY_GUIDELINES.md)
- [Política de Consentimento](docs/legal/CONSENT_POLICY.md)
- [Política de Retenção de Dados](docs/legal/DATA_RETENTION_POLICY.md)
- [Política de Pagamentos](docs/legal/PAYMENTS_AND_REFUNDS_POLICY.md)
- [Plano de Resposta a Incidentes](docs/legal/INCIDENT_RESPONSE_PLAN.md)
- [Checklist Pré-Lançamento](docs/legal/PRE_LAUNCH_COMPLIANCE_CHECKLIST.md)

---

## O que é proibido na plataforma

- Menores de 18 anos
- Prostituição, escort ou serviços sexuais pagos
- Pagamentos entre utilizadores
- Venda de conteúdo pornográfico
- Revenge porn ou partilha de imagens íntimas sem consentimento
- Doxxing ou exposição de dados de terceiros
- Assédio ou coerção
- Scam ou fraude
- Perfis falsos

---

## Como correr localmente

```bash
# Clonar
git clone https://github.com/Bzuzinho/BetweenUs.git
cd BetweenUs

# Instalar dependências
cd server && npm install

# Configurar variáveis de ambiente
cp .env.example .env  # editar com os valores reais

# Base de dados
npx prisma generate
npx prisma db push

# Correr testes
npm test

# Servidor
npm run dev
```

---

## Variáveis de ambiente obrigatórias

Ver secção completa abaixo ou em [docs/product/PRODUCTION_READINESS_CHECKLIST.md].

| Variável | Obrigatória | Descrição |
|---|---|---|
| DATABASE_URL | ✅ Prod | PostgreSQL connection string |
| REDIS_URL | ✅ Prod | Redis connection string |
| JWT_SECRET | ✅ Prod | Secret para access tokens |
| JWT_REFRESH_SECRET | ✅ Prod | Secret para refresh tokens |
| CLIENT_URL | ✅ Prod | URL do frontend |
| CONTACT_HASH_SECRET | ✅ Prod | Secret HMAC para contactos |
| NODE_ENV | ✅ Prod | Deve ser `production` |
| STORAGE_ENDPOINT | ✅ Prod | R2/S3 endpoint |
| STORAGE_ACCESS_KEY | ✅ Prod | R2/S3 access key |
| STORAGE_SECRET_KEY | ✅ Prod | R2/S3 secret key |
| STORAGE_BUCKET | ✅ Prod | Nome do bucket |
| STORAGE_PUBLIC_URL | ✅ Prod | URL pública do bucket |
| STRIPE_SECRET_KEY | Se Stripe activo | Stripe secret key |
| STRIPE_WEBHOOK_SECRET | Se Stripe activo | Stripe webhook secret |
| STRIPE_PRICE_PREMIUM | Se Stripe activo | Price ID Premium |
| STRIPE_PRICE_COUPLE | Se Stripe activo | Price ID Casal Premium |
| SMTP_HOST | Para email | Host SMTP (Resend) |
| SMTP_PASS | Para email | Password SMTP |
| EMAIL_FROM | Para email | Email de origem |
| BETA_CLOSED | Opcional | `true` para exigir convite |
| ADMIN_EMAILS | Opcional | Emails admin (fallback) |

---

## Checklist antes de produção

Ver [docs/legal/PRE_LAUNCH_COMPLIANCE_CHECKLIST.md] para lista completa.

Itens críticos:
- [ ] Revisão jurídica dos documentos legais
- [ ] Email verification configurada (Resend)
- [ ] Stripe revisado por advogado antes de activar live
- [ ] Equipa de moderação activa
- [ ] Domínio próprio configurado
- [ ] Pen test externo recomendado
