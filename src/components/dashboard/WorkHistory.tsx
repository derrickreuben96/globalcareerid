import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { 
  Plus, Loader2, Building2, Calendar, CheckCircle, Clock, FileText, 
  Mail, Shield, AlertTriangle, Upload, Trash2
} from 'lucide-react';
import { toast } from 'sonner';

interface WorkHistoryRecord {
  id: string;
  company_name: string;
  role: string;
  department: string | null;
  employment_type: string;
  start_date: string;
  end_date: string | null;
  verification_status: string;
  verification_method: string | null;
  verification_requested_at: string | null;
  verified_at: string | null;
  created_at: string;
}

const PAGE_SIZE = 20;

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  self_declared: { label: 'Self Declared', color: 'bg-muted text-muted-foreground', icon: Clock },
  pending_employer: { label: 'Pending Employer', color: 'bg-warning/10 text-warning', icon: Mail },
  employer_verified: { label: 'Employer Verified', color: 'bg-verified/10 text-verified', icon: CheckCircle },
  document_verified: { label: 'Document Verified', color: 'bg-primary/10 text-primary', icon: FileText },
  rejected: { label: 'Rejected', color: 'bg-destructive/10 text-destructive', icon: AlertTriangle },
};

const employmentTypes: Record<string, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  contract: 'Contract',
  internship: 'Internship',
};

