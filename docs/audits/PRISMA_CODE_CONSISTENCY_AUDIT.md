# Auditoria de Consistência Prisma ↔ Código — Between Us
> Data: Julho 2026 | Auditoria interna

---

## Inconsistências encontradas e corrigidas

### IC-01 — stripeCustomerId vs providerCustomerId ✅ CORRIGIDO
**Severidade:** ALTA — provocava runtime error em produção

**Situação:** `subscriptions.ts` usava `sub?.stripeCustomerId` e `sub.stripeSubscriptionId`,
enquanto o schema Prisma define os campos como `providerCustomerId` e `providerSubscriptionId`.
`webhooks.ts` já usava os nomes correctos do schema.

**Ficheiros afectados:**
- `server/src/routes/subscriptions.ts` — **corrigido**
- `server/src/routes/webhooks.ts` — já estava correcto
- `server/prisma/schema.prisma` — correcto (usa `provider*`)

**Schema (correcto):**
```prisma
model Subscription {
  providerCustomerId      String?
  providerSubscriptionId  String?
  ...
}
```

**Correcção aplicada:** `subscriptions.ts` actualizado para usar `providerCustomerId` e `providerSubscriptionId`.

---

### IC-02 — JWT access token expirava em 7 dias ✅ CORRIGIDO
**Severidade:** ALTA — tokens de curta duração são requisito de segurança

**Situação:** `jwt.ts` usava `JWT_EXPIRES_IN || '7d'`. Um access token de 7 dias é inseguro — se comprometido, dá acesso por uma semana.

**Correcção:** Access token agora expira em `15m` (hardcoded). Refresh token mantém 30 dias.

---

### IC-03 — JWT_SECRET com fallback hardcoded em produção ✅ CORRIGIDO
**Severidade:** CRÍTICA — qualquer pessoa conhecendo o fallback pode forjar tokens

**Situação:** `jwt.ts` usava `process.env.JWT_SECRET || 'dev-secret-change-in-production'`. Em produção sem a variável definida, todos os tokens seriam assinados com o mesmo segredo público.

**Correcção:** `jwt.ts` lança `Error` se `JWT_SECRET` ou `JWT_REFRESH_SECRET` não estiverem definidas em produção.

---

### IC-04 — STRIPE_WEBHOOK_SECRET nullable sem guard ✅ CORRIGIDO
**Severidade:** ALTA — eventos Stripe não verificados podem ser forjados

**Situação:** `webhooks.ts` passava `webhookSecret` (potencialmente `undefined`) ao `stripe.webhooks.constructEvent`. Em produção sem o secret definido, os eventos não eram verificados.

**Correcção:** Em produção, sem `STRIPE_WEBHOOK_SECRET` definida, webhook responde com 500 e recusa todos os eventos.

---

### IC-05 — CONTACT_HASH_SECRET com fallback hardcoded ✅ CORRIGIDO
**Severidade:** ALTA — HMAC com segredo público é reversível

**Situação:** `contacts.ts` usava `|| 'between-us-contact-secret-2026'` como fallback.

**Correcção:** Lança erro em produção se `CONTACT_HASH_SECRET` não estiver definida.

---

### IC-06 — ipAddress e userAgent em UserConsent ✅ CONFIRMADO NO SCHEMA
**Situação a confirmar:** `auth.ts` cria `UserConsent` com `ipAddress` e `userAgent`. Estes campos foram adicionados ao schema em auditoria anterior.

**Estado:** Schema tem os campos. `auth.ts` usa-os correctamente.

---

### IC-07 — removedByAdmin em Message
**Severidade:** BAIXA

**Situação:** `admin.ts` usa `removedByAdmin: true` no update de mensagens. Verificar se o campo existe no schema.

**Estado:** ⚠️ A verificar — se não existir, adicionar ao schema.

---

### IC-08 — reportedUserId em Report
**Situação:** `reports.ts` cria `Report` com `reportedUserId`. Verificar relação no schema.

**Estado:** ✅ Campo `reportedUserId` existe no modelo `Report`.

---

## Campos no schema sem uso aparente no código

| Campo | Modelo | Observação |
|---|---|---|
| `ageVerifiedAt` | User | Campo existe mas nunca é definido após verificação de selfie |
| `sortOrder` em ProfileBoundary | ProfileBoundary | Campo não usado em queries |
| `ELITE` em SubscriptionPlan | Enum | Plano não implementado em subscriptions.ts |
| `PASS_RECORDED` em LikeResult | matchService.ts | Tipo definido mas não retornado |

---

## Comandos para aplicar após estas correcções

```bash
cd server
npx prisma generate
npx prisma db push --accept-data-loss  # apenas em dev/staging
npm test
```

Em produção, usar `prisma migrate deploy` em vez de `db push`.
