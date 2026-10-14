// Sync checks: several "computers" (separate browser profiles) share orders through an in-memory
// stand-in for the shared store. The stand-in mirrors supabase/schema.sql: the first account to claim
// the store is its only member, server timestamps order pulls, deletes are soft, and order numbers come
// from one counter. It exercises the app's sync engine end to end; the Supabase adapter itself is a thin
// wrapper and is checked against the real project separately.
// Usage: npm run build && node tests/sync.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { loadPlaywright } from '../scripts/playwright.mjs';
import { sampleBackup } from './sample-backup.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = join(root, 'tests', 'output');
mkdirSync(out, { recursive: true });
const appUrl = pathToFileURL(join(root, 'dist', 'Print-Counter.html')).href;
const backupPath = join(out, 'sync-sample-backup.json');
writeFileSync(backupPath, JSON.stringify(sampleBackup(), null, 1));

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok: !!ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

/* ---------- the stand-in shared store ---------- */
const srv = { users: {}, members: new Set(), orders: new Map(), settings: null, counter: null, clock: 0, offline: new Set(), subs: new Map() };
const stamp = () => new Date(Date.UTC(2026, 0, 1) + ++srv.clock).toISOString().replace('Z', '+00:00');
const rls = () => { const e = new Error('new row violates row-level security policy'); e.code = '42501'; throw e; };
function broadcast(kind, row) {
  for (const [pc, page] of srv.subs) {
    if (srv.offline.has(pc)) continue;
    page.evaluate(([k, r]) => window.__pcRt && window.__pcRt(k, r), [kind, row]).catch(() => {});
  }
}
async function handle(pc, page, op, a) {
  if (srv.offline.has(pc)) throw new Error('TypeError: Failed to fetch');
  const user = a.auth && srv.users[a.auth] ? a.auth : null;
  const member = () => { if (!user || !srv.members.has(user)) rls(); };
  switch (op) {
    case 'signUp':
      if (srv.users[a.email]) throw new Error('User already registered');
      srv.users[a.email] = a.password; return { email: a.email, needsConfirm: false };
    case 'signIn':
      if (srv.users[a.email] !== a.password) throw new Error('Invalid login credentials');
      return { email: a.email };
    case 'claim':
      if (!user) throw new Error('Sign in first');
      if (srv.members.has(user)) return 'member';
      if (srv.members.size) return 'denied';
      srv.members.add(user); return 'claimed';
    case 'pullOrders': {
      member();
      const rows = [...srv.orders.values()].filter(r => !a.since || r.server_at > a.since).sort((x, y) => x.server_at.localeCompare(y.server_at));
      return { rows, cursor: rows.length ? rows[rows.length - 1].server_at : a.since || null };
    }
    case 'pushOrders':
      member();
      for (const r of a.rows) { const row = { ...r, server_at: stamp() }; srv.orders.set(r.id, row); broadcast('orders', row); }
      return null;
    case 'pullSettings': member(); return srv.settings;
    case 'pushSettings': member(); srv.settings = { ...a.row, server_at: stamp() }; broadcast('settings', srv.settings); return null;
    case 'takeNum': {
      member();
      if (srv.counter == null) srv.counter = Math.max(a.min, 1);
      srv.counter = Math.max(srv.counter, a.min) + 1; return srv.counter - 1;
    }
    case 'subscribe': srv.subs.set(pc, page); return null;
  }
  throw new Error('unknown op ' + op);
}

const fakeAdapter = () => {
  const call = async (op, a) => JSON.parse(await window.__pcSrv(op, JSON.stringify(Object.assign({ auth: localStorage.getItem('pc_sync_auth') }, a || {}))));
  let rt = null;
  window.__pcRt = (k, r) => { if (rt) (k === 'orders' ? rt.o : rt.s)(r); };
  window.PC_SYNC_ADAPTER = {
    async getSession() { const s = localStorage.getItem('pc_sync_auth'); return s ? { email: s } : null; },
    async signIn(email, password) { const r = await call('signIn', { email, password }); localStorage.setItem('pc_sync_auth', r.email); return r; },
    async signUp(email, password) { const r = await call('signUp', { email, password }); localStorage.setItem('pc_sync_auth', email); return r; },
    async signOut() { localStorage.removeItem('pc_sync_auth'); },
    claim: () => call('claim'),
    pullOrders: since => call('pullOrders', { since }),
    pullSettings: () => call('pullSettings'),
    pushOrders: rows => call('pushOrders', { rows }),
    pushSettings: row => call('pushSettings', { row }),
    takeNum: min => call('takeNum', { min }),
    subscribe(o, s, st) { rt = { o, s }; call('subscribe').then(() => st('SUBSCRIBED')); return () => { rt = null; }; },
  };
};

