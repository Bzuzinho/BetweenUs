# Workflow de Moderação — Between Us
> Versão: 1.0-draft | Julho 2026
> ⚠️ TEMPLATE INTERNO.

---

## Fluxo de uma denúncia

```
Utilizador submete denúncia
        ↓
Sistema atribui prioridade automática
        ↓
Fila de moderação (ordenada por prioridade DESC, data ASC)
        ↓
Moderador revê
        ↓
Decisão: RESOLVED / DISMISSED / ESCALATED
        ↓
Acção sobre utilizador (se aplicável)
        ↓
AdminAction registado (obrigatório)
        ↓
Notificação ao denunciante (quando possível)
```

---

## Prioridades e prazos

| Prioridade | Categorias | Prazo |
|---|---|---|
| 10 — Máxima | MINOR, THREAT, NON_CONSENSUAL_IMAGE, REVENGE_PORN | Imediato / < 2h |
| 8 — Alta | HARASSMENT, COERCION, DOXXING | < 8h |
| 7 — Elevada | PROSTITUTION_OR_ESCORT, PAID_SEXUAL_SERVICES | < 12h |
| 5 — Normal | FAKE_PROFILE, SCAM | < 48h |
| 3 — Baixa | OFFENSIVE_CONTENT | < 72h |
| 1-0 — Mínima | SPAM, OTHER | < 7 dias |

---

## Acções disponíveis por tipo

| Violação | Acção recomendada |
|---|---|
| Menor de 18 anos | Banimento imediato + preservação de evidências + reporte potencial às autoridades |
| Revenge porn / imagem não consentida | Remoção imediata da imagem + banimento + preservação |
| Ameaça / coerção | Suspensão imediata + revisão aprofundada |
| Prostituição / escort | Banimento imediato |
| Assédio (primeira ocorrência) | Aviso formal + suspensão temporária |
| Assédio (reincidente) | Banimento permanente |
| Perfil falso | Suspensão + pedido de verificação |
| Spam | Aviso + limite de funcionalidades |

---

## Regras para moderadores

1. Nunca aceder a conversas sem registar motivo
2. Todas as acções geram AdminAction (automático)
3. Dúvidas → escalar para ADMIN antes de banir
4. Casos com possível ilicitude criminal → escalar para SUPER_ADMIN
5. Não contactar utilizadores denunciados antes de decisão
6. Preservar evidências antes de remover conteúdo

---

## Comunicação ao utilizador

**Denunciante:** notificado quando o report é resolvido (RESOLVED ou DISMISSED).
**Denunciado:** notificado de suspensão/banimento com razão genérica (sem revelar quem denunciou).

---

## Recurso (appeal)

Um utilizador suspenso pode submeter recurso em support@betweenus.app.
Recursos são revistos por ADMIN ou SUPER_ADMIN (não pelo mesmo moderador).
Prazo de resposta: 5 dias úteis.
Banimentos por MINOR, REVENGE_PORN, PROSTITUTION_OR_ESCORT não são elegíveis para recurso.
