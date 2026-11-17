import { describe, expect, test } from 'bun:test';
import i18next from 'i18next';
import { renderToStaticMarkup } from 'react-dom/server';
import { I18nextProvider } from 'react-i18next';
import { DenoDialog } from '@/components/DenoDialog';
import { SetupDialog } from '@/components/SetupDialog';
import {
  DependenciesContext,
  type DependenciesContextType,
  type FfmpegStatus,
} from '@/contexts/DependenciesContext';
import common from '@/i18n/locales/en/common.json';
import settings from '@/i18n/locales/en/settings.json';
import type { SetupItem } from '@/lib/setup-dialog';
import type { YtdlpAllVersions } from '@/lib/types';

// Own instance so these resources do not leak into other test files.
const i18n = i18next.createInstance();
await i18n.init({ lng: 'en', resources: { en: { common, settings } } });

const versions = (installed: Partial<Record<'stable' | 'nightly', boolean>> = {}) => {
  const info = (channel: string, ok: boolean) => ({
    channel,
    version: ok ? '2026.10.01' : null,
    installed: ok,
    binary_path: null,
  });
  return {
    current_channel: 'bundled',
    using_fallback: false,
    bundled: info('bundled', true),
    stable: info('stable', installed.stable ?? false),
    nightly: info('nightly', installed.nightly ?? false),
    master: info('master', false),
  } satisfies YtdlpAllVersions;
};

const noFfmpeg: FfmpegStatus = {
  installed: false,
  version: null,
  binary_path: null,
  is_system: false,
  is_bundled: false,
};

const resolved = async () => true;

function deps(overrides: Partial<DependenciesContextType> = {}): DependenciesContextType {
  return {
    ytdlpSource: 'auto',
    ytdlpChannel: 'bundled',
    ytdlpAllVersions: versions(),
    ytdlpDownloadingChannel: null,
    ytdlpDownloadProgress: null,
    isChannelDownloading: false,
    channelError: null,
    downloadChannelBinary: resolved,
    setYtdlpChannel: async () => {},
    ffmpegSource: 'auto',
    ffmpegStatus: noFfmpeg,
    ffmpegDownloading: false,
    ffmpegDownloadProgress: null,
    ffmpegError: null,
    downloadFfmpeg: resolved,
    denoStatus: null,
    denoDownloading: false,
    denoError: null,
    denoSuccess: false,
    downloadDeno: async () => {},
    ...overrides,
  } as DependenciesContextType;
}

function renderSetup(items: SetupItem[], value: DependenciesContextType) {
  return renderToStaticMarkup(
    <I18nextProvider i18n={i18n}>
      <DependenciesContext.Provider value={value}>
        <SetupDialog items={items} onClose={() => {}} onOpenDependencies={() => {}} />
      </DependenciesContext.Provider>
    </I18nextProvider>,
  );
}

const button = (html: string, label: string) =>
  html.match(new RegExp(`<button[^>]*>(?:(?!</button>).)*${label}</button>`))?.[0] ?? '';

describe('setup dialog rendering', () => {
  test('a missing FFmpeg is a labelled dialog the user can set up or close', () => {
    const html = renderSetup(['ffmpeg'], deps());

    expect(html).toContain('role="dialog"');
    expect(html).toContain('Install FFmpeg');
    expect(html).toContain('Not installed');
    expect(button(html, 'Later')).not.toContain('disabled=""');
    expect(button(html, 'Set up all')).not.toContain('disabled=""');
  });

  test('Nightly with a missing file is offered a re-download, not a switch to Stable', () => {
    const html = renderSetup(['ytdlp'], deps({ ytdlpChannel: 'nightly' }));

    expect(html).toContain('Re-download yt-dlp Nightly');
    expect(html).toContain('File missing');
    expect(html).not.toContain('Switch yt-dlp to');
    expect(html).not.toContain('Stable is updated more often');
  });

  test('a download the app started on its own shows progress but does not lock the dialog', () => {
    const html = renderSetup(
      ['ytdlp'],
      deps({
        ytdlpChannel: 'nightly',
        isChannelDownloading: true,
        ytdlpDownloadingChannel: 'nightly',
        ytdlpDownloadProgress: {
          stage: 'downloading',
          percent: 40,
          downloaded: 4 * 1024 * 1024,
          total: 10 * 1024 * 1024,
        },
      }),
    );

    expect(html).toContain('Downloading 40%');
    expect(html).toContain('4.0 / 10.0 MB');
    expect(button(html, 'Later')).not.toContain('disabled=""');
    expect(button(html, 'Dependencies settings')).not.toContain('disabled=""');
    // Nothing left for the dialog itself to run while the app's own download is going.
    expect(button(html, 'Set up all')).toContain('disabled=""');
  });

  test('a download without a known size shows no frozen 0%', () => {
    const html = renderSetup(
      ['ffmpeg'],
      deps({
        ffmpegDownloading: true,
        ffmpegDownloadProgress: { stage: 'downloading', percent: 0, downloaded: 0, total: 0 },
      }),
    );

    expect(html).toContain('Downloading');
    expect(html).not.toContain('Downloading 0%');
  });

  test('the user-opened dialog lists the Stable upgrade and ends with Done once all is set', () => {
    const pending = renderSetup(['ytdlp', 'ffmpeg'], deps());
    expect(pending).toContain('Switch yt-dlp to Stable');
    expect(pending).toContain('Download &amp; switch');

    const done = renderSetup(
      ['ytdlp', 'ffmpeg'],
      deps({
        ytdlpChannel: 'stable',
        ytdlpAllVersions: versions({ stable: true }),
        ffmpegStatus: { ...noFfmpeg, installed: true, version: '8.1' },
      }),
    );
    expect(done).toContain('In use');
    expect(button(done, 'Done')).not.toBe('');
    expect(done).not.toContain('Set up all');
  });
});

describe('Deno first-run dialog', () => {
  test('a failed first install stays on screen with Skip until the user closes it', () => {
    const html = renderToStaticMarkup(
      <DependenciesContext.Provider value={deps({ denoError: 'Network error' })}>
        <DenoDialog onDismiss={() => {}} />
      </DependenciesContext.Provider>,
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('Network error');
    expect(button(html, 'Skip')).not.toBe('');
  });
});
