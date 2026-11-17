import {
  ArrowRightLeft,
  CheckCircle2,
  Download,
  Film,
  Loader2,
  RefreshCw,
  Settings2,
} from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DependencyProgress } from '@/components/DependencyProgress';
import { Button } from '@/components/ui/button';
import { ModalShell, useDialogIds } from '@/components/ui/ModalShell';
import { type DownloadProgress, useDependencies } from '@/contexts/DependenciesContext';
import { formatDependencyProgressLabel } from '@/lib/dependency-progress';
import {
  getYtdlpSetupState,
  getYtdlpTargetChannel,
  isSetupItemDone,
  type SetupDependencyState,
  type SetupItem,
  ytdlpSetupNeedsDownload,
} from '@/lib/setup-dialog';
import { cn } from '@/lib/utils';

interface SetupDialogProps {
  /** Items to list. Frozen by the caller when the dialog opens so installed items stay visible. */
  items: SetupItem[];
  onClose: () => void;
  onOpenDependencies: () => void;
}

type BadgeTone = 'pending' | 'ready' | 'busy' | 'done' | 'error';

interface ItemView {
  icon: typeof Download;
  title: string;
  text: string;
  badge: { tone: BadgeTone; label: string };
  detail: string | null;
  busy: { label: string; progress: DownloadProgress | null } | null;
  error: string | null;
  action: { label: string; icon: ReactNode; run: () => Promise<boolean> } | null;
}

const CHANNEL_LABEL_KEYS = {
  stable: 'dependencies.channelStable',
  nightly: 'dependencies.channelNightly',
  master: 'dependencies.channelMaster',
} as const;

/**
 * First-run setup for the best download quality: yt-dlp on a downloaded channel and FFmpeg.
 * It drives the same DependenciesContext actions as Settings → Dependencies, so progress and
 * errors match there, and an FFmpeg already packaged with Youwee is never offered again.
 */
