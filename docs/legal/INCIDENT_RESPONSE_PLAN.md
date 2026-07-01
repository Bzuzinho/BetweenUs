# Plano de Resposta a Incidentes — Between Us
> Versão: 1.0-draft | Julho 2026
> ⚠️ TEMPLATE INTERNO — Requer revisão jurídica e teste operacional.

---

## Definição de incidente

Um incidente de segurança é qualquer evento que comprometa, ou possa comprometer, a confidencialidade, integridade ou disponibilidade dos dados pessoais tratados pela Between Us.

## Classificação

| Severidade | Exemplos | Prazo de acção |
|---|---|---|
| CRÍTICA | Acesso não autorizado à BD, leak de passwords, exposição de dados de menores | Imediato (< 1h) |
| ALTA | Acesso indevido a fotos privadas, falha no sistema de consentimento | < 4 horas |
| MÉDIA | Falha de autenticação, rate limiting contornado | < 24 horas |
| BAIXA | Erro de configuração sem exposição de dados | < 72 horas |

## Processo

### 1. Detecção e reporte
- Canal interno: security@betweenus.app
- Qualquer membro da equipa pode e deve reportar

### 2. Contenção imediata (< 1h para incidentes críticos)
- Isolar o sistema afectado se necessário
- Revogar credenciais comprometidas
- Preservar evidências (logs, dumps)

### 3. Avaliação de impacto
- Que dados foram afectados?
- Quantos utilizadores?
- Há dados de categoria especial (orientação, imagens)?
- Há menores envolvidos?

### 4. Notificação (RGPD Art. 33 e 34)
- **CNPD**: notificar em 72 horas se risco para direitos dos titulares
- **Utilizadores afectados**: notificar sem demora injustificada se risco elevado
- Template de notificação a preparar em antecipação

### 5. Remediação
- Corrigir a vulnerabilidade
- Verificar integridade do sistema
- Rever medidas de segurança

### 6. Documentação
- Relatório de incidente completo
- Registo no livro de incidentes
- Revisão de procedimentos

## Contactos de emergência

- Responsável técnico: [a definir]
- DPO / Responsável legal: [a definir]
- CNPD: www.cnpd.pt | +351 213 928 400
