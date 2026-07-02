import nodemailer from 'nodemailer'

const isProd = process.env.NODE_ENV === 'production'

// Lazy transporter — only created when needed
let transporter: nodemailer.Transporter | null = null

const getTransporter = () => {
  if (transporter) return transporter

  const host = process.env.SMTP_HOST
  const pass = process.env.SMTP_PASS
  const user = process.env.SMTP_USER || 'resend'
  const port = Number(process.env.SMTP_PORT || 465)

  if (!host || !pass) {
    if (isProd) throw new Error('SMTP_HOST and SMTP_PASS are required in production')
    return null // dev: skip sending
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  })

  return transporter
}

const FROM = process.env.EMAIL_FROM || 'Between Us <noreply@betweenus.app>'
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000'

// ─── Email templates ──────────────────────────────────────────────────────────

const baseStyle = `
  font-family: 'Georgia', serif;
  background: #0E0818;
  color: #FAF7F5;
  max-width: 520px;
  margin: 0 auto;
  padding: 40px 32px;
  border-radius: 16px;
`

const btnStyle = `
  display: inline-block;
  background: linear-gradient(135deg, #C9956B, #F2C4B8);
  color: #1A0A2E;
  text-decoration: none;
  padding: 14px 32px;
  border-radius: 50px;
  font-weight: 700;
  font-size: 16px;
  margin: 24px 0;
`

const footerStyle = `
  color: #7A6E88;
  font-size: 12px;
  margin-top: 32px;
  border-top: 1px solid #2D1B4E;
  padding-top: 16px;
`

export const sendVerificationEmail = async (email: string, userId: string, token: string): Promise<void> => {
  const t = getTransporter()
  const url = `${CLIENT_URL}/verify-email?userId=${userId}&token=${encodeURIComponent(token)}`

  if (!t) {
    console.log(`[EMAIL DEV] Verification URL for ${email}:`, url)
    return
  }

  await t.sendMail({
    from: FROM,
    to: email,
    subject: 'Confirma o teu email — Between Us',
    html: `
      <div style="${baseStyle}">
        <h1 style="font-size:28px;font-style:italic;color:#C9956B;margin-bottom:8px;">Between Us</h1>
        <p style="color:#B8A9D4;font-size:14px;margin-bottom:24px;">Adult connections. Private by design.</p>
        <h2 style="font-size:20px;color:#FAF7F5;margin-bottom:12px;">Confirma o teu email</h2>
        <p style="color:#B8A9D4;line-height:1.6;">
          Clica no botão abaixo para activar a tua conta. O link expira em 1 hora.
        </p>
        <a href="${url}" style="${btnStyle}">Confirmar email</a>
        <p style="color:#7A6E88;font-size:13px;">
          Se não criaste uma conta no Between Us, ignora este email.
        </p>
        <div style="${footerStyle}">
          <p>Este link expira em 1 hora. Não partilhes este email.</p>
          <p>© Between Us — Todos os direitos reservados.</p>
        </div>
      </div>
    `
  })

  console.log(`[EMAIL] Verification sent to ${email}`)
}

export const sendPasswordResetEmail = async (email: string, userId: string, token: string): Promise<void> => {
  const t = getTransporter()
  const url = `${CLIENT_URL}/reset-password?userId=${userId}&token=${encodeURIComponent(token)}`

  if (!t) {
    console.log(`[EMAIL DEV] Password reset URL for ${email}:`, url)
    return
  }

  await t.sendMail({
    from: FROM,
    to: email,
    subject: 'Repõe a tua password — Between Us',
    html: `
      <div style="${baseStyle}">
        <h1 style="font-size:28px;font-style:italic;color:#C9956B;margin-bottom:8px;">Between Us</h1>
        <h2 style="font-size:20px;color:#FAF7F5;margin-bottom:12px;">Repõe a tua password</h2>
        <p style="color:#B8A9D4;line-height:1.6;">
          Recebemos um pedido para repor a password da tua conta. Clica no botão abaixo. O link expira em 1 hora.
        </p>
        <a href="${url}" style="${btnStyle}">Repor password</a>
        <p style="color:#7A6E88;font-size:13px;">
          Se não pediste a reposição de password, ignora este email. A tua password não foi alterada.
        </p>
        <div style="${footerStyle}">
          <p>Por razões de segurança, este link expira em 1 hora.</p>
          <p>© Between Us — Todos os direitos reservados.</p>
        </div>
      </div>
    `
  })

  console.log(`[EMAIL] Password reset sent to ${email}`)
}

export const sendWelcomeEmail = async (email: string, displayName?: string): Promise<void> => {
  const t = getTransporter()
  if (!t) {
    console.log(`[EMAIL DEV] Welcome email skipped for ${email}`)
    return
  }

  await t.sendMail({
    from: FROM,
    to: email,
    subject: 'Bem-vindo/a ao Between Us',
    html: `
      <div style="${baseStyle}">
        <h1 style="font-size:28px;font-style:italic;color:#C9956B;margin-bottom:8px;">Between Us</h1>
        <p style="color:#B8A9D4;font-size:14px;margin-bottom:24px;">Adult connections. Private by design.</p>
        <h2 style="font-size:20px;color:#FAF7F5;margin-bottom:12px;">
          Bem-vindo/a${displayName ? ', ' + displayName : ''}
        </h2>
        <p style="color:#B8A9D4;line-height:1.7;">
          A tua conta está activa. Completa o teu perfil para começar a aparecer no discovery.
        </p>
        <a href="${CLIENT_URL}/create-profile" style="${btnStyle}">Completar perfil</a>
        <p style="color:#7A6E88;font-size:13px;line-height:1.6;">
          A tua privacidade é a nossa prioridade. As tuas fotos passam por moderação
          antes de ficarem visíveis. As tuas coordenadas nunca são partilhadas.
        </p>
        <div style="${footerStyle}">
          <p>Podes apagar a tua conta e todos os teus dados a qualquer momento.</p>
          <p>© Between Us — Todos os direitos reservados.</p>
        </div>
      </div>
    `
  })

  console.log(`[EMAIL] Welcome sent to ${email}`)
}

export const sendMatchEmail = async (email: string, matchName: string): Promise<void> => {
  const t = getTransporter()
  if (!t) return

  await t.sendMail({
    from: FROM,
    to: email,
    subject: 'Tens um novo match — Between Us',
    html: `
      <div style="${baseStyle}">
        <h1 style="font-size:28px;font-style:italic;color:#C9956B;margin-bottom:8px;">Between Us</h1>
        <h2 style="font-size:20px;color:#FAF7F5;margin-bottom:12px;">💫 Novo match!</h2>
        <p style="color:#B8A9D4;line-height:1.6;">
          Tens um novo match com <strong style="color:#FAF7F5;">${matchName}</strong>.
          Abre a aplicação para começar a conversar.
        </p>
        <a href="${CLIENT_URL}/matches" style="${btnStyle}">Ver matches</a>
        <div style="${footerStyle}">
          <p>Para deixar de receber notificações por email, altera as definições de privacidade.</p>
        </div>
      </div>
    `
  })
}
