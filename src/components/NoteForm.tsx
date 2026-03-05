import { useEffect, useMemo, useState } from 'react';
import { NOTE_TARGET_LABELS, NOTE_TARGET_TYPES, type Note, type NoteTargetType } from '@/lib/types';
import { useNoteTargetOptions } from '@/lib/note-targets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface NoteFormValues {
  title: string;
  body: string;
  targetType: NoteTargetType | null;
  targetId: string | null;
  isPinned: boolean;
}

interface NoteFormProps {
  initialValues?: Partial<NoteFormValues>;
  onSubmit: (values: NoteFormValues) => Promise<void> | void;
  onCancel?: () => void;
  submitLabel?: string;
  showAttachmentControls?: boolean;
  lockTarget?: { targetType: NoteTargetType; targetId: string };
  compact?: boolean;
}

export function NoteForm({
  initialValues,
  onSubmit,
  onCancel,
  submitLabel = 'Save',
  showAttachmentControls = true,
  lockTarget,
  compact = false,
}: NoteFormProps) {
  const targetOptions = useNoteTargetOptions();

  const [title, setTitle] = useState(initialValues?.title || '');
  const [body, setBody] = useState(initialValues?.body || '');
  const [targetType, setTargetType] = useState<NoteTargetType | null>(initialValues?.targetType || null);
  const [targetId, setTargetId] = useState<string | null>(initialValues?.targetId || null);
  const [isPinned, setIsPinned] = useState(Boolean(initialValues?.isPinned));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!lockTarget) return;
    setTargetType(lockTarget.targetType);
    setTargetId(lockTarget.targetId);
  }, [lockTarget]);

  const targetItems = useMemo(() => {
    if (!targetType) return [];
    return targetOptions[targetType];
  }, [targetType, targetOptions]);

  const handleTargetTypeChange = (value: string) => {
    if (value === 'orphan') {
      setTargetType(null);
      setTargetId(null);
      return;
    }

    const nextType = value as NoteTargetType;
    setTargetType(nextType);

    const hasExisting = targetId && targetOptions[nextType].some((option) => option.id === targetId);
    if (!hasExisting) setTargetId(null);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        body: body.trim(),
        targetType,
        targetId,
        isPinned,
      });

      if (!compact) {
        setTitle('');
        setBody('');
        if (!lockTarget) {
          setTargetType(null);
          setTargetId(null);
        }
        setIsPinned(false);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-[10px] font-mono tracking-wider text-muted-foreground">TITLE</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled note"
          className="h-8 text-sm"
        />
      </div>

      <div className="space-y-1">
        <Label className="text-[10px] font-mono tracking-wider text-muted-foreground">BODY</Label>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={compact ? 4 : 6}
          placeholder="Type your note..."
          className="text-sm"
        />
      </div>

      {showAttachmentControls && !lockTarget && (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-[10px] font-mono tracking-wider text-muted-foreground">ATTACHMENT TYPE</Label>
            <Select value={targetType || 'orphan'} onValueChange={handleTargetTypeChange}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Orphan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="orphan">Orphan</SelectItem>
                {NOTE_TARGET_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>{NOTE_TARGET_LABELS[type]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-mono tracking-wider text-muted-foreground">TARGET</Label>
            <Select
              value={targetId || 'none'}
              onValueChange={(value) => setTargetId(value === 'none' ? null : value)}
              disabled={!targetType}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder={targetType ? 'Select target' : 'No target'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No target</SelectItem>
                {targetItems.map((option) => (
                  <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={isPinned}
            onChange={(e) => setIsPinned(e.target.checked)}
            className="h-3.5 w-3.5"
          />
          Pin note
        </label>
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={submitting || (targetType !== null && !targetId)}
          className="font-mono text-xs"
        >
          {submitting ? 'Saving...' : submitLabel}
        </Button>
        {onCancel && (
          <Button size="sm" variant="ghost" onClick={onCancel} className="font-mono text-xs">
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}

export type { NoteFormValues };
