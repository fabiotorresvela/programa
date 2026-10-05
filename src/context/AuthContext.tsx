import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { pullUserData } from '../lib/cloudSync';
import { getSupabase, isCloudAuthEnabled } from '../lib/supabase';

type AuthContextValue = {
  enabled: boolean;
  loading: boolean;
  user: User | null;
  session: Session | null;
  syncTick: number;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  refreshCloud: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(isCloudAuthEnabled);
  const [session, setSession] = useState<Session | null>(null);
  const [syncTick, setSyncTick] = useState(0);

  const user = session?.user ?? null;

  const afterLogin = useCallback(async (uid: string) => {
    const pulled = await pullUserData(uid);
    if (!pulled.ok) return pulled.reason === 'no_config' ? null : pulled.reason;
    setSyncTick((n) => n + 1);
    return null;
  }, []);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }

    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
      if (data.session?.user) void afterLogin(data.session.user.id);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (next?.user) void afterLogin(next.user.id);
    });

    return () => sub.subscription.unsubscribe();
  }, [afterLogin]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const supabase = getSupabase();
      if (!supabase) return 'Cuentas en la nube no están configuradas todavía.';
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      return error?.message ?? null;
    },
    [],
  );

  const signUp = useCallback(async (email: string, password: string) => {
    const supabase = getSupabase();
    if (!supabase) return 'Cuentas en la nube no están configuradas todavía.';
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    if (error) return error.message;
    if (data.user && !data.session) {
      return 'Cuenta creada. Revisa tu correo para confirmar (si Supabase lo pide) e inicia sesión.';
    }
    return null;
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabase();
    if (supabase) await supabase.auth.signOut();
    setSession(null);
  }, []);

  const refreshCloud = useCallback(async () => {
    if (!user) return 'No hay sesión.';
    const err = await afterLogin(user.id);
    return err;
  }, [afterLogin, user]);

  const value = useMemo(
    () => ({
      enabled: isCloudAuthEnabled,
      loading,
      user,
      session,
      syncTick,
      signIn,
      signUp,
      signOut,
      refreshCloud,
    }),
    [loading, user, session, syncTick, signIn, signUp, signOut, refreshCloud],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
