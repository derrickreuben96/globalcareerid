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

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: string[];
  isLoading: boolean;
  authError: string | null;
  signUp: (email: string, password: string, metadata?: Record<string, any>) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
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
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const initializedRef = useRef(false);
  const currentUserIdRef = useRef<string | null>(null);
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const signingOutRef = useRef(false);

  const clearLoadingSafety = () => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
  };

  const startLoadingSafety = () => {
    clearLoadingSafety();
    loadingTimeoutRef.current = setTimeout(() => {
      console.warn('Auth: Force-ending loading state after timeout');
      setIsLoading(false);
    }, MAX_LOADING_MS);
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

    startLoadingSafety();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted || signingOutRef.current) return;

        // Handle sign out
        if (event === 'SIGNED_OUT' || !newSession) {
          currentUserIdRef.current = null;
          setSession(null);
          setUser(null);
          setProfile(null);
          setRoles([]);
          setAuthError(null);
          if (initializedRef.current) {
            setIsLoading(false);
            clearLoadingSafety();
          }
          return;
        }

        // Handle expired/invalid token
        if (event === 'TOKEN_REFRESHED' && !newSession.access_token) {
          console.warn('Auth: Token refresh failed');
          currentUserIdRef.current = null;
          setSession(null);
          setUser(null);
          setProfile(null);
          setRoles([]);
          setAuthError('Session expired. Please sign in again.');
          setIsLoading(false);
          clearLoadingSafety();
          return;
        }

        const newUserId = newSession?.user?.id ?? null;
        const previousUserId = currentUserIdRef.current;

        setSession(newSession);
        setUser(newSession?.user ?? null);
        currentUserIdRef.current = newUserId;

        // Only fetch profile on new sign-in (not on token refresh for same user)
        if (newUserId && initializedRef.current) {
          const isNewUser = newUserId !== previousUserId;
          if (isNewUser) {
            setIsLoading(true);
            startLoadingSafety();
            await fetchProfile(newUserId);
          }
          if (mounted) {
            setIsLoading(false);
            clearLoadingSafety();
          }
        }
      }
    );

    // INITIAL load — validate persisted session
    const initializeAuth = async () => {
      try {
        // Use getUser() as the single source of truth - it validates the JWT against the server
        const { data: { user: validatedUser }, error: userError } = await supabase.auth.getUser();

        if (!mounted) return;

        if (userError || !validatedUser) {
          // No valid session - clear everything
          if (userError) {
            console.warn('Auth: Session validation failed:', userError.message);
          }
          currentUserIdRef.current = null;
          setSession(null);
          setUser(null);
          setProfile(null);
          setRoles([]);
          // Only set error if there was an actual error (not just no session)
          setAuthError(userError ? 'Session expired. Please sign in again.' : null);
          return;
        }

        // We have a valid user - get the session for the token
        const { data: { session: currentSession } } = await supabase.auth.getSession();

        if (!mounted) return;

        setSession(currentSession);
        setUser(validatedUser);
        currentUserIdRef.current = validatedUser.id;
        await fetchProfile(validatedUser.id);
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setAuthError('Network error during authentication');
          setSession(null);
          setUser(null);
          setProfile(null);
          setRoles([]);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
          clearLoadingSafety();
          initializedRef.current = true;
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      clearLoadingSafety();
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
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setAuthError(error.message);
      }
      return { error: error as Error | null };
    } catch (err) {
      const error = err as Error;
      setAuthError('Network error. Please check your connection.');
      return { error };
    }
  };

  const signOut = async () => {
    // Prevent onAuthStateChange from interfering during sign out
    signingOutRef.current = true;
    currentUserIdRef.current = null;
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
    setAuthError(null);
    setIsLoading(false);
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
