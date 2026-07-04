// Between Us — Email service via Resend HTTP API
// Uses SMTP_PASS as the Resend API key (reuse existing Railway variable)

const RESEND_API_KEY = process.env.SMTP_PASS
const EMAIL_FROM     = process.env.EMAIL_FROM || 'Between Us <onboarding@resend.dev>'
const CLIENT_URL     = process.env.CLIENT_URL || 'http://localhost:3000'

// Startup log
console.log('[EMAIL] ── CONFIG ────────────────────────────────')
console.log('[EMAIL] API KEY :', RESEND_API_KEY ? `✅ ${RESEND_API_KEY.slice(0,12)}…` : '❌ NOT SET')
console.log('[EMAIL] FROM    :', EMAIL_FROM)
console.log('[EMAIL] URL     :', CLIENT_URL)
if (EMAIL_FROM.includes('onboarding@resend.dev')) {
  console.log('[EMAIL] ⚠️  SANDBOX: only delivers to Resend account email (emailtemp02@gmail.com)')
  console.log('[EMAIL]    To send to anyone: verify domain at resend.com/domains')
}
console.log('[EMAIL] ────────────────────────────────────────')

// Core send function using Resend HTTP API
const sendEmail = async (to: string, subject: string, html: string, label: string): Promise<void> => {
  if (!RESEND_API_KEY) {
    console.warn(`[EMAIL] ⚠️  No API key — skipping ${label} to ${to}`)
    return
  }

  const payload = JSON.stringify({ from: EMAIL_FROM, to: [to], subject, html })
  console.log(`[EMAIL] → ${label} to ${to}`)

  const https = await import('https')
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.resend.com',
      path: '/emails',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      }
    }, (res) => {
      let body = ''
      res.on('data', d => body += d)
      res.on('end', () => {
        let data: any = {}
        try { data = JSON.parse(body) } catch {}
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`[EMAIL] ✅ Sent ${label} → ${to} (id: ${data.id})`)
          resolve()
        } else {
          console.error(`[EMAIL] ❌ Failed ${label} → ${to}: HTTP ${res.statusCode}`)
          console.error(`[EMAIL]    Response: ${body}`)
          if (body.includes('domain') || body.includes('not verified')) {
            console.error('[EMAIL] 💡 Fix: verify domain at resend.com/domains')
            console.error('[EMAIL]    Update EMAIL_FROM to use your verified domain')
          }
          if (body.includes('testing') || body.includes('You can only send')) {
            console.error('[EMAIL] 💡 Fix: onboarding@resend.dev only sends to account owner')
            console.error('[EMAIL]    Account email: emailtemp02@gmail.com')
            console.error('[EMAIL]    Either: test with emailtemp02@gmail.com as recipient')
            console.error('[EMAIL]    Or: verify domain at resend.com/domains')
          }
          reject(new Error(`Resend ${res.statusCode}: ${body}`))
        }
      })
    })
    req.on('error', err => {
      console.error(`[EMAIL] ❌ Network error: ${err.message}`)
      reject(err)
    })
    req.write(payload)
    req.end()
  })
}

// HTML template
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

// Exports
export const sendVerificationEmail = async (email: string, userId: string, token: string) => {
  const url = `${CLIENT_URL}/verify-email?userId=${encodeURIComponent(userId)}&token=${encodeURIComponent(token)}`
  console.log(`[EMAIL] Verify URL: ${url}`)  // always log so can be used manually
  await sendEmail(email, 'Confirma o teu email — Between Us', wrap(`
    <h2 style="font-size:20px;color:#F5F7FA;margin:0 0 12px">Confirma o teu email</h2>
    <p style="color:#AAB6C2;line-height:1.6;margin:0 0 8px">Clica no botão para activar a tua conta. O link expira em <strong style="color:#F5F7FA">1 hora</strong>.</p>
    ${btn(url, 'Confirmar email')}
    <p style="font-size:12px;color:#7E8FA3">Ou copia: <span style="color:#B8A7FF;word-break:break-all">${url}</span></p>
  `), 'verification')
}

export const sendPasswordResetEmail = async (email: string, userId: string, token: string) => {
  const url = `${CLIENT_URL}/reset-password?userId=${encodeURIComponent(userId)}&token=${encodeURIComponent(token)}`
  console.log(`[EMAIL] Reset URL: ${url}`)
  await sendEmail(email, 'Repõe a tua password — Between Us', wrap(`
    <h2 style="font-size:20px;color:#F5F7FA;margin:0 0 12px">Repõe a tua password</h2>
    <p style="color:#AAB6C2;line-height:1.6;margin:0 0 8px">O link expira em <strong style="color:#F5F7FA">1 hora</strong>.</p>
    ${btn(url, 'Repor password')}
  `), 'password-reset')
}

export const sendWelcomeEmail = async (email: string, displayName?: string) => {
  await sendEmail(email, 'Bem-vindo/a ao Between Us', wrap(`
    <h2 style="font-size:20px;color:#F5F7FA;margin:0 0 12px">Bem-vindo/a${displayName ? ', ' + displayName : ''}!</h2>
    <p style="color:#AAB6C2;line-height:1.6;margin:0 0 16px">A tua conta está activa. Completa o teu perfil.</p>
    ${btn(`${CLIENT_URL}/create-profile`, 'Completar perfil')}
  `), 'welcome')
}

export const sendMatchEmail = async (email: string, matchName: string) => {
  await sendEmail(email, 'Novo match — Between Us', wrap(`
    <h2 style="font-size:20px;color:#F5F7FA;margin:0 0 12px">💫 Novo match!</h2>
    <p style="color:#AAB6C2;line-height:1.6;margin:0 0 16px">Tens um novo match com <strong style="color:#F5F7FA">${matchName}</strong>.</p>
    ${btn(`${CLIENT_URL}/matches`, 'Ver matches')}
  `), 'match')
}

export const getEmailConfig = () => ({
  apiKey: RESEND_API_KEY ? `set (${RESEND_API_KEY.slice(0,12)}…)` : null,
  from: EMAIL_FROM,
  clientUrl: CLIENT_URL,
  configured: !!RESEND_API_KEY,
  sandbox: EMAIL_FROM.includes('onboarding@resend.dev'),
  sandboxNote: EMAIL_FROM.includes('onboarding@resend.dev')
    ? 'Sandbox mode: only delivers to emailtemp02@gmail.com (Resend account). Verify domain for unrestricted sending.'
    : null
})
