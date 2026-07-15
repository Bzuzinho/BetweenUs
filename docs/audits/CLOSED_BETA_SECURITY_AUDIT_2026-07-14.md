# Auditoria de Segurança — Preparação para Closed Beta
> Data: 14 julho 2026 | Auditor: revisão técnica interna (CTO/Security Lead role)
> ⚠️ Documento interno. Não substitui pen test externo nem revisão jurídica.

---

## Como usar este documento

Cobre as 10 áreas pedidas para a preparação da Closed Beta, por ordem de prioridade
(FASE 1 — blockers de segurança, FASE 2 — hardening, FASE 3 — produção). Para cada item:
problema, risco, ficheiros, correção aplicada (ou pendente), testes.

**Metodologia:** cada achado foi confirmado diretamente no código-fonte atual
(`server/src`), não a partir de documentação anterior (vários docs em `docs/audits/` e
`docs/product/` estavam desatualizados/contraditórios entre si e foram tratados como não
fiáveis). Onde uma correção foi aplicada, `npx tsc --noEmit` foi corrido com sucesso (zero
erros) sobre a árvore completa alterada, e — para a mudança de start command — `npx tsc`
(build real) seguido de `node dist/index.js` foi executado e confirmado a arrancar o
servidor corretamente.

**Limitação honesta do ambiente:** os testes automatizados novos (`npm test`) não puderam
ser executados de ponta a ponta neste sandbox — não há PostgreSQL nem Redis disponíveis, e
não há acesso de root para os instalar, nem rede permitida para `binaries.prisma.sh`
(`prisma db push`, usado no `globalSetup.ts` da suite, falha por isso). Esta é a mesma
limitação que os documentos anteriores do projeto já registam para `prisma
validate`/`generate`/`tsc` neste tipo de ambiente. Os testes foram escritos a seguir
exatamente as convenções já estabelecidas no repositório (mesmos helpers, mesmo padrão de
suites irmãs como `roomAuthorizationService.test.ts` e `blockService.test.ts`) e verificados
por leitura cuidadosa e por type-check limpo — mas **precisam de correr em CI/local antes do
merge**, tal como o próprio `CLOSED_BETA_GATE.md` já recomenda para o resto do pipeline.

---

## BLOCKERS

### B-01 — Socket.IO: conversas 1:1 sem verificação de pertença
**Ficheiro:** `server/src/index.ts` (handlers `join_conversation`, `typing`, linhas ~257-275 após correção)
**Risco:** Qualquer utilizador autenticado que soubesse ou adivinhasse um `conversationId`
podia fazer `socket.emit('join_conversation', id)` e entrar na room `conversation:<id>` sem
qualquer verificação de pertença — e depois receber (e falsificar) eventos `typing` de uma
conversa entre outras duas pessoas. O REST (`GET/POST /api/matches/:id/messages`) já validava
pertença via `verifyMatchMembership` — o Socket.IO nunca fazia o mesmo, apesar de o próprio
código já ter esse padrão implementado para Private Rooms (`resolveRoomMembership`).
Confirmado com evidência exata: `join_conversation` fazia `socket.join('conversation:' + id)`
sem nenhum `await` de verificação antes; `typing` fazia `socket.to('conversation:' +
data.conversationId).emit(...)` do mesmo modo.
**Correção aplicada:** ✅ Novo `server/src/lib/conversationAuthorizationService.ts`
(`resolveConversationMembership`), espelhando exatamente o padrão já usado por
`roomAuthorizationService.resolveRoomMembership` (Conversation → Match →
`isActiveMember(profileOneId/profileTwoId, userId)`). Ambos os handlers em `index.ts` agora
verificam antes de agir.
**Testes adicionados:** `server/__tests__/conversationAuthorizationService.test.ts` — 6 casos,
incluindo o cenário pedido explicitamente: utilizador A e B com match/conversa, utilizador C
sem qualquer relação, confirma que C nunca resolve como membro (`ok: false`), enquanto A e B
resolvem corretamente; mais casos de conversationId inexistente/omitido e de um membro de
casal removido a perder acesso (mirroring `roomAuthorizationService.test.ts`).

