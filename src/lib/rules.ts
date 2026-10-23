import type { Ability, Character, ClassEntry, SkillId } from './types';
import { classById } from './srd';

export const ABILITIES: { id: Ability; name: string; short: string }[] = [
  { id: 'str', name: 'Strength', short: 'STR' },
  { id: 'dex', name: 'Dexterity', short: 'DEX' },
  { id: 'con', name: 'Constitution', short: 'CON' },
  { id: 'int', name: 'Intelligence', short: 'INT' },
  { id: 'wis', name: 'Wisdom', short: 'WIS' },
  { id: 'cha', name: 'Charisma', short: 'CHA' },
];

export const SKILLS: { id: SkillId; name: string; ability: Ability }[] = [
  { id: 'acrobatics', name: 'Acrobatics', ability: 'dex' },
  { id: 'animal-handling', name: 'Animal Handling', ability: 'wis' },
  { id: 'arcana', name: 'Arcana', ability: 'int' },
  { id: 'athletics', name: 'Athletics', ability: 'str' },
  { id: 'deception', name: 'Deception', ability: 'cha' },
  { id: 'history', name: 'History', ability: 'int' },
  { id: 'insight', name: 'Insight', ability: 'wis' },
  { id: 'intimidation', name: 'Intimidation', ability: 'cha' },
  { id: 'investigation', name: 'Investigation', ability: 'int' },
  { id: 'medicine', name: 'Medicine', ability: 'wis' },
  { id: 'nature', name: 'Nature', ability: 'int' },
  { id: 'perception', name: 'Perception', ability: 'wis' },
  { id: 'performance', name: 'Performance', ability: 'cha' },
  { id: 'persuasion', name: 'Persuasion', ability: 'cha' },
  { id: 'religion', name: 'Religion', ability: 'int' },
  { id: 'sleight-of-hand', name: 'Sleight of Hand', ability: 'dex' },
  { id: 'stealth', name: 'Stealth', ability: 'dex' },
  { id: 'survival', name: 'Survival', ability: 'wis' },
];

export const ALIGNMENTS = [
  'Lawful Good', 'Neutral Good', 'Chaotic Good',
  'Lawful Neutral', 'Neutral', 'Chaotic Neutral',
  'Lawful Evil', 'Neutral Evil', 'Chaotic Evil', 'Unaligned',
];

/** Accent colors per class — the heart of the sheet's look. */
export const CLASS_COLORS: Record<string, string> = {
  barbarian: '#b4472f', // dried blood
  bard: '#b5617a', // rose madder
  cleric: '#cdb26a', // vellum gold
  druid: '#6f8f3c', // moss
  fighter: '#b06a3b', // rust
  monk: '#c98a2e', // saffron
  paladin: '#8a9cb0', // burnished steel
  ranger: '#4f7748', // pine
  rogue: '#7d7a72', // pewter
  sorcerer: '#a63d4a', // crimson
  warlock: '#3f8a7d', // verdigris
  wizard: '#4f74a8', // lapis
};
export const DEFAULT_ACCENT = '#b8955a';

export const accentOf = (c: Pick<Character, 'accent' | 'classes'>) => {
  if (c.accent) return c.accent;
  const primary = [...c.classes].sort((a, b) => b.level - a.level)[0];
  return (primary && CLASS_COLORS[primary.id]) || DEFAULT_ACCENT;
};

export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];
export const POINT_BUY_COST: Record<number, number> = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };

/** 2024 XP thresholds; index = level - 1 */
export const XP_TABLE = [
  0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000,
  85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000,
];

export const mod = (score: number) => Math.floor((score - 10) / 2);
export const fmt = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
export const totalLevel = (c: Pick<Character, 'classes'>) =>
  Math.max(1, c.classes.reduce((s, x) => s + x.level, 0));
export const profBonus = (level: number) => Math.ceil(level / 4) + 1;

/** 2024 Exhaustion: −2 per level to every D20 Test. */
export const d20Penalty = (c: Character) => -2 * (c.exhaustion || 0);

