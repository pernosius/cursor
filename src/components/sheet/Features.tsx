import { useMemo, useState } from 'react';
import { ChevronDown, Pencil, Plus, Trash2 } from 'lucide-react';
import type { TabProps } from '../../pages/Sheet';
import { uid } from '../../lib/id';
import type { Feature, Reset } from '../../lib/types';
import { FEATS } from '../../lib/srd';
import { useUi } from '../../store/ui';
import { Modal, NumberInput, Pips, RichText, Switch, TextInput, cx } from '../ui';

const RESET_LABEL: Record<Reset, string> = { short: 'Short rest', long: 'Long rest', none: 'Manual' };

export default function Features({ c, upd }: TabProps) {
  const notify = useUi((s) => s.notify);
  const [open, setOpen] = useState<string | null>(null);
  const [filter, setFilter] = useState('All');
  const [editing, setEditing] = useState<Feature | null>(null);
  const [featPicker, setFeatPicker] = useState(false);

  const sources = useMemo(() => {
    const s = new Set<string>();
    for (const f of c.features) s.add(f.source.replace(/ \d+$/, ''));
    return ['All', 'Trackers', ...s];
  }, [c.features]);

  const list = c.features
    .filter((f) =>
      filter === 'All' ? true : filter === 'Trackers' ? !!f.uses : f.source.replace(/ \d+$/, '') === filter,
    )
    .sort((a, b) => Number(!!b.uses) - Number(!!a.uses));

  const trackers = c.features.filter((f) => f.uses);

  return (
    <div className="stack">
      {trackers.length > 0 && (
        <div className="card">
          <div className="card-title">
            <h3>Limited Uses</h3>
          </div>
          <div className="list">
            {trackers.map((f) => (
              <div key={f.id} className="li" style={{ flexWrap: 'wrap' }}>
                <div className="grow" style={{ minWidth: 140 }}>
                  <div style={{ fontWeight: 600 }}>{f.name}</div>
                  <div className="faint tiny">
                    {f.uses!.max - f.uses!.used}/{f.uses!.max} · {RESET_LABEL[f.uses!.reset]}
                  </div>
                </div>
                {f.uses!.max <= 12 ? (
                  <Pips
                    max={f.uses!.max}
                    used={f.uses!.used}
                    onChange={(u) =>
                      upd((x) => ({
                        ...x,
                        features: x.features.map((y) =>
                          y.id === f.id ? { ...y, uses: { ...y.uses!, used: Math.max(0, Math.min(y.uses!.max, u)) } } : y,
                        ),
                      }))
                    }
                  />
                ) : (
                  <div className="row" style={{ gap: 6 }}>
                    <span className="small muted">Left</span>
                    <NumberInput
                      className="center"
                      relative
                      value={f.uses!.max - f.uses!.used}
                      min={0}
                      max={f.uses!.max}
                      onChange={(v) =>
                        upd((x) => ({
                          ...x,
                          features: x.features.map((y) => (y.id === f.id ? { ...y, uses: { ...y.uses!, used: y.uses!.max - v } } : y)),
                        }))
                      }
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-title">
          <h3>Features & Traits</h3>
        </div>
        <div className="chips scroll" style={{ marginBottom: 12 }}>
          {sources.map((s) => (
            <button key={s} className={cx('chip', filter === s && 'on')} onClick={() => setFilter(s)}>
              {s}
            </button>
          ))}
        </div>
        {list.map((f) => {
          const isOpen = open === f.id;
          return (
            <div key={f.id} className="entry">
              <div className="entry-head" onClick={() => setOpen(isOpen ? null : f.id)}>
                <div className="grow">
                  <div className="title">{f.name}</div>
                  <div className="faint tiny">{f.source}</div>
                </div>
                {f.uses && (
                  <span className="tag accent">
                    {f.uses.max - f.uses.used}/{f.uses.max}
                  </span>
                )}
                <ChevronDown size={16} className="faint" style={{ transform: isOpen ? 'rotate(180deg)' : undefined, transition: 'transform .2s' }} />
              </div>
              {isOpen && (
                <div className="entry-body">
                  {f.desc ? <RichText text={f.desc} /> : <p className="faint small">No description.</p>}
                  <div className="row" style={{ marginTop: 10, justifyContent: 'flex-end' }}>
                    <button className="btn icon sm ghost" aria-label="Edit feature" onClick={() => setEditing(f)}>
                      <Pencil />
                    </button>
                    <button
                      className="btn icon sm ghost danger"
                      aria-label="Delete feature"
                      onClick={() => upd((x) => ({ ...x, features: x.features.filter((y) => y.id !== f.id) }))}
                    >
                      <Trash2 />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {c.features.length === 0 && <p className="muted small">No features yet.</p>}
        <div className="row wrap" style={{ marginTop: 12 }}>
          <button className="btn sm soft" onClick={() => setEditing({ id: uid(), name: '', source: 'Custom', desc: '' })}>
            <Plus /> Add feature
          </button>
          <button className="btn sm" onClick={() => setFeatPicker(true)}>
            <Plus /> Add feat
          </button>
        </div>
      </div>

      <Modal open={featPicker} onClose={() => setFeatPicker(false)} title="Add a feat">
        {FEATS.map((f) => (
          <div key={f.id} className="entry">
            <div className="entry-head" onClick={() => setOpen(open === f.id ? null : f.id)}>
              <div className="grow">
                <div className="title">{f.name}</div>
                <div className="faint tiny">{f.type.replace(/-/g, ' ')} feat</div>
              </div>
              <button
                className="btn sm soft"
                onClick={(e) => {
                  e.stopPropagation();
                  upd((x) => ({ ...x, features: [...x.features, { id: uid(), name: f.name, source: 'Feat', desc: f.desc }] }));
                  notify(`Added ${f.name}`);
                }}
              >
                <Plus /> Add
              </button>
            </div>
            {open === f.id && (
              <div className="entry-body">
                <RichText text={f.desc} />
              </div>
            )}
          </div>
        ))}
      </Modal>
      <FeatureEditor feature={editing} onClose={() => setEditing(null)} c={c} upd={upd} />
    </div>
  );
}

function FeatureEditor({ feature, onClose, c, upd }: TabProps & { feature: Feature | null; onClose: () => void }) {
  const [draft, setDraft] = useState<Feature | null>(feature);
  const [lastId, setLastId] = useState(feature?.id);
  if (feature?.id !== lastId) {
    setLastId(feature?.id);
    setDraft(feature);
  }
  if (!draft) return null;
  const exists = c.features.some((f) => f.id === draft.id);
  const set = (p: Partial<Feature>) => setDraft({ ...draft, ...p });
  return (
    <Modal
      open={!!feature}
      onClose={onClose}
      title={exists ? 'Edit feature' : 'New feature'}
      footer={
        <button
          className="btn primary"
          disabled={!draft.name.trim()}
          onClick={() => {
            upd((x) => ({ ...x, features: exists ? x.features.map((f) => (f.id === draft.id ? draft : f)) : [...x.features, draft] }));
            onClose();
          }}
        >
          Save
        </button>
      }
    >
      <div className="col" style={{ gap: 12 }}>
        <div className="grid-2">
          <label className="field">
            <span>Name</span>
            <input className="input" value={draft.name} onChange={(e) => set({ name: e.target.value })} />
          </label>
          <label className="field">
            <span>Source</span>
            <input className="input" value={draft.source} onChange={(e) => set({ source: e.target.value })} />
          </label>
        </div>
        <div className="list">
          <div className="li">
            <span className="grow">Has limited uses</span>
            <Switch
              on={!!draft.uses}
              onChange={(v) => set({ uses: v ? { max: 1, used: 0, reset: 'long' } : undefined })}
            />
          </div>
        </div>
        {draft.uses && (
          <div className="grid-2">
            <label className="field">
              <span>Uses</span>
              <NumberInput value={draft.uses.max} min={1} max={99} onChange={(v) => set({ uses: { ...draft.uses!, max: v, used: Math.min(draft.uses!.used, v) } })} />
            </label>
            <label className="field">
              <span>Recharges on</span>
              <select className="select" value={draft.uses.reset} onChange={(e) => set({ uses: { ...draft.uses!, reset: e.target.value as Reset } })}>
                <option value="short">Short or Long rest</option>
                <option value="long">Long rest</option>
                <option value="none">Manual</option>
              </select>
            </label>
          </div>
        )}
        <label className="field">
          <span>Description</span>
          <TextInput multiline rows={6} value={draft.desc} onChange={(v) => set({ desc: v })} />
        </label>
      </div>
    </Modal>
  );
}