### B-02 — Fotos privadas de Private Room continuavam "limpas" após bloqueio
**Ficheiro:** `server/src/routes/rooms.ts` (`signRoomPhotos`)
**Risco:** Em salas privadas derivadas de match, a miniatura de perfil de cada membro era
assinada (`signMediaUrl`) incondicionalmente para qualquer membro aceite da sala, sem passar
por `mediaAccessPolicy`. Quando um match é bloqueado, `blockService.ts` só remove o
*bloqueador* de salas com 3+ membros — salas com ≤2 membros (o caso normal de um match 1:1)
são SAFETY_LOCKed, não fecham nem removem ninguém, de propósito (para preservar evidência
para denúncia). Isto significa que, depois de um bloqueio, ambas as partes continuavam
listadas como `members`, e a foto "limpa" do ex-parceiro continuava a ser devolvida via `GET
/api/rooms/:id` — mesmo depois de `MATCH_BLOCKED` já ter revogado o `PhotoAccessRequest`
correspondente noutro sítio do código.
**Correção aplicada:** ✅ `signRoomPhotos` agora recebe o contexto do viewer e, para salas
com `matchId` (derivadas de match), passa cada foto por `resolvePhotoForViewer`
(`mediaAccessService.ts` — o mesmo serviço já usado por discovery/perfis/fotos), que reavalia
`hasActiveMatch`/`hasApprovedAccessRequest` em tempo real. Salas standalone (sem `matchId`,
convites manuais) mantêm o comportamento original sem alteração — não é uma mudança de regra
de negócio, só fecha o buraco específico das salas derivadas de match.
**Testes adicionados:** `server/__tests__/roomPhotoAccessPolicy.test.ts` — confirma foto
CLEAN enquanto o match está ativo, foto BLURRED depois de `blockProfile()` (mesmo com ambos
ainda listados como `members`, replicando exatamente o cenário documentado em
`blockService.test.ts`), e um segundo teste confirmando que salas standalone **não** mudam de
comportamento.

---

## HIGH

### H-01 — Fotos/selfies pré-Sprint-3 com URL pública permanente no R2
**Ficheiro:** `server/src/lib/mediaAccessService.ts` (`isStorageKey`/`signMediaUrl`), `server/src/lib/storage.ts` (`uploadFile` antigo, `ACL: 'public-read'`)
**Risco:** O mecanismo atual de fotos privadas (`uploadPrivateFile` + `resolvePhotoForViewer`
+ URLs assinadas de 5 min) está corretamente implementado para uploads feitos depois do
Sprint 3 — isto **não** é um problema geral, ao contrário do que documentação antiga sugeria.
O gap real e ainda por fechar: qualquer foto/selfie carregada **antes** do Sprint 3 tem uma
URL `https://` completa e pública guardada em `storagePath`/`blurredPath`/
`selfieStoragePath`. `isStorageKey()` trata qualquer valor `https://` como "já utilizável" e
`signMediaUrl()` devolve-o sem assinar — o objeto R2 subjacente é público para sempre,
independentemente de bloqueios/revogações futuras a nível da app.
**Correção aplicada:** ✅ Script de migração `server/src/scripts/backfillLegacyPrivateMedia.ts`
(`npm run db:backfill-legacy-media`, com `--dry-run`) — idempotente, re-envia cada objeto
legado através de `uploadPrivateFile` (sem ACL pública), atualiza a BD, e apaga o objeto
público antigo.
**Pendente — ação operacional, não de código:** este script **não foi executado** contra a
base de dados de produção (sem acesso de rede/credenciais R2 de produção neste ambiente).
Correr uma vez, manualmente, depois do deploy: `npm run db:backfill-legacy-media --
--dry-run` primeiro para conferir, depois sem a flag. Requer as mesmas `STORAGE_*` env vars
que a app já usa.

