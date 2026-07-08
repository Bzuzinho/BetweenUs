// Prioridade de apresentação para utilizadores administrativos (e no geral):
// 1. accountName (nome real da Conta)
// 2. profile.displayName (nome visível do Perfil Público)
// 3. email — só como fallback técnico, nunca a primeira opção
// Ver Sprint 2.5.1 — não duplicar esta lógica noutros componentes.
export function getUserDisplayName(user) {
  if (!user) return ''
  if (user.accountName && user.accountName.trim()) return user.accountName.trim()
  if (user.profile?.displayName && user.profile.displayName.trim()) return user.profile.displayName.trim()
  if (user.email) return user.email
  return 'Utilizador'
}
