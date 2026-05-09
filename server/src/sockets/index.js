// Socket.IO registration entrypoint belongs here.
// Compose room, chat, moderation, and WebRTC signaling socket modules.

import { registerRoomSocket } from './room.socket.js';

export function registerSockets(io) {
  io.on('connection', (socket) => {
    console.info(`[socket connected] id=${socket.id}`);
    registerRoomSocket(io, socket);
  });
}
