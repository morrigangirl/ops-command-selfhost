import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileJson } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMetricStore } from '@/lib/metric-store';
import { useStore } from '@/lib/store';
import { METRIC_CATEGORIES } from '@/lib/types';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import { MetricStatusBadge } from '@/components/MetricStatusBadge';
import { MetricSparkline } from '@/components/MetricSparkline';
import { MetricForm } from '@/components/MetricForm';
import { ImportExportMetricsDialog } from '@/components/ImportExportMetricsDialog';

export default function MetricsView() {
  const { metrics, getEffectiveValue, getSparklineData } = useMetricStore();
  const { getPerson } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-mono font-bold tracking-wider text-primary">METRICS</h1>
          <p className="text-xs text-muted-foreground font-mono mt-1">PERFORMANCE INDICATORS & TREND DATA</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowImportExport(true)} className="font-mono text-xs">
            <FileJson size={14} className="mr-1" /> IMPORT / EXPORT
          </Button>
          <Button size="sm" onClick={() => setShowForm(true)} className="font-mono text-xs">
            <Plus size={14} className="mr-1" /> NEW METRIC
          </Button>
        </div>
      </div>

      {metrics.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-12 text-center">
          <p className="text-muted-foreground font-mono text-sm">No metrics defined yet</p>
          <Button size="sm" variant="outline" className="mt-3 font-mono text-xs" onClick={() => setShowForm(true)}>
            Create your first metric
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {metrics.map(m => {
            const val = getEffectiveValue(m);
            const sparkData = getSparklineData(m.id);
            const catLabel = METRIC_CATEGORIES.find(c => c.value === m.category)?.label || m.category;
            const owner = m.ownerId ? getPerson(m.ownerId) : null;
            return (
              <button
                key={m.id}
                onClick={() => navigate(`/metric/${m.id}`)}
                className="text-left border border-border rounded-lg p-4 bg-card hover:border-primary/40 transition-colors space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium truncate">{m.name}</h3>
                    <span className="text-[10px] font-mono text-muted-foreground uppercase">{catLabel}</span>
                  </div>
                  <ConfidenceBadge confidence={m.confidence} />
                </div>
                <div className="flex items-end gap-3">
                  <div>
                    <span className="text-2xl font-mono font-bold">{val != null ? val : '--'}</span>
                    <span className="text-xs text-muted-foreground ml-1">{m.unit}</span>
                  </div>
                  <MetricSparkline data={sparkData} mini className="flex-1 h-10" />
                </div>
                <div className="flex items-center gap-2">
                  <MetricStatusBadge status={m.status} />
                  {owner && <span className="text-[10px] text-muted-foreground font-mono truncate">{owner.name}</span>}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <MetricForm open={showForm} onClose={() => setShowForm(false)} />
      <ImportExportMetricsDialog open={showImportExport} onClose={() => setShowImportExport(false)} />
    </div>
  );
}
