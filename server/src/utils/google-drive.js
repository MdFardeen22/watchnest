const FILE_ID_PATTERNS = [
  /\/file\/d\/([a-zA-Z0-9_-]{10,})/,
  /[?&]id=([a-zA-Z0-9_-]{10,})/,
  /\/open\?id=([a-zA-Z0-9_-]{10,})/,
];

function extractFileId(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }

  const trimmed = value.trim();

  for (const pattern of FILE_ID_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  const directId = trimmed.match(/^([a-zA-Z0-9_-]{10,})$/);
  return directId ? directId[1] : null;
}

export function parseGoogleDriveVideo(source) {
  const fileId = extractFileId(source);

  if (!fileId) {
    throw new Error('Invalid Google Drive video link');
  }

  return `https://drive.google.com/file/d/${fileId}/preview`;
}
