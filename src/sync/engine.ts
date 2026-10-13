import { create } from 'zustand';
import type { RealtimeChannel, User } from '@supabase/supabase-js';
import type { Character } from '../lib/types';
import { flushWrites, metaDel, metaGet, metaSet, onLocalChange, useCharacters } from '../store/characters';
import { saveConfig, supabase, type SupabaseConfig } from './client';

export type SyncStatus = 'unconfigured' | 'signed-out' | 'syncing' | 'synced' | 'offline' | 'error';

interface SyncState {
  status: SyncStatus;
  user: User | null;
  lastSyncedAt: number | null;
  error: string | null;
}

export const useSync = create<SyncState>(() => ({
  status: 'unconfigured',
  user: null,
  lastSyncedAt: null,
  error: null,
}));

interface Row {
  id: string;
  user_id?: string;
  data: Character;
  updated_at: number;
  deleted: boolean;
  server_updated_at: string;
}

const CURSOR_KEY = 'pullCursor';
let running: Promise<void> | null = null;
let again = false;
let pushTimer: ReturnType<typeof setTimeout> | undefined;
let channel: RealtimeChannel | null = null;

const setStatus = (status: SyncStatus, error: string | null = null) => useSync.setState({ status, error });

const pull = async () => {
  const sb = supabase()!;
  const cursor = await metaGet<string>(CURSOR_KEY);
  let q = sb.from('characters').select('id,data,updated_at,deleted,server_updated_at').order('server_updated_at');
  // Re-read a small overlap window so rows committed out of order are never missed.
  if (cursor) q = q.gt('server_updated_at', new Date(new Date(cursor).getTime() - 5000).toISOString());
  const { data, error } = await q.returns<Row[]>();
  if (error) throw error;
  if (!data.length) return;
  useCharacters.getState().applyRemote(data.map(rowToCharacter));
  await metaSet(CURSOR_KEY, data[data.length - 1].server_updated_at);
};

const rowToCharacter = (r: Pick<Row, 'id' | 'data' | 'updated_at' | 'deleted'>): Character => ({
  ...r.data,
  id: r.id,
  updatedAt: Number(r.updated_at),
  deleted: r.deleted || r.data.deleted,
});

const push = async (userId: string) => {
  const { characters, dirty } = useCharacters.getState();
  const batch = [...dirty].map((id) => characters[id]).filter(Boolean);
  if (!batch.length) return;
  const rows = batch.map((c) => ({
    id: c.id,
    user_id: userId,
    data: c,
    updated_at: c.updatedAt,
    deleted: !!c.deleted,
  }));
  for (let i = 0; i < rows.length; i += 50) {
    const { error } = await supabase()!.from('characters').upsert(rows.slice(i, i + 50));
    if (error) throw error;
  }
  useCharacters.getState().markClean(batch.map((c) => ({ id: c.id, updatedAt: c.updatedAt })));
};

/** Pulls remote changes, then pushes local ones. Safe to call any time. */
export const syncNow = async (): Promise<void> => {
  const user = useSync.getState().user;
  if (!supabase() || !user) return;
  if (running) {
    again = true;
    return running;
  }
  if (!navigator.onLine) {
    setStatus('offline');
    return;
  }
  running = (async () => {
    setStatus('syncing');
    try {
      await flushWrites();
      await pull();
      await push(user.id);
      useSync.setState({ status: 'synced', error: null, lastSyncedAt: Date.now() });
    } catch (e) {
      const msg = e instanceof Error ? e.message : (e as { message?: string })?.message ?? String(e);
      setStatus(navigator.onLine ? 'error' : 'offline', msg);
    } finally {
      running = null;
      if (again) {
        again = false;
        void syncNow();
      }
    }
  })();
  return running;
};

const schedulePush = () => {
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => void syncNow(), 1200);
};

const subscribeRealtime = (userId: string) => {
  channel?.unsubscribe();
  channel = supabase()!
    .channel(`characters:${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'characters', filter: `user_id=eq.${userId}` },
      (payload) => {
        const row = payload.new as Row | undefined;
        if (row?.id && row.data) useCharacters.getState().applyRemote([rowToCharacter(row)]);
      },
    )
    .subscribe();
};

let started = false;
let authUnsub: (() => void) | null = null;

export const startSync = async () => {
  const sb = supabase();
  authUnsub?.();
  authUnsub = null;
  channel?.unsubscribe();
  channel = null;
  if (!sb) {
    useSync.setState({ status: 'unconfigured', user: null });
    return;
  }

  const handleUser = async (user: User | null) => {
    const prev = useSync.getState().user;
    useSync.setState({ user, status: user ? 'syncing' : 'signed-out' });
    if (!user) return;
    if (prev?.id !== user.id) {
      // A fresh sign-in: push everything on this device, pull everything from the cloud.
      const lastUser = await metaGet<string>('userId');
      if (lastUser !== user.id) {
        await metaDel(CURSOR_KEY);
        await metaSet('userId', user.id);
        useCharacters.getState().markAllDirty();
      }
      subscribeRealtime(user.id);
    }
    void syncNow();
  };

  const { data } = await sb.auth.getSession();
  await handleUser(data.session?.user ?? null);
  const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
    const next = session?.user ?? null;
    if (next?.id !== useSync.getState().user?.id) void handleUser(next);
  });
  authUnsub = () => sub.subscription.unsubscribe();

  if (!started) {
    started = true;
    onLocalChange(schedulePush);
    window.addEventListener('online', () => void syncNow());
    window.addEventListener('offline', () => setStatus('offline'));
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void syncNow();
    });
    setInterval(() => {
      if (document.visibilityState === 'visible') void syncNow();
    }, 60_000);
  }
};

const redirectUrl = () => window.location.origin + window.location.pathname;

export const sendSignInEmail = async (email: string) => {
  const { error } = await supabase()!.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectUrl(), shouldCreateUser: true },
  });
  if (error) throw error;
};

export const verifyCode = async (email: string, token: string) => {
  const { error } = await supabase()!.auth.verifyOtp({ email, token, type: 'email' });
  if (error) throw error;
};

export const signInWithPassword = async (email: string, password: string) => {
  const { error } = await supabase()!.auth.signInWithPassword({ email, password });
  if (error) throw error;
};

/** Returns true when the account is ready, false when the email must be confirmed first. */
export const signUpWithPassword = async (email: string, password: string) => {
  const { data, error } = await supabase()!.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: redirectUrl() },
  });
  if (error) throw error;
  return !!data.session;
};

export const signOut = async () => {
  await supabase()?.auth.signOut();
  channel?.unsubscribe();
  channel = null;
  useSync.setState({ user: null, status: 'signed-out', lastSyncedAt: null });
};

export const configure = async (cfg: SupabaseConfig | null) => {
  if (useSync.getState().user) await signOut();
  saveConfig(cfg);
  await startSync();
};
