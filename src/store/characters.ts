import { create } from 'zustand';
import { createStore, del, entries, get, set, setMany } from 'idb-keyval';
import type { Character } from '../lib/types';
import { normalize } from '../lib/character';

const charDb = createStore('tome', 'characters');
const metaDb = createStore('tome-meta', 'meta');

interface CharactersState {
  ready: boolean;
  characters: Record<string, Character>;
  /** Ids with local edits not yet pushed to the cloud */
  dirty: Set<string>;
  load: () => Promise<void>;
  add: (c: Character) => void;
  update: (id: string, fn: (c: Character) => Character) => void;
  remove: (id: string) => void;
  /** Merge rows that came from the cloud (last write wins by updatedAt). */
  applyRemote: (rows: Character[]) => void;
  markClean: (pushed: { id: string; updatedAt: number }[]) => void;
  markAllDirty: () => void;
}

const pendingWrites = new Map<string, Character>();
let writeTimer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

/** Subscribe to local edits (used by the sync engine to schedule a push). */
export const onLocalChange = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

const persistSoon = (c: Character) => {
  pendingWrites.set(c.id, c);
  clearTimeout(writeTimer);
  writeTimer = setTimeout(flushWrites, 250);
};

export const flushWrites = async () => {
  if (!pendingWrites.size) return;
  const batch = [...pendingWrites.entries()];
  pendingWrites.clear();
  await setMany(batch, charDb);
  await set('dirty', [...useCharacters.getState().dirty], metaDb);
};

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => void flushWrites());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flushWrites();
  });
}

export const useCharacters = create<CharactersState>((setState, getState) => ({
  ready: false,
  characters: {},
  dirty: new Set(),

  load: async () => {
    const [rows, dirty] = await Promise.all([entries<string, Character>(charDb), get<string[]>('dirty', metaDb)]);
    const characters: Record<string, Character> = {};
    for (const [id, c] of rows) characters[id] = normalize(c);
    setState({ characters, dirty: new Set(dirty ?? []), ready: true });
  },

  add: (c) => {
    const dirty = new Set(getState().dirty).add(c.id);
    setState({ characters: { ...getState().characters, [c.id]: c }, dirty });
    persistSoon(c);
    listeners.forEach((l) => l());
  },

  update: (id, fn) => {
    const prev = getState().characters[id];
    if (!prev) return;
    const next = { ...fn(prev), updatedAt: Math.max(Date.now(), prev.updatedAt + 1) };
    const dirty = new Set(getState().dirty).add(id);
    setState({ characters: { ...getState().characters, [id]: next }, dirty });
    persistSoon(next);
    listeners.forEach((l) => l());
  },

  remove: (id) => getState().update(id, (c) => ({ ...c, deleted: true })),

  applyRemote: (rows) => {
    const { characters, dirty } = getState();
    const nextChars = { ...characters };
    const nextDirty = new Set(dirty);
    let changed = false;
    for (const raw of rows) {
      const remote = normalize(raw);
      const local = characters[remote.id];
      if (!local || remote.updatedAt > local.updatedAt) {
        nextChars[remote.id] = remote;
        nextDirty.delete(remote.id);
        persistSoon(remote);
        changed = true;
      } else if (remote.updatedAt === local.updatedAt && nextDirty.delete(remote.id)) {
        changed = true;
      }
    }
    if (changed) setState({ characters: nextChars, dirty: nextDirty });
  },

  markClean: (pushed) => {
    const { characters, dirty } = getState();
    const next = new Set(dirty);
    for (const p of pushed) if (characters[p.id]?.updatedAt === p.updatedAt) next.delete(p.id);
    setState({ dirty: next });
    void set('dirty', [...next], metaDb);
  },

  markAllDirty: () => {
    const next = new Set(Object.keys(getState().characters));
    setState({ dirty: next });
    void set('dirty', [...next], metaDb);
  },
}));

export const metaGet = <T>(key: string) => get<T>(key, metaDb);
export const metaSet = (key: string, value: unknown) => set(key, value, metaDb);
export const metaDel = (key: string) => del(key, metaDb);

export const useCharacter = (id: string | undefined) =>
  useCharacters((s) => (id ? s.characters[id] : undefined));
