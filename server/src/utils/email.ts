import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
})

export const sendVerificationEmail = async (email: string, token: string) => {
  const url = `${process.env.CLIENT_URL}/verify-email?token=${token}`
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'Between Us <noreply@betweenus.app>',
    to: email,
    subject: 'Confirma o teu email — Between Us',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
        <h2 style="color:#C9956B;">Between Us</h2>
        <p>Confirma o teu email para ativares a tua conta.</p>
        <a href="${url}" style="display:inline-block;background:#C9956B;color:#1A0A2E;padding:14px 28px;border-radius:50px;text-decoration:none;font-weight:600;margin:16px 0;">
          Confirmar email
        </a>
        <p style="color:#888;font-size:12px;">Link válido por 24 horas. Se não criaste esta conta, ignora este email.</p>
      </div>
    `
  })
}

export const sendPasswordResetEmail = async (email: string, token: string) => {
  const url = `${process.env.CLIENT_URL}/reset-password?token=${token}`
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'Between Us <noreply@betweenus.app>',
    to: email,
    subject: 'Recuperar password — Between Us',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
        <h2 style="color:#C9956B;">Between Us</h2>
        <p>Recebemos um pedido para recuperar a tua password.</p>
        <a href="${url}" style="display:inline-block;background:#C9956B;color:#1A0A2E;padding:14px 28px;border-radius:50px;text-decoration:none;font-weight:600;margin:16px 0;">
          Redefinir password
        </a>
        <p style="color:#888;font-size:12px;">Link válido por 1 hora. Se não pediste isto, ignora este email.</p>
      </div>
    `
  })
}
