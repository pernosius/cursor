import { useUi } from '../store/ui';
import { cx } from './ui';
import type { RollResult } from '../lib/dice';

export const RollDetail = ({ r }: { r: RollResult }) => (
  <span className="detail">
    {r.terms.map((t, i) => (
      <span key={i}>
        {i > 0 || t.sign < 0 ? (t.sign < 0 ? ' − ' : ' + ') : ''}
        {t.kind === 'dice' ? (
          <>
            [{t.rolls.join(', ')}
            {t.dropped && <span className="dropped"> {t.dropped.join(', ')}</span>}]
          </>
        ) : (
          Math.abs(t.value)
        )}
      </span>
    ))}
    {r.mode !== 'normal' && <span> · {r.mode === 'adv' ? 'Advantage' : 'Disadvantage'}</span>}
  </span>
);

export default function Toasts() {
  const toasts = useUi((s) => s.toasts);
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={cx('toast', t.out && 'out')}>
          {t.result ? (
            <>
              <div className={cx('total', t.result.crit === 'hit' && 'crit', t.result.crit === 'fail' && 'fail')}>
                {t.result.total}
              </div>
              <div className="grow">
                <div style={{ fontWeight: 650 }}>
                  {t.result.label || t.result.expr}
                  {t.result.crit === 'hit' && <span style={{ color: 'var(--success)' }}> · Natural 20!</span>}
                  {t.result.crit === 'fail' && <span style={{ color: 'var(--danger)' }}> · Natural 1</span>}
                </div>
                <div>
                  <span className="faint tiny">{t.result.expr} </span>
                  <RollDetail r={t.result} />
                </div>
              </div>
            </>
          ) : (
            <div className="grow" style={{ fontWeight: 560 }}>
              {t.message}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
