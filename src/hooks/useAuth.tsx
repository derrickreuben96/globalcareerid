import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
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

// Safety timeout to never stay loading forever
const MAX_LOADING_MS = 8000;

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

  // Safety: never remain in loading state beyond MAX_LOADING_MS
  const startLoadingSafety = () => {
    clearLoadingSafety();
    loadingTimeoutRef.current = setTimeout(() => {
      console.warn('Auth: Force-ending loading state after timeout');
      setIsLoading(false);
    }, MAX_LOADING_MS);
  };

  const clearLoadingSafety = () => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
  };

  const fetchProfile = async (userId: string) => {
    try {
      const [profileResult, rolesResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', userId)
      ]);

      if (currentUserIdRef.current !== userId) return;

      if (profileResult.error) {
        console.error('Profile fetch error:', profileResult.error);
        setAuthError('Failed to load profile data');
      }

      setProfile(profileResult.data);
      setRoles(rolesResult.data?.map(r => r.role) || []);
      setAuthError(null);
    } catch (error) {
      console.error('Error fetching profile:', error);
      if (currentUserIdRef.current === userId) {
        setProfile(null);
        setRoles([]);
        setAuthError('Network error loading profile');
      }
    }
  };

  useEffect(() => {
    let mounted = true;

    startLoadingSafety();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;

        const newUserId = newSession?.user?.id ?? null;
        const previousUserId = currentUserIdRef.current;

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
          console.warn('Auth: Token refresh failed, session invalid');
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

        setSession(newSession);
        setUser(newSession?.user ?? null);
        currentUserIdRef.current = newUserId;

        if (newUserId) {
          const isNewSignIn = event === 'SIGNED_IN' && newUserId !== previousUserId;

          if (isNewSignIn && initializedRef.current) {
            setIsLoading(true);
            startLoadingSafety();
          }

          await fetchProfile(newUserId);

          if (mounted && initializedRef.current) {
            setIsLoading(false);
            clearLoadingSafety();
          }
        }
      }
    );

    // INITIAL load — validate persisted session
    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();

        if (!mounted) return;

        if (sessionError) {
          console.error('Session validation error:', sessionError);
          setAuthError('Failed to restore session');
          setSession(null);
          setUser(null);
          setProfile(null);
          setRoles([]);
          return;
        }

        if (currentSession) {
          // Validate the session is still valid by calling getUser
          const { data: { user: validatedUser }, error: userError } = await supabase.auth.getUser();

          if (!mounted) return;

          if (userError || !validatedUser) {
            console.warn('Auth: Persisted session is invalid, clearing');
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
            setProfile(null);
            setRoles([]);
            setAuthError(userError ? 'Session expired. Please sign in again.' : null);
            return;
          }

          setSession(currentSession);
          setUser(validatedUser);
          currentUserIdRef.current = validatedUser.id;
          await fetchProfile(validatedUser.id);
        } else {
          setSession(null);
          setUser(null);
          currentUserIdRef.current = null;
        }
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
    currentUserIdRef.current = null;
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
    setAuthError(null);
    try {
      await supabase.auth.signOut();
    } catch {
      // Even if signOut fails server-side, we've already cleared local state
      console.warn('Server-side sign out may have failed, local state cleared');
    }
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
