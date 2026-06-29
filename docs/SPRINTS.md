# Between Us — Roadmap Completo de Sprints
> Baseado no documento de especificação v2.0 (Jun 2026)
> Última atualização: Jun 29, 2026

---

## Estado Geral

**Sprints completos:** 20  
**Sprints em falta:** 27  
**Fase atual:** Débito técnico crítico → depois Beta fechado

---

## ✅ COMPLETOS

| ID | Sprint | Fase |
|---|---|---|
| 0.1 | Setup infraestrutura | Infra |
| 1.1 | Autenticação base | Auth |
| 1.2 | Consentimento & RGPD | Auth |
| 2.1 | Perfil individual | Perfis |
| 2.2 | Perfil de casal + Double Consent | Perfis |
| 2.4 | Upload de fotos + Soft Reveal | Perfis |
| 3.1 | Discovery feed real | Discovery |
| 3.2 | Between Score | Discovery |
| 3.3 | Likes & Matches | Matching |
| 4.1 | Chat real + sala privada | Chat |
| 5.1 | Privacidade + Modo Invisível | Privacidade |
| 5.2 | Bloqueio de contactos (SHA-256) | Privacidade |
| 5.3 | Denúncias | Segurança |
| 5.4 | Verificação de perfil (selfie) | Segurança |
| 6.1 | Admin v1 | Admin |
| 6.2 | Admin v2 — roles, dashboard, audit, beta | Admin |
| 7.1 | Subscrições freemium | Monetização |
| 7.1b | Stripe real — checkout + webhooks | Monetização |
| 8.1 | Travel Mode | Features+ |
| 8.2 | Consent Check por fases | Features+ |
| 8.4 | Check-in de encontro | Features+ |

---

## 🔴 PRIORIDADE CRÍTICA — Antes do beta

> Sem estes itens a app não deve abrir ao público.

### Sprint A.1 — Admin isolado do produto
**Objetivo:** Admin não aparece no discovery, não faz match, não tem perfil público.

