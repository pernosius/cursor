import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Dices, Trash2 } from 'lucide-react';
import { useUi } from '../store/ui';
import type { RollMode } from '../lib/dice';
import { Modal, cx } from './ui';
import { RollDetail } from './Toasts';

const DICE = [4, 6, 8, 10, 12, 20, 100];

export default function DiceRoller() {
  const { diceOpen, setDiceOpen, roll, history, clearHistory } = useUi();
  const [pool, setPool] = useState<Record<number, number>>({});
  const [modifier, setModifier] = useState(0);
  const [mode, setMode] = useState<RollMode>('normal');
  const [custom, setCustom] = useState('');
  // The wizard has its own bottom action bar, so keep the FAB out of its way.
  const hideFab = useLocation().pathname === '/new';

  const expr = [
    ...Object.entries(pool)
      .filter(([, n]) => n > 0)
      .map(([d, n]) => `${n}d${d}`),
    ...(modifier ? [`${modifier > 0 ? '+' : ''}${modifier}`] : []),
  ]
    .join('+')
    .replace('+-', '-')
    .replace('++', '+');

  const doRoll = () => {
    const e = custom.trim() || expr;
    if (!e) return;
    roll(e, '', mode);
    setPool({});
    setModifier(0);
    setCustom('');
  };

  return (
    <>
      <button className={cx('fab', hideFab && 'hidden')} onClick={() => setDiceOpen(true)} aria-label="Roll dice">
        <Dices />
      </button>
      <Modal
        open={diceOpen}
        onClose={() => setDiceOpen(false)}
        title="Dice"
        footer={
          <button className="btn primary" onClick={doRoll} disabled={!expr && !custom.trim()}>
            <Dices /> Roll {custom.trim() || expr || ''}
          </button>
        }
      >
        <div className="col" style={{ gap: 14 }}>
          <div className="dice-grid">
            {DICE.map((d) => (
              <button
                key={d}
                className="die"
                onClick={() => setPool((p) => ({ ...p, [d]: (p[d] ?? 0) + 1 }))}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setPool((p) => ({ ...p, [d]: Math.max(0, (p[d] ?? 0) - 1) }));
                }}
              >
                d{d}
                {pool[d] ? <span className="count">{pool[d]}</span> : null}
              </button>
            ))}
            <button className="die" onClick={() => setPool({})}>
              Clear
            </button>
          </div>
          <div className="row wrap">
            <div className="seg">
              {(['normal', 'adv', 'dis'] as RollMode[]).map((m) => (
                <button key={m} className={cx(mode === m && 'on')} onClick={() => setMode(m)}>
                  {m === 'normal' ? 'Normal' : m === 'adv' ? 'Advantage' : 'Disadvantage'}
                </button>
              ))}
            </div>
            <div className="row" style={{ gap: 6 }}>
              <button className="btn icon sm" onClick={() => setModifier((m) => m - 1)}>
                −
              </button>
              <span className="num" style={{ minWidth: 34, textAlign: 'center', fontWeight: 650 }}>
                {modifier >= 0 ? `+${modifier}` : modifier}
              </span>
              <button className="btn icon sm" onClick={() => setModifier((m) => m + 1)}>
                +
              </button>
            </div>
          </div>
          <input
            className="input"
            placeholder="Or type an expression, e.g. 2d6+1d4+3"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && doRoll()}
          />
          {history.length > 0 && (
            <div>
              <div className="row" style={{ marginBottom: 4 }}>
                <span className="upper grow">History</span>
                <button className="btn ghost sm" onClick={clearHistory}>
                  <Trash2 /> Clear
                </button>
              </div>
              {history.slice(0, 12).map((r) => (
                <div key={r.id} className="history-item">
                  <span
                    className="t"
                    style={{ color: r.crit === 'hit' ? 'var(--success)' : r.crit === 'fail' ? 'var(--danger)' : undefined }}
                  >
                    {r.total}
                  </span>
                  <div className="grow">
                    <div className="small" style={{ fontWeight: 600 }}>
                      {r.label || r.expr}
                    </div>
                    <RollDetail r={r} />
                  </div>
                  <span className="faint tiny">{new Date(r.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
