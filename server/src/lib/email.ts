import nodemailer from 'nodemailer'

// ─── Config ───────────────────────────────────────────────────────────────────
const SMTP_HOST = process.env.SMTP_HOST
const SMTP_PORT = Number(process.env.SMTP_PORT || 465)
const SMTP_USER = process.env.SMTP_USER || 'resend'
const SMTP_PASS = process.env.SMTP_PASS
const EMAIL_FROM = process.env.EMAIL_FROM || 'Between Us <onboarding@resend.dev>'
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000'

// Log config on module load so it's visible in Railway logs
console.log('[EMAIL] ── SMTP CONFIG ──────────────────────────────')
console.log('[EMAIL] SMTP_HOST :', SMTP_HOST  || '⚠️  NOT SET')
console.log('[EMAIL] SMTP_PORT :', SMTP_PORT)
console.log('[EMAIL] SMTP_USER :', SMTP_USER)
console.log('[EMAIL] SMTP_PASS :', SMTP_PASS ? `✅ set (${SMTP_PASS.slice(0,8)}…)` : '⚠️  NOT SET')
console.log('[EMAIL] EMAIL_FROM:', EMAIL_FROM)
console.log('[EMAIL] CLIENT_URL:', CLIENT_URL)
console.log('[EMAIL] ─────────────────────────────────────────────')

// ─── Create transporter (no lazy verify — just create it) ─────────────────────
const createTransporter = () => {
  if (!SMTP_HOST || !SMTP_PASS) {
    console.warn('[EMAIL] ⚠️  SMTP_HOST or SMTP_PASS not set — emails DISABLED')
    return null
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    tls: { rejectUnauthorized: false }, // allow self-signed in dev
    connectionTimeout: 10000,
    greetingTimeout: 10000,
  })
}

// ─── Core send function ───────────────────────────────────────────────────────
const sendMail = async (to: string, subject: string, html: string, label: string): Promise<void> => {
  const t = createTransporter()

  if (!t) {
    // Dev/no-config mode — log the full URL so developer can use it directly
    console.log(`[EMAIL DEV] ${label} to ${to} — NOT SENT (no SMTP config)`)
    return
  }

  console.log(`[EMAIL] Sending ${label} to ${to}…`)
  try {
    const info = await t.sendMail({ from: EMAIL_FROM, to, subject, html })
    console.log(`[EMAIL] ✅ ${label} sent → ${to} (messageId: ${info.messageId})`)
  } catch (err: any) {
    console.error(`[EMAIL] ❌ FAILED ${label} → ${to}: ${err.message}`)
    console.error(`[EMAIL]   code: ${err.code}, command: ${err.command}`)
    throw err
  }
}

// ─── HTML template ────────────────────────────────────────────────────────────
const html = (body: string) => `<!DOCTYPE html>
<html lang="pt"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:20px;background:#0A141A;font-family:Arial,sans-serif">
<div style="max-width:520px;margin:0 auto;background:#102129;border-radius:16px;padding:36px 32px;border:1px solid #1E3340">
  <div style="margin-bottom:24px">
    <span style="font-size:20px;font-weight:700;color:#F5F7FA">Between Us</span>
    <span style="display:block;font-size:12px;color:#7E8FA3;margin-top:2px">Adult connections. Private by design.</span>
  </div>
  ${body}
  <div style="margin-top:28px;padding-top:18px;border-top:1px solid #1E3340;font-size:11px;color:#7E8FA3">
    <p style="margin:0">© Between Us. Se não solicitaste este email, podes ignorá-lo.</p>
  </div>
</div>
</body></html>`

const btn = (url: string, text: string) =>
  `<a href="${url}" style="display:inline-block;background:#B8A7FF;color:#0A141A;text-decoration:none;padding:12px 26px;border-radius:50px;font-weight:700;font-size:15px;margin:18px 0">${text}</a>`

// ─── Exported functions ───────────────────────────────────────────────────────
export const sendVerificationEmail = async (email: string, userId: string, token: string): Promise<void> => {
  const url = `${CLIENT_URL}/verify-email?userId=${encodeURIComponent(userId)}&token=${encodeURIComponent(token)}`
  console.log(`[EMAIL] Verification URL: ${url}`)
  await sendMail(email, 'Confirma o teu email — Between Us', html(`
    <h2 style="font-size:20px;color:#F5F7FA;margin:0 0 10px">Confirma o teu email</h2>
    <p style="color:#AAB6C2;line-height:1.6;margin:0 0 4px">
      Clica no botão abaixo para activar a tua conta.<br>
      O link expira em <strong style="color:#F5F7FA">1 hora</strong>.
    </p>
    ${btn(url, 'Confirmar email')}
    <p style="font-size:12px;color:#7E8FA3;margin:6px 0 0">
      Não consegues clicar? Copia este link:<br>
      <span style="color:#B8A7FF;word-break:break-all">${url}</span>
    </p>
  `), 'verification')
}

export const sendPasswordResetEmail = async (email: string, userId: string, token: string): Promise<void> => {
  const url = `${CLIENT_URL}/reset-password?userId=${encodeURIComponent(userId)}&token=${encodeURIComponent(token)}`
  console.log(`[EMAIL] Password reset URL: ${url}`)
  await sendMail(email, 'Repõe a tua password — Between Us', html(`
    <h2 style="font-size:20px;color:#F5F7FA;margin:0 0 10px">Repõe a tua password</h2>
    <p style="color:#AAB6C2;line-height:1.6;margin:0 0 4px">
      Clica no botão abaixo para definir uma nova password.<br>
      O link expira em <strong style="color:#F5F7FA">1 hora</strong>.
    </p>
    ${btn(url, 'Repor password')}
    <p style="font-size:12px;color:#7E8FA3;margin:6px 0 0">
      Se não solicitaste este reset, a tua password não foi alterada.
    </p>
  `), 'password-reset')
}

export const sendWelcomeEmail = async (email: string, displayName?: string): Promise<void> => {
  await sendMail(email, 'Bem-vindo/a ao Between Us', html(`
    <h2 style="font-size:20px;color:#F5F7FA;margin:0 0 10px">
      Bem-vindo/a${displayName ? ', ' + displayName : ''}!
    </h2>
    <p style="color:#AAB6C2;line-height:1.6;margin:0 0 4px">
      A tua conta está activa. Completa o teu perfil para começares a aparecer no discovery.
    </p>
    ${btn(`${CLIENT_URL}/create-profile`, 'Completar perfil')}
    <p style="font-size:12px;color:#7E8FA3;margin:6px 0 0">
      A tua privacidade é a nossa prioridade.
    </p>
  `), 'welcome')
}

export const sendMatchEmail = async (email: string, matchName: string): Promise<void> => {
  await sendMail(email, 'Novo match — Between Us', html(`
    <h2 style="font-size:20px;color:#F5F7FA;margin:0 0 10px">💫 Novo match!</h2>
    <p style="color:#AAB6C2;line-height:1.6;margin:0 0 16px">
      Tens um novo match com <strong style="color:#F5F7FA">${matchName}</strong>.
    </p>
    ${btn(`${CLIENT_URL}/matches`, 'Ver matches')}
  `), 'match')
}

// ─── Diagnostic export (for admin panel) ─────────────────────────────────────
export const getEmailConfig = () => ({
  SMTP_HOST:  SMTP_HOST  || null,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS:  SMTP_PASS  ? `set (${SMTP_PASS.slice(0,8)}…)` : null,
  EMAIL_FROM,
  CLIENT_URL,
  configured: !!(SMTP_HOST && SMTP_PASS),
})
