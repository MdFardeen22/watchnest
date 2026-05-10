import { Room } from '../models/Room.js';
import { MAX_ROOM_PARTICIPANTS } from '../config/constants.js';

function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code;

  do {
    code = '';
    for (let i = 0; i < 6; i += 1) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
  } while (false); // uniqueness enforced at save time

  return code;
}

function serializeRoom(doc) {
  if (!doc) {
    return null;
  }

  const participants = (doc.participants ?? []).map((participant) => ({
    ...participant,
    isHost: participant.socketId === doc.hostId,
  }));

  return {
    roomCode: doc.roomCode,
    code: doc.roomCode,
    hostId: doc.hostId,
    hostName: doc.hostName,
    locked: doc.locked,
    maxUsers: MAX_ROOM_PARTICIPANTS,
    users: participants,
    participants,
    youtubeVideoId: doc.youtubeVideoId ?? null,
    videoState: doc.videoState,
    chatMessages: doc.chatMessages ?? [],
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export class RoomService {
  static async createRoom(hostId, hostName, userId) {
    const roomCode = generateRoomCode();

    const participant = {
      socketId: hostId,
      userId: userId ?? null,
      userName: hostName,
      isHost: true,
      joinedAt: new Date(),
      micEnabled: false,
    };

    const room = new Room({
      roomCode,
      hostId,
      hostName,
      participants: [participant],
      youtubeVideoId: null,
      locked: false,
    });

    await room.save();
    return serializeRoom(room);
  }

  static async joinRoom(roomCode, userId, userName, socketId) {
    const normalizedRoomCode = String(roomCode).trim().toUpperCase();
    const room = await Room.findOne({ roomCode: normalizedRoomCode });

    if (!room) {
      throw new Error('Room not found');
    }

    const existingParticipant = userId
      ? room.participants.find((participant) => participant.userId === userId)
      : room.participants.find((participant) => participant.socketId === socketId);

    if (existingParticipant) {
      const previousSocketId = existingParticipant.socketId;
      existingParticipant.socketId = socketId;
      existingParticipant.userId = userId ?? existingParticipant.userId;
      existingParticipant.userName = userName;

      if (room.hostId === previousSocketId) {
        room.hostId = socketId;
      }

      await room.save();
      return serializeRoom(room);
    }

    if (room.participants.length >= MAX_ROOM_PARTICIPANTS) {
      throw new Error('Room is full');
    }

    room.participants.push({
      socketId,
      userId: userId ?? null,
      userName,
      isHost: false,
      joinedAt: new Date(),
      micEnabled: false,
    });

    await room.save();
    return serializeRoom(room);
  }

  static async getRoom(roomCode) {
    const normalizedRoomCode = String(roomCode).trim().toUpperCase();
    const room = await Room.findOne({ roomCode: normalizedRoomCode });
    return serializeRoom(room);
  }

  static async verifyRoomHost(roomCode, userId) {
    const normalizedRoomCode = String(roomCode).trim().toUpperCase();
    const room = await Room.findOne({ roomCode: normalizedRoomCode });

    if (!room) {
      throw new Error('Room not found');
    }

    if (room.hostId !== userId) {
      throw new Error('Only the host can control playback');
    }

    return room;
  }

  static async loadVideo(roomCode, userId, youtubeVideoId) {
    const normalizedRoomCode = String(roomCode).trim().toUpperCase();
    const room = await Room.findOne({ roomCode: normalizedRoomCode });

    if (!room) {
      throw new Error('Room not found');
    }

    if (room.hostId !== userId) {
      throw new Error('Only the host can load video');
    }

    room.youtubeVideoId = youtubeVideoId;
    await room.save();

    return serializeRoom(room);
  }

  static async leaveRoom(roomCode, socketId) {
    const normalizedRoomCode = String(roomCode).trim().toUpperCase();
    const room = await Room.findOne({ roomCode: normalizedRoomCode });

    if (!room) {
      return null;
    }

    const leavingParticipant = room.participants.find((participant) => participant.socketId === socketId);
    room.participants = room.participants.filter((participant) => participant.socketId !== socketId);

    if (room.participants.length === 0) {
      await Room.deleteOne({ roomCode: normalizedRoomCode });
      return null;
    }

    if (room.hostId === socketId) {
      const nextHost = room.participants
        .slice()
        .sort((a, b) => a.joinedAt - b.joinedAt)[0];
      room.hostId = nextHost.socketId;
      room.hostName = nextHost.userName;
    }

    await room.save();
    return serializeRoom(room);
  }

  static async saveChatMessage(roomCode, socketId, messageText) {
    const normalizedRoomCode = String(roomCode).trim().toUpperCase();
    const room = await Room.findOne({ roomCode: normalizedRoomCode });

    if (!room) {
      throw new Error('Room not found');
    }

    const participant = room.participants.find((p) => p.socketId === socketId);
    if (!participant) {
      throw new Error('You are not a participant in this room');
    }

    if (!messageText || messageText.trim().length === 0) {
      throw new Error('Message cannot be empty');
    }
    
    if (messageText.length > 300) {
      throw new Error('Message is too long');
    }

    const newMessage = {
      sender: participant.userName,
      message: messageText.trim(),
      isHost: participant.isHost,
      createdAt: new Date(),
    };

    room.chatMessages.push(newMessage);
    
    // Limit chat history to prevent overly large documents
    if (room.chatMessages.length > 100) {
      room.chatMessages = room.chatMessages.slice(-100);
    }

    await room.save();
    return newMessage;
  }

  static async clearSocketMapping() {
    // No in-memory socket mapping is maintained with MongoDB.
  }

  static async getRoomByUser(userId) {
    const room = await Room.findOne({ 'participants.userId': userId });
    return serializeRoom(room);
  }

  static async getRoomCodeByUser(userId) {
    const room = await Room.findOne({ 'participants.userId': userId });
    return room?.roomCode ?? null;
  }
}
