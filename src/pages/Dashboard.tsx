import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ProfileIdCard } from '@/components/ProfileIdCard';
import { EmploymentTimeline } from '@/components/EmploymentTimeline';
import { ReferralLettersViewer } from '@/components/dashboard/ReferralLettersViewer';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { WorkHistory } from '@/components/dashboard/WorkHistory';
import { PendingApprovals } from '@/components/dashboard/PendingApprovals';
import { ProfileVisibilityToggle } from '@/components/dashboard/ProfileVisibilityToggle';
import { MissingFieldsPrompt } from '@/components/dashboard/MissingFieldsPrompt';
import { ExperienceUpdateRequest } from '@/components/dashboard/ExperienceUpdateRequest';
import { AISkillSuggestions } from '@/components/AISkillSuggestions';
import { NotificationSettings } from '@/components/dashboard/NotificationSettings';
import { TwoFactorSettings } from '@/components/dashboard/TwoFactorSettings';
import { AdminSettings } from '@/components/dashboard/AdminSettings';
import { AIChatWidget } from '@/components/AIChatWidget';
import { AIOnboardingWizard } from '@/components/AIOnboardingWizard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  User, 
  Briefcase, 
  Share2, 
  Settings, 
  Plus, 
  X,
  AlertTriangle,
  Loader2,
  LogOut,
  Award,
  Building2
} from 'lucide-react';
import { toast } from 'sonner';
import { skillSchema, disputeReasonSchema, validateField } from '@/lib/validation';

