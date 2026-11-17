import type { FfmpegStatus } from '@/contexts/DependenciesContext';
import type { DependencySource, YtdlpAllVersions, YtdlpChannel } from '@/lib/types';

export type SetupItem = 'ytdlp' | 'ffmpeg';

/** Set once the first-run setup dialog has been shown and closed, or was not needed. */
export const SETUP_DIALOG_SEEN_KEY = 'youwee_setup_dialog_seen';

const OPEN_SETUP_DIALOG_EVENT = 'youwee:open-setup-dialog';

export function hasSeenSetupDialog(): boolean {
  try {
    return localStorage.getItem(SETUP_DIALOG_SEEN_KEY) === 'true';
  } catch {
    return false;
  }
}

export function markSetupDialogSeen(): void {
  try {
    localStorage.setItem(SETUP_DIALOG_SEEN_KEY, 'true');
  } catch {
    // Non-critical: the dialog may show again on the next launch.
  }
}

/** Ask the app shell to open the setup dialog (e.g. from the download guide). */
export function requestOpenSetupDialog(): void {
  window.dispatchEvent(new Event(OPEN_SETUP_DIALOG_EVENT));
}

export function onOpenSetupDialogRequest(handler: () => void): () => void {
  window.addEventListener(OPEN_SETUP_DIALOG_EVENT, handler);
  return () => window.removeEventListener(OPEN_SETUP_DIALOG_EVENT, handler);
}

export interface SetupDependencyState {
  ytdlpSource: DependencySource;
  ytdlpChannel: YtdlpChannel;
  ytdlpAllVersions: YtdlpAllVersions | null;
  ffmpegSource: DependencySource;
  ffmpegStatus: FfmpegStatus | null;
}

/** Items that the setup dialog can manage. System-managed dependencies are left alone. */
export function getApplicableSetupItems(state: SetupDependencyState): SetupItem[] {
  const items: SetupItem[] = [];
  if (state.ytdlpSource !== 'system' && state.ytdlpAllVersions) {
    items.push('ytdlp');
  }
  if (state.ffmpegSource !== 'system' && state.ffmpegStatus) {
    items.push('ffmpeg');
  }
  return items;
}

/**
 * Where yt-dlp stands relative to the recommended setup:
 * - `notDownloaded`: using bundled, Stable binary not on disk yet
 * - `downloadedNotActive`: Stable binary is on disk but the bundled build is still in use
 * - `missingFile`: a downloaded channel is selected but its binary is missing (bundled fallback)
 * - `active`: a downloaded channel (Stable, Nightly or Master) is selected and installed
 */
export type YtdlpSetupState = 'notDownloaded' | 'downloadedNotActive' | 'missingFile' | 'active';

export function getYtdlpSetupState(state: SetupDependencyState): YtdlpSetupState {
  const versions = state.ytdlpAllVersions;
  if (state.ytdlpChannel === 'bundled') {
    return versions?.stable.installed ? 'downloadedNotActive' : 'notDownloaded';
  }
  return versions?.[state.ytdlpChannel].installed ? 'active' : 'missingFile';
}

/** The channel the dialog installs: Nightly and Master users keep theirs, everyone else gets Stable. */
export function getYtdlpTargetChannel(
  state: SetupDependencyState,
): Exclude<YtdlpChannel, 'bundled'> {
  return state.ytdlpChannel === 'bundled' ? 'stable' : state.ytdlpChannel;
}

/** Whether reaching the target needs a download (switching to an installed binary does not). */
export function ytdlpSetupNeedsDownload(setupState: YtdlpSetupState): boolean {
  return setupState === 'notDownloaded' || setupState === 'missingFile';
}

/** FFmpeg counts as done whenever it resolves, including the copy packaged with Youwee. */
export function isSetupItemDone(item: SetupItem, state: SetupDependencyState): boolean {
  if (item === 'ytdlp') {
    return getYtdlpSetupState(state) === 'active';
  }
  return state.ffmpegStatus?.installed === true;
}

/**
 * Items that are really missing, the only reason to open the dialog on its own: no FFmpeg, or a
 * selected yt-dlp channel whose file is gone. Moving from the bundled yt-dlp to Stable is only
 * offered when the user opens the dialog, so a complete install (e.g. the Windows Full pack)
 * starts without any prompt.
 */
export function getMissingSetupItems(state: SetupDependencyState): SetupItem[] {
  return getApplicableSetupItems(state).filter((item) =>
    item === 'ytdlp'
      ? getYtdlpSetupState(state) === 'missingFile'
      : state.ffmpegStatus?.installed !== true,
  );
}

export type StartupDependencyDialog = { kind: 'setup'; items: SetupItem[] } | { kind: 'ffmpeg' };

/**
 * Which dependency dialog to open once the startup checks are done, at most one per launch.
 * The setup dialog takes the first launch until it has been seen; after that the FFmpeg
 * reminder keeps showing while FFmpeg is missing, as it did before the setup dialog existed.
 */
export function getStartupDependencyDialog(
  state: SetupDependencyState,
  setupSeen: boolean,
): StartupDependencyDialog | null {
  if (!setupSeen) {
    const items = getMissingSetupItems(state);
    if (items.length > 0) return { kind: 'setup', items };
  }
  return state.ffmpegStatus?.installed === false ? { kind: 'ffmpeg' } : null;
}

/** Startup checks are done once FFmpeg, the yt-dlp channel info and Deno have all been looked at. */
export function isStartupDependencyStateReady(
  state: SetupDependencyState,
  checks: { ffmpegLoading: boolean; channelError: string | null; denoChecked: boolean },
): boolean {
  return (
    !checks.ffmpegLoading &&
    state.ffmpegStatus !== null &&
    (state.ytdlpSource === 'system' ||
      state.ytdlpAllVersions !== null ||
      checks.channelError !== null) &&
    checks.denoChecked
  );
}

/**
 * The first-launch Deno dialog stays on screen from the auto-install until the user closes it
 * or Deno gets installed, including through the dialog's own Try Again.
 */
export function isDenoFirstRunDialogOpen(
  autoInstallFlag: boolean,
  denoStatus: { installed: boolean } | null,
): boolean {
  return autoInstallFlag && denoStatus?.installed !== true;
}

/**
 * Another startup dialog owns the screen, so the dependency dialog waits: the Deno first-run
 * install (while it runs or shows its error, until the user closes it) or the app update dialog.
 */
export function isStartupDialogBlocked(blockers: {
  denoFirstRunOpen: boolean;
  denoDownloading: boolean;
  updateDialogVisible: boolean;
}): boolean {
  return blockers.denoFirstRunOpen || blockers.denoDownloading || blockers.updateDialogVisible;
}

/**
 * The setup dialog may be recorded as seen only once the yt-dlp channel state is known, so a
 * failed version check cannot skip a missing channel file for good.
 */
export function isYtdlpSetupStateKnown(state: SetupDependencyState): boolean {
  return state.ytdlpSource === 'system' || state.ytdlpAllVersions !== null;
}

/** Record the setup dialog as seen without showing it when nothing is missing. */
export function shouldMarkSetupDialogSeen(
  state: SetupDependencyState,
  setupSeen: boolean,
  dialog: StartupDependencyDialog | null,
): boolean {
  if (setupSeen || dialog?.kind === 'setup') return false;
  return isYtdlpSetupStateKnown(state);
}
