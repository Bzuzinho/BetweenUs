import { notifyAdmins, notifyProfileMembers, notifyUser } from './notify'

export type ModeratedContent = 'profile' | 'photo' | 'verification' | 'event'
export type ModerationDecision = 'APPROVED' | 'REJECTED'

const contentCopy: Record<ModeratedContent, { singular: string; destination: string }> = {
  profile: { singular: 'perfil', destination: 'profile' },
  photo: { singular: 'fotografia', destination: 'photos' },
  verification: { singular: 'verificação de identidade', destination: 'verify' },
  event: { singular: 'evento', destination: 'guide' },
}

const pendingCopy = (content: ModeratedContent) => {
  const label = contentCopy[content].singular
  return {
    type: `moderation_${content}_pending`,
    title: 'Em aprovação',
    body: `O teu ${label} foi recebido e está pendente de aprovação. Avisamos-te assim que a análise estiver concluída.`,
  }
}

const decisionCopy = (content: ModeratedContent, decision: ModerationDecision, reason?: string | null) => {
  const label = contentCopy[content].singular
  if (decision === 'APPROVED') {
    return {
      type: `moderation_${content}_approved`,
      title: 'Aprovação concluída',
      body: `O teu ${label} foi aprovado.`,
    }
  }
  return {
    type: `moderation_${content}_rejected`,
    title: 'Alterações necessárias',
    body: reason
      ? `O teu ${label} não foi aprovado. Motivo: ${reason}`
      : `O teu ${label} não foi aprovado. Consulta os detalhes e volta a submeter depois das alterações.`,
  }
}

export const notifyUserModerationPending = async (
  userId: string,
  content: ModeratedContent,
  data: Record<string, any> = {},
) => {
  const copy = pendingCopy(content)
  await notifyUser(userId, copy.type, copy.title, copy.body, {
    ...data,
    tab: contentCopy[content].destination,
    moderationStatus: 'PENDING',
  })
}

export const notifyProfileModerationPending = async (
  profileId: string,
  content: Exclude<ModeratedContent, 'verification'>,
  data: Record<string, any> = {},
) => {
  const copy = pendingCopy(content)
  await notifyProfileMembers(profileId, copy.type, copy.title, copy.body, {
    ...data,
    profileId,
    tab: contentCopy[content].destination,
    moderationStatus: 'PENDING',
  })
}

export const notifyUserModerationDecision = async (
  userId: string,
  content: ModeratedContent,
  decision: ModerationDecision,
  reason?: string | null,
  data: Record<string, any> = {},
) => {
  const copy = decisionCopy(content, decision, reason)
  await notifyUser(userId, copy.type, copy.title, copy.body, {
    ...data,
    tab: contentCopy[content].destination,
    moderationStatus: decision,
  })
}

export const notifyProfileModerationDecision = async (
  profileId: string,
  content: Exclude<ModeratedContent, 'verification'>,
  decision: ModerationDecision,
  reason?: string | null,
  data: Record<string, any> = {},
) => {
  const copy = decisionCopy(content, decision, reason)
  await notifyProfileMembers(profileId, copy.type, copy.title, copy.body, {
    ...data,
    profileId,
    tab: contentCopy[content].destination,
    moderationStatus: decision,
  })
}

export const notifyAdminsOfModerationSubmission = async (
  content: ModeratedContent,
  submittedByLabel: string,
  data: Record<string, any> = {},
) => {
  const label = contentCopy[content].singular
  const body = content === 'event'
    ? `O evento “${submittedByLabel}” foi submetido para aprovação.`
    : `${submittedByLabel} submeteu um ${label} para aprovação.`
  await notifyAdmins(
    `moderation_${content}_submitted`,
    'Novo pedido de aprovação',
    body,
    data,
  )
}
