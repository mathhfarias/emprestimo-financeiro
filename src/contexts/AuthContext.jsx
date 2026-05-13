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

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (currentUser) => {
    try {
      if (!currentUser) {
        setProfile(null);
        return null;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, role, created_at')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (error) {
        console.error('[PROFILE ERROR]', error);
      }

      const fallbackProfile = {
        id: currentUser.id,
        name: currentUser.email || 'Usuário',
        role: 'viewer',
      };

      const finalProfile = data || fallbackProfile;

      setProfile(finalProfile);
      return finalProfile;
    } catch (error) {
      console.error('[LOAD PROFILE ERROR]', error);

      const fallbackProfile = {
        id: currentUser?.id,
        name: currentUser?.email || 'Usuário',
        role: 'viewer',
      };

      setProfile(fallbackProfile);
      return fallbackProfile;
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

        if (currentUser) {
          await loadProfile(currentUser);
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error('[AUTH INIT ERROR]', error);

        if (isMounted) {
          setSession(null);
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    initAuth();

    const authListener = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        const currentUser = newSession?.user || null;

        setSession(newSession);
        setUser(currentUser);

        if (currentUser) {
          await loadProfile(currentUser);
        } else {
          setProfile(null);
        }

        setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      authListener?.data?.subscription?.unsubscribe?.();
    };
  }, [loadProfile]);

  async function signIn(email, password) {
    return supabase.auth.signInWithPassword({
      email,
      password,
    });
  }

  async function signOut() {
    const response = await supabase.auth.signOut();

    setSession(null);
    setUser(null);
    setProfile(null);

    return response;
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
      signIn,
      signOut,
      reloadProfile: () => loadProfile(user),
      hasPermission: (permission) => checkPermission(role, permission),
      canWrite: checkCanWrite(role),
      isAdmin: checkIsAdmin(role),
      isAuthenticated: Boolean(user),
    }),
    [session, user, profile, role, loading, loadProfile]
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