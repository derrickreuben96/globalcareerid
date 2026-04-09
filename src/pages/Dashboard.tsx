import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ProfileIdCard } from '@/components/ProfileIdCard';
import { EmploymentTimeline } from '@/components/EmploymentTimeline';
import { StructuredEmploymentTimeline } from '@/components/StructuredEmploymentTimeline';
import { ReferralLettersViewer } from '@/components/dashboard/ReferralLettersViewer';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { WorkHistory } from '@/components/dashboard/WorkHistory';
import { PendingApprovals } from '@/components/dashboard/PendingApprovals';
import { ProfileVisibilityToggle } from '@/components/dashboard/ProfileVisibilityToggle';
import { MissingFieldsPrompt } from '@/components/dashboard/MissingFieldsPrompt';
import { ProfileEditor } from '@/components/dashboard/ProfileEditor';
import { ExperienceUpdateRequest } from '@/components/dashboard/ExperienceUpdateRequest';
import { ProfileImageUpload } from '@/components/dashboard/ProfileImageUpload';
import { PromotionRequestForm } from '@/components/dashboard/PromotionRequestForm';
import { CareerAnalytics } from '@/components/dashboard/CareerAnalytics';
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
  Building2,
  TrendingUp,
  GitBranch
} from 'lucide-react';
import { toast } from 'sonner';
import { skillSchema, disputeReasonSchema, validateField } from '@/lib/validation';

