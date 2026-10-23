import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Cloud, KeyRound, LogOut, Mail, Monitor, Moon, RefreshCw, Sun } from 'lucide-react';
import { configure, sendSignInEmail, signInWithPassword, signOut, signUpWithPassword, syncNow, useSync } from '../sync/engine';
import { getConfig, isBuiltInConfig } from '../sync/client';
import { useUi, type Theme } from '../store/ui';
import { useCharacters } from '../store/characters';
import { useHomebrew } from '../store/homebrew';
import { SRD_ATTRIBUTION } from '../lib/srd';
import { cx } from '../components/ui';
import { verifyCode } from '../sync/engine';
import SyncPill from '../components/SyncPill';

export default function Settings() {
  const navigate = useNavigate();
  const { theme, setTheme } = useUi();
  return (
    <div className="page" style={{ maxWidth: 760 }}>
      <header className="topbar">
        <button className="btn icon ghost" onClick={() => navigate('/')} aria-label="Back">
          <ArrowLeft />
        </button>
        <h2 className="display grow" style={{ fontSize: 26 }}>Settings</h2>
        <SyncPill />
      </header>
      <div className="stack">
        <SyncCard />
        <div className="card">
          <div className="card-title">
            <h3>Appearance</h3>
          </div>
          <div className="seg">
            {([
              ['dark', 'Dark', Moon],
              ['light', 'Light', Sun],
              ['system', 'System', Monitor],
            ] as [Theme, string, typeof Moon][]).map(([t, label, Icon]) => (
              <button key={t} className={cx(theme === t && 'on')} onClick={() => setTheme(t)}>
                <Icon size={14} style={{ verticalAlign: -2, marginRight: 6 }} />
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-title">
            <h3>About</h3>
          </div>
          <p className="small muted" style={{ marginBottom: 10 }}>
            Tome keeps your characters on this device first, so it works offline, and syncs them to your own Supabase project
            when you're signed in. Add it to your home screen to use it like an app.
          </p>
          <p className="tiny faint" style={{ overflowWrap: 'anywhere' }}>{SRD_ATTRIBUTION}</p>
        </div>
      </div>
    </div>
  );
}

function SyncCard() {
  const { status, user, lastSyncedAt, error } = useSync();
  const dirty = useCharacters((s) => s.dirty.size) + useHomebrew((s) => s.dirty.size);
  const cfg = getConfig();
  const [editingCfg, setEditingCfg] = useState(false);

  return (
    <div className="card">
      <div className="card-title">
        <Cloud size={16} className="faint" />
        <h3>Cloud sync</h3>
      </div>
      {!cfg || editingCfg ? (
        <ConfigForm onDone={() => setEditingCfg(false)} initial={cfg} />
      ) : !user ? (
        <SignIn onEditConfig={() => setEditingCfg(true)} />
      ) : (
        <div className="col" style={{ gap: 12 }}>
          <div className="list">
            <div className="li">
              <span className="grow muted">Signed in as</span>
              <b className="ellipsis">{user.email}</b>
            </div>
            <div className="li">
              <span className="grow muted">Status</span>
              <span className="small">
                {status === 'synced' && lastSyncedAt ? `Synced ${new Date(lastSyncedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : status}
                {dirty > 0 && status !== 'synced' ? ` · ${dirty} pending` : ''}
              </span>
            </div>
          </div>
          {error && <p className="small" style={{ color: 'var(--danger)' }}>{error}</p>}
          <div className="row wrap">
            <button className="btn soft" onClick={() => void syncNow()} disabled={status === 'syncing'}>
              <RefreshCw /> Sync now
            </button>
            <span className="spacer" />
            <button className="btn ghost" onClick={() => void signOut()}>
              <LogOut /> Sign out
            </button>
          </div>
          <p className="faint tiny">
            Sign in with the same email on your phone, tablet and computer to see the same characters everywhere. Signing out
            keeps a copy on this device.
          </p>
        </div>
      )}
    </div>
  );
}

function SignIn({ onEditConfig }: { onEditConfig: () => void }) {
  const [method, setMethod] = useState<'password' | 'email'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setErr(null);
    setInfo(null);
    try {
      await fn();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const validEmail = email.includes('@');

  return (
    <div className="col" style={{ gap: 12 }}>
      <div className="seg" style={{ alignSelf: 'flex-start' }}>
        <button className={cx(method === 'password' && 'on')} onClick={() => setMethod('password')}>
          Password
        </button>
        <button className={cx(method === 'email' && 'on')} onClick={() => setMethod('email')}>
          Email link
        </button>
      </div>

      {method === 'password' ? (
        <form
          className="col"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => signInWithPassword(email.trim(), password));
          }}
        >
          <p className="small muted">
            Use the same email and password on every device. New here? Fill both in and choose <b>Create account</b>.
          </p>
          <input className="input" type="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          <input
            className="input"
            type="password"
            required
            minLength={6}
            placeholder="Password (6+ characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          <div className="row wrap">
            <button className="btn primary" disabled={busy || !validEmail || password.length < 6}>
              <KeyRound /> Sign in
            </button>
            <button
              type="button"
              className="btn"
              disabled={busy || !validEmail || password.length < 6}
              onClick={() =>
                void run(async () => {
                  const ready = await signUpWithPassword(email.trim(), password);
                  if (!ready)
                    setInfo('Account created. Open the confirmation email, tap the link (any device or browser is fine), then come back and press Sign in.');
                })
              }
            >
              Create account
            </button>
          </div>
        </form>
      ) : !sent ? (
        <>
          <p className="small muted">We'll email you a sign-in link. Open it on this device, in this browser.</p>
          <form
            className="row"
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                await sendSignInEmail(email.trim());
                setSent(true);
              });
            }}
          >
            <input className="input grow" type="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            <button className="btn primary" disabled={busy || !validEmail}>
              <Mail /> Send
            </button>
          </form>
        </>
      ) : (
        <>
          <p className="small muted">
            Check <b style={{ color: 'var(--text)' }}>{email}</b> and tap the link. If the email contains a code instead, type it here.
          </p>
          <form
            className="row"
            onSubmit={(e) => {
              e.preventDefault();
              void run(() => verifyCode(email.trim(), code.trim()));
            }}
          >
            <input
              className="input grow num"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="Code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 10))}
              style={{ letterSpacing: '0.3em', fontSize: 18, textAlign: 'center' }}
            />
            <button className="btn primary" disabled={busy || code.length < 6}>
              <KeyRound /> Verify
            </button>
          </form>
          <button className="btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={() => setSent(false)}>
            Use a different email
          </button>
        </>
      )}
      {info && <p className="small" style={{ color: 'var(--success)' }}>{info}</p>}
      {err && <p className="small" style={{ color: 'var(--danger)' }}>{err}</p>}
      {!isBuiltInConfig() && (
        <button className="btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={onEditConfig}>
          Change Supabase project
        </button>
      )}
    </div>
  );
}

function ConfigForm({ onDone, initial }: { onDone: () => void; initial: { url: string; anonKey: string } | null }) {
  const [url, setUrl] = useState(initial?.url ?? '');
  const [key, setKey] = useState(initial?.anonKey ?? '');
  const valid = /^https:\/\/.+/.test(url.trim()) && key.trim().length > 20;
  return (
    <div className="col" style={{ gap: 14 }}>
      <p className="small muted">
        Sync uses your own free Supabase project, so your characters stay yours. It's a one-time, five-minute setup:
      </p>
      <ol className="steps-list small">
        <li>Create a free project at <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer">supabase.com</a>.</li>
        <li>
          Open <b>SQL Editor</b>, paste the contents of <code>supabase/schema.sql</code> from this app's repository, and press <b>Run</b>.
        </li>
        <li>
          In <b>Authentication → URL Configuration</b>, add this page's address (<code>{window.location.origin + window.location.pathname}</code>) to <b>Redirect URLs</b>.
        </li>
        <li>
          Copy the <b>Project URL</b> and the <b>anon / publishable key</b> from <b>Project Settings → API</b> and paste them below.
        </li>
      </ol>
      <label className="field">
        <span>Project URL</span>
        <input className="input" placeholder="https://abcd1234.supabase.co" value={url} onChange={(e) => setUrl(e.target.value)} />
      </label>
      <label className="field">
        <span>Anon / publishable key</span>
        <input className="input" placeholder="eyJhbGciOi… or sb_publishable_…" value={key} onChange={(e) => setKey(e.target.value)} />
      </label>
      <div className="row">
        <button
          className="btn primary"
          disabled={!valid}
          onClick={async () => {
            await configure({ url: url.trim(), anonKey: key.trim() });
            onDone();
          }}
        >
          Connect
        </button>
        {initial && (
          <button className="btn ghost" onClick={onDone}>
            Cancel
          </button>
        )}
        {initial && !isBuiltInConfig() && (
          <button
            className="btn ghost danger"
            onClick={async () => {
              await configure(null);
              onDone();
            }}
          >
            Disconnect
          </button>
        )}
      </div>
      <p className="faint tiny">
        The anon key is safe to use in apps: row-level security ensures each account can only read its own characters.
      </p>
    </div>
  );
}
