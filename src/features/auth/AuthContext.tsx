import { useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabaseClient';
import { getErrorMessage } from '../../lib/errors';
import type { Profile } from '../../types/database';
import { ErrorState, LoadingSpinner } from '../../components/ui/States';
import { AuthContext } from './authContextCore';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    // Initial session fetch
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        setAuthError(`セッション情報の取得に失敗しました: ${getErrorMessage(error)}`);
        setIsLoading(false);
        return;
      }

      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (currentUser) {
        setAuthError('');
        fetchProfile(currentUser.id);
      } else {
        setAuthError('');
        setProfile(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Real-time profile sync
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`public:profiles:id=eq.${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          setProfile(payload.new as Profile);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        setProfile(null);
        setAuthError(`プロフィール情報の取得に失敗しました: ${getErrorMessage(error)}`);
      } else {
        setAuthError('');
        setProfile(data as Profile);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>;
  }

  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <ErrorState message={authError} />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ session, user, profile, signOut, refreshProfile, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}
