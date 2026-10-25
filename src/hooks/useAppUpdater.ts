import { getVersion } from '@tauri-apps/api/app';
import { invoke } from '@tauri-apps/api/core';
import { relaunch } from '@tauri-apps/plugin-process';
import { check } from '@tauri-apps/plugin-updater';
import { useCallback, useEffect, useRef, useState } from 'react';
import { parseUpdaterManifest } from '@/lib/updater-manifest';

export interface UpdateInfo {
  version: string;
  currentVersion: string;
  body?: string;
  bodyVi?: string;
  bodyZhCN?: string;
  date?: string;
}

export interface UpdateProgress {
  downloaded: number;
  total: number;
  bytesPerSecond: number;
  etaSeconds: number | null;
  phase: 'downloading' | 'installing';
  /** Date.now() when the last bytes arrived, used to spot a stalled connection. */
  updatedAt: number;
}

export function calculateUpdateTransferStats(
  downloaded: number,
  total: number,
  previousDownloaded: number,
  elapsedMs: number,
  previousBytesPerSecond = 0,
) {
  if (elapsedMs <= 0 || downloaded <= previousDownloaded) {
    return {
      bytesPerSecond: previousBytesPerSecond,
      etaSeconds:
        previousBytesPerSecond > 0 && total > downloaded
          ? Math.ceil((total - downloaded) / previousBytesPerSecond)
          : null,
    };
  }

  const currentBytesPerSecond = ((downloaded - previousDownloaded) * 1000) / elapsedMs;
  const bytesPerSecond =
    previousBytesPerSecond > 0
      ? previousBytesPerSecond * 0.7 + currentBytesPerSecond * 0.3
      : currentBytesPerSecond;

  return {
    bytesPerSecond,
    etaSeconds:
      bytesPerSecond > 0 && total > downloaded
        ? Math.ceil((total - downloaded) / bytesPerSecond)
        : null,
  };
}

export type UpdateStatus =
  | 'initializing'
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'ready'
  | 'error'
  | 'external'
  | 'installed'
  | 'up-to-date';

export const PENDING_UPDATE_STORAGE_KEY = 'youwee:pending-update';
const INSTALLED_UPDATE_SHOWN_STORAGE_KEY = 'youwee:installed-update-shown';

export function restoreInstalledUpdate(raw: string | null, currentVersion: string) {
  if (!raw) return null;

  try {
    const update = JSON.parse(raw) as Partial<UpdateInfo>;
    if (
      update.version !== currentVersion ||
      typeof update.currentVersion !== 'string' ||
      update.currentVersion.length === 0
    ) {
      return null;
    }

    return update as UpdateInfo;
  } catch {
    return null;
  }
}

function toUpdateInfo(update: NonNullable<Awaited<ReturnType<typeof check>>>) {
  const raw = update.rawJson as Record<string, unknown>;
  return {
    version: update.version,
    currentVersion: update.currentVersion,
    body: update.body ?? undefined,
    bodyVi: (raw.notes_vi as string) || undefined,
    bodyZhCN: (raw['notes_zh-CN'] as string) || undefined,
    date: update.date ?? undefined,
  } satisfies UpdateInfo;
}