/** Mask a sensitive ID: show first 2 and last 2 characters, mask the rest */
function maskId(value: string): string {
  if (value.length <= 4) return value;
  return value.slice(0, 2) + '•'.repeat(value.length - 4) + value.slice(-2);
}

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
    logo_url: string | null;
  };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const {
    user: authUser,
    session,
    profile: authProfile,
    roles,
    isLoading: authLoading,
    authStatus,
    signOut,
    refreshProfile,
  } = useAuth();
  const [records, setRecords] = useState<EmploymentRecord[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeRecordId, setDisputeRecordId] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [isLoadingRecords, setIsLoadingRecords] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showMissingFields, setShowMissingFields] = useState(false);
  const [recoveredProfile, setRecoveredProfile] = useState<typeof authProfile>(null);
  const [isRecoveringProfile, setIsRecoveringProfile] = useState(false);
  const [profileRecoveryFailed, setProfileRecoveryFailed] = useState(false);

  const user = authUser ?? session?.user ?? null;
  const profile = authProfile ?? recoveredProfile;

  // Recover the profile directly if the auth context is authenticated but profile hydration lags behind.
  useEffect(() => {
    let isActive = true;

    if (authStatus !== 'authenticated' || authProfile || recoveredProfile) {
      return;
    }

    const recoverProfile = async () => {
      const resolvedUserId = authUser?.id ?? session?.user?.id ?? (await supabase.auth.getUser()).data.user?.id;
      if (!resolvedUserId || !isActive) return;

      setIsRecoveringProfile(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', resolvedUserId)
          .maybeSingle();

        if (!isActive) return;

        if (!error && data) {
          setProfileRecoveryFailed(false);
          setRecoveredProfile(data as NonNullable<typeof authProfile>);
          return;
        }

        await refreshProfile();
        if (isActive) {
          setProfileRecoveryFailed(true);
        }
      } catch (error) {
        if (isActive) {
          console.error('Dashboard profile recovery failed:', error);
          setProfileRecoveryFailed(true);
        }
      } finally {
        if (isActive) {
          setIsRecoveringProfile(false);
        }
      }
    };

    void recoverProfile();
    const retryTimer = setInterval(() => void recoverProfile(), 2000);
    const timeout = setTimeout(() => clearInterval(retryTimer), 15000);

    return () => {
      isActive = false;
      clearInterval(retryTimer);
      clearTimeout(timeout);
    };
  }, [authStatus, authProfile, recoveredProfile, authUser?.id, session?.user?.id, refreshProfile]);

  const isAdmin = roles.includes('admin');
  const isEmployer = roles.includes('employer') || profile?.account_type === 'organization';
  const isJobSeeker = !isAdmin && !isEmployer;

  // Check if user needs onboarding (only for job seekers with no skills/bio)
  useEffect(() => {
    if (profile && !authLoading && isJobSeeker) {
      const isNewUser = (!profile.skills || profile.skills.length === 0) && !profile.bio;
      if (isNewUser) {
        const timer = setTimeout(() => setShowOnboarding(true), 1000);
        return () => clearTimeout(timer);
      }

      if (!profile.national_id || !(profile as any).gender || !(profile as any).date_of_birth) {
        const timer = setTimeout(() => setShowMissingFields(true), 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [profile, authLoading, isJobSeeker]);

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
        employer:employers(company_name, is_verified, logo_url)
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
          <p className="text-sm text-muted-foreground">{t('dashboard.loadingProfile')}</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">{t('dashboard.settingUpProfile')}</p>
          <p className="text-xs text-muted-foreground">
            {profileRecoveryFailed ? t('dashboard.sessionFoundLoading') : t('dashboard.thisMayTakeMoment')}
          </p>
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refreshProfile()} disabled={isRecoveringProfile}>
              {t('dashboard.retry')}
            </Button>
            {profileRecoveryFailed && (
              <Button variant="hero" size="sm" onClick={() => window.location.reload()}>
                {t('dashboard.reloadSession')}
              </Button>
            )}
          </div>
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
    employerLogoUrl: r.employer?.logo_url || undefined,
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
                {t('dashboard.welcome')}{isJobSeeker && !isEmployer ? `, ${profile.first_name}` : ''}
              </h1>
              <p className="text-muted-foreground mt-1">
                {isAdmin ? t('dashboard.platformAdmin') : isEmployer ? t('dashboard.employerDashboard') : t('dashboard.manageProfile')}
              </p>
            </div>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="w-4 h-4" />
              {t('dashboard.signOut')}
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
                <h3 className="font-semibold text-foreground mb-4">{t('dashboard.profileOverview')}</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t('dashboard.verifiedRecords')}</span>
                    <span className="font-semibold text-foreground">{records.filter(r => r.status === 'active' || r.status === 'ended').length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t('dashboard.currentStatus')}</span>
                    <Badge variant="default" className="bg-verified text-verified-foreground">
                      {records.some(r => r.status === 'active') ? t('dashboard.employed') : t('dashboard.available')}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-2">
              <Tabs defaultValue={isJobSeeker && !isAdmin ? "timeline" : "profile"} className="w-full">
                <TabsList className="mb-6 flex-wrap">
                  {isJobSeeker && !isAdmin && (
                    <TabsTrigger value="timeline" className="gap-2">
                      <Briefcase className="w-4 h-4" />
                      {t('dashboard.employerRecords')}
                    </TabsTrigger>
                  )}
                  {isJobSeeker && !isAdmin && (
                    <TabsTrigger value="analytics" className="gap-2">
                      <TrendingUp className="w-4 h-4" />
                      {t('dashboard.analytics')}
                    </TabsTrigger>
                  )}
                  {isJobSeeker && !isAdmin && (
                    <TabsTrigger value="work-history" className="gap-2">
                      <Building2 className="w-4 h-4" />
                      {t('dashboard.workHistory')}
                    </TabsTrigger>
                  )}
                  {isJobSeeker && !isAdmin && (
                    <TabsTrigger value="referral-letters" className="gap-2">
                      <Award className="w-4 h-4" />
                      {t('dashboard.referralLetters')}
                    </TabsTrigger>
                  )}
                  <TabsTrigger value="profile" className="gap-2">
                    <User className="w-4 h-4" />
                    {t('dashboard.profile')}
                  </TabsTrigger>
                  {isJobSeeker && !isAdmin && (
                    <TabsTrigger value="sharing" className="gap-2">
                      <Share2 className="w-4 h-4" />
                      {t('dashboard.sharing')}
                    </TabsTrigger>
                  )}
                  <TabsTrigger value="settings" className="gap-2">
                    <Settings className="w-4 h-4" />
                    {t('dashboard.settings')}
                  </TabsTrigger>
                </TabsList>

                {isJobSeeker && !isAdmin && (
                  <TabsContent value="timeline">
                    <div className="glass-card rounded-2xl p-6">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h2 className="text-xl font-display font-semibold text-foreground">
                            {t('dashboard.employmentTimeline')}
                          </h2>
                          <p className="text-sm text-muted-foreground">
                            {t('dashboard.verifiedRecordsByEmployers')}
                          </p>
                        </div>
                        {records.length > 0 && <VerifiedBadge label={t('dashboard.allVerified')} />}
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
                          <p>{t('dashboard.noEmploymentRecords')}</p>
                          <p className="text-sm">{t('dashboard.recordsWillAppear')}</p>
                        </div>
                      )}
                      
                      {/* Experience Update Requests & Promotion Request */}
                      {records.length > 0 && (
                        <div className="mt-6 pt-6 border-t border-border space-y-4">
                          <div className="flex flex-wrap gap-2">
                            <PromotionRequestForm 
                              userId={user!.id}
                              records={records.filter(r => r.status === 'active').map(r => ({
                                id: r.id,
                                job_title: r.job_title,
                                employer: { company_name: r.employer?.company_name || 'Unknown' },
                              }))}
                            />
                          </div>
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
                  <TabsContent value="analytics">
                    <div className="glass-card rounded-2xl p-6">
                      <CareerAnalytics userId={user!.id} />
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
                      {t('dashboard.yourProfile')}
                    </h2>
                    {isJobSeeker && !isEmployer && !isAdmin && (
                      <div className="mb-6">
                        <ProfileEditor
                          userId={user!.id}
                      profile={{
                            first_name: profile.first_name,
                            last_name: profile.last_name,
                            phone: profile.phone,
                            location: profile.location,
                            bio: profile.bio,
                            country: profile.country,
                            citizenship: profile.citizenship,
                            national_id: profile.national_id,
                            passport_number: profile.passport_number,
                            gender: (profile as any).gender,
                             date_of_birth: (profile as any).date_of_birth,
                            availability: (profile as any).availability,
                            experience_level: (profile as any).experience_level,
                          }}
                          onUpdate={refreshProfile}
                        />
                      </div>
                    )}
                    
                     <div className="space-y-6">
                       {/* Profile image upload - only for job seekers */}
                       {isJobSeeker && !isEmployer && !isAdmin && (
                         <ProfileImageUpload
                           userId={user!.id}
                           currentImageUrl={(profile as any).profile_image_url || null}
                           firstName={profile.first_name}
                           lastName={profile.last_name}
                           onImageUpdated={refreshProfile}
                         />
                       )}

                       {/* Show personal info only for job seekers, not employers/admins */}
                       {isJobSeeker && !isEmployer && !isAdmin && (
                         <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-muted-foreground">{t('dashboard.firstNameLabel')}</Label>
                            <p className="font-medium text-foreground">{profile.first_name}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">{t('dashboard.lastNameLabel')}</Label>
                            <p className="font-medium text-foreground">{profile.last_name}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">{t('dashboard.emailLabel')}</Label>
                            <p className="font-medium text-foreground">{profile.email}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">{t('dashboard.phoneLabel')}</Label>
                            <p className={`font-medium ${profile.phone ? 'text-foreground' : 'text-warning'}`}>
                              {profile.phone || `⚠ ${t('dashboard.notProvided')}`}
                            </p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">{t('dashboard.nationalIdLabel')}</Label>
                            <p className={`font-medium ${profile.national_id ? 'text-foreground' : 'text-warning'}`}>
                              {profile.national_id ? maskId(profile.national_id) : `⚠ ${t('dashboard.required')}`}
                            </p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">{t('dashboard.passportNumberLabel')}</Label>
                            <p className="font-medium text-foreground">{profile.passport_number ? maskId(profile.passport_number) : t('dashboard.notProvided')}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">{t('dashboard.countryLabel')}</Label>
                            <p className={`font-medium ${profile.country ? 'text-foreground' : 'text-warning'}`}>
                              {profile.country || `⚠ ${t('dashboard.notProvided')}`}
                            </p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">{t('dashboard.citizenshipLabel')}</Label>
                            <p className={`font-medium ${profile.citizenship ? 'text-foreground' : 'text-warning'}`}>
                              {profile.citizenship || `⚠ ${t('dashboard.notProvided')}`}
                            </p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">{t('dashboard.genderLabel')}</Label>
                            <p className={`font-medium ${(profile as any).gender ? 'text-foreground' : 'text-warning'}`}>
                              {(profile as any).gender ? ((profile as any).gender === 'prefer_not_to_say' ? t('register.preferNotToSay') : (profile as any).gender === 'non_binary' ? t('register.nonBinary') : (profile as any).gender.charAt(0).toUpperCase() + (profile as any).gender.slice(1)) : `⚠ ${t('dashboard.notProvided')}`}
                            </p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">{t('dashboard.dateOfBirthLabel')}</Label>
                            <p className={`font-medium ${(profile as any).date_of_birth ? 'text-foreground' : 'text-warning'}`}>
                              {(profile as any).date_of_birth ? new Date((profile as any).date_of_birth).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : `⚠ ${t('dashboard.notProvided')}`}
                            </p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">{t('dashboard.availabilityLabel')}</Label>
                            <p className="font-medium text-foreground">
                              {(profile as any).availability === 'open_to_offers' ? t('dashboard.openToOpportunities') : (profile as any).availability === 'actively_looking' ? t('dashboard.activelyLooking') : t('dashboard.notLooking')}
                            </p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">{t('dashboard.experienceLevelLabel')}</Label>
                            <p className="font-medium text-foreground">
                              {(profile as any).experience_level === 'entry' ? t('dashboard.entryLevel') : (profile as any).experience_level === 'mid' ? t('dashboard.midLevel') : (profile as any).experience_level === 'senior' ? t('dashboard.seniorLevel') : (profile as any).experience_level === 'lead' ? t('dashboard.leadPrincipal') : (profile as any).experience_level === 'executive' ? t('dashboard.executive') : t('dashboard.entryLevel')}
                            </p>
                          </div>
                          {(!profile.national_id || !(profile as any).gender || !(profile as any).date_of_birth) && (
                            <div className="md:col-span-2">
                              <Button 
                                variant="outline" 
                                className="border-warning text-warning hover:bg-warning/10"
                                onClick={() => setShowMissingFields(true)}
                              >
                                <AlertTriangle className="w-4 h-4" />
                                {t('dashboard.completeMissingFields')}
                              </Button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Admin profile view */}
                      {isAdmin && (
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-muted-foreground">{t('dashboard.adminEmail')}</Label>
                            <p className="font-medium text-foreground">{profile.email}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">{t('dashboard.role')}</Label>
                            <p className="font-medium text-foreground">{t('dashboard.platformAdministrator')}</p>
                          </div>
                        </div>
                      )}

                      {/* Employer redirect notice */}
                      {isEmployer && !isAdmin && (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground mb-4">
                            {t('dashboard.employerProfileNotice')}
                          </p>
                          <Button onClick={() => navigate('/employer')}>
                            {t('dashboard.goToEmployerDashboard')}
                          </Button>
                        </div>
                      )}

                      {isJobSeeker && !isAdmin && !isEmployer && (
                        <div className="border-t border-border pt-6">
                          <Label className="text-muted-foreground mb-3 block">{t('dashboard.skills')}</Label>
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
                              placeholder={t('dashboard.addSkill')}
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
                        {t('dashboard.shareYourProfile')}
                      </h2>
                      <p className="text-muted-foreground mb-6">
                        {t('dashboard.controlWhoViews')}
                      </p>

                      <div className="space-y-6">
                        <div className="p-4 border border-border rounded-xl">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <p className="font-medium text-foreground">{t('dashboard.profileId')}</p>
                              <p className="text-sm text-muted-foreground">
                                {t('dashboard.shareIdWithRecruiters')}
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
                                toast.success(t('dashboard.copiedToClipboard'));
                              }}
                            >
                              {t('dashboard.copy')}
                            </Button>
                          </div>
                        </div>

                        <div className="p-4 border border-border rounded-xl">
                          <p className="font-medium text-foreground mb-2">{t('dashboard.verificationLink')}</p>
                          <p className="text-sm text-muted-foreground mb-4">
                            {t('dashboard.sendLinkToRecruiters')}
                          </p>
                          <div className="flex items-center gap-3">
                            <code className="flex-1 px-4 py-3 bg-muted rounded-lg text-sm overflow-hidden text-ellipsis">
                              {window.location.origin}/verify/{profile.profile_id}
                            </code>
                            <Button 
                              variant="outline"
                              onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}/verify/${profile.profile_id}`);
                                toast.success(t('dashboard.linkCopied'));
                              }}
                            >
                              {t('dashboard.copy')}
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
                        {t('dashboard.accountSecurity')}
                      </h2>
                      <TwoFactorSettings />
                    </div>
                    
                    <div className="glass-card rounded-2xl p-6">
                      <NotificationSettings />
                    </div>

                    <div className="glass-card rounded-2xl p-6">
                      <h2 className="text-xl font-display font-semibold text-foreground mb-2">
                        {t('dashboard.privacyAndData')}
                      </h2>
                      <p className="text-sm text-muted-foreground mb-4">
                        {t('dashboard.manageDataExports')}
                      </p>
                      <a href="/settings/privacy" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
                        {t('dashboard.goToPrivacySettings')}
                      </a>
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
            gender: (profile as any).gender,
            date_of_birth: (profile as any).date_of_birth,
          }}
          onUpdate={refreshProfile}
        />
      )}

      <Footer />
      <AIChatWidget />
    </div>
  );
}
