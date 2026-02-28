import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useStore, wouldCreateCycle } from '@/lib/store';
import { useState, useEffect } from 'react';
import { Person, CADENCE_PRESETS } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { FormLabel } from '@/components/FormLabel';

interface PersonFormProps {
  open: boolean;
  onClose: () => void;
  person?: Person;
}

const defaultForm = {
  name: '',
  role: '',
  active: true,
  managerId: null as string | null,
  last1on1: null as string | null,
  lastStrategicDeepDive: null as string | null,
  lastHumanCheckin: null as string | null,
  default1on1CadenceDays: 7,
  defaultStrategyCadenceDays: 30,
  defaultCheckinCadenceDays: 14,
};

export function PersonForm({ open, onClose, person }: PersonFormProps) {
  const { people, addPerson, updatePerson } = useStore();
  const [form, setForm] = useState(defaultForm);

  useEffect(() => {
    if (person) {
      setForm({
        name: person.name,
        role: person.role,
        active: person.active,
        managerId: person.managerId,
        last1on1: person.last1on1,
        lastStrategicDeepDive: person.lastStrategicDeepDive,
        lastHumanCheckin: person.lastHumanCheckin,
        default1on1CadenceDays: person.default1on1CadenceDays,
        defaultStrategyCadenceDays: person.defaultStrategyCadenceDays,
        defaultCheckinCadenceDays: person.defaultCheckinCadenceDays,
      });
    } else {
      setForm(defaultForm);
    }
  }, [person, open]);

  const handleSubmit = () => {
    if (!form.name) return;

    if (person && form.managerId && wouldCreateCycle(person.id, form.managerId, people)) {
      toast({
        title: 'Circular manager chain detected',
        description: 'This assignment would create a circular reporting chain.',
        variant: 'destructive',
      });
      return;
    }

    if (person) {
      updatePerson({ ...person, ...form });
    } else {
      addPerson(form);
    }
    onClose();
  };

  const availableManagers = people.filter(p => p.active && p.id !== person?.id);

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-mono tracking-wider text-sm">
            {person ? 'EDIT PERSON' : 'ADD PERSON'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <FormLabel className="text-xs font-mono text-muted-foreground" tooltip="Full name of the team member">NAME</FormLabel>
            <Input value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} placeholder="Full name" />
          </div>
          <div>
            <FormLabel className="text-xs font-mono text-muted-foreground" tooltip="Job title or team assignment">ROLE / TEAM</FormLabel>
            <Input value={form.role} onChange={e => setForm(prev => ({ ...prev, role: e.target.value }))} placeholder="e.g. Manager, SOC" />
          </div>
          <div>
            <FormLabel className="text-xs font-mono text-muted-foreground" tooltip="Direct reporting manager in the org hierarchy">MANAGER</FormLabel>
            <Select
              value={form.managerId || '__none__'}
              onValueChange={v => setForm(prev => ({ ...prev, managerId: v === '__none__' ? null : v }))}
            >
              <SelectTrigger><SelectValue placeholder="None (top level)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None (top level)</SelectItem>
                {availableManagers.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Default Cadences */}
          <div className="border-t border-border pt-3">
            <p className="text-[10px] font-mono text-muted-foreground tracking-wider mb-3">DEFAULT CADENCES</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <FormLabel className="text-[10px] font-mono text-muted-foreground" tooltip="How often you hold one-on-one meetings">1:1</FormLabel>
                <Select
                  value={String(form.default1on1CadenceDays)}
                  onValueChange={v => setForm(prev => ({ ...prev, default1on1CadenceDays: Number(v) }))}
                >
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CADENCE_PRESETS['1on1'].map(c => (
                      <SelectItem key={c.days} value={String(c.days)}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <FormLabel className="text-[10px] font-mono text-muted-foreground" tooltip="Frequency of strategic deep-dive sessions">STRATEGY</FormLabel>
                <Select
                  value={String(form.defaultStrategyCadenceDays)}
                  onValueChange={v => setForm(prev => ({ ...prev, defaultStrategyCadenceDays: Number(v) }))}
                >
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CADENCE_PRESETS.strategy.map(c => (
                      <SelectItem key={c.days} value={String(c.days)}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <FormLabel className="text-[10px] font-mono text-muted-foreground" tooltip="Frequency of informal human check-ins">CHECK-IN</FormLabel>
                <Select
                  value={String(form.defaultCheckinCadenceDays)}
                  onValueChange={v => setForm(prev => ({ ...prev, defaultCheckinCadenceDays: Number(v) }))}
                >
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CADENCE_PRESETS.checkin.map(c => (
                      <SelectItem key={c.days} value={String(c.days)}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div>
              <FormLabel className="text-xs font-mono text-muted-foreground" tooltip="Date of the most recent 1:1 meeting">LAST 1:1</FormLabel>
              <Input type="date" value={form.last1on1 || ''} onChange={e => setForm(prev => ({ ...prev, last1on1: e.target.value || null }))} />
            </div>
            <div>
              <FormLabel className="text-xs font-mono text-muted-foreground" tooltip="Date of the last strategy session">LAST STRATEGIC DEEP DIVE</FormLabel>
              <Input type="date" value={form.lastStrategicDeepDive || ''} onChange={e => setForm(prev => ({ ...prev, lastStrategicDeepDive: e.target.value || null }))} />
            </div>
            <div>
              <FormLabel className="text-xs font-mono text-muted-foreground" tooltip="Date of the last informal check-in">LAST HUMAN CHECK-IN</FormLabel>
              <Input type="date" value={form.lastHumanCheckin || ''} onChange={e => setForm(prev => ({ ...prev, lastHumanCheckin: e.target.value || null }))} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={form.active} onCheckedChange={v => setForm(prev => ({ ...prev, active: v }))} />
            <FormLabel className="text-xs font-mono text-muted-foreground" tooltip="Whether this person is currently on the team">ACTIVE</FormLabel>
          </div>
          <Button onClick={handleSubmit} className="w-full font-mono tracking-wider">
            {person ? 'UPDATE PERSON' : 'ADD PERSON'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