export function WorkHistory() {
  const { user } = useAuth();
  const [records, setRecords] = useState<WorkHistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<WorkHistoryRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({
    company_name: '',
    role: '',
    department: '',
    employment_type: 'full_time',
    start_date: '',
    end_date: '',
  });

  // Verification form
  const [employerEmail, setEmployerEmail] = useState('');
  
  // Upload
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const fetchRecords = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const [dataRes, countRes] = await Promise.all([
      supabase
        .from('work_history')
        .select('*')
        .eq('user_id', user.id)
        .order('start_date', { ascending: false })
        .range(from, to),
      supabase
        .from('work_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id),
    ]);

    if (dataRes.error) {
      console.error('Error fetching work history:', dataRes.error);
      toast.error('Failed to load work history');
    } else {
      setRecords(dataRes.data || []);
      setTotalCount(countRes.count || 0);
    }
    setIsLoading(false);
  }, [user, page]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const handleAdd = async () => {
    if (!user) return;
    if (!form.company_name || !form.role || !form.start_date) {
      toast.error('Please fill in company name, role, and start date');
      return;
    }

    setIsSaving(true);
    const { error } = await supabase.from('work_history').insert({
      user_id: user.id,
      company_name: form.company_name.trim(),
      role: form.role.trim(),
      department: form.department.trim() || null,
      employment_type: form.employment_type,
      start_date: form.start_date,
      end_date: form.end_date || null,
      verification_status: 'self_declared',
    });

    setIsSaving(false);

    if (error) {
      if (error.code === '23505') {
        toast.error('A matching employment record already exists');
      } else {
        toast.error('Failed to add employment record');
        console.error(error);
      }
      return;
    }

    toast.success('Employment record added');
    setAddOpen(false);
    setForm({ company_name: '', role: '', department: '', employment_type: 'full_time', start_date: '', end_date: '' });
    fetchRecords();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('work_history').delete().eq('id', id);
    if (error) {
      toast.error('Cannot delete verified records');
    } else {
      toast.success('Record deleted');
      fetchRecords();
    }
  };

  const handleRequestVerification = async () => {
    if (!selectedRecord || !employerEmail) {
      toast.error('Please enter employer email');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.functions.invoke('request-employer-verification', {
        body: {
          work_history_id: selectedRecord.id,
          employer_email: employerEmail,
        },
      });

      if (error) throw error;

      toast.success('Verification request sent to employer');
      setVerifyOpen(false);
      setEmployerEmail('');
      setSelectedRecord(null);
      fetchRecords();
    } catch (e) {
      console.error(e);
      toast.error('Failed to send verification request');
    }
    setIsSaving(false);
  };

  const handleUploadDocument = async () => {
    if (!selectedRecord || !uploadFile || !user) {
      toast.error('Please select a file');
      return;
    }

    setIsSaving(true);
    try {
      const filePath = `${user.id}/${selectedRecord.id}/${Date.now()}_${uploadFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('verification-documents')
        .upload(filePath, uploadFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('verification-documents')
        .getPublicUrl(filePath);

      const { error: docError } = await supabase.from('verification_documents').insert({
        work_history_id: selectedRecord.id,
        file_url: filePath,
        file_name: uploadFile.name,
        review_status: 'pending',
      });

      if (docError) throw docError;

      // Update work history status if still self_declared
      if (selectedRecord.verification_status === 'self_declared') {
        await supabase
          .from('work_history')
          .update({ verification_status: 'pending_employer', verification_method: 'document' })
          .eq('id', selectedRecord.id);
      }

      toast.success('Document uploaded for review');
      setUploadOpen(false);
      setUploadFile(null);
      setSelectedRecord(null);
      fetchRecords();
    } catch (e) {
      console.error(e);
      toast.error('Failed to upload document');
    }
    setIsSaving(false);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const config = statusConfig[status] || statusConfig.self_declared;
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-display font-semibold text-foreground">Work History</h2>
          <p className="text-sm text-muted-foreground">Add and verify your employment history</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Employment
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : records.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No work history records yet.</p>
          <p className="text-sm mt-1">Add your past and current employment to build your verified career profile.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {records.map((record) => (
            <div key={record.id} className="border border-border rounded-xl p-5 hover:bg-muted/30 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold text-foreground">{record.role}</h3>
                    <StatusBadge status={record.verification_status} />
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Building2 className="w-4 h-4 shrink-0" />
                    <span className="font-medium text-foreground/80">{record.company_name}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(record.start_date)} — {record.end_date ? formatDate(record.end_date) : 'Present'}</span>
                    </div>
                    <span className="text-muted-foreground/50">•</span>
                    <span>{employmentTypes[record.employment_type] || record.employment_type}</span>
                    {record.department && (
                      <>
                        <span className="text-muted-foreground/50">•</span>
                        <span>{record.department}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {record.verification_status === 'self_declared' && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-primary"
                        onClick={() => { setSelectedRecord(record); setVerifyOpen(true); }}
                      >
                        <Mail className="w-4 h-4 mr-1" />
                        Verify
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-primary"
                        onClick={() => { setSelectedRecord(record); setUploadOpen(true); }}
                      >
                        <Upload className="w-4 h-4 mr-1" />
                        Upload
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(record.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                  {record.verification_status === 'rejected' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(record.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {totalPages > 1 && (
            <Pagination className="mt-6">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    className={page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                  <PaginationItem key={p}>
                    <PaginationLink 
                      isActive={p === page} 
                      onClick={() => setPage(p)}
                      className="cursor-pointer"
                    >
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    className={page === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      )}

      {/* Add Employment Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Employment Record</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Company Name *</Label>
              <Input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} placeholder="e.g. Acme Corp" />
            </div>
            <div>
              <Label>Job Title / Role *</Label>
              <Input value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} placeholder="e.g. Software Engineer" />
            </div>
            <div>
              <Label>Department</Label>
              <Input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} placeholder="e.g. Engineering" />
            </div>
            <div>
              <Label>Employment Type</Label>
              <Select value={form.employment_type} onValueChange={v => setForm(f => ({ ...f, employment_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_time">Full-time</SelectItem>
                  <SelectItem value="part_time">Part-time</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="internship">Internship</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date *</Label>
                <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div>
                <Label>End Date</Label>
                <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Employer Verification Dialog */}
      <Dialog open={verifyOpen} onOpenChange={setVerifyOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Request Employer Verification
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              We'll send a secure verification link to your former employer. They can confirm your employment details without creating an account.
            </p>
            {selectedRecord && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p className="font-medium">{selectedRecord.role} at {selectedRecord.company_name}</p>
                <p className="text-muted-foreground">{formatDate(selectedRecord.start_date)} — {selectedRecord.end_date ? formatDate(selectedRecord.end_date) : 'Present'}</p>
              </div>
            )}
            <div>
              <Label>Employer's Email Address *</Label>
              <Input 
                type="email" 
                value={employerEmail} 
                onChange={e => setEmployerEmail(e.target.value)} 
                placeholder="hr@company.com" 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVerifyOpen(false)}>Cancel</Button>
            <Button onClick={handleRequestVerification} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Send Verification Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Document Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Upload Supporting Document
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Upload a document to support your employment claim (e.g., offer letter, pay stub, reference letter). An admin will review it.
            </p>
            {selectedRecord && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p className="font-medium">{selectedRecord.role} at {selectedRecord.company_name}</p>
              </div>
            )}
            <div>
              <Label>Document</Label>
              <Input 
                type="file" 
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={e => setUploadFile(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG, DOC up to 10MB</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button>
            <Button onClick={handleUploadDocument} disabled={isSaving || !uploadFile}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Upload Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
