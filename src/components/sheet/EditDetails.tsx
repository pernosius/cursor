import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Archive, ArchiveRestore, Camera, Trash2, X } from 'lucide-react';
import type { Character } from '../../lib/types';
import type { Upd } from '../../pages/Sheet';
import { ALIGNMENTS, CLASS_COLORS, XP_TABLE, computeSlots, totalLevel } from '../../lib/rules';
import { BACKGROUNDS, CLASSES, SPECIES, classById } from '../../lib/srd';
import { refreshTrackers } from '../../lib/character';
import { useCharacters } from '../../store/characters';
import { Avatar, Confirm, Modal, NumberInput, TextInput, cx, resizeImage } from '../ui';

export default function EditDetails({
  open, onClose, c, upd, accent,
}: { open: boolean; onClose: () => void; c: Character; upd: Upd; accent: string }) {
  const navigate = useNavigate();
  const remove = useCharacters((s) => s.remove);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = (p: Partial<Character>) => upd((x) => ({ ...x, ...p }));
  const species = SPECIES.find((s) => s.name === c.species);
  const nextXp = XP_TABLE[Math.min(19, totalLevel(c))];

  const setClasses = (classes: Character['classes']) =>
    upd((x) => {
      const { slots, pact } = computeSlots(classes);
      return refreshTrackers({
        ...x,
        classes,
        spellSlots: { max: slots, used: x.spellSlots.used.map((u, i) => Math.min(u, slots[i])) },
        pactSlots: { ...pact, used: Math.min(x.pactSlots.used, pact.max) },
      });
    });

  return (
    <Modal open={open} onClose={onClose} title="Character details" accent={accent} wide>
      <div className="col" style={{ gap: 16 }}>
        <div className="row" style={{ gap: 16 }}>
          <label style={{ cursor: 'pointer', position: 'relative' }}>
            <Avatar name={c.name} src={c.portrait} size="lg" />
            <span className="btn icon sm" style={{ position: 'absolute', right: -6, bottom: -6, background: 'var(--solid)' }}>
              <Camera />
            </span>
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) set({ portrait: await resizeImage(f) });
              }}
            />
          </label>
          <div className="col grow">
            <label className="field">
              <span>Name</span>
              <TextInput value={c.name} onChange={(v) => set({ name: v || c.name })} />
            </label>
            {c.portrait && (
              <button className="btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={() => set({ portrait: undefined })}>
                Remove portrait
              </button>
            )}
          </div>
        </div>

        <div className="grid-2">
          <label className="field">
            <span>Species</span>
            <input className="input" list="species-list" value={c.species} onChange={(e) => set({ species: e.target.value })} />
            <datalist id="species-list">
              {SPECIES.map((s) => (
                <option key={s.id} value={s.name} />
              ))}
            </datalist>
          </label>
          <label className="field">
            <span>Lineage / subspecies</span>
            <input className="input" list="subspecies-list" value={c.subspecies ?? ''} onChange={(e) => set({ subspecies: e.target.value || undefined })} />
            <datalist id="subspecies-list">
              {species?.subspecies.map((s) => (
                <option key={s.id} value={s.name} />
              ))}
            </datalist>
          </label>
          <label className="field">
            <span>Background</span>
            <input className="input" list="bg-list" value={c.background} onChange={(e) => set({ background: e.target.value })} />
            <datalist id="bg-list">
              {BACKGROUNDS.map((b) => (
                <option key={b.id} value={b.name} />
              ))}
            </datalist>
          </label>
          <label className="field">
            <span>Alignment</span>
            <select className="select" value={c.alignment ?? ''} onChange={(e) => set({ alignment: e.target.value || undefined })}>
              <option value="">—</option>
              {ALIGNMENTS.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Campaign</span>
            <TextInput value={c.campaign ?? ''} onChange={(v) => set({ campaign: v.trim() || undefined })} />
          </label>
          <label className="field">
            <span>Player</span>
            <TextInput value={c.player ?? ''} onChange={(v) => set({ player: v.trim() || undefined })} />
          </label>
          <label className="field">
            <span>Size</span>
            <select className="select" value={c.size ?? 'Medium'} onChange={(e) => set({ size: e.target.value })}>
              {['Tiny', 'Small', 'Medium', 'Large'].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Experience {totalLevel(c) < 20 && <span className="faint">· next level at {nextXp.toLocaleString()}</span>}</span>
            <NumberInput value={c.xp} min={0} relative onChange={(v) => set({ xp: v })} />
          </label>
        </div>

        <div>
          <div className="upper" style={{ marginBottom: 8 }}>Classes</div>
          <div className="col" style={{ gap: 8 }}>
            {c.classes.map((cl, i) => (
              <div key={cl.id + i} className="row wrap card tight" style={{ boxShadow: 'none' }}>
                <span style={{ width: 10, height: 10, borderRadius: 5, background: CLASS_COLORS[cl.id] ?? accent }} />
                <b className="grow" style={{ minWidth: 80 }}>{cl.name}</b>
                <input
                  className="input"
                  style={{ width: 180 }}
                  list={`sub-${cl.id}`}
                  placeholder="Subclass"
                  value={cl.subclass ?? ''}
                  onChange={(e) => setClasses(c.classes.map((x, j) => (j === i ? { ...x, subclass: e.target.value || undefined } : x)))}
                />
                <datalist id={`sub-${cl.id}`}>
                  {classById(cl.id)?.subclasses.map((s) => (
                    <option key={s.id} value={s.name} />
                  ))}
                </datalist>
                <span className="small muted">Level</span>
                <NumberInput
                  className="center"
                  value={cl.level}
                  min={1}
                  max={20}
                  ariaLabel={`${cl.name} level`}
                  onChange={(v) => setClasses(c.classes.map((x, j) => (j === i ? { ...x, level: v } : x)))}
                />
                <button
                  className="btn icon sm ghost"
                  aria-label={`Remove ${cl.name}`}
                  onClick={() => setClasses(c.classes.filter((_, j) => j !== i))}
                >
                  <X />
                </button>
              </div>
            ))}
            <select
              className="select"
              value=""
              onChange={(e) => {
                const d = classById(e.target.value);
                if (d) setClasses([...c.classes, { id: d.id, name: d.name, level: 1, hitDie: d.hitDie }]);
              }}
            >
              <option value="">+ Add a class (no level-up steps)</option>
              {CLASSES.filter((x) => !c.classes.some((y) => y.id === x.id)).map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
            <p className="faint tiny">Editing levels here won't change HP or add features. Use Level up for that.</p>
          </div>
        </div>

        <div>
          <div className="upper" style={{ marginBottom: 8 }}>Accent color</div>
          <div className="row wrap" style={{ gap: 8 }}>
            <button className={cx('chip', !c.accent && 'on')} onClick={() => set({ accent: undefined })}>
              Class color
            </button>
            {Object.entries(CLASS_COLORS).map(([k, col]) => (
              <button
                key={k}
                title={k}
                aria-label={`${k} color`}
                onClick={() => set({ accent: col })}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 10,
                  background: col,
                  border: c.accent === col ? '2px solid var(--text)' : '2px solid transparent',
                  boxShadow: `0 4px 14px -4px ${col}`,
                }}
              />
            ))}
            <input
              type="color"
              aria-label="Custom color"
              value={c.accent ?? accent}
              onChange={(e) => set({ accent: e.target.value })}
              style={{ width: 34, height: 30, border: 0, background: 'none', padding: 0 }}
            />
          </div>
        </div>

        <hr className="divider" />
        <div className="row wrap">
          <button
            className="btn"
            onClick={() => {
              set({ archived: !c.archived });
              onClose();
            }}
          >
            {c.archived ? <ArchiveRestore /> : <Archive />} {c.archived ? 'Unarchive' : 'Archive'}
          </button>
          <span className="spacer" />
          <button className="btn danger" onClick={() => setConfirmDelete(true)}>
            <Trash2 /> Delete character
          </button>
        </div>
      </div>
      <Confirm
        open={confirmDelete}
        title={`Delete ${c.name}?`}
        body="This removes the character from all of your devices. Consider exporting a backup first."
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          remove(c.id);
          onClose();
          navigate('/');
        }}
      />
    </Modal>
  );
}
