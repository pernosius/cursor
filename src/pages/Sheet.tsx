import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Backpack, BedDouble, Copy, Download, Gauge, MoreHorizontal, NotebookPen, Pencil, Sparkles,
  Star, Swords, Target, TrendingUp,
} from 'lucide-react';
import { useCharacter, useCharacters } from '../store/characters';
import { useUi } from '../store/ui';
import {
  accentOf, armorClass, classLine, fmt, initiative, profBonus, speed, totalLevel,
} from '../lib/rules';
import { d20Expr } from '../lib/dice';
import { uid } from '../lib/id';
import type { Character } from '../lib/types';
import { Avatar, Modal, cx } from '../components/ui';
import { exportCharacters } from './Home';
import Overview from '../components/sheet/Overview';
import SkillsTab from '../components/sheet/SkillsTab';
import Combat from '../components/sheet/Combat';
import Spells from '../components/sheet/Spells';
import Inventory from '../components/sheet/Inventory';
import Features from '../components/sheet/Features';
import Notes from '../components/sheet/Notes';
import EditDetails from '../components/sheet/EditDetails';
import LevelUp from '../components/sheet/LevelUp';
import Rest from '../components/sheet/Rest';
import HpModal from '../components/sheet/HpModal';

export type Upd = (fn: (c: Character) => Character) => void;
export interface TabProps { c: Character; upd: Upd }

const TABS = [
  { id: 'overview', label: 'Overview', icon: Gauge, C: Overview },
  { id: 'skills', label: 'Skills & Saves', icon: Target, C: SkillsTab },
  { id: 'combat', label: 'Combat', icon: Swords, C: Combat },
  { id: 'spells', label: 'Spells', icon: Sparkles, C: Spells },
  { id: 'inventory', label: 'Inventory', icon: Backpack, C: Inventory },
  { id: 'features', label: 'Features', icon: Star, C: Features },
  { id: 'notes', label: 'Notes', icon: NotebookPen, C: Notes },
] as const;

