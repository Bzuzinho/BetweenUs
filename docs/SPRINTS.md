# Between Us — Roadmap de Sprints
> Última atualização: Jun 29, 2026

## Estado Geral
**Sprints completos:** 34
**Sprints em falta:** 4 (C.5, 9.2, 9.3, 9.4)

---

## ✅ TODAS AS FASES CRÍTICAS COMPLETAS

- ✅ Fase 0-8: Base do produto (21 sprints)
- ✅ Fase A: Débito técnico crítico (5 sprints) — admin isolado, fotos moderadas, auth segura, email templates
- ✅ Fase B: Produto diferenciador (8 sprints) — Double Consent, Soft Reveal, Safe Exit, sala privada
- 🟡 Fase C: Privacidade avançada (4/5 sprints) — falta C.5 risk score
- 🟡 Fase 9: Beta & Lançamento (1/4 sprints) — falta onboarding, guide, v1.0

---

## 🔲 PENDENTE

### C.5 — Reputação interna (risk score)
- [ ] Cron job para recalcular `riskScore` no User
- [ ] Fatores: reports procedentes, bloqueios recebidos, fotos rejeitadas
- [ ] Admin vê risk score ordenável na lista de utilizadores

### 9.2 — Onboarding progressivo
- [ ] Campo `onboardingStep` no perfil
- [ ] Fluxo de 10 passos com guardar como DRAFT
- [ ] Não aparece no discovery até completar mínimo

### 9.3 — Between Guide
- [ ] 10+ artigos educativos reais (substituir mockup)
- [ ] CMS simples ou ficheiros markdown

### 9.4 — Lançamento v1.0
- [ ] Políticas legais revistas
- [ ] Stripe live mode
- [ ] Moderação humana ativa
- [ ] Email configurado
- [ ] PWA instalável
- [ ] Testes de carga

---

## Sprints Completos (34)

| ID | Sprint |
|---|---|
| 0.1 | Setup infraestrutura |
| 1.1 | Autenticação |
| 1.2 | Consentimento RGPD |
| 2.1 | Perfil individual |
| 2.2 | Perfil de casal |
| 2.4 | Upload de fotos |
| 3.1 | Discovery feed |
| 3.2 | Between Score |
| 3.3 | Likes & Matches |
| 4.1 | Chat real |
| 5.1 | Privacidade |
| 5.2 | Bloqueio contactos |
| 5.3 | Denúncias |
| 5.4 | Verificação |
| 6.1 | Admin v1 |
| 6.2 | Admin v2 |
| 7.1 | Subscrições |
| 7.1b | Stripe real |
| 8.1 | Travel Mode |
| 8.2 | Consent Check |
| 8.4 | Check-in segurança |
| A.1 | Admin isolado discovery |
| A.2 | Fotos PENDING produção |
| A.3 | Auth matches/chat |
| A.4 | Refresh token Redis |
| A.5 | Email templates |
| B.1 | Perfis PENDING_REVIEW |
| B.2 | Intenções YES/MAYBE/NO |
| B.3 | Seed expandido |
| B.4 | Double Consent real |
| B.5-B.6 | Acordo antes do chat |
| B.7 | Safe Exit real |
| B.8 | Sala privada completa |
| C.1 | Modo discreto completo |
| C.2 | HMAC contactos |
| C.3 | Verificação por níveis |
| C.4 | Score explicado |
| 9.1 | Beta fechado |
