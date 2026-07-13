# Closed Beta Gate — Between Us
> Versão: 1.0 | BETA.3 | Julho 2026
> Ponto único de verificação antes de abrir (ou continuar a operar) a beta fechada com utilizadores reais.

---

## 1. Como usar este documento

Este documento substitui, para efeitos de produção com dados reais, o `BETA_PRIVATE_READINESS_CHECKLIST.md` (mantido para o histórico do beta técnico/QA). A diferença central: BETA.3 assume que a base de dados já tem ou vai ter **dados reais de utilizadores** — todas as recomendações partem daí, não de um ambiente descartável.

Antes de cada deploy que altera `schema.prisma`, ou antes de abrir a beta a um novo lote de convidados, corre:

```
cd server
npm run beta:gate
```

O script (`server/src/scripts/betaGate.ts`) verifica ambiente, schema, tipos e configuração — nunca imprime valores de segredos, só presença/ausência. Ver secção 7.

---

## 2. Start command — o que mudou e porquê

**Antes (BETA.2 e anteriores):**
```
npx prisma db push --accept-data-loss && node -r ts-node/register/transpile-only src/index.ts
```
Isto corria em **todo o boot** (todo o deploy, todo o restart do Railway). `db push` calcula um diff ao vivo entre `schema.prisma` e a base de dados e aplica-o imediatamente; com `--accept-data-loss`, qualquer diff destrutivo (coluna removida, tipo alterado, coluna estreitada) resultante de uma edição futura ao schema seria aplicado **automaticamente**, sem revisão, contra uma base de dados com dados reais. Isto já não é aceitável a partir do momento em que existem utilizadores reais.

