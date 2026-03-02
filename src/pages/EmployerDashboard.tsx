import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { AutocompleteInput } from '@/components/ui/autocomplete-input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { departments } from '@/lib/countries';
import { 
  Building2, 
  Users, 
  UserPlus,
  Calendar,
  Briefcase,
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
  LogOut,
  AlertTriangle,
  UserSearch,
  History,
  Globe,
  Phone,
  MapPin,
  Mail,
  Settings,
  Upload,
  Edit,
  FileText,
  Sparkles,
  PenLine
} from 'lucide-react';
import { toast } from 'sonner';
import { TalentSearch } from '@/components/employer/TalentSearch';
import { AuditLogViewer } from '@/components/employer/AuditLogViewer';
import { BulkUpload } from '@/components/employer/BulkUpload';
import { CompanyProfileEditor } from '@/components/employer/CompanyProfileEditor';
import { EmployerAIChat } from '@/components/employer/EmployerAIChat';
import { EmployerExperienceRequests } from '@/components/employer/EmployerExperienceRequests';

interface Employer {
  id: string;
  employer_id: string;
  company_name: string;
  industry: string | null;
  country: string | null;
  website: string | null;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  is_verified: boolean;
  verification_status: string;
}

interface EmploymentRecord {
  record_id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  profile_id: string;
  job_title: string;
  department: string | null;
  employment_type: string;
  start_date: string;
  end_date: string | null;
  status: string;
}

