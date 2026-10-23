import { useState } from 'react';
import { BookOpen, ChevronDown, Minus, Pencil, Plus, Swords, Trash2 } from 'lucide-react';
import type { TabProps } from '../../pages/Sheet';
import { carryingCapacity, inventoryWeight } from '../../lib/rules';
import { uid } from '../../lib/id';
import type { Item } from '../../lib/types';
import type { SrdItem } from '../../lib/srd';
import { useUi } from '../../store/ui';
import { Modal, NumberInput, RichText, Switch, TextInput, cx } from '../ui';
import { ItemBrowser } from '../CompendiumList';
import { attackFromWeapon } from './Combat';

export const itemFromSrd = (i: SrdItem): Item => ({
  id: uid(),
  srdId: i.id,
  name: i.name,
  qty: 1,
  weight: i.weight,
  category: i.category,
  rarity: i.rarity,
  attunable: i.attunement,
  desc: [
    i.weapon && `${i.weapon.damage} ${i.weapon.type}${i.weapon.versatile ? ` (${i.weapon.versatile} two-handed)` : ''}${i.weapon.properties.length ? ` · ${i.weapon.properties.join(', ')}` : ''}${i.weapon.mastery ? ` · Mastery: ${i.weapon.mastery}` : ''}`,
    i.cost && `Cost: ${i.cost}`,
    i.desc,
  ]
    .filter(Boolean)
    .join('\n'),
  armor: i.armor && { kind: i.armor.kind, base: i.armor.base, dex: i.armor.dex, maxDex: i.armor.maxDex, stealthDis: i.armor.stealthDis },
  weapon: i.weapon && {
    damage: i.weapon.damage,
    type: i.weapon.type,
    properties: i.weapon.properties,
    mastery: i.weapon.mastery,
    range: i.weapon.range,
    ranged: i.weapon.ranged,
    finesse: i.weapon.finesse,
  },
});

const COINS = ['cp', 'sp', 'ep', 'gp', 'pp'] as const;

