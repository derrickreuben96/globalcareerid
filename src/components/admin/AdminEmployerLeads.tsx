import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Mail, Phone, Building2, Briefcase } from 'lucide-react';
import { toast } from 'sonner';

interface Lead {
  id: string;
  company_name: string;
  contact_name: string;
  work_email: string;
  phone: string | null;
  country: string | null;
  company_size: string | null;
  monthly_hires: number | null;
  current_method: string | null;
  message: string | null;
  source: string;
  status: string;
  created_at: string;
}

const STATUSES = ['new', 'contacted', 'demo_booked', 'won', 'lost'];

export function AdminEmployerLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const load = async () => {
    const { data, error } = await supabase
      .from('employer_leads')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      toast.error('Could not load employer leads');
    } else {
      setLeads((data ?? []) as Lead[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('employer_leads').update({ status }).eq('id', id);
    if (error) {
      toast.error('Could not update this lead');
      return;
    }
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
    toast.success('Lead updated');
  };

  const visible = filter === 'all' ? leads : leads.filter((l) => l.status === filter);

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
          <h2 className="text-2xl font-display font-bold text-foreground">Employer Leads</h2>
          <p className="text-muted-foreground">
            Demo requests submitted by organizations ({leads.length} total)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={load}>
            Refresh
          </Button>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center text-muted-foreground">
          No leads to show.
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((lead) => (
            <div key={lead.id} className="glass-card rounded-2xl p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    <p className="font-semibold text-foreground">{lead.company_name}</p>
                    <Badge variant="secondary" className="capitalize">
                      {lead.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {lead.contact_name}
                    {lead.country ? ` · ${lead.country}` : ''}
                  </p>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <a
                      href={`mailto:${lead.work_email}`}
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      {lead.work_email}
                    </a>
                    {lead.phone && (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Phone className="w-3.5 h-3.5" />
                        {lead.phone}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {lead.company_size && (
                      <Badge variant="outline" className="text-xs">
                        {lead.company_size} employees
                      </Badge>
                    )}
                    {lead.monthly_hires !== null && (
                      <Badge variant="outline" className="text-xs">
                        <Briefcase className="w-3 h-3" />
                        {lead.monthly_hires} hires/month
                      </Badge>
                    )}
                    {lead.current_method && (
                      <Badge variant="outline" className="text-xs capitalize">
                        {lead.current_method.replace(/_/g, ' ')}
                      </Badge>
                    )}
                  </div>
                  {lead.message && (
                    <p className="text-sm text-muted-foreground pt-2 max-w-2xl whitespace-pre-wrap">
                      {lead.message}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <p className="text-xs text-muted-foreground">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </p>
                  <Select value={lead.status} onValueChange={(v) => updateStatus(lead.id, v)}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">
                          {s.replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
