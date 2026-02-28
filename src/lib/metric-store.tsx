import { createContext, useContext, useState, useEffect, type ReactNode, useCallback, useMemo } from 'react';
import { Metric, MetricTarget, MetricEntry } from './types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface MetricStoreContextType {
  metrics: Metric[];
  metricTargets: MetricTarget[];
  metricEntries: MetricEntry[];
  loading: boolean;
  addMetric: (m: Omit<Metric, 'id' | 'createdAt' | 'lastUpdatedAt'>) => Promise<void>;
  updateMetric: (m: Metric) => Promise<void>;
  deleteMetric: (id: string) => Promise<void>;
  addMetricTarget: (t: Omit<MetricTarget, 'id'>) => Promise<void>;
  updateMetricTarget: (t: MetricTarget) => Promise<void>;
  deleteMetricTarget: (id: string) => Promise<void>;
  addMetricEntry: (e: Omit<MetricEntry, 'id'>) => Promise<void>;
  updateMetricEntry: (e: MetricEntry) => Promise<void>;
  deleteMetricEntry: (id: string) => Promise<void>;
  getEntriesForMetric: (metricId: string) => MetricEntry[];
  getTargetsForMetric: (metricId: string) => MetricTarget[];
  getEffectiveValue: (metric: Metric) => number | null;
  getSparklineData: (metricId: string) => { date: string; value: number }[];
}

const MetricStoreContext = createContext<MetricStoreContextType | null>(null);

function mapMetric(r: any): Metric {
  return {
    id: r.id, name: r.name, externalRef: r.external_ref ?? null,
    category: r.category, definition: r.definition,
    unit: r.unit, currentValue: r.current_value != null ? Number(r.current_value) : null,
    sourceNote: r.source_note, confidence: r.confidence, confidenceNote: r.confidence_note,
    ownerId: r.owner_id, relatedProjectId: r.related_project_id,
    status: r.status, lastUpdatedAt: r.last_updated_at, createdAt: r.created_at,
  };
}

function mapTarget(r: any): MetricTarget {
  return { id: r.id, metricId: r.metric_id, period: r.period, targetValue: Number(r.target_value), targetNote: r.target_note };
}

function mapEntry(r: any): MetricEntry {
  return {
    id: r.id, metricId: r.metric_id, entryDate: r.entry_date, value: Number(r.value),
    note: r.note, sourceNoteOverride: r.source_note_override, confidenceOverride: r.confidence_override,
  };
}

