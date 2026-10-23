import { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import type { Ability, SkillId } from '../lib/types';
import {
  HOMEBREW_KINDS, type HomebrewEntry, type HomebrewItem, type HomebrewKind, type Trait,
} from '../lib/homebrew';
import { ABILITIES, SKILLS } from '../lib/rules';
import { CLASSES } from '../lib/srd';
import { Modal, Switch, cx } from './ui';
import { levelName } from './CompendiumList';

const SCHOOLS = ['Abjuration', 'Conjuration', 'Divination', 'Enchantment', 'Evocation', 'Illusion', 'Necromancy', 'Transmutation'];
const FEAT_TYPES = [
  ['origin', 'Origin'],
  ['general', 'General'],
  ['fighting-style', 'Fighting Style'],
  ['epic-boon', 'Epic Boon'],
] as const;
const ITEM_CATS = ['Gear', 'Weapon', 'Armor', 'Tool', 'Ammunition', 'Magic Item', 'Mount & Vehicle'];

/** Edits one homebrew entry. `entry` is a draft; nothing is saved until onSave. */
export default function HomebrewEditor({
  entry,
  isNew,
  onSave,
  onDelete,
  onClose,
}: {
  entry: HomebrewEntry | null;
  isNew: boolean;
  onSave: (e: HomebrewEntry) => void;
  onDelete?: (e: HomebrewEntry) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<HomebrewEntry | null>(entry);
  const [lastId, setLastId] = useState(entry?.id);
  if (entry?.id !== lastId) {
    setLastId(entry?.id);
    setDraft(entry);
  }
  if (!draft) return null;
  const kindLabel = HOMEBREW_KINDS.find((k) => k.id === draft.kind)!.label;
  // Typed loosely here; each form below only touches fields of its own kind.
  const d = draft.data as unknown as Record<string, unknown>;
  const setData = (p: Record<string, unknown>) => setDraft({ ...draft, data: { ...draft.data, ...p } } as HomebrewEntry);

  return (
    <Modal
      open={!!entry}
      onClose={onClose}
      wide
      title={`${isNew ? 'New' : 'Edit'} ${kindLabel.toLowerCase()}`}
      footer={
        <>
          {!isNew && onDelete && (
            <button className="btn danger" style={{ flex: 'none' }} aria-label="Delete" onClick={() => onDelete(draft)}>
              <Trash2 />
            </button>
          )}
          <button className="btn primary" disabled={!draft.name.trim()} onClick={() => onSave(draft)}>
            Save to library
          </button>
        </>
      }
    >
      <div className="col" style={{ gap: 12 }}>
        <div className="grid-2">
          <label className="field">
            <span>Name</span>
            <input className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </label>
          <label className="field">
            <span>Source</span>
            <input
              className="input"
              value={draft.source}
              placeholder="e.g. Player's Handbook, our table"
              onChange={(e) => setDraft({ ...draft, source: e.target.value })}
            />
          </label>
        </div>

        {draft.kind === 'spell' && (
          <>
            <div className="grid-2">
              <label className="field">
                <span>Level</span>
                <select className="select" value={d.level as number} onChange={(e) => setData({ level: Number(e.target.value) })}>
                  {Array.from({ length: 10 }, (_, l) => (
                    <option key={l} value={l}>{levelName(l)}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>School</span>
                <select className="select" value={d.school as string} onChange={(e) => setData({ school: e.target.value })}>
                  <option value="">—</option>
                  {SCHOOLS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </label>
              <Text label="Casting time" v={d.time} on={(time) => setData({ time })} />
              <Text label="Range" v={d.range} on={(range) => setData({ range })} />
              <Text label="Components" v={d.components} on={(components) => setData({ components })} />
              <Text label="Duration" v={d.duration} on={(duration) => setData({ duration })} />
            </div>
            <div className="list">
              <div className="li"><span className="grow">Concentration</span><Switch on={!!d.concentration} onChange={(concentration) => setData({ concentration })} /></div>
              <div className="li"><span className="grow">Ritual</span><Switch on={!!d.ritual} onChange={(ritual) => setData({ ritual })} /></div>
            </div>
            <div className="field">
              <span>Spell lists</span>
              <div className="chips">
                {CLASSES.filter((c) => c.caster !== 'none').map((c) => {
                  const on = (d.classes as string[]).includes(c.id);
                  return (
                    <button
                      key={c.id}
                      className={cx('chip', on && 'on')}
                      onClick={() => setData({ classes: on ? (d.classes as string[]).filter((x) => x !== c.id) : [...(d.classes as string[]), c.id] })}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <Area label="Description" v={d.desc} on={(desc) => setData({ desc })} rows={8} />
            <Area label="Using a higher-level spell slot / cantrip upgrade" v={d.higher} on={(higher) => setData({ higher })} rows={3} />
          </>
        )}

        {draft.kind === 'species' && (
          <>
            <div className="grid-2">
              <label className="field">
                <span>Size</span>
                <select className="select" value={d.size as string} onChange={(e) => setData({ size: e.target.value })}>
                  {['Small', 'Medium', 'Medium or Small', 'Large'].map((s) => <option key={s}>{s}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Speed (ft.)</span>
                <input className="input" inputMode="numeric" value={d.speed as number} onChange={(e) => setData({ speed: Number(e.target.value.replace(/\D/g, '')) || 0 })} />
              </label>
            </div>
            <TraitList label="Traits" traits={d.traits as Trait[]} onChange={(traits) => setData({ traits })} />
          </>
        )}

        {draft.kind === 'subclass' && (
          <>
            <label className="field">
              <span>Class</span>
              <select className="select" value={d.classId as string} onChange={(e) => setData({ classId: e.target.value })}>
                <option value="">Choose…</option>
                {CLASSES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <Area label="Description" v={d.desc} on={(desc) => setData({ desc })} rows={3} />
            <TraitList
              label="Features"
              withLevel
              traits={d.features as (Trait & { level: number })[]}
              onChange={(features) => setData({ features })}
            />
          </>
        )}

        {draft.kind === 'background' && (
          <>
            <div className="field">
              <span>Ability scores (pick three)</span>
              <div className="chips">
                {ABILITIES.map((a) => {
                  const list = d.abilities as Ability[];
                  const on = list.includes(a.id);
                  return (
                    <button key={a.id} className={cx('chip', on && 'on')} onClick={() => setData({ abilities: on ? list.filter((x) => x !== a.id) : [...list, a.id].slice(-3) })}>
                      {a.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="field">
              <span>Skill proficiencies</span>
              <div className="chips">
                {SKILLS.map((s) => {
                  const list = d.skills as SkillId[];
                  const on = list.includes(s.id);
                  return (
                    <button key={s.id} className={cx('chip', on && 'on')} onClick={() => setData({ skills: on ? list.filter((x) => x !== s.id) : [...list, s.id] })}>
                      {s.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid-2">
              <Text label="Feat" v={d.feat} on={(feat) => setData({ feat })} placeholder="e.g. Magic Initiate (Cleric)" />
              <Text label="Tool proficiency" v={d.tools} on={(tools) => setData({ tools })} />
            </div>
            <Area label="Equipment" v={d.equipment} on={(equipment) => setData({ equipment })} rows={2} />
            <Area label="Description" v={d.desc} on={(desc) => setData({ desc })} rows={3} />
          </>
        )}

        {draft.kind === 'feat' && (
          <>
            <div className="grid-2">
              <label className="field">
                <span>Category</span>
                <select className="select" value={d.type as string} onChange={(e) => setData({ type: e.target.value })}>
                  {FEAT_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </label>
              <Text label="Prerequisite" v={d.prerequisite} on={(prerequisite) => setData({ prerequisite })} placeholder="e.g. Level 4+" />
            </div>
            <Area label="Description" v={d.desc} on={(desc) => setData({ desc })} rows={8} />
          </>
        )}

        {draft.kind === 'item' && <ItemFields d={d as unknown as HomebrewItem} setData={setData} />}
      </div>
    </Modal>
  );
}

function ItemFields({ d, setData }: { d: HomebrewItem; setData: (p: Record<string, unknown>) => void }) {
  return (
    <>
      <div className="grid-2">
        <label className="field">
          <span>Category</span>
          <select className="select" value={d.category} onChange={(e) => setData({ category: e.target.value })}>
            {ITEM_CATS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Rarity</span>
          <select className="select" value={d.rarity} onChange={(e) => setData({ rarity: e.target.value })}>
            {['', 'Common', 'Uncommon', 'Rare', 'Very Rare', 'Legendary', 'Artifact'].map((r) => <option key={r} value={r}>{r || '—'}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Weight (lb.)</span>
          <input className="input" inputMode="decimal" value={d.weight} onChange={(e) => setData({ weight: Number(e.target.value.replace(/[^\d.]/g, '')) || 0 })} />
        </label>
        <Text label="Cost" v={d.cost} on={(cost) => setData({ cost })} placeholder="e.g. 50 GP" />
      </div>
      <div className="list">
        <div className="li"><span className="grow">Requires attunement</span><Switch on={d.attunement} onChange={(attunement) => setData({ attunement })} /></div>
        <div className="li">
          <span className="grow">It's a weapon</span>
          <Switch
            on={!!d.weapon}
            onChange={(v) => setData({ weapon: v ? { damage: '1d6', type: 'Slashing', properties: [], mastery: '', range: '', ranged: false, finesse: false } : undefined })}
          />
        </div>
        <div className="li">
          <span className="grow">It's armor or a shield</span>
          <Switch on={!!d.armor} onChange={(v) => setData({ armor: v ? { kind: 'light', base: 11, dex: true, maxDex: null } : undefined })} />
        </div>
      </div>
      {d.weapon && (
        <div className="grid-2">
          <Text label="Damage dice" v={d.weapon.damage} on={(damage) => setData({ weapon: { ...d.weapon!, damage } })} />
          <Text label="Damage type" v={d.weapon.type} on={(type) => setData({ weapon: { ...d.weapon!, type } })} />
          <Text
            label="Properties (comma separated)"
            v={d.weapon.properties.join(', ')}
            on={(p) => {
              const properties = p.split(/,\s*/).filter(Boolean);
              setData({ weapon: { ...d.weapon!, properties, finesse: properties.some((x) => /finesse/i.test(x)) } });
            }}
          />
          <Text label="Mastery" v={d.weapon.mastery} on={(mastery) => setData({ weapon: { ...d.weapon!, mastery } })} />
          <Text label="Range" v={d.weapon.range} on={(range) => setData({ weapon: { ...d.weapon!, range } })} placeholder="e.g. 80/320 ft." />
          <div className="li" style={{ alignSelf: 'end' }}>
            <span className="grow">Ranged weapon</span>
            <Switch on={d.weapon.ranged} onChange={(ranged) => setData({ weapon: { ...d.weapon!, ranged } })} />
          </div>
        </div>
      )}
      {d.armor && (
        <div className="grid-2">
          <label className="field">
            <span>Type</span>
            <select className="select" value={d.armor.kind} onChange={(e) => setData({ armor: { ...d.armor!, kind: e.target.value } })}>
              {['light', 'medium', 'heavy', 'shield'].map((k) => <option key={k} value={k}>{k[0].toUpperCase() + k.slice(1)}</option>)}
            </select>
          </label>
          <label className="field">
            <span>{d.armor.kind === 'shield' ? 'AC bonus' : 'Base AC'}</span>
            <input className="input" inputMode="numeric" value={d.armor.base} onChange={(e) => setData({ armor: { ...d.armor!, base: Number(e.target.value.replace(/\D/g, '')) || 0 } })} />
          </label>
        </div>
      )}
      <Area label="Description" v={d.desc} on={(desc) => setData({ desc })} rows={6} />
    </>
  );
}

function Text({ label, v, on, placeholder }: { label: string; v: unknown; on: (s: string) => void; placeholder?: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input className="input" value={(v as string) ?? ''} placeholder={placeholder} onChange={(e) => on(e.target.value)} />
    </label>
  );
}

function Area({ label, v, on, rows }: { label: string; v: unknown; on: (s: string) => void; rows: number }) {
  return (
    <label className="field">
      <span>{label}</span>
      <textarea className="textarea" rows={rows} value={(v as string) ?? ''} onChange={(e) => on(e.target.value)} />
    </label>
  );
}

function TraitList<T extends Trait & { level?: number }>({
  label,
  traits,
  onChange,
  withLevel,
}: {
  label: string;
  traits: T[];
  onChange: (t: T[]) => void;
  withLevel?: boolean;
}) {
  const set = (i: number, p: Partial<T>) => onChange(traits.map((t, j) => (j === i ? { ...t, ...p } : t)));
  return (
    <div className="field">
      <span>{label}</span>
      <div className="col" style={{ gap: 8 }}>
        {traits.map((t, i) => (
          <div key={i} className="entry" style={{ padding: 10 }}>
            <div className="row">
              {withLevel && (
                <input
                  className="input center"
                  style={{ width: 64 }}
                  aria-label="Level"
                  inputMode="numeric"
                  value={t.level ?? 3}
                  onChange={(e) => set(i, { level: Number(e.target.value.replace(/\D/g, '')) || 1 } as Partial<T>)}
                />
              )}
              <input className="input grow" placeholder="Name" value={t.name} onChange={(e) => set(i, { name: e.target.value } as Partial<T>)} />
              <button className="btn icon sm ghost" aria-label="Remove" onClick={() => onChange(traits.filter((_, j) => j !== i))}>
                <X />
              </button>
            </div>
            <textarea className="textarea" rows={3} style={{ marginTop: 8 }} value={t.desc} onChange={(e) => set(i, { desc: e.target.value } as Partial<T>)} />
          </div>
        ))}
        <button
          className="btn sm soft"
          style={{ alignSelf: 'flex-start' }}
          onClick={() => onChange([...traits, { name: '', desc: '', ...(withLevel ? { level: 3 } : {}) } as T])}
        >
          <Plus /> Add {withLevel ? 'feature' : 'trait'}
        </button>
      </div>
    </div>
  );
}

export const kindLabel = (k: HomebrewKind) => HOMEBREW_KINDS.find((x) => x.id === k)!.label;
