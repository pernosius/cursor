import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export const cx = (...c: (string | false | 0 | null | undefined)[]) => c.filter(Boolean).join(' ');

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
  accent,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  accent?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className={cx('modal', wide && 'wide')}
        role="dialog"
        aria-modal="true"
        style={accent ? ({ '--accent': accent } as React.CSSProperties) : undefined}
      >
        <div className="grabber" />
        <div className="modal-head">
          <h2 className="grow">{title}</h2>
          <button className="btn icon sm ghost" onClick={onClose} aria-label="Close">
            <X />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={cx('switch', on && 'on')}
      onClick={() => onChange(!on)}
    />
  );
}

/** A row of pips: filled = available, hollow = used. Tapping toggles. */
export function Pips({
  max,
  used,
  onChange,
  variant,
  round,
}: {
  max: number;
  used: number;
  onChange: (used: number) => void;
  variant?: 'danger' | 'success';
  round?: boolean;
}) {
  return (
    <div className={cx('pips', variant, round && 'round')}>
      {Array.from({ length: max }, (_, i) => {
        const isUsed = i >= max - used;
        return (
          <button
            key={i}
            type="button"
            className={cx('pip', isUsed && 'used')}
            aria-label={isUsed ? 'Restore' : 'Use'}
            onClick={() => onChange(isUsed ? used - 1 : used + 1)}
          />
        );
      })}
    </div>
  );
}

/** Numeric input that commits on blur/enter and accepts "+3"/"-2" relative edits. */
export function NumberInput({
  value,
  onChange,
  min,
  max,
  className,
  ariaLabel,
  relative,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  className?: string;
  ariaLabel?: string;
  relative?: boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft == null) return;
    const t = draft.trim();
    let n = relative && /^[+-]/.test(t) ? value + Number(t) : Number(t);
    if (!Number.isFinite(n) || t === '') n = value;
    if (min != null) n = Math.max(min, n);
    if (max != null) n = Math.min(max, n);
    setDraft(null);
    if (n !== value) onChange(Math.round(n));
  };
  return (
    <input
      className={cx('input', className)}
      inputMode={relative ? 'text' : 'numeric'}
      aria-label={ariaLabel}
      value={draft ?? String(value)}
      onFocus={(e) => {
        setDraft(String(value));
        requestAnimationFrame(() => e.target.select());
      }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') {
          setDraft(null);
          (e.target as HTMLInputElement).blur();
        }
      }}
    />
  );
}

/** Text input that only writes back on blur — keeps typing smooth and sync quiet. */
export function TextInput({
  value,
  onChange,
  placeholder,
  className,
  multiline,
  ariaLabel,
  rows,
}: {
  value: string;
  onChange: (s: string) => void;
  placeholder?: string;
  className?: string;
  multiline?: boolean;
  ariaLabel?: string;
  rows?: number;
}) {
  const [draft, setDraft] = useState(value);
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setDraft(value);
  }, [value]);
  const props = {
    value: draft,
    placeholder,
    'aria-label': ariaLabel,
    onFocus: () => (focused.current = true),
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(e.target.value),
    onBlur: () => {
      focused.current = false;
      if (draft !== value) onChange(draft);
    },
  };
  return multiline ? (
    <textarea className={cx('textarea', className)} rows={rows ?? 4} {...props} />
  ) : (
    <input
      className={cx('input', className)}
      {...props}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
    />
  );
}

/** Inline markdown: **bold** and *italic*. */
function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('**') ? (
          <strong key={i}>{p.slice(2, -2)}</strong>
        ) : p.length > 2 && p.startsWith('*') && p.endsWith('*') ? (
          <em key={i}>{p.slice(1, -1)}</em>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

const cells = (line: string) => line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());

/** Renders rules text: paragraphs, bullet lists, markdown tables, bold and italics. */
export function RichText({ text, className }: { text: string; className?: string }) {
  const lines = text.replace(/\r/g, '').split('\n');
  const blocks: React.ReactNode[] = [];
  for (let i = 0; i < lines.length; ) {
    const line = lines[i];
    if (/^\s*\|/.test(line)) {
      const rows: string[][] = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) {
        const c = cells(lines[i++]);
        if (!c.every((x) => /^:?-{2,}:?$/.test(x) || x === '')) rows.push(c);
      }
      const [head, ...body] = rows;
      blocks.push(
        <div key={blocks.length} className="rt-table">
          <table>
            {head && (
              <thead>
                <tr>{head.map((c, j) => <th key={j}><Inline text={c} /></th>)}</tr>
              </thead>
            )}
            <tbody>
              {body.map((r, k) => (
                <tr key={k}>{r.map((c, j) => <td key={j}><Inline text={c} /></td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
    } else if (/^\s*[*-]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[*-]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*[*-]\s+/, ''));
      blocks.push(
        <ul key={blocks.length}>
          {items.map((t, k) => <li key={k}><Inline text={t} /></li>)}
        </ul>,
      );
    } else if (!line.trim()) {
      i++;
    } else {
      const para: string[] = [];
      while (i < lines.length && lines[i].trim() && !/^\s*(\||[*-]\s)/.test(lines[i])) para.push(lines[i++]);
      blocks.push(<p key={blocks.length}><Inline text={para.join('\n')} /></p>);
    }
  }
  return <div className={cx('desc', className)}>{blocks}</div>;
}

export function Avatar({ name, src, size }: { name: string; src?: string; size?: 'lg' }) {
  return (
    <div className={cx('avatar', size)}>
      {src ? <img src={src} alt="" /> : <span>{(name.trim()[0] || '?').toUpperCase()}</span>}
    </div>
  );
}

export function HpBar({ current, max, temp }: { current: number; max: number; temp: number }) {
  const pct = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
  const tempPct = max > 0 ? Math.min(1 - pct, temp / max) : 0;
  return (
    <div className="hpbar" aria-hidden>
      <i className={pct <= 0.25 ? 'low' : pct <= 0.5 ? 'mid' : ''} style={{ width: `${pct * 100}%` }} />
      {temp > 0 && <b style={{ left: `${pct * 100}%`, width: `${tempPct * 100}%` }} />}
    </div>
  );
}

export function Confirm({
  open,
  title,
  body,
  confirmLabel = 'Delete',
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn danger solid"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="muted">{body}</div>
    </Modal>
  );
}

export const resizeImage = (file: File, size = 320): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      const s = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
      URL.revokeObjectURL(img.src);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
