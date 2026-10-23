import { createSyncedStore } from './synced';
import {
  normalizeEntry, toSrdBackground, toSrdFeat, toSrdItem, toSrdSpecies, toSrdSpell, toSrdSubclass,
  type HomebrewEntry, type HomebrewKind,
} from '../lib/homebrew';
import { setHomebrewContent } from '../lib/srd';

export const homebrewStore = createSyncedStore<HomebrewEntry>({
  table: 'homebrew',
  dbName: 'tome-homebrew',
  storeName: 'entries',
  dirtyKey: 'dirty:homebrew',
  normalize: (raw) => normalizeEntry(raw),
});

export const useHomebrew = homebrewStore.use;

/** Live (non-deleted) homebrew entries of one kind, sorted by name. */
export const useHomebrewOf = <K extends HomebrewKind>(kind: K) => {
  const items = useHomebrew((s) => s.items);
  return Object.values(items)
    .filter((e) => e.kind === kind && !e.deleted)
    .map((e) => e as HomebrewEntry<K>)
    .sort((a, b) => a.name.localeCompare(b.name));
};

/** Keeps the rules registry in step with the library. */
const publish = (items: Record<string, HomebrewEntry>) => {
  const live = Object.values(items).filter((e) => !e.deleted && e.name.trim());
  const of = <K extends HomebrewKind>(k: K) => live.filter((e) => e.kind === k) as HomebrewEntry<K>[];
  const subclasses: Record<string, ReturnType<typeof toSrdSubclass>[]> = {};
  for (const e of of('subclass')) (subclasses[e.data.classId] ??= []).push(toSrdSubclass(e));
  setHomebrewContent({
    species: of('species').map(toSrdSpecies),
    backgrounds: of('background').map(toSrdBackground),
    feats: of('feat').map(toSrdFeat),
    subclasses,
    spells: of('spell').map(toSrdSpell),
    items: of('item').map(toSrdItem),
  });
};
useHomebrew.subscribe((s, prev) => {
  if (s.items !== prev.items) publish(s.items);
});