export function MetricStoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [metricTargets, setMetricTargets] = useState<MetricTarget[]>([]);
  const [metricEntries, setMetricEntries] = useState<MetricEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setMetrics([]); setMetricTargets([]); setMetricEntries([]); setLoading(false); return; }
    setLoading(true);
    const fetchAll = async () => {
      const [{ data: m }, { data: t }, { data: e }] = await Promise.all([
        supabase.from('metrics' as any).select('*').order('created_at'),
        supabase.from('metric_targets' as any).select('*').order('created_at'),
        supabase.from('metric_entries' as any).select('*').order('entry_date'),
      ]);
      setMetrics((m || []).map(mapMetric));
      setMetricTargets((t || []).map(mapTarget));
      setMetricEntries((e || []).map(mapEntry));
      setLoading(false);
    };
    fetchAll();
  }, [user]);

  const addMetric = useCallback(async (m: Omit<Metric, 'id' | 'createdAt' | 'lastUpdatedAt'>) => {
    if (!user) return;
    const { data } = await (supabase.from('metrics' as any) as any).insert({
      user_id: user.id, name: m.name, category: m.category, definition: m.definition,
      unit: m.unit, current_value: m.currentValue, source_note: m.sourceNote,
      confidence: m.confidence, confidence_note: m.confidenceNote,
      owner_id: m.ownerId, related_project_id: m.relatedProjectId, status: m.status,
    }).select().single();
    if (data) setMetrics(prev => [...prev, mapMetric(data)]);
  }, [user]);

  const updateMetric = useCallback(async (m: Metric) => {
    await (supabase.from('metrics' as any) as any).update({
      name: m.name, category: m.category, definition: m.definition, unit: m.unit,
      current_value: m.currentValue, source_note: m.sourceNote,
      confidence: m.confidence, confidence_note: m.confidenceNote,
      owner_id: m.ownerId, related_project_id: m.relatedProjectId, status: m.status,
    }).eq('id', m.id);
    setMetrics(prev => prev.map(x => x.id === m.id ? m : x));
  }, []);

  const deleteMetric = useCallback(async (id: string) => {
    await (supabase.from('metrics' as any) as any).delete().eq('id', id);
    setMetrics(prev => prev.filter(x => x.id !== id));
    setMetricTargets(prev => prev.filter(x => x.metricId !== id));
    setMetricEntries(prev => prev.filter(x => x.metricId !== id));
  }, []);

  const addMetricTarget = useCallback(async (t: Omit<MetricTarget, 'id'>) => {
    if (!user) return;
    const { data } = await (supabase.from('metric_targets' as any) as any).insert({
      user_id: user.id, metric_id: t.metricId, period: t.period,
      target_value: t.targetValue, target_note: t.targetNote,
    }).select().single();
    if (data) setMetricTargets(prev => [...prev, mapTarget(data)]);
  }, [user]);

  const updateMetricTarget = useCallback(async (t: MetricTarget) => {
    await (supabase.from('metric_targets' as any) as any).update({
      period: t.period, target_value: t.targetValue, target_note: t.targetNote,
    }).eq('id', t.id);
    setMetricTargets(prev => prev.map(x => x.id === t.id ? t : x));
  }, []);

  const deleteMetricTarget = useCallback(async (id: string) => {
    await (supabase.from('metric_targets' as any) as any).delete().eq('id', id);
    setMetricTargets(prev => prev.filter(x => x.id !== id));
  }, []);

  const addMetricEntry = useCallback(async (e: Omit<MetricEntry, 'id'>) => {
    if (!user) return;
    const { data } = await (supabase.from('metric_entries' as any) as any).insert({
      user_id: user.id, metric_id: e.metricId, entry_date: e.entryDate,
      value: e.value, note: e.note, source_note_override: e.sourceNoteOverride,
      confidence_override: e.confidenceOverride,
    }).select().single();
    if (data) setMetricEntries(prev => [...prev, mapEntry(data)]);
  }, [user]);

  const updateMetricEntry = useCallback(async (e: MetricEntry) => {
    await (supabase.from('metric_entries' as any) as any).update({
      entry_date: e.entryDate, value: e.value, note: e.note,
      source_note_override: e.sourceNoteOverride, confidence_override: e.confidenceOverride,
    }).eq('id', e.id);
    setMetricEntries(prev => prev.map(x => x.id === e.id ? e : x));
  }, []);

  const deleteMetricEntry = useCallback(async (id: string) => {
    await (supabase.from('metric_entries' as any) as any).delete().eq('id', id);
    setMetricEntries(prev => prev.filter(x => x.id !== id));
  }, []);

  const getEntriesForMetric = useCallback((metricId: string) =>
    metricEntries.filter(e => e.metricId === metricId).sort((a, b) => a.entryDate.localeCompare(b.entryDate)),
    [metricEntries]);

  const getTargetsForMetric = useCallback((metricId: string) =>
    metricTargets.filter(t => t.metricId === metricId).sort((a, b) => a.period.localeCompare(b.period)),
    [metricTargets]);

  const getEffectiveValue = useCallback((metric: Metric): number | null => {
    if (metric.currentValue != null) return metric.currentValue;
    const entries = metricEntries.filter(e => e.metricId === metric.id);
    if (entries.length === 0) return null;
    const sorted = [...entries].sort((a, b) => b.entryDate.localeCompare(a.entryDate));
    return sorted[0].value;
  }, [metricEntries]);

  const getSparklineData = useCallback((metricId: string) => {
    const entries = metricEntries.filter(e => e.metricId === metricId)
      .sort((a, b) => a.entryDate.localeCompare(b.entryDate));
    return entries.slice(-20).map(e => ({ date: e.entryDate, value: e.value }));
  }, [metricEntries]);

  const value = useMemo(() => ({
    metrics, metricTargets, metricEntries, loading,
    addMetric, updateMetric, deleteMetric,
    addMetricTarget, updateMetricTarget, deleteMetricTarget,
    addMetricEntry, updateMetricEntry, deleteMetricEntry,
    getEntriesForMetric, getTargetsForMetric, getEffectiveValue, getSparklineData,
  }), [metrics, metricTargets, metricEntries, loading,
    addMetric, updateMetric, deleteMetric,
    addMetricTarget, updateMetricTarget, deleteMetricTarget,
    addMetricEntry, updateMetricEntry, deleteMetricEntry,
    getEntriesForMetric, getTargetsForMetric, getEffectiveValue, getSparklineData]);

  return (
    <MetricStoreContext.Provider value={value}>
      {children}
    </MetricStoreContext.Provider>
  );
}

export function useMetricStore() {
  const ctx = useContext(MetricStoreContext);
  if (!ctx) throw new Error('useMetricStore must be used within MetricStoreProvider');
  return ctx;
}
