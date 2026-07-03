// Between Us — Email service via Resend HTTP API
// Docs: https://resend.com/docs/api-reference/emails/send-email

const RESEND_API_KEY = process.env.SMTP_PASS       // reuse SMTP_PASS for Resend API key
const EMAIL_FROM     = process.env.EMAIL_FROM || 'Between Us <onboarding@resend.dev>'
const CLIENT_URL     = process.env.CLIENT_URL || 'http://localhost:3000'

// ─── Startup diagnostics ──────────────────────────────────────────────────────
console.log('[EMAIL] ── CONFIG ─────────────────────────────────────')
console.log('[EMAIL] RESEND_API_KEY:', RESEND_API_KEY ? `✅ set (${RESEND_API_KEY.slice(0,8)}…)` : '❌ NOT SET (SMTP_PASS)')
console.log('[EMAIL] EMAIL_FROM    :', EMAIL_FROM)
console.log('[EMAIL] CLIENT_URL    :', CLIENT_URL)
console.log('[EMAIL] ─────────────────────────────────────────────')
console.log('[EMAIL] NOTE: onboarding@resend.dev only delivers to Resend account owner.')
console.log('[EMAIL] To send to anyone: verify domain at resend.com/domains')
console.log('[EMAIL]   then set EMAIL_FROM=Between Us <noreply@yourdomain.com>')

// ─── Core send via Resend HTTP API ───────────────────────────────────────────
const sendEmail = async (to: string, subject: string, html: string, label: string): Promise<void> => {
  if (!RESEND_API_KEY) {
    console.warn(`[EMAIL] ⚠️  No RESEND_API_KEY — skipping ${label} to ${to}`)
    return
  }

  console.log(`[EMAIL] Sending ${label} → ${to}`)

  const payload = JSON.stringify({ from: EMAIL_FROM, to: [to], subject, html })

  const https = await import('https')
  const url = new URL('https://api.resend.com/emails')

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      }
    }, (res) => {
      let body = ''
      res.on('data', chunk => body += chunk)
      res.on('end', () => {
        try {
          const data = JSON.parse(body)
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            console.log(`[EMAIL] ✅ ${label} sent → ${to} (id: ${data.id})`)
            resolve()
          } else {
            const errMsg = `Resend API error ${res.statusCode}: ${JSON.stringify(data)}`
            console.error(`[EMAIL] ❌ ${label} failed → ${to}: ${errMsg}`)
            // Log helpful hints based on error
            if (data.message?.includes('domain') || data.message?.includes('not verified')) {
              console.error('[EMAIL] 💡 Fix: verify your domain at resend.com/domains')
              console.error('[EMAIL]    Then update EMAIL_FROM to use your domain')
            }
            if (data.message?.includes('testing') || data.message?.includes('sandbox')) {
              console.error('[EMAIL] 💡 Fix: onboarding@resend.dev only sends to Resend account email')
              console.error('[EMAIL]    Verify a domain at resend.com/domains for unrestricted sending')
            }
            reject(new Error(errMsg))
          }
        } catch (e) {
          reject(new Error(`Failed to parse Resend response: ${body}`))
        }
      })
    })
    req.on('error', (err) => {
      console.error(`[EMAIL] ❌ Network error sending ${label}:`, err.message)
      reject(err)
    })
    req.write(payload)
    req.end()
  })
}

// ─── HTML template ────────────────────────────────────────────────────────────
const html = (body: string) => `<!DOCTYPE html>
<html lang="pt">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:20px;background:#0A141A;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:520px;margin:0 auto;background:#102129;border-radius:16px;padding:36px 32px;border:1px solid #1E3340">
  <div style="margin-bottom:24px">
    <div style="font-size:20px;font-weight:700;color:#F5F7FA;display:inline-flex;align-items:center;gap:10px">
      Between Us
    </div>
    <div style="font-size:12px;color:#7E8FA3;margin-top:4px">Adult connections. Private by design.</div>
  </div>
  ${body}
  <div style="margin-top:28px;padding-top:16px;border-top:1px solid #1E3340;font-size:11px;color:#7E8FA3">
    © Between Us. Se não solicitaste este email, podes ignorá-lo em segurança.
  </div>
</div>
</body></html>`