function readPendingUpdate() {
  try {
    return localStorage.getItem(PENDING_UPDATE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function storePendingUpdate(update: UpdateInfo) {
  try {
    localStorage.setItem(PENDING_UPDATE_STORAGE_KEY, JSON.stringify(update));
  } catch {
    // Updating should still work when web storage is unavailable.
  }
}

function clearPendingUpdate() {
  try {
    localStorage.removeItem(PENDING_UPDATE_STORAGE_KEY);
  } catch {
    // Nothing else is required when web storage is unavailable.
  }
}

function readShownUpdateVersion() {
  try {
    return localStorage.getItem(INSTALLED_UPDATE_SHOWN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeShownUpdateVersion(version: string) {
  try {
    localStorage.setItem(INSTALLED_UPDATE_SHOWN_STORAGE_KEY, version);
  } catch {
    // The dialog can still be dismissed when web storage is unavailable.
  }
}

async function loadCurrentReleaseInfo(currentVersion: string): Promise<UpdateInfo> {
  const fallback = { version: currentVersion, currentVersion: '' };

  try {
    const raw = await invoke<unknown>('get_current_release_metadata');
    const manifest = parseUpdaterManifest(raw);
    if (manifest.version !== currentVersion) return fallback;

    return {
      ...fallback,
      body: manifest.notes,
      bodyVi: manifest.notes_vi,
      bodyZhCN: manifest['notes_zh-CN'],
      date: manifest.pub_date,
    };
  } catch {
    return fallback;
  }
}

export const updaterRestartsAutomatically = (platform: string) => platform.includes('Win');

// The updater has no idle timeout, so a stalled connection hung the download forever.
// These bound the whole request; the download limit allows ~160 MB at 256 KB/s.
export const UPDATE_CHECK_TIMEOUT_MS = 30_000;
export const UPDATE_DOWNLOAD_TIMEOUT_MS = 15 * 60_000;

export type UpdateStep = 'check' | 'download';

// Retry repeats the step that failed, so one click restarts a failed download.
export function runUpdateRetry(
  failedStep: UpdateStep,
  actions: { checkForUpdate: () => Promise<unknown>; downloadAndInstall: () => Promise<unknown> },
) {
  return failedStep === 'download' ? actions.downloadAndInstall() : actions.checkForUpdate();
}

// No bytes for this long means the connection has stalled, so the frozen speed and ETA are hidden.
export const UPDATE_STALL_MS = 10_000;

/** Whole seconds since the last bytes arrived, or null while data is still flowing. */
export function updateStalledSeconds(progress: UpdateProgress | null, now: number) {
  if (!progress || progress.phase !== 'downloading') return null;
  const idleMs = now - progress.updatedAt;
  return idleMs >= UPDATE_STALL_MS ? Math.floor(idleMs / 1000) : null;
}

/** Ticks once a second while a download runs and reports how long it has stalled. */
export function useUpdateStall(progress: UpdateProgress | null, active: boolean) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active]);

  return active ? updateStalledSeconds(progress, now) : null;
}

export type UpdateErrorKind = 'timeout' | 'network' | 'signature' | 'generic';

// The updater rejects with a plain string, so the reason is read from its text. A stalled download
// hits the request deadline mid-body and surfaces only as reqwest's "error decoding response body".
export function classifyUpdateError(err: unknown): {
  kind: UpdateErrorKind;
  detail: string | null;
} {
  const detail = (typeof err === 'string' ? err : err instanceof Error ? err.message : '').trim();
  const kind: UpdateErrorKind = /signature|minisign/i.test(detail)
    ? 'signature'
    : /timed out|timeout|error decoding response body/i.test(detail)
      ? 'timeout'
      : /error sending request|connect|dns|resolve|network|unreachable|tls|certificate/i.test(
            detail,
          )
        ? 'network'
        : 'generic';
  return { kind, detail: detail || null };
}

/** Downloads or processing jobs still running; restarting to install would stop them. */
export function useAppUpdater(runningJobs = 0) {
  const [status, setStatusState] = useState<UpdateStatus>('initializing');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [progress, setProgress] = useState<UpdateProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<UpdateErrorKind>('generic');
  const [failedStep, setFailedStep] = useState<UpdateStep>('check');
  const [restartQueued, setRestartQueued] = useState(false);
  const runningJobsRef = useRef(runningJobs);
  runningJobsRef.current = runningJobs;
  const [dialogHidden, setDialogHidden] = useState(false);
  // Set once a running download is sent to the background; reopening the dialog does not undo it.
  const [installAfterRestart, setInstallAfterRestart] = useState(false);
  const installAfterRestartRef = useRef(false);
  const pendingInstallRef = useRef<NonNullable<Awaited<ReturnType<typeof check>>> | null>(null);

  const setInstallLater = useCallback((later: boolean) => {
    installAfterRestartRef.current = later;
    setInstallAfterRestart(later);
  }, []);

  // Hiding the dialog lasts until the update moves to its next state.
  const setStatus = useCallback((next: UpdateStatus) => {
    setStatusState(next);
    setDialogHidden(false);
  }, []);

  const fail = useCallback(
    (step: UpdateStep, err: unknown) => {
      const { kind, detail } = classifyUpdateError(err);
      setError(detail);
      setErrorKind(kind);
      setFailedStep(step);
      setStatus('error');
    },
    [setStatus],
  );

  useEffect(() => {
    let active = true;

    const restoreUpdateState = async () => {
      try {
        const currentVersion = await getVersion();
        if (!active) return;
        const raw = readPendingUpdate();
        const installedUpdate = restoreInstalledUpdate(raw, currentVersion);
        if (installedUpdate) {
          setUpdateInfo(installedUpdate);
          setStatus('installed');
          return;
        }

        if (raw) clearPendingUpdate();
        if (readShownUpdateVersion() === currentVersion) {
          setStatus('idle');
          return;
        }

        const launchedAfterUpdate = await invoke<boolean>('was_launched_after_update').catch(
          () => false,
        );
        if (!active) return;
        if (launchedAfterUpdate) {
          const releaseInfo = await loadCurrentReleaseInfo(currentVersion);
          if (!active) return;
          setUpdateInfo(releaseInfo);
          setStatus('installed');
        } else {
          setStatus('idle');
        }
      } catch {
        if (active) setStatus('idle');
      }
    };

    void restoreUpdateState();

    return () => {
      active = false;
    };
  }, [setStatus]);

  const isExternalUpdateManaged = useCallback(async () => {
    try {
      return await invoke<boolean>('is_flatpak_environment');
    } catch {
      return false;
    }
  }, []);

  const checkForUpdate = useCallback(async () => {
    setStatus('checking');
    setError(null);

    try {
      if (await isExternalUpdateManaged()) {
        setUpdateInfo(null);
        setStatus('external');
        return false;
      }

      const update = await check({ timeout: UPDATE_CHECK_TIMEOUT_MS });

      if (update) {
        setUpdateInfo(toUpdateInfo(update));
        setStatus('available');
        return true;
      } else {
        setStatus('up-to-date');
        return false;
      }
    } catch (err) {
      fail('check', err);
      return false;
    }
  }, [isExternalUpdateManaged, setStatus, fail]);

  const downloadAndInstall = useCallback(async () => {
    setStatus('downloading');
    setInstallLater(false);
    setProgress({
      downloaded: 0,
      total: 0,
      bytesPerSecond: 0,
      etaSeconds: null,
      phase: 'downloading',
      updatedAt: Date.now(),
    });

    try {
      if (await isExternalUpdateManaged()) {
        setProgress(null);
        setUpdateInfo(null);
        setStatus('external');
        return;
      }

      const update = await check({ timeout: UPDATE_CHECK_TIMEOUT_MS });

      if (!update) {
        setStatus('up-to-date');
        return;
      }

      const pendingUpdate = toUpdateInfo(update);
      setUpdateInfo(pendingUpdate);
      storePendingUpdate(pendingUpdate);

      let downloaded = 0;
      let contentLength = 0;
      let sampledDownloaded = 0;
      let sampledAt = performance.now();
      let bytesPerSecond = 0;
      let etaSeconds: number | null = null;

      await update.download(
        (event) => {
          switch (event.event) {
            case 'Started':
              contentLength = event.data.contentLength ?? 0;
              sampledAt = performance.now();
              setProgress({
                downloaded: 0,
                total: contentLength,
                bytesPerSecond: 0,
                etaSeconds: null,
                phase: 'downloading',
                updatedAt: Date.now(),
              });
              break;
            case 'Progress': {
              downloaded += event.data.chunkLength;
              const now = performance.now();
              const elapsedMs = now - sampledAt;
              if (elapsedMs >= 500) {
                ({ bytesPerSecond, etaSeconds } = calculateUpdateTransferStats(
                  downloaded,
                  contentLength,
                  sampledDownloaded,
                  elapsedMs,
                  bytesPerSecond,
                ));
                sampledDownloaded = downloaded;
                sampledAt = now;
              }
              setProgress({
                downloaded,
                total: contentLength,
                bytesPerSecond,
                etaSeconds,
                phase: 'downloading',
                updatedAt: Date.now(),
              });
              break;
            }
            case 'Finished':
              setProgress({
                downloaded: contentLength || downloaded,
                total: contentLength,
                bytesPerSecond: 0,
                etaSeconds: 0,
                phase: 'installing',
                updatedAt: Date.now(),
              });
              break;
          }
        },
        { timeout: UPDATE_DOWNLOAD_TIMEOUT_MS },
      );

      // A download sent to the background, or one that finishes while videos are still downloading,
      // waits for Restart, so the installer never closes the app mid-task.
      if (installAfterRestartRef.current || runningJobsRef.current > 0) {
        pendingInstallRef.current = update;
      } else {
        await update.install();
      }
      setStatus('ready');
    } catch (err) {
      fail('download', err);
    }
  }, [isExternalUpdateManaged, setStatus, setInstallLater, fail]);

  const retryUpdate = useCallback(
    () => runUpdateRetry(failedStep, { checkForUpdate, downloadAndInstall }),
    [failedStep, checkForUpdate, downloadAndInstall],
  );

  const restartApp = useCallback(async () => {
    setRestartQueued(false);
    const pending = pendingInstallRef.current;
    if (pending) {
      pendingInstallRef.current = null;
      setStatus('downloading');
      setProgress(
        (current) => current && { ...current, phase: 'installing', updatedAt: Date.now() },
      );
      try {
        await pending.install();
      } catch (err) {
        fail('download', err);
        return;
      }
    }
    try {
      await relaunch();
    } catch {
      // The update is installed; leave Restart available instead of a stuck progress bar.
      setStatus('ready');
    }
  }, [setStatus, fail]);

  // Closing the dialog only hides it: Settings > About keeps the update, its progress or its error.
  const dismissUpdate = useCallback(() => {
    if (status !== 'installed') {
      if (status === 'downloading') setInstallLater(true);
      setDialogHidden(true);
      return;
    }
    if (updateInfo) storeShownUpdateVersion(updateInfo.version);
    clearPendingUpdate();
    setStatus('idle');
    setUpdateInfo(null);
  }, [status, updateInfo, setStatus, setInstallLater]);

  const showUpdateDialog = useCallback(() => setDialogHidden(false), []);

  // "Restart when they finish": wait for running jobs to reach zero, then install and restart.
  const queueRestart = useCallback(() => {
    setRestartQueued(true);
    setDialogHidden(true);
  }, []);

  useEffect(() => {
    if (restartQueued && status === 'ready' && runningJobs === 0) void restartApp();
  }, [restartQueued, status, runningJobs, restartApp]);

  return {
    status,
    updateInfo,
    progress,
    error,
    errorKind,
    failedStep,
    dialogVisible: !dialogHidden,
    installAfterRestart,
    runningJobs,
    restartQueued,
    checkForUpdate,
    downloadAndInstall,
    retryUpdate,
    restartApp,
    dismissUpdate,
    showUpdateDialog,
    queueRestart,
  };
}
