# Plano de Testes — Between Us (produção)
> Para correr manualmente na app (`https://betweenus-production.up.railway.app` ou o teu domínio) ou por API (`https://fearless-stillness-production-e5f6.up.railway.app`).
> Preenche **Resultado obtido** e **✅/❌** à medida que testas. Cola-me a tabela preenchida (ou screenshots dos pontos assinalados 📸) e eu analiso.

Legenda: 📸 = vale a pena um screenshot aqui (UI visual, difícil de confirmar só por texto).

---

## A. Registo e consentimento

Esta secção testa diretamente a correção do BETA.3 — os 4 checkboxes explícitos.

| # | Passos | Resultado esperado | Resultado obtido | ✅/❌ |
|---|---|---|---|---|
| A1 | Abrir `/register`, avançar para o passo 2 (idade/consentimento) | 📸 Vês 4 checkboxes separadas: "Tenho 18 anos ou mais", "Aceito os Termos", "Aceito a Política de Privacidade", "Aceito o tratamento de dados sensíveis" — **nenhuma pré-selecionada** | | |
| A2 | Tentar "Criar conta" sem marcar nenhuma checkbox | Erro claro, conta não é criada | | |
| A3 | Marcar só 3 das 4 checkboxes (deixar uma por marcar) e tentar submeter | Erro específico a dizer qual falta, conta não é criada | | |
| A4 | Marcar as 4, submeter com um email novo | Conta criada com sucesso, avança para criar perfil | | |
| A5 | Tentar registar com o mesmo email outra vez | Erro "email já registado" (409) | | |
| A6 | Tentar registar com data de nascimento de alguém com menos de 18 anos | Bloqueado com mensagem sobre idade mínima | | |
| A7 | Login com o utilizador criado em A4 | Login funciona, token válido | | |

---

## B. Perfil — individual, casal, grupo

| # | Passos | Resultado esperado | Resultado obtido | ✅/❌ |
|---|---|---|---|---|
| B1 | Utilizador novo (sem perfil) faz login e é redirecionado | Vai parar ao ecrã de criar perfil, não a um 404/erro | | |
| B2 | Criar perfil individual completo (nome, bio, intenções, etc.) | Perfil criado, status inicial `PENDING_REVIEW` (produção) | | |
| B3 | Criar um perfil de casal — convidar um segundo email | Segundo utilizador recebe convite/consegue aceitar | | |
| B4 | **Segundo membro do casal** (não-criador) faz login | 📸 Vê o perfil partilhado do casal, não um erro "sem perfil" — este era o bug histórico do BETA.2, confirmar que continua corrigido | | |
| B5 | Segundo membro do casal edita Modo Acordo / intenções partilhadas | Alterações guardam e refletem para ambos os membros | | |

---

## C. Discovery e Matching — foco no fix do BETA.3

Esta é a secção mais crítica para validar — testa diretamente os bugs de Active Profile Context corrigidos em `discovery.ts`/`matches.ts`.

| # | Passos | Resultado esperado | Resultado obtido | ✅/❌ |
|---|---|---|---|---|
| C1 | Utilizador com perfil individual aprovado abre Discovery | Vê grid de perfis compatíveis | | |
| C2 | Dar "like" a outro perfil (individual→individual) | Sucesso, sem 404 | | |
| C3 | O outro perfil dá like de volta | Match é criado, aparece em Matches para ambos | | |
| C4 | **Membro não-criador de casal/grupo** (o do teste B4) tenta dar like a alguém a partir do Discovery | Deve funcionar (antes do fix: 404 "Cria o teu perfil primeiro") — este é o bug #1 do BETA.3 | | |
| C5 | Um utilizador com **perfil individual E perfil de casal**, muda o perfil ativo (Profile Switcher) para o casal, depois dá like a alguém | O like deve ficar registado **em nome do perfil de casal**, não do individual — bug #2 do BETA.3. Confirmável via `/api/admin/users/:id` no admin, a ver que `ProfileAction.actorProfileId` é o do casal | | |
| C6 | Dar "pass" a um perfil | Perfil desaparece do discovery, sem erro | | |
| C7 | Bloquear um perfil a partir do Discovery | Perfil bloqueado deixa de aparecer, sem erro | | |
| C8 | Denunciar um perfil a partir do Discovery | Denúncia é criada, aparece na fila de admin | | |
| C9 | Aceitar um pedido de ligação pendente (`/api/matches/accept/:id`) como membro não-criador de casal | Deve funcionar sem 404 — mesmo bug #2, mas em `matches.ts` | | |
| C10 | Rejeitar um pedido de ligação como membro não-criador de casal | Idem | | |

---

## D. Chat e Private Rooms

| # | Passos | Resultado esperado | Resultado obtido | ✅/❌ |
|---|---|---|---|---|
| D1 | Enviar mensagem numa conversa 1:1 após match | Mensagem entregue, aparece para o destinatário (real-time via Socket.io, ou pelo menos ao dar refresh) | | |
| D2 | Estado "lida"/"não lida" | Atualiza corretamente quando o destinatário abre a conversa | | |
| D3 | Criar uma Private Room (casal/grupo) | Sala criada, membros conseguem entrar | | |
| D4 | Bloquear alguém dentro de uma conversa | Bloqueio efetivo, conversa fica inacessível/marcada | | |

---

## E. Privacidade — foco no fix do BETA.3

