import { useMemo, useState } from 'react';
import { Plus, Search, StickyNote } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNotesStore } from '@/lib/notes-store';
import { NOTE_TARGET_LABELS, NOTE_TARGET_TYPES, type NoteTargetType } from '@/lib/types';
import { NoteForm } from '@/components/NoteForm';
import { NotesList } from '@/components/NotesList';
import { toast } from '@/hooks/use-toast';

export default function NotesView() {
  const { notes, addNote, updateNote, deleteNote, searchNotes } = useNotesStore();
  const [showCreate, setShowCreate] = useState(false);
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<'all' | 'orphan' | 'attached'>('all');
  const [targetTypeFilter, setTargetTypeFilter] = useState<NoteTargetType | 'all'>('all');

  const filtered = useMemo(() => {
    return searchNotes(query, {
      scope,
      targetType: targetTypeFilter,
    });
  }, [searchNotes, query, scope, targetTypeFilter]);

  const counts = useMemo(() => {
    const orphan = notes.filter((n) => n.targetType === null).length;
    const attached = notes.length - orphan;
    return {
      all: notes.length,
      orphan,
      attached,
    };
  }, [notes]);

  return (
    <div className="h-full overflow-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-mono text-xl font-bold tracking-[0.15em]">NOTES</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">Orphan + attached notes in one workspace.</p>
        </div>
        <Button size="sm" className="gap-2 font-mono text-xs" onClick={() => setShowCreate((prev) => !prev)}>
          <Plus size={14} /> {showCreate ? 'CLOSE' : 'NEW NOTE'}
        </Button>
      </div>

      {showCreate && (
        <div className="mb-4 rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 flex items-center gap-2 font-mono text-xs tracking-[0.15em] text-muted-foreground">
            <StickyNote size={12} /> CREATE NOTE
          </h2>
          <NoteForm
            submitLabel="Create"
            onSubmit={async (values) => {
              await addNote(values);
              toast({ title: 'Note created' });
              setShowCreate(false);
            }}
            onCancel={() => setShowCreate(false)}
          />
        </div>
      )}

      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto_auto]">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title or body..."
            className="h-9 pl-9 text-xs"
          />
        </div>

        <Tabs value={scope} onValueChange={(value) => setScope(value as 'all' | 'orphan' | 'attached')}>
          <TabsList>
            <TabsTrigger value="all" className="text-xs font-mono">All ({counts.all})</TabsTrigger>
            <TabsTrigger value="orphan" className="text-xs font-mono">Orphan ({counts.orphan})</TabsTrigger>
            <TabsTrigger value="attached" className="text-xs font-mono">Attached ({counts.attached})</TabsTrigger>
          </TabsList>
        </Tabs>

        <Select value={targetTypeFilter} onValueChange={(value) => setTargetTypeFilter(value as NoteTargetType | 'all')}>
          <SelectTrigger className="h-9 w-[170px] text-xs">
            <SelectValue placeholder="All targets" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All targets</SelectItem>
            {NOTE_TARGET_TYPES.map((type) => (
              <SelectItem key={type} value={type}>{NOTE_TARGET_LABELS[type]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <NotesList
        notes={filtered}
        onUpdate={async (note) => {
          await updateNote(note);
          toast({ title: 'Note updated' });
        }}
        onDelete={async (id) => {
          await deleteNote(id);
          toast({ title: 'Note deleted' });
        }}
        emptyMessage="No notes match the current filters."
      />
    </div>
  );
}
