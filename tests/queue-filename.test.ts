import { describe, expect, test } from 'bun:test';
import { customFilenameTemplate, sanitizeQueueFilename } from '../src/lib/queue-filename';

describe('queue filename', () => {
  test('cleans a typed name', () => {
    expect(sanitizeQueueFilename('  Reel 1: intro | part/2  ')).toBe('Reel 1 intro part 2');
    expect(sanitizeQueueFilename('my clip.MP4')).toBe('my clip');
    expect(sanitizeQueueFilename('notes...')).toBe('notes');
    expect(sanitizeQueueFilename('..\\..\\evil')).toBe('.. .. evil');
    expect(sanitizeQueueFilename('   ')).toBe('');
    expect(sanitizeQueueFilename('a'.repeat(300))).toHaveLength(180);
  });

  test('builds a literal yt-dlp template', () => {
    expect(customFilenameTemplate('100% real')).toBe('100%% real.%(ext)s');
    expect(customFilenameTemplate('%(title)s')).toBe('%%(title)s.%(ext)s');
  });
});
