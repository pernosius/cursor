import type { Ability, SkillId } from './types';
import type { SrdBackground, SrdClass, SrdFeat, SrdItem, SrdSpecies, SrdSpell, SrdSubclass } from './srd';
import { uid } from './id';
import { ABILITIES, SKILLS } from './rules';

export type HomebrewKind = 'spell' | 'item' | 'species' | 'background' | 'feat' | 'subclass' | 'class';

export const HOMEBREW_KINDS: { id: HomebrewKind; label: string; plural: string }[] = [
  { id: 'class', label: 'Class', plural: 'Classes' },
  { id: 'spell', label: 'Spell', plural: 'Spells' },
  { id: 'species', label: 'Species', plural: 'Species' },
  { id: 'subclass', label: 'Subclass', plural: 'Subclasses' },
  { id: 'background', label: 'Background', plural: 'Backgrounds' },
  { id: 'feat', label: 'Feat', plural: 'Feats' },
  { id: 'item', label: 'Item', plural: 'Items' },
];

export interface Trait { name: string; desc: string }

export interface HomebrewSpell {
  level: number; school: string; classes: string[]; time: string; ritual: boolean; range: string;
  components: string; duration: string; concentration: boolean; desc: string; higher: string;
}
export interface HomebrewSpecies { size: string; speed: number; traits: Trait[] }
export interface HomebrewBackground {
  abilities: Ability[]; feat: string; skills: SkillId[]; tools: string; equipment: string; desc: string;
}
export interface HomebrewFeat { type: string; prerequisite: string; desc: string }
export interface HomebrewClassLevel {
  level: number;
  features: Trait[];
  cantrips: number;
  prepared: number;
  slots: number[];
  specific: Record<string, unknown>;
}
export interface HomebrewClass {
  hitDie: number;
  primary: string;
  saves: Ability[];
  skillChoices: { choose: number; from: SkillId[] };
  armor: string;
  weapons: string;
  tools: string;
  caster: 'full' | 'half' | 'third' | 'pact' | 'none';
  spellAbility: Ability | null;
  levels: HomebrewClassLevel[];
  desc: string;
  /** Names of spells on this class's list (beyond spells tagged with the class) */
  spellList?: string[];
}
export interface HomebrewSubclass { classId: string; desc: string; features: (Trait & { level: number })[] }
export interface HomebrewItem {
  category: string; rarity: string; attunement: boolean; weight: number; cost: string; desc: string;
  weapon?: { damage: string; type: string; properties: string[]; mastery: string; range: string; ranged: boolean; finesse: boolean };
  armor?: { kind: 'light' | 'medium' | 'heavy' | 'shield'; base: number; dex: boolean; maxDex: number | null };
}

interface DataByKind {
  spell: HomebrewSpell; species: HomebrewSpecies; background: HomebrewBackground;
  feat: HomebrewFeat; subclass: HomebrewSubclass; item: HomebrewItem; class: HomebrewClass;
}

export type HomebrewEntry<K extends HomebrewKind = HomebrewKind> = {
  [P in K]: {
    id: string;
    kind: P;
    name: string;
    /** Where it came from, e.g. "Player's Handbook" or "Our table" */
    source: string;
    createdAt: number;
    updatedAt: number;
    deleted?: boolean;
    data: DataByKind[P];
  };
}[K];

export const blankData = <K extends HomebrewKind>(kind: K): DataByKind[K] => {
  const d: { [P in HomebrewKind]: DataByKind[P] } = {
    spell: { level: 1, school: '', classes: [], time: 'Action', ritual: false, range: '', components: '', duration: 'Instantaneous', concentration: false, desc: '', higher: '' },
    species: { size: 'Medium', speed: 30, traits: [] },
    background: { abilities: [], feat: '', skills: [], tools: '', equipment: '', desc: '' },
    feat: { type: 'general', prerequisite: '', desc: '' },
    subclass: { classId: '', desc: '', features: [] },
    item: { category: 'Gear', rarity: '', attunement: false, weight: 0, cost: '', desc: '' },
    class: {
      hitDie: 8, primary: '', saves: [], skillChoices: { choose: 2, from: [] }, armor: '', weapons: '', tools: '',
      caster: 'none', spellAbility: null, desc: '',
      levels: Array.from({ length: 20 }, (_, i) => ({ level: i + 1, features: [], cantrips: 0, prepared: 0, slots: Array(9).fill(0), specific: {} })),
    },
  };
  return d[kind] as DataByKind[K];
};

