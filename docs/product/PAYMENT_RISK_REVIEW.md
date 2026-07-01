# Revisão de Risco de Pagamentos — Between Us
> Versão: 1.0-draft | Julho 2026
> ⚠️ TEMPLATE INTERNO — Requer revisão jurídica e análise de risco Stripe antes de activar pagamentos em produção.

---

## Risco principal

A Between Us é uma plataforma adulta. Processadores de pagamento como Stripe, PayPal e Revolut têm políticas restritivas para negócios adultos. O risco de encerramento de conta ou retenção de fundos é real se a plataforma for mal categorizada ou se ocorrer abuso.

---

## Funcionalidades Premium ACEITÁVEIS para processadores

Estes usos são defensáveis como produto de software/SaaS:

| Funcionalidade | Justificação |
|---|---|
| Modo Invisível | Controlo de privacidade — tool de software |
| Filtros avançados de discovery | Funcionalidade de pesquisa |
| Travel Mode | Personalização geográfica |
| Ver quem gostou | Funcionalidade de engagement |
| Bloqueio de contactos | Ferramenta de segurança |
| Soft Reveal avançado | Controlo de privacidade visual |
| Double Consent para casais | Funcionalidade de segurança relacional |
| Verificação de perfil prioritária | Ferramenta de confiança |

---

## Funcionalidades Premium PROIBIDAS (não implementar)

| Funcionalidade | Razão |
|---|---|
| Pagamentos entre utilizadores | Risco directo de escort/prostituição |
| Comprar "créditos" para mensagens | Modelo de telefone adulto — alto risco |
| Acesso a utilizadores específicos | Parece contratação de encontros |
| Venda de conteúdo explícito | Proibido por Stripe sem MCC especial |
| Subscrições para ver fotos íntimas | Fan platform — território de risco |
| Garantias de encontros | Promessa de serviço — ilegalmente próximo de escort |

---

## Linguagem recomendada perante processadores

**Categoria do negócio:** Dating / Social Networking (MCC 7273 ou equivalente)

**Descrição a usar com Stripe:**
> "Between Us é uma plataforma de subscrição para funcionalidades de privacidade, descoberta e compatibilidade. Vendemos acesso a ferramentas de software (modo invisível, filtros, controlo de visibilidade de fotos) para adultos verificados em relações abertas, casais e solteiros. Não processamos conteúdo adulto explícito, não facilitamos pagamentos entre utilizadores e não estamos associados a serviços de escort ou prostituição."

---

## Checklist antes de activar Stripe em produção

- [ ] Entidade legal registada com actividade económica de software/SaaS
- [ ] Verificação de negócio completada na dashboard Stripe
- [ ] MCC (Merchant Category Code) confirmado com Stripe
- [ ] Termos de Utilização revistos por advogado
- [ ] Política de Reembolsos clara e disponível publicamente
- [ ] Descritivo no extracto bancário definido (ex: "BETWEENUS.APP")
- [ ] Conta bancária empresarial (não pessoal)
- [ ] Planos de subscrição não descrevem acesso a pessoas ou encontros
- [ ] Suporte ao cliente activo (email de billing)
- [ ] Chargeback policy definida internamente

---

## Riscos Stripe específicos

| Risco | Probabilidade | Mitigação |
|---|---|---|
| Conta encerrada por violação de ToS | Médio | Categorização correcta + linguagem adequada |
| Retenção de fundos (chargeback alto) | Médio | Política de reembolso clara, boa moderação |
| Rejeição de aplicação | Médio | Documentação legal completa antes de aplicar |
| Limites de processamento | Baixo | Iniciar com Stripe Restricted e upgrade gradual |
