import {
  AlertTriangle,
  ArrowRight,
  Check,
  Copy,
  Download,
  RefreshCw,
  Rocket,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { isTypingTarget, ModalShell, useDialogIds } from '@/components/ui/ModalShell';
import { SimpleMarkdown } from '@/components/ui/simple-markdown';
import {
  type UpdateErrorKind,
  type UpdateInfo,
  type UpdateProgress,
  type UpdateStatus,
  type UpdateStep,
  updaterRestartsAutomatically,
  useUpdateStall,
} from '@/hooks/useAppUpdater';
import { cn } from '@/lib/utils';

// Get the localized release notes based on current language
function getLocalizedBody(updateInfo: UpdateInfo | null, lang: string): string | undefined {
  if (!updateInfo) return undefined;
  if (lang.startsWith('vi')) return updateInfo.bodyVi || updateInfo.body;
  if (lang.startsWith('zh')) return updateInfo.bodyZhCN || updateInfo.body;
  return updateInfo.body;
}

export const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
};

// Localized short units ("12s", "12 giây", "12秒") so durations read naturally inside translated text.
export const formatDuration = (seconds: number, locale?: string) => {
  const unit = (value: number, unit: 'second' | 'minute') =>
    new Intl.NumberFormat(locale, { style: 'unit', unit, unitDisplay: 'narrow' }).format(value);
  if (seconds < 60) return unit(Math.max(1, seconds), 'second');
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds > 0
    ? `${unit(minutes, 'minute')} ${unit(remainingSeconds, 'second')}`
    : unit(minutes, 'minute');
};

export const updateProgressPercent = (progress: UpdateProgress | null) =>
  progress && progress.total > 0 ? Math.round((progress.downloaded / progress.total) * 100) : 0;

export const UPDATE_ERROR_KEYS: Record<UpdateErrorKind, string> = {
  timeout: 'update.errorTimeout',
  network: 'update.errorNetwork',
  signature: 'update.errorSignature',
  generic: 'update.errorGeneric',
};

interface UpdateDialogProps {
  status: UpdateStatus;
  updateInfo: UpdateInfo | null;
  progress: UpdateProgress | null;
  error: string | null;
  errorKind: UpdateErrorKind;
  failedStep: UpdateStep;
  installAfterRestart?: boolean;
  runningJobs?: number;
  restartQueued?: boolean;
  onDownload: () => void;
  onRestart: () => void;
  onRestartWhenDone?: () => void;
  onDismiss: () => void;
  onRetry: () => void;
  /** Shown once a download stalls: abandon it, or abandon it and start again. */
  onCancelDownload?: () => void;
  onRetryNow?: () => void;
}

