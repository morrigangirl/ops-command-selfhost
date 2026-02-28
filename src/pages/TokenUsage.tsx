import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Zap, ArrowUpDown } from 'lucide-react';
import { format, startOfDay, startOfMonth, parseISO } from 'date-fns';

interface TokenRecord {
  id: string;
  function_name: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  model: string | null;
  created_at: string;
}

interface FunctionSummary {
  name: string;
  calls: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

interface DailySummary {
  date: string;
  calls: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export default function TokenUsage() {
  const { user } = useAuth();
  const [records, setRecords] = useState<TokenRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from('token_usage')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (!error && data) setRecords(data as TokenRecord[]);
      setLoading(false);
    })();
  }, [user]);

  const totalPrompt = records.reduce((s, r) => s + r.prompt_tokens, 0);
  const totalCompletion = records.reduce((s, r) => s + r.completion_tokens, 0);
  const totalTokens = records.reduce((s, r) => s + r.total_tokens, 0);

  const functionSummaries: FunctionSummary[] = Object.values(
    records.reduce<Record<string, FunctionSummary>>((acc, r) => {
      if (!acc[r.function_name]) {
        acc[r.function_name] = { name: r.function_name, calls: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0 };
      }
      acc[r.function_name].calls++;
      acc[r.function_name].promptTokens += r.prompt_tokens;
      acc[r.function_name].completionTokens += r.completion_tokens;
      acc[r.function_name].totalTokens += r.total_tokens;
      return acc;
    }, {})
  ).sort((a, b) => b.totalTokens - a.totalTokens);

  const dailySummaries: DailySummary[] = Object.values(
    records.reduce<Record<string, DailySummary>>((acc, r) => {
      const day = format(parseISO(r.created_at), 'yyyy-MM-dd');
      if (!acc[day]) {
        acc[day] = { date: day, calls: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0 };
      }
      acc[day].calls++;
      acc[day].promptTokens += r.prompt_tokens;
      acc[day].completionTokens += r.completion_tokens;
      acc[day].totalTokens += r.total_tokens;
      return acc;
    }, {})
  ).sort((a, b) => b.date.localeCompare(a.date));

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Zap size={18} className="text-primary" />
        <h1 className="font-mono text-lg font-bold tracking-wider text-primary">TOKEN USAGE</h1>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono text-muted-foreground tracking-wider">TOTAL TOKENS</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono">{totalTokens.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono text-muted-foreground tracking-wider">PROMPT TOKENS</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono">{totalPrompt.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono text-muted-foreground tracking-wider">COMPLETION TOKENS</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono">{totalCompletion.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="by-function">
        <TabsList>
          <TabsTrigger value="by-function" className="font-mono text-xs">BY FUNCTION</TabsTrigger>
          <TabsTrigger value="daily" className="font-mono text-xs">DAILY</TabsTrigger>
          <TabsTrigger value="log" className="font-mono text-xs">CALL LOG</TabsTrigger>
        </TabsList>

        <TabsContent value="by-function">
          <Card>
            <CardContent className="pt-4">
              {functionSummaries.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No token usage recorded yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-mono text-xs">FUNCTION</TableHead>
                      <TableHead className="font-mono text-xs text-right">CALLS</TableHead>
                      <TableHead className="font-mono text-xs text-right">PROMPT</TableHead>
                      <TableHead className="font-mono text-xs text-right">COMPLETION</TableHead>
                      <TableHead className="font-mono text-xs text-right">TOTAL</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {functionSummaries.map(f => (
                      <TableRow key={f.name}>
                        <TableCell className="font-mono text-xs">{f.name}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{f.calls}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{f.promptTokens.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{f.completionTokens.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-mono text-xs font-bold">{f.totalTokens.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="daily">
          <Card>
            <CardContent className="pt-4">
              {dailySummaries.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No token usage recorded yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-mono text-xs">DATE</TableHead>
                      <TableHead className="font-mono text-xs text-right">CALLS</TableHead>
                      <TableHead className="font-mono text-xs text-right">PROMPT</TableHead>
                      <TableHead className="font-mono text-xs text-right">COMPLETION</TableHead>
                      <TableHead className="font-mono text-xs text-right">TOTAL</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dailySummaries.map(d => (
                      <TableRow key={d.date}>
                        <TableCell className="font-mono text-xs">{d.date}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{d.calls}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{d.promptTokens.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{d.completionTokens.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-mono text-xs font-bold">{d.totalTokens.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="log">
          <Card>
            <CardContent className="pt-4">
              {records.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No token usage recorded yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-mono text-xs">TIMESTAMP</TableHead>
                      <TableHead className="font-mono text-xs">FUNCTION</TableHead>
                      <TableHead className="font-mono text-xs">MODEL</TableHead>
                      <TableHead className="font-mono text-xs text-right">PROMPT</TableHead>
                      <TableHead className="font-mono text-xs text-right">COMPLETION</TableHead>
                      <TableHead className="font-mono text-xs text-right">TOTAL</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map(r => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-[11px] text-muted-foreground">{format(parseISO(r.created_at), 'MMM d, HH:mm')}</TableCell>
                        <TableCell className="font-mono text-xs">{r.function_name}</TableCell>
                        <TableCell className="font-mono text-[11px] text-muted-foreground">{r.model || '—'}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{r.prompt_tokens.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{r.completion_tokens.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-mono text-xs font-bold">{r.total_tokens.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
