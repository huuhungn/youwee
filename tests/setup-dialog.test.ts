import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { TFunction } from 'i18next';
import type { FfmpegStatus } from '../src/contexts/DependenciesContext';
import { updateDialogHasContent } from '../src/hooks/useAppUpdater';
import {
  dependencyProgressPercent,
  formatDependencyProgressLabel,
  formatDependencyProgressSize,
} from '../src/lib/dependency-progress';
import {
  getApplicableSetupItems,
  getMissingSetupItems,
  getStartupDependencyDialog,
  getYtdlpSetupState,
  getYtdlpTargetChannel,
  hasSeenSetupDialog,
  isSetupItemDone,
  isStartupDependencyStateReady,
  isStartupDialogBlocked,
  markSetupDialogSeen,
  SETUP_DIALOG_SEEN_KEY,
  type SetupDependencyState,
  shouldMarkSetupDialogSeen,
  ytdlpSetupNeedsDownload,
} from '../src/lib/setup-dialog';
import type { YtdlpAllVersions } from '../src/lib/types';

function versions(
  overrides: Partial<Record<'stable' | 'nightly' | 'master', boolean>> = {},
): YtdlpAllVersions {
  const info = (channel: string, installed: boolean) => ({
    channel,
    version: installed ? '2026.10.01' : null,
    installed,
    binary_path: installed ? `/bin/${channel}` : null,
  });
  return {
    current_channel: 'bundled',
    using_fallback: false,
    bundled: info('bundled', true),
    stable: info('stable', overrides.stable ?? false),
    nightly: info('nightly', overrides.nightly ?? false),
    master: info('master', overrides.master ?? false),
  };
}

const missingFfmpeg: FfmpegStatus = {
  installed: false,
  version: null,
  binary_path: null,
  is_system: false,
  is_bundled: false,
};

// What check_ffmpeg reports when the Windows dependency pack ships FFmpeg as a resource.
const packagedFfmpeg: FfmpegStatus = {
  installed: true,
  version: 'n8.1.2',
  binary_path: 'C:/Program Files/Youwee/dependencies/ffmpeg.exe',
  is_system: false,
  is_bundled: true,
};

function state(overrides: Partial<SetupDependencyState> = {}): SetupDependencyState {
  return {
    ytdlpSource: 'auto',
    ytdlpChannel: 'bundled',
    ytdlpAllVersions: versions(),
    ffmpegSource: 'auto',
    ffmpegStatus: missingFfmpeg,
    ...overrides,
  };
}

describe('setup dialog items', () => {
  test('only a missing FFmpeg counts as missing on a fresh install', () => {
    // The bundled yt-dlp works; moving to Stable is offered only from "Set up high quality".
    expect(getMissingSetupItems(state())).toEqual(['ffmpeg']);
    expect(getApplicableSetupItems(state())).toEqual(['ytdlp', 'ffmpeg']);
  });

  test('a selected channel whose file is gone is missing', () => {
    expect(
      getMissingSetupItems(state({ ytdlpChannel: 'nightly', ffmpegStatus: packagedFfmpeg })),
    ).toEqual(['ytdlp']);
    expect(
      getMissingSetupItems(
        state({ ffmpegStatus: packagedFfmpeg, ytdlpAllVersions: versions({ stable: true }) }),
      ),
    ).toEqual([]);
  });

  test('a downloaded channel with an installed binary counts as done', () => {
    for (const channel of ['stable', 'nightly', 'master'] as const) {
      expect(
        isSetupItemDone(
          'ytdlp',
          state({ ytdlpChannel: channel, ytdlpAllVersions: versions({ [channel]: true }) }),
        ),
      ).toBe(true);
    }
  });

  test('stable channel without the binary (fallback) is still missing', () => {
    expect(isSetupItemDone('ytdlp', state({ ytdlpChannel: 'stable' }))).toBe(false);
  });

  test('FFmpeg packaged with Youwee is not offered for install', () => {
    expect(isSetupItemDone('ffmpeg', state({ ffmpegStatus: packagedFfmpeg }))).toBe(true);
    expect(getMissingSetupItems(state({ ffmpegStatus: packagedFfmpeg }))).toEqual([]);
  });

  test('system-managed dependencies are left alone', () => {
    expect(
      getApplicableSetupItems(state({ ytdlpSource: 'system', ffmpegSource: 'system' })),
    ).toEqual([]);
  });

  test('items whose status is unknown are not shown', () => {
    expect(getApplicableSetupItems(state({ ytdlpAllVersions: null, ffmpegStatus: null }))).toEqual(
      [],
    );
  });
});

