// Idade a partir da data de nascimento — partilhado entre matches.ts (preview
// de pedidos de ligação, secção 4/5 do pedido de monetização) e
// discoveryService.ts (filtro de idade avançado, secção 10), para nunca
// existirem duas implementações de "quantos anos tem esta pessoa" que possam
// divergir.
export const ageFromDOB = (dob: Date): number => {
  const now = new Date()
  let age = now.getFullYear() - dob.getFullYear()
  const monthDiff = now.getMonth() - dob.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) age--
  return age
}

// Bucket de 5 anos — nunca expõe a idade exacta de alguém a um viewer FREE
// (secção 4/5).
export const bucketAge = (age: number): string => {
  const start = Math.floor(age / 5) * 5
  return `${start}-${start + 4}`
}
