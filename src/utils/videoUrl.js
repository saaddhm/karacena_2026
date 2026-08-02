const PROVIDER_HOSTS = new Set([
  'youtube.com', 'm.youtube.com', 'youtube-nocookie.com', 'youtu.be',
  'vimeo.com', 'player.vimeo.com',
  'facebook.com', 'm.facebook.com', 'web.facebook.com', 'fb.watch',
  'dailymotion.com', 'dai.ly'
]);
const FILE_EXTENSIONS = ['.mp4', '.webm', '.ogg', '.ogv', '.m3u8'];

export function classifyVideoUrl(value) {
  if (value == null || value === '') return 'empty';
  if (typeof value !== 'string') return 'invalid';
  const trimmed = value.trim();
  if (trimmed === '') return 'empty';
  // Chemin relatif (vidéo téléversée sur le site, ex. /uploads/x.mp4)
  if (trimmed.startsWith('/')) {
    const path = trimmed.toLowerCase().split(/[?#]/)[0];
    return FILE_EXTENSIONS.some((ext) => path.endsWith(ext)) ? 'file' : 'invalid';
  }
  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return 'invalid';
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    if (PROVIDER_HOSTS.has(host)) return 'provider';
    if (FILE_EXTENSIONS.some((extension) => parsed.pathname.toLowerCase().endsWith(extension))) return 'file';
    return 'external';
  } catch {
    return 'invalid';
  }
}

export function isSafeVideoUrl(value) {
  return classifyVideoUrl(value) !== 'invalid';
}

