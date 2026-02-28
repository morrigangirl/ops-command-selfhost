import { useState } from 'react';
import { useProgramStore } from '@/lib/program-store';
import { Milestone } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { WorkItemTree } from './WorkItemTree';
import { ChevronRight, Plus, Trash2, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

interface MilestoneSectionProps {
  projectId: string;
}

export function MilestoneSection({ projectId }: MilestoneSectionProps) {
  const { getMilestonesForProject, addMilestone, toggleMilestoneComplete, deleteMilestone } = useProgramStore();
  const milestones = getMilestonesForProject(projectId);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDate, setNewDate] = useState('');

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await addMilestone({
      projectId, name: newName, targetDate: newDate || null,
      completed: false, completedDate: null, sortOrder: milestones.length,
    });
    setNewName('');
    setNewDate('');
    setAdding(false);
  };

  return (
    <div className="border-t border-border pt-6">
      <h2 className="font-mono text-xs tracking-[0.15em] text-muted-foreground mb-4 flex items-center gap-2">
        <Target size={12} /> MILESTONES & WORK BREAKDOWN
      </h2>

      <div className="space-y-2">
        {milestones.map(m => (
          <MilestoneItem key={m.id} milestone={m} projectId={projectId}
            onToggle={() => toggleMilestoneComplete(m.id)}
            onDelete={() => deleteMilestone(m.id)} />
        ))}
      </div>

      {adding ? (
        <div className="flex items-center gap-2 mt-3">
          <Input value={newName} onChange={e => setNewName(e.target.value)}
            placeholder="Milestone name..." className="h-8 text-sm flex-1"
            onKeyDown={e => e.key === 'Enter' && handleAdd()} autoFocus />
          <Input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="h-8 w-40" />
          <Button size="sm" onClick={handleAdd} className="h-8 font-mono text-xs">Add</Button>
          <Button size="sm" variant="ghost" onClick={() => setAdding(false)} className="h-8 text-xs">Cancel</Button>
        </div>
      ) : (
        <Button variant="ghost" size="sm" onClick={() => setAdding(true)} className="gap-1 text-xs text-muted-foreground font-mono mt-3">
          <Plus size={12} /> ADD MILESTONE
        </Button>
      )}
    </div>
  );
}

function MilestoneItem({ milestone, projectId, onToggle, onDelete }: {
  milestone: Milestone; projectId: string; onToggle: () => void; onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 bg-card group">
          <CollapsibleTrigger asChild>
            <button className="p-0.5 text-muted-foreground hover:text-foreground">
              <ChevronRight size={14} className={cn('transition-transform', open && 'rotate-90')} />
            </button>
          </CollapsibleTrigger>
          <Checkbox checked={milestone.completed} onCheckedChange={onToggle} />
          <span className={cn('text-sm font-medium flex-1', milestone.completed && 'line-through text-muted-foreground')}>
            {milestone.name}
          </span>
          {milestone.targetDate && (
            <span className="font-mono text-[10px] text-muted-foreground">
              {format(parseISO(milestone.targetDate), 'MMM dd, yyyy')}
            </span>
          )}
          <button onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-opacity">
            <Trash2 size={12} />
          </button>
        </div>
        <CollapsibleContent>
          <div className="px-3 py-2 bg-background border-t border-border">
            <WorkItemTree projectId={projectId} milestoneId={milestone.id} />
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
