import { describe, expect, test } from 'bun:test';
import {
  isDownloadProgressForItem,
  normalizeDownloadQueueItems,
  reconcileQueueItemsWithHistoryStates,
  resetMissingCompletedQueueItems,
} from '@/lib/persisted-download-queue';
import type { DownloadItem } from '@/lib/types';

describe('resetMissingCompletedQueueItems', () => {
  test('returns a completed item to pending when its downloaded file was removed', () => {
    const item = {
      id: 'download-1',
      url: 'https://example.com/video',
      title: 'Video',
      thumbnail: '',
      duration: '',
      extractor: 'direct',
      status: 'completed',
      progress: 100,
      completedFilepath: 'C:\\Downloads\\video.mp4',
      completedHistoryId: 'history-1',
      completedFilesize: 1024,
      completedFormat: 'mp4',
    } satisfies DownloadItem;

    const result = resetMissingCompletedQueueItems([item], new Set(['C:\\Downloads\\video.mp4']));

    expect(result[0]).toMatchObject({
      status: 'pending',
      progress: 0,
      errorCode: 'OUTPUT_FILE_MISSING',
    });
    expect(result[0]?.completedFilepath).toBeUndefined();
    expect(result[0]?.completedHistoryId).toBe('history-1');
    expect(result[0]?.outputCollisionPolicy).toBe('keep');
  });

  test('keeps completed items unchanged when their files still exist', () => {
    const item = {
      id: 'download-1',
      url: 'https://example.com/video',
      title: 'Video',
      thumbnail: '',
      duration: '',
      extractor: 'direct',
      status: 'completed',
      progress: 100,
      completedFilepath: 'C:\\Downloads\\video.mp4',
    } satisfies DownloadItem;
    const items = [item];

    expect(resetMissingCompletedQueueItems(items, new Set())).toBe(items);
  });

  test('restores the exact queue item after its history row is relinked', () => {
    const item = {
      id: 'download-1',
      url: 'https://example.com/video',
      title: 'Video',
      status: 'pending',
      progress: 0,
      speed: '',
      eta: '',
      errorCode: 'OUTPUT_FILE_MISSING',
      completedHistoryId: 'history-1',
    } satisfies DownloadItem;

    const result = reconcileQueueItemsWithHistoryStates(
      [item],
      [
        {
          historyId: 'history-1',
          filepath: 'D:\\Moved\\video.mp4',
          fileExists: true,
        },
      ],
    );

    expect(result[0]).toMatchObject({
      status: 'completed',
      progress: 100,
      completedFilepath: 'D:\\Moved\\video.mp4',
      completedHistoryId: 'history-1',
    });
    expect(result[0]?.errorCode).toBeUndefined();
  });

  test('preserves the history identity when only the output file was removed', () => {
    const item = {
      id: 'download-1',
      url: 'https://example.com/video',
      title: 'Video',
      status: 'completed',
      progress: 100,
      speed: '',
      eta: '',
      completedHistoryId: 'history-1',
      completedFilepath: 'C:\\Downloads\\missing.mp4',
    } satisfies DownloadItem;

    const result = reconcileQueueItemsWithHistoryStates(
      [item],
      [
        {
          historyId: 'history-1',
          filepath: 'C:\\Downloads\\missing.mp4',
          fileExists: false,
        },
      ],
    );

    expect(result[0]).toMatchObject({
      status: 'pending',
      errorCode: 'OUTPUT_FILE_MISSING',
      completedHistoryId: 'history-1',
      outputCollisionPolicy: 'keep',
    });
  });

  test('normalizes persisted missing-output items to keep collision-safe output', () => {
    const [item] = normalizeDownloadQueueItems([
      {
        id: 'download-1',
        url: 'https://example.com/video',
        title: 'Video',
        status: 'pending',
        progress: 0,
        errorCode: 'OUTPUT_FILE_MISSING',
        completedHistoryId: 'history-1',
        outputCollisionPolicy: 'overwrite',
      } satisfies DownloadItem,
    ]);

    expect(item?.outputCollisionPolicy).toBe('keep');
  });

  // Library replacement invokes download_video directly; it does not persist a queued
  // overwrite intent. A markerless queued overwrite is a legacy recovery state instead.
  for (const legacyState of [
    { name: 'missing-history enqueue', status: 'pending', errorCode: undefined },
    { name: 'interrupted download', status: 'downloading', errorCode: undefined },
    { name: 'interrupted metadata fetch', status: 'fetching', errorCode: undefined },
    { name: 'extractor failure', status: 'error', errorCode: 'DOWNLOAD_FAILED' },
    { name: 'network failure', status: 'error', errorCode: 'NETWORK_ERROR' },
    { name: 'manual retry after failure', status: 'pending', errorCode: undefined },
  ] as const) {
    test(`migrates legacy overwrite after ${legacyState.name} without relying on its error marker`, () => {
      const original: DownloadItem = {
        id: 'download-1',
        url: 'https://www.facebook.com/reel/1993888957884849',
        title: 'Same video title',
        status: legacyState.status,
        progress: 53,
        errorCode: legacyState.errorCode,
        completedHistoryId: 'history-1',
        outputCollisionPolicy: 'overwrite',
      };
      const normalized = normalizeDownloadQueueItems(JSON.parse(JSON.stringify([original])));
      const [item] = normalized;

      expect(item?.outputCollisionPolicy).toBe('keep');
      expect(item?.completedHistoryId).toBe('history-1');
      expect(item?.url).toBe(original.url);
      expect(item?.status).toBe(legacyState.status === 'error' ? 'error' : 'pending');
      expect(normalizeDownloadQueueItems(normalized)).toEqual(normalized);
      expect(original.outputCollisionPolicy).toBe('overwrite');
    });
  }

  test('preserves distinct same-title recovery identities through normalization and reconciliation', () => {
    const urls = [
      'https://www.facebook.com/reel/1993888957884849',
      'https://www.facebook.com/reel/1049019984826548',
    ];
    const legacy = urls.map(
      (url, index): DownloadItem => ({
        id: `download-${index}`,
        url,
        title: 'Same video title',
        status: 'pending',
        progress: 0,
        completedHistoryId: `history-${index}`,
        outputCollisionPolicy: 'overwrite',
      }),
    );
    const normalized = normalizeDownloadQueueItems(JSON.parse(JSON.stringify(legacy)));
    const reconciled = reconcileQueueItemsWithHistoryStates(
      normalized,
      urls.map((_, index) => ({
        historyId: `history-${index}`,
        filepath: `C:/Downloads/missing-${index}.mp4`,
        fileExists: false,
      })),
    );
    expect(reconciled.map((item) => item.outputCollisionPolicy)).toEqual(['keep', 'keep']);
    expect(reconciled.map((item) => item.completedHistoryId)).toEqual(['history-0', 'history-1']);
    expect(reconciled.map((item) => item.url)).toEqual(urls);
    expect(normalizeDownloadQueueItems(JSON.parse(JSON.stringify(reconciled)))).toEqual(reconciled);
  });

  test('preserves non-overwriting queue policies', () => {
    for (const policy of ['keep', 'unique', undefined] as const) {
      const [item] = normalizeDownloadQueueItems([
        {
          id: 'download-1',
          url: 'https://example.com/video',
          title: 'Video',
          status: 'pending',
          progress: 0,
          outputCollisionPolicy: policy,
        },
      ]);
      expect(item?.outputCollisionPolicy).toBe(policy);
    }
  });

  test('returns a completed item to pending when its history row and output were deleted', () => {
    const item = {
      id: 'download-1',
      url: 'https://example.com/video',
      title: 'Video',
      status: 'completed',
      progress: 100,
      speed: '',
      eta: '',
      completedHistoryId: 'deleted-history',
      completedFilepath: 'C:\\Downloads\\deleted.mp4',
    } satisfies DownloadItem;

    const result = reconcileQueueItemsWithHistoryStates(
      [item],
      [],
      new Set(['C:\\Downloads\\deleted.mp4']),
    );

    expect(result[0]).toMatchObject({
      status: 'pending',
      progress: 0,
      errorCode: 'OUTPUT_FILE_MISSING',
    });
    expect(result[0]?.completedHistoryId).toBeUndefined();
    expect(result[0]?.completedFilepath).toBeUndefined();
  });

  test('keeps an existing output completed but drops a deleted history identity', () => {
    const item = {
      id: 'download-1',
      url: 'https://example.com/video',
      title: 'Video',
      status: 'completed',
      progress: 100,
      speed: '',
      eta: '',
      completedHistoryId: 'deleted-history',
      completedFilepath: 'C:\\Downloads\\existing.mp4',
    } satisfies DownloadItem;

    const result = reconcileQueueItemsWithHistoryStates([item], [], new Set());

    expect(result[0]).toMatchObject({
      status: 'completed',
      completedFilepath: 'C:\\Downloads\\existing.mp4',
    });
    expect(result[0]?.completedHistoryId).toBeUndefined();
  });

  test('matches progress by job id or preserved history id', () => {
    const item = { id: 'queue-1', completedHistoryId: 'history-1' };

    expect(isDownloadProgressForItem(item, { id: 'queue-1' })).toBe(true);
    expect(
      isDownloadProgressForItem(item, { id: 'history-redownload-job', history_id: 'history-1' }),
    ).toBe(true);
    expect(isDownloadProgressForItem(item, { id: 'other', history_id: 'history-2' })).toBe(false);
  });
});
