/**
 * Emergency password reset — run directly in Railway's Console tab, e.g.:
 *
 *   npm run reset-password -- ricardo.jgvf@gmail.com "NovaPasswordForte123!"
 *
 * Use this only when email delivery is unavailable (e.g. SMTP misconfigured).
 * Password must be at least 8 characters, matching the normal registration rule.
 */
import bcrypt from 'bcryptjs'
import prisma from '../lib/prisma'

async function main() {
  const [, , email, newPassword] = process.argv

  if (!email || !newPassword) {
    console.error('Uso: npm run reset-password -- <email> <nova-password>')
    process.exit(1)
  }
  if (newPassword.length < 8) {
    console.error('A password deve ter pelo menos 8 caracteres.')
    process.exit(1)
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    console.error(`Nenhum utilizador encontrado com o email: ${email}`)
    process.exit(1)
  }

  const passwordHash = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } })

  console.log(`✅ Password reposta com sucesso para ${email} (userId: ${user.id})`)
  console.log('Podes agora entrar na app com a nova password.')
}

main()
  .catch(err => { console.error('Falhou:', err.message); process.exit(1) })
  .finally(() => process.exit(0))
