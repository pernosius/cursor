import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Camera, Check, Dices, Sparkles } from 'lucide-react';
import { ABILITIES, ALIGNMENTS, CLASS_COLORS, DEFAULT_ACCENT, POINT_BUY_COST, SKILLS, STANDARD_ARRAY, fmt, mod } from '../lib/rules';
import { BACKGROUNDS, CLASSES, SPECIES } from '../lib/srd';
import { buildCharacter } from '../lib/character';
import { roll } from '../lib/dice';
import type { Ability, SkillId } from '../lib/types';
import { useCharacters } from '../store/characters';
import { Avatar, NumberInput, cx, resizeImage } from '../components/ui';

const STEPS = ['Basics', 'Class', 'Species', 'Background', 'Abilities', 'Skills'] as const;
type Method = 'array' | 'pointbuy' | 'manual';

const base = (n: number) => Object.fromEntries(ABILITIES.map((a) => [a.id, n])) as Record<Ability, number>;

export default function NewCharacter() {
  const navigate = useNavigate();
  const add = useCharacters((s) => s.add);
  const [step, setStep] = useState(0);

  const [name, setName] = useState('');
  const [portrait, setPortrait] = useState<string>();
  const [campaign, setCampaign] = useState('');
  const [level, setLevel] = useState(1);
  const [alignment, setAlignment] = useState('');
  const [classId, setClassId] = useState('');
  const [subclass, setSubclass] = useState('');
  const [speciesId, setSpeciesId] = useState('');
  const [subspeciesId, setSubspeciesId] = useState('');
  const [backgroundId, setBackgroundId] = useState('');
  const [bonusMode, setBonusMode] = useState<'21' | '111'>('21');
  const [plus2, setPlus2] = useState<Ability | ''>('');
  const [plus1, setPlus1] = useState<Ability | ''>('');
  const [method, setMethod] = useState<Method>('array');
  const [arrayPick, setArrayPick] = useState<Record<Ability, number | null>>(
    () => Object.fromEntries(ABILITIES.map((a) => [a.id, null])) as Record<Ability, number | null>,
  );
  const [pointBuy, setPointBuy] = useState(base(8));
  const [manual, setManual] = useState(base(10));
  const [skills, setSkills] = useState<SkillId[]>([]);

  const cls = CLASSES.find((c) => c.id === classId);
  const species = SPECIES.find((s) => s.id === speciesId);
  const bg = BACKGROUNDS.find((b) => b.id === backgroundId);
  const accent = (classId && CLASS_COLORS[classId]) || DEFAULT_ACCENT;

  const scores: Record<Ability, number> =
    method === 'array'
      ? (Object.fromEntries(ABILITIES.map((a) => [a.id, arrayPick[a.id] ?? 8])) as Record<Ability, number>)
      : method === 'pointbuy'
        ? pointBuy
        : manual;
  const pointsSpent = ABILITIES.reduce((s, a) => s + POINT_BUY_COST[pointBuy[a.id]], 0);

  const bonuses = useMemo(() => {
    const b: Partial<Record<Ability, number>> = {};
    if (!bg) return b;
    if (bonusMode === '111') for (const a of bg.abilities) b[a] = 1;
    else {
      if (plus2) b[plus2] = 2;
      if (plus1 && plus1 !== plus2) b[plus1] = 1;
    }
    return b;
  }, [bg, bonusMode, plus2, plus1]);

  const bgSkills = bg?.skills ?? [];
  const skillLimit = cls?.skillChoices?.choose ?? 2;
  const skillOptions = (cls?.skillChoices?.from ?? SKILLS.map((s) => s.id)).filter((s) => !bgSkills.includes(s));

  const canNext = [
    name.trim().length > 0,
    !!cls,
    !!species && (!species.subspecies.length || !!subspeciesId),
    !!bg && (bonusMode === '111' || (!!plus2 && !!plus1 && plus1 !== plus2)),
    method === 'array'
      ? ABILITIES.every((a) => arrayPick[a.id] != null)
      : method === 'pointbuy'
        ? pointsSpent <= 27
        : true,
    skills.length === Math.min(skillLimit, skillOptions.length),
  ][step];

  const create = () => {
    const c = buildCharacter({
      name,
      portrait,
      campaign,
      level,
      alignment: alignment || undefined,
      classId,
      subclass: level >= 3 && subclass ? subclass : undefined,
      speciesId,
      subspeciesId: subspeciesId || undefined,
      backgroundId,
      abilities: scores,
      bonuses,
      skills,
    });
    add(c);
    navigate(`/c/${c.id}`, { replace: true });
  };

  const usedArray = Object.values(arrayPick).filter((v) => v != null) as number[];

  return (
    <div className="page" style={{ maxWidth: 820, '--accent': accent } as React.CSSProperties}>
      <header className="topbar">
        <button className="btn icon ghost" onClick={() => (step ? setStep(step - 1) : navigate('/'))} aria-label="Back">
          <ArrowLeft />
        </button>
        <div className="grow">
          <div className="upper">
            Step {step + 1} of {STEPS.length}
          </div>
          <h2 className="display" style={{ fontSize: 24 }}>
            {STEPS[step]}
          </h2>
        </div>
      </header>
      <div className="steps">
        {STEPS.map((s, i) => (
          <i key={s} className={cx(i <= step && 'on')} />
        ))}
      </div>

      <div className="tab-body" key={step}>
        {step === 0 && (
          <div className="col" style={{ gap: 16 }}>
            <div className="row" style={{ gap: 16 }}>
              <label style={{ cursor: 'pointer', position: 'relative' }}>
                <Avatar name={name || '?'} src={portrait} size="lg" />
                <span
                  className="btn icon sm"
                  style={{ position: 'absolute', right: -6, bottom: -6, background: 'var(--solid)' }}
                >
                  <Camera />
                </span>
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (f) setPortrait(await resizeImage(f));
                  }}
                />
              </label>
              <label className="field grow">
                <span>Character name</span>
                <input
                  className="input"
                  autoFocus
                  value={name}
                  placeholder="e.g. Seraphine Ashvale"
                  onChange={(e) => setName(e.target.value)}
                  style={{ fontSize: 18, fontFamily: 'var(--font-display)' }}
                />
              </label>
            </div>
            <div className="grid-2">
              <label className="field">
                <span>Campaign (optional)</span>
                <input className="input" value={campaign} onChange={(e) => setCampaign(e.target.value)} placeholder="e.g. Curse of the Crimson Tide" />
              </label>
              <label className="field">
                <span>Alignment</span>
                <select className="select" value={alignment} onChange={(e) => setAlignment(e.target.value)}>
                  <option value="">—</option>
                  {ALIGNMENTS.map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="field">
              <span>Starting level</span>
              <div className="row">
                <input
                  type="range"
                  min={1}
                  max={20}
                  value={level}
                  onChange={(e) => setLevel(Number(e.target.value))}
                  style={{ flex: 1, accentColor: accent }}
                />
                <span className="lvl-badge" style={{ minWidth: 40, height: 30, fontSize: 15 }}>
                  {level}
                </span>
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="col" style={{ gap: 16 }}>
            <div className="pick-grid">
              {CLASSES.map((c) => (
                <button
                  key={c.id}
                  className={cx('pick', classId === c.id && 'on')}
                  style={{ '--accent': CLASS_COLORS[c.id] } as React.CSSProperties}
                  onClick={() => {
                    setClassId(c.id);
                    setSkills([]);
                    setSubclass('');
                  }}
                >
                  <div className="t">
                    <span className="swatch" />
                    {c.name}
                  </div>
                  <div className="s">
                    d{c.hitDie} · {c.primary}
                  </div>
                </button>
              ))}
            </div>
            {cls && level >= 3 && (
              <label className="field">
                <span>Subclass</span>
                <input
                  className="input"
                  list="subclass-options"
                  value={subclass}
                  placeholder="Choose or type your subclass"
                  onChange={(e) => setSubclass(e.target.value)}
                />
                <datalist id="subclass-options">
                  {cls.subclasses.map((s) => (
                    <option key={s.id} value={s.name} />
                  ))}
                </datalist>
                <span className="faint tiny" style={{ fontWeight: 400 }}>
                  Only SRD subclasses are listed; type any other subclass name.
                </span>
              </label>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="col" style={{ gap: 16 }}>
            <div className="pick-grid">
              {SPECIES.map((s) => (
                <button
                  key={s.id}
                  className={cx('pick', speciesId === s.id && 'on')}
                  onClick={() => {
                    setSpeciesId(s.id);
                    setSubspeciesId('');
                  }}
                >
                  <div className="t">{s.name}</div>
                  <div className="s">
                    {s.size.split(' ')[0]} · {s.speed} ft.
                  </div>
                </button>
              ))}
            </div>
            {species && species.subspecies.length > 0 && (
              <label className="field">
                <span>Lineage</span>
                <select className="select" value={subspeciesId} onChange={(e) => setSubspeciesId(e.target.value)}>
                  <option value="">Choose…</option>
                  {species.subspecies.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name.replace(/^.*?: /, '')}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {species && (
              <div className="card tight">
                <div className="upper" style={{ marginBottom: 6 }}>Traits</div>
                <div className="chips">
                  {species.traits.map((t) => (
                    <span key={t.name} className="chip">
                      {t.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="col" style={{ gap: 16 }}>
            <div className="pick-grid">
              {BACKGROUNDS.map((b) => (
                <button
                  key={b.id}
                  className={cx('pick', backgroundId === b.id && 'on')}
                  onClick={() => {
                    setBackgroundId(b.id);
                    setPlus2('');
                    setPlus1('');
                  }}
                >
                  <div className="t">{b.name}</div>
                  <div className="s">{b.feat}</div>
                </button>
              ))}
            </div>
            {bg && (
              <div className="card">
                <div className="card-title">
                  <h3>Ability score increase</h3>
                </div>
                <div className="seg" style={{ marginBottom: 12 }}>
                  <button className={cx(bonusMode === '21' && 'on')} onClick={() => setBonusMode('21')}>
                    +2 / +1
                  </button>
                  <button className={cx(bonusMode === '111' && 'on')} onClick={() => setBonusMode('111')}>
                    +1 / +1 / +1
                  </button>
                </div>
                {bonusMode === '21' ? (
                  <div className="grid-2">
                    {([['+2', plus2, setPlus2], ['+1', plus1, setPlus1]] as const).map(([label, val, set]) => (
                      <label key={label} className="field">
                        <span>{label}</span>
                        <select className="select" value={val} onChange={(e) => set(e.target.value as Ability)}>
                          <option value="">Choose…</option>
                          {bg.abilities.map((a) => (
                            <option key={a} value={a}>
                              {ABILITIES.find((x) => x.id === a)!.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="muted small">
                    +1 to {bg.abilities.map((a) => ABILITIES.find((x) => x.id === a)!.name).join(', ')}.
                  </p>
                )}
                <hr className="divider" />
                <p className="small muted">
                  <b style={{ color: 'var(--text)' }}>Skills:</b>{' '}
                  {bg.skills.map((s) => SKILLS.find((x) => x.id === s)?.name).join(', ')} ·{' '}
                  <b style={{ color: 'var(--text)' }}>Tool:</b> {bg.tools.join(', ')} ·{' '}
                  <b style={{ color: 'var(--text)' }}>Feat:</b> {bg.feat}
                </p>
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="col" style={{ gap: 16 }}>
            <div className="row wrap">
              <div className="seg">
                <button className={cx(method === 'array' && 'on')} onClick={() => setMethod('array')}>
                  Standard Array
                </button>
                <button className={cx(method === 'pointbuy' && 'on')} onClick={() => setMethod('pointbuy')}>
                  Point Buy
                </button>
                <button className={cx(method === 'manual' && 'on')} onClick={() => setMethod('manual')}>
                  Manual / Rolled
                </button>
              </div>
              {method === 'pointbuy' && (
                <span className={cx('chip', pointsSpent > 27 ? 'danger' : 'on')}>{27 - pointsSpent} points left</span>
              )}
              {method === 'manual' && (
                <button
                  className="btn sm soft"
                  onClick={() =>
                    setManual(
                      Object.fromEntries(
                        ABILITIES.map((a) => {
                          const r = roll('4d6').terms[0].rolls.sort((x, y) => y - x);
                          return [a.id, r[0] + r[1] + r[2]];
                        }),
                      ) as Record<Ability, number>,
                    )
                  }
                >
                  <Dices /> Roll 4d6 drop lowest
                </button>
              )}
            </div>
            <div className="abilities">
              {ABILITIES.map((a) => {
                const final = Math.min(20, scores[a.id] + (bonuses[a.id] ?? 0));
                return (
                  <div key={a.id} className="ability" style={{ paddingBottom: 12 }}>
                    <div className="lab">{a.short}</div>
                    <div className="mod">{fmt(mod(final))}</div>
                    <div className="small muted num">
                      {final}
                      {bonuses[a.id] ? <span style={{ color: 'var(--accent-text)' }}> (+{bonuses[a.id]})</span> : null}
                    </div>
                    <div style={{ marginTop: 8 }}>
                      {method === 'array' && (
                        <select
                          className="select"
                          style={{ minHeight: 34, padding: '4px 26px 4px 10px' }}
                          value={arrayPick[a.id] ?? ''}
                          onChange={(e) =>
                            setArrayPick((p) => ({ ...p, [a.id]: e.target.value ? Number(e.target.value) : null }))
                          }
                        >
                          <option value="">—</option>
                          {STANDARD_ARRAY.filter((v) => arrayPick[a.id] === v || !usedArray.includes(v)
                          ).map((v) => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ))}
                        </select>
                      )}
                      {method === 'pointbuy' && (
                        <div className="row" style={{ justifyContent: 'center', gap: 4 }}>
                          <button
                            className="btn icon sm"
                            disabled={pointBuy[a.id] <= 8}
                            onClick={() => setPointBuy((p) => ({ ...p, [a.id]: p[a.id] - 1 }))}
                          >
                            −
                          </button>
                          <button
                            className="btn icon sm"
                            disabled={pointBuy[a.id] >= 15}
                            onClick={() => setPointBuy((p) => ({ ...p, [a.id]: p[a.id] + 1 }))}
                          >
                            +
                          </button>
                        </div>
                      )}
                      {method === 'manual' && (
                        <NumberInput
                          className="center"
                          value={manual[a.id]}
                          min={1}
                          max={30}
                          onChange={(n) => setManual((m) => ({ ...m, [a.id]: n }))}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {cls && <p className="small muted">{cls.name} primary ability: {cls.primary}.</p>}
          </div>
        )}

        {step === 5 && (
          <div className="col" style={{ gap: 16 }}>
            <p className="muted">
              Choose {skillLimit} {cls?.name} skill{skillLimit === 1 ? '' : 's'}. Background skills are already included.
            </p>
            <div className="chips">
              {bgSkills.map((s) => (
                <span key={s} className="chip on">
                  <Check /> {SKILLS.find((x) => x.id === s)?.name}
                </span>
              ))}
            </div>
            <div className="pick-grid">
              {skillOptions.map((s) => {
                const def = SKILLS.find((x) => x.id === s)!;
                const on = skills.includes(s);
                return (
                  <button
                    key={s}
                    className={cx('pick', on && 'on')}
                    style={{ minHeight: 0 }}
                    onClick={() =>
                      setSkills((cur) => (on ? cur.filter((x) => x !== s) : cur.length < skillLimit ? [...cur, s] : cur))
                    }
                  >
                    <div className="t">{def.name}</div>
                    <div className="s">{def.ability.toUpperCase()}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="wizard-foot">
        <div className="inner">
          {step > 0 && (
            <button className="btn" onClick={() => setStep(step - 1)}>
              <ArrowLeft /> Back
            </button>
          )}
          <div className="spacer" />
          {step < STEPS.length - 1 ? (
            <button className="btn primary" disabled={!canNext} onClick={() => setStep(step + 1)}>
              Next <ArrowRight />
            </button>
          ) : (
            <button className="btn primary" disabled={!canNext} onClick={create}>
              <Sparkles /> Create {name.split(' ')[0] || 'character'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
