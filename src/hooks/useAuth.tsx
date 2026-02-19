import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  user_id: string;
  profile_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  location: string | null;
  bio: string | null;
  skills: string[];
  visibility: string;
  country: string | null;
  citizenship: string | null;
  account_type: string;
  created_at: string;
  updated_at: string;
}

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: string[];
  isLoading: boolean;
  authStatus: AuthStatus;
  authError: string | null;
  signUp: (email: string, password: string, metadata?: Record<string, any>) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; data?: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const MAX_LOADING_MS = 10000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
  const [authError, setAuthError] = useState<string | null>(null);
  const currentUserIdRef = useRef<string | null>(null);
  const signingOutRef = useRef(false);
  const initCompleteRef = useRef(false);

  const isLoading = authStatus === 'loading';

  const clearState = () => {
    currentUserIdRef.current = null;
    setSession(null);
    setUser(null);
    setProfile(null);
    setRoles([]);
  };

  const fetchProfile = async (userId: string): Promise<boolean> => {
    try {
      const [profileResult, rolesResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', userId)
      ]);

      if (currentUserIdRef.current !== userId) return false;

      if (profileResult.error) {
        console.error('Profile fetch error:', profileResult.error);
        setAuthError('Failed to load profile data');
        return false;
      }

      setProfile(profileResult.data);
      setRoles(rolesResult.data?.map(r => r.role) || []);
      setAuthError(null);
      return true;
    } catch (error) {
      console.error('Error fetching profile:', error);
      if (currentUserIdRef.current === userId) {
        setProfile(null);
        setRoles([]);
        setAuthError('Network error loading profile');
      }
      return false;
    }
  };

  useEffect(() => {
    let mounted = true;

    // Safety timeout — ALWAYS resolves auth state
    const safetyTimeout = setTimeout(() => {
      if (mounted && authStatus === 'loading') {
        console.warn('Auth: Force-ending loading state after timeout');
        // If we have a user set but status still loading, mark authenticated
        if (currentUserIdRef.current) {
          setAuthStatus('authenticated');
        } else {
          setAuthStatus('unauthenticated');
          setAuthError('Authentication timed out. Please try again.');
        }
      }
    }, MAX_LOADING_MS);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted || signingOutRef.current) return;

        if (event === 'SIGNED_OUT' || !newSession) {
          clearState();
          setAuthError(null);
          if (initCompleteRef.current) {
            setAuthStatus('unauthenticated');
          }
          return;
        }

        if (event === 'TOKEN_REFRESHED' && !newSession.access_token) {
          console.warn('Auth: Token refresh failed');
          clearState();
          setAuthError('Session expired. Please sign in again.');
          setAuthStatus('unauthenticated');
          return;
        }

        const newUserId = newSession.user?.id ?? null;
        const previousUserId = currentUserIdRef.current;

        setSession(newSession);
        setUser(newSession.user ?? null);
        currentUserIdRef.current = newUserId;

        // After init, handle new sign-ins (not token refreshes for same user)
        if (newUserId && initCompleteRef.current && newUserId !== previousUserId) {
          setAuthStatus('loading');
          await fetchProfile(newUserId);
          if (mounted) setAuthStatus('authenticated');
        }
      }
    );

    const initializeAuth = async () => {
      try {
        const { data: { user: validatedUser }, error: userError } = await supabase.auth.getUser();

        if (!mounted) return;

        if (userError || !validatedUser) {
          if (userError) {
            console.warn('Auth: Session validation failed:', userError.message);
          }
          clearState();
          setAuthError(userError ? 'Session expired. Please sign in again.' : null);
          setAuthStatus('unauthenticated');
          return;
        }

        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (!mounted) return;

        setSession(currentSession);
        setUser(validatedUser);
        currentUserIdRef.current = validatedUser.id;
        await fetchProfile(validatedUser.id);

        if (mounted) {
          setAuthStatus('authenticated');
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          clearState();
          setAuthError('Network error during authentication');
          setAuthStatus('unauthenticated');
        }
      } finally {
        if (mounted) {
          initCompleteRef.current = true;
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, metadata?: Record<string, any>) => {
    setAuthError(null);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: metadata,
        },
      });
      return { error: error as Error | null };
    } catch (err) {
      const error = err as Error;
      setAuthError(error.message);
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    setAuthError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setAuthError(error.message);
        return { error: error as Error | null, data: null };
      }
      return { error: null, data };
    } catch (err) {
      const error = err as Error;
      setAuthError('Network error. Please check your connection.');
      return { error };
    }
  };

  const signOut = async () => {
    signingOutRef.current = true;
    clearState();
    setAuthError(null);
    setAuthStatus('unauthenticated');
    try {
      await supabase.auth.signOut();
    } catch {
      console.warn('Server-side sign out may have failed, local state cleared');
    }
    signingOutRef.current = false;
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        roles,
        isLoading,
        authStatus,
        authError,
        signUp,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
