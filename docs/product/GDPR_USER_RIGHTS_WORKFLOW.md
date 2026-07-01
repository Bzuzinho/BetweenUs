# Workflow de Direitos RGPD — Between Us
> Versão: 1.0-draft | Julho 2026

---

## Direitos implementados

| Direito | Endpoint | Estado |
|---|---|---|
| Acesso (Art. 15) | `GET /api/auth/export` | ✅ |
| Portabilidade (Art. 20) | `GET /api/auth/export` | ✅ |
| Eliminação (Art. 17) | `DELETE /api/auth/account` | ✅ |
| Rectificação (Art. 16) | `PUT /api/profiles/:id` | ✅ |
| Apagar fotos | `DELETE /api/photos/:id` | ✅ |
| Apagar contactos bloqueados | `DELETE /api/contacts/blocked` | ✅ |
| Ver consentimentos | `GET /api/auth/me` (consents) | PARTIAL |
| Revogar consentimentos | 🔲 Pendente | NOT_STARTED |
| Oposição ao tratamento (Art. 21) | Via eliminação de conta | PARTIAL |

## Fluxo de eliminação de conta

1. Utilizador acede a Definições → Conta → Eliminar conta
2. Confirma com a sua password
3. `DELETE /api/auth/account` com `{ password }` no body
4. Conta marcada como `DELETED`, email anonimizado imediatamente
5. Sessões revogadas (Redis limpo)
6. Cookies apagados
7. Dados pessoais apagados em até 30 dias por job automático
8. Registos de consentimento e moderação mantidos conforme Data Retention Policy

## Fluxo de exportação de dados

1. Utilizador acede a Definições → Privacidade → Exportar dados
2. `GET /api/auth/export` (autenticado)
3. Resposta JSON com: perfil, intenções, consentimentos, subscrição
4. Não inclui: messages (volume alto), fotos (binários — links em vez de conteúdo)

## O que ainda falta

- Job de limpeza (hard delete) 30 dias após soft-delete
- Endpoint para revogar consentimentos individuais
- Inclusão de lista de matches/conversas na exportação
- Notificação por email após eliminação confirmada
