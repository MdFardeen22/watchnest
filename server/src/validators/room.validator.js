// Room payload validation belongs here.
// Validate room code, display name, room lock state, and capacity constraints.

export function validateCreateRoom(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid data');
  }

  const hostName = data.hostName ?? data.userName ?? data.name;

  if (!hostName || typeof hostName !== 'string' || hostName.trim().length === 0 || hostName.length > 32) {
    throw new Error('Invalid name');
  }
}

export function validateJoinRoom(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid data');
  }

  const roomCode = data.roomCode ?? data.code;
  const userName = data.userName ?? data.name;

  if (!roomCode || !/^[A-Z0-9]{6}$/.test(roomCode)) {
    throw new Error('Invalid room code');
  }

  if (!userName || typeof userName !== 'string' || userName.trim().length === 0 || userName.length > 32) {
    throw new Error('Invalid name');
  }
}
