import { EscalationFlag } from '@/lib/types';
import { AlertTriangle } from 'lucide-react';

interface EscalationBannerProps {
  flags: EscalationFlag[];
}

export function EscalationBanner({ flags }: EscalationBannerProps) {
  if (flags.length === 0) return null;

  return (
    <div className="space-y-2">
      {flags.map((flag, i) => (
        <div key={i} className="flex items-start gap-2 p-3 rounded border border-destructive/30 bg-destructive/5 text-xs">
          <AlertTriangle size={14} className="text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-destructive">Escalation: "{flag.blockedItemTitle}"</p>
            <p className="text-muted-foreground mt-0.5">
              Blocked across {flag.occurrences} meetings for {flag.personName}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