export const abilityMod = (c: Character, a: Ability) => mod(c.abilities[a]);

export const saveMod = (c: Character, a: Ability) =>
  abilityMod(c, a) + (c.saves[a] ? profBonus(totalLevel(c)) : 0) + d20Penalty(c);

export const skillMod = (c: Character, s: SkillId) => {
  const def = SKILLS.find((x) => x.id === s)!;
  const pb = profBonus(totalLevel(c));
  const lvl = c.skills[s] ?? 0;
  const prof = lvl === 2 ? pb * 2 : lvl === 1 ? pb : c.jackOfAllTrades ? Math.floor(pb / 2) : 0;
  return abilityMod(c, def.ability) + prof + d20Penalty(c);
};

export const passive = (c: Character, s: SkillId) => 10 + skillMod(c, s);

export const initiative = (c: Character) => abilityMod(c, 'dex') + (c.initiativeBonus || 0) + d20Penalty(c);

export const speed = (c: Character) => Math.max(0, c.speed - 5 * (c.exhaustion || 0));

export interface AcBreakdown { total: number; parts: string[] }

export const armorClass = (c: Character): AcBreakdown => {
  if (c.acOverride != null) return { total: c.acOverride, parts: ['Manual override'] };
  const dex = abilityMod(c, 'dex');
  const equipped = c.inventory.filter((i) => i.equipped && i.armor);
  const armor = equipped.find((i) => i.armor!.kind !== 'shield');
  const shield = equipped.find((i) => i.armor!.kind === 'shield');
  const parts: string[] = [];
  let total: number;
  if (armor) {
    const a = armor.armor!;
    const d = a.dex ? (a.maxDex != null ? Math.min(dex, a.maxDex) : dex) : 0;
    total = a.base + d;
    parts.push(`${armor.name} ${a.base}`);
    if (a.dex) parts.push(`DEX ${fmt(d)}`);
  } else {
    const ids = c.classes.map((x) => x.id);
    const barb = ids.includes('barbarian') ? 10 + dex + abilityMod(c, 'con') : 0;
    const monk = ids.includes('monk') && !shield ? 10 + dex + abilityMod(c, 'wis') : 0;
    total = Math.max(10 + dex, barb, monk);
    if (total === monk && monk > 10 + dex) parts.push('Unarmored Defense (DEX + WIS)');
    else if (total === barb && barb > 10 + dex) parts.push('Unarmored Defense (DEX + CON)');
    else parts.push(`Unarmored 10`, `DEX ${fmt(dex)}`);
  }
  if (shield) {
    total += shield.armor!.base;
    parts.push(`${shield.name} +${shield.armor!.base}`);
  }
  if (c.acBonus) {
    total += c.acBonus;
    parts.push(`Bonus ${fmt(c.acBonus)}`);
  }
  return { total, parts };
};

export const spellAbilityOf = (c: Character): Ability | null => {
  if (c.spellAbility) return c.spellAbility;
  for (const cl of [...c.classes].sort((a, b) => b.level - a.level)) {
    const def = classById(cl.id);
    if (def?.spellAbility) return def.spellAbility;
  }
  return null;
};

export const spellSaveDc = (c: Character) => {
  const a = spellAbilityOf(c);
  return a ? 8 + profBonus(totalLevel(c)) + abilityMod(c, a) : null;
};
export const spellAttack = (c: Character) => {
  const a = spellAbilityOf(c);
  return a ? profBonus(totalLevel(c)) + abilityMod(c, a) + d20Penalty(c) : null;
};

export const attackAbility = (c: Character, ability: Character['attacks'][number]['ability']): Ability => {
  if (ability === 'spell') return spellAbilityOf(c) ?? 'int';
  if (ability === 'finesse') return abilityMod(c, 'dex') >= abilityMod(c, 'str') ? 'dex' : 'str';
  return ability;
};

