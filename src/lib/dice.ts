export type RollMode = 'normal' | 'adv' | 'dis';

export interface RollTerm {
  kind: 'dice' | 'flat';
  sign: 1 | -1;
  count: number;
  sides: number;
  rolls: number[];
  /** For advantage/disadvantage d20s: the rolls that were discarded */
  dropped?: number[];
  value: number;
}

export interface RollResult {
  id: string;
  label: string;
  expr: string;
  terms: RollTerm[];
  total: number;
  mode: RollMode;
  crit?: 'hit' | 'fail';
  at: number;
}

const rand = (sides: number) => {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return (buf[0] % sides) + 1;
};

const TERM = /([+-]?)\s*(\d*)d(\d+)|([+-]?)\s*(\d+)/gi;

/** Rolls expressions like "1d20+5", "2d6 + 1d4 - 1". */
export const roll = (expr: string, label = '', mode: RollMode = 'normal'): RollResult => {
  const terms: RollTerm[] = [];
  const cleaned = expr.replace(/\s+/g, '');
  let m: RegExpExecArray | null;
  TERM.lastIndex = 0;
  while ((m = TERM.exec(cleaned))) {
    if (m[3]) {
      const sign = m[1] === '-' ? -1 : 1;
      const count = Math.min(Number(m[2] || 1), 100);
      const sides = Number(m[3]);
      let rolls = Array.from({ length: count }, () => rand(sides));
      let dropped: number[] | undefined;
      if (sides === 20 && count === 1 && mode !== 'normal') {
        const other = rand(20);
        const keep = mode === 'adv' ? Math.max(rolls[0], other) : Math.min(rolls[0], other);
        dropped = [keep === rolls[0] ? other : rolls[0]];
        rolls = [keep];
      }
      const value = sign * rolls.reduce((s, n) => s + n, 0);
      terms.push({ kind: 'dice', sign, count, sides, rolls, dropped, value });
    } else if (m[5]) {
      const sign = m[4] === '-' ? -1 : 1;
      const n = Number(m[5]);
      terms.push({ kind: 'flat', sign, count: 0, sides: 0, rolls: [], value: sign * n });
    }
  }
  const total = terms.reduce((s, t) => s + t.value, 0);
  const d20 = terms.find((t) => t.kind === 'dice' && t.sides === 20 && t.count === 1);
  const crit = d20 ? (d20.rolls[0] === 20 ? 'hit' : d20.rolls[0] === 1 ? 'fail' : undefined) : undefined;
  return { id: Math.random().toString(36).slice(2), label, expr, terms, total, mode, crit, at: Date.now() };
};

export const d20Expr = (bonus: number) => (bonus === 0 ? '1d20' : `1d20${bonus > 0 ? '+' : ''}${bonus}`);

/** Doubles dice counts for a critical hit damage roll. */
export const critExpr = (expr: string) => expr.replace(/(\d*)d(\d+)/gi, (_, n, s) => `${Number(n || 1) * 2}d${s}`);

export const isRollable = (expr: string) => /\d*d\d+/i.test(expr);
