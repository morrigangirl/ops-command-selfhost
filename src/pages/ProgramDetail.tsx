import { useParams, useNavigate } from 'react-router-dom';
import { useProgramStore } from '@/lib/program-store';
import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { ProgramForm } from '@/components/ProgramForm';
import { WorkstreamForm } from '@/components/WorkstreamForm';
import { StatusBadge, RiskBadge } from '@/components/StatusBadge';
import { ProjectForm } from '@/components/ProjectForm';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Plus, ChevronRight, Pencil, HelpCircle, Unlink, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-success/20 text-success',
  completed: 'bg-muted text-muted-foreground',
  'on-hold': 'bg-warning/20 text-warning',
};

export default function ProgramDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { programs, getWorkstreamsForProgram } = useProgramStore();
  const { projects } = useStore();
  const program = programs.find(p => p.id === id);

  const [showEdit, setShowEdit] = useState(false);
  const [showAddWs, setShowAddWs] = useState(false);

  if (!program) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => navigate('/programs')} className="gap-2 mb-4"><ArrowLeft size={16} /> Back</Button>
        <p className="text-muted-foreground">Program not found.</p>
      </div>
    );
  }

  const workstreams = getWorkstreamsForProgram(program.id);

  return (
    <div className="p-6 max-w-4xl">
      <Button variant="ghost" size="sm" onClick={() => navigate('/programs')} className="gap-2 mb-4 text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} /> PROGRAMS
      </Button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-mono font-bold tracking-wider">{program.name}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className={cn('text-[10px] font-mono tracking-wider px-2 py-0.5 rounded', STATUS_BADGE[program.status])}>
              {program.status.toUpperCase()}
            </span>
            {program.startDate && (
              <span className="font-mono text-[10px] text-muted-foreground">
                {format(parseISO(program.startDate), 'MMM yyyy')} — {program.targetEndDate ? format(parseISO(program.targetEndDate), 'MMM yyyy') : 'TBD'}
              </span>
            )}
          </div>
          {program.description && <p className="text-sm text-foreground/70 mt-2">{program.description}</p>}
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowEdit(true)} className="gap-1 font-mono text-xs">
          <Pencil size={12} /> EDIT
        </Button>
      </div>

      {/* Workstreams */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-xs tracking-[0.15em] text-muted-foreground">WORKSTREAMS ({workstreams.length})</h2>
          <Button variant="ghost" size="sm" onClick={() => setShowAddWs(true)} className="gap-1 text-xs font-mono">
            <Plus size={12} /> ADD WORKSTREAM
          </Button>
        </div>

        {workstreams.map(ws => {
          const wsProjects = projects.filter(p => p.workstreamId === ws.id);
          return (
            <WorkstreamCard key={ws.id} workstream={ws} projects={wsProjects} navigate={navigate} />
          );
        })}

        {workstreams.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No workstreams yet. Add one to start organizing.</p>
        )}
      </div>

      <ProgramForm open={showEdit} onClose={() => setShowEdit(false)} program={program} />
      <WorkstreamForm open={showAddWs} onClose={() => setShowAddWs(false)} programId={program.id} />
    </div>
  );
}

function WorkstreamCard({ workstream, projects, navigate }: { workstream: any; projects: any[]; navigate: any }) {
  const { updateProject, deleteProject } = useStore();
  const { deleteWorkstream } = useProgramStore();
  const [open, setOpen] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);

  return (
    <>
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          <div className="flex items-center gap-2 px-4 py-2.5">
            <CollapsibleTrigger asChild>
              <button className="p-0.5 text-muted-foreground hover:text-foreground">
                <ChevronRight size={14} className={cn('transition-transform', open && 'rotate-90')} />
              </button>
            </CollapsibleTrigger>
            <span className="w-2 h-2 rounded-full bg-primary" />
            <h3 className="text-sm font-medium flex-1">{workstream.name}</h3>
            <button onClick={() => setShowInfo(true)} className="p-1 text-muted-foreground/60 hover:text-foreground transition-colors">
              <HelpCircle size={14} />
            </button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="p-1 text-muted-foreground/50 hover:text-destructive transition-colors" title="Delete workstream">
                  <Trash2 size={14} />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Move to trash?</AlertDialogTitle>
                  <AlertDialogDescription>
                    "{workstream.name}" will be moved to trash. Projects linked to it will be unlinked. You can restore within 7 days.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => { deleteWorkstream(workstream.id); toast({ title: 'Moved to trash' }); }}
                  >
                    Move to Trash
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <span className="text-[10px] text-muted-foreground font-mono">{projects.length} projects</span>
          </div>
          <CollapsibleContent>
            <div className="border-t border-border px-4 py-2 bg-background space-y-1">
              {projects.length === 0 ? (
                <p className="text-xs text-muted-foreground py-1">No projects linked to this workstream.</p>
              ) : (
                projects.map(p => (
                  <div key={p.id} className="flex items-center gap-2 py-1.5 hover:bg-accent/30 rounded px-2 -mx-2 transition-colors">
                    <span className="text-sm flex-1 cursor-pointer" onClick={() => navigate(`/project/${p.id}`)}>{p.name}</span>
                    <StatusBadge status={p.status} />
                    <RiskBadge risk={p.risk} />
                    <button
                      onClick={(e) => { e.stopPropagation(); updateProject({ ...p, workstreamId: null }); }}
                      className="p-1 text-muted-foreground/50 hover:text-destructive transition-colors"
                      title="Unlink from workstream"
                    >
                      <Unlink size={12} />
                    </button>
                  </div>
                ))
              )}
              <button
                onClick={() => setShowNewProject(true)}
                className="flex items-center gap-1 text-xs font-mono text-muted-foreground hover:text-foreground py-1.5 transition-colors"
              >
                <Plus size={12} /> NEW PROJECT
              </button>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      <Dialog open={showInfo} onOpenChange={setShowInfo}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-mono tracking-wider text-sm">ABOUT WORKSTREAMS</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm text-foreground/80">
            <div>
              <h4 className="font-mono text-xs text-muted-foreground tracking-wider mb-1">WHAT IS A WORKSTREAM?</h4>
              <p>A workstream is a thematic grouping of related projects within a program. It helps you organize initiatives by focus area — for example, <span className="font-medium text-foreground">"Detection Engineering"</span> or <span className="font-medium text-foreground">"Compliance & Audit"</span>.</p>
            </div>
            <div>
              <h4 className="font-mono text-xs text-muted-foreground tracking-wider mb-1">HOW TO ADD A PROJECT</h4>
              <ol className="list-decimal list-inside space-y-1.5 text-foreground/70">
                <li>Navigate to the <span className="font-medium text-foreground">Projects</span> page</li>
                <li>Create a new project or edit an existing one</li>
                <li>In the project form, select a <span className="font-medium text-foreground">workstream</span> from the dropdown to link it</li>
              </ol>
              <p className="mt-2 text-xs text-muted-foreground">Once linked, the project will appear under this workstream automatically.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ProjectForm open={showNewProject} onClose={() => setShowNewProject(false)} defaultWorkstreamId={workstream.id} />
    </>
  );
}
