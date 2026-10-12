import { create } from 'zustand';
import { roll as doRoll, type RollMode, type RollResult } from '../lib/dice';

export type Theme = 'dark' | 'light' | 'system';

interface Toast { id: string; result?: RollResult; message?: string; out?: boolean }

interface UiState {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toasts: Toast[];
  history: RollResult[];
  diceOpen: boolean;
  setDiceOpen: (open: boolean) => void;
  roll: (expr: string, label?: string, mode?: RollMode) => RollResult;
  notify: (message: string) => void;
  clearHistory: () => void;
}

const readTheme = (): Theme => {
  try {
    return (localStorage.getItem('tome.theme') as Theme) || 'dark';
  } catch {
    return 'dark';
  }
};

export const applyTheme = (t: Theme) => {
  const resolved = t === 'system' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : t;
  document.documentElement.dataset.theme = resolved;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'light' ? '#f4f5f9' : '#0b0d12');
};

const pushToast = (set: (fn: (s: UiState) => Partial<UiState>) => void, toast: Toast) => {
  set((s) => ({ toasts: [...s.toasts.slice(-2), toast] }));
  setTimeout(() => set((s) => ({ toasts: s.toasts.map((t) => (t.id === toast.id ? { ...t, out: true } : t)) })), 3600);
  setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== toast.id) })), 3950);
};

export const useUi = create<UiState>((set) => ({
  theme: readTheme(),
  setTheme: (theme) => {
    try {
      localStorage.setItem('tome.theme', theme);
    } catch {
      /* private mode */
    }
    applyTheme(theme);
    set({ theme });
  },
  toasts: [],
  history: [],
  diceOpen: false,
  setDiceOpen: (diceOpen) => set({ diceOpen }),
  roll: (expr, label = '', mode = 'normal') => {
    const result = doRoll(expr, label, mode);
    set((s) => ({ history: [result, ...s.history].slice(0, 50) }));
    pushToast(set, { id: result.id, result });
    if ('vibrate' in navigator) navigator.vibrate?.(12);
    return result;
  },
  notify: (message) => pushToast(set, { id: Math.random().toString(36).slice(2), message }),
  clearHistory: () => set({ history: [] }),
}));
