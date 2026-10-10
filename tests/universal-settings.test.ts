import { describe, expect, test } from 'bun:test';
import {
  normalizeUniversalFormatCodec,
  normalizeUniversalVideoCodec,
  parseUniversalDownloadAdvancedSettings,
  resolveUniversalVideoCodec,
  resolveUniversalYtdlpAdvancedOptions,
} from '../src/lib/universal-settings';

describe('universal codec settings', () => {
  test('defaults unsupported codecs to auto', () => {
    expect(normalizeUniversalVideoCodec(undefined)).toBe('auto');
    expect(normalizeUniversalVideoCodec('hevc')).toBe('auto');
  });

  test('keeps WebM from using H.264', () => {
    expect(normalizeUniversalFormatCodec('webm', 'h264')).toBe('auto');
    expect(normalizeUniversalFormatCodec('mp4', 'h264')).toBe('h264');
  });

  test('old queued items without codec stay auto', () => {
    expect(resolveUniversalVideoCodec(undefined)).toBe('auto');
    expect(resolveUniversalVideoCodec({})).toBe('auto');
    expect(resolveUniversalVideoCodec({ videoCodec: 'vp9' })).toBe('vp9');
  });
});

describe('universal yt-dlp advanced options', () => {
  test('reads shared download settings and drops options outside the allowlist', () => {
    const parsed = parseUniversalDownloadAdvancedSettings(
      JSON.stringify({
        useAria2: true,
        aria2Args: '-x 4',
        ytdlpAdvancedOptionsEnabled: true,
        ytdlpAdvancedOptions: [
          { id: 'socketTimeout', value: '30' },
          { id: 'exec', value: 'echo unsafe' },
        ],
      }),
    );
    expect(parsed.useAria2).toBe(true);
    expect(parsed.aria2Args).toBe('-x 4');
    expect(parsed.ytdlpAdvancedOptionsEnabled).toBe(true);
    expect(parsed.ytdlpAdvancedOptions).toEqual([{ id: 'socketTimeout', value: '30' }]);
  });

  test('falls back to disabled options for missing or corrupt settings', () => {
    for (const saved of [null, '', '{bad json', 'null']) {
      expect(parseUniversalDownloadAdvancedSettings(saved)).toEqual({
        useAria2: false,
        aria2Args: '',
        ytdlpAdvancedOptionsEnabled: false,
        ytdlpAdvancedOptions: [],
      });
    }
  });

  test('queued items keep their snapshot and old items use current settings', () => {
    const current = {
      ytdlpAdvancedOptionsEnabled: true,
      ytdlpAdvancedOptions: [{ id: 'forceIpv4' as const }],
    };
    expect(resolveUniversalYtdlpAdvancedOptions(undefined, current)).toEqual(current);
    expect(
      resolveUniversalYtdlpAdvancedOptions(
        { ytdlpAdvancedOptionsEnabled: false, ytdlpAdvancedOptions: [] },
        current,
      ),
    ).toEqual({ ytdlpAdvancedOptionsEnabled: false, ytdlpAdvancedOptions: [] });
  });
});
