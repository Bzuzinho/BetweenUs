# Between Us — Roadmap de Sprints
> Última atualização: Jun 29, 2026
> **STATUS: 38/38 sprints completos — 100% do roadmap**

---

## 🎉 Roadmap completo

Todas as fases planeadas no documento de especificação v2.0 foram implementadas:

- ✅ Fase 0-8: Base do produto (21 sprints)
- ✅ Fase A: Débito técnico crítico (5 sprints)
- ✅ Fase B: Produto diferenciador (8 sprints)
- ✅ Fase C: Privacidade avançada (5 sprints)
- ✅ Fase 9: Beta & Lançamento (4 sprints)

---

## Lista completa (38)

| ID | Sprint | Fase |
|---|---|---|
| 0.1 | Setup infraestrutura | Infra |
| 1.1 | Autenticação | Auth |
| 1.2 | Consentimento RGPD | Auth |
| 2.1 | Perfil individual | Perfis |
| 2.2 | Perfil de casal | Perfis |
| 2.4 | Upload de fotos | Perfis |
| 3.1 | Discovery feed | Discovery |
| 3.2 | Between Score | Discovery |
| 3.3 | Likes & Matches | Matching |
| 4.1 | Chat real | Chat |
| 5.1 | Privacidade | Privacidade |
| 5.2 | Bloqueio contactos | Privacidade |
| 5.3 | Denúncias | Segurança |
| 5.4 | Verificação | Segurança |
| 6.1 | Admin v1 | Admin |
| 6.2 | Admin v2 | Admin |
| 7.1 | Subscrições | Monetização |
| 7.1b | Stripe real | Monetização |
| 8.1 | Travel Mode | Features+ |
| 8.2 | Consent Check | Features+ |
| 8.4 | Check-in segurança | Features+ |
| A.1 | Admin isolado discovery | Crítico |
| A.2 | Fotos PENDING produção | Crítico |
| A.3 | Auth matches/chat | Crítico |
| A.4 | Refresh token Redis | Crítico |
| A.5 | Email templates | Crítico |
| B.1 | Perfis PENDING_REVIEW | Produto |
| B.2 | Intenções YES/MAYBE/NO | Produto |
| B.3 | Seed expandido | Produto |
| B.4 | Double Consent real | Produto |
| B.5-B.6 | Acordo antes do chat | Produto |
| B.7 | Safe Exit real | Produto |
| B.8 | Sala privada completa | Produto |
| C.1 | Modo discreto completo | Privacidade+ |
| C.2 | HMAC contactos | Privacidade+ |
| C.3 | Verificação por níveis | Privacidade+ |
| C.4 | Score explicado | Privacidade+ |
| C.5 | Risk score automático | Privacidade+ |
| 9.1 | Beta fechado | Lançamento |
| 9.2 | Onboarding progressivo | Lançamento |
| 9.3 | Between Guide | Lançamento |
| 9.4 | Páginas legais | Lançamento |

---

## O que NÃO está incluído (fora do código)

Estes itens requerem ação humana/configuração, não desenvolvimento:

- Conta Resend real + variáveis SMTP
- Stripe em modo live (atualmente teste)
- Revisão legal profissional dos Termos/Privacidade
- Equipa de moderação humana real
- CONTACT_HASH_SECRET definitivo no Railway
- Testes de carga em produção
- Decisão sobre domínio próprio
- Decisão sobre apps nativas vs PWA

Ver `docs/STATUS.md` secção "Pré-Lançamento" para checklist completo.
