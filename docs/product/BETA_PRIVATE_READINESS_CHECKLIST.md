# Checklist de Beta Privado — Between Us
> Versão: 1.1 | Julho 2026

---

## 🔴 Obrigatório ANTES do beta privado

Sem estes itens, não é seguro abrir a beta a utilizadores reais.

- [ ] **Email verification activa** — Resend/SMTP configurado e a enviar emails reais
- [ ] **BETA_CLOSED=true** no Railway — apenas com convite
- [ ] **Beta invites criados** no admin panel antes de enviar convites
- [ ] **Moderador designado** — pelo menos 1 pessoa a monitorizar reports críticos
- [ ] **CONTACT_HASH_SECRET** definida no Railway (não fallback)
- [ ] **JWT_SECRET** e **JWT_REFRESH_SECRET** definidas no Railway (não fallbacks)
- [ ] **Admin configurado** — pelo menos 1 utilizador com adminRole=SUPER_ADMIN na BD
- [ ] **Fotos em moderação** — PENDING em produção, alguém a rever
- [ ] **Documentos legais** revistos internamente (não por advogado — isso é para produção)
- [ ] **Railway variables confirmadas** — todas as obrigatórias definidas
- [ ] **Testes principais passam** — `npm test` sem falhas
- [ ] **Backend online** — `/health` responde em produção
- [ ] **Storage R2 configurado** — fotos a carregar correctamente
- [ ] **Privacy defaults** — novos utilizadores começam como PENDING_VERIFICATION com visibilidade off
- [ ] **Rate limits activos** — testar que auth rate limit funciona
- [ ] **Backup BD** — Railway tem snapshot activo

---

## 🟡 Recomendado ANTES do beta privado

Não são bloqueadores absolutos mas reduzem risco significativamente.

- [ ] **Domínio próprio** — não railway.app para o frontend
- [ ] **Email profissional** — não gmail para contactos de segurança/billing
- [ ] **Sentry ou equivalente** — monitorização de erros em produção
- [ ] **Job cleanupExpiredMessages** — configurado como cron no Railway
- [ ] **Teste E2E manual** — fluxo completo: convite → registo → perfil → match → chat → safe exit
- [ ] **Testar Stripe** — checkout em modo teste a funcionar end-to-end
- [ ] **Rever seed de intenções/boundaries** — dados coerentes para novos utilizadores
- [ ] **Contactos de emergência** — emails de safety@betweenus.app e security@betweenus.app ativos
- [ ] **Verificar CORS** — só CLIENT_URL real aceite em produção
- [ ] **Content-Security-Policy** — avaliar activar no Helmet antes de beta

---

## 🟠 Obrigatório ANTES de produção pública

Estes itens são BLOCKER antes de abrir ao público geral.

- [ ] **Revisão jurídica** de todos os documentos em /docs/legal/ por advogado
- [ ] **Stripe live mode** — após aprovação jurídica dos planos
- [ ] **DPIA completa** — Avaliação de Impacto de Protecção de Dados formal
- [ ] **Entidade legal registada** — NIF/NIPC válido
- [ ] **Pen test externo** — ou auditoria de segurança por terceiro
- [ ] **Hard delete job** — apagar dados de contas DELETED há +30 dias
- [ ] **Signed URLs** para fotos privadas (actualmente URLs públicas permanentes)
- [ ] **ageVerifiedAt preenchido** quando selfie é aprovada
- [ ] **Build TypeScript compilada** em vez de ts-node
- [ ] **CNPD notificada** se exigido

---

## ✅ Pode ficar para depois do beta

- Videochamada
- App nativa iOS/Android
- Feed social
- Eventos privados
- IA para sugestões de conversa
- Gamificação
- Notificações push nativas
- Comunidades/grupos
