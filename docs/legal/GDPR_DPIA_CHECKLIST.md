# Checklist DPIA (Avaliação de Impacto) — Between Us
> Versão: 1.0-draft | Julho 2026
> ⚠️ TEMPLATE INTERNO — Requer revisão jurídica. A DPIA completa deve ser documentada formalmente antes do lançamento.

---

## O que é uma DPIA

Uma Avaliação de Impacto sobre a Protecção de Dados (DPIA) é exigida pelo RGPD (Art. 35.º) quando o tratamento de dados é susceptível de resultar num risco elevado para os direitos e liberdades das pessoas singulares.

## Aplicabilidade à Between Us

A Between Us **provavelmente exige DPIA** porque:
- Trata dados de categoria especial (orientação sexual, vida sexual — Art. 9.º RGPD)
- Faz tratamento em larga escala de dados pessoais sensíveis
- Usa localização dos utilizadores
- Faz perfilagem (Between Score, compatibility scoring)

## Checklist DPIA

### Descrição sistemática do tratamento
- [ ] Finalidade do tratamento documentada para cada categoria de dados
- [ ] Fluxo de dados mapeado (recolha → processamento → armazenamento → eliminação)
- [ ] Subprocessadores identificados e documentados
- [ ] Transferências internacionais documentadas (Railway EUA, Cloudflare EUA)

### Avaliação da necessidade e proporcionalidade
- [ ] Dados recolhidos são os mínimos necessários (minimização)
- [ ] Período de retenção justificado para cada categoria
- [ ] Alternativas menos intrusivas avaliadas

### Avaliação dos riscos
- [ ] Riscos de acesso não autorizado avaliados
- [ ] Riscos de exposição de dados sensíveis avaliados
- [ ] Riscos de discriminação com base em dados de orientação avaliados
- [ ] Riscos de re-identificação com dados anonimizados avaliados

### Medidas de mitigação
- [ ] Medidas técnicas documentadas (bcrypt, httpOnly cookies, EXIF removal, etc.)
- [ ] Medidas organizacionais documentadas (controlo de acesso admin, audit logs)
- [ ] Plano de resposta a incidentes em vigor

### Consulta ao DPO ou autoridade
- [ ] DPO consultado (se designado)
- [ ] CNPD consultada se risco residual elevado após mitigação
