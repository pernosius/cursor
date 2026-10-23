import type { Character } from '../lib/types';
import { normalize } from '../lib/character';
import { createSyncedStore } from './synced';

// Keeps the original IndexedDB names so existing on-device data still loads.
export const characterStore = createSyncedStore<Character>({
  table: 'characters',
  dbName: 'tome',
  storeName: 'characters',
  dirtyKey: 'dirty',
  normalize,
});

export const useCharacters = characterStore.use;

export const useCharacter = (id: string | undefined) => useCharacters((s) => (id ? s.items[id] : undefined));
