import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowUpRight, Loader2 } from 'lucide-react';

interface PromotionRequestFormProps {
  userId: string;
  records: Array<{
    id: string;
    job_title: string;
    employer: { company_name: string };
  }>;
}

export function PromotionRequestForm({ userId, records }: PromotionRequestFormProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    employment_record_id: '',
    proposed_role_title: '',
    proposed_department: '',
    effective_date: '',
    promotion_type: 'promotion' as string,
  });

  const handleSubmit = async () => {
    if (!form.employment_record_id || !form.proposed_role_title || !form.effective_date) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('promotion_requests').insert({
        employment_record_id: form.employment_record_id,
        employee_id: userId,
        proposed_role_title: form.proposed_role_title.trim(),
        proposed_department: form.proposed_department.trim() || null,
        effective_date: form.effective_date,
        promotion_type: form.promotion_type,
      } as any);

      if (error) throw error;

      toast.success('Role update request submitted');
      setOpen(false);
      setForm({
        employment_record_id: '',
        proposed_role_title: '',
        proposed_department: '',
        effective_date: '',
        promotion_type: 'promotion',
      });
    } catch (e: any) {
      toast.error(e.message || 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (records.length === 0) return null;

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="gap-2">
        <ArrowUpRight className="w-4 h-4" />
        Request Role Update
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Role Update</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Employment Record *</Label>
              <Select value={form.employment_record_id} onValueChange={(v) => setForm(p => ({ ...p, employment_record_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select employment" /></SelectTrigger>
                <SelectContent>
                  {records.map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.job_title} — {r.employer.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>New Role Title *</Label>
              <Input value={form.proposed_role_title} onChange={e => setForm(p => ({ ...p, proposed_role_title: e.target.value }))} placeholder="e.g. Senior Sales Officer" />
            </div>
            <div>
              <Label>Department</Label>
              <Input value={form.proposed_department} onChange={e => setForm(p => ({ ...p, proposed_department: e.target.value }))} placeholder="e.g. Sales" />
            </div>
            <div>
              <Label>Effective Date *</Label>
              <Input type="date" value={form.effective_date} onChange={e => setForm(p => ({ ...p, effective_date: e.target.value }))} max={new Date().toISOString().split('T')[0]} />
            </div>
            <div>
              <Label>Update Type *</Label>
              <Select value={form.promotion_type} onValueChange={(v) => setForm(p => ({ ...p, promotion_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="promotion">Promotion</SelectItem>
                  <SelectItem value="lateral">Lateral Move</SelectItem>
                  <SelectItem value="demotion">Demotion</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
