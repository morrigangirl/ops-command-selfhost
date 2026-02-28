import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormLabel } from '@/components/FormLabel';
import { useProgramStore } from '@/lib/program-store';
import { useState, useEffect } from 'react';
import { Workstream } from '@/lib/types';

interface WorkstreamFormProps {
  open: boolean;
  onClose: () => void;
  programId: string;
  workstream?: Workstream;
}

export function WorkstreamForm({ open, onClose, programId, workstream }: WorkstreamFormProps) {
  const { addWorkstream, updateWorkstream, getWorkstreamsForProgram } = useProgramStore();
  const [form, setForm] = useState({ name: '', description: '' });

  useEffect(() => {
    if (workstream) {
      setForm({ name: workstream.name, description: workstream.description });
    } else {
      setForm({ name: '', description: '' });
    }
  }, [workstream, open]);

  const handleSubmit = async () => {
    if (!form.name) return;
    if (workstream) {
      await updateWorkstream({ ...workstream, ...form });
    } else {
      const existing = getWorkstreamsForProgram(programId);
      await addWorkstream({ programId, ...form, sortOrder: existing.length, externalRef: null, leadId: null });
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono tracking-wider text-sm">
            {workstream ? 'EDIT WORKSTREAM' : 'NEW WORKSTREAM'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <FormLabel className="text-xs font-mono text-muted-foreground" tooltip="Name of this workstream within the program">WORKSTREAM NAME</FormLabel>
            <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Detection Engineering" />
          </div>
          <div>
            <FormLabel className="text-xs font-mono text-muted-foreground" tooltip="What this workstream covers">DESCRIPTION</FormLabel>
            <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Workstream description" rows={2} />
          </div>
          <Button onClick={handleSubmit} className="w-full font-mono tracking-wider">
            {workstream ? 'UPDATE' : 'ADD WORKSTREAM'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
