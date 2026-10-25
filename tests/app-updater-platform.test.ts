import { describe, expect, test } from 'bun:test';
import {
  calculateUpdateTransferStats,
  restoreInstalledUpdate,
  runUpdateRetry,
  UPDATE_CHECK_TIMEOUT_MS,
  UPDATE_DOWNLOAD_TIMEOUT_MS,
  updateRefreshAction,
  updaterRestartsAutomatically,
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

describe('settings update refresh button', () => {
  const actions = { checkForUpdate: 'check', retryUpdate: 'retry' };

  test('retries the failed step while an update error is showing', () => {
    expect(updateRefreshAction('error', actions)).toBe('retry');
  });

  test('checks for updates in every other state', () => {
    for (const status of ['idle', 'up-to-date', 'available', 'installed'] as const) {
      expect(updateRefreshAction(status, actions)).toBe('check');
    }
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
