import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useStore } from '@/lib/store';
import { useState } from 'react';
import { Person } from '@/lib/types';
import { AlertTriangle, User, Trash2 } from 'lucide-react';

interface RemovePersonDialogProps {
  open: boolean;
  onClose: () => void;
  person: Person;
}

type ReportStrategy = 'rollup' | 'unassign' | 'reassign';

export function RemovePersonDialog({ open, onClose, person }: RemovePersonDialogProps) {
  const { people, updatePerson, deletePerson } = useStore();
  const [strategy, setStrategy] = useState<ReportStrategy>('rollup');
  const [reassignToId, setReassignToId] = useState<string>('');
  const [permanentDelete, setPermanentDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const directReports = people.filter(p => p.managerId === person.id && p.active);
  const hasReports = directReports.length > 0;

  const availableManagers = people.filter(
    p => p.active && p.id !== person.id && !directReports.some(r => r.id === p.id)
  );

  const handleClose = () => {
    setConfirmingDelete(false);
    onClose();
  };

  const handleRemove = async () => {
    if (permanentDelete && !confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setSaving(true);
    try {
      // Handle direct reports based on strategy
      if (hasReports) {
        for (const report of directReports) {
          let newManagerId: string | null = null;
          if (strategy === 'rollup') {
            newManagerId = person.managerId;
          } else if (strategy === 'reassign') {
            newManagerId = reassignToId || null;
          }
          await updatePerson({ ...report, managerId: newManagerId });
        }
      }

      if (permanentDelete) {
        await deletePerson(person.id);
      } else {
        await updatePerson({ ...person, active: false });
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const canSubmit = !hasReports || strategy !== 'reassign' || reassignToId;

  return (
    <Dialog open={open} onOpenChange={() => handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono tracking-wider text-sm flex items-center gap-2">
            <AlertTriangle size={16} className="text-destructive" />
            REMOVE PERSON
          </DialogTitle>
          <DialogDescription className="text-xs">
            Deactivate <strong>{person.name}</strong> and handle their direct reports.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {hasReports ? (
            <>
              <div className="border border-border rounded-lg p-3 bg-muted/30">
                <p className="text-[10px] font-mono text-muted-foreground tracking-wider mb-2">
                  DIRECT REPORTS ({directReports.length})
                </p>
                <div className="space-y-1">
                  {directReports.map(r => (
                    <div key={r.id} className="flex items-center gap-2 text-sm">
                      <User size={12} className="text-muted-foreground" />
                      <span>{r.name}</span>
                      <span className="text-xs text-muted-foreground">— {r.role}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-mono text-muted-foreground mb-3">
                  WHAT SHOULD HAPPEN TO THEIR REPORTS?
                </p>
                <RadioGroup value={strategy} onValueChange={v => setStrategy(v as ReportStrategy)} className="space-y-3">
                  <div className="flex items-start gap-3">
                    <RadioGroupItem value="rollup" id="rollup" className="mt-0.5" />
                    <Label htmlFor="rollup" className="text-sm cursor-pointer">
                      <span className="font-medium">Roll up to {person.managerId ? people.find(p => p.id === person.managerId)?.name || 'their manager' : 'top level'}</span>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {person.managerId
                          ? `Reports will now report to ${people.find(p => p.id === person.managerId)?.name}`
                          : 'Reports will become top-level (no manager)'}
                      </p>
                    </Label>
                  </div>

                  <div className="flex items-start gap-3">
                    <RadioGroupItem value="reassign" id="reassign" className="mt-0.5" />
                    <Label htmlFor="reassign" className="text-sm cursor-pointer flex-1">
                      <span className="font-medium">Reassign to another person</span>
                      <p className="text-xs text-muted-foreground mt-0.5 mb-2">Choose who will take over these reports</p>
                      {strategy === 'reassign' && (
                        <Select value={reassignToId} onValueChange={setReassignToId}>
                          <SelectTrigger className="text-xs">
                            <SelectValue placeholder="Select a person…" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableManagers.map(p => (
                              <SelectItem key={p.id} value={p.id}>{p.name} — {p.role}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </Label>
                  </div>

                  <div className="flex items-start gap-3">
                    <RadioGroupItem value="unassign" id="unassign" className="mt-0.5" />
                    <Label htmlFor="unassign" className="text-sm cursor-pointer">
                      <span className="font-medium">Leave unassigned</span>
                      <p className="text-xs text-muted-foreground mt-0.5">Reports will have no manager until reassigned later</p>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {person.name} has no direct reports. They will be deactivated.
            </p>
          )}

          <div className="flex items-start gap-3 border border-destructive/20 rounded-lg p-3 bg-destructive/5">
            <Checkbox
              id="permanent-delete"
              checked={permanentDelete}
              onCheckedChange={v => setPermanentDelete(v === true)}
              className="mt-0.5"
            />
            <Label htmlFor="permanent-delete" className="text-sm cursor-pointer">
              <span className="font-medium flex items-center gap-1.5">
                <Trash2 size={12} className="text-destructive" />
                Permanently delete from database
              </span>
              <p className="text-xs text-muted-foreground mt-0.5">
                This person and all their data will be removed forever. This cannot be undone.
              </p>
            </Label>
          </div>

          {confirmingDelete && (
            <div className="border border-destructive rounded-lg p-3 bg-destructive/10 space-y-2">
              <p className="text-xs font-medium text-destructive flex items-center gap-1.5">
                <AlertTriangle size={12} />
                Are you sure? This will permanently delete <strong>{person.name}</strong> and all their data. This cannot be undone.
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={confirmingDelete ? () => setConfirmingDelete(false) : handleClose} className="flex-1 font-mono text-xs">
              {confirmingDelete ? 'GO BACK' : 'CANCEL'}
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemove}
              disabled={!canSubmit || saving}
              className="flex-1 font-mono text-xs"
            >
              {saving
                ? (permanentDelete ? 'DELETING…' : 'REMOVING…')
                : confirmingDelete
                  ? 'YES, DELETE FOREVER'
                  : (permanentDelete ? 'DELETE FOREVER' : 'DEACTIVATE')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
