# Política de Retenção de Dados — Between Us
> Versão: 1.0-draft | Julho 2026
> ⚠️ TEMPLATE INTERNO — Requer revisão jurídica antes do lançamento.

---

## Princípio geral

Os dados são mantidos apenas pelo tempo necessário para a finalidade que justificou a sua recolha, em conformidade com o RGPD (Art. 5.º, n.º 1, al. e)).

## Tabela de retenção

| Categoria de dados | Retenção activa | Após eliminação de conta |
|---|---|---|
| Dados de conta (email, password hash) | Duração da conta | Apagados em 30 dias |
| Perfil e bio | Duração da conta | Apagados em 30 dias |
| Fotos (clean + blurred) | Duração da conta | Apagadas do storage em 30 dias |
| Selfie de verificação | Apagada após revisão (máx. 7 dias) | N/A |
| Mensagens | Duração da conta | Apagadas em 30 dias |
| Mensagens temporárias (expiresAt) | Até à data de expiração | Apagadas por job automático |
| Matches e histórico | Duração da conta | Apagados em 30 dias |
| Hashes de contactos bloqueados | Duração da conta | Apagados em 30 dias |
| Registos de consentimento | Duração da conta + 5 anos | Mantidos 5 anos (obrigação legal) |
| Reports e moderação | Duração da conta + 2 anos | Mantidos 2 anos (obrigação legal) |
| Audit logs admin | 3 anos | 3 anos (independente da conta) |
| Dados de pagamento (Stripe) | Conforme política Stripe | Conforme política Stripe |
| Logs de segurança | 12 meses | 12 meses |

## Processo de eliminação

1. Utilizador solicita eliminação em Definições → Conta → Eliminar conta
2. Conta marcada como DELETED imediatamente
3. Sessões revogadas imediatamente
4. Dados pessoais apagados num prazo de 30 dias
5. Dados com base legal de retenção mantidos pelo prazo indicado
6. Confirmação enviada por email

## Backups

Os backups da base de dados são mantidos por 7 dias. Dados eliminados podem persistir em backups durante esse período.
