import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

interface Props {
  data: { date: string; value: number }[];
  mini?: boolean;
  className?: string;
}

export function MetricSparkline({ data, mini = true, className }: Props) {
  if (data.length < 2) return <div className={className} />;
  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <defs>
            <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          {!mini && <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />}
          {!mini && <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={40} />}
          {!mini && <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', fontSize: 12 }} />}
          <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="url(#sparkGrad)" strokeWidth={mini ? 1.5 : 2} dot={!mini} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
