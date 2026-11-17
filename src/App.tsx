import { invoke } from '@tauri-apps/api/core';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DenoDialog } from '@/components/DenoDialog';
import { DuplicateDownloadReviewHost } from '@/components/download';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { MeteorTransition } from '@/components/effects/MeteorTransition';
import { FFmpegDialog } from '@/components/FFmpegDialog';
import type { Page } from '@/components/layout';
import { MainLayout } from '@/components/layout';
import { MusicPlayer } from '@/components/player';
import { SetupDialog } from '@/components/SetupDialog';
import type { SettingsSectionId } from '@/components/settings';
import { UpdateDialog } from '@/components/UpdateDialog';
import { ToastProvider } from '@/components/ui/toast';
import { AIProvider } from '@/contexts/AIContext';
import { ChannelsProvider } from '@/contexts/ChannelsContext';
import { DataExportProvider } from '@/contexts/DataExportContext';
import { DependenciesProvider, useDependencies } from '@/contexts/DependenciesContext';
import { DownloadProvider, useDownload } from '@/contexts/DownloadContext';
import { GalleryDlProvider } from '@/contexts/GalleryDlContext';
import { HistoryProvider } from '@/contexts/HistoryContext';
import { LogProvider } from '@/contexts/LogContext';
import { MetadataProvider } from '@/contexts/MetadataContext';
import { PlayerProvider } from '@/contexts/PlayerContext';
import { ProcessingProvider } from '@/contexts/ProcessingContext';
import { SubtitleProvider } from '@/contexts/SubtitleContext';
import { SummarySessionProvider } from '@/contexts/SummarySessionProvider';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { UniversalProvider } from '@/contexts/UniversalContext';
import { UpdaterProvider, useUpdater } from '@/contexts/UpdaterContext';
import { updateBadgeKey, updateDialogHasContent } from '@/hooks/useAppUpdater';
import { useExternalDownloadLinks } from '@/hooks/useExternalDownloadLinks';
import { usePluginExecutionToasts } from '@/hooks/usePluginExecutionToasts';
import { useTelegramRemoteCommands } from '@/hooks/useTelegramRemoteCommands';
import { useTrayDownloadStatus } from '@/hooks/useTrayDownloadStatus';
import { useTrayEvents } from '@/hooks/useTrayEvents';
import { useYtdlpAutoUpdateToast } from '@/hooks/useYtdlpAutoUpdateToast';
import {
  getApplicableSetupItems,
  getStartupDependencyDialog,
  hasSeenSetupDialog,
  isDenoFirstRunDialogOpen,
  isStartupDependencyStateReady,
  isStartupDialogBlocked,
  isYtdlpSetupStateKnown,
  markSetupDialogSeen,
  onOpenSetupDialogRequest,
  type SetupDependencyState,
  type SetupItem,
  shouldMarkSetupDialogSeen,
} from '@/lib/setup-dialog';
import {
  ChannelsPage,
  DownloadPage,
  GalleryPage,
  HistoryPage,
  LogsPage,
  MetadataPage,
  ProcessingPage,
  SettingsPage,
  SubtitlesPage,
  SummaryPage,
  TikTokLivePage,
  UniversalPage,
} from '@/pages';

