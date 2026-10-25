import { describe, expect, test } from 'bun:test';
import { countRunningJobs } from '@/hooks/useRunningJobs';

describe('running jobs a restart would stop', () => {
  const queue = (statuses: string[], isDownloading = statuses.length > 0) => ({
    items: statuses.map((status) => ({ status })),
    isDownloading,
  });

  test('counts items that are downloading or fetching across queues', () => {
    expect(
      countRunningJobs(
        [queue(['downloading', 'pending', 'completed']), queue(['fetching', 'downloading'])],
        [],
      ),
    ).toBe(3);
  });

  test('counts a running queue between two items as one job', () => {
    expect(countRunningJobs([queue(['completed', 'pending'], true)], [])).toBe(1);
  });

  test('adds channel downloads and processing, and is zero when idle', () => {
    expect(countRunningJobs([queue([], false)], [true, true])).toBe(2);
    expect(countRunningJobs([queue(['completed', 'error'], false)], [false, false])).toBe(0);
  });
});
