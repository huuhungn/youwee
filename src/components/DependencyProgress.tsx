import { Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import type { DownloadProgress } from '@/contexts/DependenciesContext';
import { dependencyProgressPercent, formatDependencyProgressSize } from '@/lib/dependency-progress';

/** Stage label, size and bar for a running dependency download; the bar is indeterminate without a size. */
export function DependencyProgress({
  label,
  progress,
}: {
  label: string;
  progress: DownloadProgress | null;
}) {
  const size = formatDependencyProgressSize(progress);
  const percent = dependencyProgressPercent(progress);
  return (
    <div className="w-full space-y-1">
      <div className="flex items-center justify-between gap-2 text-xs text-primary">
        <span className="inline-flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          {label}
        </span>
        {size && <span className="font-mono text-[11px] text-muted-foreground">{size}</span>}
      </div>
      {percent !== null ? (
        <Progress value={percent} className="h-1.5" />
      ) : (
        <div className="h-1.5 overflow-hidden rounded-full bg-primary/20">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-primary/60" />
        </div>
      )}
    </div>
  );
}
