import { describe, expect, test } from 'bun:test';
import {
  calculateUpdateTransferStats,
  classifyUpdateError,
  restoreInstalledUpdate,
  runUpdateRetry,
  UPDATE_CHECK_TIMEOUT_MS,
  UPDATE_DOWNLOAD_TIMEOUT_MS,
  UPDATE_STALL_MS,
  type UpdateProgress,
  updaterRestartsAutomatically,
  updateStalledSeconds,
} from '../src/hooks/useAppUpdater';

describe('app updater platform behavior', () => {
  test('expects the Windows installer to restart the app automatically', () => {
    expect(updaterRestartsAutomatically('Win32')).toBe(true);
    expect(updaterRestartsAutomatically('MacIntel')).toBe(false);
    expect(updaterRestartsAutomatically('Linux x86_64')).toBe(false);
  });

  test('bounds update requests without cutting off slow installer downloads', () => {
    const windowsInstallerBytes = 160 * 1024 * 1024;
    const slowBytesPerSecond = 256 * 1024;
    expect(UPDATE_CHECK_TIMEOUT_MS).toBeGreaterThan(0);
    expect(UPDATE_DOWNLOAD_TIMEOUT_MS).toBeGreaterThanOrEqual(
      (windowsInstallerBytes / slowBytesPerSecond) * 1000,
    );
    expect(Number.isFinite(UPDATE_DOWNLOAD_TIMEOUT_MS)).toBe(true);
  });
});

describe('update retry', () => {
  const actions = () => {
    const calls: string[] = [];
    return {
      calls,
      checkForUpdate: async () => {
        calls.push('check');
        return true;
      },
      downloadAndInstall: async () => {
        calls.push('download');
      },
    };
  };

  test('restarts the download when the download failed', async () => {
    const a = actions();
    await runUpdateRetry('download', a);
    expect(a.calls).toEqual(['download']);
  });

  test('checks again when the update check failed', async () => {
    const a = actions();
    await runUpdateRetry('check', a);
    expect(a.calls).toEqual(['check']);
  });
});

describe('stalled update download', () => {
  const progress = (updatedAt: number, phase: UpdateProgress['phase'] = 'downloading') => ({
    downloaded: 68_000_000,
    total: 155_000_000,
    bytesPerSecond: 36_000_000,
    etaSeconds: 3,
    phase,
    updatedAt,
  });

  test('reports nothing while bytes keep arriving', () => {
    expect(updateStalledSeconds(progress(1_000), 1_000 + UPDATE_STALL_MS - 1)).toBeNull();
  });

  test('reports how long the connection has been silent', () => {
    expect(updateStalledSeconds(progress(1_000), 1_000 + 25_400)).toBe(25);
  });

  test('never reports a stall while installing or without progress', () => {
    expect(updateStalledSeconds(progress(0, 'installing'), 60_000)).toBeNull();
    expect(updateStalledSeconds(null, 60_000)).toBeNull();
  });
});

describe('update error reasons', () => {
  test('reads the reason from the plain string the updater rejects with', () => {
    expect(classifyUpdateError('error decoding response body: operation timed out')).toEqual({
      kind: 'timeout',
      detail: 'error decoding response body: operation timed out',
    });
    expect(
      classifyUpdateError('error sending request for url (https://example.com/latest.json)').kind,
    ).toBe('network');
    expect(classifyUpdateError(new Error('signature verification failed')).kind).toBe('signature');
  });

  test('falls back to a generic reason without inventing details', () => {
    expect(classifyUpdateError(undefined)).toEqual({ kind: 'generic', detail: null });
    expect(classifyUpdateError('  ')).toEqual({ kind: 'generic', detail: null });
  });
});

describe('post-update release notes', () => {
  const update = {
    version: '0.19.1-custom.36',
    currentVersion: '0.19.1-custom.34',
    body: 'Release notes',
  };

  test('restores notes only after the target version is running', () => {
    const raw = JSON.stringify(update);
    expect(restoreInstalledUpdate(raw, update.version)).toEqual(update);
    expect(restoreInstalledUpdate(raw, update.currentVersion)).toBeNull();
  });

  test('ignores malformed persisted state', () => {
    expect(restoreInstalledUpdate('{invalid', update.version)).toBeNull();
  });
});

describe('update transfer statistics', () => {
  test('calculates current speed and remaining time', () => {
    const stats = calculateUpdateTransferStats(5_000_000, 15_000_000, 1_000_000, 2_000);

    expect(stats.bytesPerSecond).toBe(2_000_000);
    expect(stats.etaSeconds).toBe(5);
  });

  test('smooths later samples to avoid a jumping ETA', () => {
    const stats = calculateUpdateTransferStats(3_000_000, 10_000_000, 2_000_000, 1_000, 2_000_000);

    expect(stats.bytesPerSecond).toBe(1_700_000);
    expect(stats.etaSeconds).toBe(5);
  });
});
