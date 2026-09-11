import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Loader2, Mail, Phone, Building2, Briefcase, Send, StickyNote, CalendarClock, History,
} from 'lucide-react';
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
  last_contacted_at: string | null;
  next_follow_up_at: string | null;
}

interface Activity {
  id: string;
  lead_id: string;
  activity_type: string;
  subject: string | null;
  body: string | null;
  follow_up_at: string | null;
  created_at: string;
}

const STATUSES = ['new', 'contacted', 'demo_booked', 'won', 'lost'];

const ACTIVITY_LABELS: Record<string, string> = {
  email: 'Demo email sent',
  note: 'Note',
  call: 'Call logged',
  status_change: 'Status changed',
  follow_up: 'Follow-up set',
};

const defaultEmail = (lead: Lead) => ({
  subject: `A verified hiring demo for ${lead.company_name}`,
  message: `Hi ${lead.contact_name.split(' ')[0] || 'there'},

Thanks for asking about Global Career ID. We give you employer-written, verified employment records, so you stop chasing references by phone and email.

In a 20-minute demo we can show you:
• how a candidate's Career ID is verified in one lookup
• how your team records roles for your own employees
• what it would cost for ${lead.company_name} at your hiring volume

Would a short call this week or next work for you?

Best regards,
The Global Career ID team`,
});

function inDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function AdminEmployerLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const [active, setActive] = useState<Lead | null>(null);
  const [emailForm, setEmailForm] = useState({ subject: '', message: '', followUp: '' });
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [savingNote, setSavingNote] = useState(false);

  const load = async () => {
    const [leadsRes, actsRes] = await Promise.all([
      supabase.from('employer_leads').select('*').order('created_at', { ascending: false }),
      supabase.from('lead_activities').select('*').order('created_at', { ascending: false }),
    ]);
    if (leadsRes.error) toast.error('Could not load employer leads');
    setLeads((leadsRes.data ?? []) as Lead[]);
    setActivities((actsRes.data ?? []) as Activity[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const logActivity = async (
    leadId: string,
    activity_type: string,
    body: string | null,
    follow_up_at: string | null = null,
  ) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('lead_activities')
      .insert({ lead_id: leadId, activity_type, body, follow_up_at, created_by: user?.id ?? null })
      .select('*')
      .maybeSingle();
    if (!error && data) setActivities((prev) => [data as Activity, ...prev]);
    return !error;
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('employer_leads').update({ status }).eq('id', id);
    if (error) {
      toast.error('Could not update this lead');
      return;
    }
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
    await logActivity(id, 'status_change', `Status set to ${status.replace('_', ' ')}`);
    toast.success('Lead updated');
  };

  const setFollowUp = async (id: string, date: string) => {
    const iso = date ? new Date(date).toISOString() : null;
    const { error } = await supabase
      .from('employer_leads')
      .update({ next_follow_up_at: iso })
      .eq('id', id);
    if (error) {
      toast.error('Could not save the follow-up date');
      return;
    }
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, next_follow_up_at: iso } : l)));
    setActive((a) => (a && a.id === id ? { ...a, next_follow_up_at: iso } : a));
    await logActivity(id, 'follow_up', iso ? `Follow-up set for ${date}` : 'Follow-up cleared', iso);
    toast.success('Follow-up saved');
  };

  const openLead = (lead: Lead) => {
    setActive(lead);
    const d = defaultEmail(lead);
    setEmailForm({ subject: d.subject, message: d.message, followUp: inDays(3) });
    setNote('');
  };

  const sendEmail = async () => {
    if (!active) return;
    if (!emailForm.subject.trim() || !emailForm.message.trim()) {
      toast.error('Add a subject and a message first');
      return;
    }
    setSending(true);
    const followIso = emailForm.followUp ? new Date(emailForm.followUp).toISOString() : null;
    const { data, error } = await supabase.functions.invoke('send-lead-demo-email', {
      body: {
        lead_id: active.id,
        subject: emailForm.subject.trim(),
        message: emailForm.message.trim(),
        follow_up_at: followIso,
      },
    });
    setSending(false);
    const failure = error?.message || (data as { error?: string })?.error;
    if (failure) {
      toast.error('Email could not be sent. Please try again.');
      return;
    }
    toast.success(`Demo email sent to ${active.work_email}`);
    await load();
    setActive((a) =>
      a ? { ...a, last_contacted_at: new Date().toISOString(), next_follow_up_at: followIso } : a,
    );
  };

  const addNote = async () => {
    if (!active || !note.trim()) return;
    setSavingNote(true);
    const ok = await logActivity(active.id, 'note', note.trim());
    setSavingNote(false);
    if (!ok) {
      toast.error('Could not save the note');
      return;
    }
    setNote('');
    toast.success('Note added');
  };

  const visible = filter === 'all' ? leads : leads.filter((l) => l.status === filter);
  const timeline = active ? activities.filter((a) => a.lead_id === active.id) : [];

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
          {visible.map((lead) => {
            const overdue =
              lead.next_follow_up_at && new Date(lead.next_follow_up_at) < new Date();
            return (
              <div key={lead.id} className="glass-card rounded-2xl p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-primary" />
                      <p className="font-semibold text-foreground">{lead.company_name}</p>
                      <Badge variant="secondary" className="capitalize">
                        {lead.status.replace('_', ' ')}
                      </Badge>
                      {overdue && <Badge variant="destructive">Follow-up due</Badge>}
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
                    <div className="flex flex-wrap gap-4 pt-2 text-xs text-muted-foreground">
                      <span>
                        Last contacted:{' '}
                        {lead.last_contacted_at
                          ? new Date(lead.last_contacted_at).toLocaleDateString()
                          : 'never'}
                      </span>
                      <span>
                        Next follow-up:{' '}
                        {lead.next_follow_up_at
                          ? new Date(lead.next_follow_up_at).toLocaleDateString()
                          : 'not set'}
                      </span>
                    </div>
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
                    <Button onClick={() => openLead(lead)}>
                      <Send className="w-4 h-4" />
                      Outreach
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
          {active && (
            <>
              <DialogHeader>
                <DialogTitle>Outreach — {active.company_name}</DialogTitle>
                <DialogDescription>
                  Send the demo email to {active.contact_name} at {active.work_email}, set the next
                  follow-up, and keep your notes in one place.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="lead-subject">Subject</Label>
                  <Input
                    id="lead-subject"
                    value={emailForm.subject}
                    onChange={(e) => setEmailForm((f) => ({ ...f, subject: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lead-message">Message</Label>
                  <Textarea
                    id="lead-message"
                    rows={12}
                    value={emailForm.message}
                    onChange={(e) => setEmailForm((f) => ({ ...f, message: e.target.value }))}
                  />
                </div>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="lead-followup">Follow up on</Label>
                    <Input
                      id="lead-followup"
                      type="date"
                      className="w-44"
                      value={emailForm.followUp}
                      onChange={(e) => setEmailForm((f) => ({ ...f, followUp: e.target.value }))}
                    />
                  </div>
                  <Button variant="outline" onClick={() => setFollowUp(active.id, emailForm.followUp)}>
                    <CalendarClock className="w-4 h-4" />
                    Save follow-up only
                  </Button>
                  <Button onClick={sendEmail} disabled={sending}>
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Send demo email
                  </Button>
                </div>

                <div className="border-t border-border pt-4 space-y-2">
                  <Label htmlFor="lead-note" className="flex items-center gap-2">
                    <StickyNote className="w-4 h-4" /> Add a note
                  </Label>
                  <Textarea
                    id="lead-note"
                    rows={3}
                    placeholder="What was discussed, objections, next step…"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                  <Button variant="outline" onClick={addNote} disabled={savingNote || !note.trim()}>
                    {savingNote && <Loader2 className="w-4 h-4 animate-spin" />}
                    Save note
                  </Button>
                </div>

                <div className="border-t border-border pt-4">
                  <h4 className="font-display font-semibold text-foreground flex items-center gap-2 mb-3">
                    <History className="w-4 h-4" /> Timeline
                  </h4>
                  {timeline.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nothing logged yet for this lead.
                    </p>
                  ) : (
                    <ol className="space-y-3">
                      {timeline.map((a) => (
                        <li key={a.id} className="rounded-xl bg-muted/40 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium text-foreground">
                              {ACTIVITY_LABELS[a.activity_type] ?? a.activity_type}
                            </p>
                            <span className="text-xs text-muted-foreground">
                              {new Date(a.created_at).toLocaleString()}
                            </span>
                          </div>
                          {a.subject && (
                            <p className="text-xs text-muted-foreground mt-1">{a.subject}</p>
                          )}
                          {a.body && (
                            <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                              {a.body}
                            </p>
                          )}
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button variant="ghost" onClick={() => setActive(null)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
