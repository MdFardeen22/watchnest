const YOUTUBE_VIDEO_ID_PATTERNS = [
  /(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
  /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  /[?&]v=([a-zA-Z0-9_-]{11})/,
  /^([a-zA-Z0-9_-]{11})$/,
];

export function parseYouTubeVideoId(source) {
  if (typeof source !== 'string' || source.trim().length === 0) {
    return null;
  }

  const trimmed = source.trim();

  for (const pattern of YOUTUBE_VIDEO_ID_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

export function getYouTubePlayerSrc(videoId, isHost) {
  if (!videoId) {
    return null;
  }

  const controls = isHost ? 1 : 0;
  return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&rel=0&modestbranding=1&controls=${controls}&fs=1&playsinline=1`;
}