export default function EmployerDashboard() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, authStatus, signOut } = useAuth();
  const [employer, setEmployer] = useState<Employer | null>(null);
  const [employees, setEmployees] = useState<EmploymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addEmployeeOpen, setAddEmployeeOpen] = useState(false);
  const [endEmploymentOpen, setEndEmploymentOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<string | null>(null);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [isAddingEmployee, setIsAddingEmployee] = useState(false);
  
  // Referral letter states
  const [referralStep, setReferralStep] = useState<'end' | 'ask' | 'write'>('end');
  const [referralMode, setReferralMode] = useState<'ai' | 'manual' | null>(null);
  const [referralContent, setReferralContent] = useState('');
  const [referralNotes, setReferralNotes] = useState('');
  const [isGeneratingLetter, setIsGeneratingLetter] = useState(false);
  const [isSavingLetter, setIsSavingLetter] = useState(false);
  const [showTalentSearch, setShowTalentSearch] = useState(false);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [showCompanyProfile, setShowCompanyProfile] = useState(false);
  const [activeSection, setActiveSection] = useState<'employees' | 'all' | 'talent' | 'profile' | 'audit' | 'requests'>('employees');
  
  const [newEmployee, setNewEmployee] = useState({
    profileId: '',
    jobTitle: '',
    department: '',
    employmentType: 'full_time',
    startDate: '',
  });

  const normalizedProfileId = useMemo(() => newEmployee.profileId.trim().toUpperCase(), [newEmployee.profileId]);

  const fetchEmployeesForEmployer = async (employerId: string) => {
    const { data, error } = await supabase.rpc('get_employer_employee_details', {
      employer_id_param: employerId,
    });

    if (error) {
      console.error('Failed to fetch employees');
      setEmployees([]);
      return;
    }

    setEmployees((data as EmploymentRecord[]) || []);
  };

  useEffect(() => {
    if (authStatus === 'loading') return;
    if (authStatus === 'unauthenticated') {
      window.location.href = '/login';
      return;
    }
  }, [authStatus, navigate]);

  useEffect(() => {
    const fetchEmployerData = async () => {
      if (!user) return;

      const { data: employerData } = await supabase
        .from('employers')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!employerData) {
        navigate('/register?type=employer');
        return;
      }

      setEmployer(employerData);
      await fetchEmployeesForEmployer(employerData.id);
      setIsLoading(false);
    };

    if (user) {
      fetchEmployerData();
    }
  }, [user, navigate]);

  const handleAddEmployee = async () => {
    if (!normalizedProfileId || !newEmployee.jobTitle || !newEmployee.startDate || !employer) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsAddingEmployee(true);
    try {
      const { data: profileResults, error: profileError } = await supabase.rpc('get_public_profile_by_id', {
        profile_id_param: normalizedProfileId,
      });
      const profileData = profileResults && profileResults.length > 0 ? profileResults[0] : null;

      if (profileError || !profileData?.user_id) {
        toast.error('Profile ID not found. Please check and try again.');
        return;
      }

      const { error } = await supabase.from('employment_records').insert({
        user_id: profileData.user_id,
        employer_id: employer.id,
        job_title: newEmployee.jobTitle.trim(),
        department: newEmployee.department.trim() ? newEmployee.department.trim() : null,
        employment_type: newEmployee.employmentType,
        start_date: newEmployee.startDate,
        status: 'active',
      });

      if (error) {
        if (error.code === '42501') {
          toast.error('Your company must be verified before adding employees');
        } else {
          toast.error('Failed to add employee');
        }
        return;
      }

      toast.success(`Employment record created for ${normalizedProfileId}`);
      setAddEmployeeOpen(false);
      setNewEmployee({
        profileId: '',
        jobTitle: '',
        department: '',
        employmentType: 'full_time',
        startDate: '',
      });

      await fetchEmployeesForEmployer(employer.id);
    } finally {
      setIsAddingEmployee(false);
    }
  };

  const handleEndEmployment = async () => {
    if (!selectedRecord) return;

    const { error } = await supabase
      .from('employment_records')
      .update({
        end_date: endDate,
        status: 'ended',
      })
      .eq('id', selectedRecord);

    if (error) {
      toast.error('Failed to end employment');
      return;
    }

    toast.success('Employment record closed successfully');

    setEmployees(employees.map(e => 
      e.record_id === selectedRecord 
        ? { ...e, end_date: endDate, status: 'ended' }
        : e
    ));

    // Move to referral letter prompt
    setReferralStep('ask');
  };

  const getSelectedEmployee = () => {
    return employees.find(e => e.record_id === selectedRecord);
  };

  const handleGenerateAILetter = async () => {
    const emp = getSelectedEmployee();
    if (!emp || !employer) return;

    setIsGeneratingLetter(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-referral-letter', {
        body: {
          employeeName: `${emp.first_name} ${emp.last_name}`,
          jobTitle: emp.job_title,
          department: emp.department,
          companyName: employer.company_name,
          startDate: new Date(emp.start_date).toLocaleDateString(),
          endDate: new Date(endDate).toLocaleDateString(),
          additionalNotes: referralNotes,
        },
      });

      if (error) throw error;
      setReferralContent(data.letter || '');
      setReferralMode('ai');
      setReferralStep('write');
    } catch (e) {
      console.error(e);
      toast.error('Failed to generate letter. You can write one manually.');
      setReferralMode('manual');
      setReferralStep('write');
    } finally {
      setIsGeneratingLetter(false);
    }
  };

  const handleSaveReferralLetter = async () => {
    const emp = getSelectedEmployee();
    if (!emp || !employer || !referralContent.trim()) {
      toast.error('Please write the referral letter content');
      return;
    }

    setIsSavingLetter(true);
    try {
      const { error } = await supabase.from('referral_letters').insert({
        employment_record_id: selectedRecord!,
        employer_id: employer.id,
        employee_user_id: emp.user_id,
        content: referralContent.trim(),
        generated_by: referralMode || 'manual',
      });

      if (error) throw error;
      toast.success('Referral letter saved successfully');
      closeEndEmploymentDialog();
    } catch (e) {
      console.error(e);
      toast.error('Failed to save referral letter');
    } finally {
      setIsSavingLetter(false);
    }
  };

  const closeEndEmploymentDialog = () => {
    setEndEmploymentOpen(false);
    setSelectedRecord(null);
    setReferralStep('end');
    setReferralMode(null);
    setReferralContent('');
    setReferralNotes('');
  };

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/';
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!employer) {
    return null;
  }

  const activeEmployees = employees.filter(e => e.status === 'active');

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Employer Header with Company Info */}
          <div className="glass-card rounded-2xl p-6 mb-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div 
                  className={`w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center overflow-hidden ${!employer.logo_url ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                  onClick={() => { if (!employer.logo_url) setActiveSection('profile'); }}
                  title={!employer.logo_url ? 'Click to upload your company logo' : undefined}
                >
                  {employer.logo_url ? (
                    <img 
                      src={employer.logo_url} 
                      alt={`${employer.company_name} logo`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <Upload className="w-6 h-6 text-primary-foreground" />
                      <span className="text-[10px] text-primary-foreground font-medium">Add Logo</span>
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-display font-bold text-foreground">
                      {employer.company_name}
                    </h1>
                    {employer.is_verified && <VerifiedBadge />}
                  </div>
                  <p className="text-muted-foreground">
                    {employer.industry || 'Industry not specified'} • {employer.country || 'Country not specified'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Employer ID: {employer.employer_id}
                  </p>
                  {!employer.is_verified && (
                    <div className="flex items-center gap-1 mt-1 text-sm text-warning">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Pending verification</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={() => setAddEmployeeOpen(true)} disabled={!employer.is_verified}>
                  <UserPlus className="w-4 h-4" />
                  Add Employee
                </Button>
                <Button variant="outline" onClick={handleSignOut}>
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </Button>
              </div>
            </div>
          </div>

          {!employer.is_verified && employer.verification_status === 'rejected' && (
            <div className="glass-card rounded-2xl p-6 mb-8 border-destructive/50 bg-destructive/5">
              <div className="flex items-start gap-4">
                <XCircle className="w-6 h-6 text-destructive" />
                <div>
                  <h3 className="font-semibold text-foreground">Verification Rejected</h3>
                  <p className="text-muted-foreground">
                    Your company verification was not approved. Please review and update your company profile, 
                    then contact support to resubmit for verification.
                  </p>
                </div>
              </div>
            </div>
          )}

          {!employer.is_verified && employer.verification_status !== 'rejected' && (
            <div className="glass-card rounded-2xl p-6 mb-8 border-warning/50 bg-warning/5">
              <div className="flex items-start gap-4">
                <Clock className="w-6 h-6 text-warning" />
                <div>
                  <h3 className="font-semibold text-foreground">Verification Pending</h3>
                  <p className="text-muted-foreground">
                    Your company is currently being verified. This typically takes 24-48 hours. 
                    Once verified, you'll be able to add employment records.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="glass-card rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{activeEmployees.length}</p>
              <p className="text-sm text-muted-foreground">Active Employees</p>
            </div>
            <div className="glass-card rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{employees.filter(e => e.status === 'ended').length}</p>
              <p className="text-sm text-muted-foreground">Past Employees</p>
            </div>
            <div className="glass-card rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{employees.length}</p>
              <p className="text-sm text-muted-foreground">Total Records</p>
            </div>
            <div className="glass-card rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-verified">{employer.is_verified ? 'Verified' : 'Pending'}</p>
              <p className="text-sm text-muted-foreground">Company Status</p>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex flex-wrap gap-2 mb-6">
            <Button 
              variant={activeSection === 'employees' ? 'default' : 'outline'}
              onClick={() => setActiveSection('employees')}
              className="gap-2"
            >
              <Users className="w-4 h-4" />
              Current Employees
            </Button>
            <Button 
              variant={activeSection === 'all' ? 'default' : 'outline'}
              onClick={() => setActiveSection('all')}
              className="gap-2"
            >
              <Briefcase className="w-4 h-4" />
              All Records
            </Button>
            <Button 
              variant={activeSection === 'talent' ? 'default' : 'outline'}
              onClick={() => setActiveSection('talent')}
              className="gap-2"
            >
              <UserSearch className="w-4 h-4" />
              Find Talent
            </Button>
            <Button 
              variant={activeSection === 'profile' ? 'default' : 'outline'}
              onClick={() => setActiveSection('profile')}
              className="gap-2"
            >
              <Building2 className="w-4 h-4" />
              Company Profile
            </Button>
            <Button 
              variant={activeSection === 'requests' ? 'default' : 'outline'}
              onClick={() => setActiveSection('requests')}
              className="gap-2"
            >
              <Edit className="w-4 h-4" />
              Update Requests
            </Button>
            <Button 
              variant={activeSection === 'audit' ? 'default' : 'outline'}
              onClick={() => setActiveSection('audit')}
              className="gap-2"
            >
              <History className="w-4 h-4" />
              Audit Log
            </Button>
          </div>

          {/* Content Sections */}
          {activeSection === 'employees' && (
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-display font-semibold text-foreground">
                  Active Employment Records
                </h2>
                {employer.is_verified && (
                  <BulkUpload 
                    employerId={employer.id} 
                    onComplete={() => fetchEmployeesForEmployer(employer.id)} 
                  />
                )}
              </div>
              
              <div className="space-y-4">
                {activeEmployees.map(record => (
                  <div 
                    key={record.record_id}
                    className="p-5 border border-border rounded-xl hover:shadow-card transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                          <Briefcase className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-foreground">
                              {record.first_name} {record.last_name}
                            </h3>
                            <Badge variant="secondary" className="text-xs">
                              {record.profile_id}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground">{record.job_title}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              Started {new Date(record.start_date).toLocaleDateString()}
                            </span>
                            {record.department && (
                              <span>{record.department}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-verified/10 text-verified">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Active
                        </Badge>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedRecord(record.record_id);
                            setEndEmploymentOpen(true);
                          }}
                        >
                          End Employment
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {activeEmployees.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No active employees. Add your first employee above.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === 'all' && (
            <div className="glass-card rounded-2xl p-6">
              <h2 className="text-xl font-display font-semibold text-foreground mb-6">
                All Employment Records
              </h2>
              
              <div className="space-y-4">
                {employees.map(record => (
                  <div 
                    key={record.record_id}
                    className="p-5 border border-border rounded-xl hover:shadow-card transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                          <Briefcase className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-foreground">
                              {record.first_name} {record.last_name}
                            </h3>
                            <Badge variant="secondary" className="text-xs">
                              {record.profile_id}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground">{record.job_title}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {new Date(record.start_date).toLocaleDateString()} — {record.end_date ? new Date(record.end_date).toLocaleDateString() : 'Present'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {record.status === 'active' ? (
                          <Badge className="bg-verified/10 text-verified">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <XCircle className="w-3 h-3 mr-1" />
                            Ended
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {employees.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No employment records yet.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === 'talent' && (
            <div className="glass-card rounded-2xl p-6">
              <h2 className="text-xl font-display font-semibold text-foreground mb-6">
                Find Talent
              </h2>
              <TalentSearch />
            </div>
          )}

          {activeSection === 'profile' && (
            <div className="glass-card rounded-2xl p-6">
              <h2 className="text-xl font-display font-semibold text-foreground mb-6">
                Company Profile
              </h2>
              <CompanyProfileEditor 
                employer={employer} 
                userEmail={user?.email || ''}
                userId={user?.id || ''}
                onUpdate={(updated) => setEmployer(updated)} 
              />
            </div>
          )}

          {activeSection === 'requests' && (
            <div className="glass-card rounded-2xl p-6">
              <EmployerExperienceRequests employerId={employer.id} />
            </div>
          )}

          {activeSection === 'audit' && (
            <div className="glass-card rounded-2xl p-6">
              <h2 className="text-xl font-display font-semibold text-foreground mb-6">
                Audit Log
              </h2>
              <AuditLogViewer employerId={employer.id} />
            </div>
          )}
        </div>
      </main>

      {/* Add Employee Dialog */}
      <Dialog open={addEmployeeOpen} onOpenChange={setAddEmployeeOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Employee</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Employee Profile ID *</Label>
              <Input
                placeholder="e.g., KW-2024-XXXXX"
                value={newEmployee.profileId}
                onChange={(e) => setNewEmployee({...newEmployee, profileId: e.target.value})}
              />
              <p className="text-xs text-muted-foreground">
                Ask the employee for their Global Career ID
              </p>
            </div>
            <div className="space-y-2">
              <Label>Job Title *</Label>
              <Input
                placeholder="e.g., Software Engineer"
                value={newEmployee.jobTitle}
                onChange={(e) => setNewEmployee({...newEmployee, jobTitle: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <AutocompleteInput
                placeholder="e.g., Engineering"
                value={newEmployee.department}
                onValueChange={(value) => setNewEmployee({...newEmployee, department: value})}
                suggestions={departments}
              />
            </div>
            <div className="space-y-2">
              <Label>Employment Type *</Label>
              <Select
                value={newEmployee.employmentType}
                onValueChange={(value) => setNewEmployee({...newEmployee, employmentType: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_time">Full-time</SelectItem>
                  <SelectItem value="part_time">Part-time</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="internship">Internship</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Start Date *</Label>
              <Input
                type="date"
                value={newEmployee.startDate}
                onChange={(e) => setNewEmployee({...newEmployee, startDate: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddEmployeeOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddEmployee} disabled={isAddingEmployee}>
              {isAddingEmployee ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Employee'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* End Employment & Referral Letter Dialog */}
      <Dialog open={endEmploymentOpen} onOpenChange={(open) => {
        if (!open) closeEndEmploymentDialog();
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {referralStep === 'end' && 'End Employment'}
              {referralStep === 'ask' && 'Write a Referral Letter?'}
              {referralStep === 'write' && 'Referral Letter'}
            </DialogTitle>
            {referralStep === 'ask' && (
              <DialogDescription>
                Employment has been ended. Would you like to write a referral letter for this employee?
              </DialogDescription>
            )}
          </DialogHeader>

          {/* Step 1: End employment */}
          {referralStep === 'end' && (
            <>
              <div className="space-y-4 py-4">
                <p className="text-sm text-muted-foreground">
                  This will mark the employment record as ended. This action cannot be undone.
                </p>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeEndEmploymentDialog}>
                  Cancel
                </Button>
                <Button onClick={handleEndEmployment}>
                  Confirm End Employment
                </Button>
              </DialogFooter>
            </>
          )}

          {/* Step 2: Ask about referral letter */}
          {referralStep === 'ask' && (
            <>
              <div className="space-y-4 py-4">
                {getSelectedEmployee() && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="font-medium text-foreground">
                      {getSelectedEmployee()!.first_name} {getSelectedEmployee()!.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {getSelectedEmployee()!.job_title}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Additional notes for the AI (optional)</Label>
                  <Textarea
                    value={referralNotes}
                    onChange={(e) => setReferralNotes(e.target.value)}
                    placeholder="e.g. Excellent team player, led key projects, strong leadership skills..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter className="flex-col gap-2 sm:flex-row">
                <Button variant="outline" onClick={closeEndEmploymentDialog}>
                  Skip
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setReferralMode('manual');
                    setReferralStep('write');
                  }}
                  className="gap-2"
                >
                  <PenLine className="w-4 h-4" />
                  Write Manually
                </Button>
                <Button
                  onClick={handleGenerateAILetter}
                  disabled={isGeneratingLetter}
                  className="gap-2"
                >
                  {isGeneratingLetter ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  {isGeneratingLetter ? 'Generating...' : 'Generate with AI'}
                </Button>
              </DialogFooter>
            </>
          )}

          {/* Step 3: Write/Edit referral letter */}
          {referralStep === 'write' && (
            <>
              <div className="space-y-4 py-2">
                {getSelectedEmployee() && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="w-4 h-4" />
                    <span>
                      Letter for {getSelectedEmployee()!.first_name} {getSelectedEmployee()!.last_name} — {getSelectedEmployee()!.job_title}
                    </span>
                  </div>
                )}
                <Textarea
                  value={referralContent}
                  onChange={(e) => setReferralContent(e.target.value)}
                  placeholder="Write your referral letter here..."
                  rows={14}
                  className="font-mono text-sm"
                />
                {referralMode === 'ai' && (
                  <p className="text-xs text-muted-foreground">
                    ✨ AI-generated draft — feel free to edit before saving.
                  </p>
                )}
              </div>
              <DialogFooter className="flex-col gap-2 sm:flex-row">
                <Button variant="outline" onClick={() => setReferralStep('ask')}>
                  Back
                </Button>
                <Button
                  onClick={handleSaveReferralLetter}
                  disabled={isSavingLetter || !referralContent.trim()}
                  className="gap-2"
                >
                  {isSavingLetter ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                  {isSavingLetter ? 'Saving...' : 'Save Letter'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Employer AI Chat */}
      <EmployerAIChat
        employerId={employer.id}
        companyName={employer.company_name}
        employeeCount={employees.length}
        isVerified={employer.is_verified}
      />

      <Footer />
    </div>
  );
}