- [ ] Filtrar utilizadores com `adminRole != null` do discovery feed
- [ ] Filtrar do /api/profiles públicos
- [ ] Admin acede apenas a /api/admin/*
- [ ] Criar rota /admin no frontend protegida por role
- [ ] Admin não recebe notificações de match

**Ficheiros:** `server/src/routes/discovery.ts`, `client/src/App.jsx`

---

### Sprint A.2 — Moderação de fotos real
**Objetivo:** Fotos nunca aprovadas automaticamente em produção.

- [ ] Remover auto-approve no upload (`PENDING` por defeito em prod)
- [ ] Fotos `PENDING` não aparecem no discovery nem no perfil público
- [ ] Strip EXIF/metadados no upload
- [ ] Validar MIME real (não apenas file.mimetype)
- [ ] Limitar dimensões (max 4000x4000)
- [ ] Gerar versão blurred real com sharp.js
- [ ] Fila de moderação no admin já funcional ✅

**Ficheiros:** `server/src/routes/photos.ts`, `server/src/lib/storage.ts`

---

### Sprint A.3 — Autorização em matches e chats
**Objetivo:** Só participantes do match podem ler/enviar mensagens.

- [ ] GET /api/matches/:id/messages — validar que userId pertence ao match
- [ ] POST /api/matches/:id/messages — idem
- [ ] GET /api/matches — só matches do utilizador atual
- [ ] Verificar em todas as rotas que acedem a dados de match

**Ficheiros:** `server/src/routes/matches.ts`

---

### Sprint A.4 — Refresh token validado contra Redis
**Objetivo:** Rotação real de refresh tokens.

- [ ] Ao fazer login: guardar hash do refresh token no Redis
- [ ] Ao fazer refresh: validar que o token recebido coincide com o hash no Redis
- [ ] Ao fazer logout: apagar do Redis
- [ ] Em caso de suspeita: revogar todos os tokens do utilizador
- [ ] Implementar `DELETE /api/auth/sessions` para revogar todas as sessões

**Ficheiros:** `server/src/routes/auth.ts`, `server/src/lib/redis.ts`

---

### Sprint A.5 — Email real (Resend)
**Objetivo:** Confirmação de email funcional antes do beta.

- [ ] Criar conta Resend (resend.com) — plano gratuito
- [ ] Adicionar variáveis SMTP no Railway
- [ ] Reativar verificação de email no registo
- [ ] Testar email de confirmação
- [ ] Testar email de reset de password
- [ ] Adicionar email de boas-vindas após verificação

**Ficheiros:** `server/src/utils/email.ts`, `server/src/routes/auth.ts`

---

## 🟡 PRIORIDADE ALTA — Diferencial do produto

### Sprint B.1 — Perfil relacional completo
**Objetivo:** Captar a dinâmica real da pessoa/casal.

Novos tipos de perfil:
- Estou sozinho/a
- Somos casal (ambos participam)
- Somos casal (um gere o contacto primeiro)
- Estou numa relação aberta
- Procuro casal
- Procuro solteiro/a
- Procuro apenas online

- [ ] Expandir enum `RelationshipStatus` no schema
- [ ] Atualizar CreateProfilePage com novos tipos
- [ ] Atualizar discovery para filtrar por dinâmica

---

### Sprint B.2 — Mapa de intenções expandido
**Objetivo:** Intenções com YES/MAYBE/NO por intenção individual.

13 intenções com preferência:
- Conversar primeiro, Encontro pontual, Experiência a três
- Casal procura terceira pessoa, Casal procura casal
- Solteiro/a procura casal, Relação paralela contínua
- Amizade colorida, Explorar fetiches, Poliamor
- Apenas online, Videochamada antes de encontro, Ainda a descobrir

- [ ] Atualizar `ProfileIntention` para ter campo `preference` (YES/MAYBE/NO)
- [ ] Atualizar UI de criação de perfil
- [ ] Alimentar algoritmo Between Score com preferências

---

### Sprint B.3 — Mapa de limites expandido
**Objetivo:** 16+ categorias de limites como peça central.

Categorias:
- Fotos privadas, Fotos de rosto, Videochamada
- Encontro presencial, Encontro só com ambos, Encontro individual
- Envolvimento emocional, Contacto recorrente
- Exploração de fetiches, Dormir fora
- Troca de contactos externos, Discrição total
- Sem pessoas conhecidas, Sem redes sociais
- Sem troca de números no início, Apenas perfis verificados

- [ ] Criar/expandir boundaries no seed
- [ ] UI de Mapa de Limites com categorias agrupadas
- [ ] Between Score penaliza incompatibilidades fortes
- [ ] Se NO vs YES em limite importante → impedir match

---

### Sprint B.4 — Double Consent real e completo
**Objetivo:** Consentimento duplo em todas as ações relevantes para casais.

- [ ] Like — membro A dá like → membro B recebe pedido interno
- [ ] Só há like efetivo se ambos aprovarem
- [ ] Superlike — idem
- [ ] Pedido de foto privada — idem
- [ ] Abertura de chat — idem
- [ ] Proposta de encontro — idem
- [ ] Estados: PENDING_PARTNER_APPROVAL → APPROVED_BY_BOTH / REJECTED

---

### Sprint B.5 — Soft Reveal por fases completo
**Objetivo:** 5 níveis com pedido + aprovação + revogação.

- Nível 1: avatar totalmente desfocado
- Nível 2: foto sem rosto / parcialmente desfocada
- Nível 3: foto de rosto após match
- Nível 4: galeria privada após aprovação explícita
- Nível 5: fotos sensíveis com expiração

- [ ] Pedido de revelação exige consentimento explícito
- [ ] Utilizador pode revogar acesso a qualquer momento
- [ ] Fotos sensíveis têm expiração (24h/48h/7d)
- [ ] Registar pedidos e aprovações em `ConsentCheck`

---

### Sprint B.6 — Acordo antes do chat
**Objetivo:** Mini acordo fixado no topo da sala privada.

Perguntas de acordo:
- Esta conversa é apenas exploratória?
- Pode haver troca de fotos?
- É aceitável falar de encontro presencial?
- Ambos aceitam manter discrição?
- Há limites que não devem ser ultrapassados?

- [ ] Modal de acordo ao iniciar conversa
- [ ] Respostas guardadas no campo `agreedRules` da `Conversation`
- [ ] Regras visíveis no topo da sala privada
- [ ] Ambas as partes têm de aceitar antes de conversar

---

### Sprint B.7 — Safe Exit real
**Objetivo:** Saída segura com 8 opções.

Opções:
1. Sair apenas
2. Arquivar conversa
3. Ocultar match
4. Limpar histórico local
5. Silenciar notificações
6. Bloquear utilizador
7. Reportar utilizador
8. Revogar acesso a fotos privadas

- [ ] Bottom sheet com opções ao tocar em Safe Exit
- [ ] Cada opção executa ação na API
- [ ] Revogação de fotos regista em ConsentCheck

---

### Sprint B.8 — Sala privada completa
**Objetivo:** Sala com contexto de consentimento visível.

- [ ] Cabeçalho com regras combinadas
- [ ] Estado do consentimento atual
- [ ] Estado da revelação de fotos
- [ ] Indicação se é casal com aprovação dupla pendente
- [ ] Botão Safe Exit sempre visível
- [ ] Botão reportar mensagem

---

## 🟢 PRIORIDADE MÉDIA — Privacidade avançada

### Sprint C.1 — Modo discreto completo
- [ ] PIN de bloqueio da app
- [ ] Face ID / biometria (mobile)
- [ ] Notificações sem conteúdo sensível
- [ ] Nome neutro nas notificações ("Nova mensagem")
- [ ] Botão de saída rápida
- [ ] Ocultar distância exata (mostrar "< 5 km" em vez de "3.2 km")
- [ ] Ocultar cidade exata
- [ ] Não mostrar "online agora"

---

### Sprint C.2 — Bloqueio de contactos HMAC
**Objetivo:** Substituir SHA-256 simples por HMAC-SHA256 com segredo do servidor.

- [ ] Usar `createHmac('sha256', process.env.CONTACT_HASH_SECRET)` em vez de `createHash`
- [ ] Adicionar `CONTACT_HASH_SECRET` às variáveis de ambiente
- [ ] Pedir consentimento explícito antes de processar contactos
- [ ] Botão para apagar todos os hashes

---

### Sprint C.3 — Verificação por níveis
**Objetivo:** 6 badges diferentes em vez de verificado/não verificado.

Badges:
1. ✉️ Email verificado
2. 🔞 Idade declarada
3. 🤳 Selfie validada
4. 💑 Casal confirmado pelos dois
5. 📷 Fotos moderadas
6. ✦ Conta premium ativa

- [ ] Campo `verificationLevel` no perfil
- [ ] Lógica para calcular badges ativos
- [ ] UI com badges visíveis nos cards do discovery

---

### Sprint C.4 — Between Score explicado
**Objetivo:** Mostrar ao utilizador por que razão tem determinado score.

- [ ] API retorna `scoreBreakdown` com fatores
- [ ] UI mostra "Alta compatibilidade porque..."
- [ ] Explicação negativa: "Limites diferentes sobre envolvimento emocional"
- [ ] Não mostrar score dos outros utilizadores — só o match com o meu perfil

---

### Sprint C.5 — Reputação interna (score de risco)
**Objetivo:** Score não público para ajudar moderação.

Fatores:
- Reports recebidos e procedentes (+peso)
- Bloqueios recebidos
- Fotos rejeitadas
- Mensagens removidas
- Verificação ativa (-peso)
- Tempo de conta (-peso)

- [ ] Campo `riskScore` no User (já no schema ✅)
- [ ] Cron ou trigger para recalcular
- [ ] Admin vê riskScore na lista de utilizadores
- [ ] Perfis com riskScore alto → moderação prioritária

---

## 🔵 FASE 9 — Beta & Lançamento

### Sprint 9.1 — Beta fechado
- [ ] Sistema de convites por código (já implementado ✅ na API)
- [ ] Frontend de entrada por código: `/join/:code`
- [ ] Registo bloqueado sem convite válido
- [ ] Métricas de beta: registos, matches, retenção D1/D7
- [ ] Formulário de feedback in-app
- [ ] Dashboard admin com métricas de beta

---

### Sprint 9.2 — Onboarding progressivo
**Objetivo:** 10 passos com progresso guardado como DRAFT.

Passos:
1. Criar conta
2. Verificar idade
3. Escolher tipo de perfil
4. Escolher dinâmica relacional
5. Escolher intenções
6. Definir limites
7. Definir privacidade
8. Carregar fotos
9. Criar bio
10. Confirmar modo de descoberta

- [ ] Campo `onboardingStep` no perfil
- [ ] Salvar como DRAFT até passo 10
- [ ] Não aparecer no discovery sem perfil mínimo aprovado

---

### Sprint 9.3 — Between Guide
**Objetivo:** 10+ artigos educativos dentro da app.

Artigos:
- Como definir limites em casal
- Como propor experiência sem pressão
- Como falar de fetiches
- Como reconhecer manipulação
- Como proteger identidade
- Primeiro encontro seguro
- Gerir ciúme em relação aberta
- Sair de conversa desconfortável
- Como usar Soft Reveal
- Como funciona consentimento contínuo

---

### Sprint 9.4 — Lançamento v1.0
- [ ] Políticas legais revistas por advogado
- [ ] Stripe live (sk_live_...)
- [ ] Moderação ativa (humana)
- [ ] Email configurado (Resend)
- [ ] PWA instalável
- [ ] Todos os itens de débito técnico resolvidos
- [ ] Testes de carga ao chat (WebSockets)
- [ ] Backup automático da BD confirmado

---

## 📋 Ordem de Implementação Recomendada

```
A.1 → A.2 → A.3 → A.4 → A.5  (débito técnico crítico)
B.1 → B.2 → B.3               (perfil diferenciador)
B.4 → B.5 → B.6               (consentimento)
B.7 → B.8                     (sala privada)
9.1                            (beta fechado)
C.1 → C.2 → C.3 → C.4        (privacidade avançada)
9.2 → 9.3                     (onboarding + guia)
9.4                            (lançamento)
```

**Estimativa total restante:** 6-8 semanas a ritmo atual.
