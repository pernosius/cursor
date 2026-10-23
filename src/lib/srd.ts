import classesData from '../data/srd/classes.json';
import speciesData from '../data/srd/species.json';
import backgroundsData from '../data/srd/backgrounds.json';
import featsData from '../data/srd/feats.json';
import conditionsData from '../data/srd/conditions.json';
import type { Ability, SkillId } from './types';

export interface SrdFeature { name: string; desc: string }
export interface SrdClassLevel {
  level: number;
  features: SrdFeature[];
  cantrips: number;
  prepared: number;
  slots: number[] | null;
  specific: Record<string, unknown>;
}
export interface SrdSubclass {
  id: string;
  name: string;
  summary: string;
  desc: string;
  features: (SrdFeature & { level: number })[];
}
export interface SrdClass {
  id: string;
  name: string;
  hitDie: number;
  primary: string;
  saves: Ability[];
  proficiencies: string[];
  skillChoices: { choose: number; from: SkillId[] } | null;
  caster: 'full' | 'half' | 'pact' | 'none';
  spellAbility: Ability | null;
  levels: SrdClassLevel[];
  subclasses: SrdSubclass[];
}
export interface SrdSpecies {
  id: string;
  name: string;
  size: string;
  speed: number;
  traits: SrdFeature[];
  subspecies: { id: string; name: string; traits: SrdFeature[] }[];
}
export interface SrdBackground {
  id: string;
  name: string;
  abilities: Ability[];
  feat: string | null;
  featId: string | null;
  skills: SkillId[];
  tools: string[];
  equipment: string;
}
export interface SrdFeat { id: string; name: string; type: string; desc: string }
export interface SrdCondition { id: string; name: string; desc: string }
export interface SrdSpell {
  id: string;
  name: string;
  level: number;
  school: string;
  classes: string[];
  time: string;
  ritual: boolean;
  range: string;
  components: string;
  duration: string;
  concentration: boolean;
  desc: string;
  higher: string;
}
export interface SrdItem {
  id: string;
  name: string;
  category: string;
  sub: string;
  cost: string;
  weight: number;
  desc: string;
  rarity?: string;
  attunement?: boolean;
  weapon?: {
    damage: string;
    type: string;
    versatile: string | null;
    properties: string[];
    mastery: string | null;
    range: string | null;
    ranged: boolean;
    finesse: boolean;
    martial: boolean;
  };
  armor?: {
    kind: 'light' | 'medium' | 'heavy' | 'shield';
    base: number;
    dex: boolean;
    maxDex: number | null;
    stealthDis: boolean;
    strMin: number;
  };
}

export const CLASSES = classesData as unknown as SrdClass[];
export const SPECIES = speciesData as unknown as SrdSpecies[];
export const BACKGROUNDS = backgroundsData as unknown as SrdBackground[];
export const FEATS = featsData as unknown as SrdFeat[];
export const CONDITIONS = conditionsData as unknown as SrdCondition[];

export const classById = (id: string) => CLASSES.find((c) => c.id === id);

// ---- Homebrew registry ----------------------------------------------------
// The homebrew store pushes its entries here (already converted to SRD shapes)
// so plain functions like buildCharacter can see them without React.

type WithSource<T> = T & { source?: string };
const extra = {
  species: [] as WithSource<SrdSpecies>[],
  backgrounds: [] as WithSource<SrdBackground>[],
  feats: [] as WithSource<SrdFeat>[],
  subclasses: {} as Record<string, WithSource<SrdSubclass>[]>,
  spells: [] as WithSource<SrdSpell>[],
  items: [] as WithSource<SrdItem>[],
};
export const setHomebrewContent = (next: typeof extra) => Object.assign(extra, next);

export const allSpecies = (): WithSource<SrdSpecies>[] => [...SPECIES, ...extra.species];
export const allBackgrounds = (): WithSource<SrdBackground>[] => [...BACKGROUNDS, ...extra.backgrounds];
export const allFeats = (): WithSource<SrdFeat>[] => [...FEATS, ...extra.feats];
export const subclassesFor = (classId: string): WithSource<SrdSubclass>[] => [
  ...(classById(classId)?.subclasses ?? []),
  ...(extra.subclasses[classId] ?? []),
];
export const homebrewSpells = () => extra.spells;
export const homebrewItems = () => extra.items;

export const speciesById = (id: string) => allSpecies().find((s) => s.id === id || s.name === id);

// Spells and items are large, so they are split into their own chunks and
// loaded on first use.
let spellsP: Promise<SrdSpell[]> | null = null;
let itemsP: Promise<SrdItem[]> | null = null;
export const loadSpells = () =>
  (spellsP ??= import('../data/srd/spells.json').then((m) => m.default as unknown as SrdSpell[]));
export const loadItems = () =>
  (itemsP ??= import('../data/srd/items.json').then((m) => m.default as unknown as SrdItem[]));

export const SRD_ATTRIBUTION =
  'This work includes material from the System Reference Document 5.2 (“SRD 5.2”) by Wizards of the Coast LLC, ' +
  'available at https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative Commons Attribution 4.0 ' +
  'International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.';
