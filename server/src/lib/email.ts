// Between Us — Email
// Primary: SendGrid HTTP API (plain HTTPS — works even when the host blocks
// outbound SMTP ports, which Railway appears to do for this project).
// Fallback: generic SMTP, kept for local/dev or if SendGrid isn't configured.

import nodemailer from 'nodemailer'

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY
const SMTP_HOST = process.env.SMTP_HOST
const SMTP_PORT = Number(process.env.SMTP_PORT || 587)
const SMTP_USER = process.env.SMTP_USER
const SMTP_PASS = process.env.SMTP_PASS
const EMAIL_FROM = process.env.EMAIL_FROM || 'Between Us <info@betweenus.pt>'
const EMAIL_FROM_ADDRESS = (EMAIL_FROM.match(/<(.+)>/)?.[1]) || EMAIL_FROM
const EMAIL_FROM_NAME = EMAIL_FROM.replace(/\s*<.+>\s*/, '').trim() || 'Between Us'
const CLIENT_URL = (process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/+$/, '')

console.log('[EMAIL] ── CONFIG ─────────────────────────')
console.log('[EMAIL] PROVIDER :', SENDGRID_API_KEY ? 'sendgrid (HTTP API)' : (SMTP_HOST ? 'smtp' : '❌ NONE CONFIGURED'))
console.log('[EMAIL] FROM     :', EMAIL_FROM)
console.log('[EMAIL] ──────────────────────────────────────')

const getTransporter = () => {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: false,       // Gmail port 587 uses STARTTLS, not SSL
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    tls: { rejectUnauthorized: false },
    family: 4,           // force IPv4 — Railway often can't route IPv6 to Gmail, causing ETIMEDOUT
    connectionTimeout: 15000,
  } as any)
}

const sendViaSendgrid = async (to: string, subject: string, html: string) => {
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: EMAIL_FROM_ADDRESS, name: EMAIL_FROM_NAME },
      subject,
      content: [{ type: 'text/html', value: html }],
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`SendGrid ${res.status}: ${body.slice(0, 300)}`)
  }
}

const send = async (to: string, subject: string, html: string, label: string) => {
  if (SENDGRID_API_KEY) {
    console.log(`[EMAIL] Sending ${label} → ${to} (via SendGrid)`)
    try {
      await sendViaSendgrid(to, subject, html)
      console.log(`[EMAIL] ✅ Sent ${label} → ${to}`)
    } catch (err: any) {
      console.error(`[EMAIL] ❌ Failed ${label} → ${to}: ${err.message}`)
      throw err
    }
    return
  }

  const t = getTransporter()
  if (!t) {
    console.warn(`[EMAIL] Skipped ${label} → ${to} — no provider configured`)
    return
  }
  console.log(`[EMAIL] Sending ${label} → ${to} (via SMTP)`)
  try {
    const info = await t.sendMail({ from: EMAIL_FROM, to, subject, html })
    console.log(`[EMAIL] ✅ Sent ${label} → ${to} (${info.messageId})`)
  } catch (err: any) {
    console.error(`[EMAIL] ❌ Failed ${label} → ${to}: ${err.message}`)
    throw err
  }
}

const wrap = (body: string) => `<!DOCTYPE html>
<html lang="pt"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:20px;background:#0A141A;font-family:Arial,sans-serif">
<div style="max-width:520px;margin:0 auto;background:#102129;border-radius:16px;padding:36px 32px;border:1px solid #1E3340">
  <div style="font-size:20px;font-weight:700;color:#F5F7FA;margin-bottom:4px">Between Us</div>
  <div style="font-size:12px;color:#7E8FA3;margin-bottom:24px">Adult connections. Private by design.</div>
  ${body}
  <div style="margin-top:24px;padding-top:16px;border-top:1px solid #1E3340;font-size:11px;color:#7E8FA3">
    © Between Us. Se não solicitaste este email, podes ignorá-lo.
  </div>
</div></body></html>`

const btn = (url: string, text: string) =>
  `<a href="${url}" style="display:inline-block;background:#B8A7FF;color:#0A141A;text-decoration:none;padding:13px 28px;border-radius:50px;font-weight:700;font-size:15px;margin:18px 0">${text}</a>`

export const sendVerificationEmail = async (email: string, userId: string, token: string) => {
  const url = `${CLIENT_URL}/verify-email?userId=${encodeURIComponent(userId)}&token=${encodeURIComponent(token)}`
  console.log(`[EMAIL] Verify URL: ${url}`)
  await send(email, 'Confirma o teu email — Between Us', wrap(`
    <h2 style="font-size:20px;color:#F5F7FA;margin:0 0 12px">Confirma o teu email</h2>
    <p style="color:#AAB6C2;line-height:1.6;margin:0 0 8px">
      Clica no botão para activar a tua conta.<br>
      O link expira em <strong style="color:#F5F7FA">1 hora</strong>.
    </p>
    ${btn(url, 'Confirmar email')}
    <p style="font-size:12px;color:#7E8FA3;margin:4px 0 0">
      Ou copia este link:<br>
      <span style="color:#B8A7FF;word-break:break-all">${url}</span>
    </p>
  `), 'verification')
}

