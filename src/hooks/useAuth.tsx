import { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from 'react';
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
  national_id: string | null;
  passport_number: string | null;
  profile_complete: boolean;
  account_type: string;
  profile_image_url: string | null;
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

const MAX_LOADING_MS = 8000;
const PROFILE_FETCH_TIMEOUT_MS = 12000;
const SESSION_VALIDATE_TIMEOUT_MS = 12000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, warningMessage: string): Promise<T | null> {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      console.warn(warningMessage);
      resolve(null);
    }, timeoutMs);

    promise
      .then((value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      });
  });
}

/**
 * Forcefully clears ALL client-side auth artifacts.
 * Called on sign-out and when backend rejects the session.
 */
function purgeClientSession() {
  // Remove all supabase auth keys from localStorage
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));

  // Also clear sessionStorage just in case
  const sessionKeysToRemove: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
      sessionKeysToRemove.push(key);
    }
  }
  sessionKeysToRemove.forEach(k => sessionStorage.removeItem(k));
}

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
  const authStatusRef = useRef<AuthStatus>('loading');

  const isLoading = authStatus === 'loading';

  const clearState = useCallback(() => {
    currentUserIdRef.current = null;
    setSession(null);
    setUser(null);
    setProfile(null);
    setRoles([]);
  }, []);

  const fetchProfile = useCallback(async (userId: string): Promise<boolean> => {
    try {
      const results = await withTimeout(
        Promise.all([
          supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
          supabase.from('user_roles').select('role').eq('user_id', userId),
        ]),
        PROFILE_FETCH_TIMEOUT_MS,
        `Auth: profile hydration timed out after ${PROFILE_FETCH_TIMEOUT_MS}ms`
      );

      console.log('[Auth Diag] fetchProfile resolved in', Math.round(performance.now() - t0), 'ms, got data:', !!results);

      if (!results) {
        return false;
      }

      const [profileResult, rolesResult] = results;

      if (currentUserIdRef.current !== userId) return false;

      if (profileResult.error) {
        console.error('Profile fetch error:', profileResult.error);
        setAuthError('Failed to load profile data');
        return false;
      }

      if (rolesResult.error) {
        console.error('Roles fetch error:', rolesResult.error);
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
  }, []);

  useEffect(() => {
    authStatusRef.current = authStatus;
  }, [authStatus]);

  useEffect(() => {
    let mounted = true;

    // Safety timeout — ALWAYS resolves auth state
    const safetyTimeout = setTimeout(() => {
      if (mounted && authStatusRef.current === 'loading') {
        console.warn('Auth: Force-ending loading state after timeout');
        if (currentUserIdRef.current) {
          setAuthStatus('authenticated');
        } else {
          purgeClientSession();
          clearState();
          setAuthError('Authentication timed out. Please try again.');
          setAuthStatus('unauthenticated');
        }
      }
    }, MAX_LOADING_MS);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!mounted || signingOutRef.current) return;

        if (event === 'SIGNED_OUT' || !newSession) {
          clearState();
          setAuthError(null);
          initCompleteRef.current = true;
          setAuthStatus('unauthenticated');
          return;
        }

        if (event === 'TOKEN_REFRESHED' && !newSession.access_token) {
          console.warn('Auth: Token refresh failed');
          purgeClientSession();
          clearState();
          setAuthError('Session expired. Please sign in again.');
          setAuthStatus('unauthenticated');
          return;
        }

        const newUserId = newSession.user?.id ?? null;

        setSession(newSession);
        setUser(newSession.user ?? null);
        currentUserIdRef.current = newUserId;

        initCompleteRef.current = true;
        setAuthError(null);
        setAuthStatus('authenticated');

        if (newUserId) {
          void fetchProfile(newUserId);
        }
      }
    );

    const initializeAuth = async () => {
      try {
        const { data: { session: localSession } } = await supabase.auth.getSession();

        if (!mounted) return;

        initCompleteRef.current = true;

        if (!localSession) {
          clearState();
          setAuthStatus('unauthenticated');
          return;
        }

        setSession(localSession);
        setUser(localSession.user);
        currentUserIdRef.current = localSession.user.id;
        setAuthError(null);
        setAuthStatus('authenticated');

        void fetchProfile(localSession.user.id);

        void (async () => {
          try {
            const userResult = await withTimeout(
              supabase.auth.getUser(),
              SESSION_VALIDATE_TIMEOUT_MS,
              `Auth: session validation timed out after ${SESSION_VALIDATE_TIMEOUT_MS}ms`
            );

            if (!mounted || !userResult || currentUserIdRef.current !== localSession.user.id) {
              return;
            }

            const { data: { user: validatedUser }, error: userError } = userResult;

            if (userError || !validatedUser) {
              console.warn('Auth: Backend rejected local session:', userError?.message);
              purgeClientSession();
              clearState();
              setAuthError(userError ? 'Session expired. Please sign in again.' : null);
              setAuthStatus('unauthenticated');
            }
          } catch (validationError) {
            console.error('Auth session validation error:', validationError);
          }
        })();
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          purgeClientSession();
          clearState();
          setAuthError('Network error during authentication');
          setAuthStatus('unauthenticated');
        }
      }
    };

    void initializeAuth();

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, [clearState, fetchProfile]);

  useEffect(() => {
    if (authStatus !== 'authenticated' || !user?.id || profile) return;

    let active = true;
    let inFlight = false;

    const hydrateProfile = async () => {
      if (!active || inFlight) return;
      inFlight = true;
      try {
        await fetchProfile(user.id);
      } finally {
        inFlight = false;
      }
    };

    void hydrateProfile();
    const retryTimer = setInterval(() => void hydrateProfile(), 2000);
    const stopTimer = setTimeout(() => clearInterval(retryTimer), 12000);

    return () => {
      active = false;
      clearInterval(retryTimer);
      clearTimeout(stopTimer);
    };
  }, [authStatus, user?.id, profile, fetchProfile]);

  const signUp = useCallback(async (email: string, password: string, metadata?: Record<string, any>) => {
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
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
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
  }, []);

  const signOut = useCallback(async () => {
    signingOutRef.current = true;

    // 1. Clear React state immediately
    clearState();
    setAuthError(null);
    setAuthStatus('unauthenticated');

    // 2. Tell the backend to revoke the session (scope: 'global' signs out ALL devices)
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch {
      console.warn('Server-side sign out may have failed');
    }

    // 3. Purge every client-side token so nothing lingers
    purgeClientSession();

    signingOutRef.current = false;

    // 4. Hard redirect to flush all in-memory state (React tree, query cache, etc.)
    window.location.href = '/login';
  }, [clearState]);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

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
