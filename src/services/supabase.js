import { createClient } from '@supabase/supabase-js';

const cleanEnv = (value) => {
  return value?.trim().replace(/^["']|["']$/g, '');
};

const supabaseUrl = cleanEnv(import.meta.env.VITE_SUPABASE_URL);
const supabaseAnonKey = cleanEnv(import.meta.env.VITE_SUPABASE_ANON_KEY);

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env ou no Netlify.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  return data.user;
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('Usuário não autenticado.');
  }

  return user;
}

export function getFriendlySupabaseError(error) {
  if (!error) {
    return 'Erro inesperado.';
  }

  const message = error?.message || String(error);

  if (message.includes('Invalid login credentials')) {
    return 'E-mail ou senha inválidos.';
  }

  if (message.includes('Email not confirmed')) {
    return 'E-mail ainda não confirmado. Confirme o usuário no Supabase Auth.';
  }

  if (message.includes('Failed to fetch')) {
    return 'Não foi possível conectar ao Supabase. Verifique a URL, a chave pública e as variáveis de ambiente.';
  }

  if (message.includes('JWT')) {
    return 'Sessão expirada. Faça login novamente.';
  }

  if (message.includes('duplicate key')) {
    return 'Registro duplicado.';
  }

  if (message.includes('violates check constraint')) {
    return 'Algum campo possui valor inválido.';
  }

  if (message.includes('permission denied')) {
    return 'Você não tem permissão para executar esta ação.';
  }

  if (message.includes('row-level security')) {
    return 'Ação bloqueada pelas regras de segurança do Supabase.';
  }

  return message || 'Ocorreu um erro inesperado. Tente novamente.';
}