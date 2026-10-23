import { describe, expect, it } from 'vitest';
import { guessKind, parseBackground, parseFeat, parseSpecies, parseSpell, parseSubclass } from './homebrew';
import type { HomebrewBackground, HomebrewFeat, HomebrewSpecies, HomebrewSpell, HomebrewSubclass } from './homebrew';

// Sample text is original homebrew written for these tests.
const SPELL = `Ember Lance
Source: Our Table
Level 2 Evocation (Sorcerer, Wizard)
Casting Time: Action
Range: 60 feet
Components: V, S, M (a pinch of ash)
Duration: Concentration, up to 1 minute
A spear of cinders streaks toward a creature you can see.
It burns brightly.
Using a Higher-Level Spell Slot. The damage increases by 1d6 for each slot level above 2.`;

const SPECIES = `Ashborn
Creature Type: Humanoid
Size: Medium (about 5–6 feet tall)
Speed: 35 feet
As an Ashborn, you have these special traits.
Ember Blood. You have Resistance to Fire damage.
Smoulder. As a Bonus Action you can shed dim light.
It lasts 1 minute.`;

const SUBCLASS = `Path of the Ember
Barbarian Subclass
Rage that burns hot.
Level 3: Ember Rage
While raging, your attacks deal extra Fire damage.
Level 6: Ashen Stride
You ignore difficult terrain made of rubble.`;

describe('paste & parse', () => {
  it('reads a 2024-style spell block', () => {
    const r = parseSpell(SPELL);
    const d = r.data as HomebrewSpell;
    expect(r.name).toBe('Ember Lance');
    expect(r.source).toBe('Our Table');
    expect(d.level).toBe(2);
    expect(d.school).toBe('Evocation');
    expect(d.classes).toEqual(['sorcerer', 'wizard']);
    expect(d.range).toBe('60 feet');
    expect(d.concentration).toBe(true);
    expect(d.desc).toContain('spear of cinders');
    expect(d.desc).toContain('burns brightly');
    expect(d.higher).toMatch(/^The damage increases/);
    expect(guessKind(SPELL)).toBe('spell');
  });

  it('reads cantrips', () => {
    const d = parseSpell('Spark\nEvocation Cantrip (Wizard)\nCasting Time: Action\nZap.').data as HomebrewSpell;
    expect(d.level).toBe(0);
    expect(d.classes).toEqual(['wizard']);
  });

  it('reads a species with traits', () => {
    const r = parseSpecies(SPECIES);
    const d = r.data as HomebrewSpecies;
    expect(d.size).toBe('Medium');
    expect(d.speed).toBe(35);
    expect(d.traits.map((t) => t.name)).toEqual(['Ember Blood', 'Smoulder']);
    expect(d.traits[1].desc).toContain('lasts 1 minute');
    expect(guessKind(SPECIES)).toBe('species');
  });

  it('reads subclass features by level and detects the class', () => {
    const d = parseSubclass(SUBCLASS).data as HomebrewSubclass;
    expect(d.classId).toBe('barbarian');
    expect(d.features.map((f) => [f.level, f.name])).toEqual([[3, 'Ember Rage'], [6, 'Ashen Stride']]);
    expect(guessKind(SUBCLASS)).toBe('subclass');
  });

  it('reads feat category and prerequisite', () => {
    const d = parseFeat('Quick Draw\nGeneral Feat (Prerequisite: Level 4+)\nYou draw fast.').data as HomebrewFeat;
    expect(d.type).toBe('general');
    expect(d.prerequisite).toBe('Level 4+');
    expect(d.desc).toBe('You draw fast.');
  });

  it('reads background fields', () => {
    const d = parseBackground(
      'Smith\nAbility Scores: Strength, Constitution, Wisdom\nFeat: Savage Attacker\nSkill Proficiencies: Athletics and Insight\nTool Proficiency: Smith\'s Tools\nEquipment: Hammer, 10 GP',
    ).data as HomebrewBackground;
    expect(d.abilities).toEqual(['str', 'con', 'wis']);
    expect(d.skills).toEqual(['athletics', 'insight']);
    expect(d.feat).toBe('Savage Attacker');
    expect(d.tools).toBe("Smith's Tools");
  });
});