### H-02 — Selfie de verificação sem magic-bytes nem strip de EXIF
**Ficheiro:** `server/src/routes/verifications.ts` (`POST /submit`)
**Risco:** Ao contrário de `photos.ts`, este endpoint confiava apenas no `mimetype` (`multer`
`fileFilter`, controlado pelo cliente) e enviava `req.file.buffer` tal e qual para o storage
— sem verificação de magic bytes real, sem remoção de EXIF/GPS. É o ativo mais sensível da
aplicação (selfie de identidade, revista por admins).
**Correção aplicada:** ✅ Reutiliza `detectRealImageType` + `processImage`
(`imageProcessing.ts`), exatamente o pipeline já usado por `photos.ts` — rejeita ficheiros
cujos magic bytes não correspondem a imagem real, e a imagem final gravada é sempre a versão
re-codificada/sem EXIF (`processed.clean`).

### H-03 — `POST /api/reports` sem rate limiting
**Ficheiro:** `server/src/routes/reports.ts`
**Risco:** Único endpoint de escrita de utilizador sem qualquer limitador — o ficheiro nem
importava `express-rate-limit`. Numa app de encontros, o sistema de denúncias é
sinal direto de prioridade de moderação; sem limite, um ator malicioso pode inundar a fila de
moderação ou forçar suspensão automática de utilizadores reais com denúncias em massa.
**Correção aplicada:** ✅ `reportLimiter` (20/15min por utilizador), mesmo padrão de
`uploadLimiter`/`verifyEmailLimiter` já usados noutros routers.

### H-04 — `trust proxy` nunca configurado (Railway)
**Ficheiro:** `server/src/index.ts`
**Risco:** A app corre atrás do proxy reverso do Railway. Sem `app.set('trust proxy', ...)`,
`req.ip` no Express resolve para o hop interno do Railway, não para o IP real do cliente —
todos os limitadores baseados em IP (`globalLimiter`, `strictLimiter`, e qualquer limitador
local que caia para `req.ip` quando não há `userId`) ficam efetivamente a partilhar um único
"balde" entre todos os clientes reais atrás desse proxy. Isto enfraquece silenciosamente a
proteção de força bruta em login/registo/reset de password, apesar dos números configurados
(10/15min) parecerem corretos.
**Correção aplicada:** ✅ `app.set('trust proxy', 1)` — confia exatamente um hop (o edge do
próprio Railway), não uma cadeia arbitrária de `X-Forwarded-For`.

### H-05 — Cron de Safety Check-in sem proteção multi-instância
**Ficheiro:** `server/src/jobs/safetyCheckinJobs.ts`
**Risco:** Nenhum dos 4 jobs em processo (`safetyCheckinJobs`, `cleanupExpiredMessages`,
`expireConsentChecks`, `recommendationLogCleanupJob`) tinha proteção contra execução
concorrente em mais de uma instância. Hoje o Railway está configurado para instância única
(sem `numReplicas` em `railway.json`), portanto sem impacto imediato — mas é uma mina
silenciosa assim que houver scale-out ou sobreposição de restart. O job de escalação de
Safety Check-in é o único com efeito colateral real e não-idempotente: envia um email real ao
contacto de confiança do utilizador. Os outros 3 jobs usam `updateMany`/`deleteMany`
atómicos e condicionais — confirmados seguros por natureza, sem necessidade de lock.
**Correção aplicada:** ✅ Novo `server/src/lib/distributedLock.ts` (lock Redis `SET NX EX`,
falha aberto se o Redis estiver em baixo — um job de segurança não deve parar silenciosamente
por uma falha do Redis). `safetyCheckinJobs.ts`'s `runAll` agora corre dentro do lock (TTL 5
min, intervalo do job 10 min).

