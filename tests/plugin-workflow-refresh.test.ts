import { describe, expect, test } from 'bun:test';
import { refreshItemPluginWorkflowSnapshots } from '../src/lib/post-download-plugins';
import type { ItemDownloadSettings, PluginWorkflowSnapshotMap } from '../src/lib/types';

const freshSnapshots: PluginWorkflowSnapshotMap = {
  'download.failed': [
    {
      pluginId: 'retry-plugin',
      pluginName: 'Retry plugin',
      pluginVersion: '2.0.0',
      approvedPermissions: {
        network: false,
        fs: [],
        tools: [],
      },
      failurePolicy: 'continue',
    },
  ],
  'download.completed': [],
};

describe('refreshItemPluginWorkflowSnapshots', () => {
  test('replaces a queued item snapshot with the current plugin workflow', () => {
    const queued = {
      quality: 'best',
      format: 'mp4',
      outputPath: 'D:/videos',
      numberPlaylistItems: true,
      numberQueueItems: true,
      splitEmbeddedChapters: true,
      autoOrganizeCollections: true,
      pluginWorkflowSnapshots: {
        'download.failed': [],
      },
      postDownloadWorkflowSteps: [
        {
          pluginId: 'old-plugin',
          pluginName: 'Old plugin',
          pluginVersion: '1.0.0',
          approvedPermissions: {
            network: false,
            fs: [],
            tools: [],
          },
          failurePolicy: 'stop-chain',
        },
      ],
    } as ItemDownloadSettings;

    const refreshed = refreshItemPluginWorkflowSnapshots(queued, freshSnapshots);

    expect(refreshed?.numberPlaylistItems).toBe(true);
    expect(refreshed?.numberQueueItems).toBe(true);
    expect(refreshed?.splitEmbeddedChapters).toBe(true);
    expect(refreshed?.autoOrganizeCollections).toBe(true);
    expect(refreshed?.outputPath).toBe('D:/videos');
    expect(refreshed?.pluginWorkflowSnapshots).toEqual(freshSnapshots);
    expect(refreshed?.postDownloadWorkflowSteps).toEqual([]);
  });

  test('leaves an item without settings unchanged', () => {
    expect(refreshItemPluginWorkflowSnapshots(undefined, freshSnapshots)).toBeUndefined();
  });
});
