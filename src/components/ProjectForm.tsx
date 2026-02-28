import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useStore } from '@/lib/store';
import { useProgramStore } from '@/lib/program-store';
import { useState, useEffect } from 'react';
import { Project, RISK_CADENCE_TEMPLATES } from '@/lib/types';
import { FormLabel } from '@/components/FormLabel';
import { toast } from '@/hooks/use-toast';

interface ProjectFormProps {
  open: boolean;
  onClose: () => void;
  project?: Project;
  defaultWorkstreamId?: string;
}

const defaultForm = {
  name: '',
  problemStatement: '',
  strategicGoal: '',
  successMetric: '',
  ownerId: '',
  status: 'green' as Project['status'],
  risk: 'low' as Project['risk'],
  reviewCadence: 'biweekly' as Project['reviewCadence'],
  targetDate: '',
  lastReviewed: null as string | null,
  workstreamId: null as string | null,
  externalRef: null as string | null,
  riskStatement: '',
  phase: null as string | null,
  tags: [] as string[],
};

export function ProjectForm({ open, onClose, project, defaultWorkstreamId }: ProjectFormProps) {
  const { people, addProject, updateProject } = useStore();
  const { programs, workstreams } = useProgramStore();
  const activePeople = people.filter(p => p.active);
  const [form, setForm] = useState(defaultForm);

  useEffect(() => {
    if (project) {
      setForm({
        name: project.name,
        problemStatement: project.problemStatement,
        strategicGoal: project.strategicGoal,
        successMetric: project.successMetric,
        ownerId: project.ownerId,
        status: project.status,
        risk: project.risk,
        reviewCadence: project.reviewCadence,
        targetDate: project.targetDate,
        lastReviewed: project.lastReviewed,
        workstreamId: project.workstreamId,
        externalRef: project.externalRef,
        riskStatement: project.riskStatement,
        phase: project.phase,
        tags: project.tags,
      });
    } else {
      setForm({ ...defaultForm, workstreamId: defaultWorkstreamId || null });
    }
  }, [project, open]);

  useEffect(() => {
    if (form.risk === 'high' && !project) {
      setForm(prev => ({ ...prev, reviewCadence: 'weekly' }));
    }
  }, [form.risk, project]);

  const handleSubmit = async () => {
    if (!form.name || !form.ownerId || !form.targetDate) return;
    try {
      if (project) {
        await updateProject({ ...project, ...form, refinedBrief: project.refinedBrief });
        toast({ title: 'Project updated' });
      } else {
        await addProject({ ...form, refinedBrief: null });
        toast({ title: 'Project created' });
      }
      onClose();
    } catch (e: any) {
      console.error('Save failed:', e);
      toast({ title: 'Save failed', description: e?.message || 'Could not save project.', variant: 'destructive' });
    }
  };

  const applyTemplate = (riskLevel: string) => {
    const template = RISK_CADENCE_TEMPLATES[riskLevel];
    if (template) {
      setForm(prev => ({
        ...prev,
        risk: riskLevel as Project['risk'],
        reviewCadence: template.reviewCadence,
      }));
    }
  };

  const set = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-mono tracking-wider text-sm">
            {project ? 'EDIT PROJECT' : 'NEW PROJECT'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <FormLabel className="text-xs font-mono text-muted-foreground" tooltip="Short, recognizable name for the initiative">PROJECT NAME *</FormLabel>
            <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Project name" />
          </div>
          <div>
            <FormLabel className="text-xs font-mono text-muted-foreground" tooltip="The specific problem this project addresses">PROBLEM STATEMENT</FormLabel>
            <Textarea value={form.problemStatement} onChange={e => set('problemStatement', e.target.value)} placeholder="What problem does this solve?" rows={2} />
          </div>
          <div>
            <FormLabel className="text-xs font-mono text-muted-foreground" tooltip="Which strategic objective this project supports">STRATEGIC GOAL</FormLabel>
            <Textarea value={form.strategicGoal} onChange={e => set('strategicGoal', e.target.value)} placeholder="Strategic objective" rows={2} />
          </div>
          <div>
            <FormLabel className="text-xs font-mono text-muted-foreground" tooltip="How you will measure if this project succeeded">SUCCESS METRIC</FormLabel>
            <Input value={form.successMetric} onChange={e => set('successMetric', e.target.value)} placeholder="How will you measure success?" />
          </div>
          <div>
            <FormLabel className="text-xs font-mono text-muted-foreground" tooltip="The person accountable for delivery">OWNER *</FormLabel>
            <Select value={form.ownerId} onValueChange={v => set('ownerId', v)}>
              <SelectTrigger><SelectValue placeholder="Select owner" /></SelectTrigger>
              <SelectContent>
                {activePeople.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Cadence Template */}
          <div className="border border-border rounded-lg p-3 bg-muted/30">
            <FormLabel className="text-[10px] font-mono text-muted-foreground tracking-wider" tooltip="Pre-set risk and review frequency based on project risk level">APPLY CADENCE TEMPLATE</FormLabel>
            <Select onValueChange={applyTemplate}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select a template..." /></SelectTrigger>
              <SelectContent>
                {Object.entries(RISK_CADENCE_TEMPLATES).map(([key, tpl]) => (
                  <SelectItem key={key} value={key}>{tpl.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="grid grid-cols-3 gap-3">
            <div>
              <FormLabel className="text-xs font-mono text-muted-foreground" tooltip="Current health: Green (on track), Yellow (at risk), Red (off track)">STATUS</FormLabel>
              <Select value={form.status} onValueChange={v => set('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="green">Green</SelectItem>
                  <SelectItem value="yellow">Yellow</SelectItem>
                  <SelectItem value="red">Red</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <FormLabel className="text-xs font-mono text-muted-foreground" tooltip="Overall risk level affecting review frequency">RISK</FormLabel>
              <Select value={form.risk} onValueChange={v => set('risk', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <FormLabel className="text-xs font-mono text-muted-foreground" tooltip="How often this project should be reviewed">CADENCE</FormLabel>
              <Select value={form.reviewCadence} onValueChange={v => set('reviewCadence', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Biweekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <FormLabel className="text-xs font-mono text-muted-foreground" tooltip="Expected completion date">TARGET DATE *</FormLabel>
            <Input type="date" value={form.targetDate} onChange={e => set('targetDate', e.target.value)} />
          </div>
          <div>
            <FormLabel className="text-xs font-mono text-muted-foreground" tooltip="Link this project to a workstream within a program">WORKSTREAM</FormLabel>
            <Select value={form.workstreamId || '_none'} onValueChange={v => setForm(prev => ({ ...prev, workstreamId: v === '_none' ? null : v }))}>
              <SelectTrigger><SelectValue placeholder="No workstream" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">None</SelectItem>
                {programs.map(prog => {
                  const progWs = workstreams.filter(w => w.programId === prog.id);
                  if (progWs.length === 0) return null;
                  return progWs.map(ws => (
                    <SelectItem key={ws.id} value={ws.id}>
                      {prog.name} → {ws.name}
                    </SelectItem>
                  ));
                })}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSubmit} className="w-full font-mono tracking-wider">
            {project ? 'UPDATE PROJECT' : 'CREATE PROJECT'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
