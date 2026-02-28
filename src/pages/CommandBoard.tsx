import { useStore } from '@/lib/store';
import { useMetricStore } from '@/lib/metric-store';
import { useRhythmStore } from '@/lib/rhythm-store';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, differenceInDays } from 'date-fns';
import { StatusBadge, RiskBadge } from '@/components/StatusBadge';
import { DriftAlerts } from '@/components/DriftAlerts';
import { cn } from '@/lib/utils';
import {
  FolderOpen, Users, TrendingUp, Calendar, AlertTriangle,
  ArrowRight, Clock, CheckCircle2, XCircle,
} from 'lucide-react';
import { MEETING_TYPE_LABELS } from '@/lib/types';

function StatCard({ icon: Icon, label, value, sub, onClick, accent }: {
  icon: any; label: string; value: string | number; sub?: string;
  onClick?: () => void; accent?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg border border-border bg-card text-left transition-colors hover:bg-accent/50 w-full',
        accent,
      )}
    >
      <div className="p-2 rounded bg-primary/10">
        <Icon size={16} className="text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">{label}</p>
        <p className="text-2xl font-bold font-mono text-foreground mt-0.5">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{sub}</p>}
      </div>
    </button>
  );
}

export default function CommandBoard() {
  const { projects, people, getDriftAlerts, getNextReview, getPerson } = useStore();
  const { metrics } = useMetricStore();
  const { meetings, actionItems, getEscalationFlags, getUpcomingMeetings } = useRhythmStore();
  const navigate = useNavigate();
  const today = new Date();

  const alerts = getDriftAlerts();
  const escalations = getEscalationFlags();
  const upcoming = getUpcomingMeetings().slice(0, 5);
  const activePeople = people.filter(p => p.active);
  const overdueProjects = projects.filter(p => today > getNextReview(p));
  const redProjects = projects.filter(p => p.status === 'red');
  const highRiskProjects = projects.filter(p => p.risk === 'high');
  const openActionItems = actionItems.filter(a => a.status === 'open');
  const blockedActionItems = actionItems.filter(a => a.status === 'blocked');
  const atRiskMetrics = metrics.filter(m => m.status === 'at_risk' || m.status === 'off_track');

  return (
    <div className="flex h-full">
      <div className="flex-1 p-6 overflow-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-mono font-bold tracking-[0.15em] text-foreground">COMMAND BOARD</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Executive overview &middot; {format(today, 'EEEE, MMM d yyyy')}</p>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={FolderOpen} label="Projects" value={projects.length}
            sub={`${overdueProjects.length} overdue for review`}
            onClick={() => navigate('/projects')} />
          <StatCard icon={Users} label="Personnel" value={activePeople.length}
            sub={`${people.length - activePeople.length} inactive`}
            onClick={() => navigate('/people')} />
          <StatCard icon={TrendingUp} label="Metrics" value={metrics.length}
            sub={atRiskMetrics.length > 0 ? `${atRiskMetrics.length} at risk` : 'All on track'}
            onClick={() => navigate('/metrics')} />
          <StatCard icon={Calendar} label="Upcoming" value={upcoming.length}
            sub={upcoming.length > 0 ? `Next: ${format(parseISO(upcoming[0].scheduledDate), 'MMM d')}` : 'None scheduled'}
            onClick={() => navigate('/people')} />
        </div>

        {/* Two-column detail area */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Projects needing attention */}
          <div className="border border-border rounded-lg bg-card">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h2 className="font-mono text-[10px] font-bold tracking-[0.15em] text-muted-foreground">PROJECTS NEEDING ATTENTION</h2>
              <button onClick={() => navigate('/projects')} className="text-primary text-xs flex items-center gap-1 hover:underline">
                View all <ArrowRight size={12} />
              </button>
            </div>
            <div className="divide-y divide-border">
              {[...redProjects, ...highRiskProjects.filter(p => p.status !== 'red'), ...overdueProjects.filter(p => p.status !== 'red' && p.risk !== 'high')]
                .filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i)
                .slice(0, 5)
                .map(project => {
                  const owner = getPerson(project.ownerId);
                  return (
                    <button key={project.id} onClick={() => navigate(`/project/${project.id}`)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-accent/30 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{project.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{owner?.name || 'Unassigned'}</p>
                      </div>
                      <StatusBadge status={project.status} />
                      <RiskBadge risk={project.risk} />
                    </button>
                  );
                })}
              {redProjects.length === 0 && highRiskProjects.length === 0 && overdueProjects.length === 0 && (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                  <CheckCircle2 size={16} className="inline mr-1 text-success" /> All projects healthy
                </div>
              )}
            </div>
          </div>

          {/* Upcoming meetings */}
          <div className="border border-border rounded-lg bg-card">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h2 className="font-mono text-[10px] font-bold tracking-[0.15em] text-muted-foreground">UPCOMING MEETINGS</h2>
            </div>
            <div className="divide-y divide-border">
              {upcoming.map(m => {
                const person = people.find(p => p.id === m.personId);
                return (
                  <button key={m.id} onClick={() => navigate(`/person/${m.personId}`)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-accent/30 transition-colors">
                    <Calendar size={14} className="text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {MEETING_TYPE_LABELS[m.type]} with {person?.name || 'Unknown'}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{format(parseISO(m.scheduledDate), 'EEE, MMM d')}</p>
                    </div>
                  </button>
                );
              })}
              {upcoming.length === 0 && (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">No upcoming meetings</div>
              )}
            </div>
          </div>

          {/* Open action items */}
          <div className="border border-border rounded-lg bg-card">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h2 className="font-mono text-[10px] font-bold tracking-[0.15em] text-muted-foreground">
                OPEN ACTION ITEMS
                {openActionItems.length > 0 && (
                  <span className="ml-2 bg-primary/15 text-primary px-1.5 py-0.5 rounded text-[10px]">{openActionItems.length}</span>
                )}
              </h2>
            </div>
            <div className="divide-y divide-border">
              {[...blockedActionItems, ...openActionItems.filter(a => a.status !== 'blocked')].slice(0, 5).map(item => {
                const owner = item.ownerId ? people.find(p => p.id === item.ownerId) : null;
                return (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                    {item.status === 'blocked' ? (
                      <XCircle size={14} className="text-destructive shrink-0" />
                    ) : (
                      <Clock size={14} className="text-muted-foreground shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{item.title}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {owner?.name || 'Unassigned'}
                        {item.dueDate && ` · Due ${format(parseISO(item.dueDate), 'MMM d')}`}
                      </p>
                    </div>
                    {item.status === 'blocked' && (
                      <span className="font-mono text-[10px] text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">BLOCKED</span>
                    )}
                  </div>
                );
              })}
              {openActionItems.length === 0 && blockedActionItems.length === 0 && (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                  <CheckCircle2 size={16} className="inline mr-1 text-success" /> No open items
                </div>
              )}
            </div>
          </div>

          {/* At-risk metrics */}
          <div className="border border-border rounded-lg bg-card">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h2 className="font-mono text-[10px] font-bold tracking-[0.15em] text-muted-foreground">METRICS WATCH</h2>
              <button onClick={() => navigate('/metrics')} className="text-primary text-xs flex items-center gap-1 hover:underline">
                View all <ArrowRight size={12} />
              </button>
            </div>
            <div className="divide-y divide-border">
              {atRiskMetrics.slice(0, 5).map(m => (
                <button key={m.id} onClick={() => navigate(`/metric/${m.id}`)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-accent/30 transition-colors">
                  <AlertTriangle size={14} className={cn(
                    'shrink-0',
                    m.status === 'off_track' ? 'text-destructive' : 'text-warning',
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{m.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {m.currentValue != null ? `${m.currentValue} ${m.unit}` : 'No data'} · {m.status.replace('_', ' ')}
                    </p>
                  </div>
                </button>
              ))}
              {atRiskMetrics.length === 0 && (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                  <CheckCircle2 size={16} className="inline mr-1 text-success" /> All metrics on track
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <DriftAlerts />
    </div>
  );
}