export const sendPasswordResetEmail = async (email: string, userId: string, token: string) => {
  const url = `${CLIENT_URL}/reset-password?userId=${encodeURIComponent(userId)}&token=${encodeURIComponent(token)}`
  console.log(`[EMAIL] Reset URL: ${url}`)
  await send(email, 'Repõe a tua password — Between Us', wrap(`
    <h2 style="font-size:20px;color:#F5F7FA;margin:0 0 12px">Repõe a tua password</h2>
    <p style="color:#AAB6C2;line-height:1.6;margin:0 0 8px">
      O link expira em <strong style="color:#F5F7FA">1 hora</strong>.
    </p>
    ${btn(url, 'Repor password')}
    <p style="font-size:12px;color:#7E8FA3;margin:4px 0 0">
      Se não solicitaste este reset, ignora este email.
    </p>
  `), 'password-reset')
}

export const sendWelcomeEmail = async (email: string, displayName?: string) => {
  await send(email, 'Bem-vindo/a ao Between Us', wrap(`
    <h2 style="font-size:20px;color:#F5F7FA;margin:0 0 12px">Bem-vindo/a${displayName ? ', ' + displayName : ''}!</h2>
    <p style="color:#AAB6C2;line-height:1.6;margin:0 0 16px">
      A tua conta está activa. Completa o teu perfil.
    </p>
    ${btn(`${CLIENT_URL}/create-profile`, 'Completar perfil')}
  `), 'welcome')
}

export const sendProviderTestEmail = async (email: string) => {
  await send(email, 'Teste de email — Between Us', wrap(`
    <h2 style="font-size:20px;color:#F5F7FA;margin:0 0 12px">Configuração validada</h2>
    <p style="color:#AAB6C2;line-height:1.6;margin:0">
      Esta mensagem confirma que o fornecedor de email transacional do Between Us consegue enviar para este endereço.
    </p>
  `), 'provider-test')
}

export const sendMatchEmail = async (email: string, matchName: string) => {
  await send(email, 'Novo match — Between Us', wrap(`
    <h2 style="font-size:20px;color:#F5F7FA;margin:0 0 12px">💫 Novo match!</h2>
    <p style="color:#AAB6C2;line-height:1.6;margin:0 0 16px">
      Tens um novo match com <strong style="color:#F5F7FA">${matchName}</strong>.
    </p>
    ${btn(`${CLIENT_URL}/matches`, 'Ver matches')}
  `), 'match')
}

// 9.7 — neutral microcopy: names the requester (so the contact knows who
// asked), states plainly that the scheduled confirmation hasn't arrived,
// and is explicit that Between Us is not an emergency service and does
// not contact authorities on its own. Deliberately does NOT reveal what
// kind of encounter this was, who else might be involved, or anything
// about Between Us's nature as a dating platform beyond the brand name
// already in the subject line — locationHint is included only because
// the REQUESTER chose to share it for exactly this situation.
export const sendSafetyAlertEmail = async (
  email: string,
  opts: { scheduledAt: Date, locationHint?: string | null, requesterName?: string }
) => {
  const name = opts.requesterName || 'Alguém que confia em ti'
  await send(email, '💚 Notificação de segurança — Between Us', wrap(`
    <h2 style="font-size:20px;color:#F87171;margin:0 0 12px">💚 Pedido de verificação de segurança</h2>
    <p style="color:#AAB6C2;line-height:1.6;margin:0 0 16px">
      <strong style="color:#F5F7FA">${name}</strong> pediu-nos para te enviar esta notificação de segurança.
      Não recebemos a confirmação agendada para
      <strong style="color:#F5F7FA">${opts.scheduledAt.toLocaleString('pt-PT')}</strong>${opts.locationHint ? ` em <strong style="color:#F5F7FA">${opts.locationHint}</strong>` : ''}.
      Considera entrar em contacto com essa pessoa.
    </p>
    <p style="color:#7E8FA3;line-height:1.6;font-size:12px;margin:0">
      O Between Us não é um serviço de emergência e este email é gerado automaticamente.
      Não contactamos as autoridades — se achares que é uma emergência real, contacta-as diretamente.
    </p>
  `), 'safety-alert')
}

export const getEmailConfig = () => ({
  provider: SENDGRID_API_KEY ? 'sendgrid' : (SMTP_HOST ? 'smtp' : null),
  from: EMAIL_FROM,
  configured: !!SENDGRID_API_KEY || !!(SMTP_HOST && SMTP_USER && SMTP_PASS),
})