function AppContent() {
  const { i18n } = useTranslation('settings');
  const [currentPage, setCurrentPage] = useState<Page>('youtube');
  const [settingsInitialSection, setSettingsInitialSection] =
    useState<SettingsSectionId>('general');
  const [externalSummaryRequest, setExternalSummaryRequest] = useState<{
    id: number;
    url: string;
  } | null>(null);
  const [showFfmpegDialog, setShowFfmpegDialog] = useState(false);
  const [setupDialogItems, setSetupDialogItems] = useState<SetupItem[] | null>(null);
  const [startupDialogChecked, setStartupDialogChecked] = useState(false);
  const updater = useUpdater();
  const {
    ytdlpSource,
    ytdlpChannel,
    ytdlpAllVersions,
    channelError,
    ffmpegSource,
    ffmpegStatus,
    ffmpegLoading,
    isAutoDownloadingDeno,
    denoStatus,
    denoError,
    denoDownloading,
    dismissDenoAutoDownload,
  } = useDependencies();
  const { isTransitioning, oldMode, applyPendingTheme, onTransitionComplete } = useTheme();
  const externalStartLockRef = useRef({ youtube: false, universal: false });
  const externalSummaryRequestIdRef = useRef(0);

  const openSettingsPage = useCallback((section: SettingsSectionId = 'general') => {
    setSettingsInitialSection(section);
    setCurrentPage('settings');
  }, []);

  const settingsBadge = updateBadgeKey(updater.status, updater.failedStep);
  // While an update needs the user, the Settings button opens straight to its card in About.
  const changePage = useCallback(
    (page: Page) => {
      if (page === 'settings' && settingsBadge) openSettingsPage('about');
      else setCurrentPage(page);
    },
    [settingsBadge, openSettingsPage],
  );

  const openDependenciesSettings = useCallback(() => {
    openSettingsPage('dependencies');
  }, [openSettingsPage]);

  const openExternalSummary = useCallback((url: string) => {
    externalSummaryRequestIdRef.current += 1;
    setExternalSummaryRequest({
      id: externalSummaryRequestIdRef.current,
      url,
    });
    setCurrentPage('summary');
  }, []);

  const clearExternalSummaryRequest = useCallback(() => {
    setExternalSummaryRequest(null);
  }, []);

  useExternalDownloadLinks(setCurrentPage, externalStartLockRef, openExternalSummary);
  useTelegramRemoteCommands(setCurrentPage, externalStartLockRef);
  useTrayDownloadStatus();
  useTrayEvents(setCurrentPage, openSettingsPage, updater.checkForUpdate);
  usePluginExecutionToasts();
  useYtdlpAutoUpdateToast({
    onOpenDependencies: openDependenciesSettings,
  });

  useEffect(() => {
    const locale = i18n.resolvedLanguage || i18n.language || 'en';
    const direction =
      typeof document !== 'undefined' ? document.documentElement.dir || 'ltr' : 'ltr';

    void invoke('set_plugin_runtime_locale', {
      input: {
        locale,
        fallbackLocale: 'en',
        direction,
      },
    }).catch((error) => {
      console.error('Failed to sync plugin runtime locale:', error);
    });
  }, [i18n.language, i18n.resolvedLanguage]);

  const setupState: SetupDependencyState = {
    ytdlpSource,
    ytdlpChannel,
    ytdlpAllVersions,
    ffmpegSource,
    ffmpegStatus,
  };
  const setupStateRef = useRef(setupState);
  setupStateRef.current = setupState;

  const setupStateReady = isStartupDependencyStateReady(setupState, {
    ffmpegLoading,
    channelError,
    denoChecked: denoStatus !== null || denoError !== null,
  });
  const denoFirstRunOpen = isDenoFirstRunDialogOpen(isAutoDownloadingDeno, denoStatus);
  const startupDialogBlocked = isStartupDialogBlocked({
    denoFirstRunOpen,
    denoDownloading,
    updateDialogVisible: updater.dialogVisible && updateDialogHasContent(updater.status),
  });

  // One dependency dialog per launch, after the Deno first-run dialog and any update dialog:
  // the setup dialog until it has been seen once, then the FFmpeg reminder while FFmpeg is missing.
  useEffect(() => {
    if (startupDialogChecked || !setupStateReady || startupDialogBlocked) return;

    // Small delay to let the app render and late startup state settle.
    const timer = setTimeout(() => {
      setStartupDialogChecked(true);
      const setupSeen = hasSeenSetupDialog();
      const dialog = getStartupDependencyDialog(setupStateRef.current, setupSeen);
      // Nothing missing (e.g. the Windows Full pack): skip the dialog for good.
      if (shouldMarkSetupDialogSeen(setupStateRef.current, setupSeen, dialog)) {
        markSetupDialogSeen();
      }
      if (dialog?.kind === 'setup') setSetupDialogItems(dialog.items);
      else if (dialog?.kind === 'ffmpeg') setShowFfmpegDialog(true);
    }, 800);
    return () => clearTimeout(timer);
  }, [startupDialogChecked, setupStateReady, startupDialogBlocked]);

  // Manual open (from the download guide) lists every item that applies.
  useEffect(
    () =>
      onOpenSetupDialogRequest(() => {
        // The user chose this dialog, so the startup check must not open another one later.
        setStartupDialogChecked(true);
        const items = getApplicableSetupItems(setupStateRef.current);
        if (items.length === 0) {
          openSettingsPage('dependencies');
          return;
        }
        setSetupDialogItems(items);
      }),
    [openSettingsPage],
  );

  const closeSetupDialog = useCallback(() => {
    if (isYtdlpSetupStateKnown(setupStateRef.current)) markSetupDialogSeen();
    setSetupDialogItems(null);
  }, []);

  // Close FFmpeg dialog when FFmpeg gets installed
  useEffect(() => {
    if (ffmpegStatus?.installed && showFfmpegDialog) {
      setShowFfmpegDialog(false);
    }
  }, [ffmpegStatus, showFfmpegDialog]);

  // Sync UI language to system tray on mount
  useEffect(() => {
    const lang = localStorage.getItem('i18nextLng') || 'en';
    invoke('rebuild_tray_menu_cmd', { lang }).catch(() => {});

    // Sync hideDockOnClose preference to Rust on startup
    const hideDock = localStorage.getItem('youwee_hide_dock_on_close') === 'true';
    if (hideDock) {
      invoke('set_hide_dock_on_close', { hide: true }).catch(() => {});
    }
  }, []);

  return (
    <>
      <MainLayout currentPage={currentPage} onPageChange={changePage} settingsBadge={settingsBadge}>
        {currentPage === 'youtube' && (
          <DownloadPage
            onNavigateToSettings={() => openSettingsPage('general')}
            onNavigateToLogs={() => setCurrentPage('logs')}
          />
        )}
        {currentPage === 'universal' && (
          <UniversalPage
            onNavigateToSettings={() => openSettingsPage('general')}
            onNavigateToLogs={() => setCurrentPage('logs')}
          />
        )}
        {currentPage === 'gallery' && (
          <GalleryPage
            onNavigateToSettings={openDependenciesSettings}
            onNavigateToLogs={() => setCurrentPage('logs')}
          />
        )}
        {currentPage === 'channels' && <ChannelsPage />}
        {currentPage === 'tiktok-live' && <TikTokLivePage />}
        {currentPage === 'summary' && (
          <SummaryPage
            externalRequestId={externalSummaryRequest?.id}
            externalUrl={externalSummaryRequest?.url}
            onExternalRequestConsumed={clearExternalSummaryRequest}
            onNavigateToSettings={(section) => {
              openSettingsPage(section === 'ai' ? 'ai' : 'general');
            }}
          />
        )}
        {currentPage === 'processing' && (
          <ErrorBoundary
            fallbackTitle="Processing Error"
            fallbackMessage="The video processing page encountered an error. This may be caused by an unsupported video format or insufficient system resources."
          >
            <ProcessingPage />
          </ErrorBoundary>
        )}
        {currentPage === 'metadata' && <MetadataPage />}
        {currentPage === 'subtitles' && <SubtitlesPage />}
        {currentPage === 'library' && <HistoryPage />}
        {currentPage === 'logs' && <LogsPage />}
        {currentPage === 'settings' && <SettingsPage initialSection={settingsInitialSection} />}
        <MusicPlayer />
      </MainLayout>

      {/* A dependency dialog on screen holds the update dialog back, so the two never stack. */}
      {updater.dialogVisible && !denoFirstRunOpen && !setupDialogItems && !showFfmpegDialog && (
        <UpdateDialog
          status={updater.status}
          updateInfo={updater.updateInfo}
          progress={updater.progress}
          error={updater.error}
          errorKind={updater.errorKind}
          failedStep={updater.failedStep}
          installAfterRestart={updater.installAfterRestart}
          runningJobs={updater.runningJobs}
          restartQueued={updater.restartQueued}
          onRestartWhenDone={updater.queueRestart}
          onDownload={updater.downloadAndInstall}
          onRestart={updater.restartApp}
          onDismiss={updater.dismissUpdate}
          onRetry={updater.retryUpdate}
          onCancelDownload={updater.cancelDownload}
          onRetryNow={updater.restartDownload}
        />
      )}

      {setupDialogItems && (
        <SetupDialog
          items={setupDialogItems}
          onClose={closeSetupDialog}
          onOpenDependencies={openDependenciesSettings}
        />
      )}

      {showFfmpegDialog && <FFmpegDialog onDismiss={() => setShowFfmpegDialog(false)} />}

      {denoFirstRunOpen && <DenoDialog onDismiss={dismissDenoAutoDownload} />}
      <DuplicateDownloadReviewHost />
      <MeteorTransition
        isActive={isTransitioning}
        oldMode={oldMode}
        onRevealStart={applyPendingTheme}
        onComplete={onTransitionComplete}
      />
    </>
  );
}

