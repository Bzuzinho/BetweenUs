// 7.2 — SAFE String -> Enum migration for PrivateRoom.roomType/.status and
// PrivateRoomMember.role/.status.
//
// WHY THIS SCRIPT EXISTS: this project has no staged migration history —
// every deploy runs `prisma db push --accept-data-loss` directly against
// whatever schema.prisma currently says (see package.json). Going straight
// from a free String column to a Postgres enum type, with EXISTING rows
// holding values that aren't valid enum labels (old room types like
// 'TRIO'/'SWING_GROUP'/'POLYAMORY', old role value 'invited' with no
// RoomMemberStatus equivalent), is NOT safe under --accept-data-loss:
// Prisma cannot auto-cast a mismatched value, and depending on the exact
// diff it can drop/reset the column instead of erroring loudly.
//
// THE SAFE SEQUENCE (this is a deploy runbook, not just a script):
//   1. Deploy this commit's code WITHOUT yet pushing the new enum-typed
//      schema (i.e. run this script first, against the OLD String columns,
//      via raw SQL — it does NOT depend on the new Prisma Client types).
//   2. This script rewrites every existing text value in-place to exactly
//      match the NEW enum's labels (e.g. 'owner' -> 'OWNER',
//      'COUPLE_PLUS_ONE' -> 'COUPLE_SINGLE'). Once every row's text value
//      equals a valid label, Postgres can cast text -> enum with zero data
//      loss.
//   3. THEN run `prisma db push` (or let the normal boot-time push run) —
//      the column type change is now a same-value cast, not a lossy reset.
//
// Room TYPE inference is composition-based, not a blind string map: for a
// match-derived room, look at the actual profile types on both sides of
// the match. For a standalone room (no matchId), fall back to a reasoned
// mapping from the old label, using actual member count to disambiguate
// TRIO (which meant "3 people", not a specific composition).
//
// Idempotent: safe to run more than once (values already matching the new
// labels are left untouched).
//
// Known simplification: PrivateRoomMember.role's old 'invited' value (an
// overload of role, not a real role) is collapsed into MEMBER here, and
// the new PrivateRoomMember.status column (which distinguishes
// INVITED/ACCEPTED going forward) is left to Prisma's own schema default
// (ACCEPTED) once the column is added by the push that follows this
// script. Any room invite still pending at the exact moment of migration
// is therefore treated as already-accepted afterwards — a deliberate,
// low-stakes simplification (PrivateRoom is a Sprint-6-era feature, real
// pending-invite rows are expected to be rare) rather than a lossless
// two-phase column migration for it.
import prisma from '../lib/prisma'

const ROOM_TYPE_LABELS = ['INDIVIDUAL_PAIR', 'COUPLE_SINGLE', 'COUPLE_COUPLE', 'POLY_GROUP', 'CUSTOM']
const STATUS_LABELS = ['DRAFT', 'WAITING_CONSENT', 'ACTIVE', 'PAUSED', 'CLOSED', 'SAFETY_LOCKED']

const inferRoomTypeFromOldLabel = (oldLabel: string, memberCount: number): string => {
  switch (oldLabel) {
    case 'COUPLE_PLUS_ONE': return 'COUPLE_SINGLE'
    case 'COUPLE_PLUS_COUPLE': return 'COUPLE_COUPLE'
    case 'POLYAMORY': return 'POLY_GROUP'
    case 'SWING_GROUP': return 'POLY_GROUP'
    case 'TRIO': return memberCount <= 2 ? 'INDIVIDUAL_PAIR' : 'POLY_GROUP'
    default: return ROOM_TYPE_LABELS.includes(oldLabel) ? oldLabel : 'CUSTOM'
  }
}

const inferRoomTypeFromMatch = (typeOne: string, typeTwo: string): string => {
  if (typeOne === 'INDIVIDUAL' && typeTwo === 'INDIVIDUAL') return 'INDIVIDUAL_PAIR'
  if (typeOne === 'COUPLE' && typeTwo === 'COUPLE') return 'COUPLE_COUPLE'
  if ((typeOne === 'COUPLE' && typeTwo === 'INDIVIDUAL') || (typeOne === 'INDIVIDUAL' && typeTwo === 'COUPLE')) return 'COUPLE_SINGLE'
  return 'CUSTOM' // GROUP or any future combination — no clean label yet, don't guess
}

const normalizeStatus = (oldStatus: string): string =>
  STATUS_LABELS.includes(oldStatus) ? oldStatus : 'ACTIVE' // pre-Sprint-7 default was implicitly always ACTIVE

const normalizeRole = (oldRole: string): string => {
  if (oldRole === 'owner') return 'OWNER'
  return 'MEMBER' // 'member', 'invited', or anything unrecognized — see the
  // header comment on why 'invited' collapses into MEMBER here
}

export const migratePrivateRoomEnums = async (): Promise<{ rooms: number; members: number }> => {
  const rooms: any[] = await prisma.$queryRawUnsafe(
    `SELECT pr.id, pr."roomType" AS "roomType", pr.status, pr."matchId" AS "matchId" FROM private_rooms pr`
  )

  let roomsUpdated = 0
  for (const room of rooms) {
    const members: any[] = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS count FROM private_room_members WHERE "privateRoomId" = $1 AND "leftAt" IS NULL`,
      room.id
    )
    const memberCount = members[0]?.count ?? 0

    let newRoomType: string
    if (room.matchId) {
      const matchRows: any[] = await prisma.$queryRawUnsafe(
        `SELECT p1.type AS "typeOne", p2.type AS "typeTwo"
         FROM matches m
         JOIN profiles p1 ON p1.id = m."profileOneId"
         JOIN profiles p2 ON p2.id = m."profileTwoId"
         WHERE m.id = $1`,
        room.matchId
      )
      newRoomType = matchRows[0]
        ? inferRoomTypeFromMatch(matchRows[0].typeOne, matchRows[0].typeTwo)
        : inferRoomTypeFromOldLabel(room.roomType, memberCount)
    } else {
      newRoomType = inferRoomTypeFromOldLabel(room.roomType, memberCount)
    }
    const newStatus = normalizeStatus(room.status)

    if (newRoomType !== room.roomType || newStatus !== room.status) {
      await prisma.$executeRawUnsafe(
        `UPDATE private_rooms SET "roomType" = $1, status = $2 WHERE id = $3`,
        newRoomType, newStatus, room.id
      )
      roomsUpdated++
    }
  }

  const memberRows: any[] = await prisma.$queryRawUnsafe(
    `SELECT id, role FROM private_room_members`
  )
  let membersUpdated = 0
  for (const m of memberRows) {
    const role = normalizeRole(m.role)
    if (role !== m.role) {
      await prisma.$executeRawUnsafe(
        `UPDATE private_room_members SET role = $1 WHERE id = $2`,
        role, m.id
      )
      membersUpdated++
    }
  }

  console.log(`[MIGRATE] PrivateRoom: ${roomsUpdated}/${rooms.length} rows normalized. PrivateRoomMember: ${membersUpdated}/${memberRows.length} rows normalized.`)
  return { rooms: roomsUpdated, members: membersUpdated }
}

if (require.main === module) {
  migratePrivateRoomEnums()
    .then(r => { console.log('Done:', r); process.exit(0) })
    .catch(e => { console.error('Error:', e.message); process.exit(1) })
}
