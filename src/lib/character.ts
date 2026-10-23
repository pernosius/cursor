import type { Ability, Character, ClassEntry, Feature, SkillId } from './types';
import { uid } from './id';
import { allBackgrounds, allFeats, classById, speciesById, subclassesFor } from './srd';
import { ABILITIES, MULTICLASS_PROFS, SKILLS, computeSlots, mergeList, mod } from './rules';

const blankRecord = <K extends string, V>(keys: readonly K[], v: V) =>
  Object.fromEntries(keys.map((k) => [k, v])) as Record<K, V>;

export const blankCharacter = (): Character => {
  const now = Date.now();
  return {
    id: uid(),
    createdAt: now,
    updatedAt: now,
    name: 'New Adventurer',
    species: '',
    background: '',
    xp: 0,
    classes: [],
    abilities: blankRecord(ABILITIES.map((a) => a.id), 10),
    saves: blankRecord(ABILITIES.map((a) => a.id), false),
    skills: blankRecord(SKILLS.map((s) => s.id), 0 as const),
    hp: { current: 10, max: 10, temp: 0 },
    hitDiceUsed: {},
    deathSaves: { success: 0, fail: 0 },
    heroicInspiration: false,
    exhaustion: 0,
    conditions: [],
    speed: 30,
    initiativeBonus: 0,
    acBonus: 0,
    acOverride: null,
    attacks: [],
    spellAbility: null,
    spellSlots: { max: Array(9).fill(0), used: Array(9).fill(0) },
    pactSlots: { level: 0, max: 0, used: 0 },
    spells: [],
    inventory: [],
    currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    features: [],
    proficiencies: { armor: '', weapons: '', tools: '', languages: 'Common' },
    defenses: { resistances: '', immunities: '', vulnerabilities: '', senses: '' },
    bio: { appearance: '', personality: '', ideals: '', bonds: '', flaws: '', backstory: '', allies: '' },
    notes: [],
  };
};

/** Fills in fields added after a character was first saved. */
export const normalize = (raw: Partial<Character>): Character => {
  const base = blankCharacter();
  return {
    ...base,
    ...raw,
    abilities: { ...base.abilities, ...raw.abilities },
    saves: { ...base.saves, ...raw.saves },
    skills: { ...base.skills, ...raw.skills },
    hp: { ...base.hp, ...raw.hp },
    deathSaves: { ...base.deathSaves, ...raw.deathSaves },
    spellSlots: { ...base.spellSlots, ...raw.spellSlots },
    pactSlots: { ...base.pactSlots, ...raw.pactSlots },
    currency: { ...base.currency, ...raw.currency },
    proficiencies: { ...base.proficiencies, ...raw.proficiencies },
    defenses: { ...base.defenses, ...raw.defenses },
    bio: { ...base.bio, ...raw.bio },
  } as Character;
};

const feature = (name: string, source: string, desc: string): Feature => ({ id: uid(), name, source, desc });

/** Limited uses from the 2024 class tables, so trackers come pre-filled. */
const usesFor = (c: Character, classId: string, featureName: string): Feature['uses'] => {
  const level = c.classes.find((x) => x.id === classId)?.level ?? 1;
  const spec = (classById(classId)?.levels[level - 1]?.specific ?? {}) as Record<string, number>;
  const n = featureName.toLowerCase();
  const fresh = (max: number, reset: 'short' | 'long') => (max > 0 ? { max, used: 0, reset } : undefined);
  if (n === 'rage') return fresh(spec.rage_count, 'long');
  if (n === "monk's focus") return fresh(spec.focus_points, 'short');
  if (n === 'channel divinity') return fresh(spec.channel_divinity_charges, 'short');
  if (n === 'bardic inspiration') return fresh(Math.max(1, mod(c.abilities.cha)), level >= 5 ? 'short' : 'long');
  if (n === 'second wind') return fresh(spec.second_wind_uses || 2, 'short');
  if (n === 'action surge') return fresh(level >= 17 ? 2 : 1, 'short');
  if (n === 'wild shape') return fresh(spec.wild_shape_uses || 2, 'short');
  if (n === 'font of magic') return fresh(spec.sorcery_points, 'long');
  if (n === 'lay on hands') return fresh(5 * level, 'long');
  if (n === 'arcane recovery') return fresh(1, 'long');
  if (n === 'favored enemy') return fresh(spec.favored_enemies, 'long');
  if (n === 'innate sorcery') return fresh(2, 'long');
  if (n === 'magical cunning') return fresh(1, 'long');
  if (n === 'indomitable') return fresh(level >= 17 ? 3 : level >= 13 ? 2 : 1, 'long');
  return undefined;
};

/** Recomputes the max of every known class tracker for the character's current levels. */
export const refreshTrackers = (c: Character): Character => ({
  ...c,
  features: c.features.map((f) => {
    if (!f.classId) return f;
    const uses = usesFor(c, f.classId, f.name);
    if (!uses) return f;
    return { ...f, uses: { ...uses, used: Math.min(f.uses?.used ?? 0, uses.max), reset: f.uses?.reset ?? uses.reset } };
  }),
});

