import { useStore } from '@/lib/store';
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PersonForm } from '@/components/PersonForm';
import { Person } from '@/lib/types';
import { Plus, AlertTriangle, ChevronRight, ChevronDown, User, Briefcase, ChevronsDownUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { differenceInDays, parseISO, format } from 'date-fns';

export default function PeopleView() {
  const { people, getActiveProjectsForPerson } = useStore();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [editPerson, setEditPerson] = useState<Person | undefined>();

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const activePeople = people.filter(p => p.active);
  const topLevel = activePeople.filter(p => !p.managerId);
  const getReports = (id: string) => activePeople.filter(p => p.managerId === id);
  const inactivePeople = people.filter(p => !p.active);
  const today = new Date();

  const toggleCollapse = useCallback((id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const getAllDescendantIds = useCallback((id: string): string[] => {
    const reports = activePeople.filter(p => p.managerId === id);
    return reports.flatMap(r => [r.id, ...getAllDescendantIds(r.id)]);
  }, [activePeople]);

  const collapseAllBelow = useCallback((id: string) => {
    const descendantIds = getAllDescendantIds(id);
    setCollapsed(prev => {
      const next = new Set(prev);
      // Collapse the person and all descendants who have reports
      [id, ...descendantIds].forEach(did => {
        if (activePeople.some(p => p.managerId === did)) next.add(did);
      });
      return next;
    });
  }, [getAllDescendantIds, activePeople]);

  const openEdit = (person: Person) => {
    setEditPerson(person);
    setShowForm(true);
  };

  const openAdd = () => {
    setEditPerson(undefined);
    setShowForm(true);
  };

  const getAlerts = (person: Person) => {
    const alerts: string[] = [];
    if (person.lastStrategicDeepDive) {
      const days = differenceInDays(today, parseISO(person.lastStrategicDeepDive));
      if (days > 30) alerts.push(`${days}d since strategic deep dive`);
    }
    if (person.lastHumanCheckin) {
      const days = differenceInDays(today, parseISO(person.lastHumanCheckin));
      if (days > 45) alerts.push(`${days}d since human check-in`);
    }
    const projectCount = getActiveProjectsForPerson(person.id).length;
    if (projectCount >= 5) alerts.push(`${projectCount} active projects — consider load review`);
    return alerts;
  };

  const PersonCard = ({ person, depth = 0 }: { person: Person; depth?: number }) => {
    const reports = getReports(person.id);
    const alerts = getAlerts(person);
    const projectCount = getActiveProjectsForPerson(person.id).length;
    const manager = person.managerId ? people.find(p => p.id === person.managerId) : null;
    const hasReports = reports.length > 0;
    const isCollapsed = collapsed.has(person.id);

    return (
      <div style={{ marginLeft: depth > 0 ? 20 : 0 }}>
        <div
          className={cn(
            'border border-border rounded-lg p-4 mb-2 hover:bg-muted/30 transition-colors cursor-pointer',
            alerts.length > 0 && 'border-l-2 border-l-warning',
          )}
          onClick={() => navigate(`/person/${person.id}`)}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              {hasReports && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="mt-1 p-1 rounded hover:bg-muted transition-colors shrink-0"
                      onClick={e => { e.stopPropagation(); toggleCollapse(person.id); }}
                    >
                      {isCollapsed ? <ChevronRight size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {isCollapsed ? 'Expand direct reports' : 'Collapse direct reports'}
                  </TooltipContent>
                </Tooltip>
              )}
              <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <User size={14} className="text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">{person.name}</h3>
                <p className="text-xs text-muted-foreground">{person.role}</p>
                {manager && (
                  <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                    <ChevronRight size={10} /> Reports to {manager.name}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasReports && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors px-1.5 py-1 rounded hover:bg-muted"
                      onClick={e => { e.stopPropagation(); collapseAllBelow(person.id); }}
                    >
                      <ChevronsDownUp size={10} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    Collapse all reports below this person
                  </TooltipContent>
                </Tooltip>
              )}
              <span className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                <Briefcase size={10} /> {projectCount}
              </span>
              {hasReports && isCollapsed && (
                <span className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                  {reports.length} report{reports.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-3 text-[10px] font-mono text-muted-foreground">
            <div>
              <span className="block text-[9px] uppercase tracking-wider mb-0.5">Last 1:1</span>
              <span className="text-foreground/70">{person.last1on1 ? format(parseISO(person.last1on1), 'MMM dd') : '—'}</span>
            </div>
            <div>
              <span className="block text-[9px] uppercase tracking-wider mb-0.5">Deep Dive</span>
              <span className="text-foreground/70">{person.lastStrategicDeepDive ? format(parseISO(person.lastStrategicDeepDive), 'MMM dd') : '—'}</span>
            </div>
            <div>
              <span className="block text-[9px] uppercase tracking-wider mb-0.5">Check-in</span>
              <span className="text-foreground/70">{person.lastHumanCheckin ? format(parseISO(person.lastHumanCheckin), 'MMM dd') : '—'}</span>
            </div>
          </div>

          {alerts.length > 0 && (
            <div className="mt-3 space-y-1">
              {alerts.map((alert, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[10px] text-warning">
                  <AlertTriangle size={10} />
                  <span>{alert}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {hasReports && !isCollapsed && (
          <div className="ml-4 border-l border-border/50 pl-2">
            {reports.map(report => (
              <PersonCard key={report.id} person={report} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-mono font-bold tracking-[0.15em]">PERSONNEL</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{activePeople.length} active &middot; {inactivePeople.length} inactive</p>
        </div>
        <Button onClick={openAdd} size="sm" className="gap-2 font-mono text-xs tracking-wider">
          <Plus size={14} /> ADD PERSON
        </Button>
      </div>

      <div className="space-y-2">
        {topLevel.map(person => (
          <PersonCard key={person.id} person={person} />
        ))}
      </div>

      {inactivePeople.length > 0 && (
        <div className="mt-8">
          <h2 className="font-mono text-[10px] tracking-[0.15em] text-muted-foreground mb-3">INACTIVE</h2>
          <div className="space-y-2 opacity-50">
            {inactivePeople.map(person => (
              <div
                key={person.id}
                className="border border-border rounded-lg p-3 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => navigate(`/person/${person.id}`)}
              >
                <div className="flex items-center gap-3">
                  <User size={14} className="text-muted-foreground" />
                  <div>
                    <span className="text-sm">{person.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">{person.role}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <PersonForm open={showForm} onClose={() => { setShowForm(false); setEditPerson(undefined); }} person={editPerson} />
    </div>
  );
}
