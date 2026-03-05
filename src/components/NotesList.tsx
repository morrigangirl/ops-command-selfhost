import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Pin, PinOff, Pencil, Trash2, Link2, Unlink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NOTE_TARGET_LABELS, type Note } from '@/lib/types';
import { getNoteTargetDisplayLabel, useNoteTargetOptions } from '@/lib/note-targets';
import { NoteForm } from '@/components/NoteForm';

interface NotesListProps {
  notes: Note[];
  onUpdate: (note: Note) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  emptyMessage?: string;
  showAttachmentTag?: boolean;
  compact?: boolean;
}

export function NotesList({
  notes,
  onUpdate,
  onDelete,
  emptyMessage = 'No notes yet.',
  showAttachmentTag = true,
  compact = false,
}: NotesListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const targetOptions = useNoteTargetOptions();

  if (notes.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-2">
      {notes.map((note) => {
        const editing = editingId === note.id;

        return (
          <div key={note.id} className="rounded-lg border border-border bg-card p-3">
            {editing ? (
              <NoteForm
                compact
                submitLabel="Update"
                initialValues={{
                  title: note.title,
                  body: note.body,
                  targetType: note.targetType,
                  targetId: note.targetId,
                  isPinned: note.isPinned,
                }}
                onSubmit={async (values) => {
                  await onUpdate({
                    ...note,
                    title: values.title,
                    body: values.body,
                    targetType: values.targetType,
                    targetId: values.targetId,
                    isPinned: values.isPinned,
                  });
                  setEditingId(null);
                }}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <>
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-medium">{note.title || 'Untitled'}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-mono text-muted-foreground">
                        Updated {format(parseISO(note.updatedAt), 'MMM dd, yyyy HH:mm')}
                      </span>
                      {showAttachmentTag && (
                        <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                          {note.targetType ? <Link2 size={10} /> : <Unlink size={10} />}
                          {note.targetType ? NOTE_TARGET_LABELS[note.targetType] : 'ORPHAN'}
                          {note.targetType ? ` · ${getNoteTargetDisplayLabel(note, targetOptions)}` : ''}
                        </span>
                      )}
                      {note.isPinned && (
                        <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-mono text-primary">
                          <Pin size={10} /> PINNED
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => onUpdate({ ...note, isPinned: !note.isPinned })}
                      title={note.isPinned ? 'Unpin' : 'Pin'}
                    >
                      {note.isPinned ? <PinOff size={12} /> : <Pin size={12} />}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => setEditingId(note.id)}
                      title="Edit"
                    >
                      <Pencil size={12} />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive"
                      onClick={() => onDelete(note.id)}
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>

                {note.body && (
                  <p className={compact ? 'text-xs whitespace-pre-wrap text-foreground/80' : 'text-sm whitespace-pre-wrap text-foreground/80'}>
                    {note.body}
                  </p>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