/** Features granted by a class (and subclass, if chosen) at exactly this level. */
export const classFeaturesAt = (entry: ClassEntry, level: number): Feature[] => {
  const def = classById(entry.id);
  if (!def) return [];
  const out: Feature[] = [];
  for (const f of def.levels[level - 1]?.features ?? []) {
    if (/subclass$/i.test(f.name) && entry.subclass) continue;
    out.push({ ...feature(f.name, `${def.name} ${level}`, f.desc), classId: def.id });
  }
  const sub = subclassesFor(def.id).find((s) => s.name === entry.subclass);
  for (const f of sub?.features.filter((x) => x.level === level) ?? []) {
    out.push({ ...feature(f.name, `${sub!.name} ${level}`, f.desc), classId: def.id });
  }
  return out;
};

export interface CreateChoices {
  name: string;
  speciesId: string;
  subspeciesId?: string;
  classId: string;
  subclass?: string;
  level: number;
  backgroundId: string;
  abilities: Record<Ability, number>;
  /** Background ability bonuses, e.g. { str: 2, con: 1 } */
  bonuses: Partial<Record<Ability, number>>;
  skills: SkillId[];
  /** Extra classes when starting above 1st level; their levels come out of `level`. */
  extraClasses?: { classId: string; level: number; subclass?: string; skills?: SkillId[] }[];
  alignment?: string;
  campaign?: string;
  portrait?: string;
}

export const buildCharacter = (ch: CreateChoices): Character => {
  const c = blankCharacter();
  const cls = classById(ch.classId)!;
  const sp = speciesById(ch.speciesId);
  const bg = allBackgrounds().find((b) => b.id === ch.backgroundId);
  const level = Math.max(1, Math.min(20, ch.level));

  c.name = ch.name.trim() || 'Unnamed Hero';
  c.campaign = ch.campaign?.trim() || undefined;
  c.portrait = ch.portrait;
  c.alignment = ch.alignment;
  c.species = sp?.name ?? ch.speciesId;
  c.subspecies = sp?.subspecies.find((s) => s.id === ch.subspeciesId)?.name;
  c.size = sp?.size?.split(' ')[0] ?? 'Medium';
  c.speed = sp?.speed ?? 30;
  c.background = bg?.name ?? ch.backgroundId;

  for (const a of ABILITIES) c.abilities[a.id] = Math.min(20, ch.abilities[a.id] + (ch.bonuses[a.id] ?? 0));
  for (const s of cls.saves) c.saves[s] = true;
  for (const s of [...ch.skills, ...(bg?.skills ?? [])]) c.skills[s] = 1;

  const extras = (ch.extraClasses ?? [])
    .map((x) => ({ ...x, def: classById(x.classId) }))
    .filter((x) => x.def && x.level > 0 && x.classId !== cls.id);
  const primaryLevel = Math.max(1, level - extras.reduce((n, x) => n + x.level, 0));
  const entry: ClassEntry = { id: cls.id, name: cls.name, level: primaryLevel, hitDie: cls.hitDie, subclass: ch.subclass };
  c.classes = [
    entry,
    ...extras.map((x) => ({ id: x.def!.id, name: x.def!.name, level: x.level, hitDie: x.def!.hitDie, subclass: x.subclass })),
  ];
  // 2024 fixed HP: max die at 1st level of your first class, then the rounded-up average.
  const conMod = mod(c.abilities.con);
  let maxHp = cls.hitDie + conMod + (primaryLevel - 1) * (cls.hitDie / 2 + 1 + conMod);
  for (const x of c.classes.slice(1)) maxHp += x.level * (x.hitDie / 2 + 1 + conMod);
  c.hp = { current: Math.max(1, maxHp), max: Math.max(1, maxHp), temp: 0 };

  const { slots, pact } = computeSlots(c.classes);
  c.spellSlots = { max: slots, used: Array(9).fill(0) };
  c.pactSlots = { ...pact, used: 0 };
  c.spellAbility = cls.spellAbility;

  const profs = cls.proficiencies;
  c.proficiencies.armor = profs.filter((p) => /armor|shield/i.test(p)).join(', ');
  c.proficiencies.weapons = profs.filter((p) => /weapon/i.test(p)).join(', ');
  c.proficiencies.tools = [...profs.filter((p) => !/armor|shield|weapon/i.test(p)), ...(bg?.tools ?? [])].join(', ');
  for (const x of extras) {
    const mp = MULTICLASS_PROFS[x.classId];
    if (!mp) continue;
    c.proficiencies.armor = mergeList(c.proficiencies.armor, mp.armor);
    c.proficiencies.weapons = mergeList(c.proficiencies.weapons, mp.weapons);
    c.proficiencies.tools = mergeList(c.proficiencies.tools, mp.tools);
    for (const sk of x.skills ?? []) c.skills[sk] = 1;
  }

  if (sp) {
    for (const t of sp.traits) c.features.push(feature(t.name, sp.name, t.desc));
    const sub = sp.subspecies.find((s) => s.id === ch.subspeciesId);
    for (const t of sub?.traits ?? []) c.features.push(feature(t.name, sub!.name, t.desc));
    const dv = sp.traits.find((t) => /darkvision/i.test(t.name));
    if (dv) c.defenses.senses = dv.name;
  }
  if (bg?.feat) {
    const featName = bg.feat.replace(/\s*\(.*\)$/, '');
    const feat = allFeats().find((f) => f.id === bg.featId || f.name.toLowerCase() === featName.toLowerCase());
    c.features.push(feature(bg.feat, `${bg.name} background`, feat?.desc ?? ''));
  }
  for (const cl of c.classes) for (let l = 1; l <= cl.level; l++) c.features.push(...classFeaturesAt(cl, l));
  return refreshTrackers(c);
};