export function UpdateDialog({
  status,
  updateInfo,
  progress,
  error,
  errorKind,
  failedStep,
  installAfterRestart = false,
  runningJobs = 0,
  restartQueued = false,
  onDownload,
  onRestart,
  onRestartWhenDone,
  onDismiss,
  onRetry,
  onCancelDownload,
  onRetryNow,
}: UpdateDialogProps) {
  const { t, i18n } = useTranslation('common');
  const { titleId, descriptionId } = useDialogIds();
  const stalledSeconds = useUpdateStall(progress, status === 'downloading');
  const actionsRef = useRef<HTMLDivElement>(null);
  const statusSince = useRef(0);
  const [copied, setCopied] = useState(false);

  const copyError = () => {
    if (!error) return;
    void navigator.clipboard?.writeText(error);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const stalled = stalledSeconds !== null;

  // Each state swaps the buttons, so move focus to the new safe action instead of losing it.
  // The dialog can open on its own, so a stray Enter never starts, retries or installs an update.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs again whenever the buttons change
  useEffect(() => {
    statusSince.current = performance.now();
    const actions = actionsRef.current;
    const active = document.activeElement;
    if (!actions || actions.contains(active) || isTypingTarget(active)) return;
    actions.querySelector<HTMLButtonElement>('[data-autofocus]')?.focus();
  }, [status, stalled]);

  // Buttons move when the state or the stall changes, so ignore a click that lands within 500 ms.
  const settled = (action?: () => void) => () => {
    if (performance.now() - statusSince.current >= 500) action?.();
  };
  const hideDownload = settled(onDismiss);

  // Only show dialog for specific states
  if (
    status === 'initializing' ||
    status === 'idle' ||
    status === 'checking' ||
    status === 'up-to-date' ||
    status === 'external'
  ) {
    return null;
  }

  const progressPercent = updateProgressPercent(progress);
  const installing = progress?.phase === 'installing';
  const localizedBody = getLocalizedBody(updateInfo, i18n.language);
  const autoRestarts =
    typeof navigator !== 'undefined' && updaterRestartsAutomatically(navigator.platform);
  const showVersion =
    updateInfo && (status !== 'installed' || updateInfo.currentVersion) && updateInfo.version;

  const title =
    status === 'error'
      ? t('update.error')
      : status === 'downloading'
        ? installing
          ? t('update.installingTitle')
          : t('update.downloadingTitle')
        : status === 'ready'
          ? t('update.readyTitle')
          : status === 'installed'
            ? t('update.installed')
            : t('update.available');

  return (
    <ModalShell
      onDismiss={onDismiss}
      titleId={titleId}
      descriptionId={descriptionId}
      overlayClassName="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-md animate-in fade-in duration-500"
      className="relative w-full max-w-lg max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] bg-background/85 backdrop-blur-2xl border border-white/10 dark:border-white/5 rounded-[2rem] shadow-[0_0_80px_-15px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-[0.96] duration-500 ease-out-expo flex flex-col outline-none"
    >
      {/* Ambient Glow Effects, clipped on their own so focusing a button can never scroll the panel */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className={cn(
            'absolute top-[-20%] left-[-10%] w-[70%] h-[50%] rounded-full blur-[100px]',
            status === 'error' ? 'bg-red-500/15' : 'bg-primary/20',
          )}
        />
        <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[50%] bg-purple-500/10 rounded-full blur-[100px]" />
      </div>

      <button
        type="button"
        onClick={onDismiss}
        aria-label={t('windowControls.close')}
        title={status === 'downloading' ? t('update.hide') : t('windowControls.close')}
        className="absolute top-5 right-5 p-2 rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring z-20"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Hero Header */}
      <div className="relative px-6 sm:px-8 pt-8 pb-5 pr-16 flex items-center gap-4 sm:gap-5 z-10">
        <div className="relative shrink-0">
          <div
            className={cn(
              'absolute inset-0 blur-xl rounded-full',
              status === 'error' ? 'bg-red-500/30' : 'bg-primary/40',
            )}
          />
          <div
            className={cn(
              'relative flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl shadow-lg border border-white/10 text-white transform transition-transform duration-500',
              status === 'error'
                ? 'bg-gradient-to-br from-red-500 to-red-600'
                : status === 'ready' || status === 'installed'
                  ? 'bg-gradient-to-br from-green-500 to-green-600'
                  : stalled
                    ? 'bg-gradient-to-br from-amber-500 to-amber-600'
                    : 'bg-gradient-to-br from-primary to-primary/80',
            )}
          >
            {status === 'error' ? (
              <AlertTriangle className="w-6 h-6 sm:w-7 sm:h-7" />
            ) : status === 'ready' || status === 'installed' ? (
              <Check className="w-6 h-6 sm:w-7 sm:h-7" />
            ) : status === 'downloading' ? (
              <Download className={cn('w-6 h-6 sm:w-7 sm:h-7', !stalled && 'animate-pulse')} />
            ) : (
              <Rocket className="w-6 h-6 sm:w-7 sm:h-7" />
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0 text-left">
          <h2
            id={titleId}
            className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground mb-1.5"
          >
            {title}
          </h2>

          {showVersion && (
            <div className="inline-flex max-w-full items-center gap-2 px-3 py-1 rounded-full bg-muted/50 border border-border/50 text-xs sm:text-sm font-semibold shadow-sm backdrop-blur-md">
              {updateInfo.currentVersion && updateInfo.currentVersion !== updateInfo.version && (
                <>
                  <span className="truncate text-muted-foreground">
                    v{updateInfo.currentVersion}
                  </span>
                  <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 text-primary" />
                </>
              )}
              <span className="truncate text-primary">v{updateInfo.version}</span>
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      {/* The bottom padding doubles as a fade, so long notes do not end in a hard cut above the actions */}
      <div className="px-6 sm:px-8 pb-6 relative z-10 flex-1 min-h-0 overflow-y-auto [mask-image:linear-gradient(to_bottom,black_calc(100%-1.5rem),transparent)]">
        {(status === 'available' || status === 'installed') && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <p id={descriptionId} className="text-sm text-muted-foreground">
              {status === 'installed' ? t('update.installedDescription') : t('update.description')}
            </p>
            {localizedBody && (
              <>
                <div className="flex items-center gap-2 mt-5 mb-3">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">{t('update.whatsNew')}</h3>
                </div>
                <SimpleMarkdown
                  content={localizedBody}
                  className={cn(
                    'pr-2 text-sm text-foreground/80 space-y-3',
                    '[&_h1]:text-lg [&_h1]:font-bold [&_h1]:text-foreground',
                    '[&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground',
                    '[&_h3]:text-xs [&_h3]:font-semibold [&_h3]:uppercase [&_h3]:tracking-wider [&_h3]:text-muted-foreground',
                    '[&_ul]:list-none [&_ul]:pl-0 [&_ul]:space-y-1.5',
                    '[&_li]:relative [&_li]:pl-5',
                    "[&_li::before]:content-[''] [&_li::before]:absolute [&_li::before]:left-1.5 [&_li::before]:top-2 [&_li::before]:w-1.5 [&_li::before]:h-1.5 [&_li::before]:bg-primary/60 [&_li::before]:rounded-full",
                  )}
                />
              </>
            )}
          </div>
        )}

        {status === 'downloading' && (
          <div
            id={descriptionId}
            className="bg-card/40 backdrop-blur-md rounded-2xl p-6 border border-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] animate-in fade-in duration-500"
          >
            <div className="flex justify-between items-end gap-3 mb-3">
              <span className="text-sm font-semibold text-foreground tabular-nums">
                {installing
                  ? t('update.installing')
                  : progress && progress.total > 0
                    ? `${formatBytes(progress.downloaded)} / ${formatBytes(progress.total)}`
                    : t('update.downloading')}
              </span>
              <span
                className={cn(
                  'text-2xl font-black tracking-tighter tabular-nums',
                  stalled ? 'text-amber-500' : 'text-primary',
                )}
              >
                {progressPercent}%
              </span>
            </div>
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressPercent}
              aria-label={installing ? t('update.installing') : t('update.downloading')}
              className="h-3 w-full bg-muted/80 rounded-full overflow-hidden mb-3 ring-1 ring-inset ring-black/5 dark:ring-white/5"
            >
              <div
                className={cn(
                  'h-full transition-all duration-300 ease-out',
                  stalled ? 'bg-amber-500/80' : 'bg-gradient-to-r from-primary/80 to-primary',
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p
              className={cn(
                'text-[13px] font-medium tabular-nums',
                stalled ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground',
              )}
            >
              {installing
                ? t('update.verifying')
                : stalled
                  ? t('update.stalled', { time: formatDuration(stalledSeconds, i18n.language) })
                  : progress && progress.bytesPerSecond > 0 && progress.etaSeconds !== null
                    ? `${formatBytes(progress.bytesPerSecond)}/s · ${t('update.timeRemaining', {
                        time: formatDuration(progress.etaSeconds, i18n.language),
                      })}`
                    : t('update.calculating')}
            </p>
            {autoRestarts && !installAfterRestart && runningJobs === 0 && !stalled && (
              <p className="mt-4 pt-3 border-t border-border/40 text-xs text-muted-foreground">
                {t('update.autoRestart')}
              </p>
            )}
            {runningJobs > 0 && !installing && (
              <p className="mt-4 pt-3 border-t border-border/40 text-xs text-muted-foreground">
                {t('update.waitsForRestart')}
              </p>
            )}
          </div>
        )}

        {status === 'ready' && (
          <div id={descriptionId}>
            <p className="text-sm text-muted-foreground">{t('update.ready')}</p>
            {runningJobs > 0 && (
              <div className="mt-4 flex gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/[0.08] p-4">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
                <p className="text-sm text-foreground">
                  {t('update.runningJobs', { count: runningJobs })}{' '}
                  {restartQueued && (
                    <span className="text-muted-foreground">{t('update.restartQueued')}</span>
                  )}
                </p>
              </div>
            )}
          </div>
        )}

        {status === 'error' && (
          <div
            id={descriptionId}
            className="rounded-2xl p-5 border border-red-500/25 bg-red-500/[0.07] animate-in fade-in duration-500"
          >
            <p className="text-sm font-medium text-foreground">{t(UPDATE_ERROR_KEYS[errorKind])}</p>
            {failedStep === 'download' && progress && progress.total > 0 && (
              <p className="mt-1.5 text-[13px] text-muted-foreground tabular-nums">
                {t('update.stoppedAt', {
                  percent: progressPercent,
                  downloaded: formatBytes(progress.downloaded),
                  total: formatBytes(progress.total),
                })}
              </p>
            )}
            {/* The updater's raw English message helps bug reports but means little to most users */}
            {error && (
              <details className="mt-3 pt-3 border-t border-red-500/15">
                <summary className="cursor-pointer select-none text-xs font-medium text-muted-foreground hover:text-foreground rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {t('update.details')}
                </summary>
                <div className="mt-2 flex items-start gap-2">
                  <p className="flex-1 min-w-0 font-mono text-xs leading-relaxed text-muted-foreground break-words select-text">
                    {error}
                  </p>
                  <button
                    type="button"
                    onClick={copyError}
                    aria-label={t('update.copyDetails')}
                    title={copied ? t('update.copied') : t('update.copyDetails')}
                    className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </details>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div
        ref={actionsRef}
        className="px-6 sm:px-8 pb-8 pt-2 relative z-10 flex flex-col-reverse sm:flex-row gap-3"
      >
        {status === 'available' && (
          <>
            <Button
              data-autofocus
              variant="ghost"
              className="sm:w-1/3 h-12 rounded-xl font-medium"
              onClick={onDismiss}
            >
              {t('update.later')}
            </Button>
            <Button
              onClick={onDownload}
              className="sm:w-2/3 h-12 rounded-xl font-bold bg-foreground text-background hover:bg-foreground/90 shadow-xl shadow-foreground/10"
            >
              {t('update.updateNow')}
              <Download className="w-4 h-4 ml-2" />
            </Button>
          </>
        )}

        {status === 'downloading' && (
          <>
            {stalled && onCancelDownload && (
              <Button
                variant="ghost"
                className="sm:w-1/4 h-12 rounded-xl font-medium"
                onClick={settled(onCancelDownload)}
              >
                {t('actions.cancel')}
              </Button>
            )}
            <Button
              data-autofocus
              variant="secondary"
              className="sm:flex-1 w-full h-12 rounded-xl font-semibold"
              onClick={hideDownload}
            >
              {t('update.hide')}
            </Button>
            {stalled && onRetryNow && (
              <Button
                onClick={settled(onRetryNow)}
                className="sm:flex-1 h-12 rounded-xl font-bold bg-foreground text-background hover:bg-foreground/90"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                {t('update.retryNow')}
              </Button>
            )}
          </>
        )}

        {status === 'ready' && (
          <>
            <Button
              data-autofocus
              variant="ghost"
              className="sm:w-1/3 h-12 rounded-xl font-medium"
              onClick={onDismiss}
            >
              {t('update.later')}
            </Button>
            {runningJobs > 0 ? (
              <>
                <Button
                  variant="outline"
                  className="sm:flex-1 h-12 rounded-xl font-semibold"
                  onClick={onRestart}
                >
                  {t('update.restartNow')}
                </Button>
                {!restartQueued && onRestartWhenDone && (
                  <Button
                    onClick={onRestartWhenDone}
                    className="sm:flex-[1.4] h-12 rounded-xl font-bold bg-green-500 text-white hover:bg-green-600 shadow-xl shadow-green-500/20"
                  >
                    {t('update.restartWhenDone')}
                  </Button>
                )}
              </>
            ) : (
              <Button
                onClick={onRestart}
                className="sm:w-2/3 h-12 rounded-xl font-bold bg-green-500 text-white hover:bg-green-600 shadow-xl shadow-green-500/20"
              >
                {t('update.restartNow')}
                <RotateCcw className="w-4 h-4 ml-2" />
              </Button>
            )}
          </>
        )}

        {status === 'installed' && (
          <Button
            data-autofocus
            onClick={onDismiss}
            className="w-full h-12 rounded-xl font-bold bg-green-500 text-white hover:bg-green-600 shadow-xl shadow-green-500/20"
          >
            {t('update.gotIt')}
            <Sparkles className="w-4 h-4 ml-2" />
          </Button>
        )}

        {status === 'error' && (
          <>
            <Button
              data-autofocus
              variant="ghost"
              className="sm:w-1/3 h-12 rounded-xl font-medium"
              onClick={onDismiss}
            >
              {t('update.dismiss')}
            </Button>
            <Button
              onClick={onRetry}
              className="sm:w-2/3 h-12 rounded-xl font-bold bg-foreground text-background hover:bg-foreground/90"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {t('update.retry')}
            </Button>
          </>
        )}
      </div>
    </ModalShell>
  );
}
