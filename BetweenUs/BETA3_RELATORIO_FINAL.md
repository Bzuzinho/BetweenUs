# BETA.3 — Production Safety & Closed Beta Gate
## Relatório de Entrega Final

Branch: `beta-3-safety-and-closed-beta-gate` (commitada localmente nesta sessão — **não** empurrada para o GitHub, ver secção "Como aplicar" no fim)

---

## 1. Resumo

Auditados os 11 pontos pedidos contra o estado real do `main` (clonado de `Bzuzinho/BetweenUs`), e implementadas as 8 tarefas. Metodologia: nada foi corrigido sem primeiro confirmar a causa raiz por leitura de código — vários dos "bugs" descritos no pedido já estavam parcialmente corrigidos ou já estavam bem documentados no próprio código como pendentes; o trabalho concentrou-se em fechar exatamente os gaps confirmados, não em reescrever o que já estava correto.

Duas decisões foram deixadas para ti antes de começar a codificar (via pergunta direta), porque são decisões de produto/operação, não técnicas: estratégia de migração (escolhida: **Opção B — baseline + `prisma migrate deploy`**) e âmbito de execução (escolhido: **tudo numa sessão**).

**Limitação de ambiente importante**: o sandbox onde este trabalho foi preparado bloqueia acesso de rede a `binaries.prisma.sh` (confirmado: `403 blocked-by-allowlist`). Isto significa que `prisma generate`, `prisma validate`, `prisma db push` e `prisma migrate diff` não correm aqui — incluindo a suite de testes (`npm test`), cujo `globalSetup.ts` corre `prisma db push` contra uma base de dados de teste. O GitHub Actions do projeto já prova ter esse acesso (`.github/workflows/test.yml` corre `prisma generate`/`validate`/`db push` com sucesso hoje). Validado nesta sessão o que era possível: `tsc --noEmit` do backend (PASS, exit 0) e `vite build` do frontend (PASS). Ver secção 10 para detalhe exato.

---

## 2. Riscos corrigidos

| # | Risco | Ficheiro(s) | Correção |
|---|---|---|---|
| 1 | Start command corria `prisma db push --accept-data-loss` em **todo** o boot — qualquer diff destrutivo futuro seria aplicado automaticamente contra dados reais | `server/start.sh`, `server/package.json`, `server/railway.json` | Start command já não corre nenhum comando Prisma; `db:deploy` (`migrate deploy`) corre como Railway `preDeployCommand`, separado do start |
| 2 | `/health/email` verificava só as vars de fallback SMTP (Gmail), reportava "misconfigured" com SendGrid corretamente configurado, e devolvia `SMTP_HOST`, `SMTP_USER`, `EMAIL_FROM`, `CLIENT_URL` e 8 caracteres de `SMTP_PASS` sem autenticação | `server/src/index.ts` | Deteta o provider real (SendGrid vs SMTP), sem ligação ao vivo, devolve só booleanos |
| 3 | Registo: consentimentos RGPD (`ageConfirmed`/`privacyAccepted`/`sensitiveDataAccepted`) só eram enviados pelo frontend como um checkbox combinado com Termos — os três campos nunca chegavam ao backend, que os aceitava por omissão | `client/src/pages/RegisterPage.jsx`, `server/src/routes/auth.ts` | 4 checkboxes independentes, nenhum pré-selecionado; backend exige `=== true` explícito, já não aceita ausência do campo |
| 4 | Active Profile Context: `discovery.ts` (`like`/`pass`/`block`/`report`) e `matches.ts` (`accept`/`reject`) resolviam "o meu perfil" via `Profile.userId` direto em vez de `resolveMyProfileId` — um membro não-criador de casal/grupo levava 404, e trocar de perfil ativo não mudava com que perfil se gostava/rejeitava | `server/src/routes/discovery.ts`, `server/src/routes/matches.ts` | Substituído por `resolveMyProfileId` (o mesmo helper que `GET /api/discovery` já usava corretamente) |
| 5 | `privacy.ts` (`GET`/`PUT /api/privacy`) tinha o mesmo bug — definições de privacidade eram sempre lidas/escritas no perfil individual, nunca no perfil ativo | `server/src/routes/privacy.ts` | Idem |
| 6 | `EligibilityService` era só reporting (usado pelo admin), nunca um gate de aplicação — `forUser()`'s `canLike`/`canMatch` já estava documentado como incorreto para membros de perfil partilhado | `server/src/lib/eligibilityService.ts` | Novo `forProfileContext(profileId, userId)`, wired como gate em `discovery.ts`'s `/:id/like` e `/:id/pass` |

