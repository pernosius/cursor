import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, Plus, Search } from 'lucide-react';
import { CLASSES, classById, homebrewItems, homebrewSpells, loadItems, loadSpells, type SrdItem, type SrdSpell } from '../lib/srd';
import { useHomebrew } from '../store/homebrew';
import { RichText, cx } from './ui';

const ITEM_CATS = ['Weapon', 'Armor', 'Gear', 'Tool', 'Ammunition', 'Magic Item', 'Mount & Vehicle'];
export const levelName = (l: number) => (l === 0 ? 'Cantrip' : `Level ${l}`);

export function SpellMeta({ s }: { s: Pick<SrdSpell, 'time' | 'range' | 'components' | 'duration'> }) {
  return (
    <div className="grid-2 small" style={{ gap: 6, marginBottom: 10 }}>
      <div><span className="faint">Casting time</span> {s.time}</div>
      <div><span className="faint">Range</span> {s.range}</div>
      <div><span className="faint">Components</span> {s.components}</div>
      <div><span className="faint">Duration</span> {s.duration}</div>
    </div>
  );
}

export function ItemMeta({ i }: { i: SrdItem }) {
  const bits = [
    i.sub,
    i.rarity,
    i.attunement ? 'Requires attunement' : '',
    i.cost,
    i.weight ? `${i.weight} lb.` : '',
    i.weapon ? `${i.weapon.damage} ${i.weapon.type}${i.weapon.versatile ? ` (${i.weapon.versatile} two-handed)` : ''}` : '',
    i.weapon?.range ?? '',
    i.weapon?.properties.join(', ') ?? '',
    i.weapon?.mastery ? `Mastery: ${i.weapon.mastery}` : '',
    i.armor
      ? i.armor.kind === 'shield'
        ? `+${i.armor.base} AC`
        : `AC ${i.armor.base}${i.armor.dex ? (i.armor.maxDex != null ? ` + Dex (max ${i.armor.maxDex})` : ' + Dex') : ''}`
      : '',
    i.armor?.strMin ? `Str ${i.armor.strMin}` : '',
    i.armor?.stealthDis ? 'Stealth disadvantage' : '',
  ].filter(Boolean);
  return <div className="small muted" style={{ marginBottom: 8 }}>{bits.join(' · ')}</div>;
}

