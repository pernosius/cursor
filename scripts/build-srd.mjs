// Converts the 5e-bits/5e-database SRD 5.2 (2024) JSON into the compact shapes
// the app ships in src/data/srd. Usage:
//   git clone --depth 1 https://github.com/5e-bits/5e-database.git /tmp/5e-database
//   node scripts/build-srd.mjs /tmp/5e-database
import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2];
if (!root) {
  console.error('usage: node scripts/build-srd.mjs <path-to-5e-database>');
  process.exit(1);
}
const src = path.join(root, 'src/2024/en');
const out = path.resolve('src/data/srd');
fs.mkdirSync(out, { recursive: true });

const load = (name) => JSON.parse(fs.readFileSync(path.join(src, `5e-SRD-${name}.json`), 'utf8'));
const write = (name, data) => {
  fs.writeFileSync(path.join(out, `${name}.json`), JSON.stringify(data));
  console.log(`${name}.json  ${Array.isArray(data) ? data.length : Object.keys(data).length} entries`);
};
const clean = (s) => (s ?? '').replace(/[ \t]+\n/g, '\n').trim();
const abil = (ref) => ref.index;

const features = new Map(load('Features').map((f) => [f.index, f]));
const traits = new Map(load('Traits').map((t) => [t.index, t]));
const levels = load('Levels');
const subclasses = load('Subclasses');

// ---- Classes -------------------------------------------------------------
const casterKind = {
  bard: 'full', cleric: 'full', druid: 'full', sorcerer: 'full', wizard: 'full',
  paladin: 'half', ranger: 'half', warlock: 'pact',
};
const classes = load('Classes').map((c) => {
  const lv = levels
    .filter((l) => l.class?.index === c.index && !l.subclass)
    .sort((a, b) => a.level - b.level);
  const kind = casterKind[c.index] ?? 'none';
  const skillChoice = c.proficiency_choices?.find((p) => p.desc?.toLowerCase().includes('skill') || p.from?.options?.[0]?.item?.index?.startsWith('skill-'));
  return {
    id: c.index,
    name: c.name,
    hitDie: Number(c.hit_die),
    primary: c.primary_ability?.desc ?? '',
    saves: c.saving_throws.map(abil),
    proficiencies: c.proficiencies.filter((p) => !p.index.startsWith('saving-throw')).map((p) => p.name),
    skillChoices: skillChoice
      ? {
          choose: skillChoice.choose,
          from: skillChoice.from.options
            .map((o) => o.item?.index)
            .filter(Boolean)
            .map((i) => i.replace(/^skill-/, '')),
        }
      : null,
    caster: kind,
    spellAbility: c.spellcasting?.spellcasting_ability?.index ?? null,
    levels: lv.map((l) => {
      const sc = l.spellcasting;
      const slots = sc ? Array.from({ length: 9 }, (_, i) => sc[`spell_slots_level_${i + 1}`] ?? 0) : null;
      return {
        level: l.level,
        features: (l.features ?? [])
          .map((f) => features.get(f.index))
          .filter(Boolean)
          .map((f) => ({ name: f.name, desc: clean(f.description) })),
        cantrips: sc?.cantrips_known ?? 0,
        prepared: sc?.prepared_spells ?? 0,
        slots,
        specific: l.class_specific ?? {},
      };
    }),
    subclasses: subclasses
      .filter((s) => s.class.index === c.index)
      .map((s) => ({
        id: s.index,
        name: s.name,
        summary: s.summary ?? '',
        desc: clean(s.description),
        features: (s.features ?? []).map((f) => ({ level: f.level, name: f.name, desc: clean(f.description) })),
      })),
  };
});
write('classes', classes);

// ---- Species -------------------------------------------------------------
const subspecies = new Map(load('Subspecies').map((s) => [s.index, s]));
const traitOf = (t) => {
  const full = traits.get(t.index);
  return { name: full?.name ?? t.name, desc: clean(full?.description) };
};
write(
  'species',
  load('Species').map((s) => ({
    id: s.index,
    name: s.name,
    size: s.size ?? (s.size_options?.from?.options?.map((o) => o.size).join(' or ') || 'Medium or Small'),
    speed: s.speed,
    traits: (s.traits ?? []).map(traitOf),
    subspecies: (s.subspecies ?? []).map((ref) => {
      const sub = subspecies.get(ref.index);
      return { id: ref.index, name: ref.name, traits: (sub?.traits ?? []).map(traitOf) };
    }),
  })),
);

