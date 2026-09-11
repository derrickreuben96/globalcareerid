import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Loader2, Bot, User, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface Stat {
  path: string;
  total_visits: number;
  human_visits: number;
  bot_visits: number;
  last_visit: string | null;
}

interface Visit {
  id: string;
  path: string;
  referrer: string | null;
  is_bot: boolean;
  created_at: string;
}

const TRACKED_LABELS: Record<string, string> = {
  '/answers': 'AI answers hub',
  '/for-employers/demo': 'Employer demo request',
  '/employment-verification': 'Employment verification guide',
  '/cv-vs-career-id': 'CV vs Career ID',
  '/glossary': 'Glossary',
  '/pricing': 'Pricing',
  '/jobs': 'Job listings',
};

export function AdminPageTraffic() {
  const [stats, setStats] = useState<Stat[]>([]);
  const [recent, setRecent] = useState<Visit[]>([]);
  const [days, setDays] = useState('30');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [statsRes, recentRes] = await Promise.all([
      supabase.rpc('get_page_visit_stats', { days_back: Number(days) }),
      supabase
        .from('page_visits')
        .select('id, path, referrer, is_bot, created_at')
        .order('created_at', { ascending: false })
        .limit(50),
    ]);
    if (statsRes.error) toast.error('Could not load page traffic');
    setStats((statsRes.data ?? []) as Stat[]);
    setRecent((recentRes.data ?? []) as Visit[]);
    setLoading(false);
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = stats.reduce(
    (acc, s) => ({
      total: acc.total + Number(s.total_visits),
      human: acc.human + Number(s.human_visits),
      bot: acc.bot + Number(s.bot_visits),
    }),
    { total: 0, human: 0, bot: 0 },
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">Page Traffic</h2>
          <p className="text-muted-foreground">
            Which answer pages get crawled by AI engines and clicked by people
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={load}>Refresh</Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <Eye className="w-4 h-4" /> Total visits
          </div>
          <p className="text-3xl font-display font-bold text-foreground">{totals.total}</p>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <User className="w-4 h-4" /> People
          </div>
          <p className="text-3xl font-display font-bold text-foreground">{totals.human}</p>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <Bot className="w-4 h-4" /> AI crawlers & bots
          </div>
          <p className="text-3xl font-display font-bold text-foreground">{totals.bot}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Page</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">People</TableHead>
              <TableHead className="text-right">Crawlers</TableHead>
              <TableHead className="text-right">Last visit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stats.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  No visits recorded yet for this period.
                </TableCell>
              </TableRow>
            )}
            {stats.map((s) => (
              <TableRow key={s.path}>
                <TableCell>
                  <div className="font-medium text-foreground">
                    {TRACKED_LABELS[s.path] ?? s.path}
                  </div>
                  <div className="text-xs text-muted-foreground">{s.path}</div>
                </TableCell>
                <TableCell className="text-right font-semibold">{s.total_visits}</TableCell>
                <TableCell className="text-right">{s.human_visits}</TableCell>
                <TableCell className="text-right">{s.bot_visits}</TableCell>
                <TableCell className="text-right text-xs text-muted-foreground">
                  {s.last_visit ? new Date(s.last_visit).toLocaleString() : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div>
        <h3 className="font-display font-semibold text-foreground mb-3">Latest visits</h3>
        <div className="space-y-2">
          {recent.length === 0 && (
            <p className="text-sm text-muted-foreground">Nothing yet.</p>
          )}
          {recent.map((v) => (
            <div
              key={v.id}
              className="glass-card rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{v.path}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {v.referrer ? `from ${v.referrer}` : 'direct'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={v.is_bot ? 'secondary' : 'default'}>
                  {v.is_bot ? 'Crawler' : 'Person'}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(v.created_at).toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
