export type Ability = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';

export type SkillId =
  | 'acrobatics' | 'animal-handling' | 'arcana' | 'athletics' | 'deception' | 'history'
  | 'insight' | 'intimidation' | 'investigation' | 'medicine' | 'nature' | 'perception'
  | 'performance' | 'persuasion' | 'religion' | 'sleight-of-hand' | 'stealth' | 'survival';

/** 0 = untrained, 1 = proficient, 2 = expertise */
export type ProfLevel = 0 | 1 | 2;

export type Reset = 'short' | 'long' | 'none';

export interface ClassEntry {
  /** SRD class id (e.g. "wizard") or "custom-…" for homebrew */
  id: string;
  name: string;
  level: number;
  hitDie: number;
  subclass?: string;
}

export interface Attack {
  id: string;
  name: string;
  /** Which ability drives to-hit and damage. "spell" uses the spellcasting ability. */
  ability: Ability | 'spell' | 'finesse';
  proficient: boolean;
  toHitBonus: number;
  damage: string;
  damageBonus: boolean;
  damageType: string;
  range?: string;
  notes?: string;
}

export interface Spell {
  id: string;
  srdId?: string;
  name: string;
  level: number;
  school?: string;
  time?: string;
  range?: string;
  components?: string;
  duration?: string;
  concentration?: boolean;
  ritual?: boolean;
  desc?: string;
  higher?: string;
  prepared: boolean;
  /** Always prepared (domain/oath spells etc.) */
  always?: boolean;
}

export interface Item {
  id: string;
  srdId?: string;
  name: string;
  qty: number;
  weight: number;
  category?: string;
  equipped?: boolean;
  attuned?: boolean;
  /** True for items that can be attuned to */
  attunable?: boolean;
  rarity?: string;
  desc?: string;
  armor?: {
    kind: 'light' | 'medium' | 'heavy' | 'shield';
    base: number;
    dex: boolean;
    maxDex: number | null;
    stealthDis?: boolean;
  };
  weapon?: {
    damage: string;
    type: string;
    properties: string[];
    mastery?: string | null;
    range?: string | null;
    ranged?: boolean;
    finesse?: boolean;
  };
}

export interface Feature {
  id: string;
  name: string;
  source: string;
  desc: string;
  /** Class that granted this feature, so trackers can scale on level-up */
  classId?: string;
  uses?: { max: number; used: number; reset: Reset };
}

export interface Note {
  id: string;
  title: string;
  body: string;
  date: number;
}

export interface Character {
  id: string;
  createdAt: number;
  updatedAt: number;
  deleted?: boolean;
  archived?: boolean;

  name: string;
  player?: string;
  campaign?: string;
  portrait?: string;
  /** Custom accent color override (hex) */
  accent?: string;

  species: string;
  subspecies?: string;
  background: string;
  alignment?: string;
  size?: string;
  xp: number;
  classes: ClassEntry[];

  abilities: Record<Ability, number>;
  saves: Record<Ability, boolean>;
  skills: Record<SkillId, ProfLevel>;
  jackOfAllTrades?: boolean;

  hp: { current: number; max: number; temp: number };
  /** Spent hit dice keyed by die size, e.g. { 8: 2 } */
  hitDiceUsed: Record<string, number>;
  deathSaves: { success: number; fail: number };
  heroicInspiration: boolean;
  exhaustion: number;
  conditions: string[];

  speed: number;
  initiativeBonus: number;
  acBonus: number;
  /** When set, replaces the computed AC entirely */
  acOverride?: number | null;

  attacks: Attack[];

  spellAbility?: Ability | null;
  spellSlots: { max: number[]; used: number[] };
  pactSlots: { level: number; max: number; used: number };
  spells: Spell[];

  inventory: Item[];
  currency: { cp: number; sp: number; ep: number; gp: number; pp: number };

  features: Feature[];
  proficiencies: { armor: string; weapons: string; tools: string; languages: string };
  defenses: { resistances: string; immunities: string; vulnerabilities: string; senses: string };

  bio: {
    appearance: string;
    personality: string;
    ideals: string;
    bonds: string;
    flaws: string;
    backstory: string;
    allies: string;
  };
  notes: Note[];
}
