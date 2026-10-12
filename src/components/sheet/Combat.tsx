import { useState } from 'react';
import { Pencil, Plus, Swords, Trash2, Zap } from 'lucide-react';
import type { TabProps } from '../../pages/Sheet';
import { armorClass, attackDamage, attackToHit, fmt } from '../../lib/rules';
import { critExpr, d20Expr, isRollable, type RollMode } from '../../lib/dice';
import { uid } from '../../lib/id';
import type { Attack, Character, Item } from '../../lib/types';
import { useUi } from '../../store/ui';
import { Modal, NumberInput, Switch, TextInput, cx } from '../ui';

export const attackFromWeapon = (item: Pick<Item, 'name' | 'weapon'>): Attack => {
  const w = item.weapon!;
  return {
    id: uid(),
    name: item.name,
    ability: w.finesse ? 'finesse' : w.ranged ? 'dex' : 'str',
    proficient: true,
    toHitBonus: 0,
    damage: w.damage,
    damageBonus: true,
    damageType: w.type,
    range: w.range ?? undefined,
    notes: [w.properties.join(', '), w.mastery ? `Mastery: ${w.mastery}` : ''].filter(Boolean).join(' · '),
  };
};

export default function Combat({ c, upd }: TabProps) {
  const roll = useUi((s) => s.roll);
  const [mode, setMode] = useState<RollMode>('normal');
  const [editing, setEditing] = useState<Attack | null>(null);
  const ac = armorClass(c);
  const weaponsWithoutAttack = c.inventory.filter(
    (i) => i.weapon && !c.attacks.some((a) => a.name === i.name),
  );

  const rollHit = (a: Attack) => {
    roll(d20Expr(attackToHit(c, a)), `${a.name} · to hit`, mode);
    setMode('normal');
  };

  return (
    <div className="stack">
      <div className="card">
        <div className="card-title">
          <h3>Attacks</h3>
          <span className="spacer" />
          <div className="seg">
            {(['normal', 'adv', 'dis'] as RollMode[]).map((m) => (
              <button key={m} className={cx(mode === m && 'on')} onClick={() => setMode(m)}>
                {m === 'normal' ? 'Normal' : m === 'adv' ? 'Adv' : 'Dis'}
              </button>
            ))}
          </div>
        </div>
        {c.attacks.length === 0 && (
          <p className="muted small" style={{ marginBottom: 10 }}>
            No attacks yet. Add one, or turn a weapon from your inventory into an attack.
          </p>
        )}
        <div>
          {c.attacks.map((a) => {
            const dmg = attackDamage(c, a);
            return (
              <div key={a.id} className="entry">
                <div className="entry-head" style={{ cursor: 'default' }}>
                  <div className="grow">
                    <div className="title">{a.name}</div>
                    <div className="faint tiny">
                      {[a.damageType, a.range, a.notes].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <button className="btn sm soft num" onClick={() => rollHit(a)} title="Roll to hit">
                    {fmt(attackToHit(c, a))}
                  </button>
                  <button
                    className="btn sm num"
                    disabled={!isRollable(dmg)}
                    onClick={() => roll(dmg, `${a.name} · damage`)}
                    title="Roll damage"
                  >
                    {dmg || '—'}
                  </button>
                  <button
                    className="btn icon sm ghost"
                    disabled={!isRollable(dmg)}
                    onClick={() => roll(critExpr(dmg), `${a.name} · critical damage`)}
                    title="Roll critical damage"
                    aria-label="Roll critical damage"
                  >
                    <Zap />
                  </button>
                  <button className="btn icon sm ghost" onClick={() => setEditing(a)} aria-label="Edit attack">
                    <Pencil />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="row wrap" style={{ marginTop: 12 }}>
          <button
            className="btn sm soft"
            onClick={() =>
              setEditing({
                id: uid(),
                name: '',
                ability: 'str',
                proficient: true,
                toHitBonus: 0,
                damage: '1d6',
                damageBonus: true,
                damageType: '',
              })
            }
          >
            <Plus /> Add attack
          </button>
          {weaponsWithoutAttack.map((w) => (
            <button
              key={w.id}
              className="btn sm"
              onClick={() => upd((x) => ({ ...x, attacks: [...x.attacks, attackFromWeapon(w)] }))}
            >
              <Swords /> {w.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-title">
            <h3>Armor Class</h3>
          </div>
          <div className="row" style={{ alignItems: 'flex-start' }}>
            <div className="hp-card">
              <span className="big">{ac.total}</span>
            </div>
            <div className="grow small muted">{ac.parts.join(' · ')}</div>
          </div>
          <hr className="divider" />
          <div className="grid-2">
            <label className="field">
              <span>Misc bonus</span>
              <NumberInput value={c.acBonus} onChange={(v) => upd((x) => ({ ...x, acBonus: v }))} />
            </label>
            <label className="field">
              <span>Override</span>
              <input
                className="input"
                inputMode="numeric"
                placeholder="Auto"
                value={c.acOverride ?? ''}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^\d]/g, '');
                  upd((x) => ({ ...x, acOverride: v ? Number(v) : null }));
                }}
              />
            </label>
          </div>
          <p className="faint tiny" style={{ marginTop: 8 }}>
            Equip armor and shields in your inventory and AC updates automatically.
          </p>
        </div>
        <div className="card">
          <div className="card-title">
            <h3>Movement & Initiative</h3>
          </div>
          <div className="grid-2">
            <label className="field">
              <span>Base speed (ft.)</span>
              <NumberInput value={c.speed} min={0} onChange={(v) => upd((x) => ({ ...x, speed: v }))} />
            </label>
            <label className="field">
              <span>Initiative bonus</span>
              <NumberInput value={c.initiativeBonus} onChange={(v) => upd((x) => ({ ...x, initiativeBonus: v }))} />
            </label>
          </div>
          <p className="faint tiny" style={{ marginTop: 8 }}>
            Add your Proficiency Bonus to initiative bonus if you have the Alert feat.
          </p>
        </div>
      </div>

      <AttackEditor attack={editing} onClose={() => setEditing(null)} c={c} upd={upd} />
    </div>
  );
}

function AttackEditor({
  attack, onClose, c, upd,
}: { attack: Attack | null; onClose: () => void; c: Character; upd: TabProps['upd'] }) {
  const [draft, setDraft] = useState<Attack | null>(attack);
  const [lastId, setLastId] = useState<string | undefined>(attack?.id);
  if (attack?.id !== lastId) {
    setLastId(attack?.id);
    setDraft(attack);
  }
  if (!draft) return null;
  const exists = c.attacks.some((a) => a.id === draft.id);
  const set = (p: Partial<Attack>) => setDraft({ ...draft, ...p });
  const save = () => {
    upd((x) => ({
      ...x,
      attacks: exists ? x.attacks.map((a) => (a.id === draft.id ? draft : a)) : [...x.attacks, draft],
    }));
    onClose();
  };
  return (
    <Modal
      open={!!attack}
      onClose={onClose}
      title={exists ? 'Edit attack' : 'New attack'}
      footer={
        <>
          {exists && (
            <button
              className="btn danger"
              style={{ flex: 'none' }}
              aria-label="Delete attack"
              onClick={() => {
                upd((x) => ({ ...x, attacks: x.attacks.filter((a) => a.id !== draft.id) }));
                onClose();
              }}
            >
              <Trash2 />
            </button>
          )}
          <button className="btn primary" onClick={save} disabled={!draft.name.trim()}>
            Save
          </button>
        </>
      }
    >
      <div className="col" style={{ gap: 12 }}>
        <label className="field">
          <span>Name</span>
          <input className="input" autoFocus value={draft.name} onChange={(e) => set({ name: e.target.value })} />
        </label>
        <div className="grid-2">
          <label className="field">
            <span>Ability</span>
            <select
              className="select"
              value={draft.ability}
              onChange={(e) => set({ ability: e.target.value as Attack['ability'] })}
            >
              <option value="str">Strength</option>
              <option value="dex">Dexterity</option>
              <option value="finesse">Finesse (best of STR/DEX)</option>
              <option value="spell">Spellcasting ability</option>
              <option value="con">Constitution</option>
              <option value="int">Intelligence</option>
              <option value="wis">Wisdom</option>
              <option value="cha">Charisma</option>
            </select>
          </label>
          <label className="field">
            <span>Extra to-hit bonus</span>
            <NumberInput value={draft.toHitBonus} onChange={(v) => set({ toHitBonus: v })} />
          </label>
          <label className="field">
            <span>Damage dice</span>
            <input className="input" value={draft.damage} placeholder="1d8" onChange={(e) => set({ damage: e.target.value })} />
          </label>
          <label className="field">
            <span>Damage type</span>
            <input className="input" value={draft.damageType} placeholder="Slashing" onChange={(e) => set({ damageType: e.target.value })} />
          </label>
          <label className="field">
            <span>Range</span>
            <input className="input" value={draft.range ?? ''} placeholder="5 ft." onChange={(e) => set({ range: e.target.value })} />
          </label>
        </div>
        <div className="list">
          <div className="li">
            <span className="grow">Proficient</span>
            <Switch on={draft.proficient} onChange={(v) => set({ proficient: v })} />
          </div>
          <div className="li">
            <span className="grow">Add ability modifier to damage</span>
            <Switch on={draft.damageBonus} onChange={(v) => set({ damageBonus: v })} />
          </div>
        </div>
        <label className="field">
          <span>Notes</span>
          <TextInput value={draft.notes ?? ''} onChange={(v) => set({ notes: v })} placeholder="Properties, mastery, riders…" />
        </label>
      </div>
    </Modal>
  );
}
