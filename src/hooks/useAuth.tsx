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
  signUp: (email: string, password: string, metadata?: Record<string, any>) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const initializedRef = useRef(false);
  const currentUserIdRef = useRef<string | null>(null);

  const fetchProfile = async (userId: string) => {
    try {
      const [profileResult, rolesResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', userId)
      ]);
      
      // Only update state if this user is still the current user
      if (currentUserIdRef.current === userId) {
        setProfile(profileResult.data);
        setRoles(rolesResult.data?.map(r => r.role) || []);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      if (currentUserIdRef.current === userId) {
        setProfile(null);
        setRoles([]);
      }
    }
  };

  useEffect(() => {
    let mounted = true;

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;

        const newUserId = newSession?.user?.id ?? null;
        const previousUserId = currentUserIdRef.current;
        
        setSession(newSession);
        setUser(newSession?.user ?? null);
        currentUserIdRef.current = newUserId;

        if (newUserId) {
          // For sign-in events (new user or different user), set loading while fetching profile
          const isNewSignIn = event === 'SIGNED_IN' && newUserId !== previousUserId;
          
          if (isNewSignIn && initializedRef.current) {
            setIsLoading(true);
          }
          
          await fetchProfile(newUserId);
          
          if (isNewSignIn && initializedRef.current && mounted) {
            setIsLoading(false);
          }
        } else {
          setProfile(null);
          setRoles([]);
        }
      }
    );

    // INITIAL load
    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (!mounted) return;

        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        currentUserIdRef.current = currentSession?.user?.id ?? null;

        if (currentSession?.user) {
          await fetchProfile(currentSession.user.id);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
          initializedRef.current = true;
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, metadata?: Record<string, any>) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: metadata,
      },
    });
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    currentUserIdRef.current = null;
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
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
