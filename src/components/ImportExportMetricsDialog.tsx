import { useState, useRef, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { useMetricStore } from '@/lib/metric-store';
import { useStore } from '@/lib/store';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Download, Upload, FileJson, AlertTriangle, FileDown } from 'lucide-react';
import { METRIC_CATEGORIES, METRIC_UNITS, METRIC_CONFIDENCE, METRIC_STATUS } from '@/lib/types';
import type { Metric, MetricTarget, MetricEntry } from '@/lib/types';

/* ── Schema template (field definitions, not sample values) ── */

const SCHEMA_TEMPLATE = {
  _schemaVersion: 1,
  _description: "Metrics import schema. Replace field definitions below with actual values.",
  _fieldReference: {
    metrics: {
      name: { type: "string", required: true, description: "Metric display name" },
      externalRef: { type: "string | null", required: false, description: "Stable external ID for upsert matching" },
      category: { type: "string", required: true, description: "One of: " + METRIC_CATEGORIES.map(c => c.value).join(', ') },
      definition: { type: "string", required: false, description: "Explains what this metric measures" },
      unit: { type: "string", required: true, description: "One of: " + METRIC_UNITS.map(u => u.value).join(', ') },
      currentValue: { type: "number | null", required: false, description: "Manual override value; null to derive from latest entry" },
      sourceNote: { type: "string | null", required: false, description: "Where the data comes from" },
      confidence: { type: "string", required: true, description: "One of: " + METRIC_CONFIDENCE.join(', ') },
      confidenceNote: { type: "string | null", required: false, description: "Why this confidence level" },
      status: { type: "string", required: true, description: "One of: " + METRIC_STATUS.join(', ') },
      ownerName: { type: "string | null", required: false, description: "Matched to existing people by name" },
      relatedProjectName: { type: "string | null", required: false, description: "Matched to existing projects by name" },
      targets: {
        _isArray: true,
        period: { type: "string", required: true, description: "Target period label, e.g. 2025-Q1, FY2025" },
        targetValue: { type: "number", required: true, description: "Numeric target" },
        targetNote: { type: "string | null", required: false, description: "Context for this target" },
      },
      entries: {
        _isArray: true,
        entryDate: { type: "string (YYYY-MM-DD)", required: true, description: "Date of this data point" },
        value: { type: "number", required: true, description: "Recorded value" },
        note: { type: "string | null", required: false, description: "Note for this entry" },
        sourceNoteOverride: { type: "string | null", required: false, description: "Override source note for this entry" },
        confidenceOverride: { type: "string | null", required: false, description: "Override confidence for this entry" },
      },
    },
  },
  metrics: [],
};

/* ── Validation ── */

const VALID_CATEGORIES = METRIC_CATEGORIES.map(c => c.value);
const VALID_UNITS = METRIC_UNITS.map(u => u.value);
const VALID_CONFIDENCE = [...METRIC_CONFIDENCE];
const VALID_STATUS = [...METRIC_STATUS];

interface ImportMetric {
  name: string;
  externalRef?: string | null;
  category: string;
  definition?: string;
  unit: string;
  currentValue?: number | null;
  sourceNote?: string | null;
  confidence: string;
  confidenceNote?: string | null;
  status: string;
  ownerName?: string | null;
  relatedProjectName?: string | null;
  targets?: { period: string; targetValue: number; targetNote?: string | null }[];
  entries?: { entryDate: string; value: number; note?: string | null; sourceNoteOverride?: string | null; confidenceOverride?: string | null }[];
}

interface ImportData {
  metrics: ImportMetric[];
}

