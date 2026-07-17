# Utilizadores seed — referência para o Plano de Testes

Todas as contas abaixo já existem em produção (criadas por `npm run db:seed:beta`), domínio `@betweenus.test`, `isTestAccount=true`. **Password**: a mesma que usaste para o admin (`password`) — é definida uma única vez via `BETA_SEED_PASSWORD` para todo o seed, por isso deve servir para todas. Confirma com uma conta qualquer antes de assumir.

---

## Admins (para a Secção F do plano de testes)

| Email | Role | Usa para |
|---|---|---|
| `beta.admin.super@betweenus.test` | SUPER_ADMIN | já usámos — acesso total, F1-F11 |
| `beta.admin.admin@betweenus.test` | ADMIN | F3/F4/F5/F7 sem SUPER_ADMIN — testar que RBAC não deixa passar ações só-de-super |
| `beta.admin.moderator@betweenus.test` | MODERATOR | F5/F6/F8 (fila de denúncias, fotos, verificações) |
| `beta.admin.support@betweenus.test` | SUPPORT | F3/F4/F5 sem evidence — confirmar que não vê evidência de denúncias |
| `beta.admin.finance@betweenus.test` | FINANCE | Secção G (billing/subscriptions), sem acesso a moderação |
| `beta.admin.content@betweenus.test` | CONTENT_REVIEWER | Guide/fotos/perfis, sem reports — bom para I6 (testar 403 em rotas fora do seu âmbito) |

---

## O par mais importante para a Secção C/E (bug do Active Profile Context)

Este é o teste que mais interessa validar — é exatamente o que o BETA.3 corrigiu.

**Casal 1 — Ana & Pedro** (`beta.couple1.ana@betweenus.test` / `beta.couple1.pedro@betweenus.test`)
- **Pedro é o membro NÃO-criador** — este é o utilizador certo para os testes C4, C9, C10, E1, E3 (o que antes do fix levava 404 ao dar like/aceitar/rejeitar/ver privacidade).
- Ana tem **2 contextos disponíveis** (Individual + Casal) — é a conta certa para o teste C5 (trocar perfil ativo e confirmar que o like fica registado no perfil certo).
- `individualDiscoveryPolicy=INDIVIDUAL_AND_SHARED` — Ana e Pedro também aparecem como perfis Individual no Discovery, não só como Casal.
- Cenário já vem com Agreement `ALIGNED` e double consent `ALL` — bom baseline "tudo a funcionar" antes de testares os casos de erro.

Passo a passo sugerido para C5 (o teste mais específico do fix):
1. Login como Ana.
2. `GET /api/auth/me` — confirmar `availableProfileContexts` tem 2 entradas (Individual + Casal 1).
3. `POST /api/auth/active-profile` com o `profileId` do Casal 1 (trocar contexto ativo).
4. Dar like a um perfil qualquer do Discovery.
5. Login como admin, `GET /api/admin/users/:id` da Ana (ou consultar `ProfileAction` diretamente se tiveres acesso à BD) — confirmar que `actorProfileId` do like é o do **Casal**, não o Individual da Ana.

---

## Segundo par para comparação/negativo

**Casal 2 — Carla & Nuno** (`beta.couple2.carla@betweenus.test` / `beta.couple2.nuno@betweenus.test`)
- Agreement em conflito de propósito — UI deve mostrar "não estão alinhados" sem revelar detalhe de quem discorda.
- `individualDiscoveryPolicy=SHARED_ONLY` (default) — ao contrário do Casal 1, Carla e Nuno **nunca** devem aparecer como perfis Individual no Discovery, só como Casal. Bom teste de regressão para confirmar que o fix não quebrou este comportamento inverso.

---

## Individuais úteis para Discovery/Matching genérico (Secção C)

| Email | Cenário | Usa para |
|---|---|---|
| `beta.marta@betweenus.test` | Aberta a casais | Alvo de like do Casal 1 — third match happy path |
| `beta.leonor@betweenus.test` | Exclui casais (hard boundary) | Confirmar que nunca aparece a Casal 1/2 no Discovery — teste de exclusão por limite |
| `beta.ines@betweenus.test` | Invisível | Nunca deve aparecer em Discovery de ninguém |
| `beta.rui@betweenus.test` | verified_only | Eligibility boundary — bom para testar `EligibilityService` |
| `beta.miguel@betweenus.test` | Premium ativo | Secção G — já tem subscrição, bom para testar cancelamento em vez de compra nova |
| `beta.catarina@betweenus.test` | Travel Mode ativo (Porto) | Discovery no destino |

---

## Lifecycle (contas em estados específicos, não para fluxo normal)

| Email | Estado | Usa para |
|---|---|---|
| `beta.lifecycle.suspended@betweenus.test` | SUSPENDED | Confirmar que login falha (403 `ACCOUNT_SUSPENDED`) |
| `beta.lifecycle.banned@betweenus.test` | BANNED | Confirmar que login falha (403 `ACCOUNT_BANNED`) |
| `beta.lifecycle.profile-pending@betweenus.test` | Profile `PENDING_REVIEW` | F7 — aprovar este perfil no admin e confirmar reativação automática |
| `beta.lifecycle.profile-rejected@betweenus.test` | Profile `REJECTED` | Confirmar que utilizador vê o motivo da rejeição |

---

## Grupo (Secção C/D extra, só se `GROUP_PROFILES_ENABLED=true`)

**Trio Aurora** — `beta.group.luna@betweenus.test`, `beta.group.davi@betweenus.test`, `beta.group.iris@betweenus.test`
- Já tem match ativo com `beta.miguel@betweenus.test` (Grupo+Individual, N+1=4 aprovadores) e uma Private Room ativa (Room G, 4 membros) — bom cenário pronto a usar para D3/D4 sem teres de montar nada de raiz.

---

## Referrals (Secção H)

Não há contas seed dedicadas a afiliados — os Beta Invites existentes (4, criados por `beta.diogo@betweenus.test`) são sobre convites de beta fechado, não sobre o sistema de referrals/afiliados (que é `?ref=CODE`, independente). Para H1-H4 vais precisar de gerar um link de referral novo a partir de qualquer conta ativa (ex: `beta.marta@betweenus.test`) e registar um utilizador novo através dele — não há atalho seed para isto.
