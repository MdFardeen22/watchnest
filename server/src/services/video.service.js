import { parseGoogleDriveVideo } from '../utils/google-drive.js';
import { RoomService } from './room.service.js';

export class VideoService {
  static loadVideo(roomCode, userId, rawUrl) {
    const previewUrl = parseGoogleDriveVideo(rawUrl);
    return RoomService.loadVideo(roomCode, userId, previewUrl);
  }
}