interface EmploymentRecord {
  id: string;
  job_title: string;
  department: string | null;
  employment_type: string;
  start_date: string;
  end_date: string | null;
  status: string;
  employer: {
    company_name: string;
    is_verified: boolean;
  };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, profile, roles, isLoading: authLoading, authStatus, signOut, refreshProfile } = useAuth();
  const [records, setRecords] = useState<EmploymentRecord[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeRecordId, setDisputeRecordId] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [isLoadingRecords, setIsLoadingRecords] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showMissingFields, setShowMissingFields] = useState(false);

  // Auto-retry profile fetch if authenticated but profile is null (trigger delay)
  useEffect(() => {
    if (authStatus === 'authenticated' && !profile && user) {
      const retryTimer = setInterval(() => {
        refreshProfile();
      }, 2000);
      const timeout = setTimeout(() => clearInterval(retryTimer), 15000);
      return () => { clearInterval(retryTimer); clearTimeout(timeout); };
    }
  }, [authStatus, profile, user, refreshProfile]);

  // Check user roles
  const isEmployer = roles.includes('employer');
  const isJobSeeker = roles.includes('job_seeker');
  const isAdmin = roles.includes('admin');

  // Check if user needs onboarding (only for job seekers with no skills/bio)
  useEffect(() => {
    if (profile && !authLoading && isJobSeeker && !isAdmin && !isEmployer) {
      const isNewUser = (!profile.skills || profile.skills.length === 0) && !profile.bio;
      if (isNewUser) {
        const timer = setTimeout(() => setShowOnboarding(true), 1000);
        return () => clearTimeout(timer);
      }
      // Check for missing mandatory fields (national_id is mandatory)
      if (!profile.national_id) {
        const timer = setTimeout(() => setShowMissingFields(true), 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [profile, authLoading, isJobSeeker, isAdmin, isEmployer]);

  useEffect(() => {
    if (authStatus === 'loading') return;
    if (authStatus === 'unauthenticated') {
      window.location.href = '/login';
      return;
    }
    if (roles.includes('admin')) {
      navigate('/admin');
    } else if (profile?.account_type === 'organization') {
      navigate('/employer');
    }
  }, [authStatus, user, profile, roles, navigate]);

  useEffect(() => {
    if (profile) {
      setSkills(profile.skills || []);
    }
  }, [profile]);

  const fetchRecords = useCallback(async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('employment_records')
      .select(`
        id,
        job_title,
        department,
        employment_type,
        start_date,
        end_date,
        status,
        employer_id,
        employer:employers(company_name, is_verified)
      `)
      .eq('user_id', user.id)
      .in('status', ['active', 'ended', 'disputed'])
      .order('start_date', { ascending: false });

    if (error) {
      console.error('Error fetching records:', error);
    } else {
      setRecords(data || []);
    }
    setIsLoadingRecords(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchRecords();
    }
  }, [user, fetchRecords]);

  const addSkill = async () => {
    if (!user) return;
    
    const trimmedSkill = newSkill.trim();
    
    // Validate skill
    const validation = validateField(skillSchema, trimmedSkill);
    if (!validation.success) {
      toast.error(validation.error);
      return;
    }
    
    if (skills.includes(trimmedSkill)) {
      toast.error('Skill already exists');
      return;
    }
    
    if (skills.length >= 50) {
      toast.error('Maximum 50 skills allowed');
      return;
    }
    
    const updatedSkills = [...skills, trimmedSkill];
    setSkills(updatedSkills);
    setNewSkill('');
    
    await supabase
      .from('profiles')
      .update({ skills: updatedSkills })
      .eq('user_id', user.id);
    
    toast.success('Skill added');
    
    // Send profile update email
    if (profile) {
      try {
        await supabase.functions.invoke("notify-profile-update", {
          body: {
            email: profile.email,
            first_name: profile.first_name,
            update_type: "skills_updated",
            details: updatedSkills.join(", "),
          },
        });
      } catch (e) { console.warn("Profile update email failed:", e); }
    }
  };

  const removeSkill = async (skill: string) => {
    if (!user) return;
    
    const updatedSkills = skills.filter(s => s !== skill);
    setSkills(updatedSkills);
    
    await supabase
      .from('profiles')
      .update({ skills: updatedSkills })
      .eq('user_id', user.id);
    
    toast.success('Skill removed');
    
    // Send profile update email
    if (profile) {
      try {
        await supabase.functions.invoke("notify-profile-update", {
          body: {
            email: profile.email,
            first_name: profile.first_name,
            update_type: "skills_updated",
            details: updatedSkills.join(", "),
          },
        });
      } catch (e) { console.warn("Profile update email failed:", e); }
    }
  };

  const handleDispute = (recordId: string) => {
    setDisputeRecordId(recordId);
    setDisputeOpen(true);
  };

  const submitDispute = async () => {
    if (!disputeRecordId || !user) return;

    // Validate dispute reason
    const validation = validateField(disputeReasonSchema, disputeReason);
    if (!validation.success) {
      toast.error(validation.error);
      return;
    }

    const { error } = await supabase.from('disputes').insert({
      employment_record_id: disputeRecordId,
      user_id: user.id,
      reason: disputeReason.trim(),
    });

    if (error) {
      toast.error('Failed to submit dispute');
      return;
    }

    toast.success('Dispute submitted for review');
    setDisputeOpen(false);
    setDisputeReason('');
    setDisputeRecordId(null);
  };

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/';
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Setting up your profile...</p>
          <p className="text-xs text-muted-foreground">This may take a moment</p>
          <Button variant="outline" size="sm" onClick={() => refreshProfile()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Transform records for the timeline component
  const timelineRecords = records.map(r => ({
    id: r.id,
    userId: user!.id,
    employerId: '',
    jobTitle: r.job_title,
    department: r.department || undefined,
    employmentType: r.employment_type as 'full_time' | 'part_time' | 'contract' | 'internship',
    startDate: r.start_date,
    endDate: r.end_date || undefined,
    status: r.status as 'active' | 'ended' | 'disputed' | 'pending',
    employerName: r.employer?.company_name || 'Unknown Company',
    employerVerified: r.employer?.is_verified || false,
  }));

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Welcome Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-display font-bold text-foreground">
                Welcome{isJobSeeker && !isEmployer ? `, ${profile.first_name}` : ''}
              </h1>
              <p className="text-muted-foreground mt-1">
                {isAdmin ? 'Platform Administration' : isEmployer ? 'Employer Dashboard' : 'Manage your verified professional profile'}
              </p>
            </div>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* Pending Approvals - Priority Section */}
              <PendingApprovals onApprovalChange={fetchRecords} />
              
              <ProfileIdCard 
                profileId={profile.profile_id}
                name={`${profile.first_name} ${profile.last_name}`}
                isVerified={records.length > 0}
              />

              {/* Quick Stats */}
              <div className="glass-card rounded-2xl p-6">
                <h3 className="font-semibold text-foreground mb-4">Profile Overview</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Verified Records</span>
                    <span className="font-semibold text-foreground">{records.filter(r => r.status === 'active' || r.status === 'ended').length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Current Status</span>
                    <Badge variant="default" className="bg-verified text-verified-foreground">
                      {records.some(r => r.status === 'active') ? 'Employed' : 'Available'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-2">
              <Tabs defaultValue={isJobSeeker && !isAdmin ? "timeline" : "profile"} className="w-full">
                <TabsList className="mb-6">
                  {isJobSeeker && !isAdmin && (
                    <TabsTrigger value="timeline" className="gap-2">
                      <Briefcase className="w-4 h-4" />
                      Employer Records
                    </TabsTrigger>
                  )}
                  {isJobSeeker && !isAdmin && (
                    <TabsTrigger value="work-history" className="gap-2">
                      <Building2 className="w-4 h-4" />
                      Work History
                    </TabsTrigger>
                  )}
                  {isJobSeeker && !isAdmin && (
                    <TabsTrigger value="referral-letters" className="gap-2">
                      <Award className="w-4 h-4" />
                      Referral Letters
                    </TabsTrigger>
                  )}
                  <TabsTrigger value="profile" className="gap-2">
                    <User className="w-4 h-4" />
                    Profile
                  </TabsTrigger>
                  {isJobSeeker && !isAdmin && (
                    <TabsTrigger value="sharing" className="gap-2">
                      <Share2 className="w-4 h-4" />
                      Sharing
                    </TabsTrigger>
                  )}
                  <TabsTrigger value="settings" className="gap-2">
                    <Settings className="w-4 h-4" />
                    Settings
                  </TabsTrigger>
                </TabsList>

                {isJobSeeker && !isAdmin && (
                  <TabsContent value="timeline">
                    <div className="glass-card rounded-2xl p-6">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h2 className="text-xl font-display font-semibold text-foreground">
                            Employment Timeline
                          </h2>
                          <p className="text-sm text-muted-foreground">
                            Verified records added by your employers
                          </p>
                        </div>
                        {records.length > 0 && <VerifiedBadge label="All Verified" />}
                      </div>
                      
                      {isLoadingRecords ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : records.length > 0 ? (
                        <EmploymentTimeline 
                          records={timelineRecords} 
                          showDisputeButton 
                          onDispute={handleDispute}
                        />
                      ) : (
                        <div className="text-center py-12 text-muted-foreground">
                          <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>No employment records yet.</p>
                          <p className="text-sm">Records will appear here when employers add them.</p>
                        </div>
                      )}
                      
                      {/* Experience Update Requests */}
                      {records.length > 0 && (
                        <div className="mt-6 pt-6 border-t border-border">
                          <ExperienceUpdateRequest 
                            userId={user!.id} 
                            records={records.map(r => ({
                              id: r.id,
                              job_title: r.job_title,
                              department: r.department,
                              employment_type: r.employment_type,
                              start_date: r.start_date,
                              end_date: r.end_date,
                              status: r.status,
                              employer_id: (r as any).employer_id || '',
                              employer: { company_name: r.employer?.company_name || 'Unknown' },
                            }))} 
                          />
                        </div>
                      )}
                    </div>
                  </TabsContent>
                )}

                {isJobSeeker && !isAdmin && (
                  <TabsContent value="work-history">
                    <WorkHistory />
                  </TabsContent>
                )}

                {isJobSeeker && !isAdmin && (
                  <TabsContent value="referral-letters">
                    <ReferralLettersViewer />
                  </TabsContent>
                )}

                <TabsContent value="profile">
                  <div className="glass-card rounded-2xl p-6">
                    <h2 className="text-xl font-display font-semibold text-foreground mb-6">
                      Your Profile
                    </h2>
                    
                    <div className="space-y-6">
                      {/* Show personal info only for job seekers, not employers/admins */}
                      {isJobSeeker && !isEmployer && !isAdmin && (
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-muted-foreground">First Name</Label>
                            <p className="font-medium text-foreground">{profile.first_name}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Last Name</Label>
                            <p className="font-medium text-foreground">{profile.last_name}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Email</Label>
                            <p className="font-medium text-foreground">{profile.email}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Phone</Label>
                            <p className={`font-medium ${profile.phone ? 'text-foreground' : 'text-warning'}`}>
                              {profile.phone || '⚠ Not provided'}
                            </p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">National ID</Label>
                            <p className={`font-medium ${profile.national_id ? 'text-foreground' : 'text-warning'}`}>
                              {profile.national_id || '⚠ Required'}
                            </p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Passport Number</Label>
                            <p className="font-medium text-foreground">{profile.passport_number || 'Not provided'}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Country of Residence</Label>
                            <p className={`font-medium ${profile.country ? 'text-foreground' : 'text-warning'}`}>
                              {profile.country || '⚠ Not provided'}
                            </p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Citizenship</Label>
                            <p className={`font-medium ${profile.citizenship ? 'text-foreground' : 'text-warning'}`}>
                              {profile.citizenship || '⚠ Not provided'}
                            </p>
                          </div>
                          {!profile.national_id && (
                            <div className="md:col-span-2">
                              <Button 
                                variant="outline" 
                                className="border-warning text-warning hover:bg-warning/10"
                                onClick={() => setShowMissingFields(true)}
                              >
                                <AlertTriangle className="w-4 h-4" />
                                Complete Missing Fields
                              </Button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Admin profile view */}
                      {isAdmin && (
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-muted-foreground">Admin Email</Label>
                            <p className="font-medium text-foreground">{profile.email}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Role</Label>
                            <p className="font-medium text-foreground">Platform Administrator</p>
                          </div>
                        </div>
                      )}

                      {/* Employer redirect notice */}
                      {isEmployer && !isAdmin && (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground mb-4">
                            As an employer, your company profile is managed in the Employer Dashboard.
                          </p>
                          <Button onClick={() => navigate('/employer')}>
                            Go to Employer Dashboard
                          </Button>
                        </div>
                      )}

                      {isJobSeeker && !isAdmin && !isEmployer && (
                        <div className="border-t border-border pt-6">
                          <Label className="text-muted-foreground mb-3 block">Skills</Label>
                          <div className="flex flex-wrap gap-2 mb-4">
                            {skills.map(skill => (
                              <Badge 
                                key={skill} 
                                variant="secondary"
                                className="flex items-center gap-1 pr-1"
                              >
                                {skill}
                                <button 
                                  onClick={() => removeSkill(skill)}
                                  className="p-0.5 hover:bg-muted rounded"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                          <div className="flex gap-2 mb-4">
                            <Input
                              placeholder="Add a skill..."
                              value={newSkill}
                              onChange={(e) => setNewSkill(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                            />
                            <Button onClick={addSkill} size="icon">
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                          
                          {/* AI Skill Suggestions */}
                          <AISkillSuggestions 
                            currentSkills={skills} 
                            onAddSkill={async (skill) => {
                              if (!user || skills.includes(skill)) return;
                              const updatedSkills = [...skills, skill];
                              setSkills(updatedSkills);
                              await supabase
                                .from('profiles')
                                .update({ skills: updatedSkills })
                                .eq('user_id', user.id);
                              toast.success(`Added "${skill}"`);
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {isJobSeeker && !isAdmin && (
                  <TabsContent value="sharing">
                    <div className="glass-card rounded-2xl p-6">
                      <h2 className="text-xl font-display font-semibold text-foreground mb-2">
                        Share Your Profile
                      </h2>
                      <p className="text-muted-foreground mb-6">
                        Control who can view your verified work history
                      </p>

                      <div className="space-y-6">
                        <div className="p-4 border border-border rounded-xl">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <p className="font-medium text-foreground">Profile ID</p>
                              <p className="text-sm text-muted-foreground">
                                Share this ID with recruiters for instant verification
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <code className="flex-1 px-4 py-3 bg-muted rounded-lg font-mono text-lg">
                              {profile.profile_id}
                            </code>
                            <Button 
                              variant="outline"
                              onClick={() => {
                                navigator.clipboard.writeText(profile.profile_id);
                                toast.success('Copied to clipboard');
                              }}
                            >
                              Copy
                            </Button>
                          </div>
                        </div>

                        <div className="p-4 border border-border rounded-xl">
                          <p className="font-medium text-foreground mb-2">Verification Link</p>
                          <p className="text-sm text-muted-foreground mb-4">
                            Send this link directly to recruiters
                          </p>
                          <div className="flex items-center gap-3">
                            <code className="flex-1 px-4 py-3 bg-muted rounded-lg text-sm overflow-hidden text-ellipsis">
                              {window.location.origin}/verify/{profile.profile_id}
                            </code>
                            <Button 
                              variant="outline"
                              onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}/verify/${profile.profile_id}`);
                                toast.success('Link copied');
                              }}
                            >
                              Copy
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                )}

                <TabsContent value="settings">
                  <div className="space-y-6">
                    {/* Admin Settings - only for admins */}
                    {isAdmin && <AdminSettings />}
                    
                    {/* Job Seeker Visibility Settings - only for job seekers */}
                    {isJobSeeker && !isAdmin && <ProfileVisibilityToggle />}
                    
                    <div className="glass-card rounded-2xl p-6">
                      <h2 className="text-xl font-display font-semibold text-foreground mb-6">
                        Account Security
                      </h2>
                      <TwoFactorSettings />
                    </div>
                    
                    <div className="glass-card rounded-2xl p-6">
                      <NotificationSettings />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </main>

      {/* Dispute Dialog */}
      <Dialog open={disputeOpen} onOpenChange={setDisputeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Report an Issue
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              If you believe this employment record contains incorrect information, 
              please describe the issue below. Our team will review your dispute.
            </p>
            <Textarea
              placeholder="Describe the issue with this record..."
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisputeOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitDispute}>
              Submit Dispute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Onboarding Wizard - Only for job seekers */}
      {isJobSeeker && !isAdmin && !isEmployer && (
        <AIOnboardingWizard
          isOpen={showOnboarding}
          onClose={() => setShowOnboarding(false)}
          userId={user!.id}
          firstName={profile.first_name}
        />
      )}

      {/* Missing Fields Prompt */}
      {isJobSeeker && !isAdmin && !isEmployer && profile && (
        <MissingFieldsPrompt
          isOpen={showMissingFields}
          onClose={() => setShowMissingFields(false)}
          userId={user!.id}
          profile={{
            national_id: profile.national_id,
            passport_number: profile.passport_number,
            phone: profile.phone,
            country: profile.country,
            citizenship: profile.citizenship,
          }}
          onUpdate={refreshProfile}
        />
      )}

      <Footer />
      <AIChatWidget />
    </div>
  );
}
