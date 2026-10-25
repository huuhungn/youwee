import { useChannels } from '@/contexts/ChannelsContext';
import { useDownload } from '@/contexts/DownloadContext';
import { useGalleryDl } from '@/contexts/GalleryDlContext';
import { useProcessing } from '@/contexts/ProcessingContext';
import { useUniversal } from '@/contexts/UniversalContext';

interface RunningQueue {
  items: { status: string }[];
  isDownloading: boolean;
}

/** Downloads and processing jobs that restarting the app would stop. */
export function countRunningJobs(queues: RunningQueue[], otherBusy: boolean[]) {
  const queued = queues.reduce((sum, queue) => {
    const active = queue.items.filter(
      (item) => item.status === 'downloading' || item.status === 'fetching',
    ).length;
    // A running queue between two items still counts as one job.
    return sum + (queue.isDownloading ? Math.max(active, 1) : active);
  }, 0);
  return queued + otherBusy.filter(Boolean).length;
}

export function useRunningJobs() {
  const youtube = useDownload();
  const universal = useUniversal();
  const gallery = useGalleryDl();
  const channels = useChannels();
  const processing = useProcessing();

  return countRunningJobs(
    [youtube, universal, gallery],
    [channels.isDownloading, processing.isProcessing],
  );
}
