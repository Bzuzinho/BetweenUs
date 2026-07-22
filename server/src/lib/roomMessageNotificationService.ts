import prisma from './prisma'
import { getIo } from './socketRegistry'
import { notifyUserChannels } from './notify'

const COPY: Record<string, { title: string; body: (sender: string) => string }> = {
  'pt-PT': { title:'Nova mensagem', body:sender => `${sender} enviou-te uma mensagem.` },
  en: { title:'New message', body:sender => `${sender} sent you a message.` },
  fr: { title:'Nouveau message', body:sender => `${sender} vous a envoyé un message.` },
}

export const isUserActivelyViewingRoom = (userId: string, roomId: string): boolean => {
  const io = getIo()
  if (!io) return false
  return [...io.of('/').sockets.values()].some(socket =>
    socket.connected
    && socket.data?.userId === userId
    && socket.data?.activeRoomId === roomId
  )
}

export const notifyRoomMessageRecipients = async (
  roomId: string,
  senderUserId: string,
  message: { id: string; body?: string | null; messageType?: string }
): Promise<void> => {
  try {
    const [room, sender, languageRows] = await Promise.all([
      (prisma as any).privateRoom.findUnique({
        where:{ id:roomId },
        select:{
          title:true,
          members:{
            where:{ leftAt:null, status:'ACCEPTED', NOT:{ userId:senderUserId } },
            select:{ user:{ select:{ id:true, roomMessageNotificationsEnabled:true, roomMessagePushEnabled:true } } },
          },
        },
      }),
      prisma.user.findUnique({ where:{ id:senderUserId }, select:{ profile:{ select:{ displayName:true } } } }),
      prisma.$queryRaw<Array<{ id:string; preferredLanguage:string }>>`
        SELECT id, "preferredLanguage" FROM "users"
        WHERE id IN (
          SELECT "userId" FROM "private_room_members"
          WHERE "privateRoomId" = ${roomId} AND "leftAt" IS NULL AND status = 'ACCEPTED' AND "userId" <> ${senderUserId}
        )
      `,
    ])
    if (!room) return

    const senderName = sender?.profile?.displayName || 'Between Us'
    const languageByUser = new Map(languageRows.map(row => [row.id, row.preferredLanguage]))

    await Promise.all((room.members || []).map(async (member: any) => {
      const recipient = member.user
      if (!recipient || isUserActivelyViewingRoom(recipient.id, roomId)) return
      if (!recipient.roomMessageNotificationsEnabled && !recipient.roomMessagePushEnabled) return

      const copy = COPY[languageByUser.get(recipient.id) || 'pt-PT'] || COPY['pt-PT']
      await notifyUserChannels(
        recipient.id,
        'room_message',
        copy.title,
        copy.body(senderName),
        { tab:'rooms', roomId, messageId:message.id, url:`/rooms?roomId=${encodeURIComponent(roomId)}` },
        {
          bell:recipient.roomMessageNotificationsEnabled,
          push:recipient.roomMessagePushEnabled,
        }
      )
    }))
  } catch (err: any) {
    console.error('[ROOM MESSAGE NOTIFY]', err.message)
  }
}
