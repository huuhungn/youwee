import { expect, test } from 'bun:test';
import i18n from 'i18next';
import { renderToStaticMarkup } from 'react-dom/server';
import { initReactI18next } from 'react-i18next';
import { UpdateDialog } from '@/components/UpdateDialog';
import common from '@/i18n/locales/en/common.json';

await i18n.use(initReactI18next).init({ lng: 'en', resources: { en: { common } } });

const noop = () => {};
const base = {
  updateInfo: { version: '0.20.1-custom.9', currentVersion: '0.20.1-custom.8' },
  error: null,
  errorKind: 'generic' as const,
  failedStep: 'download' as const,
  onDownload: noop,
  onRestart: noop,
  onDismiss: noop,
  onRetry: noop,
};
const progress = (updatedAt: number) => ({
  downloaded: 71_303_168,
  total: 162_840_000,
  bytesPerSecond: 36_000_000,
  etaSeconds: 3,
  phase: 'downloading' as const,
  updatedAt,
});

test('update dialog is a labelled modal dialog with a labelled close button', () => {
  const html = renderToStaticMarkup(<UpdateDialog {...base} status="available" progress={null} />);

  expect(html).toContain('role="dialog"');
  const labelledBy = html.match(/aria-labelledby="([^"]+)"/)?.[1];
  expect(html).toContain(`id="${labelledBy}"`);
  expect(html).toContain('aria-label="Close"');
});

test('a running download can be sent to the background', () => {
  const html = renderToStaticMarkup(
    <UpdateDialog {...base} status="downloading" progress={progress(Date.now())} />,
  );

  expect(html).toContain('Downloading Update');
  expect(html).toContain('aria-valuenow="44"');
  expect(html).toContain('Continue in background');
  expect(html).not.toContain('No data for');
});

test('a silent connection replaces the frozen speed and time remaining', () => {
  const html = renderToStaticMarkup(
    <UpdateDialog {...base} status="downloading" progress={progress(Date.now() - 30_000)} />,
  );

  expect(html).toContain('No data for 30s');
  expect(html).not.toContain('remaining');
});

test('a failed download explains the reason, where it stopped and the raw error', () => {
  const html = renderToStaticMarkup(
    <UpdateDialog
      {...base}
      status="error"
      errorKind="timeout"
      error="error decoding response body: operation timed out"
      progress={progress(0)}
    />,
  );

  expect(html).toContain('The update server stopped responding');
  expect(html).toContain('Stopped at 44% (68 MB of 155.3 MB)');
  expect(html).toContain('operation timed out');
  expect(html).toContain('v0.20.1-custom.9');
});

test('a dialog that opens on its own never puts focus on an action that installs or downloads', () => {
  const safe = {
    available: 'Later',
    downloading: 'Continue in background',
    ready: 'Later',
    error: 'Dismiss',
  } as const;
  for (const [status, label] of Object.entries(safe)) {
    const html = renderToStaticMarkup(
      <UpdateDialog
        {...base}
        status={status as keyof typeof safe}
        progress={progress(Date.now())}
      />,
    );
    expect(html.match(/data-autofocus="true"[^>]*>([^<]+)</)?.[1]).toBe(label);
  }
});

test('a download waiting for Restart does not promise an automatic restart', () => {
  const html = renderToStaticMarkup(
    <UpdateDialog
      {...base}
      status="downloading"
      progress={progress(Date.now())}
      installAfterRestart
    />,
  );

  expect(html).not.toContain('close and reopen automatically');
});
