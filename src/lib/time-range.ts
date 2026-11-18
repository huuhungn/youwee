// Time range helpers for trimming a queued download with yt-dlp `--download-sections`.

// Parse a duration string like "5:30" or "1:05:30" to total seconds
export function parseDurationString(dur: string): number {
  const parts = dur.split(':').map(Number);
  if (parts.some(Number.isNaN)) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

// Auto-format digits into M:SS or H:MM:SS
export function autoFormatTimeInput(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 0) return '';
  if (digits.length <= 2) return digits;
  if (digits.length === 3) return `${digits[0]}:${digits.slice(1)}`;
  if (digits.length === 4) return `${digits.slice(0, 2)}:${digits.slice(2)}`;
  if (digits.length === 5) return `${digits[0]}:${digits.slice(1, 3)}:${digits.slice(3)}`;
  return `${digits.slice(0, 2)}:${digits.slice(2, 4)}:${digits.slice(4, 6)}`;
}

// Seconds for "SS", "M:SS" or "H:MM:SS", or -1 if invalid
export function parseTimeToSeconds(val: string): number {
  if (!/^\d{1,2}(:\d{2}){0,2}$/.test(val)) return -1;
  const parts = val.split(':').map(Number);
  if (parts.slice(1).some((part) => part >= 60)) return -1;
  return parts.reduce((total, part) => total * 60 + part, 0);
}

// Format seconds as M:SS, or H:MM:SS from one hour on
export function formatTimeMarker(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = String(totalSeconds % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

export type TimeRangeError = 'format' | 'order' | null;

export function validateTimeRange(start: string, end: string) {
  const startSeconds = parseTimeToSeconds(start);
  const endSeconds = parseTimeToSeconds(end);
  const isStartValid = start === '' || startSeconds >= 0;
  const isEndValid = end === '' || endSeconds >= 0;
  const isRangeValid =
    !start || !end || (startSeconds >= 0 && endSeconds >= 0 && startSeconds < endSeconds);
  const error: TimeRangeError =
    !isStartValid || !isEndValid ? 'format' : !isRangeValid ? 'order' : null;
  return {
    isStartValid,
    isEndValid,
    isRangeValid,
    error,
    canApply: start !== '' && end !== '' && error === null,
    // Stored form always has a colon, e.g. "45" -> "0:45"
    normalizedStart: startSeconds >= 0 ? formatTimeMarker(startSeconds) : start,
    normalizedEnd: endSeconds >= 0 ? formatTimeMarker(endSeconds) : end,
  };
}

// yt-dlp `--download-sections` value; `*` marks a time range instead of a chapter name
export function buildDownloadSections(start?: string, end?: string): string | undefined {
  return start && end ? `*${start}-${end}` : undefined;
}
