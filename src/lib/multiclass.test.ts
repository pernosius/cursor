import { describe, expect, it } from 'vitest';
import { applyLevelUp, buildCharacter } from './character';
import { multiclassProblems } from './rules';
import { setHomebrewContent } from './srd';

const base = {
  name: 'Vex',
  speciesId: 'human',
  backgroundId: 'soldier',
  abilities: { str: 14, dex: 13, con: 14, int: 15, wis: 10, cha: 8 },
  bonuses: {},
  skills: ['arcana' as const, 'history' as const],
};

describe('multiclassing (2024)', () => {
  it('splits starting levels and uses average HP for later classes', () => {
    const c = buildCharacter({ ...base, classId: 'wizard', level: 5, extraClasses: [{ classId: 'fighter', level: 2 }] });
    expect(c.classes.map((x) => [x.id, x.level])).toEqual([['wizard', 3], ['fighter', 2]]);
    // Wizard: 6+2, then 2 × (4+2); Fighter: 2 × (6+2)
    expect(c.hp.max).toBe(8 + 12 + 16);
    // Saves come from the starting class only
    expect(c.saves.int && c.saves.wis).toBe(true);
    expect(c.saves.str || c.saves.con).toBe(false);
    // Fighter multiclass proficiencies
    expect(c.proficiencies.armor).toMatch(/Medium Armor/);
    expect(c.proficiencies.weapons).toMatch(/Martial Weapons/);
    // Single caster class → wizard 3 slots
    expect(c.spellSlots.max.slice(0, 2)).toEqual([4, 2]);
    expect(c.features.some((f) => f.name === 'Second Wind')).toBe(true);
  });

  it('grants multiclass proficiencies and a skill on level up', () => {
    let c = buildCharacter({ ...base, classId: 'wizard', level: 1 });
    c = applyLevelUp(c, { classId: 'rogue', hpGain: 7, skills: ['stealth'] });
    expect(c.classes.map((x) => x.id)).toEqual(['wizard', 'rogue']);
    expect(c.skills.stealth).toBe(1);
    expect(c.proficiencies.tools).toMatch(/Thieves' Tools/);
    expect(c.saves.dex).toBe(false);
  });

  it('checks ability score requirements', () => {
    expect(multiclassProblems(base.abilities, ['wizard', 'fighter'])).toEqual([]);
    expect(multiclassProblems(base.abilities, ['wizard', 'paladin'])).toEqual(['Paladin needs Charisma 13']);
    expect(multiclassProblems(base.abilities, ['monk'])).toEqual(['Monk needs Wisdom 13']);
  });
});

describe('homebrew in character building', () => {
  it('uses a homebrew species', () => {
    setHomebrewContent({
      species: [{ id: 'hb-ash', name: 'Ashborn', size: 'Medium', speed: 35, traits: [{ name: 'Ember Blood', desc: 'Fire resistance.' }], subspecies: [] }],
      backgrounds: [],
      feats: [],
      subclasses: {},
      spells: [],
      items: [],
    });
    const c = buildCharacter({ ...base, classId: 'wizard', level: 1, speciesId: 'hb-ash' });
    expect(c.species).toBe('Ashborn');
    expect(c.speed).toBe(35);
    expect(c.features.some((f) => f.name === 'Ember Blood')).toBe(true);
  });
});

describe('homebrew classes', () => {
  it('builds characters from a homebrew class and multiclasses with it', async () => {
    const { toSrdClass, newEntry } = await import('./homebrew');
    const { computeSlots } = await import('./rules');
    const { classById } = await import('./srd');
    const tinker = newEntry('class', 'Tinker', 'Our table');
    tinker.data.hitDie = 8;
    tinker.data.saves = ['con', 'int'];
    tinker.data.caster = 'half';
    tinker.data.spellAbility = 'int';
    tinker.data.primary = 'Intelligence';
    tinker.data.levels[0].features.push({ name: 'Gadgets', desc: 'You build things.' });
    setHomebrewContent({ classes: [toSrdClass(tinker)], species: [], backgrounds: [], feats: [], subclasses: {}, spells: [], items: [] });

    expect(classById('tinker')?.name).toBe('Tinker');
    const c = buildCharacter({ ...base, classId: 'tinker', level: 1 });
    expect(c.saves.int && c.saves.con).toBe(true);
    expect(c.spellAbility).toBe('int');
    expect(c.spellSlots.max[0]).toBe(2); // half casters (rounded up) have slots at level 1
    expect(c.features.some((f) => f.name === 'Gadgets')).toBe(true);
    // Tinker 3 + Wizard 2: caster level ceil(3/2) + 2 = 4
    expect(computeSlots([
      { id: 'tinker', name: 'Tinker', level: 3, hitDie: 8 },
      { id: 'wizard', name: 'Wizard', level: 2, hitDie: 6 },
    ]).slots.slice(0, 2)).toEqual([4, 3]);
    expect(multiclassProblems({ ...base.abilities, int: 12 }, ['tinker'])).toEqual(['Tinker needs Intelligence 13']);
  });
});