// Wrapper to get settings and pass to UpdaterProvider
function UpdaterWrapper({ children }: { children: React.ReactNode }) {
  const { settings } = useDownload();

  return <UpdaterProvider autoCheck={settings.autoCheckUpdate}>{children}</UpdaterProvider>;
}

export function App() {
  return (
    <ThemeProvider>
      <DependenciesProvider>
        <DownloadProvider>
          <UniversalProvider>
            <GalleryDlProvider>
              <ChannelsProvider>
                <LogProvider>
                  <HistoryProvider>
                    <PlayerProvider>
                      <AIProvider>
                        <SummarySessionProvider>
                          <ProcessingProvider>
                            <SubtitleProvider>
                              <MetadataProvider>
                                <DataExportProvider>
                                  <ToastProvider>
                                    <UpdaterWrapper>
                                      <AppContent />
                                    </UpdaterWrapper>
                                  </ToastProvider>
                                </DataExportProvider>
                              </MetadataProvider>
                            </SubtitleProvider>
                          </ProcessingProvider>
                        </SummarySessionProvider>
                      </AIProvider>
                    </PlayerProvider>
                  </HistoryProvider>
                </LogProvider>
              </ChannelsProvider>
            </GalleryDlProvider>
          </UniversalProvider>
        </DownloadProvider>
      </DependenciesProvider>
    </ThemeProvider>
  );
}