| # | Passos | Resultado esperado | Resultado obtido | ✅/❌ |
|---|---|---|---|---|
| E1 | Utilizador com perfil individual + perfil de casal, ativo como casal, abre Definições de Privacidade | Deve mostrar/editar as definições do perfil de **casal ativo**, não do individual — bug #3 do BETA.3 | | |
| E2 | Ativar Modo Invisível sem Premium | Bloqueado com "requer Premium" | | |
| E3 | Membro não-criador de casal/grupo abre Definições de Privacidade | Não deve dar 404 (era o bug antes do fix) | | |

---

## F. Painel de Admin (SUPER_ADMIN)

| # | Passos | Resultado esperado | Resultado obtido | ✅/❌ |
|---|---|---|---|---|
| F1 | Login como `beta.admin.super` | ✅ já confirmado nesta sessão — funciona | ✅ | ✅ |
| F2 | 📸 Dashboard — números batem certo com a realidade (nº utilizadores, matches, etc.)? | Sem "A carregar" infinito, sem erros | | |
| F3 | 📸 Lista de utilizadores — filtros por estado funcionam | DELETED excluído por omissão, `?status=ALL` mostra tudo | | |
| F4 | Suspender/banir um utilizador de teste | Ação aplicada, utilizador deixa de conseguir fazer login | | |
| F5 | Fila de denúncias — a denúncia do teste C8 aparece | Visível, com prioridade atribuída | | |
| F6 | Aprovar uma foto pendente de moderação | Foto passa a `APPROVED`, fica visível no perfil | | |
| F7 | Aprovar um perfil `PENDING_REVIEW` | Perfil passa a `APPROVED` **e** a conta do utilizador é reativada automaticamente (sem passo manual extra) | | |
| F8 | Rever uma verificação de identidade pendente | Imagem de selfie visível, consegue aprovar/rejeitar | | |
| F9 | Sino de notificações do admin | Mostra pendências reais (denúncias, verificações), clique navega para o sítio certo | | |
| F10 | ⚠️ `GET /api/admin/email-config` | **Achado desta sessão**: devolve `SMTP_HOST`/`SMTP_USER`/parte de `SMTP_PASS`/parte de `SENDGRID_API_KEY` em claro para qualquer role de admin (não só SUPER_ADMIN). Confirmar se aceitas o risco ou queres que eu corrija (mesmo padrão do fix que já fiz no `/health/email` público) | | |
| F11 | Configurações → Afiliados → editar regra de recompensa | Regra guarda, não fica hardcoded | | |

---

## G. Pagamentos / Subscrição

| # | Passos | Resultado esperado | Resultado obtido | ✅/❌ |
|---|---|---|---|---|
| G1 | Ver planos disponíveis | Free/Premium/Couple Premium listados com preços corretos | | |
| G2 | Iniciar checkout Stripe (modo teste, se configurado assim) | Redireciona para o Stripe Checkout real | | |
| G3 | Completar um pagamento de teste (cartão `4242 4242 4242 4242` se Stripe estiver em test mode) | Subscrição ativa, plano atualizado no perfil | | |
| G4 | Cancelar subscrição | Acesso premium mantém-se até fim do período pago, depois reverte a Free | | |
| G5 | ⚠️ Confirmar se Stripe está em **modo live ou teste** em produção agora — se for live, **não completar G3 com cartão real** | | | |

---

## H. Afiliados / Referrals

| # | Passos | Resultado esperado | Resultado obtido | ✅/❌ |
|---|---|---|---|---|
| H1 | Abrir `/referrals`, ver link de convite pessoal | Link gerado, único por utilizador | | |
| H2 | Registar um novo utilizador via `?ref=CODE` desse link | Referral fica associado no `ReferralRule`/tracking | | |
| H3 | Referido completa subscrição paga | Conversão registada, aparece no admin (`GET /api/admin/users/:id`, secção referrals) | | |
| H4 | Atingir o número de convites da regra (default: 2) | Recompensa (2 meses premium) aplicada automaticamente | | |
| H5 | Visibilidade de quem convidou quem | Só visível no admin, não no perfil público de outros utilizadores | | |

---

## I. Segurança / Health (já parcialmente validado nesta sessão)

| # | Passos | Resultado esperado | Resultado obtido | ✅/❌ |
|---|---|---|---|---|
| I1 | `GET /health` | Status ok, versão 2.6.0 | ✅ confirmado | ✅ |
| I2 | `GET /health/email` | `sendgrid` detetado, sem segredos no output | ✅ confirmado | ✅ |
| I3 | `GET /health/recommendations` | Config visível, sem dados de utilizadores | ✅ confirmado | ✅ |
| I4 | ⚠️ `SENTRY_DSN` não está configurado (`sentry: false`) | Sem monitorização de erros em produção — não bloqueante mas recomendado antes de mais utilizadores reais | flag | |
| I5 | Tentar aceder a uma rota `/api/admin/*` sem token | 401/403, nunca dados | | |
| I6 | Tentar aceder a uma rota `/api/admin/*` com token de utilizador normal (não-admin) | 403 | | |

---

## Como usar isto

- Se testares pela UI: percorre por ordem, tira screenshot nos 📸, cola-mos aqui.
- Se testares por API/PowerShell: digo-te o comando exato para cada teste à medida que chegamos lá — não precisas de escrever os pedidos tu mesmo.
- Onde vires ❌, diz-me e eu investigo a causa raiz no código antes de sugerir correção — nada de "arranjar às cegas".
