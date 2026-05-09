const rooms = new Map();
const userToRoom = new Map();
const MAX_USERS_PER_ROOM = 4;

function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code;
  do {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
  } while (rooms.has(code));
  return code;
}

function serializeRoom(room) {
  const users = room.users.map((participant) => ({
    ...participant,
    isHost: participant.id === room.hostId,
  }));

  return {
    roomCode: room.roomCode,
    code: room.roomCode,
    hostId: room.hostId,
    hostName: room.hostName,
    locked: room.locked,
    maxUsers: room.maxUsers,
    users,
    participants: users,
    videoUrl: room.videoUrl ?? null,
    createdAt: room.createdAt,
  };
}

export class RoomService {
  static createRoom(hostId, hostName) {
    const roomCode = generateRoomCode();
    const now = Date.now();
    const participant = {
      id: hostId,
      name: hostName,
      micEnabled: false,
      joinedAt: now,
    };
    const room = {
      roomCode,
      hostId,
      hostName,
      users: [participant],
      locked: false,
      maxUsers: MAX_USERS_PER_ROOM,
      createdAt: now,
      videoUrl: null,
    };

    rooms.set(roomCode, room);
    userToRoom.set(hostId, roomCode);
    return serializeRoom(room);
  }

  static joinRoom(roomCode, userId, userName) {
    const normalizedRoomCode = String(roomCode).trim().toUpperCase();
    const room = rooms.get(normalizedRoomCode);

    if (!room) {
      throw new Error('Room not found');
    }

    const existingParticipant = room.users.find((participant) => participant.id === userId);

    if (existingParticipant) {
      existingParticipant.name = userName;
      return serializeRoom(room);
    }

    if (room.users.length >= room.maxUsers) {
      throw new Error('Room is full');
    }

    room.users.push({
      id: userId,
      name: userName,
      micEnabled: false,
      joinedAt: Date.now(),
    });
    userToRoom.set(userId, normalizedRoomCode);

    return serializeRoom(room);
  }

  static getRoom(roomCode) {
    const room = rooms.get(String(roomCode).trim().toUpperCase());
    return room ? serializeRoom(room) : null;
  }

  static loadVideo(roomCode, userId, videoUrl) {
    const normalizedRoomCode = String(roomCode).trim().toUpperCase();
    const room = rooms.get(normalizedRoomCode);

    if (!room) {
      throw new Error('Room not found');
    }

    if (room.hostId !== userId) {
      throw new Error('Only the host can load video');
    }

    room.videoUrl = videoUrl;
    return serializeRoom(room);
  }

  static leaveRoom(roomCode, userId) {
    const normalizedRoomCode = String(roomCode).trim().toUpperCase();
    const room = rooms.get(normalizedRoomCode);

    if (!room) {
      return null;
    }

    room.users = room.users.filter((participant) => participant.id !== userId);
    userToRoom.delete(userId);

    if (room.users.length === 0) {
      rooms.delete(normalizedRoomCode);
      return null;
    }

    if (room.hostId === userId) {
      const nextHost = room.users
        .slice()
        .sort((a, b) => a.joinedAt - b.joinedAt)[0];
      room.hostId = nextHost.id;
      room.hostName = nextHost.name;
    }

    return serializeRoom(room);
  }

  static getRoomByUser(userId) {
    const code = userToRoom.get(userId);
    const room = code ? rooms.get(code) : null;

    return room ? serializeRoom(room) : null;
  }

  static getRoomCodeByUser(userId) {
    return userToRoom.get(userId) ?? null;
  }
}
