import nodemailer from 'nodemailer'

const isProd = process.env.NODE_ENV === 'production'

// ─── Diagnostic on startup ────────────────────────────────────────────────────
const SMTP_HOST = process.env.SMTP_HOST
const SMTP_PASS = process.env.SMTP_PASS
const SMTP_USER = process.env.SMTP_USER || 'resend'
const SMTP_PORT = Number(process.env.SMTP_PORT || 465)
const EMAIL_FROM = process.env.EMAIL_FROM || 'Between Us <noreply@betweenus.app>'
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000'

// Log config state at module load — visible in Railway logs
console.log('[EMAIL] Config check:')
console.log('[EMAIL]   SMTP_HOST:', SMTP_HOST || '⚠️  NOT SET')
console.log('[EMAIL]   SMTP_USER:', SMTP_USER)
console.log('[EMAIL]   SMTP_PORT:', SMTP_PORT)
console.log('[EMAIL]   SMTP_PASS:', SMTP_PASS ? `✅ set (${SMTP_PASS.slice(0,6)}…)` : '⚠️  NOT SET')
console.log('[EMAIL]   EMAIL_FROM:', EMAIL_FROM)
console.log('[EMAIL]   CLIENT_URL:', CLIENT_URL)

// ─── Transporter ──────────────────────────────────────────────────────────────
let transporter: nodemailer.Transporter | null = null

const getTransporter = (): nodemailer.Transporter | null => {
  if (transporter) return transporter

  if (!SMTP_HOST || !SMTP_PASS) {
    console.warn('[EMAIL] ⚠️  No SMTP config — emails will NOT be sent.')
    console.warn('[EMAIL] Set SMTP_HOST and SMTP_PASS in Railway environment variables.')
    return null
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    // Resend requires TLS even on 465
    tls: { rejectUnauthorized: true },
  })

  // Verify connection on first use
  transporter.verify().then(() => {
    console.log('[EMAIL] ✅ SMTP connection verified — ready to send')
  }).catch(err => {
    console.error('[EMAIL] ❌ SMTP connection FAILED:', err.message)
    console.error('[EMAIL]   Check: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS')
    // Reset so next call tries again
    transporter = null
  })

  return transporter
}

// ─── Send helper with full error logging ──────────────────────────────────────
const send = async (to: string, subject: string, html: string, label: string): Promise<void> => {
  const t = getTransporter()

  if (!t) {
    // Dev fallback — log URL to console so developer can click it
    console.log(`[EMAIL DEV] ${label} → ${to} (not sent — no SMTP config)`)
    return
  }

  try {
    const info = await t.sendMail({ from: EMAIL_FROM, to, subject, html })
    console.log(`[EMAIL] ✅ ${label} sent to ${to} — messageId: ${info.messageId}`)
  } catch (err: any) {
    console.error(`[EMAIL] ❌ FAILED to send ${label} to ${to}:`, err.message)
    // Re-throw so caller can handle/log
    throw err
  }
}

// ─── Templates ────────────────────────────────────────────────────────────────
const base = (content: string) => `
<!DOCTYPE html>
<html lang="pt">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:20px;background:#0A141A;font-family:Inter,Arial,sans-serif">
  <div style="max-width:520px;margin:0 auto;background:#102129;border-radius:16px;padding:40px 32px;border:1px solid #1E3340">
    <div style="margin-bottom:28px">
      <span style="font-size:22px;font-weight:600;color:#F5F7FA">Between Us</span>
      <span style="font-size:12px;color:#7E8FA3;display:block;margin-top:4px">Adult connections. Private by design.</span>
    </div>
    ${content}
    <div style="margin-top:32px;padding-top:20px;border-top:1px solid #1E3340;font-size:12px;color:#7E8FA3">
      <p style="margin:0">© Between Us. Todos os direitos reservados.</p>
      <p style="margin:4px 0 0">Se não pediste este email, podes ignorá-lo em segurança.</p>
    </div>
  </div>
</body>
</html>`

