import { useStore } from '@/lib/store';
import { useRhythmStore } from '@/lib/rhythm-store';
import { AlertTriangle, Clock, Heart, Repeat } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

const icons = {
  'review-overdue': Clock,
  'strategy-gap': AlertTriangle,
  'checkin-gap': Heart,
  'escalation': Repeat,
};

export function DriftAlerts() {
  const { getDriftAlerts } = useStore();
  const { getEscalationFlags } = useRhythmStore();
  const navigate = useNavigate();
  const alerts = getDriftAlerts();
  const escalations = getEscalationFlags();

  return (
    <aside className="w-72 border-l border-border p-4 overflow-auto shrink-0">
      <h2 className="font-mono text-[10px] font-bold tracking-[0.15em] text-muted-foreground mb-4 flex items-center gap-2">
        <AlertTriangle size={12} className={(alerts.length + escalations.length) > 0 ? 'text-warning animate-pulse-warning' : 'text-muted-foreground'} />
        DRIFT ALERTS
        {(alerts.length + escalations.length) > 0 && (
          <span className="bg-warning/20 text-warning px-1.5 py-0.5 rounded text-[10px]">{alerts.length + escalations.length}</span>
        )}
      </h2>
      {alerts.length === 0 && escalations.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-8">
          <p className="font-mono text-success text-xs">ALL CLEAR</p>
          <p className="mt-1 text-xs">No drift detected</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map(alert => {
            const Icon = icons[alert.type];
            return (
              <button
                key={alert.id}
                onClick={() => navigate(alert.entityType === 'project' ? `/project/${alert.entityId}` : '/people')}
                className={cn(
                  'w-full text-left p-3 rounded border text-xs transition-colors',
                  alert.severity === 'critical'
                    ? 'border-destructive/30 bg-destructive/5 hover:bg-destructive/10'
                    : 'border-warning/30 bg-warning/5 hover:bg-warning/10',
                )}
              >
                <div className="flex items-start gap-2">
                  <Icon size={12} className={cn(
                    'mt-0.5 shrink-0',
                    alert.severity === 'critical' ? 'text-destructive' : 'text-warning',
                  )} />
                  <span className="text-foreground/80">{alert.message}</span>
                </div>
              </button>
            );
          })}
          {escalations.map((esc, i) => (
            <button
              key={`esc-${i}`}
              onClick={() => navigate(`/person/${esc.personId}`)}
              className="w-full text-left p-3 rounded border text-xs transition-colors border-destructive/30 bg-destructive/5 hover:bg-destructive/10"
            >
              <div className="flex items-start gap-2">
                <Repeat size={12} className="mt-0.5 shrink-0 text-destructive" />
                <span className="text-foreground/80">
                  "{esc.blockedItemTitle}" blocked {esc.occurrences}x for {esc.personName}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}
