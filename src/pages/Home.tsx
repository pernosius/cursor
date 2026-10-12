import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Archive, BookOpen, Download, Plus, Search, Settings as Gear, Upload } from 'lucide-react';
import { useCharacters } from '../store/characters';
import { useUi } from '../store/ui';
import { accentOf, armorClass, classLine, totalLevel } from '../lib/rules';
import { normalize } from '../lib/character';
import { uid } from '../lib/id';
import type { Character } from '../lib/types';
import { Avatar, HpBar, cx } from '../components/ui';
import SyncPill from '../components/SyncPill';

type Sort = 'recent' | 'name' | 'level';

export const exportCharacters = (list: Character[], filename: string) => {
  const blob = new Blob([JSON.stringify({ app: 'tome', version: 1, characters: list }, null, 2)], {
    type: 'application/json',
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};

export default function Home() {
  const all = useCharacters((s) => s.characters);
  const add = useCharacters((s) => s.add);
  const notify = useUi((s) => s.notify);
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('recent');
  const [campaign, setCampaign] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const live = useMemo(() => Object.values(all).filter((c) => !c.deleted), [all]);
  const campaigns = useMemo(
    () => [...new Set(live.map((c) => c.campaign).filter(Boolean) as string[])].sort(),
    [live],
  );
  const archivedCount = live.filter((c) => c.archived).length;

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return live
      .filter((c) => !!c.archived === showArchived)
      .filter((c) => !campaign || c.campaign === campaign)
      .filter(
        (c) =>
          !needle ||
          [c.name, c.species, c.background, c.campaign, classLine(c)].some((s) => s?.toLowerCase().includes(needle)),
      )
      .sort((a, b) =>
        sort === 'name'
          ? a.name.localeCompare(b.name)
          : sort === 'level'
            ? totalLevel(b) - totalLevel(a)
            : b.updatedAt - a.updatedAt,
      );
  }, [live, q, sort, campaign, showArchived]);

  const onImport = async (file: File) => {
    try {
      const json = JSON.parse(await file.text());
      const rows: Partial<Character>[] = Array.isArray(json) ? json : (json.characters ?? [json]);
      let n = 0;
      for (const r of rows) {
        if (!r || typeof r !== 'object' || !r.name) continue;
        // Imports become new characters so they never clobber existing ones.
        add(normalize({ ...r, id: uid(), createdAt: Date.now(), updatedAt: Date.now(), deleted: false }));
        n++;
      }
      notify(n ? `Imported ${n} character${n === 1 ? '' : 's'}` : 'No characters found in that file');
    } catch {
      notify('That file could not be read');
    }
  };

  return (
    <div className="page">
      <header className="topbar">
        <div className="brand display">
          <img src="icon.svg" alt="" />
          Tome
        </div>
        <div className="spacer" />
        <SyncPill />
        <Link to="/compendium" className="btn icon ghost" aria-label="Compendium" title="Compendium">
          <BookOpen />
        </Link>
        <Link to="/settings" className="btn icon ghost" aria-label="Settings" title="Settings">
          <Gear />
        </Link>
      </header>

      <section className="home-hero">
        <div className="grow">
          <div className="upper" style={{ marginBottom: 6 }}>
            {live.length} character{live.length === 1 ? '' : 's'}
          </div>
          <h1 className="display">Your Party</h1>
        </div>
        <button className="btn primary" onClick={() => navigate('/new')}>
          <Plus /> New Character
        </button>
      </section>

      {live.length > 0 && (
        <div className="col" style={{ marginBottom: 16, gap: 12 }}>
          <div className="row">
            <label className="search">
              <Search />
              <input
                className="input"
                placeholder="Search by name, class, species…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </label>
            <select
              className="select"
              style={{ width: 'auto' }}
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              aria-label="Sort"
            >
              <option value="recent">Recent</option>
              <option value="name">Name</option>
              <option value="level">Level</option>
            </select>
          </div>
          {(campaigns.length > 0 || archivedCount > 0) && (
            <div className="chips scroll">
              <button className={cx('chip', !campaign && 'on')} onClick={() => setCampaign(null)}>
                All campaigns
              </button>
              {campaigns.map((c) => (
                <button key={c} className={cx('chip', campaign === c && 'on')} onClick={() => setCampaign(c)}>
                  {c}
                </button>
              ))}
              {archivedCount > 0 && (
                <button className={cx('chip', showArchived && 'on')} onClick={() => setShowArchived((v) => !v)}>
                  <Archive /> Archived ({archivedCount})
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {live.length === 0 ? (
        <div className="empty">
          <h2 className="display">Every legend starts somewhere</h2>
          <p className="muted" style={{ maxWidth: 420, margin: '0 auto 20px' }}>
            Create your first character. The 2024 rules are built in, so the math is done for you.
          </p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <button className="btn primary" onClick={() => navigate('/new')}>
              <Plus /> Create a character
            </button>
            <button className="btn" onClick={() => fileRef.current?.click()}>
              <Upload /> Import
            </button>
          </div>
        </div>
      ) : list.length === 0 ? (
        <p className="muted" style={{ textAlign: 'center', padding: 40 }}>
          No characters match.
        </p>
      ) : (
        <div className="char-grid">
          {list.map((c, i) => (
            <CharacterCard key={c.id} c={c} index={i} />
          ))}
        </div>
      )}

      {live.length > 0 && (
        <div className="row" style={{ justifyContent: 'center', marginTop: 28 }}>
          <button className="btn ghost sm" onClick={() => fileRef.current?.click()}>
            <Upload /> Import
          </button>
          <button
            className="btn ghost sm"
            onClick={() => exportCharacters(live, `tome-backup-${new Date().toISOString().slice(0, 10)}.json`)}
          >
            <Download /> Back up all
          </button>
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onImport(f);
          e.target.value = '';
        }}
      />
    </div>
  );
}

function CharacterCard({ c, index }: { c: Character; index: number }) {
  const accent = accentOf(c);
  const ac = armorClass(c).total;
  return (
    <Link
      to={`/c/${c.id}`}
      className="char-card"
      style={{ '--accent': accent, animationDelay: `${Math.min(index, 10) * 40}ms` } as React.CSSProperties}
    >
      <div className="row" style={{ gap: 14, alignItems: 'flex-start' }}>
        <Avatar name={c.name} src={c.portrait} />
        <div className="grow">
          <div className="row" style={{ gap: 8 }}>
            <div className="name display ellipsis grow">{c.name}</div>
            <span className="lvl-badge">{totalLevel(c)}</span>
          </div>
          <div className="meta ellipsis">
            {[c.species, classLine(c) || 'No class'].filter(Boolean).join(' · ')}
          </div>
          {c.campaign && <div className="faint tiny ellipsis" style={{ marginTop: 2 }}>{c.campaign}</div>}
        </div>
      </div>
      <div className="stats">
        <div className="mini-stat" style={{ flex: 2 }}>
          <div className="row" style={{ gap: 6, alignItems: 'baseline' }}>
            <b>{c.hp.current}</b>
            <span>/ {c.hp.max} HP</span>
            {c.hp.temp > 0 && <span style={{ color: '#7cc4ff' }}>+{c.hp.temp}</span>}
          </div>
          <div style={{ marginTop: 6 }}>
            <HpBar current={c.hp.current} max={c.hp.max} temp={c.hp.temp} />
          </div>
        </div>
        <div className="mini-stat">
          <b>{ac}</b>
          <span>AC</span>
        </div>
      </div>
    </Link>
  );
}
