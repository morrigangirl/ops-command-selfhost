import { useState } from 'react';
import { useProgramStore } from '@/lib/program-store';
import { useStore } from '@/lib/store';
import { WorkItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronRight, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const TYPE_LABELS: Record<WorkItem['type'], string> = { epic: 'EPIC', task: 'TASK', subtask: 'SUBTASK' };
const CHILD_TYPE: Record<WorkItem['type'], WorkItem['type'] | null> = { epic: 'task', task: 'subtask', subtask: null };
const STATUS_COLORS: Record<WorkItem['status'], string> = {
  todo: 'bg-muted text-muted-foreground',
  'in-progress': 'bg-primary/20 text-primary',
  done: 'bg-success/20 text-success',
  blocked: 'bg-destructive/20 text-destructive',
};

interface WorkItemNodeProps {
  item: WorkItem;
  depth: number;
  projectId: string;
}

function WorkItemNode({ item, depth, projectId }: WorkItemNodeProps) {
  const { getChildWorkItems, addWorkItem, updateWorkItem, deleteWorkItem } = useProgramStore();
  const { people } = useStore();
  const children = getChildWorkItems(item.id);
  const childType = CHILD_TYPE[item.type];
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);

  const handleAdd = async () => {
    if (!newTitle.trim() || !childType) return;
    await addWorkItem({
      milestoneId: item.milestoneId, projectId, parentId: item.id,
      type: childType, title: newTitle, description: '', status: 'todo',
      assigneeId: null, dueDate: null, sortOrder: children.length,
    });
    setNewTitle('');
    setAdding(false);
    setOpen(true);
  };

  const handleStatusChange = (status: string) => {
    updateWorkItem({ ...item, status: status as WorkItem['status'] });
  };

  const handleSaveTitle = () => {
    if (editTitle.trim()) updateWorkItem({ ...item, title: editTitle });
    setEditing(false);
  };

  return (
    <div style={{ paddingLeft: depth > 0 ? 16 : 0 }}>
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-center gap-1.5 group py-1 px-1 rounded hover:bg-accent/50 transition-colors">
          {(children.length > 0 || childType) && (
            <CollapsibleTrigger asChild>
              <button className="p-0.5 text-muted-foreground hover:text-foreground">
                <ChevronRight size={12} className={cn('transition-transform', open && 'rotate-90')} />
              </button>
            </CollapsibleTrigger>
          )}
          {!children.length && !childType && <span className="w-4" />}

          <span className={cn('text-[9px] font-mono tracking-wider px-1.5 py-0.5 rounded', STATUS_COLORS[item.status])}>
            {TYPE_LABELS[item.type]}
          </span>

          {editing ? (
            <Input value={editTitle} onChange={e => setEditTitle(e.target.value)}
              onBlur={handleSaveTitle} onKeyDown={e => e.key === 'Enter' && handleSaveTitle()}
              className="h-6 text-xs flex-1" autoFocus />
          ) : (
            <span className={cn('text-sm flex-1 cursor-pointer', item.status === 'done' && 'line-through text-muted-foreground')}
              onClick={() => { setEditing(true); setEditTitle(item.title); }}>
              {item.title}
            </span>
          )}

          <Select value={item.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="h-6 w-[100px] text-[10px] font-mono border-none bg-transparent">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todo">Todo</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="done">Done</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
            </SelectContent>
          </Select>

          {childType && (
            <button onClick={() => setAdding(!adding)}
              className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-foreground transition-opacity">
              <Plus size={12} />
            </button>
          )}
          <button onClick={() => deleteWorkItem(item.id)}
            className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-destructive transition-opacity">
            <Trash2 size={12} />
          </button>
        </div>

        <CollapsibleContent>
          {children.map(child => (
            <WorkItemNode key={child.id} item={child} depth={depth + 1} projectId={projectId} />
          ))}
          {adding && (
            <div className="flex items-center gap-2 py-1" style={{ paddingLeft: 16 }}>
              <Input value={newTitle} onChange={e => setNewTitle(e.target.value)}
                placeholder={`New ${childType}...`} className="h-6 text-xs flex-1"
                onKeyDown={e => e.key === 'Enter' && handleAdd()} autoFocus />
              <Button size="sm" variant="ghost" onClick={handleAdd} className="h-6 px-2 text-xs">Add</Button>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

interface WorkItemTreeProps {
  projectId: string;
  milestoneId: string | null;
}

export function WorkItemTree({ projectId, milestoneId }: WorkItemTreeProps) {
  const { getRootWorkItems, addWorkItem } = useProgramStore();
  const items = getRootWorkItems(projectId, milestoneId);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    await addWorkItem({
      milestoneId, projectId, parentId: null,
      type: 'epic', title: newTitle, description: '', status: 'todo',
      assigneeId: null, dueDate: null, sortOrder: items.length,
    });
    setNewTitle('');
    setAdding(false);
  };

  return (
    <div className="space-y-0.5">
      {items.map(item => (
        <WorkItemNode key={item.id} item={item} depth={0} projectId={projectId} />
      ))}
      {adding ? (
        <div className="flex items-center gap-2 py-1">
          <Input value={newTitle} onChange={e => setNewTitle(e.target.value)}
            placeholder="New epic..." className="h-7 text-xs flex-1"
            onKeyDown={e => e.key === 'Enter' && handleAdd()} autoFocus />
          <Button size="sm" variant="ghost" onClick={handleAdd} className="h-7 px-2 text-xs font-mono">Add</Button>
          <Button size="sm" variant="ghost" onClick={() => setAdding(false)} className="h-7 px-2 text-xs">Cancel</Button>
        </div>
      ) : (
        <Button variant="ghost" size="sm" onClick={() => setAdding(true)} className="gap-1 text-xs text-muted-foreground font-mono h-7">
          <Plus size={12} /> ADD EPIC
        </Button>
      )}
    </div>
  );
}
