import { parseYouTubeVideoId } from '../utils/youtube.js';
import { RoomService } from './room.service.js';

export class VideoService {
  static loadVideo(roomCode, userId, rawUrl) {
    const videoId = parseYouTubeVideoId(rawUrl);
    return RoomService.loadVideo(roomCode, userId, videoId);
  }

  static async updateSyncState(roomCode, userId, { currentTime, paused, playbackRate }) {
    const room = await RoomService.verifyRoomHost(roomCode, userId);
    
    room.videoState = {
      currentTime: Number(currentTime) || 0,
      paused: Boolean(paused),
      playbackRate: Number(playbackRate) || 1,
      lastSyncAt: new Date(),
    };

    await room.save();
    return room.videoState;
  }
}
