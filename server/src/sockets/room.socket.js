import { RoomService } from '../services/room.service.js';
import { VideoService } from '../services/video.service.js';
import { validateCreateRoom, validateJoinRoom } from '../validators/room.validator.js';
import { validateVideoPayload } from '../validators/video.validator.js';

export function registerRoomSocket(io, socket) {
  socket.on('create-room', (data, callback) => {
    try {
      console.info(`[create-room received] socket=${socket.id}`);
      validateCreateRoom(data);
      const hostName = (data.hostName ?? data.userName ?? data.name).trim();
      const room = RoomService.createRoom(socket.id, hostName);

      socket.join(room.roomCode);
      socket.data.roomCode = room.roomCode;
      socket.emit('room-created', { room });
      io.to(room.roomCode).emit('room-updated', { room });
      console.info(`[room created] room=${room.roomCode} host=${socket.id}`);
      sendAck(callback, {
        success: true,
        roomCode: room.roomCode,
        room,
      });
      console.info(`[response sent] create-room room=${room.roomCode} socket=${socket.id}`);
    } catch (error) {
      sendAck(callback, {
        success: false,
        error: error.message,
      });
      console.info(`[response sent] create-room failed socket=${socket.id}`);
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('join-room', (data) => {
    try {
      validateJoinRoom(data);
      const roomCode = (data.roomCode ?? data.code).trim().toUpperCase();
      const userName = (data.userName ?? data.name).trim();
      const room = RoomService.joinRoom(roomCode, socket.id, userName);

      socket.join(roomCode);
      socket.data.roomCode = roomCode;
      socket.emit('room-joined', { room });
      io.to(roomCode).emit('room-updated', { room });
      console.info(`[rooms] joined room=${roomCode} user=${socket.id}`);
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('load-video', (data, callback) => {
    try {
      validateVideoPayload(data);
      const roomCode = (data.roomCode ?? data.code ?? socket.data.roomCode)?.trim().toUpperCase();

      if (!roomCode) {
        throw new Error('Room code missing');
      }

      const room = VideoService.loadVideo(roomCode, socket.id, data.videoUrl);
      io.to(roomCode).emit('room-updated', { room });
      sendAck(callback, { success: true, room });
    } catch (error) {
      sendAck(callback, { success: false, error: error.message });
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('leave-room', (data) => {
    try {
      const code = data?.roomCode ?? data?.code ?? socket.data.roomCode;

      if (code) {
        const room = RoomService.leaveRoom(code, socket.id);
        socket.leave(code);
        socket.data.roomCode = null;
        io.to(code).emit('room-updated', { room });

        if (!room) {
          console.info(`[rooms] deleted room=${String(code).trim().toUpperCase()}`);
        }
      }
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('disconnect', () => {
    const code = RoomService.getRoomCodeByUser(socket.id);

    if (code) {
      const room = RoomService.leaveRoom(code, socket.id);
      socket.to(code).emit('room-updated', { room });

      if (!room) {
        console.info(`[rooms] deleted room=${code}`);
      }
    }
  });
}

function sendAck(callback, payload) {
  if (typeof callback === 'function') {
    callback(payload);
  }
}
