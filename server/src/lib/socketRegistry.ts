// 7.8/7.12 — small indirection so route/service code never has to
// `import('../index')` just to reach the Socket.IO server instance.
// Discovered while adding room message tests: rooms.ts's message-send
// route already did `const { io } = await import('../index')` (a
// pre-existing pattern, not introduced this sprint) - but src/index.ts's
// top level unconditionally calls httpServer.listen(...) with no
// require.main guard, so importing it as a module (as any test hitting
// this code path would) actually starts a second real HTTP server
// instead of just fetching a value. This registry lets index.ts publish
// its `io` instance once, and every consumer read it without ever
// triggering index.ts's side effects.
import type { Server } from 'socket.io'

let ioInstance: Server | null = null

export const setIo = (io: Server): void => { ioInstance = io }
export const getIo = (): Server | null => ioInstance
