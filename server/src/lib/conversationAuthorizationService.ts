// Security fix (Closed Beta audit, FASE 1.1) — mirrors roomAuthorizationService.ts's
// pattern for Private Room. Before this, Socket.IO's 'join_conversation' and 'typing'
// handlers (server/src/index.ts) joined/broadcast to `conversation:<id>` rooms using an
// id fully controlled by the client, with NO check that the connected user is actually
// a participant (profileOneId/profileTwoId) of the Match behind that Conversation. Any
// authenticated socket that knew or guessed a conversationId could join the room and both
// receive and spoof 'typing' events for a conversation it does not belong to.
//
// REST already gets this right (matches.ts's verifyMatchMembership, used by
// GET/POST /api/matches/:id/messages) — this service is the Socket.IO-side equivalent,
// resolving Conversation -> Match -> active ProfileMember the same way
// roomAuthorizationService.resolveRoomMembership resolves PrivateRoom -> Match.
import prisma from './prisma'
import { isActiveMember } from './profileMembershipService'

export interface ConversationAuthResult {
  ok: boolean
  reason?: string
}

export const resolveConversationMembership = async (
  conversationId: string | undefined | null,
  userId: string
): Promise<ConversationAuthResult> => {
  if (!conversationId) return { ok: false, reason: 'conversationId em falta.' }

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { match: { select: { profileOneId: true, profileTwoId: true } } }
  })
  if (!conversation) return { ok: false, reason: 'Conversa não encontrada.' }

  const { profileOneId, profileTwoId } = conversation.match
  const member = (await isActiveMember(profileOneId, userId)) || (await isActiveMember(profileTwoId, userId))
  if (!member) return { ok: false, reason: 'Sem acesso a esta conversa.' }

  return { ok: true }
}
