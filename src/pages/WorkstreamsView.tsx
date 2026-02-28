import { useProgramStore } from '@/lib/program-store';
import { useStore } from '@/lib/store';
import { useNavigate } from 'react-router-dom';
import { Layers } from 'lucide-react';

export default function WorkstreamsView() {
  const { programs, workstreams } = useProgramStore();
  const { projects, getPerson } = useStore();
  const navigate = useNavigate();

  // Group workstreams by program
  const grouped = programs
    .filter(p => workstreams.some(w => w.programId === p.id))
    .map(program => ({
      program,
      workstreams: workstreams
        .filter(w => w.programId === program.id)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    }));

  const getProjectCount = (wsId: string) =>
    projects.filter(p => p.workstreamId === wsId).length;

  if (workstreams.length === 0) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full text-center">
        <Layers size={48} className="text-muted-foreground/40 mb-4" />
        <h2 className="text-lg font-semibold mb-1">No Workstreams</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          Workstreams are created within programs. Open a program and add workstreams to organise your projects.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold font-mono tracking-wide">WORKSTREAMS</h1>
        <p className="text-xs text-muted-foreground mt-1">All workstreams across programs</p>
      </div>

      {grouped.map(({ program, workstreams: ws }) => (
        <section key={program.id} className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {program.name}
          </h2>
          <div className="space-y-1">
            {ws.map(w => {
              const lead = w.leadId ? getPerson(w.leadId) : null;
              const projCount = getProjectCount(w.id);
              return (
                <button
                  key={w.id}
                  onClick={() => navigate(`/program/${program.id}`)}
                  className="w-full text-left px-4 py-3 rounded-md border border-border bg-card hover:bg-accent/50 transition-colors flex items-start gap-3"
                >
                  <Layers size={16} className="text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{w.name}</p>
                    {w.description && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{w.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                    {lead && <span>{lead.name}</span>}
                    <span className="font-mono">{projCount} proj</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
