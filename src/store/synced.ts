import { create, type StoreApi, type UseBoundStore } from 'zustand';
import { createStore, del, entries, get, set, setMany } from 'idb-keyval';

/** Anything kept on-device and mirrored to a Supabase table. */
export interface SyncedRecord {
  id: string;
  updatedAt: number;
  deleted?: boolean;
}

export interface SyncedState<T extends SyncedRecord> {
  ready: boolean;
  items: Record<string, T>;
  /** Ids with local edits not yet pushed to the cloud */
  dirty: Set<string>;
  load: () => Promise<void>;
  add: (item: T) => void;
  update: (id: string, fn: (item: T) => T) => void;
  remove: (id: string) => void;
  /** Merge rows that came from the cloud (last write wins by updatedAt). */
  applyRemote: (rows: T[]) => void;
  markClean: (pushed: { id: string; updatedAt: number }[]) => void;
  markAllDirty: () => void;
}

export interface SyncedStore<T extends SyncedRecord> {
  /** Supabase table name */
  table: string;
  use: UseBoundStore<StoreApi<SyncedState<T>>>;
  flush: () => Promise<void>;
  normalize: (raw: Partial<T>) => T;
}

const metaDb = createStore('tome-meta', 'meta');
export const metaGet = <T>(key: string) => get<T>(key, metaDb);
export const metaSet = (key: string, value: unknown) => set(key, value, metaDb);
export const metaDel = (key: string) => del(key, metaDb);

const listeners = new Set<() => void>();
/** Subscribe to local edits in any synced store (used to schedule a push). */
export const onLocalChange = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const syncedStores: SyncedStore<SyncedRecord>[] = [];

export function createSyncedStore<T extends SyncedRecord>(opts: {
  table: string;
  dbName: string;
  storeName: string;
  dirtyKey: string;
  normalize: (raw: Partial<T>) => T;
}): SyncedStore<T> {
  const db = createStore(opts.dbName, opts.storeName);
  const pending = new Map<string, T>();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const flush = async () => {
    if (!pending.size) return;
    const batch = [...pending.entries()];
    pending.clear();
    await setMany(batch, db);
    await metaSet(opts.dirtyKey, [...use.getState().dirty]);
  };
  const persistSoon = (item: T) => {
    pending.set(item.id, item);
    clearTimeout(timer);
    timer = setTimeout(flush, 250);
  };
  const changed = () => listeners.forEach((l) => l());

  const use = create<SyncedState<T>>((setState, getState) => ({
    ready: false,
    items: {},
    dirty: new Set(),

    load: async () => {
      const [rows, dirty] = await Promise.all([entries<string, T>(db), metaGet<string[]>(opts.dirtyKey)]);
      const items: Record<string, T> = {};
      for (const [id, raw] of rows) items[id] = opts.normalize(raw);
      setState({ items, dirty: new Set(dirty ?? []), ready: true });
    },

    add: (item) => {
      setState({ items: { ...getState().items, [item.id]: item }, dirty: new Set(getState().dirty).add(item.id) });
      persistSoon(item);
      changed();
    },

    update: (id, fn) => {
      const prev = getState().items[id];
      if (!prev) return;
      const next = { ...fn(prev), updatedAt: Math.max(Date.now(), prev.updatedAt + 1) };
      setState({ items: { ...getState().items, [id]: next }, dirty: new Set(getState().dirty).add(id) });
      persistSoon(next);
      changed();
    },

    remove: (id) => getState().update(id, (x) => ({ ...x, deleted: true })),

    applyRemote: (rows) => {
      const { items, dirty } = getState();
      const nextItems = { ...items };
      const nextDirty = new Set(dirty);
      let didChange = false;
      for (const raw of rows) {
        const remote = opts.normalize(raw);
        const local = items[remote.id];
        if (!local || remote.updatedAt > local.updatedAt) {
          nextItems[remote.id] = remote;
          nextDirty.delete(remote.id);
          persistSoon(remote);
          didChange = true;
        } else if (remote.updatedAt === local.updatedAt && nextDirty.delete(remote.id)) {
          didChange = true;
        }
      }
      if (didChange) setState({ items: nextItems, dirty: nextDirty });
    },

    markClean: (pushed) => {
      const { items, dirty } = getState();
      const next = new Set(dirty);
      for (const p of pushed) if (items[p.id]?.updatedAt === p.updatedAt) next.delete(p.id);
      setState({ dirty: next });
      void metaSet(opts.dirtyKey, [...next]);
    },

    markAllDirty: () => {
      const next = new Set(Object.keys(getState().items));
      setState({ dirty: next });
      void metaSet(opts.dirtyKey, [...next]);
    },
  }));

  const store: SyncedStore<T> = { table: opts.table, use, flush, normalize: opts.normalize };
  syncedStores.push(store as unknown as SyncedStore<SyncedRecord>);
  return store;
}

export const flushAll = () => Promise.all(syncedStores.map((s) => s.flush()));

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => void flushAll());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flushAll();
  });
}
