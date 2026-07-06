// Between Us — Email via Gmail SMTP
// Sender: emailtemp02@gmail.com (app password required)
// Works for any recipient — no domain verification needed

import nodemailer from 'nodemailer'

const SMTP_HOST = process.env.SMTP_HOST   // smtp.gmail.com
const SMTP_PORT = Number(process.env.SMTP_PORT || 587)
const SMTP_USER = process.env.SMTP_USER   // emailtemp02@gmail.com
const SMTP_PASS = process.env.SMTP_PASS   // Gmail App Password (16 chars)
const EMAIL_FROM = process.env.EMAIL_FROM || 'Between Us <emailtemp02@gmail.com>'
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000'

console.log('[EMAIL] ── GMAIL CONFIG ─────────────────────────')
console.log('[EMAIL] HOST :', SMTP_HOST  || '❌ NOT SET')
console.log('[EMAIL] USER :', SMTP_USER  || '❌ NOT SET')
console.log('[EMAIL] PASS :', SMTP_PASS  ? `✅ set (${SMTP_PASS.slice(0,4)}…)` : '❌ NOT SET')
console.log('[EMAIL] FROM :', EMAIL_FROM)
console.log('[EMAIL] ────────────────────────────────────────')

const getTransporter = () => {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn('[EMAIL] ⚠️  Missing SMTP config — emails disabled')
    return null
  }
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

const send = async (to: string, subject: string, html: string, label: string) => {
  const t = getTransporter()
  if (!t) {
    console.warn(`[EMAIL] Skipped ${label} → ${to}`)
    return
  }
  console.log(`[EMAIL] Sending ${label} → ${to}`)
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

export const sendMatchEmail = async (email: string, matchName: string) => {
  await send(email, 'Novo match — Between Us', wrap(`
    <h2 style="font-size:20px;color:#F5F7FA;margin:0 0 12px">💫 Novo match!</h2>
    <p style="color:#AAB6C2;line-height:1.6;margin:0 0 16px">
      Tens um novo match com <strong style="color:#F5F7FA">${matchName}</strong>.
    </p>
    ${btn(`${CLIENT_URL}/matches`, 'Ver matches')}
  `), 'match')
}

export const sendSafetyAlertEmail = async (email: string, opts: { scheduledAt: Date, locationHint?: string | null }) => {
  await send(email, '🚨 Alerta de segurança — Between Us', wrap(`
    <h2 style="font-size:20px;color:#F87171;margin:0 0 12px">🚨 Alguém que confia em ti não fez check-in</h2>
    <p style="color:#AAB6C2;line-height:1.6;margin:0 0 16px">
      Foste indicado/a como contacto de confiança para um encontro agendado para
      <strong style="color:#F5F7FA">${opts.scheduledAt.toLocaleString('pt-PT')}</strong>${opts.locationHint ? ` em <strong style="color:#F5F7FA">${opts.locationHint}</strong>` : ''}.
      Essa pessoa ainda não confirmou que está bem. Considera entrar em contacto com ela.
    </p>
  `), 'safety-alert')
}

export const getEmailConfig = () => ({
  host: SMTP_HOST || null,
  port: SMTP_PORT,
  user: SMTP_USER || null,
  pass: SMTP_PASS ? `set (${SMTP_PASS.slice(0,4)}…)` : null,
  from: EMAIL_FROM,
  configured: !!(SMTP_HOST && SMTP_USER && SMTP_PASS),
})
