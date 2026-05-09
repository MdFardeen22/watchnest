import { RoomService } from '../services/room.service.js';
import { VideoService } from '../services/video.service.js';
import { validateCreateRoom, validateJoinRoom } from '../validators/room.validator.js';
import { validateVideoPayload, validateVideoSync } from '../validators/video.validator.js';

export function registerRoomSocket(io, socket) {
  socket.on('create-room', async (data, callback) => {
    try {
      console.info(`[create-room received] socket=${socket.id}`);
      validateCreateRoom(data);
      const hostName = (data.hostName ?? data.userName ?? data.name).trim();
      const userId = data.userId ?? null;
      const room = await RoomService.createRoom(socket.id, hostName, userId);

      socket.join(room.roomCode);
      socket.data.roomCode = room.roomCode;
      socket.data.userId = userId;
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

  socket.on('join-room', async (data) => {
    try {
      validateJoinRoom(data);
      const roomCode = (data.roomCode ?? data.code).trim().toUpperCase();
      const userId = data.userId ?? null;
      const userName = (data.userName ?? data.name).trim();
      const room = await RoomService.joinRoom(roomCode, userId, userName, socket.id);

      socket.join(roomCode);
      socket.data.roomCode = roomCode;
      socket.data.userId = userId;
      socket.emit('room-joined', { room });
      io.to(roomCode).emit('room-updated', { room });
      console.info(`[rooms] joined room=${roomCode} user=${socket.id}`);
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('load-video', async (data, callback) => {
    try {
      validateVideoPayload(data);
      const roomCode = (data.roomCode ?? data.code ?? socket.data.roomCode)?.trim().toUpperCase();

      if (!roomCode) {
        throw new Error('Room code missing');
      }

      const room = await VideoService.loadVideo(roomCode, socket.id, data.videoUrl);
      io.to(roomCode).emit('room-updated', { room });
      sendAck(callback, { success: true, room });
    } catch (error) {
      sendAck(callback, { success: false, error: error.message });
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('video-play', (data) => {
    try {
      const roomCode = (data.roomCode ?? data.code ?? socket.data.roomCode)?.trim().toUpperCase();
      if (!roomCode) {
        throw new Error('Room code missing');
      }

      RoomService.verifyRoomHost(roomCode, socket.id);
      socket.to(roomCode).emit('video-play');
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('video-pause', (data) => {
    try {
      const roomCode = (data.roomCode ?? data.code ?? socket.data.roomCode)?.trim().toUpperCase();
      if (!roomCode) {
        throw new Error('Room code missing');
      }

      RoomService.verifyRoomHost(roomCode, socket.id);
      socket.to(roomCode).emit('video-pause');
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('video-sync', async (data) => {
    try {
      validateVideoSync(data);
      const roomCode = (data.roomCode ?? data.code ?? socket.data.roomCode)?.trim().toUpperCase();
      if (!roomCode) {
        throw new Error('Room code missing');
      }

      await RoomService.verifyRoomHost(roomCode, socket.id);

      socket.to(roomCode).emit('video-sync', {
        roomCode,
        action: data.action,
        currentTime: Number(data.currentTime),
        playbackRate: Number(data.playbackRate),
        paused: Boolean(data.paused),
      });
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('leave-room', async (data) => {
    try {
      const code = data?.roomCode ?? data?.code ?? socket.data.roomCode;

      if (code) {
        const room = await RoomService.leaveRoom(code, socket.id);
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
    RoomService.clearSocketMapping(socket.id);
    console.info(`[socket disconnected] socket=${socket.id} room=${socket.data.roomCode}`);
  });
}

function sendAck(callback, payload) {
  if (typeof callback === 'function') {
    callback(payload);
  }
}
