import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Trash2, RotateCcw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, parseISO, addDays } from 'date-fns';

interface TrashedItem {
  id: string;
  name: string;
  type: 'program' | 'workstream' | 'project';
  deletedAt: string;
  expiresAt: string;
  parentName?: string;
}

export default function TrashView() {
  const { user } = useAuth();
  const [items, setItems] = useState<TrashedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrashed = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [{ data: programs }, { data: workstreams }, { data: projects }] = await Promise.all([
      supabase.from('programs').select('id, name, deleted_at').not('deleted_at', 'is', null),
      supabase.from('workstreams').select('id, name, deleted_at, program_id').not('deleted_at', 'is', null),
      supabase.from('projects').select('id, name, deleted_at').not('deleted_at', 'is', null),
    ]);

    const all: TrashedItem[] = [];

    (programs || []).forEach(r => all.push({
      id: r.id, name: r.name, type: 'program',
      deletedAt: r.deleted_at!, expiresAt: addDays(parseISO(r.deleted_at!), 7).toISOString(),
    }));
    (workstreams || []).forEach(r => all.push({
      id: r.id, name: r.name, type: 'workstream',
      deletedAt: r.deleted_at!, expiresAt: addDays(parseISO(r.deleted_at!), 7).toISOString(),
    }));
    (projects || []).forEach(r => all.push({
      id: r.id, name: r.name, type: 'project',
      deletedAt: r.deleted_at!, expiresAt: addDays(parseISO(r.deleted_at!), 7).toISOString(),
    }));

    all.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
    setItems(all);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchTrashed(); }, [fetchTrashed]);

  const restore = async (item: TrashedItem) => {
    const table = item.type === 'program' ? 'programs' : item.type === 'workstream' ? 'workstreams' : 'projects';
    await supabase.from(table).update({ deleted_at: null } as any).eq('id', item.id);

    // If restoring a program, also restore its workstreams
    if (item.type === 'program') {
      await supabase.from('workstreams').update({ deleted_at: null } as any).eq('program_id', item.id);
    }

    toast({ title: `${item.type.charAt(0).toUpperCase() + item.type.slice(1)} restored` });
    fetchTrashed();
  };

  const permanentDelete = async (item: TrashedItem) => {
    const table = item.type === 'program' ? 'programs' : item.type === 'workstream' ? 'workstreams' : 'projects';
    await supabase.from(table).delete().eq('id', item.id);
    toast({ title: `${item.type.charAt(0).toUpperCase() + item.type.slice(1)} permanently deleted` });
    fetchTrashed();
  };

  const emptyTrash = async () => {
    await Promise.all([
      supabase.from('projects').delete().not('deleted_at', 'is', null),
      supabase.from('workstreams').delete().not('deleted_at', 'is', null),
      supabase.from('programs').delete().not('deleted_at', 'is', null),
    ]);
    toast({ title: 'Trash emptied' });
    fetchTrashed();
  };

  const TYPE_LABEL: Record<string, string> = {
    program: 'PROGRAM',
    workstream: 'WORKSTREAM',
    project: 'PROJECT',
  };

  const TYPE_COLOR: Record<string, string> = {
    program: 'bg-primary/10 text-primary',
    workstream: 'bg-accent text-accent-foreground',
    project: 'bg-muted text-muted-foreground',
  };

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-mono font-bold tracking-[0.15em] text-foreground">TRASH</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Deleted items &middot; Auto-purged after 7 days &middot; {items.length} items
          </p>
        </div>
        {items.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="gap-2 font-mono text-xs tracking-wider">
                <Trash2 size={14} /> EMPTY TRASH
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Empty trash?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all {items.length} items in the trash. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={emptyTrash}
                >
                  Empty Trash
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center font-mono">LOADING...</p>
      ) : items.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-8 text-center">
          <Trash2 size={32} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Trash is empty.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <div key={`${item.type}-${item.id}`} className="flex items-center gap-3 border border-border rounded-lg bg-card px-4 py-3">
              <span className={cn('text-[10px] font-mono tracking-wider px-2 py-0.5 rounded', TYPE_COLOR[item.type])}>
                {TYPE_LABEL[item.type]}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.name}</p>
                <p className="text-[10px] text-muted-foreground font-mono">
                  Deleted {formatDistanceToNow(parseISO(item.deletedAt), { addSuffix: true })}
                  {' · '}
                  <span className="text-warning">
                    Expires {formatDistanceToNow(parseISO(item.expiresAt), { addSuffix: true })}
                  </span>
                </p>
              </div>
              <Button variant="outline" size="sm" className="gap-1 text-xs font-mono" onClick={() => restore(item)}>
                <RotateCcw size={12} /> RESTORE
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1 text-xs font-mono text-destructive hover:text-destructive">
                    <Trash2 size={12} /> DELETE
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Permanently delete?</AlertDialogTitle>
                    <AlertDialogDescription>
                      "{item.name}" will be permanently deleted. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => permanentDelete(item)}
                    >
                      Delete Forever
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
