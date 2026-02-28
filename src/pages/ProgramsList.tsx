import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProgramStore } from '@/lib/program-store';
import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { ProgramForm } from '@/components/ProgramForm';
import { StatusBadge, RiskBadge } from '@/components/StatusBadge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, ChevronRight, FolderKanban, Upload, Trash2 } from 'lucide-react';
import { ImportProgramDialog } from '@/components/ImportProgramDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { toast } from '@/hooks/use-toast';

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-success/20 text-success',
  completed: 'bg-muted text-muted-foreground',
  'on-hold': 'bg-warning/20 text-warning',
};

export default function ProgramsList() {
  const { programs, getWorkstreamsForProgram, deleteProgram } = useProgramStore();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-mono font-bold tracking-[0.15em] text-foreground">PROGRAMS</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Strategic program oversight &middot; {programs.length} programs</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImport(true)} size="sm" className="gap-2 font-mono text-xs tracking-wider">
            <Upload size={14} /> IMPORT
          </Button>
          <Button onClick={() => setShowForm(true)} size="sm" className="gap-2 font-mono text-xs tracking-wider">
            <Plus size={14} /> NEW PROGRAM
          </Button>
        </div>
      </div>

      {programs.length === 0 && (
        <div className="border border-dashed border-border rounded-lg p-8 text-center">
          <FolderKanban size={32} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No programs yet. Create one to organize your workstreams and projects.</p>
        </div>
      )}

      <div className="space-y-3">
        {programs.map(program => {
          const ws = getWorkstreamsForProgram(program.id);
          return (
            <ProgramCard key={program.id} program={program} workstreams={ws}
              onClick={() => navigate(`/program/${program.id}`)} deleteProgram={deleteProgram} />
          );
        })}
      </div>

      <ProgramForm open={showForm} onClose={() => setShowForm(false)} />
      <ImportProgramDialog open={showImport} onClose={() => setShowImport(false)} />
    </div>
  );
}

function ProgramCard({ program, workstreams, onClick, deleteProgram }: {
  program: any; workstreams: any[]; onClick: () => void; deleteProgram: (id: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const { projects } = useStore();

  return (
    <div className="border border-border rounded-lg bg-card overflow-hidden">
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-accent/30 transition-colors" onClick={onClick}>
          <CollapsibleTrigger asChild onClick={e => e.stopPropagation()}>
            <button className="p-0.5 text-muted-foreground hover:text-foreground">
              <ChevronRight size={14} className={cn('transition-transform', open && 'rotate-90')} />
            </button>
          </CollapsibleTrigger>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium truncate">{program.name}</h3>
            {program.description && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">{program.description}</p>
            )}
          </div>
          <span className={cn('text-[10px] font-mono tracking-wider px-2 py-0.5 rounded', STATUS_BADGE[program.status])}>
            {program.status.toUpperCase()}
          </span>
          {program.targetEndDate && (
            <span className="font-mono text-[10px] text-muted-foreground">
              {format(parseISO(program.targetEndDate), 'MMM yyyy')}
            </span>
          )}
          <span className="text-[10px] text-muted-foreground font-mono">{workstreams.length} streams</span>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                onClick={e => e.stopPropagation()}
                className="p-1 text-muted-foreground/50 hover:text-destructive transition-colors"
                title="Delete program"
              >
                <Trash2 size={14} />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Move to trash?</AlertDialogTitle>
                <AlertDialogDescription>
                  "{program.name}" and its workstreams will be moved to trash. You can restore them within 7 days.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteProgram(program.id);
                    toast({ title: 'Moved to trash' });
                  }}
                >
                  Move to Trash
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <CollapsibleContent>
          <div className="border-t border-border px-4 py-2 bg-background">
            {workstreams.length === 0 ? (
              <p className="text-xs text-muted-foreground py-1">No workstreams yet.</p>
            ) : (
              <div className="space-y-1">
                {workstreams.map(ws => {
                  const wsProjects = projects.filter(p => p.workstreamId === ws.id);
                  return (
                    <div key={ws.id}>
                      <div className="flex items-center gap-2 py-1 text-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        <span className="flex-1">{ws.name}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{wsProjects.length} projects</span>
                      </div>
                      {wsProjects.map(p => (
                        <div key={p.id} className="flex items-center gap-2 py-1 pl-5 text-xs text-muted-foreground">
                          <span className="flex-1">{p.name}</span>
                          <StatusBadge status={p.status} />
                          <RiskBadge risk={p.risk} />
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
