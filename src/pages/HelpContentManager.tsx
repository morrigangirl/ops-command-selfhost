import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { PAGE_HELP_ROUTES, getFallbackHelpByRouteKey, type PageHelpSections, type StoredPageHelp } from '@/help/pageHelp';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Save, RefreshCw } from 'lucide-react';
import { formatDistanceToNowStrict, parseISO } from 'date-fns';

interface HelpVersion {
  id: string;
  version: number;
  source: 'manual' | 'llm' | 'seed';
  created_at: string;
}

const EDITABLE_FIELDS: Array<{ key: keyof PageHelpSections; label: string; rows?: number }> = [
  { key: 'title', label: 'Title' },
  { key: 'summary', label: 'Summary', rows: 3 },
  { key: 'what_this_page_does', label: 'What This Page Does', rows: 7 },
  { key: 'what_is_expected', label: 'What Is Expected', rows: 7 },
  { key: 'required_inputs', label: 'Required Inputs', rows: 7 },
  { key: 'primary_actions', label: 'Primary Actions', rows: 7 },
  { key: 'common_mistakes', label: 'Common Mistakes', rows: 7 },
  { key: 'next_steps', label: 'Next Steps', rows: 7 },
];

function getSourceBadgeClass(source: StoredPageHelp['source']) {
  if (source === 'llm') return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
  if (source === 'seed') return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
  return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
}

function normalizeSections(raw: unknown, fallback: PageHelpSections): PageHelpSections {
  const source = (raw ?? {}) as Record<string, unknown>;
  return {
    title: typeof source.title === 'string' && source.title.trim() ? source.title : fallback.title,
    summary: typeof source.summary === 'string' ? source.summary : fallback.summary,
    what_this_page_does: typeof source.what_this_page_does === 'string' ? source.what_this_page_does : fallback.what_this_page_does,
    what_is_expected: typeof source.what_is_expected === 'string' ? source.what_is_expected : fallback.what_is_expected,
    required_inputs: typeof source.required_inputs === 'string' ? source.required_inputs : fallback.required_inputs,
    primary_actions: typeof source.primary_actions === 'string' ? source.primary_actions : fallback.primary_actions,
    common_mistakes: typeof source.common_mistakes === 'string' ? source.common_mistakes : fallback.common_mistakes,
    next_steps: typeof source.next_steps === 'string' ? source.next_steps : fallback.next_steps,
  };
}

