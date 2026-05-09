import { parseYouTubeVideoId } from '../utils/youtube.js';

export function validateVideoPayload(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid video data');
  }

  const videoUrl = data.videoUrl ?? data.url ?? data.youtubeUrl;

  if (!videoUrl || typeof videoUrl !== 'string' || videoUrl.trim().length === 0) {
    throw new Error('Invalid video URL');
  }

  const videoId = parseYouTubeVideoId(videoUrl.trim());
  if (!videoId) {
    throw new Error('Invalid YouTube video link');
  }
}

export function validateVideoSync(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid video sync data');
  }

  const roomCode = data.roomCode ?? data.code;
  const action = data.action;
  const currentTime = data.currentTime;
  const playbackRate = data.playbackRate;
  const paused = data.paused;

  if (!roomCode || typeof roomCode !== 'string' || !/^[A-Z0-9]{6}$/.test(roomCode.trim().toUpperCase())) {
    throw new Error('Invalid room code');
  }

  if (!action || typeof action !== 'string') {
    throw new Error('Invalid sync action');
  }

  if (typeof currentTime !== 'number' || Number.isNaN(currentTime) || currentTime < 0) {
    throw new Error('Invalid currentTime');
  }

  if (typeof playbackRate !== 'number' || Number.isNaN(playbackRate) || playbackRate <= 0) {
    throw new Error('Invalid playbackRate');
  }

  if (typeof paused !== 'boolean') {
    throw new Error('Invalid paused state');
  }
}
