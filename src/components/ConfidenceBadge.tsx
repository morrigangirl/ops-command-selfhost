import { cn } from '@/lib/utils';
import type { MetricConfidence } from '@/lib/types';

const styles: Record<MetricConfidence, string> = {
  high: 'bg-success/15 text-success',
  medium: 'bg-warning/15 text-warning',
  low: 'bg-destructive/15 text-destructive',
};

const labels: Record<MetricConfidence, string> = { high: 'HIGH', medium: 'MED', low: 'LOW' };

export function ConfidenceBadge({ confidence, className }: { confidence: MetricConfidence; className?: string }) {
  return (
    <span className={cn('inline-flex items-center px-2.5 py-1 rounded font-mono text-xs font-bold tracking-wider', styles[confidence], className)}>
      {labels[confidence]}
    </span>
  );
}
