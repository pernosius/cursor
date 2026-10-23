import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ItemBrowser, SpellBrowser } from '../components/CompendiumList';
import { CONDITIONS, allFeats } from '../lib/srd';
import { useHomebrew } from '../store/homebrew';
import { RichText, cx } from '../components/ui';

type Tab = 'spells' | 'items' | 'feats' | 'conditions';

export default function Compendium() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('spells');
  const [open, setOpen] = useState<string | null>(null);
  useHomebrew((s) => s.items);
  return (
    <div className="page" style={{ maxWidth: 860 }}>
      <header className="topbar">
        <button className="btn icon ghost" onClick={() => navigate('/')} aria-label="Back">
          <ArrowLeft />
        </button>
        <h2 className="display grow" style={{ fontSize: 26 }}>Compendium</h2>
        <button className="btn sm" onClick={() => navigate('/homebrew')}>
          Your homebrew
        </button>
      </header>
      <div className="seg" style={{ marginBottom: 16 }}>
        {(['spells', 'items', 'feats', 'conditions'] as Tab[]).map((t) => (
          <button key={t} className={cx(tab === t && 'on')} onClick={() => setTab(t)}>
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <div className="tab-body" key={tab}>
        {tab === 'spells' && <SpellBrowser />}
        {tab === 'items' && <ItemBrowser />}
        {(tab === 'feats' || tab === 'conditions') &&
          (tab === 'feats' ? allFeats() : CONDITIONS).map((f) => (
            <div key={f.id} className="entry">
              <div className="entry-head" onClick={() => setOpen(open === f.id ? null : f.id)}>
                <div className="grow">
                  <div className="title">{f.name}</div>
                  {'type' in f && <div className="faint tiny">{String(f.type).replace(/-/g, ' ')} feat</div>}
                </div>
              </div>
              {open === f.id && (
                <div className="entry-body">
                  <RichText text={f.desc} />
                </div>
              )}
            </div>
          ))}
      </div>
      <p className="faint tiny" style={{ marginTop: 24 }}>
        Rules content from the System Reference Document 5.2 by Wizards of the Coast LLC, licensed under CC BY 4.0.
      </p>
    </div>
  );
}