export const newEntry = <K extends HomebrewKind>(kind: K, name = '', source = ''): HomebrewEntry<K> => {
  const now = Date.now();
  return { id: uid(), kind, name, source, createdAt: now, updatedAt: now, data: blankData(kind) } as HomebrewEntry<K>;
};

export const normalizeEntry = (raw: Partial<HomebrewEntry>): HomebrewEntry => {
  const kind = (raw.kind ?? 'spell') as HomebrewKind;
  return {
    id: raw.id ?? uid(),
    kind,
    name: raw.name ?? '',
    source: raw.source ?? '',
    createdAt: raw.createdAt ?? Date.now(),
    updatedAt: raw.updatedAt ?? Date.now(),
    deleted: raw.deleted,
    data: { ...blankData(kind), ...(raw.data as object) },
  } as HomebrewEntry;
};

// ---- Conversion to the shapes the rest of the app already understands ----

const hbId = (e: { id: string }) => `hb-${e.id}`;

/** Homebrew classes are keyed by name ("artificer") so subclasses can point at them. */
export const classSlug = (name: string) => name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Standard slot rows by caster level, used when a homebrew class has no slot table. */
const FULL_SLOTS = [
  [2], [3], [4, 2], [4, 3], [4, 3, 2], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 2], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 3, 3, 1, 1, 1, 1], [4, 3, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 2, 1, 1],
];
const pad9 = (row: number[] = []) => Array.from({ length: 9 }, (_, i) => row[i] ?? 0);
const defaultSlots = (caster: HomebrewClass['caster'], level: number) => {
  const casterLevel =
    caster === 'full' ? level : caster === 'half' ? Math.ceil(level / 2) : caster === 'third' ? Math.floor(level / 3) : 0;
  return casterLevel ? pad9(FULL_SLOTS[casterLevel - 1]) : pad9();
};

export const toSrdClass = (e: HomebrewEntry<'class'>): SrdClass & { source: string } => {
  const d = e.data;
  const hasTable = d.levels.some((l) => l.slots?.some((n) => n > 0));
  return {
    id: classSlug(e.name),
    name: e.name,
    source: e.source || 'Homebrew',
    hitDie: d.hitDie,
    primary: d.primary,
    saves: d.saves,
    proficiencies: [d.armor, d.weapons, d.tools].filter(Boolean),
    skillChoices: d.skillChoices.from.length ? d.skillChoices : null,
    caster: d.caster === 'third' ? 'half' : d.caster,
    casterDivisor: d.caster === 'third' ? 3 : undefined,
    spellAbility: d.spellAbility,
    levels: Array.from({ length: 20 }, (_, i) => {
      const l = d.levels[i] ?? { level: i + 1, features: [], cantrips: 0, prepared: 0, slots: [], specific: {} };
      return {
        level: i + 1,
        features: l.features,
        cantrips: l.cantrips,
        prepared: l.prepared,
        slots: d.caster === 'none' ? null : hasTable ? pad9(l.slots) : defaultSlots(d.caster, i + 1),
        specific: l.specific ?? {},
      };
    }),
    subclasses: [],
    spellList: d.spellList ?? [],
  };
};

export const toSrdSpell = (e: HomebrewEntry<'spell'>): SrdSpell & { source: string } => ({
  id: hbId(e), name: e.name, source: e.source || 'Homebrew', ...e.data,
});
export const toSrdSpecies = (e: HomebrewEntry<'species'>): SrdSpecies & { source: string } => ({
  id: hbId(e), name: e.name, source: e.source || 'Homebrew', size: e.data.size, speed: e.data.speed, traits: e.data.traits, subspecies: [],
});
export const toSrdBackground = (e: HomebrewEntry<'background'>): SrdBackground & { source: string } => ({
  id: hbId(e),
  name: e.name,
  source: e.source || 'Homebrew',
  abilities: e.data.abilities,
  feat: e.data.feat || null,
  featId: null,
  skills: e.data.skills,
  tools: e.data.tools ? e.data.tools.split(/,\s*/).filter(Boolean) : [],
  equipment: e.data.equipment,
});
export const toSrdFeat = (e: HomebrewEntry<'feat'>): SrdFeat & { source: string } => ({
  id: hbId(e), name: e.name, source: e.source || 'Homebrew', type: e.data.type,
  desc: (e.data.prerequisite ? `*Prerequisite: ${e.data.prerequisite}*\n` : '') + e.data.desc,
});
export const toSrdSubclass = (e: HomebrewEntry<'subclass'>): SrdSubclass & { source: string } => ({
  id: hbId(e), name: e.name, source: e.source || 'Homebrew', summary: '', desc: e.data.desc, features: e.data.features,
});
export const toSrdItem = (e: HomebrewEntry<'item'>): SrdItem & { source: string } => ({
  id: hbId(e),
  name: e.name,
  source: e.source || 'Homebrew',
  category: e.data.category || 'Gear',
  sub: '',
  cost: e.data.cost,
  weight: e.data.weight,
  desc: e.data.desc,
  rarity: e.data.rarity,
  attunement: e.data.attunement,
  weapon: e.data.weapon && {
    damage: e.data.weapon.damage, type: e.data.weapon.type, versatile: null, properties: e.data.weapon.properties,
    mastery: e.data.weapon.mastery || null, range: e.data.weapon.range || null, ranged: e.data.weapon.ranged,
    finesse: e.data.weapon.finesse, martial: false,
  },
  armor: e.data.armor && { ...e.data.armor, stealthDis: false, strMin: 0 },
});

