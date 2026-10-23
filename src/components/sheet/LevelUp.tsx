import { useMemo, useState } from 'react';
import { Dices, TrendingUp } from 'lucide-react';
import type { Character } from '../../lib/types';
import type { Upd } from '../../pages/Sheet';
import { CLASSES, classById, subclassesFor } from '../../lib/srd';
import { useHomebrew } from '../../store/homebrew';
import { CLASS_COLORS, MULTICLASS_PROFS, SKILLS, mod, multiclassProblems, profBonus, totalLevel } from '../../lib/rules';
import type { SkillId } from '../../lib/types';
import { applyLevelUp, classFeaturesAt } from '../../lib/character';
import { roll } from '../../lib/dice';
import { useUi } from '../../store/ui';
import { Modal, cx } from '../ui';

export default function LevelUp({
  open, onClose, c, upd, accent,
}: { open: boolean; onClose: () => void; c: Character; upd: Upd; accent: string }) {
  const notify = useUi((s) => s.notify);
  useHomebrew((s) => s.items);
  const primary = [...c.classes].sort((a, b) => b.level - a.level)[0];
  const [classId, setClassId] = useState(primary?.id ?? '');
  const [hpMode, setHpMode] = useState<'avg' | 'roll'>('avg');
  const [rolled, setRolled] = useState<number | null>(null);
  const [subclass, setSubclass] = useState('');
  const [mcSkills, setMcSkills] = useState<SkillId[]>([]);

  const def = classById(classId);
  const existing = c.classes.find((x) => x.id === classId);
  const newLevel = (existing?.level ?? 0) + 1;
  const total = totalLevel(c) + (c.classes.length ? 1 : 0);
  const conMod = mod(c.abilities.con);
  const die = def?.hitDie ?? 8;
  const needsSub = !!def && newLevel >= 3 && !existing?.subclass;
  const multiclassing = !!def && !existing && c.classes.length > 0;
  const mp = multiclassing ? MULTICLASS_PROFS[def!.id] : undefined;
  const problems = multiclassing
    ? multiclassProblems(c.abilities, [...c.classes.map((x) => x.id), def!.id], Object.fromEntries(CLASSES.map((x) => [x.id, x.name])))
    : [];
  const skillOptions = (def?.skillChoices?.from ?? SKILLS.map((x) => x.id)).filter((x) => !c.skills[x]);
  const hpGain = Math.max(1, (hpMode === 'avg' ? die / 2 + 1 : (rolled ?? die / 2 + 1)) + conMod);

  const preview = useMemo(() => {
    if (!def) return [];
    return classFeaturesAt(
      { id: def.id, name: def.name, level: newLevel, hitDie: def.hitDie, subclass: subclass || existing?.subclass },
      newLevel,
    );
  }, [def, newLevel, subclass, existing?.subclass]);

  const confirm = () => {
    if (!def || total > 20) return;
    upd((x) => applyLevelUp(x, { classId: def.id, hpGain, subclass: needsSub && subclass ? subclass : undefined, skills: mcSkills }));
    notify(`${c.name} reached level ${total}!`);
    setRolled(null);
    setSubclass('');
    setMcSkills([]);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <span className="row" style={{ gap: 8 }}>
          <TrendingUp size={20} /> Level {total}
        </span>
      }
      accent={accent}
      footer={
        <button className="btn primary" disabled={!def || total > 20} onClick={confirm}>
          Level up {def ? `${def.name} to ${newLevel}` : ''}
        </button>
      }
    >
      {total > 20 ? (
        <p className="muted">Already at level 20, the peak of mortal power.</p>
      ) : (
        <div className="col" style={{ gap: 16 }}>
          <label className="field">
            <span>Class</span>
            <select
              className="select"
              value={classId}
              onChange={(e) => {
                setClassId(e.target.value);
                setMcSkills([]);
              }}
            >
              {!classId && <option value="">Choose…</option>}
              {c.classes.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name} {x.level} → {x.level + 1}
                </option>
              ))}
              <optgroup label="Multiclass into…">
                {CLASSES.filter((x) => !c.classes.some((y) => y.id === x.id)).map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </label>

          {multiclassing && (
            <div className="card tight" style={{ boxShadow: 'none' }}>
              <div className="upper" style={{ marginBottom: 6 }}>Multiclassing into {def!.name}</div>
              {problems.length > 0 ? (
                <p className="small" style={{ color: 'var(--warn)', marginBottom: 8 }}>
                  By the rules you can't yet: {problems.join('; ')}. You can still continue if your DM allows it.
                </p>
              ) : (
                <p className="small" style={{ color: 'var(--success)', marginBottom: 8 }}>You meet the ability score requirements.</p>
              )}
              <p className="small muted">
                You gain:{' '}
                {[...mp!.armor, ...mp!.weapons, ...mp!.tools, mp!.instrument ? 'one Musical Instrument' : '', mp!.skills ? `${mp!.skills} skill` : '']
                  .filter(Boolean)
                  .join(', ') || 'no extra proficiencies'}
                . Saving throw proficiencies don't carry over when multiclassing.
              </p>
              {mp!.skills > 0 && (
                <div className="chips" style={{ marginTop: 8 }}>
                  {skillOptions.map((sk) => {
                    const on = mcSkills.includes(sk);
                    return (
                      <button
                        key={sk}
                        className={cx('chip', on && 'on')}
                        onClick={() => setMcSkills(on ? mcSkills.filter((x) => x !== sk) : [...mcSkills, sk].slice(-mp!.skills))}
                      >
                        {SKILLS.find((x) => x.id === sk)?.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {needsSub && (
            <label className="field">
              <span>Choose a subclass</span>
              <input
                className="input"
                list="levelup-subclasses"
                value={subclass}
                placeholder="Subclass name"
                onChange={(e) => setSubclass(e.target.value)}
              />
              <datalist id="levelup-subclasses">
                {subclassesFor(def!.id).map((s) => (
                  <option key={s.id} value={s.name} />
                ))}
              </datalist>
            </label>
          )}

          <div className="card tight" style={{ '--accent': CLASS_COLORS[classId] ?? accent } as React.CSSProperties}>
            <div className="row">
              <div className="grow">
                <div className="upper">Hit points</div>
                <div style={{ fontSize: 26, fontWeight: 750 }} className="num">
                  +{hpGain}
                </div>
                <div className="faint tiny">
                  d{die} {hpMode === 'avg' ? `average (${die / 2 + 1})` : rolled != null ? `rolled ${rolled}` : ''} {conMod >= 0 ? '+' : '−'}{' '}
                  {Math.abs(conMod)} CON
                </div>
              </div>
              <div className="seg">
                <button className={cx(hpMode === 'avg' && 'on')} onClick={() => setHpMode('avg')}>
                  Average
                </button>
                <button
                  className={cx(hpMode === 'roll' && 'on')}
                  onClick={() => {
                    setHpMode('roll');
                    setRolled(roll(`1d${die}`).total);
                  }}
                >
                  <Dices size={14} /> Roll
                </button>
              </div>
            </div>
          </div>

          {profBonus(total) > profBonus(total - 1) && (
            <p className="chip on" style={{ alignSelf: 'flex-start' }}>
              Proficiency Bonus increases to +{profBonus(total)}
            </p>
          )}

          <div>
            <div className="upper" style={{ marginBottom: 8 }}>
              New features
            </div>
            {preview.length === 0 && <p className="muted small">No new class features at this level.</p>}
            <div className="chips">
              {preview.map((f) => (
                <span key={f.id} className="chip">
                  {f.name}
                </span>
              ))}
            </div>
            {preview.some((f) => /Ability Score Improvement|Epic Boon/.test(f.name)) && (
              <p className="small muted" style={{ marginTop: 10 }}>
                Remember to raise your ability scores or pick a feat after leveling. Tap a score on the Overview to edit it.
              </p>
            )}
            {def?.caster !== 'none' && def && (
              <p className="small muted" style={{ marginTop: 10 }}>
                Spell slots will be recalculated. You can prepare {def.levels[newLevel - 1]?.prepared ?? 0} {def.name} spells
                {def.levels[newLevel - 1]?.cantrips ? ` and know ${def.levels[newLevel - 1].cantrips} cantrips` : ''}.
              </p>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
