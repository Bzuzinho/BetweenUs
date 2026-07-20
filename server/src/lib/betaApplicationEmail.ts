const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY
const EMAIL_FROM = process.env.EMAIL_FROM || 'Between Us <emailtemp02@gmail.com>'
const EMAIL_FROM_ADDRESS = EMAIL_FROM.match(/<(.+)>/)?.[1] || EMAIL_FROM
const EMAIL_FROM_NAME = EMAIL_FROM.replace(/\s*<.+>\s*/, '').trim() || 'Between Us'
const BETA_APPLICATION_NOTIFY_EMAIL = process.env.BETA_APPLICATION_NOTIFY_EMAIL || 'info@betweenus.pt'

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;')

export async function sendBetaApplicationNotification(email: string, createdAt: Date) {
  if (!SENDGRID_API_KEY) {
    console.warn('[BETA APPLICATION EMAIL] skipped — SENDGRID_API_KEY is not configured')
    return
  }

  const safeEmail = escapeHtml(email)
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: BETA_APPLICATION_NOTIFY_EMAIL }] }],
      from: { email: EMAIL_FROM_ADDRESS, name: EMAIL_FROM_NAME },
      subject: 'Novo pedido de acesso beta — Between Us',
      content: [{
        type: 'text/html',
        value: `<!doctype html><html lang="pt"><body style="font-family:Arial,sans-serif;background:#0A141A;color:#F5F7FA;padding:24px">
          <div style="max-width:560px;margin:auto;background:#102129;border:1px solid #1E3340;border-radius:16px;padding:28px">
            <h2 style="margin-top:0">Novo pedido de acesso beta</h2>
            <p><strong>Email:</strong> ${safeEmail}</p>
            <p><strong>Data:</strong> ${createdAt.toLocaleString('pt-PT')}</p>
            <p style="color:#AAB6C2">O pedido foi guardado na base de dados com o estado PENDING.</p>
          </div>
        </body></html>`
      }]
    })
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`SendGrid ${response.status}: ${body.slice(0, 300)}`)
  }
}