const btn = (url: string, text: string) =>
  `<a href="${url}" style="display:inline-block;background:#B8A7FF;color:#0A141A;text-decoration:none;padding:13px 28px;border-radius:50px;font-weight:600;font-size:15px;margin:20px 0">${text}</a>`

// ─── Exports ──────────────────────────────────────────────────────────────────
export const sendVerificationEmail = async (email: string, userId: string, token: string): Promise<void> => {
  const url = `${CLIENT_URL}/verify-email?userId=${userId}&token=${encodeURIComponent(token)}`
  console.log(`[EMAIL] Sending verification to ${email} — url: ${url}`)

  await send(email,
    'Confirma o teu email — Between Us',
    base(`
      <h2 style="font-size:20px;font-weight:500;color:#F5F7FA;margin:0 0 12px">Confirma o teu email</h2>
      <p style="color:#AAB6C2;line-height:1.6;margin:0 0 8px">
        Clica no botão abaixo para activar a tua conta.<br>O link expira em <strong style="color:#F5F7FA">1 hora</strong>.
      </p>
      ${btn(url, 'Confirmar email')}
      <p style="color:#7E8FA3;font-size:13px;margin:8px 0 0">
        Não consegues clicar? Copia este link:<br>
        <span style="color:#B8A7FF;word-break:break-all;font-size:12px">${url}</span>
      </p>
    `),
    'verification'
  )
}

export const sendPasswordResetEmail = async (email: string, userId: string, token: string): Promise<void> => {
  const url = `${CLIENT_URL}/reset-password?userId=${userId}&token=${encodeURIComponent(token)}`
  console.log(`[EMAIL] Sending password reset to ${email}`)

  await send(email,
    'Repõe a tua password — Between Us',
    base(`
      <h2 style="font-size:20px;font-weight:500;color:#F5F7FA;margin:0 0 12px">Repõe a tua password</h2>
      <p style="color:#AAB6C2;line-height:1.6;margin:0 0 8px">
        Recebemos um pedido de recuperação de password para esta conta.<br>
        O link expira em <strong style="color:#F5F7FA">1 hora</strong>.
      </p>
      ${btn(url, 'Repor password')}
      <p style="color:#7E8FA3;font-size:13px;margin:8px 0 0">
        Se não pediste este reset, a tua password não foi alterada.
      </p>
    `),
    'password-reset'
  )
}

export const sendWelcomeEmail = async (email: string, displayName?: string): Promise<void> => {
  await send(email,
    'Bem-vindo/a ao Between Us',
    base(`
      <h2 style="font-size:20px;font-weight:500;color:#F5F7FA;margin:0 0 12px">
        Bem-vindo/a${displayName ? ', ' + displayName : ''}!
      </h2>
      <p style="color:#AAB6C2;line-height:1.6;margin:0 0 16px">
        A tua conta está activa. Completa o teu perfil para começar a aparecer no discovery.
      </p>
      ${btn(`${CLIENT_URL}/create-profile`, 'Completar perfil')}
      <p style="color:#7E8FA3;font-size:13px;line-height:1.6;margin:8px 0 0">
        A tua privacidade é a nossa prioridade.<br>
        As tuas fotos são moderadas antes de ficarem visíveis.<br>
        Podes apagar a tua conta e dados a qualquer momento.
      </p>
    `),
    'welcome'
  )
}

export const sendMatchEmail = async (email: string, matchName: string): Promise<void> => {
  await send(email,
    'Novo match — Between Us',
    base(`
      <h2 style="font-size:20px;font-weight:500;color:#F5F7FA;margin:0 0 12px">💫 Novo match!</h2>
      <p style="color:#AAB6C2;line-height:1.6;margin:0 0 16px">
        Tens um novo match com <strong style="color:#F5F7FA">${matchName}</strong>.<br>
        Abre a aplicação para começar a conversar.
      </p>
      ${btn(`${CLIENT_URL}/matches`, 'Ver matches')}
    `),
    'match'
  )
}
