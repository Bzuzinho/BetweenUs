# Revisão de Retenção de Mensagens — Between Us
> Versão: 1.0 | Julho 2026

---

## Estado actual

### Implementado
- Mensagens com `deletedAt` (soft-delete) quando removidas por admin ou utilizador
- Campo `expiresAt` no modelo Message para mensagens temporárias
- Acesso admin a conversas exige motivo (auditado em AdminAction)
- Mensagens marcadas como `removedByAdmin: true` quando removidas por moderação

### Não implementado
- **Job automático para mensagens expiradas** — campo `expiresAt` existe mas sem cron job
- Notificação ao remetente quando mensagem é removida por admin
- Interface de utilizador para mensagens temporárias

---

## Job de limpeza

Ficheiro: `server/src/jobs/cleanupExpiredMessages.ts`

```bash
# Correr manualmente
npx ts-node server/src/jobs/cleanupExpiredMessages.ts

# No Railway: criar Cron Service apontando para este script
# Frequência recomendada: de hora em hora
# Comando Railway: node -r ts-node/register/transpile-only src/jobs/cleanupExpiredMessages.ts
```

O job faz **soft-delete** (define `deletedAt` e substitui `body` por `[Mensagem expirada]`).
Não apaga o registo — mantém para auditoria e retenção legal.

---

## Política de retenção

| Tipo de mensagem | Retenção | Acção |
|---|---|---|
| Mensagem normal | Duração da conta | Apagada após eliminação de conta (30 dias) |
| Mensagem com expiresAt | Até expiresAt | Soft-delete pelo job de limpeza |
| Mensagem removida por admin | 2 anos (auditoria) | Mantida com deletedAt e removedByAdmin |
| Mensagem em conta DELETED | 30 dias | Apagada no processo de hard delete |

---

## Acesso admin a mensagens

Todo o acesso a conversas por admin:
1. Requer motivo explícito na query string (`?reason=...`)
2. Gera registo em AdminAction automaticamente
3. Inclui ipAddress e userAgent do admin
4. Sem motivo → 400 Bad Request

---

## Próximos passos

- [ ] Configurar Cron Service no Railway para o job de limpeza (1x/hora)
- [ ] Adicionar interface de utilizador para enviar mensagens com expiresAt
- [ ] Notificar utilizador quando mensagem é removida por moderação
