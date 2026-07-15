import nodemailer from 'nodemailer'

const isConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_PASS)

const getTransporter = () => {
  if (!isConfigured) {
    console.warn('[EMAIL] SMTP not configured — emails will not be sent')
    return null
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: process.env.SMTP_PORT === '465',
    auth: { user: process.env.SMTP_USER || 'resend', pass: process.env.SMTP_PASS }
  })
}

const FROM = process.env.EMAIL_FROM || 'Between Us <noreply@betweenus.app>'
const CLIENT_URL = (process.env.CLIENT_URL || 'https://betweenus-production.up.railway.app').replace(/\/+$/, '')

const baseTemplate = (content: string) => `
<!DOCTYPE html>
<html lang="pt">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0E0818;font-family:Inter,sans-serif;">
  <div style="max-width:480px;margin:0 auto;padding:32px 24px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="font-family:Georgia,serif;font-style:italic;font-size:32px;
        background:linear-gradient(135deg,#C9956B,#F2C4B8);
        -webkit-background-clip:text;-webkit-text-fill-color:transparent;margin:0;">
        Between Us
      </h1>
      <p style="color:#7A6E88;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:4px 0 0;">
        Adult connections. Private by design.
      </p>
    </div>
    <div style="background:#1A1028;border:1px solid #2D1B4E;border-radius:20px;padding:28px;">
      ${content}
    </div>
    <p style="color:#4A3E58;font-size:11px;text-align:center;margin-top:24px;line-height:1.6;">
      Este email foi enviado de forma automática. Não respondas a esta mensagem.<br>
      © 2026 Between Us. Todos os direitos reservados.
    </p>
  </div>
</body>
</html>
`

const btn = (url: string, text: string) =>
  `<a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#C9956B,#F2C4B8);
    color:#1A0A2E;padding:14px 32px;border-radius:50px;text-decoration:none;
    font-weight:700;font-size:15px;margin:20px 0;">${text}</a>`

export const sendVerificationEmail = async (email: string, verifyToken: string) => {
  const transporter = getTransporter()
  if (!transporter) return

  const url = `${CLIENT_URL}/verify-email?token=${verifyToken}`
  await transporter.sendMail({
    from: FROM, to: email,
    subject: 'Confirma o teu email — Between Us',
    html: baseTemplate(`
      <h2 style="color:#FAF7F5;font-family:Georgia,serif;margin:0 0 12px;">Bem-vindo/a ao Between Us</h2>
      <p style="color:#B8A9D4;font-size:14px;line-height:1.6;margin:0 0 8px;">
        Confirma o teu email para ativares a tua conta e começares a explorar.
      </p>
      <div style="text-align:center;">${btn(url, 'Confirmar email')}</div>
      <p style="color:#4A3E58;font-size:12px;text-align:center;margin:16px 0 0;">
        Link válido por 24 horas. Se não criaste esta conta, ignora este email.
      </p>
    `)
  })
}

export const sendPasswordResetEmail = async (email: string, resetToken: string) => {
  const transporter = getTransporter()
  if (!transporter) return

  const url = `${CLIENT_URL}/reset-password?token=${resetToken}`
  await transporter.sendMail({
    from: FROM, to: email,
    subject: 'Recuperar password — Between Us',
    html: baseTemplate(`
      <h2 style="color:#FAF7F5;font-family:Georgia,serif;margin:0 0 12px;">Recuperar password</h2>
      <p style="color:#B8A9D4;font-size:14px;line-height:1.6;margin:0 0 8px;">
        Recebemos um pedido para redefinir a tua password.
        Se não foste tu, ignora este email.
      </p>
      <div style="text-align:center;">${btn(url, 'Redefinir password')}</div>
      <p style="color:#4A3E58;font-size:12px;text-align:center;margin:16px 0 0;">
        Link válido por 1 hora.
      </p>
    `)
  })
}

export const sendWelcomeEmail = async (email: string, displayName: string) => {
  const transporter = getTransporter()
  if (!transporter) return

  await transporter.sendMail({
    from: FROM, to: email,
    subject: 'A tua conta está ativa — Between Us',
    html: baseTemplate(`
      <h2 style="color:#FAF7F5;font-family:Georgia,serif;margin:0 0 12px;">
        Olá, ${displayName}!
      </h2>
      <p style="color:#B8A9D4;font-size:14px;line-height:1.6;margin:0 0 16px;">
        A tua conta está ativa. Começa por completar o teu perfil para
        aparecer no discovery e encontrar ligações compatíveis.
      </p>
      <div style="text-align:center;">${btn(`${CLIENT_URL}/create-profile`, 'Completar perfil')}</div>
    `)
  })
}

export const sendMatchEmail = async (email: string, matchName: string) => {
  const transporter = getTransporter()
  if (!transporter) return

  await transporter.sendMail({
    from: FROM, to: email,
    subject: 'Novo match — Between Us',
    html: baseTemplate(`
      <h2 style="color:#FAF7F5;font-family:Georgia,serif;margin:0 0 12px;">💫 É um match!</h2>
      <p style="color:#B8A9D4;font-size:14px;line-height:1.6;margin:0 0 16px;">
        Tu e <strong style="color:#C9956B;">${matchName}</strong> demonstraram interesse mútuo.
        Começa a conversa agora.
      </p>
      <div style="text-align:center;">${btn(`${CLIENT_URL}/matches`, 'Ver matches')}</div>
      <p style="color:#4A3E58;font-size:12px;text-align:center;margin:16px 0 0;">
        Este email foi enviado com discrição. O remetente aparece como "Between Us".
      </p>
    `)
  })
}

export const emailConfigured = isConfigured