const btn = (url: string, text: string) =>
  `<a href="${url}" style="display:inline-block;background:#B8A7FF;color:#0A141A;text-decoration:none;padding:13px 28px;border-radius:50px;font-weight:700;font-size:15px;margin:20px 0">${text}</a>`

// ─── Exported email functions ─────────────────────────────────────────────────
export const sendVerificationEmail = async (email: string, userId: string, token: string): Promise<void> => {
  const url = `${CLIENT_URL}/verify-email?userId=${encodeURIComponent(userId)}&token=${encodeURIComponent(token)}`
  console.log(`[EMAIL] Verification URL (always logged): ${url}`)
  await sendEmail(email, 'Confirma o teu email — Between Us', html(`
    <h2 style="font-size:20px;color:#F5F7FA;margin:0 0 12px">Confirma o teu email</h2>
    <p style="color:#AAB6C2;line-height:1.6;margin:0 0 4px">
      Clica no botão abaixo para activar a tua conta.<br>
      O link expira em <strong style="color:#F5F7FA">1 hora</strong>.
    </p>
    ${btn(url, 'Confirmar email')}
    <p style="font-size:12px;color:#7E8FA3;margin:4px 0 0">
      Ou copia este link:<br>
      <span style="color:#B8A7FF;word-break:break-all">${url}</span>
    </p>
  `), 'verification')
}

export const sendPasswordResetEmail = async (email: string, userId: string, token: string): Promise<void> => {
  const url = `${CLIENT_URL}/reset-password?userId=${encodeURIComponent(userId)}&token=${encodeURIComponent(token)}`
  console.log(`[EMAIL] Password reset URL (always logged): ${url}`)
  await sendEmail(email, 'Repõe a tua password — Between Us', html(`
    <h2 style="font-size:20px;color:#F5F7FA;margin:0 0 12px">Repõe a tua password</h2>
    <p style="color:#AAB6C2;line-height:1.6;margin:0 0 4px">
      Clica no botão para definir uma nova password.<br>
      O link expira em <strong style="color:#F5F7FA">1 hora</strong>.
    </p>
    ${btn(url, 'Repor password')}
    <p style="font-size:12px;color:#7E8FA3;margin:4px 0 0">
      Se não pediste este reset, ignora este email.
    </p>
  `), 'password-reset')
}

export const sendWelcomeEmail = async (email: string, displayName?: string): Promise<void> => {
  await sendEmail(email, 'Bem-vindo/a ao Between Us', html(`
    <h2 style="font-size:20px;color:#F5F7FA;margin:0 0 12px">Bem-vindo/a${displayName ? ', ' + displayName : ''}!</h2>
    <p style="color:#AAB6C2;line-height:1.6;margin:0 0 16px">
      A tua conta está activa. Completa o teu perfil para começares a aparecer no discovery.
    </p>
    ${btn(`${CLIENT_URL}/create-profile`, 'Completar perfil')}
  `), 'welcome')
}

export const sendMatchEmail = async (email: string, matchName: string): Promise<void> => {
  await sendEmail(email, 'Novo match — Between Us', html(`
    <h2 style="font-size:20px;color:#F5F7FA;margin:0 0 12px">💫 Novo match!</h2>
    <p style="color:#AAB6C2;line-height:1.6;margin:0 0 16px">
      Tens um novo match com <strong style="color:#F5F7FA">${matchName}</strong>.
    </p>
    ${btn(`${CLIENT_URL}/matches`, 'Ver matches')}
  `), 'match')
}

export const getEmailConfig = () => ({
  RESEND_API_KEY: RESEND_API_KEY ? `set (${RESEND_API_KEY.slice(0,8)}…)` : null,
  EMAIL_FROM,
  CLIENT_URL,
  configured: !!RESEND_API_KEY,
  mode: 'resend-http-api',
  warning: EMAIL_FROM.includes('onboarding@resend.dev')
    ? 'onboarding@resend.dev only delivers to Resend account owner email. Verify domain at resend.com/domains for unrestricted sending.'
    : null
})
