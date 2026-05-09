const GOOGLE_DRIVE_FILE_ID_PATTERNS = [
  /\/file\/d\/([a-zA-Z0-9_-]{10,})/,
  /[?&]id=([a-zA-Z0-9_-]{10,})/,
];

function extractGoogleDriveFileId(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }

  const trimmed = value.trim();

  for (const pattern of GOOGLE_DRIVE_FILE_ID_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  const directIdMatch = trimmed.match(/^([a-zA-Z0-9_-]{10,})$/);
  if (directIdMatch) {
    return directIdMatch[1];
  }

  return null;
}

export function parseGoogleDriveVideo(source) {
  const fileId = extractGoogleDriveFileId(source);

  if (!fileId) {
    throw new Error('Invalid Google Drive video link');
  }

  return `https://drive.google.com/file/d/${fileId}/preview`;
}
