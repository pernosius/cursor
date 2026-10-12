import { useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import type { Character } from '../../lib/types';
import type { Upd } from '../../pages/Sheet';
import { hitDicePool, mod } from '../../lib/rules';
import { longRest, shortRest } from '../../lib/character';
import { useUi } from '../../store/ui';
import { Modal, cx } from '../ui';

export default function Rest({
  open, onClose, c, upd, accent,
}: { open: boolean; onClose: () => void; c: Character; upd: Upd; accent: string }) {
  const { roll, notify } = useUi();
  const [kind, setKind] = useState<'short' | 'long'>('short');
  const [healed, setHealed] = useState(0);
  const [spent, setSpent] = useState<Record<string, number>>({});
  const pool = hitDicePool(c);
  const conMod = mod(c.abilities.con);

  const close = () => {
    setHealed(0);
    setSpent({});
    onClose();
  };

  const spend = (die: string) => {
    const r = roll(`1d${die}${conMod ? (conMod > 0 ? `+${conMod}` : conMod) : ''}`, `Hit die d${die}`);
    setHealed((h) => h + Math.max(0, r.total));
    setSpent((s) => ({ ...s, [die]: (s[die] ?? 0) + 1 }));
  };

  const shortResets = c.features.filter((f) => f.uses?.reset === 'short').map((f) => f.name);

  return (
    <Modal
      open={open}
      onClose={close}
      title="Rest"
      accent={accent}
      footer={
        <button
          className="btn primary"
          onClick={() => {
            if (kind === 'short') upd((x) => shortRest(x, healed, spent));
            else upd(longRest);
            notify(kind === 'short' ? `Short rest complete${healed ? ` · +${healed} HP` : ''}` : 'Long rest complete. Fully restored.');
            close();
          }}
        >
          {kind === 'short' ? <Sun /> : <Moon />} Finish {kind} rest
        </button>
      }
    >
      <div className="col" style={{ gap: 16 }}>
        <div className="seg" style={{ alignSelf: 'flex-start' }}>
          <button className={cx(kind === 'short' && 'on')} onClick={() => setKind('short')}>
            Short Rest
          </button>
          <button className={cx(kind === 'long' && 'on')} onClick={() => setKind('long')}>
            Long Rest
          </button>
        </div>
        {kind === 'short' ? (
          <>
            <p className="muted small">Spend Hit Dice to heal. Each die heals its roll plus your CON modifier.</p>
            <div className="list">
              {Object.entries(pool).map(([die, total]) => {
                const left = total - (c.hitDiceUsed[die] ?? 0) - (spent[die] ?? 0);
                return (
                  <div key={die} className="li">
                    <span className="tag accent">d{die}</span>
                    <span className="grow small muted">{left} remaining</span>
                    <button className="btn sm soft" disabled={left <= 0 || c.hp.current + healed >= c.hp.max} onClick={() => spend(die)}>
                      Spend d{die}
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="row">
              <span className="grow">Healing</span>
              <b className="num" style={{ fontSize: 22, color: 'var(--success)' }}>
                +{Math.min(healed, c.hp.max - c.hp.current)}
              </b>
            </div>
            {(shortResets.length > 0 || c.pactSlots.max > 0) && (
              <p className="faint small">
                Also recharges: {[...shortResets, ...(c.pactSlots.max > 0 ? ['Pact Magic slots'] : [])].join(', ')}
              </p>
            )}
          </>
        ) : (
          <ul className="muted small" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6 }}>
            <li>Regain all Hit Points ({c.hp.max}) and spent Hit Dice</li>
            <li>Recover all spell slots</li>
            <li>Recharge every limited-use feature</li>
            {c.exhaustion > 0 && <li>Reduce Exhaustion by 1 (to {c.exhaustion - 1})</li>}
            <li>Temporary HP and death saves reset</li>
          </ul>
        )}
      </div>
    </Modal>
  );
}
