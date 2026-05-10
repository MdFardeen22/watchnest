export function registerVoiceSocket(io, socket) {
  socket.on('join-voice', () => {
    try {
      const roomCode = socket.data.roomCode;
      if (!roomCode) {
        throw new Error('User not in a room');
      }

      // Add socket to a specific voice room so we only broadcast to those with voice active
      socket.join(`voice-${roomCode}`);
      socket.data.voiceEnabled = true;

      // Notify others in the voice room that this user joined
      socket.to(`voice-${roomCode}`).emit('user-joined-voice', {
        socketId: socket.id,
        userId: socket.data.userId,
      });

      console.info(`[voice] joined room=${roomCode} socket=${socket.id}`);
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('voice-offer', (data) => {
    try {
      const { targetId, offer } = data;
      socket.to(targetId).emit('voice-offer', {
        socketId: socket.id,
        offer,
      });
    } catch (error) {
      console.error(`[voice error] voice-offer from ${socket.id}`, error);
    }
  });

  socket.on('voice-answer', (data) => {
    try {
      const { targetId, answer } = data;
      socket.to(targetId).emit('voice-answer', {
        socketId: socket.id,
        answer,
      });
    } catch (error) {
      console.error(`[voice error] voice-answer from ${socket.id}`, error);
    }
  });

  socket.on('ice-candidate', (data) => {
    try {
      const { targetId, candidate } = data;
      socket.to(targetId).emit('ice-candidate', {
        socketId: socket.id,
        candidate,
      });
    } catch (error) {
      console.error(`[voice error] ice-candidate from ${socket.id}`, error);
    }
  });

  socket.on('leave-voice', () => {
    try {
      const roomCode = socket.data.roomCode;
      if (roomCode) {
        socket.leave(`voice-${roomCode}`);
        socket.to(`voice-${roomCode}`).emit('user-left-voice', {
          socketId: socket.id,
          userId: socket.data.userId,
        });
      }
      socket.data.voiceEnabled = false;
      console.info(`[voice] left room=${roomCode} socket=${socket.id}`);
    } catch (error) {
      console.error(`[voice error] leave-voice from ${socket.id}`, error);
    }
  });

  socket.on('disconnect', () => {
    const roomCode = socket.data.roomCode;
    if (roomCode && socket.data.voiceEnabled) {
      socket.to(`voice-${roomCode}`).emit('user-left-voice', {
        socketId: socket.id,
        userId: socket.data.userId,
      });
    }
  });
}
