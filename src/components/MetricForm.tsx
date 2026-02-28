import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMetricStore } from '@/lib/metric-store';
import { useStore } from '@/lib/store';
import { Metric, METRIC_CATEGORIES, METRIC_UNITS, METRIC_CONFIDENCE, METRIC_STATUS } from '@/lib/types';
import { FormLabel } from '@/components/FormLabel';

interface Props {
  open: boolean;
  onClose: () => void;
  metric?: Metric;
}

export function MetricForm({ open, onClose, metric }: Props) {
  const { addMetric, updateMetric } = useMetricStore();
  const { people, projects } = useStore();
  const [name, setName] = useState(metric?.name || '');
  const [category, setCategory] = useState(metric?.category || 'other');
  const [definition, setDefinition] = useState(metric?.definition || '');
  const [unit, setUnit] = useState(metric?.unit || 'count');
  const [currentValue, setCurrentValue] = useState(metric?.currentValue?.toString() || '');
  const [sourceNote, setSourceNote] = useState(metric?.sourceNote || '');
  const [confidence, setConfidence] = useState(metric?.confidence || 'low');
  const [confidenceNote, setConfidenceNote] = useState(metric?.confidenceNote || '');
  const [ownerId, setOwnerId] = useState(metric?.ownerId || '');
  const [relatedProjectId, setRelatedProjectId] = useState(metric?.relatedProjectId || '');
  const [status, setStatus] = useState(metric?.status || 'unknown');

  const handleSubmit = async () => {
    if (!name.trim()) return;
    const payload = {
      name: name.trim(), category, definition, unit,
      currentValue: currentValue ? Number(currentValue) : null,
      sourceNote: sourceNote || null, confidence: confidence as Metric['confidence'],
      confidenceNote: confidenceNote || null,
      ownerId: ownerId || null, relatedProjectId: relatedProjectId || null,
      status: status as Metric['status'],
      externalRef: metric?.externalRef ?? null,
    };
    if (metric) {
      await updateMetric({ ...metric, ...payload });
    } else {
      await addMetric(payload);
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm">{metric ? 'EDIT METRIC' : 'NEW METRIC'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <FormLabel className="text-xs font-mono" tooltip="Descriptive name for this metric">NAME</FormLabel>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Mean Time to Respond" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FormLabel className="text-xs font-mono" tooltip="Classification grouping for this metric">CATEGORY</FormLabel>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {METRIC_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <FormLabel className="text-xs font-mono" tooltip="Unit of measurement (count, percentage, currency, etc.)">UNIT</FormLabel>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {METRIC_UNITS.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <FormLabel className="text-xs font-mono" tooltip="What this metric measures and how it is calculated">DEFINITION</FormLabel>
            <Textarea value={definition} onChange={e => setDefinition(e.target.value)} rows={3} placeholder="What this metric means, how it's calculated..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FormLabel className="text-xs font-mono" tooltip="Manual override; leave blank to use latest data entry">CURRENT VALUE (override)</FormLabel>
              <Input type="number" value={currentValue} onChange={e => setCurrentValue(e.target.value)} placeholder="Leave blank to use latest entry" />
            </div>
            <div>
              <FormLabel className="text-xs font-mono" tooltip="Whether this metric is on track, at risk, or off track">STATUS</FormLabel>
              <Select value={status} onValueChange={v => setStatus(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {METRIC_STATUS.map(s => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FormLabel className="text-xs font-mono" tooltip="How reliable the current data is">CONFIDENCE</FormLabel>
              <Select value={confidence} onValueChange={v => setConfidence(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {METRIC_CONFIDENCE.map(c => <SelectItem key={c} value={c}>{c.toUpperCase()}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <FormLabel className="text-xs font-mono" tooltip="Person responsible for tracking this metric">OWNER</FormLabel>
              <Select value={ownerId} onValueChange={setOwnerId}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {people.filter(p => p.active).map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <FormLabel className="text-xs font-mono" tooltip="Explanation for the chosen confidence level">CONFIDENCE NOTE</FormLabel>
            <Input value={confidenceNote} onChange={e => setConfidenceNote(e.target.value)} placeholder="Why this confidence level?" />
          </div>
          <div>
            <FormLabel className="text-xs font-mono" tooltip="Where this data comes from">SOURCE NOTE</FormLabel>
            <Textarea value={sourceNote} onChange={e => setSourceNote(e.target.value)} rows={2} placeholder="Where this number comes from..." />
          </div>
          <div>
            <FormLabel className="text-xs font-mono" tooltip="The initiative this metric is tied to">RELATED PROJECT</FormLabel>
            <Select value={relatedProjectId} onValueChange={setRelatedProjectId}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!name.trim()}>{metric ? 'Save' : 'Create'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