function validate(data: any): { valid: boolean; errors: string[]; parsed?: ImportData } {
  const errors: string[] = [];
  if (!data || !Array.isArray(data.metrics)) {
    errors.push('Root must have a "metrics" array');
    return { valid: false, errors };
  }
  for (let i = 0; i < data.metrics.length; i++) {
    const m = data.metrics[i];
    const p = `metrics[${i}]`;
    if (!m.name) errors.push(`${p}: name is required`);
    if (!m.category || !VALID_CATEGORIES.includes(m.category)) errors.push(`${p}: category must be one of ${VALID_CATEGORIES.join(', ')}`);
    if (!m.unit || !VALID_UNITS.includes(m.unit)) errors.push(`${p}: unit must be one of ${VALID_UNITS.join(', ')}`);
    if (!m.confidence || !VALID_CONFIDENCE.includes(m.confidence)) errors.push(`${p}: confidence must be one of ${VALID_CONFIDENCE.join(', ')}`);
    if (!m.status || !VALID_STATUS.includes(m.status)) errors.push(`${p}: status must be one of ${VALID_STATUS.join(', ')}`);
    if (m.targets && Array.isArray(m.targets)) {
      for (let j = 0; j < m.targets.length; j++) {
        const t = m.targets[j];
        if (!t.period) errors.push(`${p}.targets[${j}]: period is required`);
        if (t.targetValue == null || isNaN(Number(t.targetValue))) errors.push(`${p}.targets[${j}]: targetValue must be a number`);
      }
    }
    if (m.entries && Array.isArray(m.entries)) {
      for (let j = 0; j < m.entries.length; j++) {
        const e = m.entries[j];
        if (!e.entryDate) errors.push(`${p}.entries[${j}]: entryDate is required`);
        if (e.value == null || isNaN(Number(e.value))) errors.push(`${p}.entries[${j}]: value must be a number`);
      }
    }
  }
  return errors.length ? { valid: false, errors } : { valid: true, errors: [], parsed: data as ImportData };
}

function matchByName(name: string | undefined | null, list: { id: string; name: string }[]): string | null {
  if (!name) return null;
  const lower = name.toLowerCase().trim();
  return list.find(x => x.name.toLowerCase().trim() === lower)?.id ?? null;
}

/* ── Component ── */

interface Props { open: boolean; onClose: () => void; }

