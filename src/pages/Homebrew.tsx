import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ClipboardPaste, Download, Pencil, Plus, Search, Upload } from 'lucide-react';
import {
  HOMEBREW_KINDS, PARSERS, guessKind, newEntry, normalizeEntry, type HomebrewEntry, type HomebrewKind,
} from '../lib/homebrew';
import { useHomebrew } from '../store/homebrew';
import { useUi } from '../store/ui';
import { CLASSES } from '../lib/srd';
import { ABILITIES, SKILLS } from '../lib/rules';
import { uid } from '../lib/id';
import HomebrewEditor, { kindLabel } from '../components/HomebrewEditor';
import { Confirm, Modal, RichText, cx } from '../components/ui';
import { levelName } from '../components/CompendiumList';

export default function Homebrew() {
  const navigate = useNavigate();
  const { items, add, addMany, update, remove } = useHomebrew();
  const [limit, setLimit] = useState(60);
  const notify = useUi((s) => s.notify);
  const [kind, setKind] = useState<HomebrewKind | 'all'>('all');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ entry: HomebrewEntry; isNew: boolean } | null>(null);
  const [pasting, setPasting] = useState(false);
  const [newKind, setNewKind] = useState(false);
  const [deleting, setDeleting] = useState<HomebrewEntry | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const live = useMemo(() => Object.values(items).filter((e) => !e.deleted), [items]);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const e of live) c[e.kind] = (c[e.kind] ?? 0) + 1;
    return c;
  }, [live]);
  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    return live
      .filter((e) => kind === 'all' || e.kind === kind)
      .filter((e) => !n || e.name.toLowerCase().includes(n) || e.source.toLowerCase().includes(n))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [live, kind, q]);

  const save = (e: HomebrewEntry) => {
    if (items[e.id]) update(e.id, () => e);
    else add({ ...e, updatedAt: Date.now() });
    notify(`Saved ${e.name} to your library`);
    setEditing(null);
  };

  const exportAll = () => {
    const blob = new Blob([JSON.stringify({ app: 'tome', kind: 'homebrew', version: 1, entries: live }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `tome-homebrew-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const importFile = async (file: File) => {
    try {
      const json = JSON.parse(await file.text());
      const rows: Partial<HomebrewEntry>[] = Array.isArray(json) ? json : json.entries ?? [];
      const known = new Set(Object.values(items).filter((e) => !e.deleted).map((e) => `${e.kind}|${e.name.toLowerCase()}`));
      const now = Date.now();
      const fresh: HomebrewEntry[] = [];
      for (const r of rows) {
        if (!r?.name || !r.kind || !HOMEBREW_KINDS.some((k) => k.id === r.kind)) continue;
        const key = `${r.kind}|${r.name.toLowerCase()}`;
        if (known.has(key)) continue;
        known.add(key);
        fresh.push(normalizeEntry({ ...r, id: uid(), createdAt: now, updatedAt: now, deleted: false }));
      }
      addMany(fresh);
      const n = fresh.length;
      notify(n ? `Imported ${n} entr${n === 1 ? 'y' : 'ies'}` : 'Nothing new to import');
    } catch {
      notify('That file could not be read');
    }
  };

  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <header className="topbar">
        <button className="btn icon ghost" onClick={() => navigate(-1)} aria-label="Back">
          <ArrowLeft />
        </button>
        <h2 className="display grow" style={{ fontSize: 26 }}>Homebrew</h2>
        <button className="btn icon ghost" title="Import file" aria-label="Import file" onClick={() => fileRef.current?.click()}>
          <Upload />
        </button>
        <button className="btn icon ghost" title="Back up library" aria-label="Back up library" onClick={exportAll} disabled={!live.length}>
          <Download />
        </button>
      </header>

      <p className="muted" style={{ marginBottom: 14 }}>
        Your own spells, species, subclasses, feats, backgrounds and items. They're private to your account, sync to your devices,
        and appear everywhere alongside the official rules.
      </p>

      <div className="row wrap" style={{ marginBottom: 14 }}>
        <button className="btn primary" onClick={() => setPasting(true)}>
          <ClipboardPaste /> Paste &amp; import
        </button>
        <button className="btn" onClick={() => setNewKind(true)}>
          <Plus /> New entry
        </button>
      </div>

      {live.length > 0 && (
        <div className="col" style={{ gap: 10, marginBottom: 14 }}>
          <label className="search">
            <Search />
            <input className="input" placeholder="Search your library" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <div className="chips scroll">
            <button className={cx('chip', kind === 'all' && 'on')} onClick={() => setKind('all')}>
              All ({live.length})
            </button>
            {HOMEBREW_KINDS.filter((k) => counts[k.id]).map((k) => (
              <button key={k.id} className={cx('chip', kind === k.id && 'on')} onClick={() => setKind(k.id)}>
                {k.plural} ({counts[k.id]})
              </button>
            ))}
          </div>
        </div>
      )}

      {live.length === 0 ? (
        <div className="empty">
          <h2 className="display">Nothing brewed yet</h2>
          <p className="muted" style={{ maxWidth: 460, margin: '0 auto' }}>
            Copy a spell, species, feat or subclass from a book or web page and choose <b>Paste &amp; import</b>. Tome fills in the
            fields for you to check.
          </p>
        </div>
      ) : (
        <div>
          {list.slice(0, limit).map((e) => (
            <div key={e.id} className="entry">
              <div className="entry-head" onClick={() => setOpen(open === e.id ? null : e.id)}>
                <div className="grow">
                  <div className="title">{e.name}</div>
                  <div className="faint tiny">{[summary(e), e.source].filter(Boolean).join(' · ')}</div>
                </div>
                <span className="tag">{kindLabel(e.kind)}</span>
                <ChevronDown size={16} className="faint" style={{ transform: open === e.id ? 'rotate(180deg)' : undefined, transition: 'transform .2s' }} />
              </div>
              {open === e.id && (
                <div className="entry-body">
                  <Details e={e} />
                  <div className="row" style={{ marginTop: 10, justifyContent: 'flex-end' }}>
                    <button className="btn sm" onClick={() => setEditing({ entry: structuredClone(e), isNew: false })}>
                      <Pencil /> Edit
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {list.length > limit && (
            <button className="btn block" style={{ marginTop: 10 }} onClick={() => setLimit((n) => n + 100)}>
              Show more ({list.length - limit} left)
            </button>
          )}
          {list.length === 0 && <p className="muted small">Nothing matches.</p>}
        </div>
      )}

      <PasteImport
        open={pasting}
        onClose={() => setPasting(false)}
        onParsed={(entry) => {
          setPasting(false);
          setEditing({ entry, isNew: true });
        }}
      />

      <Modal open={newKind} onClose={() => setNewKind(false)} title="What are you adding?">
        <div className="pick-grid">
          {HOMEBREW_KINDS.map((k) => (
            <button
              key={k.id}
              className="pick"
              style={{ minHeight: 0 }}
              onClick={() => {
                setNewKind(false);
                setEditing({ entry: newEntry(k.id), isNew: true });
              }}
            >
              <div className="t">{k.label}</div>
            </button>
          ))}
        </div>
      </Modal>

      <HomebrewEditor
        entry={editing?.entry ?? null}
        isNew={!!editing?.isNew}
        onClose={() => setEditing(null)}
        onSave={save}
        onDelete={(e) => setDeleting(e)}
      />
      <Confirm
        open={!!deleting}
        title={`Delete ${deleting?.name}?`}
        body="It's removed from your library on all devices. Characters that already use it keep their copy."
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) remove(deleting.id);
          setEditing(null);
        }}
      />
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(ev) => {
          const f = ev.target.files?.[0];
          if (f) void importFile(f);
          ev.target.value = '';
        }}
      />
    </div>
  );
}

function PasteImport({
  open, onClose, onParsed,
}: { open: boolean; onClose: () => void; onParsed: (e: HomebrewEntry) => void }) {
  const [text, setText] = useState('');
  const [kind, setKind] = useState<HomebrewKind | 'auto'>('auto');
  const detected = text.trim() ? guessKind(text) : null;
  const effective = kind === 'auto' ? detected : kind;

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title="Paste & import"
      footer={
        <button
          className="btn primary"
          disabled={!text.trim() || !effective}
          onClick={() => {
            const parsed = PARSERS[effective!](text);
            const entry = newEntry(effective!, parsed.name, parsed.source);
            onParsed({ ...entry, data: { ...entry.data, ...(parsed.data as object) } } as HomebrewEntry);
            setText('');
            setKind('auto');
          }}
        >
          Read it
        </button>
      }
    >
      <div className="col" style={{ gap: 12 }}>
        <p className="small muted">
          Paste one entry, starting with its name. Tome reads the usual layout (level and school, casting time, range, size, speed,
          "Level 3: Feature" headings and so on). You'll check everything before it's saved.
        </p>
        <div className="seg" style={{ alignSelf: 'flex-start', flexWrap: 'wrap' }}>
          <button className={cx(kind === 'auto' && 'on')} onClick={() => setKind('auto')}>
            Auto{kind === 'auto' && detected ? `: ${kindLabel(detected)}` : ''}
          </button>
          {HOMEBREW_KINDS.map((k) => (
            <button key={k.id} className={cx(kind === k.id && 'on')} onClick={() => setKind(k.id)}>
              {k.label}
            </button>
          ))}
        </div>
        <textarea
          className="textarea"
          rows={14}
          autoFocus
          placeholder={'Fireball\nLevel 3 Evocation (Sorcerer, Wizard)\nCasting Time: Action\nRange: 150 feet\n…'}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>
    </Modal>
  );
}

const className = (id: string) => CLASSES.find((c) => c.id === id)?.name ?? id;

function summary(e: HomebrewEntry): string {
  switch (e.kind) {
    case 'spell':
      return `${levelName(e.data.level)}${e.data.school ? ` ${e.data.school}` : ''}`;
    case 'species':
      return `${e.data.size} · ${e.data.speed} ft.`;
    case 'subclass':
      return e.data.classId ? `${className(e.data.classId)} subclass` : 'Subclass';
    case 'feat':
      return `${e.data.type.replace(/-/g, ' ')} feat`;
    case 'background':
      return e.data.feat ? `Feat: ${e.data.feat}` : 'Background';
    case 'item':
      return [e.data.category, e.data.rarity].filter(Boolean).join(', ');
    case 'class':
      return `d${e.data.hitDie} · ${e.data.caster === 'none' ? 'no spellcasting' : `${e.data.caster} caster`}`;
  }
}

function Details({ e }: { e: HomebrewEntry }) {
  switch (e.kind) {
    case 'spell':
      return (
        <>
          <div className="small muted" style={{ marginBottom: 8 }}>
            {[e.data.time, e.data.range, e.data.components, e.data.duration].filter(Boolean).join(' · ')}
            {e.data.classes.length > 0 && <div>{e.data.classes.map(className).join(', ')}</div>}
          </div>
          <RichText text={e.data.desc || 'No description.'} />
          {e.data.higher && <RichText className="small" text={`**At higher levels.** ${e.data.higher}`} />}
        </>
      );
    case 'species':
      return <RichText text={e.data.traits.map((t) => `**${t.name}.** ${t.desc}`).join('\n\n') || 'No traits.'} />;
    case 'subclass':
      return (
        <RichText
          text={[e.data.desc, ...e.data.features.map((f) => `**Level ${f.level}: ${f.name}.** ${f.desc}`)].filter(Boolean).join('\n\n') || 'No features.'}
        />
      );
    case 'background':
      return (
        <RichText
          text={[
            e.data.abilities.length ? `**Ability Scores.** ${e.data.abilities.map((a) => ABILITIES.find((x) => x.id === a)?.name).join(', ')}` : '',
            e.data.skills.length ? `**Skills.** ${e.data.skills.map((s) => SKILLS.find((x) => x.id === s)?.name).join(', ')}` : '',
            e.data.tools ? `**Tools.** ${e.data.tools}` : '',
            e.data.equipment ? `**Equipment.** ${e.data.equipment}` : '',
            e.data.desc,
          ].filter(Boolean).join('\n')}
        />
      );
    case 'feat':
      return <RichText text={(e.data.prerequisite ? `**Prerequisite.** ${e.data.prerequisite}\n` : '') + (e.data.desc || 'No description.')} />;
    case 'item':
      return <RichText text={e.data.desc || 'No description.'} />;
    case 'class':
      return (
        <RichText
          text={[
            e.data.primary && `**Primary Ability.** ${e.data.primary}`,
            e.data.saves.length ? `**Saving Throws.** ${e.data.saves.map((a) => ABILITIES.find((x) => x.id === a)?.name).join(', ')}` : '',
            e.data.armor && `**Armor.** ${e.data.armor}`,
            e.data.weapons && `**Weapons.** ${e.data.weapons}`,
            ...e.data.levels.flatMap((l) => l.features.map((f) => `**Level ${l.level}: ${f.name}.** ${f.desc.split('\n')[0]}`)),
          ]
            .filter(Boolean)
            .join('\n')}
        />
      );
  }
}
