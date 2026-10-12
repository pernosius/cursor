import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { TabProps } from '../../pages/Sheet';
import { uid } from '../../lib/id';
import type { Character } from '../../lib/types';
import { TextInput } from '../ui';

const BIO: [keyof Character['bio'], string, string][] = [
  ['appearance', 'Appearance', 'Height, eyes, scars, the way they carry themselves…'],
  ['personality', 'Personality Traits', 'How do they act around others?'],
  ['ideals', 'Ideals', 'What do they believe in?'],
  ['bonds', 'Bonds', 'Who or what do they care about most?'],
  ['flaws', 'Flaws', 'What could get them into trouble?'],
  ['allies', 'Allies & Organizations', 'Friends, factions, rivals…'],
];

export default function Notes({ c, upd }: TabProps) {
  const [showAll, setShowAll] = useState(false);
  const notes = [...c.notes].sort((a, b) => b.date - a.date);
  const setBio = (k: keyof Character['bio'], v: string) => upd((x) => ({ ...x, bio: { ...x.bio, [k]: v } }));

  return (
    <div className="grid-2">
      <div className="stack">
        <div className="card">
          <div className="card-title">
            <h3>Session Notes</h3>
            <span className="spacer" />
            <button
              className="btn sm soft"
              onClick={() =>
                upd((x) => ({
                  ...x,
                  notes: [
                    {
                      id: uid(),
                      title: `Session ${x.notes.length + 1}`,
                      body: '',
                      date: Date.now(),
                    },
                    ...x.notes,
                  ],
                }))
              }
            >
              <Plus /> New note
            </button>
          </div>
          {notes.length === 0 && <p className="muted small">Jot down names, clues and loot as you play.</p>}
          {(showAll ? notes : notes.slice(0, 5)).map((n) => (
            <div key={n.id} className="entry" style={{ padding: 10 }}>
              <div className="row">
                <TextInput
                  className="bare grow"
                  value={n.title}
                  ariaLabel="Note title"
                  onChange={(v) => upd((x) => ({ ...x, notes: x.notes.map((y) => (y.id === n.id ? { ...y, title: v } : y)) }))}
                />
                <span className="faint tiny">{new Date(n.date).toLocaleDateString()}</span>
                <button
                  className="btn icon sm ghost danger"
                  aria-label="Delete note"
                  onClick={() => upd((x) => ({ ...x, notes: x.notes.filter((y) => y.id !== n.id) }))}
                >
                  <Trash2 />
                </button>
              </div>
              <TextInput
                multiline
                rows={4}
                value={n.body}
                placeholder="What happened?"
                ariaLabel="Note"
                onChange={(v) => upd((x) => ({ ...x, notes: x.notes.map((y) => (y.id === n.id ? { ...y, body: v } : y)) }))}
              />
            </div>
          ))}
          {notes.length > 5 && (
            <button className="btn ghost sm block" style={{ marginTop: 8 }} onClick={() => setShowAll((v) => !v)}>
              {showAll ? 'Show fewer' : `Show all ${notes.length} notes`}
            </button>
          )}
        </div>
        <div className="card">
          <div className="card-title">
            <h3>Backstory</h3>
          </div>
          <TextInput multiline rows={10} value={c.bio.backstory} placeholder="Where did they come from?" onChange={(v) => setBio('backstory', v)} />
        </div>
      </div>
      <div className="card">
        <div className="card-title">
          <h3>Character</h3>
        </div>
        <div className="col" style={{ gap: 12 }}>
          {BIO.map(([k, label, ph]) => (
            <label key={k} className="field">
              <span>{label}</span>
              <TextInput multiline rows={3} value={c.bio[k]} placeholder={ph} onChange={(v) => setBio(k, v)} />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
