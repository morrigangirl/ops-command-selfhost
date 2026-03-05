import { useStore } from '@/lib/store';
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PersonForm } from '@/components/PersonForm';
import { Person } from '@/lib/types';
import { Plus, AlertTriangle, ChevronRight, ChevronDown, User, Briefcase, ChevronsDownUp, GripVertical, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { differenceInDays, parseISO, format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { validateManagerDrop } from '@/lib/people-dnd';

interface PendingReassign {
  personId: string;
  fromManagerId: string | null;
  toManagerId: string;
}

export default function PeopleView() {
  const { people, getActiveProjectsForPerson, updatePerson } = useStore();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [editPerson, setEditPerson] = useState<Person | undefined>();
  const [defaultManagerId, setDefaultManagerId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ person: Person; x: number; y: number } | null>(null);

  const [draggedPersonId, setDraggedPersonId] = useState<string | null>(null);
  const [dropTargetPersonId, setDropTargetPersonId] = useState<string | null>(null);
  const [pendingReassign, setPendingReassign] = useState<PendingReassign | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reassigning, setReassigning] = useState(false);

  const suppressClickRef = useRef(false);

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const activePeople = people.filter(p => p.active);
  const topLevel = activePeople.filter(p => !p.managerId);
  const getReports = (id: string) => activePeople.filter(p => p.managerId === id);
  const inactivePeople = people.filter(p => !p.active);
  const today = new Date();

  const getPersonById = useCallback((id: string | null | undefined) => {
    if (!id) return undefined;
    return people.find((p) => p.id === id);
  }, [people]);

  const isValidDrop = useCallback((sourceId: string | null, targetId: string | null) => {
    if (!sourceId || !targetId) return { valid: false, reason: 'missing-source-or-target' as const };
    return validateManagerDrop(sourceId, targetId, people);
  }, [people]);

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
      [id, ...descendantIds].forEach(did => {
        if (activePeople.some(p => p.managerId === did)) next.add(did);
      });
      return next;
    });
  }, [getAllDescendantIds, activePeople]);

  const openEdit = (person: Person) => {
    setContextMenu(null);
    setDefaultManagerId(null);
    setEditPerson(person);
    setShowForm(true);
  };

  const openAdd = () => {
    setContextMenu(null);
    setDefaultManagerId(null);
    setEditPerson(undefined);
    setShowForm(true);
  };

  const handleExportPeopleJson = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const payload = {
      exportedAt: new Date().toISOString(),
      count: people.length,
      people,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `personnel-list-${timestamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    toast({
      title: 'Personnel exported',
      description: `Downloaded ${people.length} records as JSON.`,
    });
  };

  const openAddDirectReport = (manager: Person) => {
    setContextMenu(null);
    setEditPerson(undefined);
    setDefaultManagerId(manager.id);
    setShowForm(true);
  };

  useEffect(() => {
    if (!contextMenu) return;

    const closeMenu = () => setContextMenu(null);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu();
    };
    const onWindowChange = () => closeMenu();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', onWindowChange, true);
    window.addEventListener('resize', onWindowChange);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', onWindowChange, true);
      window.removeEventListener('resize', onWindowChange);
    };
  }, [contextMenu]);

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

  const clearDragState = () => {
    setDraggedPersonId(null);
    setDropTargetPersonId(null);
  };

  const confirmMove = async () => {
    if (!pendingReassign) return;

    const source = getPersonById(pendingReassign.personId);
    const target = getPersonById(pendingReassign.toManagerId);

    if (!source || !target) {
      toast({ title: 'Cannot reassign', description: 'Person or manager no longer exists.', variant: 'destructive' });
      setConfirmOpen(false);
      setPendingReassign(null);
      return;
    }

    const check = validateManagerDrop(source.id, target.id, people);
    if (!check.valid) {
      toast({ title: 'Cannot reassign', description: 'This reassignment is invalid.', variant: 'destructive' });
      setConfirmOpen(false);
      setPendingReassign(null);
      return;
    }

    setReassigning(true);
    try {
      await updatePerson({ ...source, managerId: target.id });
      toast({ title: 'Reporting line updated', description: `${source.name} now reports to ${target.name}.` });
      setConfirmOpen(false);
      setPendingReassign(null);
    } catch (error: any) {
      toast({
        title: 'Reassignment failed',
        description: error?.message || 'Unable to update manager. Check MFA/session and try again.',
        variant: 'destructive',
      });
    } finally {
      setReassigning(false);
      clearDragState();
    }
  };

  const pendingSource = useMemo(() => getPersonById(pendingReassign?.personId), [getPersonById, pendingReassign?.personId]);
  const pendingFromManager = useMemo(() => getPersonById(pendingReassign?.fromManagerId), [getPersonById, pendingReassign?.fromManagerId]);
  const pendingToManager = useMemo(() => getPersonById(pendingReassign?.toManagerId), [getPersonById, pendingReassign?.toManagerId]);

  const PersonCard = ({ person, depth = 0 }: { person: Person; depth?: number }) => {
    const reports = getReports(person.id);
    const alerts = getAlerts(person);
    const projectCount = getActiveProjectsForPerson(person.id).length;
    const manager = person.managerId ? people.find(p => p.id === person.managerId) : null;
    const hasReports = reports.length > 0;
    const isCollapsed = collapsed.has(person.id);
    const dropCheck = isValidDrop(draggedPersonId, person.id);
    const isDropCandidate = !!draggedPersonId && draggedPersonId !== person.id;
    const isActiveDropTarget = dropTargetPersonId === person.id && dropCheck.valid;

    return (
      <div style={{ marginLeft: depth > 0 ? 20 : 0 }}>
        <div
          className={cn(
            'border border-border rounded-lg p-4 mb-2 hover:bg-muted/30 transition-colors cursor-pointer',
            alerts.length > 0 && 'border-l-2 border-l-warning',
            draggedPersonId === person.id && 'opacity-60',
            isDropCandidate && isActiveDropTarget && 'ring-2 ring-primary border-primary/80 bg-primary/5',
          )}
          onDragOver={(e) => {
            const check = isValidDrop(draggedPersonId, person.id);
            if (check.valid) {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
            }
          }}
          onDragEnter={(e) => {
            const check = isValidDrop(draggedPersonId, person.id);
            if (check.valid) {
              e.preventDefault();
              setDropTargetPersonId(person.id);
            }
          }}
          onDragLeave={() => {
            if (dropTargetPersonId === person.id) {
              setDropTargetPersonId(null);
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();

            const sourceId = draggedPersonId || e.dataTransfer.getData('text/plain');
            const check = isValidDrop(sourceId, person.id);
            if (!check.valid || !sourceId) {
              setDropTargetPersonId(null);
              return;
            }

            const source = getPersonById(sourceId);
            if (!source) {
              toast({ title: 'Cannot reassign', description: 'Dragged person is no longer available.', variant: 'destructive' });
              clearDragState();
              return;
            }

            setPendingReassign({
              personId: source.id,
              fromManagerId: source.managerId,
              toManagerId: person.id,
            });
            setConfirmOpen(true);
            setDropTargetPersonId(null);
          }}
          onClick={() => {
            if (suppressClickRef.current) return;
            navigate(`/person/${person.id}`);
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setContextMenu({
              person,
              x: e.clientX,
              y: e.clientY,
            });
          }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    draggable={person.active}
                    onDragStart={(e) => {
                      setContextMenu(null);
                      suppressClickRef.current = true;
                      setDraggedPersonId(person.id);
                      setDropTargetPersonId(null);
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', person.id);
                    }}
                    onDragEnd={() => {
                      window.setTimeout(() => {
                        suppressClickRef.current = false;
                      }, 0);
                      clearDragState();
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                      'mt-1 p-1 rounded transition-colors shrink-0',
                      person.active ? 'cursor-grab hover:bg-muted active:cursor-grabbing' : 'cursor-not-allowed opacity-50',
                    )}
                    aria-label={`Drag ${person.name} to reassign manager`}
                    title="Drag to reassign manager"
                  >
                    <GripVertical size={14} className="text-muted-foreground" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Drag to reassign manager
                </TooltipContent>
              </Tooltip>
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
        <div className="flex items-center gap-2">
          <Button onClick={handleExportPeopleJson} variant="outline" size="sm" className="gap-2 font-mono text-xs tracking-wider">
            <Download size={14} /> EXPORT JSON
          </Button>
          <Button onClick={openAdd} size="sm" className="gap-2 font-mono text-xs tracking-wider">
            <Plus size={14} /> ADD PERSON
          </Button>
        </div>
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

      <PersonForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditPerson(undefined); setDefaultManagerId(null); }}
        person={editPerson}
        defaultManagerId={defaultManagerId}
      />

      <AlertDialog open={confirmOpen} onOpenChange={(next) => {
        setConfirmOpen(next);
        if (!next && !reassigning) {
          setPendingReassign(null);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm reporting change?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingSource?.name || 'This person'} will move from{' '}
              <span className="font-medium">{pendingFromManager?.name || 'None'}</span>{' '}
              to{' '}
              <span className="font-medium">{pendingToManager?.name || 'Unknown manager'}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reassigning}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={reassigning}
              onClick={(e) => {
                e.preventDefault();
                void confirmMove();
              }}
            >
              {reassigning ? 'Moving...' : 'Confirm Move'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {contextMenu && (
        <div className="fixed inset-0 z-50" onClick={() => setContextMenu(null)}>
          <div
            className="absolute min-w-[180px] rounded-md border border-border bg-popover p-1 shadow-md"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
              onClick={() => openAddDirectReport(contextMenu.person)}
            >
              <Plus size={12} className="mr-2 inline" />
              Add Direct Report
            </button>
            <button
              type="button"
              className="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
              onClick={() => openEdit(contextMenu.person)}
            >
              Edit Person
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
