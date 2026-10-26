// A media extension the user typed is dropped; yt-dlp adds the real one.
const TYPED_MEDIA_EXTENSION = /\.(mp4|mkv|webm|mov|avi|flv|m4a|mp3|opus|ogg|wav|flac|aac)$/i;

/** Cleans a name typed for a queued item: no path separators, reserved characters or extension. */
export function sanitizeQueueFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*\p{Cc}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(TYPED_MEDIA_EXTENSION, '')
    .replace(/[. ]+$/, '')
    .slice(0, 180)
    .trim();
}

/** yt-dlp output template that writes the cleaned name literally. */
export function customFilenameTemplate(name: string): string {
  return `${name.replaceAll('%', '%%')}.%(ext)s`;
}
