import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMetricStore } from '@/lib/metric-store';
import { useStore } from '@/lib/store';
import { METRIC_CATEGORIES } from '@/lib/types';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import { MetricStatusBadge } from '@/components/MetricStatusBadge';
import { MetricSparkline } from '@/components/MetricSparkline';
import { MetricForm } from '@/components/MetricForm';
import ReactMarkdown from 'react-markdown';

export default function MetricDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { metrics, getEffectiveValue, getSparklineData, getEntriesForMetric, getTargetsForMetric,
    addMetricEntry, updateMetricEntry, deleteMetricEntry, addMetricTarget, deleteMetricTarget, deleteMetric } = useMetricStore();
  const { getPerson, getProject } = useStore();

  const metric = metrics.find(m => m.id === id);
  const [editing, setEditing] = useState(false);

  // Entry form state
  const [entryValue, setEntryValue] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [entryNote, setEntryNote] = useState('');

  // Target form state
  const [targetPeriod, setTargetPeriod] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [showAddTarget, setShowAddTarget] = useState(false);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editEntryDate, setEditEntryDate] = useState('');
  const [editEntryValue, setEditEntryValue] = useState('');
  const [editEntryNote, setEditEntryNote] = useState('');

  if (!metric) return (
    <div className="p-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/metrics')} className="font-mono text-xs mb-4">
        <ArrowLeft size={14} className="mr-1" /> BACK
      </Button>
      <p className="text-muted-foreground font-mono text-sm">Metric not found.</p>
    </div>
  );

  const val = getEffectiveValue(metric);
  const sparkData = getSparklineData(metric.id);
  const entries = getEntriesForMetric(metric.id);
  const targets = getTargetsForMetric(metric.id);
  const catLabel = METRIC_CATEGORIES.find(c => c.value === metric.category)?.label || metric.category;
  const owner = metric.ownerId ? getPerson(metric.ownerId) : null;
  const project = metric.relatedProjectId ? getProject(metric.relatedProjectId) : null;

  const handleAddEntry = async () => {
    if (!entryValue) return;
    await addMetricEntry({ metricId: metric.id, entryDate, value: Number(entryValue), note: entryNote || null, sourceNoteOverride: null, confidenceOverride: null });
    setEntryValue(''); setEntryNote(''); setShowAddEntry(false);
  };

  const handleAddTarget = async () => {
    if (!targetPeriod || !targetValue) return;
    await addMetricTarget({ metricId: metric.id, period: targetPeriod, targetValue: Number(targetValue), targetNote: null });
    setTargetPeriod(''); setTargetValue(''); setShowAddTarget(false);
  };

  const handleDelete = async () => {
    await deleteMetric(metric.id);
    navigate('/metrics');
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/metrics')} className="font-mono text-xs">
          <ArrowLeft size={14} className="mr-1" /> METRICS
        </Button>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-mono font-bold">{metric.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-mono text-muted-foreground uppercase">{catLabel}</span>
            <MetricStatusBadge status={metric.status} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ConfidenceBadge confidence={metric.confidence} className="text-sm px-3 py-1.5" />
          <Button variant="ghost" size="icon" onClick={() => setEditing(true)}><Pencil size={14} /></Button>
          <Button variant="ghost" size="icon" onClick={handleDelete} className="text-destructive"><Trash2 size={14} /></Button>
        </div>
      </div>

      {/* Value + Sparkline */}
      <div className="border border-border rounded-lg p-4 bg-card">
        <div className="flex items-end gap-4 mb-4">
          <div>
            <p className="text-[10px] font-mono text-muted-foreground">EFFECTIVE VALUE</p>
            <span className="text-3xl font-mono font-bold">{val != null ? val : '--'}</span>
            <span className="text-sm text-muted-foreground ml-1">{metric.unit}</span>
          </div>
          {owner && <p className="text-xs text-muted-foreground">Owner: {owner.name}</p>}
          {project && (
            <button onClick={() => navigate(`/project/${project.id}`)} className="text-xs text-primary hover:underline">
              → {project.name}
            </button>
          )}
        </div>
        <MetricSparkline data={sparkData} mini={false} className="h-48" />
      </div>

      {/* Confidence Note */}
      {metric.confidenceNote && (
        <div className="border border-border rounded-lg p-3 bg-card">
          <p className="text-[10px] font-mono text-muted-foreground mb-1">CONFIDENCE NOTE</p>
          <p className="text-sm">{metric.confidenceNote}</p>
        </div>
      )}

      {/* Definition */}
      {metric.definition && (
        <div className="border border-border rounded-lg p-3 bg-card">
          <p className="text-[10px] font-mono text-muted-foreground mb-1">DEFINITION</p>
          <div className="text-sm prose prose-invert prose-sm max-w-none">
            <ReactMarkdown>{metric.definition}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* Source Note */}
      {metric.sourceNote && (
        <div className="border border-border rounded-lg p-3 bg-card">
          <p className="text-[10px] font-mono text-muted-foreground mb-1">SOURCE NOTE</p>
          <div className="text-sm prose prose-invert prose-sm max-w-none">
            <ReactMarkdown>{metric.sourceNote}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* Targets */}
      <div className="border border-border rounded-lg p-4 bg-card">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-mono text-muted-foreground">TARGETS</p>
          <Button variant="ghost" size="sm" onClick={() => setShowAddTarget(true)} className="text-xs font-mono">
            <Plus size={12} className="mr-1" /> ADD
          </Button>
        </div>
        {targets.length === 0 && !showAddTarget && <p className="text-xs text-muted-foreground">No targets set.</p>}
        {targets.map(t => (
          <div key={t.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
            <span className="text-sm font-mono">{t.period}</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono font-bold">{t.targetValue} {metric.unit}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteMetricTarget(t.id)}>
                <Trash2 size={12} />
              </Button>
            </div>
          </div>
        ))}
        {showAddTarget && (
          <div className="flex items-end gap-2 mt-2">
            <Input value={targetPeriod} onChange={e => setTargetPeriod(e.target.value)} placeholder="2026-Q1" className="w-28 text-xs" />
            <Input type="number" value={targetValue} onChange={e => setTargetValue(e.target.value)} placeholder="Value" className="w-24 text-xs" />
            <Button size="sm" onClick={handleAddTarget} className="text-xs">Add</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAddTarget(false)} className="text-xs">Cancel</Button>
          </div>
        )}
      </div>

      {/* Entries */}
      <div className="border border-border rounded-lg p-4 bg-card">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-mono text-muted-foreground">TIME-SERIES ENTRIES</p>
          <Button variant="ghost" size="sm" onClick={() => setShowAddEntry(true)} className="text-xs font-mono">
            <Plus size={12} className="mr-1" /> ADD ENTRY
          </Button>
        </div>
        {entries.length === 0 && !showAddEntry && <p className="text-xs text-muted-foreground">No entries yet.</p>}
        <div className="space-y-1">
          {entries.map(e => {
            const isEditing = editingEntryId === e.id;
            if (isEditing) {
              return (
                <div key={e.id} className="flex items-center gap-2 py-1.5 border-b border-border last:border-0">
                  <Input type="date" value={editEntryDate} onChange={ev => setEditEntryDate(ev.target.value)} className="w-36 text-xs" />
                  <Input type="number" value={editEntryValue} onChange={ev => setEditEntryValue(ev.target.value)} className="w-24 text-xs" />
                  <Input value={editEntryNote} onChange={ev => setEditEntryNote(ev.target.value)} placeholder="Note" className="flex-1 text-xs" />
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-success" onClick={async () => {
                    await updateMetricEntry({ ...e, entryDate: editEntryDate, value: Number(editEntryValue), note: editEntryNote || null });
                    setEditingEntryId(null);
                  }}><Check size={12} /></Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingEntryId(null)}><X size={12} /></Button>
                </div>
              );
            }
            return (
              <div key={e.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-muted-foreground">{e.entryDate}</span>
                  <span className="text-sm font-mono font-bold">{e.value}</span>
                  {e.note && <span className="text-xs text-muted-foreground truncate max-w-[200px]">{e.note}</span>}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                    setEditingEntryId(e.id); setEditEntryDate(e.entryDate);
                    setEditEntryValue(String(e.value)); setEditEntryNote(e.note || '');
                  }}><Pencil size={12} /></Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteMetricEntry(e.id)}>
                    <Trash2 size={12} />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
        {showAddEntry && (
          <div className="flex items-end gap-2 mt-2">
            <Input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} className="w-36 text-xs" />
            <Input type="number" value={entryValue} onChange={e => setEntryValue(e.target.value)} placeholder="Value" className="w-24 text-xs" />
            <Input value={entryNote} onChange={e => setEntryNote(e.target.value)} placeholder="Note (opt)" className="flex-1 text-xs" />
            <Button size="sm" onClick={handleAddEntry} className="text-xs">Add</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAddEntry(false)} className="text-xs">Cancel</Button>
          </div>
        )}
      </div>

      <MetricForm open={editing} onClose={() => setEditing(false)} metric={metric} />
    </div>
  );
}