### H-06 — `ts-node --transpile-only` em produção
**Ficheiro:** `server/package.json`, `server/start.sh`, `server/nixpacks.toml`
**Risco:** Produção corria via `node -r ts-node/register/transpile-only src/index.ts` — sem
verificação de tipos, transpila a cada boot, maior superfície de erro em runtime do que um
build compilado. `docs/product/CLOSED_BETA_GATE.md` documenta uma decisão anterior (BETA.3)
sobre o *start command* — mas essa decisão foi só sobre remover `prisma db push` do boot; não
diz respeito a ts-node vs. build, que ficou por resolver.
**Correção aplicada:** ✅ `package.json`: `"build": "tsc"`, `"start": "node dist/index.js"`.
`nixpacks.toml`: nova fase `[phases.build]` (`npm run build`). `start.sh`: `exec node
dist/index.js`. **Verificado nesta sessão:** `npx tsc` (build real, não `--noEmit`) compila
sem erros, e `node dist/index.js` arranca o servidor corretamente (confirmado no log: Sentry
init, Socket.IO, todos os 4 cron jobs agendados) — os únicos erros observados
(`ECONNREFUSED` no Redis, engine Prisma para plataforma errada) são puramente do ambiente
sandbox local (sem Redis a correr; cliente Prisma gerado para Windows, não Linux), não do
código. `ts-node`/`typescript` continuam em `dependencies` (não fica quebrado por
`--omit=dev`); scripts operador-invocados (`db:seed*`, `reset-password`, `hard-delete`,
`beta:gate`, backfills) continuam em ts-node — nunca estão no caminho de pedidos.

---

## MEDIUM

### M-01 — Respostas de erro a vazar `err.message` cru em produção
**Ficheiros:** `server/src/index.ts` (`GET /health/recommendations`), `server/src/routes/rooms.ts` (POST `/`), `server/src/routes/photos.ts` (POST `/`), `server/src/routes/auth.ts` (`/consents/reaccept`, `/consents/revoke`)
**Risco:** O handler de erro global (`index.ts`, fim do ficheiro) já protege corretamente
atrás de `isProd` — mas é contornado por qualquer rota que responda diretamente dentro do seu
próprio `catch` (sem `next(err)`). Os 5 pontos acima faziam-no incondicionalmente; o pior caso
é `GET /health/recommendations`, endpoint **não autenticado**. Hoje não há exploração
confirmada (a única chamada relevante já se auto-protege com `.catch(() => false)`), mas é
frágil: uma mudança futura sem `.catch()` interno voltaria a expor texto de erro do Prisma/BD
sem autenticação nenhuma. Outros pontos menores (`admin.ts` diagnóstico de email,
`webhooks.ts`) foram identificados mas não alterados — risco baixo (admin-only, ou apenas
texto de erro do SDK Stripe).
**Correção aplicada:** ✅ Todos os 5 pontos passaram a devolver mensagem genérica em produção
e `err.message` só em dev, seguindo exatamente o padrão já correto em `contacts.ts`.

### M-02 — `sharp` sem limite explícito de pixels nem timeout de processamento
**Ficheiro:** `server/src/lib/imageProcessing.ts`
**Risco:** Já existia uma verificação manual (`>10000x10000` → rejeitado) depois de uma
leitura barata de metadata, mas o `sharp()` em si não tinha `limitInputPixels` explícito (só o
default implícito da libvips, ~268MP), e não havia limite de tempo de processamento — uma
imagem patológica dentro dos limites podia, em teoria, prender um worker indefinidamente.
**Correção aplicada:** ✅ `limitInputPixels: 100_000_000` explícito em ambas as chamadas
`sharp()`, e wrapper `withTimeout` (15s) à volta de `.toBuffer()`.