export function ImportExportMetricsDialog({ open, onClose }: Props) {
  const { user } = useAuth();
  const { metrics, metricTargets, metricEntries } = useMetricStore();
  const { people, projects } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const [importData, setImportData] = useState<ImportData | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [tab, setTab] = useState<'export' | 'import'>('export');

  /* ── Export ── */

  const handleExport = () => {
    const payload = {
      _schemaVersion: 1,
      _exportedAt: new Date().toISOString(),
      metrics: metrics.map(m => {
        const owner = m.ownerId ? people.find(p => p.id === m.ownerId) : null;
        const project = m.relatedProjectId ? projects.find(p => p.id === m.relatedProjectId) : null;
        const targets = metricTargets.filter(t => t.metricId === m.id).map(t => ({
          period: t.period, targetValue: t.targetValue, targetNote: t.targetNote,
        }));
        const entries = metricEntries.filter(e => e.metricId === m.id)
          .sort((a, b) => a.entryDate.localeCompare(b.entryDate))
          .map(e => ({
            entryDate: e.entryDate, value: e.value, note: e.note,
            sourceNoteOverride: e.sourceNoteOverride, confidenceOverride: e.confidenceOverride,
          }));
        return {
          name: m.name, externalRef: (m as any).externalRef ?? null,
          category: m.category, definition: m.definition, unit: m.unit,
          currentValue: m.currentValue, sourceNote: m.sourceNote, confidence: m.confidence,
          confidenceNote: m.confidenceNote, status: m.status,
          ownerName: owner?.name ?? null, relatedProjectName: project?.name ?? null,
          targets, entries,
        };
      }),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `metrics-export-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: `${metrics.length} metrics exported` });
  };

  /* ── Schema template download ── */

  const handleDownloadSchema = () => {
    const blob = new Blob([JSON.stringify(SCHEMA_TEMPLATE, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'metrics-schema-template.json'; a.click();
    URL.revokeObjectURL(url);
  };

  /* ── Import ── */

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const raw = JSON.parse(ev.target?.result as string);
        const result = validate(raw);
        if (!result.valid) { setErrors(result.errors); setImportData(null); return; }
        setErrors([]);
        setImportData(result.parsed!);
      } catch { setErrors(['Invalid JSON file']); setImportData(null); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const previewStats = useMemo(() => {
    if (!importData) return null;
    const unmatchedOwners: string[] = [];
    const unmatchedProjects: string[] = [];
    let totalTargets = 0, totalEntries = 0, updateCount = 0, createCount = 0;
    for (const m of importData.metrics) {
      if (m.ownerName && !matchByName(m.ownerName, people)) unmatchedOwners.push(m.ownerName);
      if (m.relatedProjectName && !matchByName(m.relatedProjectName, projects)) unmatchedProjects.push(m.relatedProjectName);
      totalTargets += m.targets?.length ?? 0;
      totalEntries += m.entries?.length ?? 0;
      if (m.externalRef && metrics.some(em => em.externalRef === m.externalRef)) {
        updateCount++;
      } else {
        createCount++;
      }
    }
    return {
      metricCount: importData.metrics.length,
      totalTargets, totalEntries, updateCount, createCount,
      unmatchedOwners: [...new Set(unmatchedOwners)],
      unmatchedProjects: [...new Set(unmatchedProjects)],
    };
  }, [importData, people, projects, metrics]);

  const handleImport = async () => {
    if (!importData || !user) return;
    setImporting(true);
    try {
      for (const m of importData.metrics) {
        const ownerId = matchByName(m.ownerName, people);
        const relatedProjectId = matchByName(m.relatedProjectName, projects);

        const payload = {
          user_id: user.id, name: m.name, category: m.category,
          definition: m.definition ?? '', unit: m.unit,
          current_value: m.currentValue ?? null, source_note: m.sourceNote ?? null,
          confidence: m.confidence, confidence_note: m.confidenceNote ?? null,
          status: m.status, owner_id: ownerId, related_project_id: relatedProjectId,
          external_ref: m.externalRef ?? null,
        };

        let metricId: string;
        const existingMetric = m.externalRef
          ? metrics.find(em => em.externalRef === m.externalRef)
          : null;

        if (existingMetric) {
          const { error: uErr } = await (supabase.from('metrics' as any) as any)
            .update(payload).eq('id', existingMetric.id);
          if (uErr) throw uErr;
          metricId = existingMetric.id;

          // Remove old targets/entries before re-inserting
          await (supabase.from('metric_targets' as any) as any).delete().eq('metric_id', metricId);
          await (supabase.from('metric_entries' as any) as any).delete().eq('metric_id', metricId);
        } else {
          const { data: metricRow, error: mErr } = await (supabase.from('metrics' as any) as any)
            .insert(payload).select().single();
          if (mErr) throw mErr;
          metricId = metricRow.id;
        }

        if (m.targets?.length) {
          const rows = m.targets.map(t => ({
            user_id: user.id, metric_id: metricId,
            period: t.period, target_value: t.targetValue, target_note: t.targetNote ?? null,
          }));
          const { error: tErr } = await (supabase.from('metric_targets' as any) as any).insert(rows);
          if (tErr) throw tErr;
        }

        if (m.entries?.length) {
          const rows = m.entries.map(e => ({
            user_id: user.id, metric_id: metricId,
            entry_date: e.entryDate, value: e.value, note: e.note ?? null,
            source_note_override: e.sourceNoteOverride ?? null,
            confidence_override: e.confidenceOverride ?? null,
          }));
          const { error: eErr } = await (supabase.from('metric_entries' as any) as any).insert(rows);
          if (eErr) throw eErr;
        }
      }
      const created = previewStats?.createCount ?? 0;
      const updated = previewStats?.updateCount ?? 0;
      toast({ title: 'Import complete', description: `${created} created, ${updated} updated` });
      handleClose();
      window.location.reload();
    } catch (err: any) {
      toast({ title: 'Import failed', description: err.message, variant: 'destructive' });
    } finally { setImporting(false); }
  };

  const handleClose = () => { setImportData(null); setErrors([]); onClose(); };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-mono tracking-wider text-sm">METRICS IMPORT / EXPORT</DialogTitle>
          <DialogDescription className="text-xs">Export, import, or download the schema template.</DialogDescription>
        </DialogHeader>

        {/* Tab toggle */}
        <div className="flex gap-1 border border-border rounded-md p-0.5 bg-muted/30">
          <button
            onClick={() => setTab('export')}
            className={`flex-1 text-xs font-mono py-1.5 rounded transition-colors ${tab === 'export' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >EXPORT</button>
          <button
            onClick={() => setTab('import')}
            className={`flex-1 text-xs font-mono py-1.5 rounded transition-colors ${tab === 'import' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >IMPORT</button>
        </div>

        {tab === 'export' ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Export all {metrics.length} metrics with their targets and time-series entries as JSON.
            </p>
            <Button onClick={handleExport} disabled={metrics.length === 0} className="w-full font-mono text-xs">
              <Download size={14} className="mr-2" /> EXPORT {metrics.length} METRICS
            </Button>
            <div className="border-t border-border pt-3">
              <p className="text-xs text-muted-foreground mb-2">
                Download the schema template with field definitions and types (no sample values).
              </p>
              <Button variant="outline" onClick={handleDownloadSchema} className="w-full font-mono text-xs">
                <FileDown size={14} className="mr-2" /> DOWNLOAD SCHEMA TEMPLATE
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Import metrics from a JSON file. Metrics with a matching externalRef will be updated; others will be created.
            </p>
            <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleFileChange} />
            <Button variant="outline" onClick={() => fileRef.current?.click()} className="w-full font-mono text-xs">
              <Upload size={14} className="mr-2" /> SELECT JSON FILE
            </Button>

            {errors.length > 0 && (
              <div className="border border-destructive/40 rounded-md p-3 bg-destructive/5 space-y-1">
                <div className="flex items-center gap-1 text-destructive text-xs font-mono font-bold">
                  <AlertTriangle size={12} /> VALIDATION ERRORS
                </div>
                <ul className="text-[11px] text-destructive list-disc list-inside space-y-0.5 max-h-32 overflow-y-auto">
                  {errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}

            {previewStats && (
              <div className="border border-border rounded-md p-3 space-y-2">
                <h4 className="font-mono text-xs font-bold text-foreground">IMPORT PREVIEW</h4>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div><div className="text-lg font-mono font-bold text-primary">{previewStats.createCount}</div><div className="text-[10px] text-muted-foreground">Create</div></div>
                  <div><div className="text-lg font-mono font-bold text-accent-foreground">{previewStats.updateCount}</div><div className="text-[10px] text-muted-foreground">Update</div></div>
                  <div><div className="text-lg font-mono font-bold">{previewStats.totalTargets}</div><div className="text-[10px] text-muted-foreground">Targets</div></div>
                  <div><div className="text-lg font-mono font-bold">{previewStats.totalEntries}</div><div className="text-[10px] text-muted-foreground">Entries</div></div>
                </div>
                {(previewStats.unmatchedOwners.length > 0 || previewStats.unmatchedProjects.length > 0) && (
                  <div className="text-[11px] text-muted-foreground space-y-1">
                    {previewStats.unmatchedOwners.length > 0 && (
                      <p className="text-destructive"><AlertTriangle size={10} className="inline mr-1" />Unmatched owners: {previewStats.unmatchedOwners.join(', ')}</p>
                    )}
                    {previewStats.unmatchedProjects.length > 0 && (
                      <p className="text-destructive"><AlertTriangle size={10} className="inline mr-1" />Unmatched projects: {previewStats.unmatchedProjects.join(', ')}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {tab === 'import' && importData && (
            <Button onClick={handleImport} disabled={importing} className="font-mono text-xs">
              {importing ? <><FileJson size={14} className="mr-2 animate-spin" /> IMPORTING…</> : <><FileJson size={14} className="mr-2" /> IMPORT {importData.metrics.length} METRICS</>}
            </Button>
          )}
          <Button variant="outline" onClick={handleClose} className="font-mono text-xs">CLOSE</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