export function SpellBrowser({
  defaultClass,
  onPick,
  owned,
}: {
  defaultClass?: string;
  onPick?: (s: SrdSpell) => void;
  owned?: Set<string>;
}) {
  const [spells, setSpells] = useState<SrdSpell[] | null>(null);
  const [q, setQ] = useState('');
  const [cls, setCls] = useState(defaultClass ?? '');
  const [level, setLevel] = useState<number | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => void loadSpells().then(setSpells), []);
  const hbItems = useHomebrew((s) => s.items);

  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    const all = spells ? [...spells, ...homebrewSpells()].sort((a, b) => a.level - b.level || a.name.localeCompare(b.name)) : [];
    const listed = new Set(cls ? classById(cls)?.spellList ?? [] : []);
    return all.filter(
      (s) =>
        (!cls || s.classes.includes(cls) || listed.has(s.name)) &&
        (level == null || s.level === level) &&
        (!n || s.name.toLowerCase().includes(n) || s.school.toLowerCase().includes(n)),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spells, hbItems, q, cls, level]);

  return (
    <div className="col" style={{ gap: 12 }}>
      <div className="row">
        <label className="search">
          <Search />
          <input className="input" placeholder="Search spells" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <select className="select" style={{ width: 'auto' }} value={cls} onChange={(e) => setCls(e.target.value)} aria-label="Class">
          <option value="">All classes</option>
          {CLASSES.filter((c) => c.caster !== 'none').map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div className="chips scroll">
        <button className={cx('chip', level == null && 'on')} onClick={() => setLevel(null)}>All</button>
        {Array.from({ length: 10 }, (_, l) => (
          <button key={l} className={cx('chip', level === l && 'on')} onClick={() => setLevel(l)}>
            {l === 0 ? 'Cantrips' : l}
          </button>
        ))}
      </div>
      {!spells && <p className="muted small">Loading spells…</p>}
      <div>
        {list.slice(0, 200).map((s) => {
          const has = owned?.has(s.id);
          return (
            <div key={s.id} className="entry">
              <div className="entry-head" onClick={() => setOpen(open === s.id ? null : s.id)}>
                <div className="grow">
                  <div className="title">{s.name}</div>
                  <div className="faint tiny">
                    {levelName(s.level)} · {s.school}
                    {s.concentration ? ' · Concentration' : ''}
                    {s.ritual ? ' · Ritual' : ''}
                    {'source' in s ? ` · ${(s as { source: string }).source}` : ''}
                  </div>
                </div>
                {onPick && (
                  <button
                    className={cx('btn sm', has ? 'ghost' : 'soft')}
                    disabled={has}
                    onClick={(e) => {
                      e.stopPropagation();
                      onPick(s);
                    }}
                  >
                    {has ? <Check /> : <Plus />} {has ? 'Added' : 'Add'}
                  </button>
                )}
                <ChevronDown size={16} className="faint" style={{ transform: open === s.id ? 'rotate(180deg)' : undefined, transition: 'transform .2s' }} />
              </div>
              {open === s.id && (
                <div className="entry-body">
                  <SpellMeta s={s} />
                  <RichText text={s.desc} />
                  {s.higher && <RichText className="small" text={`**Using a Higher-Level Spell Slot.** ${s.higher}`} />}
                  <div className="faint tiny" style={{ marginTop: 8 }}>
                    {s.classes.map((c) => CLASSES.find((x) => x.id === c)?.name).join(', ')}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {spells && list.length === 0 && <p className="muted small">No spells match.</p>}
      </div>
    </div>
  );
}

export function ItemBrowser({ onPick, defaultCategory }: { onPick?: (i: SrdItem) => void; defaultCategory?: string }) {
  const [items, setItems] = useState<SrdItem[] | null>(null);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState(defaultCategory ?? '');
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => void loadItems().then(setItems), []);
  const hbItems = useHomebrew((s) => s.items);

  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    const all = items ? [...items, ...homebrewItems()].sort((a, b) => a.name.localeCompare(b.name)) : [];
    return all.filter(
      (i) => (!cat || i.category === cat) && (!n || i.name.toLowerCase().includes(n) || i.sub.toLowerCase().includes(n)),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, hbItems, q, cat]);

  return (
    <div className="col" style={{ gap: 12 }}>
      <label className="search">
        <Search />
        <input className="input" placeholder="Search equipment & magic items" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      <div className="chips scroll">
        <button className={cx('chip', !cat && 'on')} onClick={() => setCat('')}>All</button>
        {ITEM_CATS.map((c) => (
          <button key={c} className={cx('chip', cat === c && 'on')} onClick={() => setCat(c)}>{c}</button>
        ))}
      </div>
      {!items && <p className="muted small">Loading items…</p>}
      <div>
        {list.slice(0, 200).map((i) => (
          <div key={i.id} className="entry">
            <div className="entry-head" onClick={() => setOpen(open === i.id ? null : i.id)}>
              <div className="grow">
                <div className="title">{i.name}</div>
                <div className="faint tiny">
                  {[i.category, i.sub, i.rarity, (i as { source?: string }).source].filter(Boolean).join(' · ')}
                </div>
              </div>
              {onPick && (
                <button
                  className="btn sm soft"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPick(i);
                  }}
                >
                  <Plus /> Add
                </button>
              )}
              <ChevronDown size={16} className="faint" style={{ transform: open === i.id ? 'rotate(180deg)' : undefined, transition: 'transform .2s' }} />
            </div>
            {open === i.id && (
              <div className="entry-body">
                <ItemMeta i={i} />
                {i.desc && <RichText text={i.desc} />}
              </div>
            )}
          </div>
        ))}
        {items && list.length > 200 && <p className="faint small">Showing 200 of {list.length}. Refine your search.</p>}
        {items && list.length === 0 && <p className="muted small">No items match.</p>}
      </div>
    </div>
  );
}
