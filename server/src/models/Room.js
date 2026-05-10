import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const participantSchema = new Schema(
  {
    socketId: { type: String, required: true, trim: true },
    userId: { type: String, default: null, trim: true },
    userName: { type: String, required: true, trim: true, maxlength: 32 },
    isHost: { type: Boolean, default: false },
    joinedAt: { type: Date, required: true, default: () => new Date() },
    micEnabled: { type: Boolean, default: false },
  },
  { _id: false }
);

const chatMessageSchema = new Schema(
  {
    sender: { type: String, required: true, trim: true, maxlength: 32 },
    message: { type: String, required: true, trim: true, maxlength: 300 },
    isHost: { type: Boolean, default: false },
    createdAt: { type: Date, required: true, default: () => new Date() },
  },
  { _id: false }
);

const videoStateSchema = new Schema(
  {
    currentTime: { type: Number, default: 0 },
    playbackRate: { type: Number, default: 1 },
    paused: { type: Boolean, default: true },
    lastSyncAt: { type: Date, default: () => new Date() },
  },
  { _id: false }
);

const roomSchema = new Schema(
  {
    roomCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      minlength: 6,
      maxlength: 6,
    },
    hostId: { type: String, required: true, trim: true },
    hostName: { type: String, required: true, trim: true, maxlength: 32 },
    participants: { type: [participantSchema], default: [] },
    youtubeVideoId: { type: String, default: null, trim: true, maxlength: 11 },
    videoState: { type: videoStateSchema, default: () => ({}) },
    chatMessages: { type: [chatMessageSchema], default: [] },
    locked: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

export const Room = model('Room', roomSchema);