**Agora (BETA.3):**
```
node -r ts-node/register/transpile-only src/index.ts
```
(`server/start.sh`, chamado por `railway.json`'s `startCommand`). Não corre nenhum comando Prisma. `prisma generate` passou para `postinstall` (corre uma vez no build, não em cada boot).

Aplicação de schema é feita por `npm run db:deploy` (`prisma migrate deploy`), correndo como **Railway Pre-Deploy Command** (`server/railway.json`'s `preDeployCommand`) — uma fase separada, antes da nova instância receber tráfego, nunca dentro do start command em si (que pode correr múltiplas vezes: restarts, scale-out).

| Script | Comando | Quando correr |
|---|---|---|
| `npm start` | `node -r ts-node/register/transpile-only src/index.ts` | Automático — Railway startCommand |
| `npm run db:deploy` | `prisma migrate deploy` | Automático — Railway preDeployCommand |
| `npm run db:push:safe` | `prisma db push` (sem `--accept-data-loss`) | **Manual**, só localmente/staging, nunca em produção com dados reais sem backup prévio |
| `npm run migrate:baseline` | gera a migração baseline (ver secção 3) | **Manual**, uma vez |

---

## 3. Estratégia de migração — baseline cutover

O projeto nunca usou `prisma migrate` — não existe `prisma/migrations/`. `npm run db:deploy` não tem nada para aplicar até existir uma migração baseline que descreva o schema **tal como já existe** na base de dados de produção (aplicado historicamente via `db push`).

Foi criada uma migração baseline vazia de estrutura (`prisma/migrations/migration_lock.toml`) e um gerador (`server/scripts/generate-baseline-migration.sh` / `npm run migrate:baseline`). **Isto não foi corrido contra uma base de dados real** — o ambiente onde este trabalho foi preparado não tem acesso de rede aos binários de motor do Prisma (`binaries.prisma.sh`), pelo que o ficheiro `migration.sql` da baseline tem de ser gerado num ambiente com esse acesso (uma máquina de desenvolvimento normal, ou o GitHub Actions existente — já provado que consegue alcançar `binaries.prisma.sh`, ver `.github/workflows/test.yml`).

### Passo a passo (fazer uma vez, com atenção)

1. **Backup primeiro.** Railway → Database → snapshot manual, ou `pg_dump` completo. Não avançar sem isto.
2. Numa máquina/CI com rede para `binaries.prisma.sh`:
   ```
   cd server
   npm install
   npm run migrate:baseline
   ```
   Isto gera `prisma/migrations/<timestamp>_baseline/migration.sql` a partir do `schema.prisma` atual (diff a partir de uma base de dados vazia — não toca em nenhuma base de dados real).
3. **Revê o SQL gerado.** Deve conter apenas `CREATE TABLE`/`CREATE TYPE`/`CREATE INDEX` para tudo o que já está em `schema.prisma` — nada de `DROP`/`ALTER ... DROP COLUMN`.
4. Commit `prisma/migrations/` ao repositório.
5. **Contra a base de dados de PRODUÇÃO real** (via Railway CLI/console, depois do backup do passo 1):
   ```
   npx prisma migrate resolve --applied <timestamp>_baseline
   ```
   Isto marca a migração como já aplicada, sem executar o SQL (as tabelas já existem, criadas historicamente via `db push`) — é o passo que evita que `migrate deploy` tente `CREATE TABLE` em tabelas que já existem e falhe o deploy.
6. Só depois do passo 5 ter sucesso, o próximo deploy pode confiar em `preDeployCommand` (`npm run db:deploy`) para aplicar migrações futuras.

**Se o passo 5 for saltado**: o próximo `migrate deploy` falha ao tentar recriar tabelas existentes. É um falhanço seguro (recusa, não apaga nada) mas bloqueia o deploy até ser resolvido — não é um cenário de perda de dados, só de indisponibilidade até correção.

### Alternativa (não recomendada) — Opção A

Continuar com `db push` manual (`npm run db:push:safe`, sem `--accept-data-loss`) durante mais algum tempo, sempre com backup imediatamente antes e sempre correndo manualmente (nunca automatizado no start/deploy). Prisma recusa aplicar um diff destrutivo sem `--accept-data-loss`, o que dá uma rede de segurança — mas não há histórico de migrações, não há forma de saber exatamente o que mudou entre deploys, e o hábito de "correr manualmente antes de cada deploy" depende inteiramente de disciplina humana. Escolhida a Opção B (baseline + `migrate deploy`) para esta fase.

---

## 4. Variáveis de ambiente obrigatórias

Nenhum valor real deve aparecer em logs, respostas HTTP, ou ser colado em qualquer sítio fora do Railway → Variables.

| Variável | Obrigatória | Efeito se ausente |
|---|---|---|
| `DATABASE_URL` | Sim | App não arranca |
| `JWT_SECRET` | Sim | App não arranca / usa fallback inseguro |
| `JWT_REFRESH_SECRET` | Sim | Idem |
| `CONTACT_HASH_SECRET` | Sim | Hashing de contactos bloqueados usa fallback inseguro |
| `CLIENT_URL` | Sim | Links de convite/checkout/reset partidos (histórico: já foi bug real) |
| `BETA_CLOSED` | Sim, `true` | Registo fica aberto a qualquer pessoa, não só convidados |
| `SENDGRID_API_KEY` ou (`SMTP_HOST`+`SMTP_USER`+`SMTP_PASS`) | Sim, pelo menos um | Emails de verificação/reset/alerta de segurança não são enviados |
| `EMAIL_FROM` | Sim | Emails sem remetente configurado |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | Recomendado | Push notifications não funcionam |
| `SENTRY_DSN` | Recomendado | Sem monitorização de erros em produção |
| `ADMIN_EMAILS` | Sim | Ninguém consegue ser promovido a admin automaticamente |

`npm run beta:gate` verifica presença de todas estas — nunca o valor.

---

## 5. Health endpoints

- `GET /health` — status genérico, sem informação sensível.
- `GET /health/email` — **corrigido em BETA.3**. Antes: verificava só as variáveis de fallback SMTP (Gmail), reportava "misconfigured" mesmo com SendGrid correto, e devolvia `SMTP_HOST`, `SMTP_USER`, `EMAIL_FROM`, `CLIENT_URL` e os primeiros 8 caracteres de `SMTP_PASS` em JSON sem autenticação. Agora: deteta o provider real (SendGrid vs SMTP), não faz ligação ao vivo, devolve só booleanos:
  ```json
  { "status": "configured" | "missing" | "error", "provider": "sendgrid" | "smtp" | "unknown", "checks": { "fromConfigured": true, "credentialsConfigured": true } }
  ```
- `GET /health/recommendations` — já auditado, só flags/config + reachability boolean, sem dados de utilizadores.

---

## 6. Registo — consentimento explícito

**Antes (BETA.2 e anteriores)**: o backend já validava `ageConfirmed`/`privacyAccepted`/`sensitiveDataAccepted` mas de forma "suave" (`.optional().refine(v => v !== false)`) — porque `RegisterPage.jsx` nunca enviava estes campos, só um checkbox combinado de "Termos". Omitir o campo passava a validação.

**Agora (BETA.3)**: `RegisterPage.jsx` tem quatro checkboxes independentes, nenhum pré-selecionado — "Tenho 18 anos ou mais", "Aceito os Termos", "Aceito a Política de Privacidade", "Aceito o tratamento de dados sensíveis". O backend (`registerSchema` em `server/src/routes/auth.ts`) passou a exigir os três campos (`ageConfirmed`, `privacyAccepted`, `sensitiveDataAccepted`) como `true` explícito — ausência do campo já não passa. Os testes existentes (`server/__tests__/auth.test.ts`) já enviavam estes três campos como `true` no payload base, pelo que não precisaram de alteração.

---

## 7. `npm run beta:gate` — o que verifica

1. `prisma validate` — schema válido.
2. `prisma generate` — cliente gera sem erro.
3. `tsc --noEmit` — sem erros de tipos.
4. Start command / `start.sh` não contém `db push` nem `--accept-data-loss`.
5. `prisma/migrations/` existe e tem pelo menos uma migração.
6. `/health/email` não devolve valores de configuração/segredos (verificação estática do código-fonte).
7. Presença de `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CONTACT_HASH_SECRET`, `CLIENT_URL`.
8. Presença de `VAPID_*` (aviso, não bloqueia).
9. Presença de provider de email (SendGrid ou SMTP).
10. Presença de `SENTRY_DSN` (aviso, não bloqueia).
11. `BETA_CLOSED === 'true'`.
12. `prisma/seed.ts` presente (seed estrutural de Intenções/Limites).
13. `db:seed:beta:validate`, só se `BETA_SEED_ENABLED === 'true'`.

Sai com código de saída ≠ 0 se houver qualquer FALHA bloqueante — pode ser usado em CI, não só correndo manualmente.

**Nota de ambiente**: este script (e `prisma validate`/`generate`/`tsc`) precisam de acesso de rede a `binaries.prisma.sh` para os binários de motor do Prisma. Não corre num sandbox com essa rota bloqueada — correr localmente ou em CI (o GitHub Actions existente já prova que tem esse acesso).

---

## 8. Rollback plan

1. **Deploy com erro de arranque** (crash loop): Railway → Deployments → reverter para o deployment anterior com um clique. `restartPolicyMaxRetries: 3` já limita tentativas automáticas antes de ficar em estado de falha visível.
2. **Migração aplicada incorretamente**: `prisma migrate deploy` só aplica migrações para a frente — não há rollback automático de schema. Se uma migração recém-aplicada está errada:
   - Reverter o deployment da aplicação para a versão anterior (não muda o schema).
   - Escrever e aplicar uma nova migração corretiva (nunca editar/apagar uma migração já aplicada em produção).
   - Se a migração já causou perda de dados: restaurar do backup mais recente (secção 3, passo 1) e avaliar impacto via `docs/legal/INCIDENT_RESPONSE_PLAN.md`.
3. **Bug de produto pós-deploy sem impacto de schema**: reverter o deployment no Railway; o `preDeployCommand` não corre em rollback de deployment anterior (não há novo build), pelo que isto é seguro e imediato.
4. **`BETA_CLOSED` acidentalmente `false` em produção**: mudar a variável no Railway e reiniciar o serviço — não requer novo deploy.

---

## 9. Checklist de deployment (por deploy)

- [ ] `npm run beta:gate` sem FAIL bloqueante
- [ ] `npm test` (backend) sem falhas
- [ ] `npm run build` (client) sem erros
- [ ] GitHub Actions (`.github/workflows/test.yml`) verde no commit a fazer deploy
- [ ] Se o schema mudou: nova migração gerada e revista (nunca editar uma migração já commitada e aplicada)
- [ ] Backup da base de dados feito se a migração é a primeira depois de dados reais existirem
- [ ] Variáveis de ambiente do Railway confirmadas (secção 4)

## 10. Checklist de migração (quando `schema.prisma` muda)

- [ ] `npx prisma migrate dev --name <descrição>` localmente (ou `--create-only` + revisão manual) para gerar a migração
- [ ] Revisto o SQL gerado — nenhum `DROP`/`ALTER ... DROP COLUMN` inesperado
- [ ] Testado contra uma cópia/staging antes de produção, se a alteração for destrutiva
- [ ] Backup imediatamente antes do deploy que aplica a migração em produção
- [ ] `npm run db:deploy` corre como `preDeployCommand` (automático) — não correr `db push` manualmente em produção salvo emergência documentada

## 11. Checklist de moderador (diário)

- [ ] Fila de denúncias (`/admin` → Denúncias) sem itens `PENDING` há mais de 24h em prioridade CRÍTICA/ALTA
- [ ] Fotos pendentes de moderação revistas
- [ ] Verificações de identidade pendentes revistas
- [ ] Alertas de Check-in de Encontro (cron a cada 10 min, `SAFETY_ALERT_OVERDUE_HOURS`) — confirmar que não há alertas por resolver
- [ ] Ver `docs/product/MODERATION_WORKFLOW.md` para o fluxo completo de decisão

## 12. Fluxo de convite (beta fechada)

1. Admin cria `BetaInvite` no painel (código, `maxUses`, `expiresAt` opcional, `email` opcional para reservar a uma pessoa).
2. Convidado recebe o link/código, regista-se em `/register` com o código.
3. `POST /api/auth/register` valida o código via `validateBetaCode` (só corre a validação se `BETA_CLOSED === 'true'`) — código inválido/expirado/esgotado/reservado para outro email é rejeitado com um `errCode` específico (`BETA_REQUIRED`/`BETA_INVALID`/`BETA_EXPIRED`/`BETA_EXHAUSTED`/`BETA_EMAIL_MISMATCH`).
4. Uso do código incrementa `useCount`; ao atingir `maxUses`, o convite é desativado automaticamente.
5. `?ref=CODE` na URL regista também uma referral (sistema de afiliados) independente do beta code.

## 13. Rotina diária de beta

- [ ] Verificar `/health` e `/health/email` respondem
- [ ] Checklist de moderador (secção 11)
- [ ] Rever novos registos vs. convites usados (consistência)
- [ ] Rever logs de erro (Sentry, se configurado) por picos anormais
- [ ] Confirmar que o backup automático do Railway está ativo

---

## 14. Follow-ups conhecidos (não bloqueantes para abrir a beta)

- `EligibilityService.forProfileContext` está implementado e usado em `discovery.ts` (`/:id/like`, `/:id/pass`). Não foi ainda propagado a `matches.ts`/`rooms.ts`/`photos.ts` — esses já resolvem o perfil ativo corretamente (não têm o bug de Active Profile Context), adicionar o gate ali é reforço defensivo, não correção de bug, fica para sprint seguinte.
- Baseline migration gerada como script, não executada contra produção nesta sessão (sem acesso de rede a `binaries.prisma.sh` no ambiente onde este trabalho foi preparado) — ver secção 3 para os passos manuais pendentes.
- URLs de fotos privadas assinadas — já implementado (`mediaAccessService.ts`), mas listado aqui porque `BETA_PRIVATE_READINESS_CHECKLIST.md` ainda o lista como pendente; confirmar e atualizar esse documento.
