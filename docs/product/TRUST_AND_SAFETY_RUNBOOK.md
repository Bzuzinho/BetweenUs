# Trust & Safety Runbook — Between Us
> Versão: 1.0 | Julho 2026
> Para uso interno da equipa de moderação.

---

## Acesso ao painel admin

URL: [URL_DO_ADMIN]/admin
Roles disponíveis: SUPER_ADMIN, ADMIN, MODERATOR, SUPPORT, FINANCE, CONTENT_REVIEWER

---

## Prioridades de moderação

| Prioridade | Categorias | Acção imediata |
|---|---|---|
| 🔴 10 — Crítica | MINOR, THREAT, NON_CONSENSUAL_IMAGE, REVENGE_PORN | Suspender conta + preservar evidências |
| 🟠 8 — Alta | HARASSMENT, COERCION, DOXXING | Suspender temporariamente + rever |
| 🟡 7 — Elevada | PROSTITUTION_OR_ESCORT, PAID_SEXUAL_SERVICES | Banir + log detalhado |
| 🟢 5 — Normal | FAKE_PROFILE, SCAM | Suspender + pedir verificação |
| ⚪ 0-3 — Baixa | SPAM, OFFENSIVE_CONTENT, OTHER | Avisar + monitorizar |

---

## Protocolo para MINOR (menor de 18 anos)

1. Suspender conta imediatamente
2. Preservar evidências (screenshot, logs)
3. Escalar para SUPER_ADMIN
4. Avaliar necessidade de reporte às autoridades
5. Banimento permanente após confirmação
6. Documentar em AdminAction com todos os detalhes

**Contacto de emergência:** safety@betweenus.app

---

## Protocolo para REVENGE_PORN / NON_CONSENSUAL_IMAGE

1. Remover imagem imediatamente (admin → Fotos → Remover)
2. Suspender conta do utilizador denunciado
3. Preservar evidências
4. Escalar para SUPER_ADMIN
5. Avaliar reporte às autoridades (Lei n.º 83/2015 — PORTUGAL)
6. Notificar a vítima (se identificável)

---

## Protocolo para PROSTITUTION_OR_ESCORT / PAID_SEXUAL_SERVICES

1. Banir conta imediatamente
2. Remover perfil e conteúdo
3. Registar em AdminAction com categoria e evidências
4. Verificar se há outros perfis do mesmo utilizador (por IP, email pattern)

---

## Acesso a conversas

Qualquer acesso a conversas por moderadores:
1. Navegar para Admin → Conversas
2. Seleccionar a conversa
3. **Motivo é obrigatório** — sem motivo, o acesso é bloqueado
4. Acesso fica registado automaticamente em audit log

---

## Escalação

| Situação | Escalar para |
|---|---|
| Menor confirmado | SUPER_ADMIN + potencial autoridades |
| Ameaça credível | SUPER_ADMIN + potencial autoridades |
| Dúvida legal | SUPER_ADMIN + advogado |
| Falha técnica grave | Equipa técnica |

---

## Fim de turno

Antes de terminar turno de moderação:
- Verificar fila de reports pendentes com prioridade ≥ 8
- Documentar decisões tomadas
- Escalar qualquer caso não resolvido com prioridade 10
