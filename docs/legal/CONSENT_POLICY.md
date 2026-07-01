# Política de Consentimento — Between Us
> Versão: 1.0-draft | Julho 2026
> ⚠️ TEMPLATE INTERNO — Requer revisão jurídica antes do lançamento.

---

## Princípios

O consentimento é um pilar central da Between Us. Todos os consentimentos são:
- **Explícitos** — nunca assumidos ou pré-preenchidos
- **Informados** — com linguagem clara sobre o que se aceita
- **Revogáveis** — a qualquer momento, sem penalização
- **Registados** — com versão do documento, data e hora

## Consentimentos no registo

No acto de registo, são recolhidos os seguintes consentimentos separados:

| Campo | Obrigatório | Descrição |
|---|---|---|
| ageConfirmed | Sim | Confirmação de ter 18 ou mais anos |
| termsAccepted | Sim | Aceitação dos Termos de Utilização |
| privacyAccepted | Sim | Aceitação da Política de Privacidade |
| sensitiveDataAccepted | Sim | Consentimento para tratamento de dados sensíveis (orientação, preferências) |
| communityGuidelinesAccepted | Sim | Aceitação das Directrizes da Comunidade |
| locationConsent | Não | Autorização para usar localização aproximada no discovery |
| marketingConsent | Não | Autorização para comunicações de marketing |
| contactHashingConsent | Não | Autorização para processar hashes de contactos para bloqueio |

## Consentimento em plataforma (ConsentCheck)

Além do registo, a plataforma usa ConsentChecks para fases sensíveis dentro de cada interacção:

| Fase | Trigger |
|---|---|
| MATCH | Antes de activar um match |
| CHAT | Antes de abrir conversa |
| PHOTO_REQUEST | Pedido de acesso a foto privada |
| FACE_REVEAL | Revelação de foto de rosto |
| VIDEO_CALL | Inicio de videochamada |
| MEETING_PROPOSAL | Proposta de encontro presencial |
| SAFETY_CHECKIN | Activação de check-in de segurança |

## Revogar consentimento

O utilizador pode revogar consentimentos opcionais em qualquer momento em Definições → Privacidade.
A revogação de consentimentos obrigatórios equivale ao pedido de eliminação de conta.

## Retenção dos registos de consentimento

Os registos de consentimento são mantidos por 5 anos após o fim da relação contratual, por obrigação legal.
