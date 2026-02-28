import { MeetingActionItem, ACTION_ITEM_STATUSES } from '@/lib/types';
import { useRhythmStore } from '@/lib/rhythm-store';
import { useStore } from '@/lib/store';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Trash2, AlertTriangle, Link } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

interface ActionItemRowProps {
  item: MeetingActionItem;
  readOnly?: boolean;
  showOwner?: boolean;
}

export function ActionItemRow({ item, readOnly, showOwner }: ActionItemRowProps) {
  const { updateActionItem, deleteActionItem } = useRhythmStore();
  const { getPerson, getProject } = useStore();

  const owner = item.ownerId ? getPerson(item.ownerId) : null;
  const project = item.projectId ? getProject(item.projectId) : null;

  const statusColors = {
    open: 'text-primary',
    done: 'text-success',
    blocked: 'text-destructive',
  };

  return (
    <div className={cn(
      'flex items-center gap-2 py-1.5 px-2 rounded text-xs group',
      item.status === 'done' && 'opacity-50',
      item.status === 'blocked' && 'bg-destructive/5',
    )}>
      {item.status === 'blocked' && <AlertTriangle size={10} className="text-destructive shrink-0" />}
      <span className={cn('flex-1', item.status === 'done' && 'line-through')}>{item.title}</span>
      {showOwner && owner && (
        <span className="text-[10px] text-muted-foreground font-mono">{owner.name}</span>
      )}
      {project && (
        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
          <Link size={8} /> {project.name}
        </span>
      )}
      {item.dueDate && (
        <span className="text-[10px] text-muted-foreground font-mono">
          {format(parseISO(item.dueDate), 'MMM dd')}
        </span>
      )}
      {!readOnly && (
        <>
          <Select value={item.status} onValueChange={v => updateActionItem({ ...item, status: v as any })}>
            <SelectTrigger className={cn('h-6 w-20 text-[10px] font-mono border-0 bg-transparent', statusColors[item.status])}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTION_ITEM_STATUSES.map(s => (
                <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" onClick={() => deleteActionItem(item.id)} className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100">
            <Trash2 size={10} />
          </Button>
        </>
      )}
    </div>
  );
}
