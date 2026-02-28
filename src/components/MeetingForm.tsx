import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FormLabel } from '@/components/FormLabel';
import { useState, useEffect } from 'react';
import { MeetingType, MEETING_TYPES, MEETING_TYPE_LABELS } from '@/lib/types';
import { useRhythmStore } from '@/lib/rhythm-store';
import { toast } from '@/hooks/use-toast';
import { Sparkles, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface MeetingFormProps {
  open: boolean;
  onClose: () => void;
  personId: string;
  defaultType?: MeetingType;
}

export function MeetingForm({ open, onClose, personId, defaultType }: MeetingFormProps) {
  const { addMeeting, generateAgenda } = useRhythmStore();
  const [type, setType] = useState<MeetingType>(defaultType || '1on1');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [agenda, setAgenda] = useState('');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setType(defaultType || '1on1');
      setDate(format(new Date(), 'yyyy-MM-dd'));
      setAgenda('');
    }
  }, [open, defaultType]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const result = await generateAgenda(personId, type);
      setAgenda(result);
      toast({ title: 'Agenda generated' });
    } catch {
      toast({ title: 'Failed to generate agenda', variant: 'destructive' });
    }
    setGenerating(false);
  };

  const handleSubmit = async () => {
    if (!date) return;
    setSaving(true);
    await addMeeting({
      personId, type, scheduledDate: date, status: 'scheduled',
      agenda, notes: '', completedAt: null,
    });
    setSaving(false);
    toast({ title: 'Meeting scheduled' });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono tracking-wider text-sm">SCHEDULE MEETING</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <FormLabel className="text-xs font-mono text-muted-foreground" tooltip="Kind of meeting: 1:1, strategy deep-dive, or check-in">TYPE</FormLabel>
            <Select value={type} onValueChange={v => setType(v as MeetingType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MEETING_TYPES.map(t => (
                  <SelectItem key={t} value={t}>{MEETING_TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <FormLabel className="text-xs font-mono text-muted-foreground" tooltip="Scheduled date for this meeting">DATE</FormLabel>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <FormLabel className="text-xs font-mono text-muted-foreground" tooltip="Topics to cover; can be AI-generated from past context">AGENDA</FormLabel>
              <Button variant="ghost" size="sm" onClick={handleGenerate} disabled={generating} className="h-6 text-[10px] gap-1">
                {generating ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                {generating ? 'Generating...' : 'AI Generate'}
              </Button>
            </div>
            <Textarea value={agenda} onChange={e => setAgenda(e.target.value)} rows={8} placeholder="Meeting agenda (markdown)" className="text-xs font-mono" />
          </div>
          <Button onClick={handleSubmit} disabled={saving} className="w-full font-mono tracking-wider">
            {saving ? 'SCHEDULING...' : 'SCHEDULE MEETING'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
