import { parseYouTubeVideoId } from '../utils/youtube.js';
import { RoomService } from './room.service.js';

export class VideoService {
  static loadVideo(roomCode, userId, rawUrl) {
    const videoId = parseYouTubeVideoId(rawUrl);
    return RoomService.loadVideo(roomCode, userId, videoId);
  }
}
