import { describe, expect, it } from 'vitest';
import { applyDamage, applyLevelUp, buildCharacter, longRest } from './character';
import { armorClass, computeSlots, profBonus, saveMod, skillMod, spellSaveDc } from './rules';
import { roll } from './dice';

const fighter = () =>
  buildCharacter({
    name: 'Brakka',
    speciesId: 'goliath',
    subspeciesId: 'giant-ancestry-fires-burn',
    classId: 'barbarian',
    level: 3,
    backgroundId: 'soldier',
    abilities: { str: 15, dex: 14, con: 13, int: 8, wis: 12, cha: 10 },
    bonuses: { str: 2, con: 1 },
    skills: ['athletics', 'perception'],
  });

describe('character building (2024 rules)', () => {
  it('computes HP, saves and skills', () => {
    const c = fighter();
    // d12 max + CON(+2) at 1st, then 7+2 for two more levels
    expect(c.hp.max).toBe(14 + 9 + 9);
    expect(c.saves.str && c.saves.con).toBe(true);
    expect(saveMod(c, 'str')).toBe(3 + 2);
    expect(skillMod(c, 'athletics')).toBe(3 + 2);
    expect(c.speed).toBe(35);
  });

  it('pre-fills scaling trackers like Rage', () => {
    const c = fighter();
    expect(c.features.find((f) => f.name === 'Rage')?.uses?.max).toBe(3);
  });

  it('uses Unarmored Defense for barbarians', () => {
    expect(armorClass(fighter()).total).toBe(10 + 2 + 2);
  });

  it('levels up with new trackers and HP', () => {
    let c = fighter();
    c = applyLevelUp(c, { classId: 'barbarian', hpGain: 9 });
    expect(c.classes[0].level).toBe(4);
    expect(c.hp.max).toBe(41);
    expect(c.features.filter((f) => f.name === 'Rage')).toHaveLength(1);
  });

  it('drains temp HP first and long rest restores', () => {
    let c = { ...fighter(), hp: { current: 20, max: 32, temp: 5 } };
    c = applyDamage(c, 8);
    expect(c.hp).toEqual({ current: 17, max: 32, temp: 0 });
    expect(longRest(c).hp.current).toBe(32);
  });
});

describe('spellcasting', () => {
  it('uses class tables for single-class casters', () => {
    expect(computeSlots([{ id: 'wizard', name: 'Wizard', level: 5, hitDie: 6 }]).slots.slice(0, 3)).toEqual([4, 3, 2]);
    expect(computeSlots([{ id: 'paladin', name: 'Paladin', level: 1, hitDie: 10 }]).slots[0]).toBe(2);
  });
  it('uses the multiclass table, rounding half casters up', () => {
    const { slots } = computeSlots([
      { id: 'wizard', name: 'Wizard', level: 3, hitDie: 6 },
      { id: 'paladin', name: 'Paladin', level: 3, hitDie: 10 },
    ]);
    expect(slots.slice(0, 3)).toEqual([4, 3, 2]); // caster level 5
  });
  it('tracks warlock pact slots separately', () => {
    expect(computeSlots([{ id: 'warlock', name: 'Warlock', level: 5, hitDie: 8 }]).pact).toEqual({ level: 3, max: 2 });
  });
  it('computes spell save DC', () => {
    const c = buildCharacter({
      name: 'W', speciesId: 'human', classId: 'wizard', level: 1, backgroundId: 'sage',
      abilities: { str: 8, dex: 14, con: 13, int: 15, wis: 12, cha: 10 }, bonuses: { int: 2, con: 1 }, skills: [],
    });
    expect(spellSaveDc(c)).toBe(8 + profBonus(1) + 3);
  });
});

describe('dice', () => {
  it('parses multi-term expressions', () => {
    const r = roll('2d6+1d4-1');
    expect(r.terms).toHaveLength(3);
    expect(r.total).toBeGreaterThanOrEqual(2);
    expect(r.total).toBeLessThanOrEqual(15);
  });
  it('keeps the higher d20 with advantage', () => {
    for (let i = 0; i < 50; i++) {
      const r = roll('1d20', '', 'adv');
      expect(r.terms[0].rolls[0]).toBeGreaterThanOrEqual(r.terms[0].dropped![0]);
    }
  });
});
