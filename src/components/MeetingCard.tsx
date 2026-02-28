import { useState } from 'react';
import { Meeting, MEETING_TYPE_LABELS } from '@/lib/types';
import { useRhythmStore } from '@/lib/rhythm-store';
import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, CheckCircle2, Plus, Trash2, XCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { ActionItemRow } from './ActionItemRow';
import { toast } from '@/hooks/use-toast';

interface MeetingCardProps {
  meeting: Meeting;
}

export function MeetingCard({ meeting }: MeetingCardProps) {
  const { updateMeeting, completeMeeting, getActionItemsForMeeting, getDecisionsForMeeting, addActionItem, addDecision } = useRhythmStore();
  const [expanded, setExpanded] = useState(meeting.status === 'scheduled');
  const [notes, setNotes] = useState(meeting.notes);
  const [agenda, setAgenda] = useState(meeting.agenda);
  const [newActionTitle, setNewActionTitle] = useState('');
  const [newDecision, setNewDecision] = useState('');
  const [notesEdited, setNotesEdited] = useState(false);
  const [agendaEdited, setAgendaEdited] = useState(false);

  const items = getActionItemsForMeeting(meeting.id);
  const decisionsList = getDecisionsForMeeting(meeting.id);

  const statusColor = {
    scheduled: 'bg-primary/15 text-primary',
    completed: 'bg-success/15 text-success',
    cancelled: 'bg-muted text-muted-foreground',
  }[meeting.status];

  const handleSaveNotes = () => {
    updateMeeting({ ...meeting, notes, agenda });
    setNotesEdited(false);
    setAgendaEdited(false);
    toast({ title: 'Meeting updated' });
  };

  const handleComplete = async () => {
    if (notesEdited || agendaEdited) {
      await updateMeeting({ ...meeting, notes, agenda });
    }
    await completeMeeting(meeting.id);
    toast({ title: 'Meeting completed — cadence date updated' });
  };

  const handleAddAction = () => {
    if (!newActionTitle.trim()) return;
    addActionItem({ meetingId: meeting.id, title: newActionTitle.trim(), ownerId: null, dueDate: null, projectId: null, status: 'open' });
    setNewActionTitle('');
  };

  const handleAddDecision = () => {
    if (!newDecision.trim()) return;
    addDecision({ meetingId: meeting.id, summary: newDecision.trim() });
    setNewDecision('');
  };

  return (
    <div className={cn('border border-border rounded-lg overflow-hidden', meeting.status === 'scheduled' && 'border-l-2 border-l-primary')}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/30 transition-colors"
      >
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <Badge variant="outline" className={cn('text-[10px] font-mono', statusColor)}>
          {MEETING_TYPE_LABELS[meeting.type]}
        </Badge>
        <span className="text-xs font-mono text-muted-foreground">
          {format(parseISO(meeting.scheduledDate), 'MMM dd, yyyy')}
        </span>
        <Badge variant="outline" className={cn('text-[9px] ml-auto', statusColor)}>
          {meeting.status.toUpperCase()}
        </Badge>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-border">
          {/* Agenda */}
          <div className="mt-3">
            <p className="text-[10px] font-mono text-muted-foreground tracking-wider mb-1">AGENDA</p>
            <Textarea
              value={agenda}
              onChange={e => { setAgenda(e.target.value); setAgendaEdited(true); }}
              rows={4}
              className="text-xs font-mono"
              placeholder="Agenda..."
              readOnly={meeting.status === 'completed'}
            />
          </div>

          {/* Notes */}
          <div>
            <p className="text-[10px] font-mono text-muted-foreground tracking-wider mb-1">NOTES</p>
            <Textarea
              value={notes}
              onChange={e => { setNotes(e.target.value); setNotesEdited(true); }}
              rows={4}
              className="text-xs font-mono"
              placeholder="Meeting notes..."
              readOnly={meeting.status === 'completed'}
            />
          </div>

          {/* Decisions */}
          <div>
            <p className="text-[10px] font-mono text-muted-foreground tracking-wider mb-1">DECISIONS</p>
            {decisionsList.map(d => (
              <div key={d.id} className="flex items-center gap-2 text-xs py-1 border-b border-border/50">
                <CheckCircle2 size={12} className="text-success shrink-0" />
                <span className="flex-1">{d.summary}</span>
              </div>
            ))}
            {meeting.status !== 'completed' && (
              <div className="flex gap-2 mt-2">
                <Input value={newDecision} onChange={e => setNewDecision(e.target.value)} placeholder="Record a decision..." className="text-xs" onKeyDown={e => e.key === 'Enter' && handleAddDecision()} />
                <Button variant="ghost" size="sm" onClick={handleAddDecision} className="h-8 px-2"><Plus size={14} /></Button>
              </div>
            )}
          </div>

          {/* Action Items */}
          <div>
            <p className="text-[10px] font-mono text-muted-foreground tracking-wider mb-1">ACTION ITEMS</p>
            <div className="space-y-1">
              {items.map(item => (
                <ActionItemRow key={item.id} item={item} readOnly={meeting.status === 'completed'} />
              ))}
            </div>
            {meeting.status !== 'completed' && (
              <div className="flex gap-2 mt-2">
                <Input value={newActionTitle} onChange={e => setNewActionTitle(e.target.value)} placeholder="Add action item..." className="text-xs" onKeyDown={e => e.key === 'Enter' && handleAddAction()} />
                <Button variant="ghost" size="sm" onClick={handleAddAction} className="h-8 px-2"><Plus size={14} /></Button>
              </div>
            )}
          </div>

          {/* Actions */}
          {meeting.status === 'scheduled' && (
            <div className="flex gap-2 pt-2 border-t border-border">
              {(notesEdited || agendaEdited) && (
                <Button variant="outline" size="sm" onClick={handleSaveNotes} className="text-xs font-mono">SAVE</Button>
              )}
              <Button size="sm" onClick={handleComplete} className="text-xs font-mono gap-1">
                <CheckCircle2 size={12} /> COMPLETE MEETING
              </Button>
              <Button variant="ghost" size="sm" onClick={() => updateMeeting({ ...meeting, status: 'cancelled' })} className="text-xs font-mono text-muted-foreground gap-1 ml-auto">
                <XCircle size={12} /> CANCEL
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