// ---- Backgrounds & feats -------------------------------------------------
write(
  'backgrounds',
  load('Backgrounds').map((b) => ({
    id: b.index,
    name: b.name,
    abilities: b.ability_scores.map(abil),
    feat: b.feat ? `${b.feat.name}${b.feat.note ? ` (${b.feat.note})` : ''}` : null,
    featId: b.feat?.index ?? null,
    skills: b.proficiencies.filter((p) => p.index.startsWith('skill-')).map((p) => p.index.replace(/^skill-/, '')),
    tools: b.proficiencies.filter((p) => !p.index.startsWith('skill-')).map((p) => p.name.replace(/^Tool: /, '')),
    equipment: b.equipment_options?.[0]?.desc ?? '',
  })),
);
write(
  'feats',
  load('Feats').map((f) => ({ id: f.index, name: f.name, type: f.type, desc: clean(f.description) })),
);
write(
  'conditions',
  load('Conditions').map((c) => ({ id: c.index, name: c.name, desc: clean(c.description ?? (c.desc ?? []).join('\n')) })),
);

// ---- Spells --------------------------------------------------------------
write(
  'spells',
  load('Spells')
    .map((s) => ({
      id: s.index,
      name: s.name,
      level: s.level,
      school: s.school?.name ?? '',
      classes: (s.classes ?? []).map((c) => c.index),
      time: s.casting_time,
      ritual: !!s.ritual,
      range: s.range,
      components: (s.components ?? []).join(', ') + (s.material ? ` (${s.material})` : ''),
      duration: s.duration,
      concentration: !!s.concentration,
      desc: clean(s.description ?? (s.desc ?? []).join('\n')),
      higher: clean(s.higher_level ?? (Array.isArray(s.higher_level) ? s.higher_level.join('\n') : '')),
    }))
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name)),
);

// ---- Items ---------------------------------------------------------------
const costStr = (c) => (c ? `${c.quantity} ${c.unit.toUpperCase()}` : '');
const cats = (e) => (e.equipment_categories ?? []).map((c) => c.index);
const equipment = load('Equipment').map((e) => {
  const cs = cats(e);
  let category = 'Gear';
  if (cs.includes('weapons')) category = 'Weapon';
  else if (cs.includes('armor')) category = 'Armor';
  else if (cs.includes('tools')) category = 'Tool';
  else if (cs.includes('mounts-and-vehicles')) category = 'Mount & Vehicle';
  else if (cs.includes('ammunition')) category = 'Ammunition';
  const item = {
    id: e.index,
    name: e.name,
    category,
    sub: e.equipment_categories?.find((c) => !['weapons', 'armor', 'adventuring-gear', 'tools'].includes(c.index) && !/^(melee|ranged)-weapons$/.test(c.index))?.name ?? '',
    cost: costStr(e.cost),
    weight: e.weight ?? 0,
    desc: clean(Array.isArray(e.description) ? e.description.join('\n') : e.description ?? (e.desc ?? []).join('\n')),
  };
  if (e.damage || category === 'Weapon') {
    const props = (e.properties ?? []).map((p) => p.name);
    item.weapon = {
      damage: e.damage?.damage_dice ?? '',
      type: e.damage?.damage_type?.name ?? '',
      versatile: e.two_handed_damage?.damage_dice ?? null,
      properties: props,
      mastery: e.mastery?.name ?? null,
      range: e.range?.long ? `${e.range.normal}/${e.range.long} ft.` : null,
      ranged: cs.includes('ranged-weapons'),
      finesse: props.includes('Finesse'),
      martial: cs.includes('martial-weapons'),
    };
  }
  if (e.armor_class) {
    const shield = cs.includes('shields') || e.index === 'shield';
    item.armor = {
      kind: shield ? 'shield' : cs.includes('heavy-armor') ? 'heavy' : cs.includes('medium-armor') ? 'medium' : 'light',
      base: e.armor_class.base,
      dex: !!e.armor_class.dex_bonus,
      maxDex: e.armor_class.max_bonus ?? null,
      stealthDis: !!e.stealth_disadvantage,
      strMin: e.str_minimum || 0,
    };
  }
  return item;
});
const magic = load('Magic-Items')
  .filter((m) => !m.variant)
  .map((m) => ({
    id: `magic-${m.index}`,
    name: m.name,
    category: 'Magic Item',
    sub: m.equipment_category?.name ?? '',
    rarity: m.rarity?.name ?? '',
    attunement: !!m.attunement,
    weight: 0,
    cost: '',
    desc: clean(Array.isArray(m.desc) ? m.desc.join('\n') : m.desc),
  }));
write('items', [...equipment, ...magic].sort((a, b) => a.name.localeCompare(b.name)));