export interface LevelUpPlan {
  classId: string;
  hpGain: number;
  subclass?: string;
  /** Skills picked when multiclassing into a class that grants one */
  skills?: SkillId[];
}

export const applyLevelUp = (c: Character, plan: LevelUpPlan): Character => {
  const def = classById(plan.classId);
  const classes = c.classes.map((x) => ({ ...x }));
  let entry = classes.find((x) => x.id === plan.classId);
  const multiclassing = !entry && classes.length > 0;
  if (!entry) {
    entry = { id: plan.classId, name: def?.name ?? plan.classId, level: 0, hitDie: def?.hitDie ?? 8 };
    classes.push(entry);
  }
  entry.level += 1;
  if (plan.subclass) entry.subclass = plan.subclass;

  // Picking a subclass mid-career grants every subclass feature up to this level.
  const added: Feature[] = [];
  const hadSub = c.classes.find((x) => x.id === plan.classId)?.subclass;
  for (let l = 1; l <= entry.level; l++) {
    if (l === entry.level) added.push(...classFeaturesAt(entry, l));
    else if (plan.subclass && !hadSub) {
      added.push(...classFeaturesAt(entry, l).filter((f) => !f.source.startsWith(entry!.name)));
    }
  }
  const features = [...c.features, ...added];

  const { slots, pact } = computeSlots(classes);
  let proficiencies = c.proficiencies;
  let skills = c.skills;
  const mp = multiclassing ? MULTICLASS_PROFS[plan.classId] : undefined;
  if (mp) {
    proficiencies = {
      ...proficiencies,
      armor: mergeList(proficiencies.armor, mp.armor),
      weapons: mergeList(proficiencies.weapons, mp.weapons),
      tools: mergeList(proficiencies.tools, mp.tools),
    };
    skills = { ...skills };
    for (const sk of plan.skills ?? []) if (!skills[sk]) skills[sk] = 1;
  }
  return refreshTrackers({
    ...c,
    classes,
    proficiencies,
    skills,
    features,
    hp: { ...c.hp, max: c.hp.max + plan.hpGain, current: c.hp.current + plan.hpGain },
    spellSlots: { max: slots, used: slots.map((_, i) => Math.min(c.spellSlots.used[i] ?? 0, slots[i])) },
    pactSlots: { level: pact.level, max: pact.max, used: Math.min(c.pactSlots.used, pact.max) },
    spellAbility: c.spellAbility ?? def?.spellAbility ?? null,
  });
};

export const longRest = (c: Character): Character => ({
  ...c,
  hp: { current: c.hp.max, max: c.hp.max, temp: 0 },
  hitDiceUsed: {},
  deathSaves: { success: 0, fail: 0 },
  exhaustion: Math.max(0, c.exhaustion - 1),
  spellSlots: { ...c.spellSlots, used: Array(9).fill(0) },
  pactSlots: { ...c.pactSlots, used: 0 },
  features: c.features.map((f) => (f.uses && f.uses.reset !== 'none' ? { ...f, uses: { ...f.uses, used: 0 } } : f)),
});

export const shortRest = (c: Character, healed: number, diceSpent: Record<string, number>): Character => {
  const used = { ...c.hitDiceUsed };
  for (const [die, n] of Object.entries(diceSpent)) used[die] = (used[die] ?? 0) + n;
  return {
    ...c,
    hp: { ...c.hp, current: Math.min(c.hp.max, c.hp.current + healed) },
    hitDiceUsed: used,
    pactSlots: { ...c.pactSlots, used: 0 },
    features: c.features.map((f) => (f.uses?.reset === 'short' ? { ...f, uses: { ...f.uses, used: 0 } } : f)),
  };
};

/** Applies damage, draining temp HP first. */
export const applyDamage = (c: Character, amount: number): Character => {
  const fromTemp = Math.min(c.hp.temp, amount);
  const rest = amount - fromTemp;
  return { ...c, hp: { ...c.hp, temp: c.hp.temp - fromTemp, current: Math.max(0, c.hp.current - rest) } };
};

export const applyHealing = (c: Character, amount: number): Character => ({
  ...c,
  hp: { ...c.hp, current: Math.min(c.hp.max, c.hp.current + amount) },
  deathSaves: c.hp.current === 0 && amount > 0 ? { success: 0, fail: 0 } : c.deathSaves,
});