export default function HelpContentManager() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingRouteKey, setGeneratingRouteKey] = useState<string | null>(null);
  const [generatingMissing, setGeneratingMissing] = useState(false);
  const [records, setRecords] = useState<Record<string, StoredPageHelp>>({});
  const [versions, setVersions] = useState<HelpVersion[]>([]);
  const [draft, setDraft] = useState<PageHelpSections>(getFallbackHelpByRouteKey('/'));

  const selectedRouteKey = useMemo(() => {
    const fromQuery = searchParams.get('route');
    if (fromQuery && PAGE_HELP_ROUTES.some((r) => r.routeKey === fromQuery)) return fromQuery;
    return '/';
  }, [searchParams]);

  const selectedRoute = useMemo(
    () => PAGE_HELP_ROUTES.find((route) => route.routeKey === selectedRouteKey) ?? PAGE_HELP_ROUTES[0],
    [selectedRouteKey],
  );

  const missingCount = useMemo(
    () => PAGE_HELP_ROUTES.filter((route) => !records[route.routeKey]).length,
    [records],
  );

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('page_help_content' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('route_key', { ascending: true });

      if (error) {
        toast({ title: 'Load failed', description: error.message, variant: 'destructive' });
        setLoading(false);
        return;
      }

      const mapped: Record<string, StoredPageHelp> = {};
      for (const row of (data ?? []) as StoredPageHelp[]) {
        mapped[row.route_key] = row;
      }
      setRecords(mapped);
      setLoading(false);
    };

    load();
  }, [user]);

  useEffect(() => {
    const fallback = getFallbackHelpByRouteKey(selectedRoute.routeKey);
    const existing = records[selectedRoute.routeKey];
    setDraft(existing ? normalizeSections(existing, fallback) : fallback);
  }, [selectedRoute.routeKey, records]);

  useEffect(() => {
    if (!user) return;

    const loadVersions = async () => {
      const { data, error } = await supabase
        .from('page_help_content_versions' as any)
        .select('id, version, source, created_at')
        .eq('user_id', user.id)
        .eq('route_key', selectedRoute.routeKey)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        setVersions([]);
        return;
      }

      setVersions((data ?? []) as HelpVersion[]);
    };

    loadVersions();
  }, [user, selectedRoute.routeKey, records[selectedRoute.routeKey]?.updated_at]);

  const upsertHelpContent = async (
    routeKey: string,
    sections: PageHelpSections,
    source: StoredPageHelp['source'],
  ): Promise<StoredPageHelp> => {
    if (!user) throw new Error('Not authenticated');

    const payload = {
      user_id: user.id,
      route_key: routeKey,
      title: sections.title,
      summary: sections.summary,
      what_this_page_does: sections.what_this_page_does,
      what_is_expected: sections.what_is_expected,
      required_inputs: sections.required_inputs,
      primary_actions: sections.primary_actions,
      common_mistakes: sections.common_mistakes,
      next_steps: sections.next_steps,
      source,
    };

    const { data, error } = await supabase
      .from('page_help_content' as any)
      .upsert(payload as any, { onConflict: 'user_id,route_key' })
      .select('*')
      .single();

    if (error) throw error;

    return data as StoredPageHelp;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await upsertHelpContent(selectedRoute.routeKey, draft, 'manual');
      setRecords((prev) => ({ ...prev, [saved.route_key]: saved }));
      toast({ title: 'Help content saved', description: `${selectedRoute.routeTitle} updated.` });
    } catch (e: any) {
      toast({ title: 'Save failed', description: e?.message || 'Could not save help content.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const generateForRoute = async (routeKey: string) => {
    const route = PAGE_HELP_ROUTES.find((r) => r.routeKey === routeKey);
    if (!route) return;

    setGeneratingRouteKey(routeKey);
    try {
      const { data, error } = await supabase.functions.invoke('generate-page-help', {
        body: {
          routeKey: route.routeKey,
          routeTitle: route.routeTitle,
          pageDescription: route.pageDescription,
          expectedOutcome: route.expectedOutcome,
          primaryEntities: route.primaryEntities,
          primaryActions: route.primaryActions,
        },
      });

      if (error) throw error;

      const generated = normalizeSections(data?.content, route.fallback);
      const saved = await upsertHelpContent(route.routeKey, generated, 'llm');

      setRecords((prev) => ({ ...prev, [saved.route_key]: saved }));
      if (route.routeKey === selectedRoute.routeKey) setDraft(generated);

      toast({ title: 'AI draft generated', description: `${route.routeTitle} help was generated and saved.` });
    } catch (e: any) {
      toast({
        title: 'Generation failed',
        description: e?.message || `Could not generate help for ${route.routeTitle}.`,
        variant: 'destructive',
      });
    } finally {
      setGeneratingRouteKey(null);
    }
  };

  const generateMissing = async () => {
    const missing = PAGE_HELP_ROUTES.filter((route) => !records[route.routeKey]);
    if (missing.length === 0) {
      toast({ title: 'No missing pages', description: 'All routes already have stored help content.' });
      return;
    }

    setGeneratingMissing(true);
    const failed: string[] = [];

    for (const route of missing) {
      try {
        const { data, error } = await supabase.functions.invoke('generate-page-help', {
          body: {
            routeKey: route.routeKey,
            routeTitle: route.routeTitle,
            pageDescription: route.pageDescription,
            expectedOutcome: route.expectedOutcome,
            primaryEntities: route.primaryEntities,
            primaryActions: route.primaryActions,
          },
        });

        if (error) throw error;

        const generated = normalizeSections(data?.content, route.fallback);
        const saved = await upsertHelpContent(route.routeKey, generated, 'llm');
        setRecords((prev) => ({ ...prev, [saved.route_key]: saved }));
      } catch {
        failed.push(route.routeTitle);
      }
    }

    setGeneratingMissing(false);

    if (failed.length === 0) {
      toast({ title: 'Missing pages generated', description: `Generated ${missing.length} route help records.` });
      return;
    }

    toast({
      title: 'Partial generation complete',
      description: `${missing.length - failed.length}/${missing.length} generated. Failed: ${failed.join(', ')}`,
      variant: failed.length === missing.length ? 'destructive' : 'default',
    });
  };

  const selectedRecord = records[selectedRoute.routeKey];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-mono text-lg font-bold tracking-[0.16em] text-primary">HELP CONTENT</h1>
          <p className="text-sm text-muted-foreground">Manage route-level help popups, generate drafts with AI, and edit content in place.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-[10px]">Routes: {PAGE_HELP_ROUTES.length}</Badge>
          <Badge variant="outline" className="font-mono text-[10px]">Stored: {PAGE_HELP_ROUTES.length - missingCount}</Badge>
          <Badge variant="outline" className="font-mono text-[10px]">Missing: {missingCount}</Badge>
          <Button variant="outline" className="gap-2" onClick={generateMissing} disabled={generatingMissing || loading}>
            {generatingMissing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            Generate Missing
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-mono text-xs tracking-[0.14em] text-muted-foreground">ROUTE CATALOG</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[72vh] overflow-auto pr-1">
            {PAGE_HELP_ROUTES.map((route) => {
              const existing = records[route.routeKey];
              const isSelected = route.routeKey === selectedRoute.routeKey;
              return (
                <button
                  key={route.routeKey}
                  type="button"
                  className={cn(
                    'w-full rounded border px-3 py-2 text-left transition-colors',
                    isSelected ? 'border-primary/60 bg-primary/10' : 'border-border hover:bg-muted/20',
                  )}
                  onClick={() => setSearchParams({ route: route.routeKey })}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-mono text-xs text-foreground">{route.routeTitle}</p>
                      <p className="text-[11px] text-muted-foreground break-all">{route.routeKey}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        'font-mono text-[10px] capitalize',
                        existing ? getSourceBadgeClass(existing.source) : 'bg-muted/20 text-muted-foreground border-border',
                      )}
                    >
                      {existing?.source ?? 'missing'}
                    </Badge>
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="font-mono text-sm tracking-[0.12em] text-primary">EDIT ROUTE HELP · {selectedRoute.routeTitle.toUpperCase()}</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => generateForRoute(selectedRoute.routeKey)}
                    disabled={!!generatingRouteKey || loading}
                  >
                    {generatingRouteKey === selectedRoute.routeKey ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    Generate With AI
                  </Button>
                  <Button className="gap-2" onClick={handleSave} disabled={saving || loading}>
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Save
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{selectedRoute.pageDescription}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 size={16} className="animate-spin" />
                  Loading stored help content...
                </div>
              ) : (
                EDITABLE_FIELDS.map((field) => (
                  <div key={field.key} className="space-y-2">
                    <label className="font-mono text-[11px] tracking-[0.12em] text-primary">{field.label}</label>
                    {field.key === 'title' ? (
                      <Input
                        value={draft[field.key]}
                        onChange={(e) => setDraft((prev) => ({ ...prev, [field.key]: e.target.value }))}
                        placeholder={field.label}
                      />
                    ) : (
                      <Textarea
                        value={draft[field.key]}
                        rows={field.rows ?? 5}
                        onChange={(e) => setDraft((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      />
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-mono text-xs tracking-[0.14em] text-muted-foreground">VERSION HISTORY</CardTitle>
            </CardHeader>
            <CardContent>
              {versions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No saved versions yet for this route.</p>
              ) : (
                <div className="space-y-2">
                  {versions.map((version) => (
                    <div key={version.id} className="flex items-center justify-between rounded border border-border px-3 py-2 text-xs">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-[10px]">v{version.version}</Badge>
                        <Badge variant="outline" className={cn('font-mono text-[10px] capitalize', getSourceBadgeClass(version.source))}>{version.source}</Badge>
                      </div>
                      <span className="text-muted-foreground">
                        {formatDistanceToNowStrict(parseISO(version.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-3 text-[11px] text-muted-foreground flex items-center gap-2">
                <RefreshCw size={12} />
                Latest saved record: {selectedRecord ? `v${selectedRecord.version} (${selectedRecord.source})` : 'none'}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
