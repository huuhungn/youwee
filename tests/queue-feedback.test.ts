import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ProgressBarStatus } from '@tauri-apps/api/window';
import { nextQueueRun, type QueueRun, queueProgressBar } from '@/lib/queue-feedback';

const noMarks = { stoppedAt: Number.NEGATIVE_INFINITY, scheduledAt: Number.NEGATIVE_INFINITY };
const totals = (completed: number, error: number, pending = 0, downloading = 0, progress = 0) => ({
  completed,
  error,
  pending,
  downloading,
  progress,
});

describe('queue finished notification', () => {
  test('a run that ends on its own reports only what changed during it', () => {
    const started = nextQueueRun(null, true, totals(2, 1), noMarks, 1000);
    expect(started).toEqual({ run: { startedAt: 1000, completed: 2, error: 1 }, finished: null });

    const running = nextQueueRun(started.run, true, totals(4, 1), noMarks, 2000);
    expect(running.run).toBe(started.run);
    expect(running.finished).toBeNull();

    expect(nextQueueRun(started.run, false, totals(5, 2), noMarks, 3000)).toEqual({
      run: null,
      finished: { done: 3, failed: 1 },
    });
  });

  test('idle without a run does nothing', () => {
    expect(nextQueueRun(null, false, totals(3, 0), noMarks, 1000)).toEqual({
      run: null,
      finished: null,
    });
  });

  test('Stop during the run suppresses the notification', () => {
    const run: QueueRun = { startedAt: 1000, completed: 0, error: 0 };
    const marks = { ...noMarks, stoppedAt: 1500 };
    expect(nextQueueRun(run, false, totals(1, 0), marks, 2000).finished).toBeNull();
  });

  test('a Stop from an earlier run does not suppress the next one', () => {
    const run: QueueRun = { startedAt: 5000, completed: 0, error: 0 };
    const marks = { ...noMarks, stoppedAt: 1000 };
    expect(nextQueueRun(run, false, totals(1, 0), marks, 6000).finished).toEqual({
      done: 1,
      failed: 0,
    });
  });

  test('scheduled runs are left to the scheduler notification', () => {
    const run: QueueRun = { startedAt: 1000, completed: 0, error: 0 };
    // The scheduler marks just before the run is seen as active.
    expect(
      nextQueueRun(run, false, totals(1, 0), { ...noMarks, scheduledAt: 999 }, 2000).finished,
    ).toBeNull();
    expect(
      nextQueueRun(run, false, totals(1, 0), { ...noMarks, scheduledAt: -60_000 }, 2000).finished,
    ).toEqual({ done: 1, failed: 0 });
  });

  test('a schedule that fires during a manual run does not silence it', () => {
    const run: QueueRun = { startedAt: 1000, completed: 0, error: 0 };
    expect(
      nextQueueRun(run, false, totals(2, 0), { ...noMarks, scheduledAt: 60_000 }, 90_000).finished,
    ).toEqual({ done: 2, failed: 0 });
  });

  test('a run that changed nothing is not announced', () => {
    const run: QueueRun = { startedAt: 1000, completed: 3, error: 0 };
    expect(nextQueueRun(run, false, totals(1, 0), noMarks, 2000).finished).toBeNull();
  });
});

describe('taskbar progress', () => {
  test('hidden while idle', () => {
    expect(queueProgressBar(null, totals(2, 0))).toEqual({ status: ProgressBarStatus.None });
  });

  test('counts finished items as 100 and pending items as 0', () => {
    const run: QueueRun = { startedAt: 0, completed: 5, error: 0 };
    // 1 finished this run, 1 at 50%, 2 pending: (100 + 50) / 4
    expect(queueProgressBar(run, totals(6, 0, 2, 1, 50))).toEqual({
      status: ProgressBarStatus.Normal,
      progress: 38,
    });
  });

  test('turns to the error state once an item failed', () => {
    const run: QueueRun = { startedAt: 0, completed: 0, error: 1 };
    expect(queueProgressBar(run, totals(1, 2, 0, 1, 20))).toEqual({
      status: ProgressBarStatus.Error,
      progress: 73,
    });
  });

  test('starts at 0 before anything is queued', () => {
    const run: QueueRun = { startedAt: 0, completed: 0, error: 0 };
    expect(queueProgressBar(run, totals(0, 0))).toEqual({
      status: ProgressBarStatus.Normal,
      progress: 0,
    });
  });
});

describe('queue finished translations', () => {
  const localesDir = join(import.meta.dir, '..', 'src/i18n/locales');

  test.each(readdirSync(localesDir))('%s has the queue finished strings', (locale) => {
    const common = JSON.parse(readFileSync(join(localesDir, locale, 'common.json'), 'utf8'));
    expect(typeof common.queueFinished.title).toBe('string');
    expect(common.queueFinished.body).toContain('{{done}}');
    expect(common.queueFinished.body).toContain('{{failed}}');
  });
});