export default function Sheet() {
  const { id, tab = 'overview' } = useParams();
  const navigate = useNavigate();
  const c = useCharacter(id);
  const update = useCharacters((s) => s.update);
  const add = useCharacters((s) => s.add);
  const roll = useUi((s) => s.roll);
  const [modal, setModal] = useState<null | 'edit' | 'level' | 'rest' | 'menu' | 'hp'>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);

  const index = Math.max(0, TABS.findIndex((t) => t.id === tab));
  const go = (i: number) => navigate(`/c/${id}/${TABS[i].id}`, { replace: true });

  useEffect(() => {
    tabsRef.current?.querySelector('.tab.on')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [index]);

  if (!c || c.deleted) {
    return (
      <div className="page">
        <button className="btn ghost" onClick={() => navigate('/')}>
          <ArrowLeft /> Back
        </button>
        <p className="muted" style={{ padding: 40, textAlign: 'center' }}>
          This character doesn't exist on this device (yet). If you just signed in, give sync a moment.
        </p>
      </div>
    );
  }

  const upd: Upd = (fn) => update(c.id, fn);
  const accent = accentOf(c);
  const ac = armorClass(c);
  const level = totalLevel(c);
  const Tab = TABS[index].C;

  return (
    <div
      className="page"
      style={{ '--accent': accent } as React.CSSProperties}
      onTouchStart={(e) => {
        const t = e.touches[0];
        const el = e.target as HTMLElement;
        // Don't hijack swipes on inputs or horizontally scrollable strips.
        touch.current = el.closest('input,textarea,select,.chips,.tabs,.modal') ? null : { x: t.clientX, y: t.clientY };
      }}
      onTouchEnd={(e) => {
        if (!touch.current) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - touch.current.x;
        const dy = t.clientY - touch.current.y;
        touch.current = null;
        if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.6) {
          if (dx < 0 && index < TABS.length - 1) go(index + 1);
          if (dx > 0 && index > 0) go(index - 1);
        }
      }}
    >
      <AccentAmbient color={accent} />
      <header className="topbar">
        <button className="btn icon ghost" onClick={() => navigate('/')} aria-label="Back to characters">
          <ArrowLeft />
        </button>
        <div className="spacer" />
        <button className="btn sm soft" onClick={() => setModal('level')}>
          <TrendingUp /> Level up
        </button>
        <button className="btn sm" onClick={() => setModal('rest')}>
          <BedDouble /> Rest
        </button>
        <button className="btn icon sm ghost" onClick={() => setModal('menu')} aria-label="More">
          <MoreHorizontal />
        </button>
      </header>

      <section className="sheet-head">
        <button style={{ border: 0, background: 'none', padding: 0 }} onClick={() => setModal('edit')} aria-label="Edit details">
          <Avatar name={c.name} src={c.portrait} size="lg" />
        </button>
        <div className="grow">
          <h1 className="display">{c.name}</h1>
          <div className="sub">
            <span className="lvl-badge" style={{ marginRight: 8 }}>
              Lv {level}
            </span>
            {[c.subspecies?.replace(/^.*?: /, '') ?? '', c.species].filter(Boolean).join(' ')} · {classLine(c) || 'No class'}
          </div>
          <div className="faint small" style={{ marginTop: 2 }}>
            {[c.background, c.alignment, c.campaign].filter(Boolean).join(' · ')}
          </div>
        </div>
        <button className="btn icon ghost" onClick={() => setModal('edit')} aria-label="Edit details">
          <Pencil />
        </button>
      </section>

      <section className="quick">
        <button className="qstat" onClick={() => setModal('hp')}>
          <b>
            {c.hp.current}
            {c.hp.temp > 0 && <small style={{ color: 'var(--temp)', fontSize: 13 }}> +{c.hp.temp}</small>}
          </b>
          <span>HP / {c.hp.max}</span>
        </button>
        <button className="qstat" onClick={() => go(2)} title={ac.parts.join(' · ')}>
          <b>{ac.total}</b>
          <span>AC</span>
        </button>
        <button className="qstat" onClick={() => roll(d20Expr(initiative(c)), `${c.name} · Initiative`)}>
          <b>{fmt(initiative(c))}</b>
          <span>Init</span>
        </button>
        <div className="qstat">
          <b>{speed(c)}</b>
          <span>Speed</span>
        </div>
        <div className="qstat">
          <b>{fmt(profBonus(level))}</b>
          <span>Prof</span>
        </div>
      </section>

      <nav className="tabs" ref={tabsRef}>
        {TABS.map((t, i) => (
          <button key={t.id} className={cx('tab', i === index && 'on')} onClick={() => go(i)}>
            <t.icon /> {t.label}
          </button>
        ))}
      </nav>

      <div className="tab-body" key={tab}>
        <Tab c={c} upd={upd} />
      </div>

      <EditDetails open={modal === 'edit'} onClose={() => setModal(null)} c={c} upd={upd} accent={accent} />
      <LevelUp open={modal === 'level'} onClose={() => setModal(null)} c={c} upd={upd} accent={accent} />
      <Rest open={modal === 'rest'} onClose={() => setModal(null)} c={c} upd={upd} accent={accent} />
      <HpModal open={modal === 'hp'} onClose={() => setModal(null)} c={c} upd={upd} accent={accent} />
      <Modal open={modal === 'menu'} onClose={() => setModal(null)} title={c.name} accent={accent}>
        <div className="col">
          <button className="btn block" onClick={() => setModal('edit')}>
            <Pencil /> Edit details
          </button>
          <button
            className="btn block"
            onClick={() => {
              const copy = { ...structuredClone(c), id: uid(), name: `${c.name} (copy)`, createdAt: Date.now(), updatedAt: Date.now() };
              add(copy);
              setModal(null);
              navigate(`/c/${copy.id}`);
            }}
          >
            <Copy /> Duplicate
          </button>
          <button
            className="btn block"
            onClick={() => exportCharacters([c], `${c.name.replace(/[^\w-]+/g, '_')}.tome.json`)}
          >
            <Download /> Export as file
          </button>
        </div>
      </Modal>
    </div>
  );
}

/** Tints the page's ambient glow with the character's accent. */
function AccentAmbient({ color }: { color: string }) {
  useEffect(() => {
    const el = document.querySelector<HTMLElement>('.ambient');
    el?.style.setProperty('--accent', color);
    return () => {
      el?.style.removeProperty('--accent');
    };
  }, [color]);
  return null;
}
