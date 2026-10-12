import { useState } from 'react';
import { Minus, Plus, Skull, Sparkle, X } from 'lucide-react';
import type { TabProps } from '../../pages/Sheet';
import {
  ABILITIES, abilityMod, fmt, hitDicePool, passive, saveMod, spellAttack, spellSaveDc,
} from '../../lib/rules';
import { d20Expr } from '../../lib/dice';
import { CONDITIONS } from '../../lib/srd';
import { useUi } from '../../store/ui';
import { Modal, NumberInput, Pips, RichText, Switch, cx } from '../ui';
import { HpPanel } from './HpModal';

export default function Overview({ c, upd }: TabProps) {
  const roll = useUi((s) => s.roll);
  const [condOpen, setCondOpen] = useState(false);
  const [condInfo, setCondInfo] = useState<string | null>(null);
  const dc = spellSaveDc(c);
  const atk = spellAttack(c);
  const pool = hitDicePool(c);
  const dying = c.hp.current === 0;

  return (
    <div className="stack">
      <div className="grid-2 wide-left">
        <div className="card">
          <div className="card-title">
            <h3>Hit Points</h3>
          </div>
          <HpPanel c={c} upd={upd} />
          {dying && (
            <>
              <hr className="divider" />
              <DeathSaves c={c} upd={upd} />
            </>
          )}
        </div>
        <div className="stack">
          <div className="card">
            <div className="card-title">
              <h3>Status</h3>
            </div>
            <div className="list">
              <div className="li">
                <Sparkle size={17} style={{ color: 'var(--accent-text)' }} />
                <span className="grow">Heroic Inspiration</span>
                <Switch
                  on={c.heroicInspiration}
                  label="Heroic Inspiration"
                  onChange={(v) => upd((x) => ({ ...x, heroicInspiration: v }))}
                />
              </div>
              <div className="li">
                <Skull size={17} className="faint" />
                <span className="grow">
                  Exhaustion
                  {c.exhaustion > 0 && (
                    <span className="faint small"> · −{c.exhaustion * 2} to D20 Tests, −{c.exhaustion * 5} ft.</span>
                  )}
                </span>
                <button
                  className="btn icon sm ghost"
                  aria-label="Less exhaustion"
                  onClick={() => upd((x) => ({ ...x, exhaustion: Math.max(0, x.exhaustion - 1) }))}
                >
                  <Minus />
                </button>
                <b className="num" style={{ width: 18, textAlign: 'center', color: c.exhaustion ? 'var(--danger)' : undefined }}>
                  {c.exhaustion}
                </b>
                <button
                  className="btn icon sm ghost"
                  aria-label="More exhaustion"
                  onClick={() => upd((x) => ({ ...x, exhaustion: Math.min(6, x.exhaustion + 1) }))}
                >
                  <Plus />
                </button>
              </div>
              {!dying && (c.deathSaves.success > 0 || c.deathSaves.fail > 0) && <DeathSaves c={c} upd={upd} />}
            </div>
            <div className="row wrap" style={{ marginTop: 10, gap: 6 }}>
              {c.conditions.map((name) => (
                <span key={name} className="chip on" style={{ paddingRight: 4 }}>
                  <button style={{ all: 'unset', cursor: 'pointer' }} onClick={() => setCondInfo(name)}>
                    {name}
                  </button>
                  <button
                    className="btn icon sm ghost"
                    style={{ width: 20, height: 20, borderRadius: 10 }}
                    aria-label={`Remove ${name}`}
                    onClick={() => upd((x) => ({ ...x, conditions: x.conditions.filter((n) => n !== name) }))}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
              <button className="chip" onClick={() => setCondOpen(true)}>
                <Plus /> Condition
              </button>
            </div>
          </div>
          <div className="card">
            <div className="card-title">
              <h3>Hit Dice</h3>
            </div>
            <div className="col" style={{ gap: 8 }}>
              {Object.entries(pool).map(([die, total]) => {
                const used = c.hitDiceUsed[die] ?? 0;
                return (
                  <div key={die} className="row">
                    <span className="tag accent" style={{ width: 44, justifyContent: 'center' }}>
                      d{die}
                    </span>
                    {total <= 20 ? (
                      <Pips
                        max={total}
                        used={used}
                        round
                        onChange={(u) => upd((x) => ({ ...x, hitDiceUsed: { ...x.hitDiceUsed, [die]: Math.max(0, Math.min(total, u)) } }))}
                      />
                    ) : null}
                    <span className="spacer" />
                    <span className="small muted num">
                      {total - used}/{total}
                    </span>
                  </div>
                );
              })}
              {Object.keys(pool).length === 0 && <span className="muted small">Add a class to track hit dice.</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          <h3>Abilities</h3>
          <span className="spacer" />
          <span className="faint tiny hint">Tap a modifier to roll · edit the score below it</span>
        </div>
        <div className="abilities">
          {ABILITIES.map((a) => {
            const m = abilityMod(c, a.id) + c.exhaustion * -2;
            return (
              <div key={a.id} className="ability">
                <div className="lab">{a.short}</div>
                <button
                  className="roll-btn mod"
                  style={{ margin: 0, padding: '0 8px', fontSize: 26 }}
                  onClick={() => roll(d20Expr(m), `${a.name} check`)}
                >
                  {fmt(abilityMod(c, a.id))}
                </button>
                <div>
                  <NumberInput
                    className="score"
                    ariaLabel={`${a.name} score`}
                    value={c.abilities[a.id]}
                    min={1}
                    max={30}
                    onChange={(v) => upd((x) => ({ ...x, abilities: { ...x.abilities, [a.id]: v } }))}
                  />
                </div>
                <button
                  className="roll-btn save"
                  style={{ display: 'block', margin: '6px auto 0', padding: '2px 6px' }}
                  onClick={() => roll(d20Expr(saveMod(c, a.id)), `${a.name} save`)}
                >
                  <span style={{ color: c.saves[a.id] ? 'var(--accent-text)' : undefined }}>
                    {c.saves[a.id] ? '● ' : ''}Save {fmt(saveMod(c, a.id))}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-title">
            <h3>Senses</h3>
          </div>
          <div className="list">
            {(['perception', 'insight', 'investigation'] as const).map((s) => (
              <div key={s} className="li">
                <span className="grow">Passive {s[0].toUpperCase() + s.slice(1)}</span>
                <b className="num">{passive(c, s)}</b>
              </div>
            ))}
            {c.defenses.senses && (
              <div className="li">
                <span className="grow muted">{c.defenses.senses}</span>
              </div>
            )}
          </div>
        </div>
        {dc != null && (
          <div className="card">
            <div className="card-title">
              <h3>Spellcasting</h3>
            </div>
            <div className="list">
              <div className="li">
                <span className="grow">Spell Save DC</span>
                <b className="num">{dc}</b>
              </div>
              <div className="li">
                <span className="grow">Spell Attack</span>
                <button className="roll-btn" onClick={() => roll(d20Expr(atk!), 'Spell attack')}>
                  {fmt(atk!)}
                </button>
              </div>
              {c.spellSlots.max.some((n) => n > 0) && (
                <div className="li">
                  <span className="grow">Slots left</span>
                  <span className="small muted num">
                    {c.spellSlots.max
                      .map((n, i) => (n ? `${i + 1}: ${n - (c.spellSlots.used[i] ?? 0)}/${n}` : null))
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <Modal open={condOpen} onClose={() => setCondOpen(false)} title="Conditions">
        <div className="list">
          {CONDITIONS.map((cond) => {
            const on = c.conditions.includes(cond.name);
            return (
              <div key={cond.id} className="li">
                <button
                  className={cx('chip', on && 'on')}
                  onClick={() =>
                    upd((x) => ({
                      ...x,
                      conditions: on ? x.conditions.filter((n) => n !== cond.name) : [...x.conditions, cond.name],
                    }))
                  }
                >
                  {on ? '✓ ' : ''}
                  {cond.name}
                </button>
                <span className="spacer" />
                <button className="btn ghost sm" onClick={() => setCondInfo(cond.name)}>
                  Rules
                </button>
              </div>
            );
          })}
        </div>
      </Modal>
      <Modal open={!!condInfo} onClose={() => setCondInfo(null)} title={condInfo ?? ''}>
        <RichText text={CONDITIONS.find((x) => x.name === condInfo)?.desc ?? 'Custom condition.'} />
      </Modal>
    </div>
  );
}

function DeathSaves({ c, upd }: TabProps) {
  const roll = useUi((s) => s.roll);
  return (
    <div className="col" style={{ gap: 8 }}>
      <div className="row">
        <span className="upper grow">Death Saves</span>
        <button
          className="btn sm soft"
          onClick={() => {
            const r = roll('1d20', 'Death save');
            const d = r.total;
            upd((x) => {
              if (d === 20) return { ...x, hp: { ...x.hp, current: 1 }, deathSaves: { success: 0, fail: 0 } };
              const ds = { ...x.deathSaves };
              if (d === 1) ds.fail = Math.min(3, ds.fail + 2);
              else if (d >= 10) ds.success = Math.min(3, ds.success + 1);
              else ds.fail = Math.min(3, ds.fail + 1);
              return { ...x, deathSaves: ds };
            });
          }}
        >
          Roll
        </button>
      </div>
      <div className="row">
        <span className="small muted" style={{ width: 70 }}>
          Successes
        </span>
        <Pips
          max={3}
          used={3 - c.deathSaves.success}
          round
          variant="success"
          onChange={(u) => upd((x) => ({ ...x, deathSaves: { ...x.deathSaves, success: 3 - u } }))}
        />
      </div>
      <div className="row">
        <span className="small muted" style={{ width: 70 }}>
          Failures
        </span>
        <Pips
          max={3}
          used={3 - c.deathSaves.fail}
          round
          variant="danger"
          onChange={(u) => upd((x) => ({ ...x, deathSaves: { ...x.deathSaves, fail: 3 - u } }))}
        />
      </div>
      {c.deathSaves.fail >= 3 && <div className="chip danger">Dead</div>}
      {c.deathSaves.success >= 3 && <div className="chip on">Stable</div>}
    </div>
  );
}
