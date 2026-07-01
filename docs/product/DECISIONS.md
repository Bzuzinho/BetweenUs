# Decisões Técnicas e de Produto — Between Us
> Registo de decisões relevantes. Cada entrada deve ser preenchida quando uma decisão é tomada.

---

## Formato

```
### DEC-NNN — Título
- **Data:** YYYY-MM-DD
- **Decisão:** O que foi decidido
- **Contexto:** Por que razão esta decisão foi necessária
- **Alternativas consideradas:** O que mais foi equacionado
- **Impacto técnico:** Ficheiros e sistemas afectados
- **Impacto legal/RGPD:** Implicações para privacidade, consentimento, retenção
- **Ficheiros afectados:** Lista de ficheiros alterados
- **Próxima revisão:** Data ou condição para rever esta decisão
```

---

### DEC-001 — Usar providerCustomerId/providerSubscriptionId em vez de stripeCustomerId/stripeSubscriptionId

- **Data:** 2026-07
- **Decisão:** Campos de subscrição nomeados com prefixo `provider` em vez de `stripe` para manter abstracção.
- **Contexto:** Permite eventualmente mudar de processador de pagamento sem alterar o schema.
- **Alternativas consideradas:** Campos com nome `stripe*` directamente.
- **Impacto técnico:** `subscriptions.ts`, `webhooks.ts`, `schema.prisma` devem usar nomes coerentes.
- **Impacto legal/RGPD:** Sem impacto directo.
- **Ficheiros afectados:** `server/prisma/schema.prisma`, `server/src/routes/subscriptions.ts`, `server/src/routes/webhooks.ts`
- **Próxima revisão:** Se mudar processador de pagamento.

---

### DEC-002 — Access token expira em 15 minutos

- **Data:** 2026-07
- **Decisão:** Access token JWT tem vida útil de 15 minutos. Refresh token tem 30 dias.
- **Contexto:** Tokens de longa duração são um risco se comprometidos. 7 dias (valor anterior) era inseguro.
- **Alternativas consideradas:** 1 hora (equilibrado), 24 horas (menos seguro).
- **Impacto técnico:** `jwt.ts`. O frontend faz refresh automático via `/api/auth/refresh`.
- **Impacto legal/RGPD:** Melhora segurança das sessões. Alinhado com boas práticas RGPD.
- **Ficheiros afectados:** `server/src/utils/jwt.ts`, `client/src/lib/api.js`
- **Próxima revisão:** Se houver problemas de UX com sessões a expirar.

---

### DEC-003 — Coordenadas de localização coarsened a 1 casa decimal (≈±11km)

- **Data:** 2026-07
- **Decisão:** `locationLat`/`locationLng` são arredondados a 1 casa decimal antes de serem guardados.
- **Contexto:** Precisão exacta é desnecessária para discovery e representa risco de privacidade.
- **Alternativas consideradas:** 0 casas (±111km — impreciso demais), 2 casas (±1.1km — ainda revela bairro).
- **Impacto técnico:** `profiles.ts` aplica `coarsenCoordinate()` antes de guardar.
- **Impacto legal/RGPD:** Melhora minimização de dados (RGPD Art. 5.º). Coordenadas exactas nunca guardadas.
- **Ficheiros afectados:** `server/src/routes/profiles.ts`, `server/src/utils/location.ts`
- **Próxima revisão:** Se discovery precisar de maior precisão geográfica.

---

### DEC-004 — emailVerifiedAt não é definido automaticamente em produção

- **Data:** 2026-07
- **Decisão:** Em produção, utilizadores nascem com status `PENDING_VERIFICATION` e `emailVerifiedAt: null`.
- **Contexto:** Auto-verificação permitia contas com emails falsos. Violava princípios de integridade.
- **Alternativas consideradas:** Verificação opcional, verificação por SMS.
- **Impacto técnico:** `auth.ts`, `verifications.ts` (novos endpoints de email verify).
- **Impacto legal/RGPD:** Alinha com Art. 5.º RGPD (exactidão) e reduz risco de contas falsas.
- **Ficheiros afectados:** `server/src/routes/auth.ts`, `server/src/routes/verifications.ts`
- **Próxima revisão:** Quando Resend/SMTP estiver configurado e emails reais forem enviados.

---

### DEC-005 — Consentimento granular com 5 campos obrigatórios + 3 opcionais

- **Data:** 2026-07
- **Decisão:** Registo exige: ageConfirmed, termsAccepted, privacyAccepted, sensitiveDataAccepted, communityGuidelinesAccepted. Opcionais: locationConsent, marketingConsent, contactHashingConsent.
- **Contexto:** RGPD exige consentimentos separados e explícitos para finalidades distintas. Campo único `termsAccepted` era insuficiente.
- **Alternativas consideradas:** Checkboxes agrupados, consentimento inline.
- **Impacto técnico:** `auth.ts` schema Zod, `UserConsent` no Prisma, frontend RegisterPage.
- **Impacto legal/RGPD:** Alinha com RGPD Art. 7.º e EDPB guidelines. Necessita revisão jurídica.
- **Ficheiros afectados:** `server/src/routes/auth.ts`, `server/prisma/schema.prisma`, `client/src/pages/RegisterPage.jsx`
- **Próxima revisão:** Após revisão jurídica dos documentos legais.

---

### DEC-006 — Token de verificação de email guardado em Redis (não em BD)

- **Data:** 2026-07
- **Decisão:** Token de verificação de email é guardado apenas em Redis com TTL de 1 hora. Hash SHA-256 do token, não o token em claro.
- **Contexto:** Tokens de verificação têm duração curta. Redis com TTL é mais eficiente e seguro que tabela de BD com cleanup manual.
- **Alternativas consideradas:** Tabela `EmailVerificationToken` em PostgreSQL.
- **Impacto técnico:** `verifications.ts`. Requer Redis activo.
- **Impacto legal/RGPD:** Token expira automaticamente — minimização de dados.
- **Ficheiros afectados:** `server/src/routes/verifications.ts`
- **Próxima revisão:** Se Redis for removido da stack.