export const attackToHit = (c: Character, atk: Character['attacks'][number]) =>
  abilityMod(c, attackAbility(c, atk.ability)) +
  (atk.proficient ? profBonus(totalLevel(c)) : 0) +
  (atk.toHitBonus || 0) +
  d20Penalty(c);

export const attackDamage = (c: Character, atk: Character['attacks'][number]) => {
  if (!atk.damageBonus) return atk.damage;
  const m = abilityMod(c, attackAbility(c, atk.ability));
  if (!atk.damage) return fmt(m);
  return m === 0 ? atk.damage : `${atk.damage}${m > 0 ? '+' : ''}${m}`;
};

// ---- Spell slots --------------------------------------------------------

/** Multiclass Spellcaster table (2024), index = caster level. */
const MULTICLASS_SLOTS: number[][] = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [2, 0, 0, 0, 0, 0, 0, 0, 0],
  [3, 0, 0, 0, 0, 0, 0, 0, 0],
  [4, 2, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 2, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 1, 0, 0, 0, 0, 0],
  [4, 3, 3, 2, 0, 0, 0, 0, 0],
  [4, 3, 3, 3, 1, 0, 0, 0, 0],
  [4, 3, 3, 3, 2, 0, 0, 0, 0],
  [4, 3, 3, 3, 2, 1, 0, 0, 0],
  [4, 3, 3, 3, 2, 1, 0, 0, 0],
  [4, 3, 3, 3, 2, 1, 1, 0, 0],
  [4, 3, 3, 3, 2, 1, 1, 0, 0],
  [4, 3, 3, 3, 2, 1, 1, 1, 0],
  [4, 3, 3, 3, 2, 1, 1, 1, 0],
  [4, 3, 3, 3, 2, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 2, 1, 1],
];

export interface SlotCalc {
  slots: number[];
  pact: { level: number; max: number };
}

export const computeSlots = (classes: ClassEntry[]): SlotCalc => {
  const empty = Array(9).fill(0);
  let pact = { level: 0, max: 0 };
  const casters: { entry: ClassEntry; kind: 'full' | 'half' }[] = [];
  for (const entry of classes) {
    const def = classById(entry.id);
    if (!def) continue;
    if (def.caster === 'pact') {
      const row = def.levels[Math.min(entry.level, 20) - 1]?.slots ?? [];
      const lvl = row.findIndex((n) => n > 0);
      if (lvl >= 0) pact = { level: lvl + 1, max: row[lvl] };
    } else if (def.caster === 'full' || def.caster === 'half') {
      casters.push({ entry, kind: def.caster });
    }
  }
  if (casters.length === 0) return { slots: empty, pact };
  if (casters.length === 1) {
    const { entry } = casters[0];
    const row = classById(entry.id)!.levels[Math.min(entry.level, 20) - 1]?.slots;
    return { slots: row ? [...row] : empty, pact };
  }
  // 2024: half casters contribute half their level, rounded up.
  const casterLevel = casters.reduce(
    (s, { entry, kind }) => s + (kind === 'full' ? entry.level : Math.ceil(entry.level / 2)),
    0,
  );
  return { slots: [...MULTICLASS_SLOTS[Math.min(casterLevel, 20)]], pact };
};

export const hitDicePool = (c: Pick<Character, 'classes'>) => {
  const pool: Record<string, number> = {};
  for (const cl of c.classes) pool[cl.hitDie] = (pool[cl.hitDie] ?? 0) + cl.level;
  return pool;
};

export const carryingCapacity = (c: Character) => {
  const size = (c.size ?? 'Medium').toLowerCase();
  const mult = size === 'tiny' ? 0.5 : size === 'large' ? 2 : size === 'huge' ? 4 : size === 'gargantuan' ? 8 : 1;
  return c.abilities.str * 15 * mult;
};

export const inventoryWeight = (c: Character) =>
  c.inventory.reduce((s, i) => s + (i.weight || 0) * (i.qty || 0), 0) +
  Object.values(c.currency).reduce((s, n) => s + n, 0) / 50;