### M-03 — Avatar (`POST /api/auth/avatar`) sem qualquer validação de conteúdo
**Ficheiro:** `server/src/routes/auth.ts`
**Risco (não corrigido):** `multer` aqui não tem sequer `fileFilter`; nenhuma verificação de
magic bytes, sem strip de EXIF, buffer guardado tal e qual. É o mais fraco dos 3 pontos de
upload da app. Menos sensível que a selfie de verificação (é uma foto de perfil pública), mas
ainda assim um vetor de conteúdo não validado.
**Recomendação:** aplicar o mesmo padrão de `detectRealImageType`/`processImage` já reutilizado em H-02.

### M-04 — Lacunas remanescentes de rate limiting
**Ficheiro:** `server/src/routes/auth.ts` (`/refresh`, `/otp-login`), Socket.IO (`server/src/index.ts`)
**Risco (não corrigido):** `POST /api/auth/refresh` e `GET /api/auth/otp-login` (resgate do
link OTP de login, gerado por SUPER_ADMIN) não têm limitador dedicado — dependem só do
`globalLimiter` (300/15min, agora corretamente IP-scoped depois de H-04). A entropia do token
OTP torna força bruta impraticável mesmo assim. Ligações e eventos Socket.IO
(`typing`/`message:send`/`room:join`, etc.) não têm qualquer limite de frequência — a
autenticação no handshake impede acesso anónimo, mas não impede um utilizador autenticado de
inundar o servidor com eventos.
**Recomendação:** limitador dedicado em `/refresh`; limitador por-socket (contador em memória
ou Redis) nos eventos de maior frequência antes de abrir a beta a um público mais alargado.

### M-05 — `redis.ts` registava o objeto de erro completo
**Ficheiro:** `server/src/lib/redis.ts`
**Risco:** único ponto do código que fazia `console.error('[REDIS] Error:', err)` (objeto
completo) em vez de `err.message`, como todo o resto do código — alguns tipos de erro do
cliente redis podem incluir a connection string na mensagem. Nenhuma fuga confirmada em
prática, mas inconsistente com a disciplina do resto do código.
**Correção aplicada:** ✅ `err?.message || err`.

---

## LOW

### L-01 — `betaGate.ts` não cobre todas as variáveis relevantes
**Ficheiro:** `server/src/scripts/betaGate.ts`
Não verifica presença de `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET`/`STRIPE_PRICE_*`,
`ADMIN_EMAILS`, `STORAGE_*`. Nenhuma delas tem fallback inseguro (todas falham fechado ou
desativam a funcionalidade), por isso é uma lacuna de *cobertura* do gate, não uma
vulnerabilidade viva. Não alterado nesta sessão — recomendação para follow-up.

### L-02 — `STRIPE_PRICE_PREMIUM`/`STRIPE_PRICE_COUPLE` com fallback `''`
**Ficheiro:** `server/src/routes/subscriptions.ts`
Sem valor, o checkout falha (já com `console.error` de aviso) — não é uma falha de segurança,
só operacional. Não alterado.

### L-03 — Emails completos em logs operacionais
Vários pontos (`admin.ts`, `auth.ts`, `verifications.ts`, `lib/email.ts`, scripts de
backfill/reset) registam o endereço de email completo em `console.log`. PII, não credencial;
aceitável para logs operacionais de uma app deste tipo, mas vale a pena reduzir para
partes/hash se algum dia os logs forem exportados para uma ferramenta externa sem controlo de
acesso. Não alterado.

### L-04 — Localização — CONFIRMADO SEGURO, sem alteração necessária
**Ficheiros:** `server/src/utils/location.ts` (`coarsenCoordinate`), `server/src/routes/profiles.ts`
Ao contrário do que vários documentos antigos sugeriam ("ainda pendente"), o código atual já
arredonda a 1 casa decimal (~11km) em todos os 4 pontos de escrita
(`PUT/POST/PUT /api/profiles*`), e `GET /api/profiles/:id` já remove `locationLat`/`locationLng`
da resposta antes de devolver a outro utilizador. Nenhum endpoint devolve coordenadas exatas
de outro utilizador. O algoritmo de distância (`betweenScoreService.ts`) usa o valor já
arredondado e nunca expõe km reais, só uma pontuação em baldes — sem regressão de
funcionalidade. Nenhuma alteração de código feita (nada estava errado).

