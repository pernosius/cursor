import { useMemo, useState } from 'react';
import { BookOpen, ChevronDown, Pencil, Plus, Trash2, Wand2 } from 'lucide-react';
import type { TabProps } from '../../pages/Sheet';
import { ABILITIES, computeSlots, fmt, spellAbilityOf, spellAttack, spellSaveDc } from '../../lib/rules';
import { d20Expr } from '../../lib/dice';
import { uid } from '../../lib/id';
import type { Ability, Spell } from '../../lib/types';
import { classById, type SrdSpell } from '../../lib/srd';
import { useUi } from '../../store/ui';
import { Modal, NumberInput, Pips, RichText, Switch, TextInput, cx } from '../ui';
import { SpellBrowser, SpellMeta, levelName } from '../CompendiumList';

export const spellFromSrd = (s: SrdSpell): Spell => ({
  id: uid(),
  srdId: s.id,
  name: s.name,
  level: s.level,
  school: s.school,
  time: s.time,
  range: s.range,
  components: s.components,
  duration: s.duration,
  concentration: s.concentration,
  ritual: s.ritual,
  desc: s.desc,
  higher: s.higher,
  prepared: s.level === 0,
});

type Filter = 'all' | 'prepared';

export default function Spells({ c, upd }: TabProps) {
  const { roll, notify } = useUi();
  const [adding, setAdding] = useState(false);
  const [editSlots, setEditSlots] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [editing, setEditing] = useState<Spell | null>(null);
  const ability = spellAbilityOf(c);
  const dc = spellSaveDc(c);
  const atk = spellAttack(c);
  const mainCaster = [...c.classes].sort((a, b) => b.level - a.level).find((x) => classById(x.id)?.spellAbility);
  const owned = useMemo(() => new Set(c.spells.map((s) => s.srdId).filter(Boolean) as string[]), [c.spells]);
  const preparedCount = c.spells.filter((s) => s.prepared && !s.always && s.level > 0).length;
  const prepLimit = mainCaster ? classById(mainCaster.id)?.levels[mainCaster.level - 1]?.prepared : undefined;

  const groups = useMemo(() => {
    const g = new Map<number, Spell[]>();
    for (const s of [...c.spells].sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))) {
      if (filter === 'prepared' && !s.prepared && !s.always && s.level > 0) continue;
      g.set(s.level, [...(g.get(s.level) ?? []), s]);
    }
    return [...g.entries()];
  }, [c.spells, filter]);

  const cast = (s: Spell, slotLevel: number | 'pact') => {
    upd((x) => {
      if (slotLevel === 'pact') return { ...x, pactSlots: { ...x.pactSlots, used: x.pactSlots.used + 1 } };
      const used = [...x.spellSlots.used];
      used[slotLevel - 1] = (used[slotLevel - 1] ?? 0) + 1;
      return { ...x, spellSlots: { ...x.spellSlots, used } };
    });
    notify(`Cast ${s.name}${slotLevel === 'pact' ? ' with a Pact slot' : s.level > 0 ? ` at level ${slotLevel}` : ''}`);
  };

  const hasSlots = c.spellSlots.max.some((n) => n > 0) || c.pactSlots.max > 0;

  return (
    <div className="stack">
      <div className="grid-2">
        <div className="card">
          <div className="card-title">
            <h3>Spellcasting</h3>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <div className="qstat grow" style={{ boxShadow: 'none' }}>
              <b>{dc ?? '—'}</b>
              <span>Save DC</span>
            </div>
            <button
              className="qstat grow"
              style={{ boxShadow: 'none' }}
              disabled={atk == null}
              onClick={() => atk != null && roll(d20Expr(atk), 'Spell attack')}
            >
              <b>{atk != null ? fmt(atk) : '—'}</b>
              <span>Attack</span>
            </button>
            <div className="qstat grow" style={{ boxShadow: 'none' }}>
              <b>{prepLimit ? `${preparedCount}/${prepLimit}` : preparedCount}</b>
              <span>Prepared</span>
            </div>
          </div>
          <label className="field" style={{ marginTop: 12 }}>
            <span>Spellcasting ability</span>
            <select
              className="select"
              value={c.spellAbility ?? ability ?? ''}
              onChange={(e) => upd((x) => ({ ...x, spellAbility: (e.target.value || null) as Ability | null }))}
            >
              <option value="">None</option>
              {ABILITIES.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="card">
          <div className="card-title">
            <h3>Spell Slots</h3>
            <span className="spacer" />
            <button className="btn ghost sm" onClick={() => setEditSlots((v) => !v)}>
              <Pencil /> {editSlots ? 'Done' : 'Edit'}
            </button>
          </div>
          {!hasSlots && !editSlots && <p className="muted small">No spell slots. Tap Edit to add some manually.</p>}
          {c.spellSlots.max.map((max, i) =>
            max > 0 || editSlots ? (
              <div key={i} className="slot-row">
                <span className="lv">Level {i + 1}</span>
                {editSlots ? (
                  <NumberInput
                    className="center"
                    value={max}
                    min={0}
                    max={9}
                    ariaLabel={`Level ${i + 1} slots`}
                    onChange={(v) =>
                      upd((x) => {
                        const m = [...x.spellSlots.max];
                        m[i] = v;
                        return { ...x, spellSlots: { ...x.spellSlots, max: m } };
                      })
                    }
                  />
                ) : (
                  <Pips
                    max={max}
                    used={Math.min(max, c.spellSlots.used[i] ?? 0)}
                    onChange={(u) =>
                      upd((x) => {
                        const used = [...x.spellSlots.used];
                        used[i] = Math.max(0, Math.min(max, u));
                        return { ...x, spellSlots: { ...x.spellSlots, used } };
                      })
                    }
                  />
                )}
              </div>
            ) : null,
          )}
          {(c.pactSlots.max > 0 || editSlots) && (
            <div className="slot-row">
              <span className="lv">Pact{c.pactSlots.level ? ` · L${c.pactSlots.level}` : ''}</span>
              {editSlots ? (
                <div className="row">
                  <NumberInput className="center" ariaLabel="Pact slot count" value={c.pactSlots.max} min={0} max={6} onChange={(v) => upd((x) => ({ ...x, pactSlots: { ...x.pactSlots, max: v } }))} />
                  <NumberInput className="center" ariaLabel="Pact slot level" value={c.pactSlots.level} min={0} max={9} onChange={(v) => upd((x) => ({ ...x, pactSlots: { ...x.pactSlots, level: v } }))} />
                </div>
              ) : (
                <Pips
                  max={c.pactSlots.max}
                  used={Math.min(c.pactSlots.max, c.pactSlots.used)}
                  onChange={(u) => upd((x) => ({ ...x, pactSlots: { ...x.pactSlots, used: Math.max(0, Math.min(x.pactSlots.max, u)) } }))}
                />
              )}
            </div>
          )}
          {editSlots && (
            <button
              className="btn sm soft"
              style={{ marginTop: 10 }}
              onClick={() => {
                const { slots, pact } = computeSlots(c.classes);
                upd((x) => ({ ...x, spellSlots: { max: slots, used: Array(9).fill(0) }, pactSlots: { ...pact, used: 0 } }));
              }}
            >
              Recalculate from classes
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          <h3>Spells</h3>
          <span className="spacer" />
          <div className="seg">
            <button className={cx(filter === 'all' && 'on')} onClick={() => setFilter('all')}>All</button>
            <button className={cx(filter === 'prepared' && 'on')} onClick={() => setFilter('prepared')}>Prepared</button>
          </div>
        </div>
        {c.spells.length === 0 && (
          <p className="muted small" style={{ marginBottom: 12 }}>
            Your spellbook is empty. Add spells from the compendium and your homebrew, or write your own.
          </p>
        )}
        {groups.map(([level, spells]) => (
          <div key={level} style={{ marginBottom: 14 }}>
            <div className="row" style={{ marginBottom: 6 }}>
              <span className="upper">{levelName(level)}</span>
              {level > 0 && c.spellSlots.max[level - 1] > 0 && (
                <span className="faint tiny">
                  {c.spellSlots.max[level - 1] - (c.spellSlots.used[level - 1] ?? 0)} of {c.spellSlots.max[level - 1]} slots
                </span>
              )}
            </div>
            {spells.map((s) => {
              const isOpen = open === s.id;
              const castable = c.spellSlots.max
                .map((m, i) => ({ lvl: i + 1, left: m - (c.spellSlots.used[i] ?? 0) }))
                .filter((x) => x.lvl >= s.level && x.left > 0);
              const pactOk = c.pactSlots.max - c.pactSlots.used > 0 && c.pactSlots.level >= s.level;
              return (
                <div key={s.id} className="entry">
                  <div className="entry-head" onClick={() => setOpen(isOpen ? null : s.id)}>
                    {s.level > 0 && (
                      <button
                        className={cx('prof-dot', (s.prepared || s.always) && 'p1')}
                        title={s.always ? 'Always prepared' : s.prepared ? 'Prepared' : 'Not prepared'}
                        aria-label="Toggle prepared"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (s.always) return;
                          upd((x) => ({ ...x, spells: x.spells.map((y) => (y.id === s.id ? { ...y, prepared: !y.prepared } : y)) }));
                        }}
                      />
                    )}
                    <div className="grow">
                      <div className="title">
                        {s.name}
                        {s.concentration && <span className="tag" style={{ marginLeft: 6 }} title="Concentration">C</span>}
                        {s.ritual && <span className="tag" style={{ marginLeft: 4 }} title="Ritual">R</span>}
                      </div>
                      <div className="faint tiny">{[s.time, s.range, s.duration].filter(Boolean).join(' · ')}</div>
                    </div>
                    <ChevronDown size={16} className="faint" style={{ transform: isOpen ? 'rotate(180deg)' : undefined, transition: 'transform .2s' }} />
                  </div>
                  {isOpen && (
                    <div className="entry-body">
                      {s.time && <SpellMeta s={{ time: s.time ?? '', range: s.range ?? '', components: s.components ?? '', duration: s.duration ?? '' }} />}
                      {s.desc && <RichText text={s.desc} />}
                      {s.higher && <RichText className="small" text={`**Using a Higher-Level Spell Slot.** ${s.higher}`} />}
                      <div className="row wrap" style={{ marginTop: 12 }}>
                        {s.level > 0 &&
                          castable.map((x) => (
                            <button key={x.lvl} className="btn sm soft" onClick={() => cast(s, x.lvl)}>
                              <Wand2 /> Cast L{x.lvl}
                            </button>
                          ))}
                        {s.level > 0 && pactOk && (
                          <button className="btn sm soft" onClick={() => cast(s, 'pact')}>
                            <Wand2 /> Pact slot
                          </button>
                        )}
                        {s.level > 0 && !castable.length && !pactOk && <span className="faint small">No slots left</span>}
                        <span className="spacer" />
                        <button className="btn icon sm ghost" aria-label="Edit spell" onClick={() => setEditing(s)}>
                          <Pencil />
                        </button>
                        <button
                          className="btn icon sm ghost danger"
                          aria-label="Remove spell"
                          onClick={() => upd((x) => ({ ...x, spells: x.spells.filter((y) => y.id !== s.id) }))}
                        >
                          <Trash2 />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
        <div className="row wrap">
          <button className="btn sm soft" onClick={() => setAdding(true)}>
            <BookOpen /> Add spells
          </button>
          <button
            className="btn sm"
            onClick={() => setEditing({ id: uid(), name: '', level: 1, prepared: true })}
          >
            <Plus /> Custom spell
          </button>
        </div>
      </div>

      <Modal open={adding} onClose={() => setAdding(false)} title="Add spells" wide>
        <SpellBrowser
          defaultClass={mainCaster?.id}
          owned={owned}
          onPick={(s) => {
            upd((x) => ({ ...x, spells: [...x.spells, spellFromSrd(s)] }));
            notify(`Added ${s.name}`);
          }}
        />
      </Modal>
      <SpellEditor spell={editing} onClose={() => setEditing(null)} {...{ c, upd }} />
    </div>
  );
}

function SpellEditor({ spell, onClose, c, upd }: TabProps & { spell: Spell | null; onClose: () => void }) {
  const [draft, setDraft] = useState<Spell | null>(spell);
  const [lastId, setLastId] = useState(spell?.id);
  if (spell?.id !== lastId) {
    setLastId(spell?.id);
    setDraft(spell);
  }
  if (!draft) return null;
  const exists = c.spells.some((s) => s.id === draft.id);
  const set = (p: Partial<Spell>) => setDraft({ ...draft, ...p });
  return (
    <Modal
      open={!!spell}
      onClose={onClose}
      title={exists ? 'Edit spell' : 'Custom spell'}
      footer={
        <button
          className="btn primary"
          disabled={!draft.name.trim()}
          onClick={() => {
            upd((x) => ({ ...x, spells: exists ? x.spells.map((s) => (s.id === draft.id ? draft : s)) : [...x.spells, draft] }));
            onClose();
          }}
        >
          Save
        </button>
      }
    >
      <div className="col" style={{ gap: 12 }}>
        <div className="grid-2">
          <label className="field">
            <span>Name</span>
            <input className="input" value={draft.name} onChange={(e) => set({ name: e.target.value })} />
          </label>
          <label className="field">
            <span>Level</span>
            <select className="select" value={draft.level} onChange={(e) => set({ level: Number(e.target.value) })}>
              {Array.from({ length: 10 }, (_, l) => (
                <option key={l} value={l}>{levelName(l)}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Casting time</span>
            <input className="input" value={draft.time ?? ''} onChange={(e) => set({ time: e.target.value })} />
          </label>
          <label className="field">
            <span>Range</span>
            <input className="input" value={draft.range ?? ''} onChange={(e) => set({ range: e.target.value })} />
          </label>
          <label className="field">
            <span>Components</span>
            <input className="input" value={draft.components ?? ''} onChange={(e) => set({ components: e.target.value })} />
          </label>
          <label className="field">
            <span>Duration</span>
            <input className="input" value={draft.duration ?? ''} onChange={(e) => set({ duration: e.target.value })} />
          </label>
        </div>
        <div className="list">
          <div className="li"><span className="grow">Concentration</span><Switch on={!!draft.concentration} onChange={(v) => set({ concentration: v })} /></div>
          <div className="li"><span className="grow">Ritual</span><Switch on={!!draft.ritual} onChange={(v) => set({ ritual: v })} /></div>
          <div className="li"><span className="grow">Always prepared</span><Switch on={!!draft.always} onChange={(v) => set({ always: v })} /></div>
        </div>
        <label className="field">
          <span>Description</span>
          <TextInput multiline rows={6} value={draft.desc ?? ''} onChange={(v) => set({ desc: v })} />
        </label>
      </div>
    </Modal>
  );
}
