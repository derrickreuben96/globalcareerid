import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AutocompleteInput } from '@/components/ui/autocomplete-input';
import { countries, industries } from '@/lib/countries';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserCheck, Building2, ArrowRight, Shield, Mail, Lock, User, Phone, Briefcase, MapPin, Loader2, Globe, ImagePlus } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  jobSeekerRegistrationSchema, 
  employerRegistrationSchema, 
  validateForm 
} from '@/lib/validation';

export default function Register() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') || searchParams.get('type');
  const defaultTab = tabParam === 'employer' ? 'employer' : 'jobseeker';
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    
    if (error) {
      toast.error(error.message);
      setIsGoogleLoading(false);
    }
  };
  
  const [jobSeekerForm, setJobSeekerForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    country: '',
    citizenship: '',
    nationalId: '',
    passportNumber: '',
    gender: '',
    dateOfBirth: '',
    password: '',
    confirmPassword: '',
  });

  const [employerForm, setEmployerForm] = useState({
    companyName: '',
    registrationNumber: '',
    country: '',
    industry: '',
    phone: '',
    website: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo must be under 2MB');
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleJobSeekerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!jobSeekerForm.gender) {
      toast.error('Please select your gender');
      return;
    }
    if (!jobSeekerForm.dateOfBirth) {
      toast.error('Please enter your date of birth');
      return;
    }

    // Validate form with zod schema
    const validation = validateForm(jobSeekerRegistrationSchema, jobSeekerForm);
    if (!validation.success) {
      const firstError = Object.values(validation.errors || {})[0];
      toast.error(firstError || 'Please fix the form errors');
      return;
    }

    setIsLoading(true);
    const { error } = await signUp(validation.data!.email, validation.data!.password, {
      first_name: validation.data!.firstName,
      last_name: validation.data!.lastName,
      phone: validation.data!.phone || '',
      account_type: 'career_individual',
    });
    setIsLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    // Check if user is auto-confirmed or needs email verification
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      // Auto-confirmed, update profile and redirect
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        const updates: Record<string, any> = {};
        if (jobSeekerForm.country) updates.country = jobSeekerForm.country;
        if (jobSeekerForm.citizenship) updates.citizenship = jobSeekerForm.citizenship;
        if (jobSeekerForm.nationalId.trim()) updates.national_id = jobSeekerForm.nationalId.trim();
        if (jobSeekerForm.passportNumber.trim()) updates.passport_number = jobSeekerForm.passportNumber.trim();
        if (jobSeekerForm.gender) updates.gender = jobSeekerForm.gender;
        if (jobSeekerForm.dateOfBirth) updates.date_of_birth = jobSeekerForm.dateOfBirth;
        if (jobSeekerForm.nationalId.trim()) updates.profile_complete = true;
        
        if (Object.keys(updates).length > 0) {
          await supabase.from('profiles').update(updates).eq('user_id', currentUser.id);
        }
      }
      // Send welcome email
      try {
        await supabase.functions.invoke("notify-welcome", {
          body: {
            email: jobSeekerForm.email,
            first_name: jobSeekerForm.firstName,
            account_type: "career_individual",
          },
        });
      } catch (e) { console.warn("Welcome email failed:", e); }
      toast.success('Account created! Redirecting to your dashboard...');
      navigate('/dashboard');
    } else {
      toast.success('Account created! Please check your email to verify your account before signing in.');
    }
  };

  const handleEmployerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate logo is provided
    if (!logoFile) {
      toast.error('Company logo is required');
      return;
    }

    // Validate form with zod schema
    const validation = validateForm(employerRegistrationSchema, employerForm);
    if (!validation.success) {
      const firstError = Object.values(validation.errors || {})[0];
      toast.error(firstError || 'Please fix the form errors');
      return;
    }

    setIsLoading(true);
    
    // Sign up the user with organization account_type — the DB trigger handles
    // creating organization_profiles and assigning the employer role automatically
    const { error: signUpError } = await signUp(validation.data!.email, validation.data!.password, {
      first_name: validation.data!.companyName,
      last_name: '',
      account_type: 'organization',
      company_name: validation.data!.companyName,
    });

    if (signUpError) {
      setIsLoading(false);
      toast.error(signUpError.message);
      return;
    }

    // Check if user is auto-confirmed or needs email verification
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Wait for the DB trigger to create profile (poll instead of arbitrary delay)
      if (user) {
        for (let i = 0; i < 10; i++) {
          const { data: p } = await supabase.from('profiles').select('id').eq('user_id', user.id).maybeSingle();
          if (p) break;
          await new Promise(r => setTimeout(r, 300));
        }
      }
      if (user) {
        // Upload logo if provided
        let logoUrl: string | null = null;
        if (logoFile) {
          const ext = logoFile.name.split('.').pop();
          const path = `${user.id}/logo.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from('company-logos')
            .upload(path, logoFile, { upsert: true });
          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from('company-logos')
              .getPublicUrl(path);
            logoUrl = urlData.publicUrl;
          }
        }

        await supabase.from('organization_profiles').update({
          registration_number: validation.data!.registrationNumber,
          country: validation.data!.country,
          industry: validation.data!.industry,
          phone: validation.data!.phone,
          website: validation.data!.website,
          ...(logoUrl && { logo_url: logoUrl }),
        }).eq('user_id', user.id);

        await supabase.from('employers').insert({
          user_id: user.id,
          company_name: validation.data!.companyName,
          registration_number: validation.data!.registrationNumber,
          country: validation.data!.country,
          industry: validation.data!.industry,
          phone: validation.data!.phone,
          website: validation.data!.website,
          ...(logoUrl && { logo_url: logoUrl }),
        });
      }

      // Send welcome email for organization
      try {
        await supabase.functions.invoke("notify-welcome", {
          body: {
            email: employerForm.email,
            first_name: employerForm.companyName,
            account_type: "organization",
          },
        });
      } catch (e) { console.warn("Welcome email failed:", e); }
      setIsLoading(false);
      toast.success('Company registration submitted! Verification typically takes 24-48 hours.');
      navigate('/employer');
    } else {
      setIsLoading(false);
      toast.success('Account created! Please check your email to verify your account before signing in.');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-xl mx-auto">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-6">
                <Shield className="w-8 h-8 text-primary-foreground" />
              </div>
              <h1 className="text-3xl font-display font-bold text-foreground">
                Create Your Account
              </h1>
              <p className="mt-2 text-muted-foreground">
                Join Global Career ID and build your verified professional identity
              </p>
            </div>

            <div className="glass-card rounded-2xl p-8">
              <Tabs defaultValue={defaultTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-8">
                  <TabsTrigger value="jobseeker" className="gap-2">
                    <UserCheck className="w-4 h-4" />
                    Career Individual
                  </TabsTrigger>
                  <TabsTrigger value="employer" className="gap-2">
                    <Building2 className="w-4 h-4" />
                    Organization
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="jobseeker">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="w-full mb-6"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading || isGoogleLoading}
                  >
                    {isGoogleLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                          <path
                            fill="currentColor"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="currentColor"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          />
                        </svg>
                        Sign up with Google
                      </>
                    )}
                  </Button>

                  <div className="relative mb-6">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or continue with email</span>
                    </div>
                  </div>

                  <form onSubmit={handleJobSeekerSubmit} className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="firstName"
                            placeholder="Jane"
                            className="pl-10"
                            value={jobSeekerForm.firstName}
                            onChange={(e) => setJobSeekerForm({ ...jobSeekerForm, firstName: e.target.value })}
                            required
                            disabled={isLoading}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          placeholder="Doe"
                          value={jobSeekerForm.lastName}
                          onChange={(e) => setJobSeekerForm({ ...jobSeekerForm, lastName: e.target.value })}
                          required
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="jane@example.com"
                          className="pl-10"
                          value={jobSeekerForm.email}
                          onChange={(e) => setJobSeekerForm({ ...jobSeekerForm, email: e.target.value })}
                          required
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="+1 234 567 8900"
                          className="pl-10"
                          value={jobSeekerForm.phone}
                          onChange={(e) => setJobSeekerForm({ ...jobSeekerForm, phone: e.target.value })}
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="country">Country of Residence</Label>
                        <AutocompleteInput
                          suggestions={countries}
                          placeholder="Start typing..."
                          value={jobSeekerForm.country}
                          onValueChange={(v) => setJobSeekerForm({ ...jobSeekerForm, country: v })}
                          icon={<MapPin className="w-4 h-4" />}
                          disabled={isLoading}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="citizenship">Citizenship</Label>
                        <AutocompleteInput
                          suggestions={countries}
                          placeholder="Start typing..."
                          value={jobSeekerForm.citizenship}
                          onValueChange={(v) => setJobSeekerForm({ ...jobSeekerForm, citizenship: v })}
                          icon={<Globe className="w-4 h-4" />}
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="nationalId">National ID <span className="text-destructive">*</span></Label>
                        <Input
                          id="nationalId"
                          placeholder="National ID number"
                          value={jobSeekerForm.nationalId}
                          onChange={(e) => setJobSeekerForm({ ...jobSeekerForm, nationalId: e.target.value })}
                          required
                          disabled={isLoading}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="passportNumber">Passport Number</Label>
                        <Input
                          id="passportNumber"
                          placeholder="Optional"
                          value={jobSeekerForm.passportNumber}
                          onChange={(e) => setJobSeekerForm({ ...jobSeekerForm, passportNumber: e.target.value })}
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="gender">Gender <span className="text-destructive">*</span></Label>
                      <Select
                        value={jobSeekerForm.gender}
                        onValueChange={(v) => setJobSeekerForm({ ...jobSeekerForm, gender: v })}
                        disabled={isLoading}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="non_binary">Non-binary</SelectItem>
                          <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="password"
                          type="password"
                          placeholder="Create a strong password"
                          className="pl-10"
                          value={jobSeekerForm.password}
                          onChange={(e) => setJobSeekerForm({ ...jobSeekerForm, password: e.target.value })}
                          required
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="confirmPassword"
                          type="password"
                          placeholder="Confirm your password"
                          className="pl-10"
                          value={jobSeekerForm.confirmPassword}
                          onChange={(e) => setJobSeekerForm({ ...jobSeekerForm, confirmPassword: e.target.value })}
                          required
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    <Button type="submit" variant="hero" size="lg" className="w-full" disabled={isLoading}>
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          Create Profile
                          <ArrowRight className="w-5 h-5" />
                        </>
                      )}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="employer">
                  <form onSubmit={handleEmployerSubmit} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Company Name <span className="text-destructive">*</span></Label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="companyName"
                          placeholder="Acme Corporation"
                          className="pl-10"
                          value={employerForm.companyName}
                          onChange={(e) => setEmployerForm({ ...employerForm, companyName: e.target.value })}
                          required
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    {/* Company Logo Upload */}
                    <div className="space-y-2">
                      <Label>Company Logo <span className="text-destructive">*</span></Label>
                      <div className="flex items-center gap-4">
                        <label
                          htmlFor="companyLogo"
                          className={`flex items-center justify-center w-20 h-20 rounded-xl border-2 border-dashed ${logoPreview ? 'border-primary' : 'border-border'} hover:border-primary/50 cursor-pointer transition-colors overflow-hidden bg-muted/30`}
                        >
                          {logoPreview ? (
                            <img src={logoPreview} alt="Logo preview" className="w-full h-full object-cover" />
                          ) : (
                            <ImagePlus className="w-6 h-6 text-muted-foreground" />
                          )}
                          <input
                            id="companyLogo"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleLogoChange}
                            disabled={isLoading}
                          />
                        </label>
                        <div className="text-sm text-muted-foreground">
                          <p>Upload your company logo</p>
                          <p className="text-xs">PNG, JPG up to 2MB</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="registrationNumber">Registration Number <span className="text-destructive">*</span></Label>
                        <Input
                          id="registrationNumber"
                          placeholder="Company reg #"
                          value={employerForm.registrationNumber}
                          onChange={(e) => setEmployerForm({ ...employerForm, registrationNumber: e.target.value })}
                          required
                          disabled={isLoading}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="country">Country <span className="text-destructive">*</span></Label>
                        <AutocompleteInput
                          suggestions={countries}
                          placeholder="Start typing..."
                          value={employerForm.country}
                          onValueChange={(v) => setEmployerForm({ ...employerForm, country: v })}
                          icon={<MapPin className="w-4 h-4" />}
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="industry">Industry <span className="text-destructive">*</span></Label>
                      <AutocompleteInput
                        suggestions={industries}
                        placeholder="Start typing: Technology, Finance..."
                        value={employerForm.industry}
                        onValueChange={(v) => setEmployerForm({ ...employerForm, industry: v })}
                        icon={<Briefcase className="w-4 h-4" />}
                        disabled={isLoading}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="companyPhone">Company Phone <span className="text-destructive">*</span></Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="companyPhone"
                            type="tel"
                            placeholder="+1 234 567 8900"
                            className="pl-10"
                            value={employerForm.phone}
                            onChange={(e) => setEmployerForm({ ...employerForm, phone: e.target.value })}
                            required
                            disabled={isLoading}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="companyWebsite">Website <span className="text-destructive">*</span></Label>
                        <div className="relative">
                          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="companyWebsite"
                            type="url"
                            placeholder="https://company.com"
                            className="pl-10"
                            value={employerForm.website}
                            onChange={(e) => setEmployerForm({ ...employerForm, website: e.target.value })}
                            required
                            disabled={isLoading}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="employerEmail">Company Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="employerEmail"
                          type="email"
                          placeholder="hr@company.com"
                          className="pl-10"
                          value={employerForm.email}
                          onChange={(e) => setEmployerForm({ ...employerForm, email: e.target.value })}
                          required
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="employerPassword">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="employerPassword"
                          type="password"
                          placeholder="Create a secure password"
                          className="pl-10"
                          value={employerForm.password}
                          onChange={(e) => setEmployerForm({ ...employerForm, password: e.target.value })}
                          required
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="employerConfirmPassword">Confirm Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="employerConfirmPassword"
                          type="password"
                          placeholder="Confirm your password"
                          className="pl-10"
                          value={employerForm.confirmPassword}
                          onChange={(e) => setEmployerForm({ ...employerForm, confirmPassword: e.target.value })}
                          required
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    <div className="p-4 bg-muted/30 rounded-lg border border-border">
                      <p className="text-sm text-muted-foreground">
                        <strong className="text-foreground">Note:</strong> Company registration requires verification. 
                        You'll be able to add employment records once your company is approved (typically 24-48 hours).
                      </p>
                    </div>

                    <Button type="submit" variant="hero" size="lg" className="w-full" disabled={isLoading}>
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          Register Company
                          <ArrowRight className="w-5 h-5" />
                        </>
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link to="/login" className="text-primary hover:underline font-medium">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