export const classLine = (c: Pick<Character, 'classes'>) =>
  c.classes.map((x) => `${x.name}${x.subclass ? ` (${x.subclass})` : ''} ${x.level}`).join(' / ');

// ---- Multiclassing (2024) ---------------------------------------------------

/** Ability scores of 13+ required to multiclass into or out of a class. */
export const MULTICLASS_PREREQ: Record<string, { all?: Ability[]; any?: Ability[] }> = {
  barbarian: { all: ['str'] },
  bard: { all: ['cha'] },
  cleric: { all: ['wis'] },
  druid: { all: ['wis'] },
  fighter: { any: ['str', 'dex'] },
  monk: { all: ['dex', 'wis'] },
  paladin: { all: ['str', 'cha'] },
  ranger: { all: ['dex', 'wis'] },
  rogue: { all: ['dex'] },
  sorcerer: { all: ['cha'] },
  warlock: { all: ['cha'] },
  wizard: { all: ['int'] },
};

/** Proficiencies gained when a class isn't your first. */
export const MULTICLASS_PROFS: Record<string, { armor: string[]; weapons: string[]; tools: string[]; skills: number; instrument?: boolean }> = {
  barbarian: { armor: ['Shields'], weapons: ['Martial Weapons'], tools: [], skills: 0 },
  bard: { armor: ['Light Armor'], weapons: [], tools: [], skills: 1, instrument: true },
  cleric: { armor: ['Light Armor', 'Medium Armor', 'Shields'], weapons: [], tools: [], skills: 0 },
  druid: { armor: ['Light Armor', 'Shields'], weapons: [], tools: [], skills: 0 },
  fighter: { armor: ['Light Armor', 'Medium Armor', 'Shields'], weapons: ['Martial Weapons'], tools: [], skills: 0 },
  monk: { armor: [], weapons: [], tools: [], skills: 0 },
  paladin: { armor: ['Light Armor', 'Medium Armor', 'Shields'], weapons: ['Martial Weapons'], tools: [], skills: 0 },
  ranger: { armor: ['Light Armor', 'Medium Armor', 'Shields'], weapons: ['Martial Weapons'], tools: [], skills: 1 },
  rogue: { armor: ['Light Armor'], weapons: [], tools: ["Thieves' Tools"], skills: 1 },
  sorcerer: { armor: [], weapons: [], tools: [], skills: 0 },
  warlock: { armor: ['Light Armor'], weapons: [], tools: [], skills: 0 },
  wizard: { armor: [], weapons: [], tools: [], skills: 0 },
};

const abilityName = (a: Ability) => ABILITIES.find((x) => x.id === a)!.name;

/** Lists unmet requirements, e.g. ["Paladin needs Strength 13"]. Empty means allowed. */
export const multiclassProblems = (
  scores: Record<Ability, number>,
  classIds: string[],
  names: Record<string, string> = {},
): string[] => {
  const out: string[] = [];
  for (const id of classIds) {
    const req = MULTICLASS_PREREQ[id];
    if (!req) continue;
    const label = names[id] ?? id[0].toUpperCase() + id.slice(1);
    const missingAll = (req.all ?? []).filter((a) => scores[a] < 13);
    if (missingAll.length) out.push(`${label} needs ${missingAll.map((a) => `${abilityName(a)} 13`).join(' and ')}`);
    if (req.any && !req.any.some((a) => scores[a] >= 13))
      out.push(`${label} needs ${req.any.map((a) => `${abilityName(a)} 13`).join(' or ')}`);
  }
  return out;
};

/** Merges comma lists without duplicates, e.g. "Light Armor" + ["Light Armor", "Shields"]. */
export const mergeList = (existing: string, add: string[]) => {
  const items = existing.split(/,\s*/).filter(Boolean);
  for (const a of add) if (!items.some((x) => x.toLowerCase() === a.toLowerCase())) items.push(a);
  return items.join(', ');
};
