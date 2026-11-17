import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDownload } from '@/contexts/DownloadContext';
import { useGalleryDl } from '@/contexts/GalleryDlContext';
import { useUniversal } from '@/contexts/UniversalContext';
import { notify } from '@/hooks/useSchedule';
import { nextQueueRun, type QueueRun, queueProgressBar, queueRunMarks } from '@/lib/queue-feedback';
import type { DownloadItem } from '@/lib/types';

interface TrayDownloadStatus {
  pending: number;
  downloading: number;
  completed: number;
  error: number;
  progress: number;
  active: boolean;
}

function summarizeItems(items: DownloadItem[]) {
  return items.reduce(
    (summary, item) => {
      if (item.status === 'pending') summary.pending += 1;
      if (item.status === 'downloading') {
        summary.downloading += 1;
        summary.progress += item.progress;
      }
      if (item.status === 'completed') summary.completed += 1;
      if (item.status === 'error') summary.error += 1;
      return summary;
    },
    { pending: 0, downloading: 0, completed: 0, error: 0, progress: 0 },
  );
}

export function useTrayDownloadStatus() {
  const { t } = useTranslation('common');
  const download = useDownload();
  const universal = useUniversal();
  const gallery = useGalleryDl();

  const status = useMemo<TrayDownloadStatus>(() => {
    const youtube = summarizeItems(download.items);
    const universalDownloads = summarizeItems(universal.items);
    const galleryDownloads = summarizeItems(gallery.items);

    return {
      pending: youtube.pending + universalDownloads.pending + galleryDownloads.pending,
      downloading:
        youtube.downloading + universalDownloads.downloading + galleryDownloads.downloading,
      completed: youtube.completed + universalDownloads.completed + galleryDownloads.completed,
      error: youtube.error + universalDownloads.error + galleryDownloads.error,
      progress: youtube.progress + universalDownloads.progress + galleryDownloads.progress,
      active: download.isDownloading || universal.isDownloading || gallery.isDownloading,
    };
  }, [
    download.items,
    download.isDownloading,
    universal.items,
    universal.isDownloading,
    gallery.items,
    gallery.isDownloading,
  ]);

  const { active, completed, downloading, error, pending } = status;

  useEffect(() => {
    invoke('update_tray_download_status', {
      status: { active, completed, downloading, error, pending },
    }).catch(() => {});
  }, [active, completed, downloading, error, pending]);

  const [run, setRun] = useState<QueueRun | null>(null);

  useEffect(() => {
    const next = nextQueueRun(run, active, { completed, error }, queueRunMarks, Date.now());
    if (next.run !== run) setRun(next.run);
    const finished = next.finished;
    if (!finished) return;
    getCurrentWindow()
      .isFocused()
      .then((focused) => {
        if (!focused) {
          void notify(t('queueFinished.title'), t('queueFinished.body', { ...finished }));
        }
      })
      .catch(() => {});
  }, [run, active, completed, error, t]);

  const progressBar = queueProgressBar(run, status);
  const progressBarStatus = progressBar.status;
  const progressBarValue = progressBar.progress;

  useEffect(() => {
    getCurrentWindow()
      .setProgressBar({ status: progressBarStatus, progress: progressBarValue })
      .catch(() => {});
  }, [progressBarStatus, progressBarValue]);
}
