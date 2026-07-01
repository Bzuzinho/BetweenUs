# Checklist de Conformidade Pré-Lançamento — Between Us
> Versão: 1.0-draft | Julho 2026
> ⚠️ TEMPLATE INTERNO — Requer revisão jurídica antes do lançamento público.

---

## Legenda
- ✅ Concluído
- 🔲 Pendente
- ⚠️ Em curso / parcial
- ❌ Blocker — não lançar sem isto

---

## RGPD e Protecção de Dados

- ✅ Política de Privacidade redigida
- 🔲 Política de Privacidade revista por advogado
- ✅ Termos de Utilização redigidos
- 🔲 Termos de Utilização revistos por advogado
- ✅ Política de Retenção de Dados definida
- ❌ Endpoint de eliminação de conta implementado
- ❌ Endpoint de exportação de dados implementado
- ✅ Consentimentos registados com versão e data
- ❌ Consentimentos com IP e userAgent
- ❌ Consentimento granular no registo (7 campos separados)
- 🔲 DPO ou contacto de privacidade designado
- 🔲 CNPD notificada (se aplicável)
- ✅ DPIA checklist preparada

## Verificação de Idade

- ✅ Validação de data de nascimento no registo (≥18)
- ❌ Email verification real (não automática em produção)
- ✅ Verificação de identidade por selfie disponível
- 🔲 Processo de verificação de idade documentado internamente

## Segurança Técnica

- ✅ HTTPS obrigatório em produção
- ✅ Passwords em bcrypt (cost 12)
- ✅ JWT em cookies httpOnly
- ✅ Rate limiting em endpoints de autenticação
- ✅ CORS restrito em produção
- ✅ Helmet configurado
- ✅ Validação de input (Zod)
- ✅ Magic bytes validation nas fotos
- ✅ EXIF removal nas fotos
- ❌ CONTACT_HASH_SECRET sem fallback em produção
- ✅ Audit log de acções admin
- ✅ Acesso admin a conversas com motivo obrigatório
- 🔲 Pen test ou auditoria de segurança externa

## Moderação

- ✅ Sistema de denúncias implementado
- ✅ Prioridade automática para denúncias críticas
- ✅ Painel admin de moderação
- ❌ Categorias COERCION, REVENGE_PORN, DOXXING, PROSTITUTION_OR_ESCORT em falta
- 🔲 Equipa de moderação humana activa
- 🔲 Processo de moderação documentado e treinado

## Pagamentos

- ⚠️ Stripe configurado em modo teste
- ❌ Stripe production guard (bloquear upgrade sem config)
- 🔲 Revisão legal dos planos Premium
- 🔲 Stripe em modo live
- 🔲 Descritivo no extracto bancário do utilizador definido

## Legal Geral

- 🔲 Entidade legal registada
- 🔲 NIF/NIPC válido
- 🔲 Domínio próprio (não railway.app)
- 🔲 Email profissional configurado (não gmail)
- 🔲 Termos revistos para conformidade com lei portuguesa
- 🔲 Avaliação de risco para publicação em App Store/Google Play

## Operacional

- ✅ Beta gate activo (BETA_CLOSED)
- ✅ Testes automatizados (39 testes)
- ✅ CI/CD com GitHub Actions
- 🔲 Plano de resposta a incidentes testado
- 🔲 Backup e restore testados
- 🔲 Monitorização de uptime activa