export default function Inventory({ c, upd }: TabProps) {
  const notify = useUi((s) => s.notify);
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [editing, setEditing] = useState<Item | null>(null);
  const weight = inventoryWeight(c);
  const cap = carryingCapacity(c);
  const attuned = c.inventory.filter((i) => i.attuned).length;

  const setItem = (id: string, p: Partial<Item>) =>
    upd((x) => ({ ...x, inventory: x.inventory.map((i) => (i.id === id ? { ...i, ...p } : i)) }));

  const toggleEquip = (item: Item) =>
    upd((x) => ({
      ...x,
      inventory: x.inventory.map((i) => {
        if (i.id === item.id) return { ...i, equipped: !i.equipped };
        // Only one body armor and one shield can be worn at a time.
        if (!item.equipped && item.armor && i.armor && i.equipped && (i.armor.kind === 'shield') === (item.armor.kind === 'shield'))
          return { ...i, equipped: false };
        return i;
      }),
    }));

  const sorted = [...c.inventory].sort((a, b) => Number(!!b.equipped) - Number(!!a.equipped));

  return (
    <div className="stack">
      <div className="grid-2">
        <div className="card">
          <div className="card-title">
            <h3>Currency</h3>
          </div>
          <div className="currency">
            {COINS.map((k) => (
              <div key={k} className={cx('coin', k)}>
                <span>{k.toUpperCase()}</span>
                <NumberInput
                  value={c.currency[k]}
                  min={0}
                  relative
                  ariaLabel={k}
                  onChange={(v) => upd((x) => ({ ...x, currency: { ...x.currency, [k]: v } }))}
                />
              </div>
            ))}
          </div>
          <p className="faint tiny" style={{ marginTop: 8 }}>Type +25 or −10 to add or spend.</p>
        </div>
        <div className="card">
          <div className="card-title">
            <h3>Encumbrance</h3>
          </div>
          <div className="row" style={{ alignItems: 'baseline', gap: 6 }}>
            <b style={{ fontSize: 26 }} className="num">{Math.round(weight * 10) / 10}</b>
            <span className="muted">/ {cap} lb.</span>
            <span className="spacer" />
            <span className={cx('chip', attuned > 3 ? 'danger' : attuned ? 'on' : '')}>{attuned}/3 attuned</span>
          </div>
          <div className="hpbar" style={{ marginTop: 10 }}>
            <i className={weight > cap ? 'low' : weight > cap * 0.66 ? 'mid' : ''} style={{ width: `${Math.min(100, (weight / cap) * 100)}%`, background: weight <= cap * 0.66 ? 'var(--accent)' : undefined }} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          <h3>Equipment</h3>
          <span className="spacer" />
          <span className="faint tiny">{c.inventory.length} items</span>
        </div>
        {c.inventory.length === 0 && <p className="muted small" style={{ marginBottom: 12 }}>Nothing in your pack yet.</p>}
        {sorted.map((i) => {
          const isOpen = open === i.id;
          return (
            <div key={i.id} className="entry">
              <div className="entry-head" onClick={() => setOpen(isOpen ? null : i.id)}>
                <div className="grow">
                  <div className="title">
                    {i.name}
                    {i.qty !== 1 && <span className="muted"> ×{i.qty}</span>}
                  </div>
                  <div className="faint tiny">
                    {[i.category, i.rarity, i.weight ? `${i.weight * i.qty} lb.` : ''].filter(Boolean).join(' · ')}
                  </div>
                </div>
                {i.equipped && <span className="tag accent">Equipped</span>}
                {i.attuned && <span className="tag accent">Attuned</span>}
                <ChevronDown size={16} className="faint" style={{ transform: isOpen ? 'rotate(180deg)' : undefined, transition: 'transform .2s' }} />
              </div>
              {isOpen && (
                <div className="entry-body">
                  {i.desc && <RichText text={i.desc} />}
                  <div className="list" style={{ marginTop: 8 }}>
                    <div className="li">
                      <span className="grow">Quantity</span>
                      <button className="btn icon sm ghost" aria-label="Less" onClick={() => setItem(i.id, { qty: Math.max(0, i.qty - 1) })}><Minus /></button>
                      <b className="num" style={{ minWidth: 24, textAlign: 'center' }}>{i.qty}</b>
                      <button className="btn icon sm ghost" aria-label="More" onClick={() => setItem(i.id, { qty: i.qty + 1 })}><Plus /></button>
                    </div>
                    {(i.armor || i.weapon || i.category === 'Magic Item') && (
                      <div className="li">
                        <span className="grow">Equipped{i.armor ? ' (affects AC)' : ''}</span>
                        <Switch on={!!i.equipped} onChange={() => toggleEquip(i)} />
                      </div>
                    )}
                    {(i.attunable || i.attuned) && (
                      <div className="li">
                        <span className="grow">Attuned</span>
                        <Switch on={!!i.attuned} onChange={(v) => setItem(i.id, { attuned: v })} />
                      </div>
                    )}
                  </div>
                  <div className="row wrap" style={{ marginTop: 10 }}>
                    {i.weapon && (
                      <button
                        className="btn sm soft"
                        onClick={() => {
                          upd((x) => ({ ...x, attacks: [...x.attacks, attackFromWeapon(i)] }));
                          notify(`${i.name} added to attacks`);
                        }}
                      >
                        <Swords /> Add as attack
                      </button>
                    )}
                    <span className="spacer" />
                    <button className="btn icon sm ghost" aria-label="Edit item" onClick={() => setEditing(i)}><Pencil /></button>
                    <button
                      className="btn icon sm ghost danger"
                      aria-label="Delete item"
                      onClick={() => upd((x) => ({ ...x, inventory: x.inventory.filter((y) => y.id !== i.id) }))}
                    >
                      <Trash2 />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        <div className="row wrap" style={{ marginTop: 12 }}>
          <button className="btn sm soft" onClick={() => setAdding(true)}>
            <BookOpen /> Add items
          </button>
          <button className="btn sm" onClick={() => setEditing({ id: uid(), name: '', qty: 1, weight: 0 })}>
            <Plus /> Custom item
          </button>
        </div>
      </div>

      <Modal open={adding} onClose={() => setAdding(false)} title="Add equipment" wide>
        <ItemBrowser
          onPick={(item) => {
            upd((x) => {
              const existing = x.inventory.find((i) => i.srdId === item.id && !item.armor && !item.weapon);
              if (existing) return { ...x, inventory: x.inventory.map((i) => (i === existing ? { ...i, qty: i.qty + 1 } : i)) };
              return { ...x, inventory: [...x.inventory, itemFromSrd(item)] };
            });
            notify(`Added ${item.name}`);
          }}
        />
      </Modal>
      <ItemEditor item={editing} onClose={() => setEditing(null)} c={c} upd={upd} />
    </div>
  );
}

function ItemEditor({ item, onClose, c, upd }: TabProps & { item: Item | null; onClose: () => void }) {
  const [draft, setDraft] = useState<Item | null>(item);
  const [lastId, setLastId] = useState(item?.id);
  if (item?.id !== lastId) {
    setLastId(item?.id);
    setDraft(item);
  }
  if (!draft) return null;
  const exists = c.inventory.some((i) => i.id === draft.id);
  const set = (p: Partial<Item>) => setDraft({ ...draft, ...p });
  return (
    <Modal
      open={!!item}
      onClose={onClose}
      title={exists ? 'Edit item' : 'Custom item'}
      footer={
        <button
          className="btn primary"
          disabled={!draft.name.trim()}
          onClick={() => {
            upd((x) => ({ ...x, inventory: exists ? x.inventory.map((i) => (i.id === draft.id ? draft : i)) : [...x.inventory, draft] }));
            onClose();
          }}
        >
          Save
        </button>
      }
    >
      <div className="col" style={{ gap: 12 }}>
        <label className="field">
          <span>Name</span>
          <input className="input" value={draft.name} onChange={(e) => set({ name: e.target.value })} />
        </label>
        <div className="grid-2">
          <label className="field">
            <span>Quantity</span>
            <NumberInput value={draft.qty} min={0} onChange={(v) => set({ qty: v })} />
          </label>
          <label className="field">
            <span>Weight (lb. each)</span>
            <input className="input" inputMode="decimal" value={draft.weight} onChange={(e) => set({ weight: Number(e.target.value.replace(/[^\d.]/g, '')) || 0 })} />
          </label>
          <label className="field">
            <span>Category</span>
            <input className="input" value={draft.category ?? ''} placeholder="Gear" onChange={(e) => set({ category: e.target.value })} />
          </label>
          <label className="field">
            <span>Rarity</span>
            <input className="input" value={draft.rarity ?? ''} placeholder="Common" onChange={(e) => set({ rarity: e.target.value })} />
          </label>
        </div>
        <div className="list">
          <div className="li"><span className="grow">Can be attuned</span><Switch on={!!draft.attunable} onChange={(v) => set({ attunable: v })} /></div>
        </div>
        <label className="field">
          <span>Description</span>
          <TextInput multiline value={draft.desc ?? ''} onChange={(v) => set({ desc: v })} />
        </label>
      </div>
    </Modal>
  );
}
