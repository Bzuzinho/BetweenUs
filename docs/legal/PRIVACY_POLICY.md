# Política de Privacidade — Between Us
> Versão: 1.0-draft | Data: Julho 2026
> ⚠️ TEMPLATE INTERNO — Deve ser revisto e aprovado por advogado antes do lançamento público.

---

## 1. Quem somos

Between Us é uma plataforma de ligações adultas privadas e consentidas, operada em Portugal.
Contacto do Responsável pelo Tratamento: privacy@betweenus.app

## 2. Que dados recolhemos

**Dados fornecidos pelo utilizador:**
- Email, password (em hash bcrypt, nunca em claro)
- Data de nascimento
- Informação de perfil (nome de apresentação, bio, cidade, orientação, intenções)
- Fotos (processadas: EXIF removido, redimensionadas, versão desfocada gerada)
- Selfie de verificação (eliminada após revisão)

**Dados gerados automaticamente:**
- Data e hora de criação/actualização de conta
- Última sessão (lastSeenAt)
- Logs de acções admin (quando aplicável)
- Risk score interno (para moderação, nunca visível ao utilizador)

**Dados de consentimento:**
- Versão dos documentos aceites, data e hora de cada consentimento

**O que NÃO recolhemos:**
- Localização GPS em tempo real
- Contactos do dispositivo em claro (apenas HMAC hash se o utilizador escolher)
- Dados biométricos para além de selfie de verificação

## 3. Para que usamos os teus dados

| Finalidade | Base legal |
|---|---|
| Criar e gerir a tua conta | Execução de contrato |
| Mostrar perfis compatíveis no discovery | Execução de contrato |
| Processar pagamentos (Stripe) | Execução de contrato |
| Garantir a segurança da plataforma | Interesse legítimo |
| Cumprir obrigações legais | Obrigação legal |
| Enviar comunicações de serviço | Execução de contrato |
| Marketing (se consentido) | Consentimento |

## 4. Com quem partilhamos os teus dados

**Nunca vendemos os teus dados.**

Subprocessadores utilizados:
- **Railway** — hosting e base de dados (EUA, cláusulas contratuais padrão aplicadas)
- **Cloudflare R2** — armazenamento de ficheiros (EUA, cláusulas contratuais padrão)
- **Stripe** — processamento de pagamentos (EUA, certificado PCI-DSS)
- **Resend** — envio de email (quando configurado)

Partilhamos dados quando legalmente exigido (autoridades, ordens judiciais).

## 5. Contactos bloqueados

Quando utilizas a funcionalidade de bloqueio de contactos:
- Os valores são convertidos imediatamente em hash HMAC-SHA256
- Os dados originais (emails/telefones) **nunca são guardados**
- O hash não é reversível

## 6. Fotos e Soft Reveal

- As tuas fotos são armazenadas de forma segura no Cloudflare R2
- O EXIF (metadados com potencial localização) é removido automaticamente no upload
- Fotos privadas só são acessíveis a quem tiveres aprovado explicitamente
- Selfies de verificação são eliminadas após revisão pela equipa

## 7. Os teus direitos (RGPD)

Tens direito a:
- **Acesso** — pedir uma cópia dos teus dados (Art. 15)
- **Rectificação** — corrigir dados incorrectos (Art. 16)
- **Eliminação** — pedir a eliminação da tua conta e dados (Art. 17)
- **Portabilidade** — receber os teus dados em formato legível por máquina (Art. 20)
- **Oposição** — opor-te a determinados tratamentos (Art. 21)
- **Retirar consentimento** — a qualquer momento, sem prejuízo do tratamento anterior

Para exercer estes direitos: privacy@betweenus.app

## 8. Retenção de dados

Ver Política de Retenção de Dados para detalhes completos.
Resumo: dados de conta eliminados em 30 dias após pedido; alguns dados de moderação podem ser retidos por obrigação legal.

## 9. Segurança

- Passwords em hash bcrypt (cost 12)
- Tokens JWT em cookies httpOnly + Secure
- Comunicações em HTTPS
- Acesso admin auditado e com motivo obrigatório
- Alertas de incidente segundo o Plano de Resposta a Incidentes

## 10. Menores

A Between Us é exclusivamente para maiores de 18 anos. Se tomarmos conhecimento de que um utilizador é menor, a conta será encerrada imediatamente e os dados eliminados.

## 11. Alterações a esta Política

Em caso de alterações materiais, notificaremos com pelo menos 30 dias de antecedência.

## 12. Autoridade de controlo

Tens o direito de apresentar reclamação à CNPD (Comissão Nacional de Protecção de Dados): www.cnpd.pt
