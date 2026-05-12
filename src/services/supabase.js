import { createClient } from '@supabase/supabase-js'

const cleanEnv = (value) => {
  return value?.trim().replace(/^["']|["']$/g, '')
}

const supabaseUrl = cleanEnv(import.meta.env.VITE_SUPABASE_URL)
const supabaseAnonKey = cleanEnv(import.meta.env.VITE_SUPABASE_ANON_KEY)

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Variáveis do Supabase não configuradas corretamente.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)