/* ---------- computers ---------- */
const { chromium, launchOptions } = await loadPlaywright();
const browser = await chromium.launch(launchOptions);
const errors = [];
async function computer(name) {
  const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1400, height: 900 } });
  await context.route(/^https?:/, r => r.abort());
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(`${name}: ${e}`));
  await page.exposeFunction('__pcSrv', async (op, json) => {
    try { return JSON.stringify(await handle(name, page, op, JSON.parse(json))); }
    catch (e) { throw new Error(e.message); }
  });
  await page.addInitScript(fakeAdapter);
  await page.addInitScript(() => { window.print = () => {}; });
  await page.goto(appUrl);
  await page.waitForTimeout(300);
  return { name, context, page };
}
const settle = (ms = 700) => new Promise(r => setTimeout(r, ms));
const cardIds = p => p.locator('.card').evaluateAll(cs => cs.map(c => c.dataset.id).sort());
const rail = p => p.locator('#railSync').innerText();
async function signIn(pc, create, email = 'store@example.com', pw = 'counter-pass-1') {
  const p = pc.page;
  await p.click('.nav-btn[data-view="settings"]');
  await p.fill('#sync-email', email);
  await p.fill('#sync-pass', pw);
  await p.click(create ? '#syncCreate' : '#syncIn');
  await settle(900);
}
async function goOffline(pc, off) {
  if (off) srv.offline.add(pc.name); else srv.offline.delete(pc.name);
  await pc.context.setOffline(off);
  await settle(off ? 200 : 1200);
}
async function newOrder(p, first, desc, price) {
  await p.click('#newOrderBtn');
  await p.waitForSelector('#drawer.on');
  await p.fill('#f-name', first);
  await p.fill('.l-desc', desc);
  await p.fill('.l-price', String(price));
  await p.click('#d-save');
  await settle(500);
}

const A = await computer('A'), B = await computer('B');

// A: existing data, creates the store login
await A.page.click('.nav-btn[data-view="settings"]');
check('Sync panel shows on Settings when sync is built in', await A.page.isVisible('#syncPanel'));
await A.page.setInputFiles('#restoreFile', backupPath);
await A.page.click('#dlgOk');
await settle(300);
await signIn(A, true);
check('First computer: store login claims the store and uploads its 6 orders and settings',
  srv.members.size === 1 && srv.orders.size === 6 && srv.settings && srv.settings.data.storeName === 'The UPS Store #1234',
  `${srv.orders.size} orders on server`);
check('Rail shows "Synced"', (await rail(A.page)).includes('Synced'), await rail(A.page));

// B: empty computer signs in and receives everything
await signIn(B, false);
await B.page.click('.nav-btn[data-view="board"]');
await settle(300);
check('Second computer receives the shared orders', JSON.stringify(await cardIds(B.page)) === JSON.stringify(await cardIds(A.page)),
  (await cardIds(B.page)).join(','));
check('Second computer receives the shared settings', await B.page.evaluate(() => JSON.parse(localStorage.getItem('pc_state_v2')).settings.storeName) === 'The UPS Store #1234');
check('Unclaimed badge matches on both', (await B.page.innerText('#ucBadge')) === '1');

// live updates and order numbers
await A.page.click('.nav-btn[data-view="board"]');
await newOrder(A.page, 'Lena', 'Flyers 8.5x11', 30);
await settle();
const aNew = await A.page.locator('.card:has-text("Lena")').innerText();
check('Order numbers come from the shared counter (#1007)', aNew.includes('#1007'));
check('A new order appears on the other computer live', await B.page.locator('.card:has-text("Lena")').count() === 1);
await Promise.all([newOrder(A.page, 'Omar', 'Postcards', 12), newOrder(B.page, 'Rita', 'Banner', 45)]);
await settle();
const nums = await A.page.locator('.card .card-num').allInnerTexts();
check('Two computers creating orders at once get different numbers', new Set(nums).size === nums.length && nums.includes('#1008') && nums.includes('#1009'), nums.join(' '));
check('Both computers show the same board after simultaneous orders', JSON.stringify(await cardIds(A.page)) === JSON.stringify(await cardIds(B.page)));

