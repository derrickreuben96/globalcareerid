import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AdminAnalytics } from '@/components/admin/AdminAnalytics';
import { 
  Building2, 
  AlertTriangle, 
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Users,
  FileText,
  BarChart3,
  LogOut
} from 'lucide-react';
import { toast } from 'sonner';

interface Employer {
  id: string;
  company_name: string;
  registration_number: string | null;
  industry: string | null;
  country: string | null;
  website: string | null;
  is_verified: boolean;
  verification_status: string;
  verification_notes: string | null;
  created_at: string;
}

interface Dispute {
  id: string;
  reason: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  user: {
    first_name: string;
    last_name: string;
    profile_id: string;
  } | null;
  employment_record: {
    job_title: string;
    employer: {
      company_name: string;
    } | null;
  } | null;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, roles, isLoading: authLoading, signOut } = useAuth();
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEmployer, setSelectedEmployer] = useState<Employer | null>(null);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [activeSection, setActiveSection] = useState<'analytics' | 'employers' | 'disputes'>('analytics');

  // Server-side admin role verification for security
  useEffect(() => {
    const verifyAdminAccess = async () => {
      if (authLoading) return;
      
      if (!user) {
        navigate('/');
        toast.error('Please sign in to access this page.');
        return;
      }

      // Client-side pre-check for fast UX
      if (!roles.includes('admin')) {
        navigate('/');
        toast.error('Access denied. Admin privileges required.');
        return;
      }

      // Server-side verification for security
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          navigate('/');
          toast.error('Session expired. Please sign in again.');
          return;
        }

        const { data, error } = await supabase.functions.invoke('verify-admin', {
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        });

        if (error || !data?.isAdmin) {
          console.error('Admin verification failed:', error || 'Not an admin');
          navigate('/');
          toast.error('Access denied. Admin privileges required.');
          return;
        }
      } catch (err) {
        console.error('Admin verification error:', err);
        // Fall back to client-side check if edge function fails
        if (!roles.includes('admin')) {
          navigate('/');
          toast.error('Access denied. Admin privileges required.');
        }
      }
    };

    verifyAdminAccess();
  }, [user, roles, authLoading, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user || !roles.includes('admin')) return;

      const { data: employersData } = await supabase
        .from('employers')
        .select('*')
        .order('created_at', { ascending: false });

      setEmployers(employersData || []);

      const { data: disputesData } = await supabase.rpc('get_admin_disputes');

      if (disputesData && disputesData.length > 0) {
        const userIds = disputesData.map(d => d.user_id);
        const recordIds = disputesData.map(d => d.employment_record_id);
        
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, profile_id')
          .in('user_id', userIds);

        const { data: recordsData } = await supabase
          .from('employment_records')
          .select('id, job_title, employer_id')
          .in('id', recordIds);

        const employerIds = recordsData?.map(r => r.employer_id) || [];
        const { data: employersData } = await supabase
          .from('employers')
          .select('id, company_name')
          .in('id', employerIds);

        const disputesWithData = disputesData.map(dispute => ({
          ...dispute,
          user: profilesData?.find(p => p.user_id === dispute.user_id) || null,
          employment_record: (() => {
            const record = recordsData?.find(r => r.id === dispute.employment_record_id);
            return record ? {
              job_title: record.job_title,
              employer: employersData?.find(e => e.id === record.employer_id) || null
            } : null;
          })()
        }));
        setDisputes(disputesWithData as Dispute[]);
      } else {
        setDisputes([]);
      }
      setIsLoading(false);
    };

    if (user && roles.includes('admin')) {
      fetchData();
    }
  }, [user, roles]);

  const handleVerifyEmployer = async (approved: boolean) => {
    if (!selectedEmployer) return;

    const { error } = await supabase
      .from('employers')
      .update({
        is_verified: approved,
        verification_status: approved ? 'approved' : 'rejected',
        verification_notes: verificationNotes,
      })
      .eq('id', selectedEmployer.id);

    if (error) {
      toast.error('Failed to update employer');
      return;
    }

    if (approved) {
      const { data: employer } = await supabase
        .from('employers')
        .select('user_id')
        .eq('id', selectedEmployer.id)
        .single();

      if (employer) {
        await supabase.from('user_roles').upsert({
          user_id: employer.user_id,
          role: 'employer',
        });
      }
    }

    toast.success(approved ? 'Employer verified successfully' : 'Employer rejected');
    setSelectedEmployer(null);
    setVerificationNotes('');

    const { data } = await supabase
      .from('employers')
      .select('*')
      .order('created_at', { ascending: false });
    setEmployers(data || []);
  };

  const handleResolveDispute = async (status: 'resolved' | 'rejected') => {
    if (!selectedDispute || !user) return;

    const { error } = await supabase
      .from('disputes')
      .update({
        status,
        admin_notes: adminNotes,
        resolved_by: user.id,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', selectedDispute.id);

    if (error) {
      toast.error('Failed to update dispute');
      return;
    }

    toast.success(`Dispute ${status}`);
    setSelectedDispute(null);
    setAdminNotes('');

    window.location.reload();
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-warning border-warning"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge className="bg-verified text-verified-foreground"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      case 'open':
        return <Badge variant="outline" className="text-warning border-warning"><Clock className="w-3 h-3 mr-1" />Open</Badge>;
      case 'under_review':
        return <Badge variant="secondary"><FileText className="w-3 h-3 mr-1" />Under Review</Badge>;
      case 'resolved':
        return <Badge className="bg-verified text-verified-foreground"><CheckCircle className="w-3 h-3 mr-1" />Resolved</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const pendingEmployers = employers.filter(e => e.verification_status === 'pending');
  const openDisputes = disputes.filter(d => d.status === 'open' || d.status === 'under_review');

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Admin Header */}
          <div className="glass-card rounded-2xl p-6 mb-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <Shield className="w-8 h-8 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-2xl font-display font-bold text-foreground">
                    Admin Dashboard
                  </h1>
                  <p className="text-muted-foreground">
                    Manage employer verifications and disputes
                  </p>
                </div>
              </div>
              <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="glass-card rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{pendingEmployers.length}</p>
              <p className="text-sm text-muted-foreground">Pending Verifications</p>
            </div>
            <div className="glass-card rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{employers.filter(e => e.is_verified).length}</p>
              <p className="text-sm text-muted-foreground">Verified Employers</p>
            </div>
            <div className="glass-card rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{openDisputes.length}</p>
              <p className="text-sm text-muted-foreground">Open Disputes</p>
            </div>
            <div className="glass-card rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{disputes.filter(d => d.status === 'resolved').length}</p>
              <p className="text-sm text-muted-foreground">Resolved Disputes</p>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex flex-wrap gap-2 mb-6">
            <Button 
              variant={activeSection === 'analytics' ? 'default' : 'outline'}
              onClick={() => setActiveSection('analytics')}
              className="gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              Analytics
            </Button>
            <Button 
              variant={activeSection === 'employers' ? 'default' : 'outline'}
              onClick={() => setActiveSection('employers')}
              className="gap-2"
            >
              <Building2 className="w-4 h-4" />
              Employer Verifications
              {pendingEmployers.length > 0 && (
                <Badge variant="secondary" className="ml-1">{pendingEmployers.length}</Badge>
              )}
            </Button>
            <Button 
              variant={activeSection === 'disputes' ? 'default' : 'outline'}
              onClick={() => setActiveSection('disputes')}
              className="gap-2"
            >
              <AlertTriangle className="w-4 h-4" />
              Disputes
              {openDisputes.length > 0 && (
                <Badge variant="secondary" className="ml-1">{openDisputes.length}</Badge>
              )}
            </Button>
          </div>

          {/* Content Sections */}
          {activeSection === 'analytics' && (
            <AdminAnalytics employers={employers} disputes={disputes} />
          )}

          {activeSection === 'employers' && (
            <div className="glass-card rounded-2xl p-6">
              <h2 className="text-xl font-display font-semibold text-foreground mb-6">
                Employer Verification Queue
              </h2>
              
              <div className="space-y-4">
                {employers.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No employer registrations yet.</p>
                  </div>
                ) : (
                  employers.map(employer => (
                    <div 
                      key={employer.id}
                      className="p-5 border border-border rounded-xl hover:shadow-card transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                            <Building2 className="w-6 h-6 text-muted-foreground" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">
                              {employer.company_name}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {employer.industry} • {employer.country}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Reg: {employer.registration_number || 'Not provided'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(employer.verification_status)}
                          {employer.verification_status === 'pending' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedEmployer(employer)}
                            >
                              Review
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeSection === 'disputes' && (
            <div className="glass-card rounded-2xl p-6">
              <h2 className="text-xl font-display font-semibold text-foreground mb-6">
                Dispute Resolution
              </h2>
              
              <div className="space-y-4">
                {disputes.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No disputes filed yet.</p>
                  </div>
                ) : (
                  disputes.map(dispute => (
                    <div 
                      key={dispute.id}
                      className="p-5 border border-border rounded-xl hover:shadow-card transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-foreground">
                              {dispute.user?.first_name} {dispute.user?.last_name}
                            </h3>
                            <Badge variant="secondary" className="text-xs">
                              {dispute.user?.profile_id}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            Re: {dispute.employment_record?.job_title} at {dispute.employment_record?.employer?.company_name}
                          </p>
                          <p className="text-sm text-foreground bg-muted p-3 rounded-lg">
                            "{dispute.reason}"
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            Filed {new Date(dispute.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(dispute.status)}
                          {(dispute.status === 'open' || dispute.status === 'under_review') && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedDispute(dispute)}
                            >
                              Review
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Employer Verification Dialog */}
      <Dialog open={!!selectedEmployer} onOpenChange={() => setSelectedEmployer(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Verify Employer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-muted-foreground">Company Name</Label>
                <p className="font-medium">{selectedEmployer?.company_name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Registration #</Label>
                <p className="font-medium">{selectedEmployer?.registration_number || '-'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Industry</Label>
                <p className="font-medium">{selectedEmployer?.industry || '-'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Country</Label>
                <p className="font-medium">{selectedEmployer?.country || '-'}</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Verification Notes</Label>
              <Textarea
                placeholder="Add notes about this verification..."
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button 
              variant="destructive" 
              onClick={() => handleVerifyEmployer(false)}
            >
              Reject
            </Button>
            <Button onClick={() => handleVerifyEmployer(true)}>
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dispute Resolution Dialog */}
      <Dialog open={!!selectedDispute} onOpenChange={() => setSelectedDispute(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Resolve Dispute</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-muted-foreground">Dispute Reason</Label>
              <p className="text-sm bg-muted p-3 rounded-lg mt-1">
                "{selectedDispute?.reason}"
              </p>
            </div>
            <div className="space-y-2">
              <Label>Admin Notes</Label>
              <Textarea
                placeholder="Add resolution notes..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button 
              variant="destructive" 
              onClick={() => handleResolveDispute('rejected')}
            >
              Reject Dispute
            </Button>
            <Button onClick={() => handleResolveDispute('resolved')}>
              Resolve in User's Favor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