// ---- Paste & parse --------------------------------------------------------
// Turns a block of rules text (as copied from a book PDF or wiki page) into
// fields. It is forgiving: anything it can't place ends up in the description.

const CLASS_NAMES = ['Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard', 'Artificer'];
const SCHOOLS = ['Abjuration', 'Conjuration', 'Divination', 'Enchantment', 'Evocation', 'Illusion', 'Necromancy', 'Transmutation'];

const lines = (text: string) =>
  text
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => l.replace(/\s+$/, '').replace(/^\s+/, ''))
    .filter((l, i, arr) => l || (i > 0 && arr[i - 1]));

const classIds = (text: string) =>
  CLASS_NAMES.filter((c) => new RegExp(`\\b${c}\\b`, 'i').test(text)).map((c) => c.toLowerCase());

/** Pulls "Label: value" lines out of the text, returning what's left. */
const takeFields = (ls: string[], labels: string[]) => {
  const found: Record<string, string> = {};
  const rest: string[] = [];
  for (const l of ls) {
    const m = l.match(/^([A-Za-z' ]{3,30}):\s*(.*)$/);
    const key = m && labels.find((x) => x.toLowerCase() === m[1].trim().toLowerCase());
    if (key && !(key in found)) found[key] = m![2].trim();
    else rest.push(l);
  }
  return { found, rest };
};

const isSourceLine = (l: string) => /^source:/i.test(l);
const sourceOf = (ls: string[]) => ls.find(isSourceLine)?.replace(/^source:\s*/i, '').trim() ?? '';

const firstName = (ls: string[]) => ls.find((l) => l && !isSourceLine(l)) ?? '';

const paragraphs = (ls: string[]) => ls.join('\n').replace(/\n{3,}/g, '\n\n').trim();

/** "Trait Name. Description…" → { name, desc } when the lead-in looks like a title. */
const splitTitled = (l: string): Trait | null => {
  const m = l.match(/^([A-Z][\w'’,\-() ]{1,45}?)\.\s+(.+)$/);
  if (!m) return null;
  const words = m[1].split(/\s+/);
  const titled = words.every((w) => /^[A-Z(]/.test(w) || /^(of|the|and|a|an|in|on|to|with|for)$/.test(w));
  return titled ? { name: m[1].trim(), desc: m[2].trim() } : null;
};

export interface ParseResult { name: string; source: string; data: unknown }

export function parseSpell(text: string): ParseResult {
  const ls = lines(text);
  const name = firstName(ls);
  const source = sourceOf(ls);
  const body = ls.filter((l) => l !== name && !isSourceLine(l));
  const data = blankData('spell');
  const rest: string[] = [];
  let higherMode = false;
  for (const l of body) {
    let m: RegExpMatchArray | null;
    if ((m = l.match(/^Level\s+(\d)\s+(\w+)(?:\s*\(([^)]*)\))?/i))) {
      data.level = Number(m[1]);
      data.school = m[2][0].toUpperCase() + m[2].slice(1).toLowerCase();
      if (m[3]) data.classes = classIds(m[3]);
    } else if ((m = l.match(/^(\w+)\s+Cantrip(?:\s*\(([^)]*)\))?/i)) && SCHOOLS.some((s) => s.toLowerCase() === m![1].toLowerCase())) {
      data.level = 0;
      data.school = m[1][0].toUpperCase() + m[1].slice(1).toLowerCase();
      if (m[2]) data.classes = classIds(m[2]);
    } else if ((m = l.match(/^(\d)(?:st|nd|rd|th)-level\s+(\w+)(\s*\(ritual\))?/i))) {
      data.level = Number(m[1]);
      data.school = m[2][0].toUpperCase() + m[2].slice(1).toLowerCase();
      if (m[3]) data.ritual = true;
    } else if ((m = l.match(/^Casting Time:\s*(.+)$/i))) {
      data.time = m[1].trim();
      if (/ritual/i.test(data.time)) data.ritual = true;
    } else if ((m = l.match(/^Range:\s*(.+)$/i))) data.range = m[1].trim();
    else if ((m = l.match(/^Components?:\s*(.+)$/i))) data.components = m[1].trim();
    else if ((m = l.match(/^Duration:\s*(.+)$/i))) {
      data.duration = m[1].trim();
      if (/concentration/i.test(data.duration)) data.concentration = true;
    } else if ((m = l.match(/^Spell Lists?[.:]\s*(.+)$/i))) data.classes = classIds(m[1]);
    else if ((m = l.match(/^(?:Using a Higher-Level Spell Slot|At Higher Levels|Cantrip Upgrade)[.:]\s*(.*)$/i))) {
      data.higher = m[1].trim();
      higherMode = true;
    } else if (higherMode && l) data.higher += `\n${l}`;
    else rest.push(l);
  }
  data.desc = paragraphs(rest);
  return { name, source, data };
}

export function parseSpecies(text: string): ParseResult {
  const ls = lines(text);
  const name = firstName(ls);
  const source = sourceOf(ls);
  const { found, rest } = takeFields(
    ls.filter((l) => l !== name && !isSourceLine(l)),
    ['Creature Type', 'Size', 'Speed'],
  );
  const data = blankData('species');
  if (found.Size) data.size = /small/i.test(found.Size) && /medium/i.test(found.Size) ? 'Medium or Small' : /small/i.test(found.Size) ? 'Small' : 'Medium';
  if (found.Speed) data.speed = Number(found.Speed.match(/\d+/)?.[0] ?? 30);
  data.traits = collectTraits(rest);
  return { name, source, data };
}

/** Groups "Name. text" paragraphs (plus their follow-on lines) into traits. */
function collectTraits(ls: string[]): Trait[] {
  const traits: Trait[] = [];
  for (const l of ls) {
    if (!l || /you have (these|the following) (special )?traits/i.test(l)) continue;
    const t = splitTitled(l);
    if (t) traits.push(t);
    else if (traits.length) traits[traits.length - 1].desc += `\n${l}`;
    else traits.push({ name: 'Description', desc: l });
  }
  return traits;
}

export function parseFeat(text: string): ParseResult {
  const ls = lines(text);
  const name = firstName(ls);
  const source = sourceOf(ls);
  const body = ls.filter((l) => l !== name && !isSourceLine(l));
  const data = blankData('feat');
  const rest: string[] = [];
  for (const l of body) {
    const m = l.match(/^(Origin|General|Fighting Style|Epic Boon)\s+Feat(?:\s*\((?:Prerequisite:\s*)?([^)]*)\))?/i);
    if (m && !data.prerequisite && rest.length === 0) {
      data.type = m[1].toLowerCase().replace(/\s+/g, '-');
      data.prerequisite = m[2]?.trim() ?? '';
    } else {
      const p = l.match(/^Prerequisites?:\s*(.+)$/i);
      if (p) data.prerequisite = p[1].trim();
      else rest.push(l);
    }
  }
  data.desc = paragraphs(rest);
  return { name, source, data };
}

const abilityFromWord = (w: string): Ability | undefined =>
  ABILITIES.find((a) => a.name.toLowerCase().startsWith(w.trim().toLowerCase().slice(0, 3)))?.id;

export function parseBackground(text: string): ParseResult {
  const ls = lines(text);
  const name = firstName(ls);
  const source = sourceOf(ls);
  const { found, rest } = takeFields(ls.filter((l) => l !== name && !isSourceLine(l)), [
    'Ability Scores', 'Feat', 'Skill Proficiencies', 'Tool Proficiency', 'Tool Proficiencies', 'Equipment',
  ]);
  const data = blankData('background');
  if (found['Ability Scores'])
    data.abilities = found['Ability Scores'].split(/,|\band\b/).map(abilityFromWord).filter(Boolean) as Ability[];
  data.feat = found.Feat ?? '';
  if (found['Skill Proficiencies'])
    data.skills = SKILLS.filter((s) => new RegExp(`\\b${s.name}\\b`, 'i').test(found['Skill Proficiencies'])).map((s) => s.id);
  data.tools = found['Tool Proficiency'] ?? found['Tool Proficiencies'] ?? '';
  data.equipment = found.Equipment ?? '';
  data.desc = paragraphs(rest);
  return { name, source, data };
}

export function parseSubclass(text: string): ParseResult {
  const ls = lines(text);
  const name = firstName(ls);
  const source = sourceOf(ls);
  const body = ls.filter((l) => l !== name && !isSourceLine(l));
  const data = blankData('subclass');
  const intro: string[] = [];
  let current: (Trait & { level: number }) | null = null;
  for (const l of body) {
    const head = l.match(/^Level\s+(\d+)[:.]?\s+(.+)$/i) ?? l.match(/^(.+?)\s*\(Level\s+(\d+)\)$/i);
    if (head) {
      const level = Number(/^\d+$/.test(head[1]) ? head[1] : head[2]);
      const fname = (/^\d+$/.test(head[1]) ? head[2] : head[1]).trim();
      current = { level, name: fname, desc: '' };
      data.features.push(current);
    } else if (current) current.desc = current.desc ? `${current.desc}\n${l}` : l;
    else intro.push(l);
  }
  for (const f of data.features) f.desc = f.desc.trim();
  const cls = classIds(intro.join(' ') + ' ' + name)[0];
  if (cls) data.classId = cls;
  data.desc = paragraphs(intro);
  return { name, source, data };
}

export function parseItem(text: string): ParseResult {
  const ls = lines(text);
  const name = firstName(ls);
  const source = sourceOf(ls);
  const body = ls.filter((l) => l !== name && !isSourceLine(l));
  const data = blankData('item');
  const rest: string[] = [];
  for (const l of body) {
    const m = l.match(/^(Wondrous Item|Weapon|Armor|Ring|Rod|Staff|Wand|Potion|Scroll)\b[^,]*,\s*(Common|Uncommon|Rare|Very Rare|Legendary|Artifact|Varies)(.*)$/i);
    if (m && rest.length === 0) {
      data.category = 'Magic Item';
      data.rarity = m[2].replace(/\b\w/g, (c) => c.toUpperCase());
      data.attunement = /attunement/i.test(m[3]);
    } else {
      const w = l.match(/^Weight:\s*([\d.]+)/i);
      const c = l.match(/^Cost:\s*(.+)$/i);
      if (w) data.weight = Number(w[1]);
      else if (c) data.cost = c[1].trim();
      else rest.push(l);
    }
  }
  data.desc = paragraphs(rest);
  return { name, source, data };
}

export function parseClass(text: string): ParseResult {
  const sub = parseSubclass(text);
  const d = blankData('class');
  const t = text.replace(/\*\*/g, '');
  const hit = t.match(/Hit (?:Point )?Die[:|\s]*d(\d+)/i);
  if (hit) d.hitDie = Number(hit[1]);
  const prim = t.match(/Primary Ability[:|\s]*([A-Za-z ,]+?)(?:\||\n|$)/i);
  if (prim) d.primary = prim[1].trim();
  const saves = t.match(/Saving Throw(?: Proficiencies)?[:|\s]*([A-Za-z ,]+?)(?:\||\n|$)/i);
  if (saves) d.saves = ABILITIES.filter((a) => saves[1].includes(a.name)).map((a) => a.id);
  const ab = t.match(/(Intelligence|Wisdom|Charisma) is (?:your|the) spellcasting ability/i);
  if (ab) d.spellAbility = abilityFromWord(ab[1]) ?? null;
  for (const f of (sub.data as HomebrewSubclass).features) {
    const lv = d.levels[f.level - 1];
    if (lv) lv.features.push({ name: f.name, desc: f.desc });
  }
  d.desc = (sub.data as HomebrewSubclass).desc;
  return { name: sub.name, source: sub.source, data: d };
}

export const PARSERS: Record<HomebrewKind, (text: string) => ParseResult> = {
  class: parseClass,
  spell: parseSpell,
  species: parseSpecies,
  feat: parseFeat,
  background: parseBackground,
  subclass: parseSubclass,
  item: parseItem,
};

/** Guesses what kind of entry a pasted block is. */
export const guessKind = (text: string): HomebrewKind => {
  if (/Casting Time:/i.test(text) || /^\s*Level \d \w+/im.test(text) || /\bCantrip\b/i.test(text)) return 'spell';
  if (/Creature Type:/i.test(text) || /^\s*Speed:/im.test(text)) return 'species';
  if (/Ability Scores:/i.test(text) && /Skill Proficiencies:/i.test(text)) return 'background';
  if (/\b(Origin|General|Fighting Style|Epic Boon) Feat\b/i.test(text)) return 'feat';
  if (/^\s*Level \d+:/im.test(text)) return 'subclass';
  return 'item';
};
