import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const LS_KEY = 'tome.supabase';

export interface SupabaseConfig { url: string; anonKey: string }

export const getConfig = (): SupabaseConfig | null => {
  const envUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  try {
    const saved = localStorage.getItem(LS_KEY);
    if (saved) {
      const cfg = JSON.parse(saved) as SupabaseConfig;
      if (cfg.url && cfg.anonKey) return cfg;
    }
  } catch {
    /* ignore unreadable storage */
  }
  return envUrl && envKey ? { url: envUrl, anonKey: envKey } : null;
};

export const isBuiltInConfig = () => !!import.meta.env.VITE_SUPABASE_URL && !localStorage.getItem(LS_KEY);

export const saveConfig = (cfg: SupabaseConfig | null) => {
  if (cfg) localStorage.setItem(LS_KEY, JSON.stringify({ url: cfg.url.trim().replace(/\/$/, ''), anonKey: cfg.anonKey.trim() }));
  else localStorage.removeItem(LS_KEY);
  client = undefined;
};

let client: SupabaseClient | null | undefined;

export const supabase = (): SupabaseClient | null => {
  if (client !== undefined) return client;
  const cfg = getConfig();
  client = cfg
    ? createClient(cfg.url, cfg.anonKey, {
        auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      })
    : null;
  return client;
};
