import type { TabProps } from '../../pages/Sheet';
import { ABILITIES, SKILLS, fmt, saveMod, skillMod } from '../../lib/rules';
import { d20Expr } from '../../lib/dice';
import type { ProfLevel } from '../../lib/types';
import { useUi } from '../../store/ui';
import { Switch, TextInput, cx } from '../ui';

const PROF_LABEL = ['Not proficient', 'Proficient', 'Expertise'];

export default function SkillsTab({ c, upd }: TabProps) {
  const roll = useUi((s) => s.roll);
  return (
    <div className="grid-2 wide-left">
      <div className="card">
        <div className="card-title">
          <h3>Skills</h3>
          <span className="spacer" />
          <span className="faint tiny">Tap the dot: proficient → expertise</span>
        </div>
        <div className="list">
          {SKILLS.map((s) => {
            const lvl = c.skills[s.id] ?? 0;
            return (
              <div key={s.id} className="li">
                <button
                  className={cx('prof-dot', lvl && `p${lvl}`)}
                  title={PROF_LABEL[lvl]}
                  aria-label={`${s.name}: ${PROF_LABEL[lvl]}`}
                  onClick={() =>
                    upd((x) => ({ ...x, skills: { ...x.skills, [s.id]: ((lvl + 1) % 3) as ProfLevel } }))
                  }
                />
                <span className="grow">
                  {s.name} <span className="faint tiny">{s.ability.toUpperCase()}</span>
                </span>
                <button className="roll-btn val" onClick={() => roll(d20Expr(skillMod(c, s.id)), s.name)}>
                  {fmt(skillMod(c, s.id))}
                </button>
              </div>
            );
          })}
          <div className="li">
            <span className="grow small muted">Jack of All Trades (half proficiency on other checks)</span>
            <Switch on={!!c.jackOfAllTrades} onChange={(v) => upd((x) => ({ ...x, jackOfAllTrades: v }))} />
          </div>
        </div>
      </div>
      <div className="stack">
        <div className="card">
          <div className="card-title">
            <h3>Saving Throws</h3>
          </div>
          <div className="list">
            {ABILITIES.map((a) => (
              <div key={a.id} className="li">
                <button
                  className={cx('prof-dot', c.saves[a.id] && 'p1')}
                  aria-label={`${a.name} save proficiency`}
                  onClick={() => upd((x) => ({ ...x, saves: { ...x.saves, [a.id]: !x.saves[a.id] } }))}
                />
                <span className="grow">{a.name}</span>
                <button className="roll-btn val" onClick={() => roll(d20Expr(saveMod(c, a.id)), `${a.name} save`)}>
                  {fmt(saveMod(c, a.id))}
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-title">
            <h3>Proficiencies & Languages</h3>
          </div>
          <div className="col">
            {(
              [
                ['armor', 'Armor'],
                ['weapons', 'Weapons'],
                ['tools', 'Tools'],
                ['languages', 'Languages'],
              ] as const
            ).map(([k, label]) => (
              <label key={k} className="field">
                <span>{label}</span>
                <TextInput
                  value={c.proficiencies[k]}
                  onChange={(v) => upd((x) => ({ ...x, proficiencies: { ...x.proficiencies, [k]: v } }))}
                />
              </label>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-title">
            <h3>Defenses & Senses</h3>
          </div>
          <div className="col">
            {(
              [
                ['resistances', 'Resistances'],
                ['immunities', 'Immunities'],
                ['vulnerabilities', 'Vulnerabilities'],
                ['senses', 'Senses'],
              ] as const
            ).map(([k, label]) => (
              <label key={k} className="field">
                <span>{label}</span>
                <TextInput
                  value={c.defenses[k]}
                  onChange={(v) => upd((x) => ({ ...x, defenses: { ...x.defenses, [k]: v } }))}
                />
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
