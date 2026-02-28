import { useState, useRef, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { useProgramStore } from '@/lib/program-store';
import { useStore } from '@/lib/store';
import { supabase } from '@/integrations/supabase/client';
import { Download, Upload, FileJson, AlertTriangle, RefreshCw } from 'lucide-react';

const TEMPLATE = {
  schemaVersion: 1,
  program: {
    name: "My Program",
    externalRef: "PRG-001",
    description: "Program description",
    startDate: "2025-01-01",
    targetEndDate: "2025-12-31",
    status: "active",
  },
  workstreams: [
    {
      name: "Workstream 1",
      externalRef: "WS-001",
      description: "Description",
      leadName: "",
      projects: [
        {
          name: "Project A",
          externalRef: "PRJ-001",
          problemStatement: "What problem does this solve?",
          strategicGoal: "Strategic objective",
          successMetric: "How will you measure success?",
          status: "green",
          risk: "medium",
          riskStatement: "Why this risk level was chosen",
          reviewCadence: "biweekly",
          targetDate: "2025-06-30",
          lastReviewed: null,
          ownerName: "",
          phase: "Y1",
          tags: ["DET", "AI"],
        },
      ],
    },
  ],
};

interface ImportProject {
  name: string;
  externalRef?: string;
  problemStatement?: string;
  strategicGoal?: string;
  successMetric?: string;
  status?: string;
  risk?: string;
  riskStatement?: string;
  reviewCadence?: string;
  targetDate: string;
  lastReviewed?: string | null;
  ownerName?: string;
  ownerId?: string;
  phase?: string;
  tags?: string[];
}

interface ImportWorkstream {
  name: string;
  externalRef?: string;
  description?: string;
  leadName?: string;
  leadId?: string;
  projects?: ImportProject[];
}

interface ImportData {
  schemaVersion?: number;
  program: {
    name: string;
    externalRef?: string;
    description?: string;
    startDate?: string;
    targetEndDate?: string;
    status?: string;
  };
  workstreams: ImportWorkstream[];
}

const VALID_STATUSES = ['green', 'yellow', 'red'];
const VALID_RISKS = ['low', 'medium', 'high'];
const VALID_CADENCES = ['weekly', 'biweekly', 'monthly'];

function validate(data: any): { valid: boolean; errors: string[]; parsed?: ImportData } {
  const errors: string[] = [];
  if (!data || typeof data !== 'object') { errors.push('Invalid JSON structure'); return { valid: false, errors }; }
  if (!data.program?.name) errors.push('program.name is required');
  if (!Array.isArray(data.workstreams)) { errors.push('workstreams must be an array'); return { valid: false, errors }; }
  data.workstreams.forEach((ws: any, i: number) => {
    if (!ws.name) errors.push(`workstreams[${i}].name is required`);
    (ws.projects || []).forEach((p: any, j: number) => {
      if (!p.name) errors.push(`workstreams[${i}].projects[${j}].name is required`);
      if (!p.targetDate) errors.push(`workstreams[${i}].projects[${j}].targetDate is required`);
      if (p.status && !VALID_STATUSES.includes(p.status)) errors.push(`workstreams[${i}].projects[${j}].status must be one of: ${VALID_STATUSES.join(', ')}`);
      if (p.risk && !VALID_RISKS.includes(p.risk)) errors.push(`workstreams[${i}].projects[${j}].risk must be one of: ${VALID_RISKS.join(', ')}`);
      if (p.reviewCadence && !VALID_CADENCES.includes(p.reviewCadence)) errors.push(`workstreams[${i}].projects[${j}].reviewCadence must be one of: ${VALID_CADENCES.join(', ')}`);
      if (p.phase && typeof p.phase !== 'string') errors.push(`workstreams[${i}].projects[${j}].phase must be a string`);
      if (p.tags && (!Array.isArray(p.tags) || p.tags.some((t: any) => typeof t !== 'string'))) errors.push(`workstreams[${i}].projects[${j}].tags must be an array of strings`);
    });
  });
  return { valid: errors.length === 0, errors, parsed: errors.length === 0 ? data as ImportData : undefined };
}

function matchPerson(name: string | undefined, id: string | undefined, people: { id: string; name: string }[]): string | null {
  if (id) {
    const found = people.find(p => p.id === id);
    if (found) return found.id;
  }
  if (name) {
    const lower = name.toLowerCase().trim();
    const found = people.find(p => p.name.toLowerCase().trim() === lower);
    if (found) return found.id;
  }
  return null;
}

export function ImportProgramDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { programs, workstreams: existingWorkstreams } = useProgramStore();
  const { people, projects: existingProjects } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importData, setImportData] = useState<ImportData | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);

  const totalProjects = importData?.workstreams.reduce((s, ws) => s + (ws.projects?.length || 0), 0) || 0;

  // Compute preview stats: unmatched names, update vs create counts
  const previewStats = useMemo(() => {
    if (!importData) return null;
    let unmatchedOwners: string[] = [];
    let unmatchedLeads: string[] = [];
    let programUpdate = false;
    let wsUpdates = 0;
    let wsCreates = 0;
    let projUpdates = 0;
    let projCreates = 0;

    if (importData.program.externalRef) {
      programUpdate = programs.some(p => (p as any).externalRef === importData.program.externalRef);
    }

    for (const ws of importData.workstreams) {
      if (ws.externalRef && existingWorkstreams.some(w => (w as any).externalRef === ws.externalRef)) {
        wsUpdates++;
      } else {
        wsCreates++;
      }
      if (ws.leadName && !matchPerson(ws.leadName, ws.leadId, people)) unmatchedLeads.push(ws.leadName);
      for (const proj of ws.projects || []) {
        if (proj.externalRef && existingProjects.some(p => (p as any).externalRef === proj.externalRef)) {
          projUpdates++;
        } else {
          projCreates++;
        }
        if (proj.ownerName && !matchPerson(proj.ownerName, proj.ownerId, people)) unmatchedOwners.push(proj.ownerName);
      }
    }

    return { programUpdate, wsUpdates, wsCreates, projUpdates, projCreates, unmatchedOwners, unmatchedLeads };
  }, [importData, programs, existingWorkstreams, existingProjects, people]);

  const handleDownloadTemplate = () => {
    const blob = new Blob([JSON.stringify(TEMPLATE, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'program-template.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string);
        const result = validate(json);
        setErrors(result.errors);
        setImportData(result.parsed || null);
      } catch {
        setErrors(['File is not valid JSON']);
        setImportData(null);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!importData) return;
    setImporting(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user?.id;
      if (!userId) throw new Error('Not authenticated');

      // 1. Upsert program
      let programId: string;
      const existingProgram = importData.program.externalRef
        ? programs.find(p => (p as any).externalRef === importData.program.externalRef)
        : null;

      if (existingProgram) {
        await supabase.from('programs').update({
          name: importData.program.name,
          description: importData.program.description || '',
          start_date: importData.program.startDate || null,
          target_end_date: importData.program.targetEndDate || null,
          status: importData.program.status || 'active',
        }).eq('id', existingProgram.id);
        programId = existingProgram.id;
      } else {
        const { data: pgData, error: pgErr } = await supabase.from('programs').insert({
          user_id: userId,
          name: importData.program.name,
          description: importData.program.description || '',
          start_date: importData.program.startDate || null,
          target_end_date: importData.program.targetEndDate || null,
          status: importData.program.status || 'active',
          external_ref: importData.program.externalRef || null,
        }).select().single();
        if (pgErr || !pgData) throw new Error(pgErr?.message || 'Failed to create program');
        programId = pgData.id;
      }

      // 2. Upsert workstreams and projects
      for (let i = 0; i < importData.workstreams.length; i++) {
        const ws = importData.workstreams[i];
        const leadId = matchPerson(ws.leadName, ws.leadId, people);

        let workstreamId: string;
        const existingWs = ws.externalRef
          ? existingWorkstreams.find(w => (w as any).externalRef === ws.externalRef)
          : null;

        if (existingWs) {
          await supabase.from('workstreams').update({
            name: ws.name,
            description: ws.description || '',
            sort_order: i,
            lead_id: leadId,
          }).eq('id', existingWs.id);
          workstreamId = existingWs.id;
        } else {
          const { data: wsData, error: wsErr } = await supabase.from('workstreams').insert({
            user_id: userId,
            program_id: programId,
            name: ws.name,
            description: ws.description || '',
            sort_order: i,
            external_ref: ws.externalRef || null,
            lead_id: leadId,
          }).select().single();
          if (wsErr || !wsData) continue;
          workstreamId = wsData.id;
        }

        for (const proj of ws.projects || []) {
          const ownerId = matchPerson(proj.ownerName, proj.ownerId, people);
          const existingProj = proj.externalRef
            ? existingProjects.find(p => (p as any).externalRef === proj.externalRef)
            : null;

          if (existingProj) {
            await supabase.from('projects').update({
              name: proj.name,
              problem_statement: proj.problemStatement || '',
              strategic_goal: proj.strategicGoal || '',
              success_metric: proj.successMetric || '',
              status: proj.status || 'green',
              risk: proj.risk || 'medium',
              risk_statement: proj.riskStatement || '',
              review_cadence: proj.reviewCadence || 'biweekly',
              target_date: proj.targetDate,
              last_reviewed: proj.lastReviewed || null,
              owner_id: ownerId,
              workstream_id: workstreamId,
              phase: proj.phase || null,
              tags: proj.tags || [],
            }).eq('id', existingProj.id);
          } else {
            await supabase.from('projects').insert({
              user_id: userId,
              name: proj.name,
              problem_statement: proj.problemStatement || '',
              strategic_goal: proj.strategicGoal || '',
              success_metric: proj.successMetric || '',
              status: proj.status || 'green',
              risk: proj.risk || 'medium',
              risk_statement: proj.riskStatement || '',
              review_cadence: proj.reviewCadence || 'biweekly',
              target_date: proj.targetDate,
              last_reviewed: proj.lastReviewed || null,
              owner_id: ownerId,
              workstream_id: workstreamId,
              external_ref: proj.externalRef || null,
              phase: proj.phase || null,
              tags: proj.tags || [],
            });
          }
        }
      }

      toast({ title: 'Program imported', description: `"${importData.program.name}" — ${importData.workstreams.length} workstreams, ${totalProjects} projects.` });
      window.location.reload();
    } catch (err: any) {
      toast({ title: 'Import failed', description: err.message, variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setImportData(null);
    setErrors([]);
    if (fileRef.current) fileRef.current.value = '';
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono tracking-wider text-sm">IMPORT PROGRAM</DialogTitle>
          <DialogDescription>Import a program with workstreams and projects from a JSON file. Use externalRef for idempotent re-imports.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Button variant="outline" size="sm" className="gap-2 font-mono text-xs w-full" onClick={handleDownloadTemplate}>
            <Download size={14} /> DOWNLOAD TEMPLATE
          </Button>

          <div className="border border-dashed border-border rounded-lg p-4 text-center">
            <FileJson size={24} className="mx-auto text-muted-foreground mb-2" />
            <p className="text-xs text-muted-foreground mb-2">Select a .json file to import</p>
            <input ref={fileRef} type="file" accept=".json" onChange={handleFileChange} className="text-xs w-full" />
          </div>

          {errors.length > 0 && (
            <div className="bg-destructive/10 border border-destructive/30 rounded p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-destructive text-xs font-medium">
                <AlertTriangle size={12} /> Validation errors
              </div>
              {errors.map((e, i) => <p key={i} className="text-xs text-destructive/80 pl-4">• {e}</p>)}
            </div>
          )}

          {importData && previewStats && (
            <div className="bg-accent/30 rounded p-3 space-y-2">
              <p className="text-sm font-medium">{importData.program.name}</p>
              <div className="text-xs text-muted-foreground space-y-0.5">
                <p>
                  Program: {previewStats.programUpdate ? <span className="text-amber-600"><RefreshCw size={10} className="inline mr-0.5" />update</span> : 'new'}
                </p>
                <p>
                  Workstreams: {previewStats.wsCreates > 0 && `${previewStats.wsCreates} new`}{previewStats.wsCreates > 0 && previewStats.wsUpdates > 0 && ', '}{previewStats.wsUpdates > 0 && <span className="text-amber-600">{previewStats.wsUpdates} update</span>}
                </p>
                <p>
                  Projects: {previewStats.projCreates > 0 && `${previewStats.projCreates} new`}{previewStats.projCreates > 0 && previewStats.projUpdates > 0 && ', '}{previewStats.projUpdates > 0 && <span className="text-amber-600">{previewStats.projUpdates} update</span>}
                </p>
              </div>
              {(previewStats.unmatchedOwners.length > 0 || previewStats.unmatchedLeads.length > 0) && (
                <div className="text-xs text-amber-600 mt-1">
                  <AlertTriangle size={10} className="inline mr-1" />
                  {previewStats.unmatchedOwners.length + previewStats.unmatchedLeads.length} unmatched name{previewStats.unmatchedOwners.length + previewStats.unmatchedLeads.length !== 1 ? 's' : ''}:
                  {' '}{[...previewStats.unmatchedOwners, ...previewStats.unmatchedLeads].join(', ')}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={handleClose} className="font-mono text-xs">CANCEL</Button>
          <Button size="sm" disabled={!importData || importing} onClick={handleImport} className="gap-2 font-mono text-xs">
            <Upload size={14} /> {importing ? 'IMPORTING…' : 'IMPORT'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
