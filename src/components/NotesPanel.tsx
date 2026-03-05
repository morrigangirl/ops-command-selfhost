import { useMemo, useState } from 'react';
import { StickyNote, Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { NoteForm } from '@/components/NoteForm';
import { NotesList } from '@/components/NotesList';
import { useNotesStore } from '@/lib/notes-store';
import { NOTE_TARGET_LABELS, type NoteTargetType } from '@/lib/types';

interface NotesPanelProps {
  targetType: NoteTargetType;
  targetId: string;
  title?: string;
}

export function NotesPanel({ targetType, targetId, title }: NotesPanelProps) {
  const { getNotesForTarget, addNote, updateNote, deleteNote } = useNotesStore();
  const [creating, setCreating] = useState(false);

  const notes = useMemo(() => getNotesForTarget(targetType, targetId), [getNotesForTarget, targetType, targetId]);

  const panelTitle = title || `${NOTE_TARGET_LABELS[targetType]} Notes`;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-mono text-xs tracking-[0.15em] text-muted-foreground">
          <StickyNote size={12} /> {panelTitle.toUpperCase()} ({notes.length})
        </h3>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 gap-1 font-mono text-xs"
          onClick={() => setCreating((prev) => !prev)}
        >
          <Plus size={12} /> {creating ? 'CLOSE' : 'ADD NOTE'}
        </Button>
      </div>

      {creating && (
        <div className="mb-3 rounded-md border border-border/80 bg-background p-3">
          <NoteForm
            compact
            submitLabel="Create"
            showAttachmentControls={false}
            lockTarget={{ targetType, targetId }}
            onSubmit={async (values) => {
              await addNote(values);
              toast({ title: 'Note created' });
              setCreating(false);
            }}
            onCancel={() => setCreating(false)}
          />
        </div>
      )}

      <NotesList
        compact
        notes={notes}
        onUpdate={async (note) => {
          await updateNote(note);
          toast({ title: 'Note updated' });
        }}
        onDelete={async (id) => {
          await deleteNote(id);
          toast({ title: 'Note deleted' });
        }}
        emptyMessage="No notes attached here yet."
      />
    </div>
  );
}
