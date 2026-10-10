import type { Format, ItemUniversalSettings, VideoCodec, YtdlpAdvancedOption } from '@/lib/types';
import { sanitizeYtdlpAdvancedOptions } from '@/lib/ytdlp-advanced-options';

const UNIVERSAL_VIDEO_CODECS = new Set<VideoCodec>(['auto', 'h264', 'vp9', 'av1']);

export function normalizeUniversalVideoCodec(value: unknown): VideoCodec {
  return typeof value === 'string' && UNIVERSAL_VIDEO_CODECS.has(value as VideoCodec)
    ? (value as VideoCodec)
    : 'auto';
}

export function normalizeUniversalFormatCodec(format: Format, value: unknown): VideoCodec {
  const codec = normalizeUniversalVideoCodec(value);
  return format === 'webm' && codec === 'h264' ? 'auto' : codec;
}

export function resolveUniversalVideoCodec(
  itemSettings: Partial<Pick<ItemUniversalSettings, 'videoCodec'>> | null | undefined,
): VideoCodec {
  return itemSettings && 'videoCodec' in itemSettings
    ? normalizeUniversalVideoCodec(itemSettings.videoCodec)
    : 'auto';
}

export interface UniversalDownloadAdvancedSettings {
  useAria2: boolean;
  aria2Args: string;
  ytdlpAdvancedOptionsEnabled: boolean;
  ytdlpAdvancedOptions: YtdlpAdvancedOption[];
}

const DEFAULT_UNIVERSAL_DOWNLOAD_ADVANCED_SETTINGS: UniversalDownloadAdvancedSettings = {
  useAria2: false,
  aria2Args: '',
  ytdlpAdvancedOptionsEnabled: false,
  ytdlpAdvancedOptions: [],
};

/**
 * Read the download-page settings that the Universal queue shares with the
 * YouTube queue. Advanced yt-dlp options are sanitized against the fork's
 * vetted allowlist; Rust validates them again before building arguments.
 */
export function parseUniversalDownloadAdvancedSettings(
  saved: string | null | undefined,
): UniversalDownloadAdvancedSettings {
  if (!saved) return { ...DEFAULT_UNIVERSAL_DOWNLOAD_ADVANCED_SETTINGS, ytdlpAdvancedOptions: [] };
  try {
    const parsed = JSON.parse(saved) as Record<string, unknown> | null;
    if (!parsed || typeof parsed !== 'object') {
      return { ...DEFAULT_UNIVERSAL_DOWNLOAD_ADVANCED_SETTINGS, ytdlpAdvancedOptions: [] };
    }
    return {
      useAria2: parsed.useAria2 === true,
      aria2Args: typeof parsed.aria2Args === 'string' ? parsed.aria2Args : '',
      ytdlpAdvancedOptionsEnabled: parsed.ytdlpAdvancedOptionsEnabled === true,
      ytdlpAdvancedOptions: sanitizeYtdlpAdvancedOptions(parsed.ytdlpAdvancedOptions),
    };
  } catch {
    return { ...DEFAULT_UNIVERSAL_DOWNLOAD_ADVANCED_SETTINGS, ytdlpAdvancedOptions: [] };
  }
}

/**
 * Queue items keep the advanced options captured when they were added. Items
 * persisted before the snapshot existed fall back to the current settings.
 */
export function resolveUniversalYtdlpAdvancedOptions(
  itemSettings:
    | Partial<Pick<ItemUniversalSettings, 'ytdlpAdvancedOptionsEnabled' | 'ytdlpAdvancedOptions'>>
    | null
    | undefined,
  current: Pick<
    UniversalDownloadAdvancedSettings,
    'ytdlpAdvancedOptionsEnabled' | 'ytdlpAdvancedOptions'
  >,
): Pick<UniversalDownloadAdvancedSettings, 'ytdlpAdvancedOptionsEnabled' | 'ytdlpAdvancedOptions'> {
  return {
    ytdlpAdvancedOptionsEnabled:
      itemSettings?.ytdlpAdvancedOptionsEnabled ?? current.ytdlpAdvancedOptionsEnabled,
    ytdlpAdvancedOptions: sanitizeYtdlpAdvancedOptions(
      itemSettings?.ytdlpAdvancedOptions ?? current.ytdlpAdvancedOptions,
    ),
  };
}