## 3. Riscos pendentes (não bloqueantes, documentados)

- **Baseline migration não gerada contra a BD real.** O script que a gera (`npm run migrate:baseline`) foi escrito e testado quanto à sintaxe, mas não pôde correr aqui (sem rede para `binaries.prisma.sh`). Ver secção 4 e `docs/product/CLOSED_BETA_GATE.md` secção 3 para os passos manuais exatos — **tens de correr isto antes do próximo deploy que dependa de `db:deploy`**, ou o deploy falha (com segurança — recusa, não apaga nada — mas fica bloqueado).
- **`forProfileContext` não propagado a `matches.ts`/`rooms.ts`/`photos.ts`.** Esses ficheiros já resolvem o perfil ativo corretamente (não têm o bug #4/#5), pelo que adicionar o gate ali é reforço defensivo, não correção de bug — fica para o sprint seguinte, tal como o próprio `eligibilityService.ts` já documentava para o âmbito anterior.
- **`npm test` não corrido nesta sessão** — ver secção 10. GitHub Actions já prova que corre; precisa de ser corrido lá (ou localmente) antes de merge, não foi pulado por escolha, foi bloqueado pelo ambiente.
- **Revisão jurídica dos 4 textos de consentimento** (Termos/Privacidade/Dados Sensíveis) ligados nos novos checkboxes — o conteúdo em si (`LegalPage.jsx`) não foi alterado nesta sessão, só a UI de captação de consentimento.

---

## 4. Start command final

**Antes:**
```
npx prisma db push --accept-data-loss && node -r ts-node/register/transpile-only src/index.ts
```

**Agora** (`server/start.sh`, chamado por `railway.json`):
```bash
set -e
echo "=== Between Us API v2.6.0 ==="
echo "--- Starting server ---"
exec node -r ts-node/register/transpile-only src/index.ts
```

`prisma generate` passou para `postinstall` no `package.json` (corre uma vez no build, não em cada boot). O reseed inline de Intenções que existia dentro do `start.sh` foi removido — é redundante com `prisma/seed.ts`, que já faz o mesmo via `upsert` idempotente.

Novos scripts em `server/package.json`:
```
"db:deploy": "npx prisma migrate deploy"       // automático — Railway preDeployCommand
"db:push:safe": "npx prisma db push"           // manual, sem --accept-data-loss, só local/staging
"migrate:baseline": "bash scripts/generate-baseline-migration.sh"
"beta:gate": "ts-node --transpile-only src/scripts/betaGate.ts"
```

`server/railway.json` ganhou `"preDeployCommand": ["npm run db:deploy"]` — corre como fase separada do Railway, antes da nova instância receber tráfego, nunca dentro do processo de arranque em si.

---

## 5. Migration/deploy strategy — Opção B (escolhida)

Baseline + `prisma migrate deploy`, conforme decidido. Passos:

1. `server/prisma/migrations/migration_lock.toml` criado (boilerplate padrão, `provider = "postgresql"`).
2. `server/scripts/generate-baseline-migration.sh` (`npm run migrate:baseline`) escrito — gera a migração baseline via `prisma migrate diff --from-empty --to-schema-datamodel` (diff puro de schema, não toca em nenhuma base de dados).
3. **Pendente, ação manual tua**: correr o script num ambiente com rede para `binaries.prisma.sh` (a tua máquina, ou o GitHub Actions existente), rever o SQL gerado, fazer commit, e depois `npx prisma migrate resolve --applied <nome>` contra a BD de produção real — **depois de um backup**. Passo a passo completo, com o porquê de cada passo, em `docs/product/CLOSED_BETA_GATE.md` secção 3.

Não foi executada nenhuma migração contra dados reais nesta sessão — nem podia ter sido, este ambiente não tem rede para os binários do Prisma nem acesso à tua base de dados de produção.

---

## 6. Health endpoints final

- `GET /health` — inalterado, genérico, sem informação sensível.
- `GET /health/email` — reescrito. Deteta `SENDGRID_API_KEY` (provider primário real, confirmado em `lib/email.ts`) vs `SMTP_HOST`+`SMTP_USER`+`SMTP_PASS` (fallback Gmail). Sem ligação ao vivo. Resposta:
  ```json
  { "status": "configured", "provider": "sendgrid", "checks": { "fromConfigured": true, "credentialsConfigured": true } }
  ```
- `GET /health/recommendations` — auditado, já seguro (só flags/config + boolean de reachability), inalterado.

---

## 7. Register consent validation

`server/src/routes/auth.ts`'s `registerSchema`:
```ts
ageConfirmed: z.boolean({ required_error: '...' }).refine(v => v === true, '...'),
privacyAccepted: z.boolean({ required_error: '...' }).refine(v => v === true, '...'),
sensitiveDataAccepted: z.boolean({ required_error: '...' }).refine(v => v === true, '...'),
```
(antes: `.optional().refine(v => v !== false, ...)` — ausência do campo passava).

`RegisterPage.jsx`: 4 checkboxes (`ConsentCheckbox`, componente novo extraído no mesmo ficheiro), nenhum pré-selecionado, cada um controlando o seu próprio campo (`ageConfirmed`, `termsAccepted`, `privacyAccepted`, `sensitiveDataAccepted`), todos enviados explicitamente em `register(...)`.

**Testes**: `server/__tests__/auth.test.ts` já enviava os três campos como `true` no payload `valid` base (era o próprio backend, não os testes, que estava desalinhado com o frontend) — **não foi preciso alterar nenhum teste**.

---

## 8. ActiveProfileContext — matriz de auditoria

Classificação pedida (A=correto, B=incorreto/corrigido, C=admin/read-only, D=legacy):

| Rota/ficheiro | Classe | Nota |
|---|---|---|
| `discovery.ts` `GET /` | A | Já usava `resolveMyProfileId` (corrigido em BETA.2, comentário 6.6 no código) |
| `discovery.ts` `POST /:id/like` | **B → corrigido** | Usava `user.findUnique(...).profile` direto |
| `discovery.ts` `POST /:id/pass` | **B → corrigido** | Idem |
| `discovery.ts` `POST /:id/block` | **B → corrigido** | Idem |
| `discovery.ts` `POST /:id/report` (signal de recomendação) | **B → corrigido** | Idem (o `Report` em si já usava `reporterUserId`, correto — só o signal pós-report estava errado) |
| `matches.ts` `GET /`, mensagens | A | Já usava `getUserProfileId` (= `resolveMyProfileId`) |
| `matches.ts` `POST /accept/:fromProfileId` | **B → corrigido** | Usava `user.findUnique(...).profile` direto |
| `matches.ts` `POST /reject/:fromProfileId` | **B → corrigido** | Idem |
| `privacy.ts` `GET /` | **B → corrigido** | `profile.findUnique({where:{userId}})` direto |
| `privacy.ts` `PUT /` | **B → corrigido** | Idem |
| `privacy.ts` `POST /block/:profileId` | A | Já usava `resolveMyProfileId` (comentário 7.11) |
| `photos.ts` (todas as rotas) | A | Já usava `resolveMyProfileId`/`getActiveMembers` |
| `travel.ts` (todas as rotas) | A | Idem |
| `rooms.ts` (todas as rotas) | A | Idem |
| `reports.ts` `POST /` | A | Já usava `resolveMyProfileId` para reporter e reported |
| `profiles.ts` `GET/PUT /me`, `POST /`, `PUT /:id` | A | Por design — estas rotas SÃO sobre o perfil individual/gestão direta, não sobre "agir como" |
| `auth.ts` `GET /me` | A | Implementação de referência — usa `activeProfileContextService` diretamente |
| `admin.ts` | C | Admin/read-only, fora de âmbito |
| `recommendations.ts` (config de pesos) | C | Admin-only |

---

## 9. EligibilityService — alterações

Novo `forProfileContext(profileId: string, userId: string): Promise<ProfileContextEligibility>` em `server/src/lib/eligibilityService.ts`:
- Confirma que `userId` é dono (Individual Profile) ou membro ACCEPTED (via `isActiveMember`) do `profileId` dado — nunca confia cegamente no `profileId`.
- Devolve `canUseAsContext`, `canAppearInDiscovery`, `canLike`, `canMatch`, `canChat`, `canRequestPrivatePhotos`, `reasons`.
- Semântica idêntica ao `forUser()` existente onde já não havia ambiguidade (ex: `canLike` não exige perfil `APPROVED`, só `canAppearInDiscovery` exige) — não inventei regras mais restritivas.

Wired em `discovery.ts`'s `POST /:id/like` e `POST /:id/pass` como gate (`403` se `!eligibility.canLike`). Não muda comportamento para nenhum utilizador legítimo (`resolveMyProfileId` já garantia a mesma posse/pertença antes de chegar aqui) — é reforço defensivo centralizado, não uma nova restrição funcional.

---

## 10. Resultado da validação (nesta sessão)

| Comando | Resultado | Nota |
|---|---|---|
| `cd client && npm run build` | ✅ PASS | `vite build`, 153 módulos, sem erros (só avisos pré-existentes de `minHeight` duplicado, não relacionados com esta sessão) |
| `cd server && npx tsc --noEmit` | ✅ PASS (exit 0) | Ver ressalva abaixo |
| `npm test` | ❌ Bloqueado pelo ambiente | `globalSetup.ts` corre `prisma db push --force-reset --accept-data-loss`; falha em `binaries.prisma.sh` (`403 Forbidden`, confirmado via `curl`) antes de sequer tentar ligar a uma BD |
| `npx prisma validate` / `generate` | ❌ Bloqueado pelo ambiente | Mesma causa |
| `npm run beta:gate` | 13 PASS / 2 WARN / 2 FAIL | Os 2 FAIL são `prisma validate`/`generate`, mesma causa. Os 2 WARN são esperados (sem `prisma/migrations/` ainda; `BETA_SEED_ENABLED` não ativo) |

**Ressalva sobre o `tsc --noEmit` PASS**: o `@prisma/client` instalado neste sandbox nunca foi gerado com o schema real (mesma causa de rede) — é um stub (`export declare const PrismaClient: any`), pelo que este `tsc` não valida nomes de campos/modelos específicos do Prisma, só a estrutura geral do TypeScript. Verifiquei manualmente os campos usados nos meus patches (`profile.userId`, `profile.privacySettings`, `isActiveMember(profileId, userId)`) contra código já existente e comprovado a funcionar no mesmo ficheiro. O `tsc --noEmit` real (contra o cliente gerado) só corre no GitHub Actions ou localmente.

**Achado durante a validação**: o próprio `npm run beta:gate` tinha 2 falsos positivos na primeira corrida — as suas checks de "start command sem db push" e "/health/email seguro" estavam a apanhar as MINHAS PRÓPRIAS notas explicativas em comentários (que mencionam "db push"/"SMTP_PASS" em prosa, a descrever o que foi removido), não código real. Corrigido para ignorar linhas de comentário antes de aplicar os padrões — ficou documentado no próprio código do script.

---

## 11. Recomendação final

### **B — BLOCK CLOSED BETA — ainda falta um passo manual**

Não é um bloqueio de código — é a baseline migration por gerar e aplicar contra a BD real (secção 3/5), que só pode ser feita fora deste ambiente. Ordem recomendada antes de abrir a beta a utilizadores reais:

1. Corre `npm test` e `npm run typecheck` localmente ou via GitHub Actions neste branch — confirma que os meus patches não quebram nada que este ambiente não conseguiu verificar.
2. Backup da BD de produção.
3. `npm run migrate:baseline` → revê o SQL → commit → `prisma migrate resolve --applied <nome>` contra produção (`docs/product/CLOSED_BETA_GATE.md` secção 3, passo a passo).
4. `npm run beta:gate` com as variáveis de ambiente reais do Railway — confirma 0 FAIL.
5. Deploy.

Depois do passo 3, a recomendação passa a **A — READY FOR CLOSED BETA USERS** no que toca aos 8 itens deste pedido.

---

## Como aplicar estas alterações

O ambiente onde este trabalho foi feito não tem credenciais para fazer `git push` para `Bzuzinho/BetweenUs` (clone público, só leitura). As alterações estão commitadas localmente no branch `beta-3-safety-and-closed-beta-gate`, entregues de duas formas (ambos os ficheiros nesta pasta):

- **`beta-3-safety-and-closed-beta-gate.bundle`** — git bundle, preserva o commit e a mensagem completa. Na tua máquina, dentro do clone do repositório:
  ```
  git fetch <caminho-do-bundle> beta-3-safety-and-closed-beta-gate:beta-3-safety-and-closed-beta-gate
  git checkout beta-3-safety-and-closed-beta-gate
  ```
- **`BETA3_CHANGES.patch`** — patch de texto simples (`git format-patch`), alternativa se preferires `git am BETA3_CHANGES.patch`.

12 ficheiros alterados/criados, 752 inserções, 145 remoções.
