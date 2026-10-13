import { useState } from 'react';
import { Heart, Shield, Swords } from 'lucide-react';
import type { Character } from '../../lib/types';
import { applyDamage, applyHealing } from '../../lib/character';
import type { Upd } from '../../pages/Sheet';
import { HpBar, Modal, NumberInput } from '../ui';

export default function HpModal({
  open, onClose, c, upd, accent,
}: { open: boolean; onClose: () => void; c: Character; upd: Upd; accent: string }) {
  return (
    <Modal open={open} onClose={onClose} title="Hit Points" accent={accent}>
      <HpPanel c={c} upd={upd} />
    </Modal>
  );
}

export function HpPanel({ c, upd }: { c: Character; upd: Upd }) {
  const [amount, setAmount] = useState('');
  const n = Math.max(0, Math.floor(Number(amount) || 0));
  return (
    <div className="hp-card col" style={{ gap: 14 }}>
      <div className="row" style={{ alignItems: 'baseline', gap: 6 }}>
        <span className="big">{c.hp.current}</span>
        <span className="of">/ {c.hp.max}</span>
        {c.hp.temp > 0 && (
          <span className="chip" style={{ color: 'var(--temp)', marginLeft: 6 }}>
            +{c.hp.temp} temp
          </span>
        )}
      </div>
      <HpBar current={c.hp.current} max={c.hp.max} temp={c.hp.temp} />
      <div className="hp-actions">
        <button
          className="btn danger"
          disabled={!n}
          onClick={() => {
            upd((x) => applyDamage(x, n));
            setAmount('');
          }}
        >
          <Swords /> Damage
        </button>
        <input
          className="input hp-input"
          inputMode="numeric"
          placeholder="0"
          value={amount}
          aria-label="Amount"
          onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
        />
        <button
          className="btn"
          style={{ color: 'var(--success)' }}
          disabled={!n}
          onClick={() => {
            upd((x) => applyHealing(x, n));
            setAmount('');
          }}
        >
          <Heart /> Heal
        </button>
        <button
          className="btn"
          style={{ color: 'var(--temp)' }}
          disabled={!n}
          title="Set temporary HP"
          onClick={() => {
            upd((x) => ({ ...x, hp: { ...x.hp, temp: Math.max(x.hp.temp, n) } }));
            setAmount('');
          }}
        >
          <Shield /> Temp
        </button>
      </div>
      <div className="grid-2 hp-fields">
        <label className="field">
          <span>Current</span>
          <NumberInput value={c.hp.current} min={0} max={c.hp.max} relative onChange={(v) => upd((x) => ({ ...x, hp: { ...x.hp, current: v } }))} />
        </label>
        <label className="field">
          <span>Max</span>
          <NumberInput value={c.hp.max} min={1} onChange={(v) => upd((x) => ({ ...x, hp: { ...x.hp, max: v, current: Math.min(x.hp.current, v) } }))} />
        </label>
        <label className="field">
          <span>Temporary</span>
          <NumberInput value={c.hp.temp} min={0} onChange={(v) => upd((x) => ({ ...x, hp: { ...x.hp, temp: v } }))} />
        </label>
      </div>
    </div>
  );
}
