import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { supabase } from '../services/supabase.js';
import {
  getRoleLabel,
  hasPermission as checkPermission,
  isAdmin as checkIsAdmin,
  canWrite as checkCanWrite,
} from '../utils/permissions.js';

const AuthContext = createContext(null);

const DEFAULT_PROFILE = (user) => ({
  id: user?.id || null,
  name: user?.email || 'Usuário',
  role: 'viewer',
});

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const loadProfile = useCallback(async (currentUser) => {
    if (!currentUser) {
      setProfile(null);
      return null;
    }

    try {
      setProfileLoading(true);

      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, role, created_at')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (error) {
        console.error('[PROFILE ERROR]', error);
        const fallback = DEFAULT_PROFILE(currentUser);
        setProfile(fallback);
        return fallback;
      }

      const finalProfile = data || DEFAULT_PROFILE(currentUser);

      setProfile(finalProfile);
      return finalProfile;
    } catch (error) {
      console.error('[LOAD PROFILE ERROR]', error);

      const fallback = DEFAULT_PROFILE(currentUser);
      setProfile(fallback);
      return fallback;
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error('[SESSION ERROR]', error);
        }

        if (!isMounted) return;

        const currentSession = data?.session || null;
        const currentUser = currentSession?.user || null;

        setSession(currentSession);
        setUser(currentUser);

        // Libera a tela logo depois de verificar a sessão.
        setLoading(false);

        // Busca o profile depois, sem travar a tela eternamente.
        if (currentUser) {
          loadProfile(currentUser);
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error('[AUTH INIT ERROR]', error);

        if (isMounted) {
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    }

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      const currentUser = newSession?.user || null;

      setSession(newSession);
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        loadProfile(currentUser);
      } else {
        setProfile(null);
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe?.();
    };
  }, [loadProfile]);

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    const currentUser = data?.user || null;

    if (currentUser) {
      setUser(currentUser);
      setSession(data.session);
      await loadProfile(currentUser);
    }

    return data;
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }

    setSession(null);
    setUser(null);
    setProfile(null);
  }

  const role = profile?.role || 'viewer';

  const value = useMemo(
    () => ({
      session,
      user,
      profile,
      role,
      roleLabel: getRoleLabel(role),
      loading,
      profileLoading,
      signIn,
      signOut,
      reloadProfile: () => loadProfile(user),
      hasPermission: (permission) => checkPermission(role, permission),
      canWrite: checkCanWrite(role),
      isAdmin: checkIsAdmin(role),
      isAuthenticated: Boolean(user),
    }),
    [session, user, profile, role, loading, profileLoading, loadProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  }

  return context;
}