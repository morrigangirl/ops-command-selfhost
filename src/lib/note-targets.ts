import { useMemo } from 'react';
import { useStore } from '@/lib/store';
import { useProgramStore } from '@/lib/program-store';
import { useMetricStore } from '@/lib/metric-store';
import { useRhythmStore } from '@/lib/rhythm-store';
import { type Note, type NoteTargetType } from '@/lib/types';

export interface NoteTargetOption {
  id: string;
  label: string;
}

export function useNoteTargetOptions(): Record<NoteTargetType, NoteTargetOption[]> {
  const { projects, people } = useStore();
  const { programs, workstreams, milestones, workItems } = useProgramStore();
  const { metrics } = useMetricStore();
  const { meetings } = useRhythmStore();

  return useMemo(() => {
    return {
      project: projects.map((p) => ({ id: p.id, label: p.name })),
      program: programs.map((p) => ({ id: p.id, label: p.name })),
      workstream: workstreams.map((w) => ({ id: w.id, label: w.name })),
      person: people.map((p) => ({ id: p.id, label: p.name })),
      metric: metrics.map((m) => ({ id: m.id, label: m.name })),
      meeting: meetings.map((m) => ({ id: m.id, label: `${m.type.toUpperCase()} · ${m.scheduledDate}` })),
      milestone: milestones.map((m) => ({ id: m.id, label: m.name })),
      work_item: workItems.map((w) => ({ id: w.id, label: w.title })),
    };
  }, [projects, programs, workstreams, people, metrics, meetings, milestones, workItems]);
}

export function getNoteTargetDisplayLabel(
  note: Pick<Note, 'targetType' | 'targetId'>,
  options: Record<NoteTargetType, NoteTargetOption[]>,
): string {
  if (!note.targetType || !note.targetId) return 'Orphan';
  const option = options[note.targetType].find((o) => o.id === note.targetId);
  return option?.label || 'Unknown target';
}
