import { cn } from '@/lib/utils';

export function StatusBadge({ status }: { status: 'green' | 'yellow' | 'red' }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-mono text-[10px] uppercase tracking-wider font-semibold',
      status === 'green' && 'bg-success/15 text-success',
      status === 'yellow' && 'bg-warning/15 text-warning',
      status === 'red' && 'bg-destructive/15 text-destructive',
    )}>
      <span className={cn(
        'w-1.5 h-1.5 rounded-full',
        status === 'green' && 'bg-success',
        status === 'yellow' && 'bg-warning',
        status === 'red' && 'bg-destructive',
      )} />
      {status}
    </span>
  );
}

export function RiskBadge({ risk }: { risk: 'low' | 'medium' | 'high' }) {
  return (
    <span className={cn(
      'inline-flex px-2 py-0.5 rounded font-mono text-[10px] uppercase tracking-wider font-medium border',
      risk === 'low' && 'border-success/30 text-success/80',
      risk === 'medium' && 'border-warning/30 text-warning/80',
      risk === 'high' && 'border-destructive/30 text-destructive/80',
    )}>
      {risk}
    </span>
  );
}
