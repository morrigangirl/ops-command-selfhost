import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormLabel } from '@/components/FormLabel';
import { useProgramStore } from '@/lib/program-store';
import { useState, useEffect } from 'react';
import { Program } from '@/lib/types';

interface ProgramFormProps {
  open: boolean;
  onClose: () => void;
  program?: Program;
}

export function ProgramForm({ open, onClose, program }: ProgramFormProps) {
  const { addProgram, updateProgram } = useProgramStore();
  const [form, setForm] = useState({
    name: '', description: '', startDate: '' as string | null,
    targetEndDate: '' as string | null, status: 'active' as Program['status'],
  });

  useEffect(() => {
    if (program) {
      setForm({
        name: program.name, description: program.description,
        startDate: program.startDate || '', targetEndDate: program.targetEndDate || '',
        status: program.status,
      });
    } else {
      setForm({ name: '', description: '', startDate: '', targetEndDate: '', status: 'active' });
    }
  }, [program, open]);

  const handleSubmit = async () => {
    if (!form.name) return;
    const payload = {
      ...form,
      startDate: form.startDate || null,
      targetEndDate: form.targetEndDate || null,
      externalRef: (program?.externalRef || null) as string | null,
    };
    if (program) {
      await updateProgram({ ...program, ...payload });
    } else {
      await addProgram(payload);
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono tracking-wider text-sm">
            {program ? 'EDIT PROGRAM' : 'NEW PROGRAM'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <FormLabel className="text-xs font-mono text-muted-foreground" tooltip="Name of the multi-project program">PROGRAM NAME</FormLabel>
            <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. 3-Year SOC Transformation" />
          </div>
          <div>
            <FormLabel className="text-xs font-mono text-muted-foreground" tooltip="High-level summary of the program's purpose">DESCRIPTION</FormLabel>
            <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Program description" rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FormLabel className="text-xs font-mono text-muted-foreground" tooltip="When the program begins">START DATE</FormLabel>
              <Input type="date" value={form.startDate || ''} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} />
            </div>
            <div>
              <FormLabel className="text-xs font-mono text-muted-foreground" tooltip="Expected completion date for the program">TARGET END</FormLabel>
              <Input type="date" value={form.targetEndDate || ''} onChange={e => setForm(p => ({ ...p, targetEndDate: e.target.value }))} />
            </div>
          </div>
          <div>
            <FormLabel className="text-xs font-mono text-muted-foreground" tooltip="Current program state: active, completed, or on hold">STATUS</FormLabel>
            <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v as Program['status'] }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="on-hold">On Hold</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSubmit} className="w-full font-mono tracking-wider">
            {program ? 'UPDATE PROGRAM' : 'CREATE PROGRAM'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