describe('yt-dlp setup state', () => {
  test('bundled without a Stable binary needs a download', () => {
    const setupState = getYtdlpSetupState(state());
    expect(setupState).toBe('notDownloaded');
    expect(ytdlpSetupNeedsDownload(setupState)).toBe(true);
  });

  test('bundled with a Stable binary on disk only needs a switch', () => {
    const setupState = getYtdlpSetupState(state({ ytdlpAllVersions: versions({ stable: true }) }));
    expect(setupState).toBe('downloadedNotActive');
    expect(ytdlpSetupNeedsDownload(setupState)).toBe(false);
  });

  test('a selected channel without its binary is a missing file', () => {
    expect(getYtdlpSetupState(state({ ytdlpChannel: 'stable' }))).toBe('missingFile');
    expect(getYtdlpSetupState(state({ ytdlpChannel: 'master' }))).toBe('missingFile');
  });

  test('Nightly and Master users keep their channel, bundled users get Stable', () => {
    expect(getYtdlpTargetChannel(state({ ytdlpChannel: 'nightly' }))).toBe('nightly');
    expect(getYtdlpTargetChannel(state({ ytdlpChannel: 'master' }))).toBe('master');
    expect(getYtdlpTargetChannel(state())).toBe('stable');
  });
});

describe('startup dependency dialog', () => {
  test('first run without FFmpeg opens the setup dialog for FFmpeg only', () => {
    expect(getStartupDependencyDialog(state(), false)).toEqual({
      kind: 'setup',
      items: ['ffmpeg'],
    });
  });

  test('first run with the Windows Full pack opens nothing and is remembered', () => {
    const fullPack = state({ ffmpegStatus: packagedFfmpeg });
    const dialog = getStartupDependencyDialog(fullPack, false);
    expect(dialog).toBeNull();
    expect(shouldMarkSetupDialogSeen(fullPack, false, dialog)).toBe(true);
  });

  test('a missing channel file opens the setup dialog even with the pack', () => {
    expect(
      getStartupDependencyDialog(
        state({ ffmpegStatus: packagedFfmpeg, ytdlpChannel: 'master' }),
        false,
      ),
    ).toEqual({ kind: 'setup', items: ['ytdlp'] });
  });

  test('a dismissed or completed setup dialog never opens again', () => {
    expect(getStartupDependencyDialog(state({ ffmpegStatus: packagedFfmpeg }), true)).toBeNull();
    // The fork's FFmpeg reminder takes over on later launches while FFmpeg is still missing.
    expect(getStartupDependencyDialog(state(), true)).toEqual({ kind: 'ffmpeg' });
  });

  test('the FFmpeg reminder still covers a system FFmpeg that is missing', () => {
    expect(
      getStartupDependencyDialog(state({ ytdlpSource: 'system', ffmpegSource: 'system' }), false),
    ).toEqual({ kind: 'ffmpeg' });
  });

  test('closing the dialog is remembered in localStorage', () => {
    const values = new Map<string, string>();
    const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
      },
    });
    try {
      expect(hasSeenSetupDialog()).toBe(false);
      markSetupDialogSeen();
      expect(values.get(SETUP_DIALOG_SEEN_KEY)).toBe('true');
      expect(hasSeenSetupDialog()).toBe(true);
    } finally {
      if (original) Object.defineProperty(globalThis, 'localStorage', original);
      else Reflect.deleteProperty(globalThis, 'localStorage');
    }
  });
});

