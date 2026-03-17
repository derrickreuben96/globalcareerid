import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Mail, Lock, ArrowRight, Loader2, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { MFAVerification } from '@/components/auth/MFAVerification';
import { WelcomeOverlay } from '@/components/WelcomeOverlay';

function getRedirectFromProfile(profile: any, roles: string[]): string {
  if (roles.includes('admin')) return '/admin';
  if (profile?.account_type === 'organization' || roles.includes('employer')) return '/employer';
  return '/dashboard';
}

export default function Login() {
  const navigate = useNavigate();
  const { user, profile, roles, authStatus } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showMFA, setShowMFA] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeInfo, setWelcomeInfo] = useState<{ name: string; logoUrl?: string | null }>({ name: '' });
  const [pendingPath, setPendingPath] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const waitingForAuthRef = useRef(false);

  // When auth becomes authenticated after login, compute redirect and show welcome
  useEffect(() => {
    if (!waitingForAuthRef.current) return;
    if (authStatus !== 'authenticated' || !user || !profile) return;

    waitingForAuthRef.current = false;
    setIsLoading(false);

    const path = getRedirectFromProfile(profile, roles);

    // Build welcome info from profile
    const isOrg = profile.account_type === 'organization' || roles.includes('employer');
    const name = isOrg ? (profile.first_name || 'Organization') : (profile.first_name || 'User');

    setWelcomeInfo({ name, logoUrl: null });
    setPendingPath(path);
    setShowWelcome(true);

    // Try to get logo for org users (non-blocking)
    if (isOrg && user) {
      Promise.all([
        supabase.from('employers').select('logo_url, company_name').eq('user_id', user.id).maybeSingle(),
        supabase.from('organization_profiles').select('logo_url, company_name').eq('user_id', user.id).maybeSingle(),
      ]).then(([empRes, orgRes]) => {
        const logo = empRes.data?.logo_url || orgRes.data?.logo_url;
        const companyName = empRes.data?.company_name || orgRes.data?.company_name || name;
        if (logo || companyName !== name) {
          setWelcomeInfo({ name: companyName, logoUrl: logo });
        }
      }).catch(() => {});
    }
  }, [authStatus, user, profile, roles]);

  // Safety timeout for the waiting-for-auth state
  useEffect(() => {
    if (!waitingForAuthRef.current || !isLoading) return;
    const timeout = setTimeout(() => {
      if (waitingForAuthRef.current) {
        console.warn('[Login] Auth state timeout after 10s');
        waitingForAuthRef.current = false;
        setIsLoading(false);
        // If we're actually authenticated, just redirect
        if (authStatus === 'authenticated' && profile) {
          const path = getRedirectFromProfile(profile, roles);
          navigate(path);
        } else {
          toast.error('Login timed out. Please try again.');
        }
      }
    }, 10000);
    return () => clearTimeout(timeout);
  }, [isLoading, authStatus, profile, roles, navigate]);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      toast.error('Please enter your email address');
      return;
    }

    setIsResetting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/login`,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Password reset email sent! Check your inbox.');
      setShowForgotPassword(false);
      setResetEmail('');
    }
    setIsResetting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) return;

    setIsLoading(true);
    // Set waiting flag BEFORE signInWithPassword so we catch the auth state
    // change that fires during the call (before it returns to us).
    waitingForAuthRef.current = true;
    console.log('[Login] Start: credentials submitted');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });

      console.log('[Login] Credential validation complete', { success: !error, userId: data?.user?.id });

      if (error) {
        waitingForAuthRef.current = false;
        toast.error(error.message);
        setIsLoading(false);
        return;
      }

      if (!data?.user) {
        waitingForAuthRef.current = false;
        toast.error('Login failed: no user returned.');
        setIsLoading(false);
        return;
      }

      // Check MFA factors with a safety timeout
      console.log('[Login] Checking MFA factors...');
      let hasVerifiedTOTP = false;
      try {
        const mfaResult = await Promise.race([
          supabase.auth.mfa.listFactors(),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
        ]);
        if (mfaResult && 'data' in mfaResult) {
          hasVerifiedTOTP = mfaResult.data?.totp?.some(f => f.status === 'verified') ?? false;
        } else {
          console.warn('[Login] MFA check timed out after 3s, assuming no MFA');
        }
      } catch (mfaErr) {
        console.warn('[Login] MFA check failed, assuming no MFA:', mfaErr);
      }
      console.log('[Login] MFA check complete', { hasVerifiedTOTP });

      if (hasVerifiedTOTP) {
        waitingForAuthRef.current = false;
        setShowMFA(true);
        setIsLoading(false);
      } else {
        console.log('[Login] Waiting for auth state to settle...');
      }
    } catch (err) {
      waitingForAuthRef.current = false;
      console.error('[Login] Unhandled error:', err);
      toast.error('Login failed. Please try again.');
      setIsLoading(false);
    }
  };

  const handleMFASuccess = async () => {
    setShowMFA(false);
    setIsLoading(true);
    waitingForAuthRef.current = true;
    console.log('[Login] MFA verified, waiting for auth state...');
  };

  const handleMFACancel = async () => {
    setShowMFA(false);
    await supabase.auth.signOut();
  };

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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-6">
                <Shield className="w-8 h-8 text-primary-foreground" />
              </div>
              <h1 className="text-3xl font-display font-bold text-foreground">
                Welcome Back
              </h1>
              <p className="mt-2 text-muted-foreground">
                Sign in to access your verified profile
              </p>
            </div>

            <div className="glass-card rounded-2xl p-8">
              {showForgotPassword ? (
                <div className="space-y-5">
                  <button 
                    onClick={() => setShowForgotPassword(false)}
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to login
                  </button>
                  <div>
                    <h2 className="text-xl font-display font-semibold text-foreground">Reset Password</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Enter your email and we'll send you a reset link.
                    </p>
                  </div>
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="resetEmail">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="resetEmail"
                          type="email"
                          placeholder="you@example.com"
                          className="pl-10"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          required
                          disabled={isResetting}
                        />
                      </div>
                    </div>
                    <Button type="submit" variant="hero" size="lg" className="w-full" disabled={isResetting}>
                      {isResetting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        'Send Reset Link'
                      )}
                    </Button>
                  </form>
                </div>
              ) : (
              <>
                <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      className="pl-10"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Your password"
                      className="pl-10 pr-10"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      required
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" variant="hero" size="lg" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </Button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="w-full"
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
                      Continue with Google
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center text-sm text-muted-foreground">
                Don't have an account?{' '}
                <Link to="/register" className="text-primary font-medium hover:underline">
                  Create one
                </Link>
              </div>
              </>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />

      <MFAVerification
        isOpen={showMFA}
        onSuccess={handleMFASuccess}
        onCancel={handleMFACancel}
      />

      {showWelcome && (
        <WelcomeOverlay
          name={welcomeInfo.name}
          logoUrl={welcomeInfo.logoUrl}
          onComplete={() => {
            setShowWelcome(false);
            navigate(pendingPath);
          }}
        />
      )}
    </div>
  );
}
