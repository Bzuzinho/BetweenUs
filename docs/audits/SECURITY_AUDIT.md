# Auditoria de Segurança — Between Us
> Versão: 1.0 | Julho 2026
> ⚠️ TEMPLATE INTERNO — Não substitui pen test externo.

---

## Findings

### SA-01 — emailVerifiedAt definido automaticamente em produção
**Severidade:** CRÍTICA
**Ficheiro:** `server/src/routes/auth.ts`
**Descrição:** `emailVerifiedAt: new Date()` era definido no acto do registo, mesmo em produção. Qualquer email (incluindo falsos) ficava imediatamente "verificado".
**Correcção aplicada:** ✅ Em produção, `emailVerifiedAt: null` e status `PENDING_VERIFICATION`. Em desenvolvimento, auto-verify mantido.

### SA-02 — CONTACT_HASH_SECRET com fallback hardcoded
**Severidade:** CRÍTICA
**Ficheiro:** `server/src/routes/contacts.ts`
**Descrição:** Fallback `'between-us-contact-secret-2026'` tornava o HMAC previsível se a variável não estivesse definida.
**Correcção aplicada:** ✅ Em produção, lança erro se `CONTACT_HASH_SECRET` não estiver definida.

### SA-03 — Upgrade Premium sem Stripe em produção
**Severidade:** CRÍTICA
**Ficheiro:** `server/src/routes/subscriptions.ts`
**Descrição:** Se `STRIPE_SECRET_KEY` não estava definida, qualquer utilizador podia fazer upgrade gratuito.
**Correcção aplicada:** ✅ Em produção sem Stripe → 503. Direct upgrade apenas em dev/test.

### SA-04 — Sem endpoint de eliminação de conta (RGPD)
**Severidade:** ALTA (legal)
**Ficheiro:** `server/src/routes/auth.ts`
**Descrição:** Ausência de `DELETE /api/auth/account` violava RGPD Art. 17.
**Correcção aplicada:** ✅ Endpoint implementado com confirmação por password, soft-delete e revogação de sessões.

### SA-05 — Delete de foto não apagava blurredPath
**Severidade:** ALTA
**Ficheiro:** `server/src/routes/photos.ts`
**Descrição:** Ao eliminar uma foto, apenas `storagePath` era apagado do R2. `blurredPath` permanecia indefinidamente.
**Correcção aplicada:** ✅ Delete apaga ambas as versões.

### SA-06 — ReportReason sem categorias críticas
**Severidade:** ALTA (operacional)
**Ficheiro:** `server/prisma/schema.prisma`, `server/src/routes/reports.ts`
**Descrição:** COERCION, REVENGE_PORN, DOXXING, PROSTITUTION_OR_ESCORT, PAID_SEXUAL_SERVICES não existiam.
**Correcção aplicada:** ✅ Adicionados ao enum e ao handler com prioridades correctas.

### SA-07 — Consentimento não granular no registo
**Severidade:** ALTA (RGPD)
**Ficheiro:** `server/src/routes/auth.ts`
**Descrição:** Apenas `termsAccepted` era exigido. RGPD exige consentimentos separados e explícitos para cada finalidade, especialmente dados sensíveis.
**Correcção aplicada:** ✅ 5 campos obrigatórios + 3 opcionais, todos com IP e userAgent.

### SA-08 — Coordenadas de localização exactas na BD
**Severidade:** MÉDIA
**Ficheiro:** `server/prisma/schema.prisma`, `server/src/routes/profiles.ts`
**Descrição:** locationLat/locationLng guardados em precisão exacta.
**Estado:** 🔲 Pendente — requer migration + coarsen antes de guardar.

### SA-09 — Mensagens com expiresAt não apagadas
**Severidade:** MÉDIA
**Ficheiro:** N/A (job não implementado)
**Descrição:** Campo `expiresAt` existe no modelo Message mas sem job que apague efectivamente.
**Estado:** 🔲 Pendente — requer cron job ou worker.

### SA-10 — URLs de fotos privadas permanentes (R2 público)
**Severidade:** MÉDIA
**Ficheiro:** `server/src/lib/storage.ts`
**Descrição:** Fotos privadas têm URLs permanentes. Revogar acesso não invalida o URL.
**Estado:** 🔲 Pendente — requer signed URLs com expiração ou proxy de acesso.

### SA-11 — Sem rate limiting em upload de fotos
**Severidade:** BAIXA
**Ficheiro:** `server/src/routes/photos.ts`
**Descrição:** Endpoint de upload sem rate limiting dedicado. Pode ser abusado para consumo de storage.
**Estado:** 🔲 Pendente.

### SA-12 — ts-node em produção
**Severidade:** BAIXA (performance)
**Ficheiro:** `server/package.json`
**Descrição:** Produção corre via ts-node (transpile-only). Mais lento e com maior superfície de ataque que uma build compilada.
**Estado:** 🔲 Pendente — considerar `tsc` + `node dist/index.js`.

---

## Itens confirmados como seguros

| Item | Estado | Detalhe |
|---|---|---|
| Helmet | ✅ | Configurado com crossOriginResourcePolicy |
| CORS | ✅ | Restrito a origens known em produção |
| JWT cookies | ✅ | httpOnly, Secure, SameSite=Lax |
| Rate limiting auth | ✅ | 10/15min em login e register |
| bcrypt | ✅ | Cost 12 |
| Zod validation | ✅ | Todos os inputs validados |
| Magic bytes photos | ✅ | Tipo real validado, não apenas mimetype |
| EXIF removal | ✅ | Pipeline sharp real |
| Admin RBAC | ✅ | 6 roles com permissões granulares |
| Audit logs | ✅ | Todas as acções admin auditadas |
| Match membership | ✅ | Não-membros bloqueados em chat/consent |
| Refresh token Redis | ✅ | Hash SHA-256 + rotação |
| Stripe webhook signature | ✅ | Validado em webhooks.ts |
| ConsentCheck membership | ✅ | Validado antes de criar/responder |
| Double Consent membership | ✅ | Valida pertença ao casal |
| Beta gate | ✅ | Validado no register (single source of truth) |