---

## Resumo de ficheiros alterados

| Ficheiro | Tipo | Razão |
|---|---|---|
| `server/src/lib/conversationAuthorizationService.ts` | novo | B-01 |
| `server/src/index.ts` | alterado | B-01, H-04, M-01 |
| `server/__tests__/conversationAuthorizationService.test.ts` | novo | B-01 |
| `server/src/routes/rooms.ts` | alterado | B-02, M-01 |
| `server/__tests__/roomPhotoAccessPolicy.test.ts` | novo | B-02 |
| `server/src/scripts/backfillLegacyPrivateMedia.ts` | novo | H-01 |
| `server/package.json` | alterado | H-01 (script), H-06 |
| `server/src/routes/verifications.ts` | alterado | H-02 |
| `server/src/lib/imageProcessing.ts` | alterado | H-02, M-02 |
| `server/src/routes/reports.ts` | alterado | H-03 |
| `server/src/lib/distributedLock.ts` | novo | H-05 |
| `server/src/jobs/safetyCheckinJobs.ts` | alterado | H-05 |
| `server/start.sh`, `server/nixpacks.toml` | alterado | H-06 |
| `server/src/routes/photos.ts` | alterado | M-01 |
| `server/src/routes/auth.ts` | alterado | M-01 |
| `server/src/lib/redis.ts` | alterado | M-05 |

Nenhuma funcionalidade existente foi removida ou simplificada. Nenhuma regra de negócio foi
alterada sem necessidade (a única mudança de comportamento observável é B-02, e está
deliberadamente restrita a salas derivadas de match — salas standalone mantêm-se
inalteradas, testado explicitamente).

---

## Ações pendentes antes/depois do lançamento

1. **Correr `npm test` (CI ou máquina local com Postgres/Redis)** para confirmar os 2 novos
   ficheiros de teste passam — não pôde ser executado neste sandbox.
2. **Correr `npm run db:backfill-legacy-media -- --dry-run`** contra produção, rever o
   output, depois correr sem a flag (H-01) — com backup da BD antes, como o resto do runbook
   de deploy já exige para mudanças de dados.
3. Considerar M-03/M-04 antes de abrir a beta a um público maior que o inicial fechado.
4. `npm run beta:gate` continua válido e não foi quebrado por nenhuma destas alterações
   (confirmado: nenhuma das verificações estáticas do gate depende de comportamento alterado
   aqui, exceto H-06 que o próprio gate já não assumia).

---

## Veredito

🟡 **LANÇAR APÓS CORRIGIR X**

Os dois problemas de severidade BLOCKER encontrados (B-01, B-02) têm correção aplicada,
com testes escritos seguindo as convenções do próprio repositório — mas não verificados por
uma execução real da suite (sem Postgres/Redis neste ambiente). Antes de abrir a beta:

- **X1 (obrigatório):** correr `npm test` num ambiente com Postgres/Redis reais (local ou
  CI) e confirmar que os 2 ficheiros de teste novos passam, e que nenhum teste existente
  regrediu.
- **X2 (obrigatório antes de qualquer foto pré-Sprint-3 ficar exposta a um utilizador
  bloqueado):** correr o script de backfill (H-01) contra produção, com backup prévio.
- **X3 (recomendado, não bloqueante para um grupo fechado pequeno):** M-03 (avatar) e M-04
  (rate limiting remanescente) antes de crescer para além do primeiro lote de convidados.

Depois de X1 e X2 confirmados, o estado passa a 🟢 para uma Closed Beta com o primeiro lote de
convidados.
