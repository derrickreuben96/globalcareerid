import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, CheckCircle, Shield } from 'lucide-react';
import { toast } from 'sonner';

interface RiskFlag {
  id: string;
  profile_id: string;
  matched_profile_id: string | null;
  risk_score: number;
  risk_reasons: any;
  status: string;
  created_at: string;
  profile_name?: string;
  matched_name?: string;
}

export function AdminDuplicateRisks() {
  const [flags, setFlags] = useState<RiskFlag[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFlags = async () => {
    const { data, error } = await supabase
      .from('duplicate_risk_flags')
      .select('*')
      .order('risk_score', { ascending: false });

    if (error) { console.error(error); setLoading(false); return; }

    // Enrich with profile names
    const profileIds = [...new Set([
      ...(data || []).map(d => d.profile_id),
      ...(data || []).filter(d => d.matched_profile_id).map(d => d.matched_profile_id!),
    ])];

    const { data: profiles } = profileIds.length
      ? await supabase.from('profiles').select('id, first_name, last_name').in('id', profileIds)
      : { data: [] };

    const enriched = (data || []).map(f => ({
      ...f,
      profile_name: profiles?.find(p => p.id === f.profile_id)
        ? `${profiles.find(p => p.id === f.profile_id)!.first_name} ${profiles.find(p => p.id === f.profile_id)!.last_name}`
        : f.profile_id,
      matched_name: f.matched_profile_id
        ? profiles?.find(p => p.id === f.matched_profile_id)
          ? `${profiles.find(p => p.id === f.matched_profile_id)!.first_name} ${profiles.find(p => p.id === f.matched_profile_id)!.last_name}`
          : f.matched_profile_id
        : null,
    }));

    setFlags(enriched);
    setLoading(false);
  };

  useEffect(() => { fetchFlags(); }, []);

  const handleResolve = async (id: string, newStatus: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('duplicate_risk_flags')
      .update({ status: newStatus, reviewed_by: user?.id, reviewed_at: new Date().toISOString() } as any)
      .eq('id', id);

    if (error) { toast.error('Failed to update'); return; }
    toast.success(`Flag marked as ${newStatus}`);
    fetchFlags();
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  const pending = flags.filter(f => f.status === 'pending');
  const resolved = flags.filter(f => f.status !== 'pending');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-display font-semibold text-foreground">Duplicate Risk Flags</h2>
        {pending.length > 0 && (
          <Badge variant="destructive">{pending.length} pending</Badge>
        )}
      </div>

      {pending.length === 0 && resolved.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">No risk flags detected.</p>
      ) : (
        <div className="space-y-4">
          {pending.map(f => (
            <div key={f.id} className="p-5 border border-warning/50 rounded-xl bg-warning/5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-warning" />
                    <span className="font-semibold text-foreground">Risk Score: {f.risk_score}/100</span>
                    <Badge variant="destructive">{f.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Profile: <span className="font-medium text-foreground">{f.profile_name}</span>
                    {f.matched_name && (
                      <> — Matched with: <span className="font-medium text-foreground">{f.matched_name}</span></>
                    )}
                  </p>
                  {f.risk_reasons && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      <p className="font-medium mb-1">Reasons:</p>
                      <ul className="list-disc list-inside">
                        {Array.isArray(f.risk_reasons) ? f.risk_reasons.map((r: string, i: number) => (
                          <li key={i}>{r}</li>
                        )) : <li>{JSON.stringify(f.risk_reasons)}</li>}
                      </ul>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleResolve(f.id, 'dismissed')}>
                    Dismiss
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleResolve(f.id, 'confirmed')}>
                    Confirm Duplicate
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {resolved.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold text-foreground mb-3">Resolved Flags</h3>
              {resolved.slice(0, 10).map(f => (
                <div key={f.id} className="p-4 border border-border rounded-xl mb-2 opacity-60">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{f.profile_name} — Score: {f.risk_score}</span>
                    <Badge variant={f.status === 'confirmed' ? 'destructive' : 'secondary'}>{f.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