describe('startup gate', () => {
  const checks = { ffmpegLoading: false, channelError: null, denoChecked: true };

  test('waits for FFmpeg, the yt-dlp channels and Deno to be checked', () => {
    expect(isStartupDependencyStateReady(state(), checks)).toBe(true);
    expect(isStartupDependencyStateReady(state(), { ...checks, ffmpegLoading: true })).toBe(false);
    expect(isStartupDependencyStateReady(state({ ffmpegStatus: null }), checks)).toBe(false);
    expect(isStartupDependencyStateReady(state(), { ...checks, denoChecked: false })).toBe(false);
    expect(isStartupDependencyStateReady(state({ ytdlpAllVersions: null }), checks)).toBe(false);
  });

  test('a failed yt-dlp version check or a system yt-dlp still counts as checked', () => {
    const unknown = state({ ytdlpAllVersions: null });
    expect(isStartupDependencyStateReady(unknown, { ...checks, channelError: 'offline' })).toBe(
      true,
    );
    expect(isStartupDependencyStateReady({ ...unknown, ytdlpSource: 'system' }, checks)).toBe(true);
  });

  test('waits for the Deno first-run dialog until the user closes it', () => {
    const idle = { denoFirstRunOpen: false, denoDownloading: false, updateDialogVisible: false };
    expect(isStartupDialogBlocked(idle)).toBe(false);
    // A failed first install keeps its dialog open, and blocking, until the user closes it.
    expect(isStartupDialogBlocked({ ...idle, denoFirstRunOpen: true })).toBe(true);
    // Closing clears the first-run flag, which lets the setup or FFmpeg prompt through.
    expect(isStartupDialogBlocked({ ...idle, denoFirstRunOpen: false })).toBe(false);
    expect(isStartupDialogBlocked({ ...idle, denoDownloading: true })).toBe(true);
  });

  test('an updater with nothing to show does not hold the dialog back', () => {
    // dialogVisible starts true; the update dialog renders nothing until there is an update.
    for (const status of ['initializing', 'idle', 'checking', 'up-to-date', 'external'] as const) {
      expect(updateDialogHasContent(status)).toBe(false);
    }
    for (const status of ['available', 'downloading', 'ready', 'error', 'installed'] as const) {
      expect(updateDialogHasContent(status)).toBe(true);
    }
  });

  test('waits while the update dialog is on screen', () => {
    expect(
      isStartupDialogBlocked({
        denoFirstRunOpen: false,
        denoDownloading: false,
        updateDialogVisible: true,
      }),
    ).toBe(true);
  });

  test('marks the dialog seen only when nothing is missing and yt-dlp is known', () => {
    const complete = state({
      ffmpegStatus: packagedFfmpeg,
      ytdlpChannel: 'stable',
      ytdlpAllVersions: versions({ stable: true }),
    });
    expect(shouldMarkSetupDialogSeen(complete, false, null)).toBe(true);
    expect(shouldMarkSetupDialogSeen(complete, true, null)).toBe(false);
    expect(shouldMarkSetupDialogSeen(state(), false, { kind: 'setup', items: ['ffmpeg'] })).toBe(
      false,
    );
    // The yt-dlp check failed: try again next launch instead of skipping the dialog for good.
    expect(
      shouldMarkSetupDialogSeen(
        state({ ffmpegStatus: packagedFfmpeg, ytdlpAllVersions: null }),
        false,
        null,
      ),
    ).toBe(false);
    expect(
      shouldMarkSetupDialogSeen(
        state({ ffmpegStatus: packagedFfmpeg, ytdlpAllVersions: null, ytdlpSource: 'system' }),
        false,
        null,
      ),
    ).toBe(true);
  });
});

describe('dependency download progress', () => {
  const progress = (stage: 'checksum' | 'downloading' | 'verifying', percent = 0, total = 0) => ({
    stage,
    percent,
    downloaded: Math.round((total * percent) / 100),
    total,
  });

  test('shows size and percent only while downloading with a known size', () => {
    expect(formatDependencyProgressSize(progress('downloading', 50, 20 * 1024 * 1024))).toBe(
      '10.0 / 20.0 MB',
    );
    expect(formatDependencyProgressSize(progress('downloading', 0, 0))).toBeNull();
    expect(dependencyProgressPercent(progress('downloading', 40, 1000))).toBe(40);
  });

  test('labels a download without a known size without a percentage', () => {
    const t = ((key: string) => key) as unknown as TFunction;
    expect(formatDependencyProgressLabel(t, progress('downloading', 0, 0), 'fallback')).toBe(
      'dependencies.downloading',
    );
    expect(formatDependencyProgressLabel(t, progress('downloading', 40, 1000), 'fallback')).toBe(
      'dependencies.downloading 40%',
    );
  });

  test('checksum is indeterminate and verifying is full', () => {
    expect(dependencyProgressPercent(progress('checksum'))).toBeNull();
    expect(dependencyProgressPercent(progress('verifying'))).toBe(100);
    expect(dependencyProgressPercent(null)).toBeNull();
  });
});

describe('setup dialog and gallery-dl strings', () => {
  const localesDir = join(import.meta.dir, '../src/i18n/locales');
  const read = (lang: string, ns: string) =>
    JSON.parse(readFileSync(join(localesDir, lang, `${ns}.json`), 'utf8'));
  const keyPaths = (value: unknown, prefix = ''): string[] =>
    value && typeof value === 'object'
      ? Object.entries(value).flatMap(([key, child]) =>
          keyPaths(child, prefix ? `${prefix}.${key}` : key),
        )
      : [prefix];

  test('every locale has every new key', () => {
    const englishSetupKeys = keyPaths(read('en', 'common').setupDialog);
    for (const lang of readdirSync(localesDir)) {
      expect(keyPaths(read(lang, 'common').setupDialog)).toEqual(englishSetupKeys);
      const settings = read(lang, 'settings').dependencies;
      expect(typeof settings.checkingChecksum).toBe('string');
      expect(typeof settings.installGallerydl).toBe('string');
      const guide = read(lang, 'download').urlInput;
      for (const key of ['guideYtdlpStableTitle', 'guideYtdlpStableText', 'guideSetupQuality']) {
        expect(typeof guide[key]).toBe('string');
      }
    }
  });
});
