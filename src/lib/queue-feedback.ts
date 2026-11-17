import { type ProgressBarState, ProgressBarStatus } from '@tauri-apps/api/window';

/** Item counts across the download queues; `progress` sums the 0-100 progress of downloading items. */
export interface QueueTotals {
  pending: number;
  downloading: number;
  completed: number;
  error: number;
  progress: number;
}

/** Counts taken when the queues became active, so feedback covers only this run. */
export interface QueueRun {
  startedAt: number;
  completed: number;
  error: number;
}

export interface QueueRunMarks {
  stoppedAt: number;
  scheduledAt: number;
}

export interface QueueRunSummary {
  done: number;
  failed: number;
}

// The scheduler marks a moment before the run starts and sends its own notifications.
const SCHEDULED_START_WINDOW_MS = 2000;

/** When Stop was pressed and when the scheduler last started a queue. */
export const queueRunMarks: QueueRunMarks = {
  stoppedAt: Number.NEGATIVE_INFINITY,
  scheduledAt: Number.NEGATIVE_INFINITY,
};

export function markQueueStopped() {
  queueRunMarks.stoppedAt = Date.now();
}

export function markScheduledQueueStart() {
  queueRunMarks.scheduledAt = Date.now();
}

/**
 * Tracks the run across `active` changes. `finished` is set when a run the user started
 * ends on its own (not by Stop, not by the scheduler) and something was downloaded or failed.
 */
export function nextQueueRun(
  run: QueueRun | null,
  active: boolean,
  totals: Pick<QueueTotals, 'completed' | 'error'>,
  marks: QueueRunMarks,
  now: number,
): { run: QueueRun | null; finished: QueueRunSummary | null } {
  if (active) {
    return {
      run: run ?? { startedAt: now, completed: totals.completed, error: totals.error },
      finished: null,
    };
  }
  if (!run) return { run: null, finished: null };
  if (
    marks.stoppedAt >= run.startedAt ||
    marks.scheduledAt >= run.startedAt - SCHEDULED_START_WINDOW_MS
  ) {
    return { run: null, finished: null };
  }
  // Items removed during the run can push a count below its start value.
  const done = Math.max(0, totals.completed - run.completed);
  const failed = Math.max(0, totals.error - run.error);
  return { run: null, finished: done + failed > 0 ? { done, failed } : null };
}

/** Taskbar progress for the current run: finished items count as 100, pending as 0. */
export function queueProgressBar(run: QueueRun | null, totals: QueueTotals): ProgressBarState {
  if (!run) return { status: ProgressBarStatus.None };
  const failed = Math.max(0, totals.error - run.error);
  const finished = Math.max(0, totals.completed - run.completed) + failed;
  const items = finished + totals.downloading + totals.pending;
  const progress = items > 0 ? Math.round((finished * 100 + totals.progress) / items) : 0;
  return {
    status: failed > 0 ? ProgressBarStatus.Error : ProgressBarStatus.Normal,
    progress: Math.min(100, progress),
  };
}
