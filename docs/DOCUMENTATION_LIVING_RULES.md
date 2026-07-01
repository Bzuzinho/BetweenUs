# Regras de Documentação Viva — Between Us
> Este documento define como manter a documentação actualizada e alinhada com o código.
> Deve ser lido por qualquer pessoa que faça alterações ao repositório.

---

## Princípio

A documentação vive lado a lado com o código. Qualquer alteração relevante ao código
implica uma actualização correspondente na documentação.

Se a documentação e o código divergem, a documentação está errada.

---

## Mapa obrigatório: código → documentação

| Alteração | Documentação a actualizar |
|---|---|
| Auth / consentimento / registo | README, MVP_STATUS, CONSENT_POLICY, PRIVACY_POLICY |
| Localização (perfis, discovery) | LOCATION_PRIVACY_REVIEW, PRIVACY_POLICY, DATA_RETENTION_POLICY |
| Fotos / storage | PHOTO_PRIVACY_REVIEW, PRIVACY_POLICY, DATA_RETENTION_POLICY |
| Mensagens / conversas | MESSAGE_RETENTION_REVIEW, DATA_RETENTION_POLICY |
| Pagamentos (Stripe) | PAYMENT_RISK_REVIEW, PAYMENTS_AND_REFUNDS_POLICY |
| Reports / admin / moderação | MODERATION_WORKFLOW, TRUST_AND_SAFETY_RUNBOOK, COMMUNITY_GUIDELINES |
| Deploy / variáveis de ambiente | README, PRODUCTION_READINESS_CHECKLIST |
| Bloqueadores resolvidos ou novos | AUDIT_SUMMARY, MVP_STATUS |
| Estado de funcionalidade muda | MVP_STATUS |
| Decisão técnica ou de produto | DECISIONS.md |
| Subcontratante novo ou removido | SUBPROCESSORS_REGISTER, PRIVACY_POLICY |
| Retenção de dados alterada | DATA_RETENTION_POLICY, PRIVACY_POLICY |
| Schema Prisma alterado | PRISMA_CODE_CONSISTENCY_AUDIT |

---

## Ficheiros vivos — estado e proprietário

| Ficheiro | Propósito | Frequência de actualização |
|---|---|---|
| README.md | Estado geral do projecto | A cada release significativo |
| docs/product/MVP_STATUS.md | Estado por módulo | A cada feature ou correcção relevante |
| docs/product/DECISIONS.md | Decisões técnicas/produto | A cada decisão relevante |
| docs/product/PRODUCTION_READINESS_CHECKLIST.md | Bloqueadores e pré-requisitos | A cada mudança de estado |
| docs/product/BETA_PRIVATE_READINESS_CHECKLIST.md | Checklist de beta privado | Antes e durante o beta |
| docs/audits/AUDIT_SUMMARY.md | Riscos e estado de correcção | A cada auditoria ou correcção |
| docs/audits/PRISMA_CODE_CONSISTENCY_AUDIT.md | Consistência schema/código | Sempre que o schema muda |
| docs/audits/SECURITY_AUDIT.md | Segurança técnica | A cada auditoria |
| docs/legal/* | Documentos legais | Quando há alterações em dados, consentimentos, pagamentos ou subcontratantes |

---

## Regras para commits/PRs

1. Todo o commit relevante deve responder: "A documentação foi actualizada? Sim/Não — Porquê?"
2. Se "Não": justificar explicitamente (ex: "correcção de typo — sem impacto em docs").
3. Commits que alteram funcionalidades, segurança, dados pessoais ou fluxos de utilizador
   devem actualizar os ficheiros correspondentes no mesmo commit.
4. Nunca declarar conformidade legal final em documentação interna.
5. Documentos em /docs/legal/ são sempre templates internos e exigem revisão jurídica profissional.

---

## O que nunca deve acontecer

- README a dizer que backend "ainda não existe" quando o backend está em produção.
- MVP_STATUS com módulo DONE quando há bugs conhecidos.
- AUDIT_SUMMARY sem os últimos riscos identificados.
- Documentos legais com datas antigas após alterações de política.
- Schema Prisma divergente do código TypeScript.