export function SetupDialog({ items, onClose, onOpenDependencies }: SetupDialogProps) {
  const { t } = useTranslation('common');
  const { t: tSettings } = useTranslation('settings');
  const { titleId, descriptionId } = useDialogIds();
  const deps = useDependencies();
  const [attempted, setAttempted] = useState<Record<SetupItem, boolean>>({
    ytdlp: false,
    ffmpeg: false,
  });
  const [isSwitchingYtdlp, setIsSwitchingYtdlp] = useState(false);
  const [isInstallingAll, setIsInstallingAll] = useState(false);
  // The step this dialog started; a download the app runs on its own must not lock the dialog.
  const [runningItem, setRunningItem] = useState<SetupItem | null>(null);

  const state: SetupDependencyState = {
    ytdlpSource: deps.ytdlpSource,
    ytdlpChannel: deps.ytdlpChannel,
    ytdlpAllVersions: deps.ytdlpAllVersions,
    ffmpegSource: deps.ffmpegSource,
    ffmpegStatus: deps.ffmpegStatus,
  };

  const busyView = (progress: DownloadProgress | null, fallback: string) => ({
    label: formatDependencyProgressLabel(tSettings, progress, fallback),
    progress,
  });

  // --- yt-dlp ---------------------------------------------------------------
  const ytdlpTarget = getYtdlpTargetChannel(state);
  const ytdlpTargetName = tSettings(CHANNEL_LABEL_KEYS[ytdlpTarget]);

  const runYtdlp = async (): Promise<boolean> => {
    setAttempted((prev) => ({ ...prev, ytdlp: true }));
    setRunningItem('ytdlp');
    try {
      const target = getYtdlpTargetChannel(state);
      if (ytdlpSetupNeedsDownload(getYtdlpSetupState(state))) {
        // Download first and only then switch, so a failed download keeps the working bundled binary.
        const downloaded = await deps.downloadChannelBinary(target);
        if (!downloaded) return false;
      }
      if (deps.ytdlpChannel !== target) {
        setIsSwitchingYtdlp(true);
        try {
          await deps.setYtdlpChannel(target);
        } finally {
          setIsSwitchingYtdlp(false);
        }
      }
      return true;
    } finally {
      setRunningItem(null);
    }
  };

  const ytdlpView = (): ItemView => {
    const setupState = getYtdlpSetupState(state);
    const versions = deps.ytdlpAllVersions;
    const targetVersion = versions?.[ytdlpTarget].version ?? '';
    const bundledVersion = versions?.bundled.version ?? '';
    const downloadingTarget = deps.ytdlpDownloadingChannel === ytdlpTarget;
    // Another channel download (e.g. from Settings) is running: wait for it instead of racing.
    const otherDownload = deps.isChannelDownloading && !downloadingTarget;
    const error = attempted.ytdlp && !downloadingTarget ? deps.channelError : null;

    const missingFile = setupState === 'missingFile';
    // A selected channel whose file is gone is re-downloaded, not "switched to" (Nightly, Master).
    const base: Pick<ItemView, 'icon' | 'title' | 'text'> = missingFile
      ? {
          icon: Download,
          title: t('setupDialog.ytdlp.redownloadTitle', { channel: ytdlpTargetName }),
          text: t('setupDialog.ytdlp.redownloadText'),
        }
      : {
          icon: Download,
          title: t('setupDialog.ytdlp.title', { channel: ytdlpTargetName }),
          text: t('setupDialog.ytdlp.text'),
        };

    if (downloadingTarget) {
      return {
        ...base,
        badge: { tone: 'busy', label: t('setupDialog.status.downloading') },
        detail: null,
        busy: busyView(deps.ytdlpDownloadProgress, tSettings('dependencies.downloadingYtdlp')),
        error: null,
        action: null,
      };
    }
    if (isSwitchingYtdlp) {
      return {
        ...base,
        badge: { tone: 'busy', label: t('setupDialog.status.switching') },
        detail: null,
        busy: { label: t('setupDialog.status.switching'), progress: null },
        error: null,
        action: null,
      };
    }
    if (setupState === 'active') {
      return {
        ...base,
        badge: { tone: 'done', label: t('setupDialog.status.inUse') },
        detail: t('setupDialog.ytdlp.inUse', {
          channel: ytdlpTargetName,
          version: targetVersion,
        }),
        busy: null,
        error: null,
        action: null,
      };
    }

    if (setupState === 'downloadedNotActive') {
      return {
        ...base,
        badge: { tone: 'ready', label: t('setupDialog.status.downloadedNotActive') },
        detail: t('setupDialog.ytdlp.downloaded', {
          channel: ytdlpTargetName,
          version: targetVersion,
          bundled: bundledVersion,
        }),
        busy: null,
        error,
        action: otherDownload
          ? null
          : {
              label: t('setupDialog.actions.switch', { channel: ytdlpTargetName }),
              icon: <ArrowRightLeft className="h-3 w-3" />,
              run: runYtdlp,
            },
      };
    }

    return {
      ...base,
      badge: error
        ? { tone: 'error', label: t('setupDialog.status.failed') }
        : {
            tone: 'pending',
            label: missingFile
              ? t('setupDialog.status.missingFile')
              : t('setupDialog.status.notDownloaded'),
          },
      detail: missingFile
        ? t('setupDialog.ytdlp.missingFile', { channel: ytdlpTargetName, bundled: bundledVersion })
        : bundledVersion
          ? t('setupDialog.ytdlp.current', { version: bundledVersion })
          : null,
      busy: null,
      error,
      action: otherDownload
        ? null
        : {
            label: error
              ? t('setupDialog.actions.retry')
              : missingFile
                ? t('setupDialog.actions.download')
                : t('setupDialog.actions.downloadAndSwitch'),
            icon: error ? <RefreshCw className="h-3 w-3" /> : <Download className="h-3 w-3" />,
            run: runYtdlp,
          },
    };
  };

  // --- FFmpeg ---------------------------------------------------------------
  const runFfmpeg = async (): Promise<boolean> => {
    setAttempted((prev) => ({ ...prev, ffmpeg: true }));
    setRunningItem('ffmpeg');
    try {
      return await deps.downloadFfmpeg();
    } finally {
      setRunningItem(null);
    }
  };

  const ffmpegView = (): ItemView => {
    const base: Pick<ItemView, 'icon' | 'title' | 'text'> = {
      icon: Film,
      title: t('setupDialog.ffmpeg.title'),
      text: t('setupDialog.ffmpeg.text'),
    };
    if (deps.ffmpegDownloading) {
      return {
        ...base,
        badge: { tone: 'busy', label: t('setupDialog.status.downloading') },
        detail: null,
        busy: busyView(deps.ffmpegDownloadProgress, tSettings('dependencies.installing')),
        error: null,
        action: null,
      };
    }
    if (deps.ffmpegStatus?.installed) {
      return {
        ...base,
        badge: { tone: 'done', label: t('setupDialog.status.installed') },
        detail: deps.ffmpegStatus.version ? `FFmpeg ${deps.ffmpegStatus.version}` : null,
        busy: null,
        error: null,
        action: null,
      };
    }
    const error = attempted.ffmpeg ? deps.ffmpegError : null;
    return {
      ...base,
      badge: error
        ? { tone: 'error', label: t('setupDialog.status.failed') }
        : { tone: 'pending', label: t('setupDialog.status.notInstalled') },
      detail: null,
      busy: null,
      error,
      action: {
        label: error ? t('setupDialog.actions.retry') : t('setupDialog.actions.install'),
        icon: error ? <RefreshCw className="h-3 w-3" /> : <Download className="h-3 w-3" />,
        run: runFfmpeg,
      },
    };
  };

  const views = items.map((item) => (item === 'ytdlp' ? ytdlpView() : ffmpegView()));
  const isBusy = isInstallingAll || runningItem !== null;
  const allDone = items.length > 0 && items.every((item) => isSetupItemDone(item, state));
  const hasPendingAction = views.some((view) => view.action !== null);

  // Runs the same steps as the item buttons; an item without an action is done or already running.
  const installAll = async () => {
    setIsInstallingAll(true);
    try {
      for (const view of views) {
        if (view.action) await view.action.run();
      }
    } finally {
      setIsInstallingAll(false);
    }
  };

  return (
    <ModalShell
      onDismiss={onClose}
      titleId={titleId}
      descriptionId={descriptionId}
      dismissible={!isBusy}
      className="w-full max-w-[560px] mx-4 bg-card border border-border rounded-xl shadow-2xl overflow-hidden outline-none"
    >
      <div className="px-6 pt-5 pb-3">
        <h2 id={titleId} className="text-lg font-semibold text-foreground">
          {t('setupDialog.title')}
        </h2>
        <p id={descriptionId} className="mt-1 text-sm text-muted-foreground">
          {t('setupDialog.description')}
        </p>
      </div>

      <div className="space-y-3 px-6 pb-4">
        {views.map((view, index) => {
          const Icon = view.icon;
          return (
            <div
              key={items[index]}
              className="flex gap-3 rounded-lg border border-border/60 bg-muted/50 px-3 py-3"
            >
              <div className="mt-0.5 h-fit rounded-md bg-primary/10 p-1.5 text-primary">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{view.title}</p>
                  <StatusBadge tone={view.badge.tone} label={view.badge.label} />
                </div>
                <p className="text-sm text-muted-foreground">{view.text}</p>
                {view.detail && (
                  <p className="font-mono text-[11px] text-muted-foreground">{view.detail}</p>
                )}
                {view.busy && (
                  <div className="pt-1">
                    <DependencyProgress label={view.busy.label} progress={view.busy.progress} />
                  </div>
                )}
                {view.error && <p className="text-xs text-destructive">{view.error}</p>}
              </div>
              {view.action && (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => void view.action?.run()}
                  className="inline-flex h-fit shrink-0 items-center gap-1 rounded-md border border-dashed border-primary/40 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10 disabled:pointer-events-none disabled:opacity-50"
                >
                  {view.action.icon}
                  {view.action.label}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/30 px-6 py-4">
        <Button
          variant="ghost"
          size="sm"
          disabled={isBusy}
          onClick={() => {
            onClose();
            onOpenDependencies();
          }}
        >
          <Settings2 />
          {t('setupDialog.openDependencies')}
        </Button>
        <div className="flex gap-2">
          {allDone ? (
            <Button size="sm" onClick={onClose}>
              {t('setupDialog.done')}
            </Button>
          ) : (
            <>
              <Button variant="outline" size="sm" disabled={isBusy} onClick={onClose}>
                {t('setupDialog.later')}
              </Button>
              <Button
                size="sm"
                disabled={isBusy || !hasPendingAction}
                onClick={() => void installAll()}
              >
                {isBusy ? <Loader2 className="animate-spin" /> : <Download />}
                {isBusy ? t('setupDialog.working') : t('setupDialog.setUpAll')}
              </Button>
            </>
          )}
        </div>
      </div>
    </ModalShell>
  );
}

function StatusBadge({ tone, label }: { tone: BadgeTone; label: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium',
        tone === 'done' && 'bg-green-500/10 text-green-600 dark:text-green-400',
        tone === 'busy' && 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
        tone === 'ready' && 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
        tone === 'error' && 'bg-red-500/10 text-red-600 dark:text-red-400',
        tone === 'pending' && 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      )}
    >
      {tone === 'done' && <CheckCircle2 className="h-3 w-3" />}
      {tone === 'busy' && <Loader2 className="h-3 w-3 animate-spin" />}
      {label}
    </span>
  );
}
