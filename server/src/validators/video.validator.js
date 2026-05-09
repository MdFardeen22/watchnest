import { parseGoogleDriveVideo } from '../utils/google-drive.js';

export function validateVideoPayload(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid video data');
  }

  const videoUrl = data.videoUrl ?? data.url ?? data.driveUrl;

  if (!videoUrl || typeof videoUrl !== 'string' || videoUrl.trim().length === 0) {
    throw new Error('Invalid video URL');
  }

  parseGoogleDriveVideo(videoUrl.trim());
}