await A.page.click('[data-advance="ord-sample1"]');
await settle();
check('Moving a card shows on the other computer', await B.page.locator('.col[data-stage="complete"] .card[data-id="ord-sample1"]').count() === 1);

await A.page.click('.nav-btn[data-view="settings"]');
await A.page.fill('#s-store', 'Store 4412');
await A.page.press('#s-store', 'Tab');
await settle();
check('Settings changes sync', await B.page.evaluate(() => JSON.parse(localStorage.getItem('pc_state_v2')).settings.storeName) === 'Store 4412');
await A.page.click('.nav-btn[data-view="board"]');

// offline: keep working, catch up later
await goOffline(B, true);
await B.page.click('[data-advance="ord-sample2"]');
await settle(400);
check('Offline computer keeps working and shows waiting changes', (await rail(B.page)).includes('Offline') && (await rail(B.page)).includes('1 waiting'), await rail(B.page));
await A.page.click('[data-pickup="ord-sample4"]');
await settle();
check('The other computer is not affected meanwhile', await A.page.locator('.col[data-stage="new"] .card[data-id="ord-sample2"]').count() === 1);
await goOffline(B, false);
check('Back online: offline change reaches the other computer', await A.page.locator('.col[data-stage="quoting"] .card[data-id="ord-sample2"]').count() === 1);
check('Back online: the computer catches up on changes it missed', await B.page.locator('.card[data-id="ord-sample4"]').count() === 0);
check('Back online: rail returns to "Synced"', (await rail(B.page)).includes('Synced'), await rail(B.page));

// conflicting edits: the most recent one wins everywhere
await goOffline(A, true);
await A.page.click('.card[data-id="ord-sample3"]');
await A.page.fill('#f-notes', 'edit from A');
await A.page.click('#d-save');
await settle(300);
await B.page.click('.card[data-id="ord-sample3"]');
await B.page.fill('#f-notes', 'edit from B (later)');
await B.page.click('#d-save');
await settle();
await goOffline(A, false);
const notesOn = p => p.evaluate(() => JSON.parse(localStorage.getItem('pc_state_v2')).orders.find(o => o.id === 'ord-sample3').notes);
check('Conflicting edits: the later edit wins on both computers', (await notesOn(A.page)) === 'edit from B (later)' && (await notesOn(B.page)) === 'edit from B (later)',
  `${await notesOn(A.page)} / ${await notesOn(B.page)}`);

// deletes
await A.page.click('.card:has-text("Omar")');
await A.page.click('#d-del');
await A.page.click('#dlgOk');
await settle();
check('Deleting an order removes it on the other computer', await B.page.locator('.card:has-text("Omar")').count() === 0);

// reload keeps the sign-in
await B.page.reload();
await settle(900);
check('After a reload the computer is still signed in and synced', (await rail(B.page)).includes('Synced') &&
  JSON.stringify(await cardIds(B.page)) === JSON.stringify(await cardIds(A.page)));

// a third computer that already has its own orders
const C = await computer('C');
await newOrder(C.page, 'Quinn', 'Door hangers', 80);
await signIn(C, false);
check('A computer with its own orders is asked how to combine them', await C.page.isVisible('#dlg.on') && (await C.page.innerText('#dlgTitle')).includes('Combine'));
await C.page.click('#dlgOk');
await settle(1000);
check('"Add them" shares that computer\'s orders with the others', await A.page.locator('.card:has-text("Quinn")').count() === 1 && await B.page.locator('.card:has-text("Quinn")').count() === 1);

// another account can't join the store
const D = await computer('D');
await signIn(D, true, 'someone@example.com', 'another-pass-1');
check('A different account is refused', (await D.page.innerText('#syncMsg')).includes('isn’t this store’s sync login') && srv.members.size === 1);
check('A refused computer stays unsynced', await D.page.evaluate(() => !(JSON.parse(localStorage.getItem('pc_sync') || '{}').on)));

// stop syncing
await B.page.click('.nav-btn[data-view="settings"]');
await B.page.click('#syncOff');
await B.page.click('#dlgOk');
await settle();
check('Stop syncing keeps this computer\'s orders', await B.page.evaluate(() => JSON.parse(localStorage.getItem('pc_state_v2')).orders.length) > 0 &&
  (await B.page.innerText('#syncBadge')) === 'Off');

check('No page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close();
const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} sync checks passed`);
if (failed.length) process.exit(1);
