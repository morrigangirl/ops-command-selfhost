import { cn } from '@/lib/utils';
import type { MetricStatus } from '@/lib/types';

const styles: Record<MetricStatus, string> = {
  on_track: 'bg-success/15 text-success',
  at_risk: 'bg-warning/15 text-warning',
  off_track: 'bg-destructive/15 text-destructive',
  unknown: 'bg-muted text-muted-foreground',
};

const labels: Record<MetricStatus, string> = {
  on_track: 'On Track', at_risk: 'At Risk', off_track: 'Off Track', unknown: 'Unknown',
};

export function MetricStatusBadge({ status, className }: { status: MetricStatus; className?: string }) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider', styles[status], className)}>
      {labels[status]}
    </span>
  );
}
