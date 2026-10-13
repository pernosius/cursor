// Acceptance checks from SPEC section 18, run against the built dist/Print-Counter.html in headless Chromium.
// Usage: npm test   (builds first)
import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { loadPlaywright } from '../scripts/playwright.mjs';
import { sampleBackup } from './sample-backup.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = join(root, 'tests', 'output');
mkdirSync(out, { recursive: true });
const appUrl = pathToFileURL(join(root, 'dist', 'Print-Counter.html')).href;
const backupPath = join(out, 'sample-backup.json');
writeFileSync(backupPath, JSON.stringify(sampleBackup(), null, 1));

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok: !!ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

const { chromium, launchOptions } = await loadPlaywright();
const browser = await chromium.launch(launchOptions);
const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1500, height: 950 } });
const remote = [];
await context.route(/^https?:/, route => { remote.push(route.request().url()); route.abort(); });
const errors = [];

const page = await context.newPage();
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.addInitScript(() => { window.print = () => { window.__printed = (window.__printed || 0) + 1; }; });

const nav = v => page.click(`.nav-btn[data-view="${v}"]`);
const text = sel => page.locator(sel).first().innerText();
const lastTotal = async () => (await text('#t-rows')).trim().split('\n').pop().trim();
const openCard = async id => { await page.click(`.card[data-id="${id}"]`); await page.waitForSelector('#drawer.on'); };
const closeDrawer = async () => { await page.click('#d-close'); await page.waitForTimeout(150); };
const download = async action => {
  const [dl] = await Promise.all([page.waitForEvent('download'), action()]);
  const p = join(out, dl.suggestedFilename());
  await dl.saveAs(p);
  return p;
};
const pdfInfo = p => execFileSync('pdfinfo', [p]).toString();
const pdfText = p => execFileSync('pdftotext', ['-layout', p, '-']).toString();
const restore = async file => {
  await nav('settings');
  await page.setInputFiles('#restoreFile', file);
  await page.click('#dlgOk');
  await page.waitForTimeout(300);
  await nav('board');
};
const printLabelsPdf = async (id, name) => {
  await page.click(`[data-print="${id}"]`);
  await page.waitForTimeout(200);
  await page.emulateMedia({ media: 'print' });
  const p = join(out, name);
  writeFileSync(p, await page.pdf({ preferCSSPageSize: true }));
  await page.emulateMedia({ media: 'screen' });
  return p;
};

/* ---------- load, fonts, network ---------- */
await page.goto(appUrl);
await page.waitForTimeout(400);
check('Opens from file:// and shows the board', await page.locator('.col').count() === 6);
await page.evaluate(() => document.fonts.ready);
check('Libron font is embedded and used', await page.evaluate(() =>
  document.fonts.check('16px Libron') && getComputedStyle(document.body).fontFamily.includes('Libron')));

/* ---------- restore the sample backup ---------- */
await restore(backupPath);
check('Sample backup restores: 4 cards on the board (1 unclaimed, 1 closed)', await page.locator('.card').count() === 4,
  `${await page.locator('.card').count()} cards`);
check('Unclaimed badge counts the 41-day job', (await text('#ucBadge')) === '1');
check('Unclaimed banner shows on the board', await page.isVisible('#ucBar'));

/* ---------- money math (SPEC 5) ---------- */
await openCard('ord-sample1');
check('Legacy single name splits into first/last', (await page.inputValue('#f-name')) === 'Maria' && (await page.inputValue('#f-last')) === 'de la Cruz');
check('Example 1 total is $232.39', (await lastTotal()) === '$232.39', await lastTotal());
const rows1 = await text('#t-rows');
check('Example 1 breakdown rows', ['Discount (10%)', '-$19.50', '-$5.00', 'Rush fee', 'Additional fee (Cutting)', 'Tax (7%)', '$14.39', 'Postage (no tax)', '$12.50']
  .every(s => rows1.includes(s)));
await closeDrawer();

await openCard('ord-sample2');
check('Example 2 total is $70.62', (await lastTotal()) === '$70.62', await lastTotal());
await page.click('[data-mode="detailed"]');
await page.waitForSelector('.drawer.wide');
check('Detailed mode: order total $70.62, amount due $60.62',
  (await text('[data-out="total"]')) === '$70.62' && (await text('[data-out="due"]')) === '$60.62');
check('Detailed mode shows the item specs', (await page.inputValue('#y-spec-paper')) === '2prt NCR' && (await page.isChecked('[data-l="spec.fin.chipboard"]')));
const invNt = await download(() => page.click('[data-doc="invoice-nt"]'));
const invTxt = pdfText(invNt);
check('Example 3 (invoice no tax): balance due $56.00', /Balance due\s+\$56\.00/.test(invTxt.replace(/\s+/g, ' ')), invNt.split('/').pop());
check('Invoice no tax leaves the order taxable', (await text('[data-out="total"]')) === '$70.62');
// Simple <-> Detailed keeps fields
await page.fill('#x-associate', 'JT');
await page.fill('[data-k="promo.text"]', 'SPRING10');
await page.click('[data-mode="simple"]');
await page.fill('#f-phone', '864-555-0198');
await page.click('[data-mode="detailed"]');
check('Simple <-> Detailed switching preserves fields',
  (await page.inputValue('#x-associate')) === 'JT' && (await page.inputValue('[data-k="promo.text"]')) === 'SPRING10' &&
  (await page.inputValue('#x-customer-phone')) === '864-555-0198');
await page.click('#d-save');
await page.waitForTimeout(250);
await openCard('ord-sample2');
check('Detailed edits are saved', (await page.inputValue('#x-associate')) === 'JT');
await page.click('[data-mode="simple"]');
await closeDrawer();

/* ---------- quote / invoice PDFs ---------- */
await openCard('ord-sample1');
const quote = await download(() => page.click('#d-quote'));
const qInfo = pdfInfo(quote), qTxt = pdfText(quote).replace(/\s+/g, ' ');
check('Quote PDF is letter size and named "Quote Q-1001 Gomez Realty.pdf"',
  /Page size:\s+612 x 792/.test(qInfo) && quote.endsWith('Quote Q-1001 Gomez Realty.pdf'));
check('Quote PDF totals and terms', qTxt.includes('Quote total $232.39') && qTxt.includes('Q-1001') && qTxt.includes('postage is not taxed'));
check('Quote PDF embeds Libron', readFileSync(quote).includes('Libron'));
await page.waitForTimeout(200);
await openCard('ord-sample1').catch(() => {});
const inv = await download(() => page.click('#d-invoice'));
const iTxt = pdfText(inv).replace(/\s+/g, ' ');
check('Invoice PDF shows balance due $232.39', /Balance due \$232\.39/.test(iTxt) && inv.endsWith('Invoice 1001 Gomez Realty.pdf'));
await closeDrawer();

/* ---------- labels (SPEC 6) ---------- */
const lbl = await printLabelsPdf('ord-sample1', 'labels-1001.pdf');
const lInfo = pdfInfo(lbl);
check('Print label: exactly 2 pages of 288 x 432 pt', /Pages:\s+2\b/.test(lInfo) && /Page size:\s+288 x 432/.test(lInfo),
  lInfo.match(/Pages:.*|Page size:.*/g).join(', '));
check('window.print was called', await page.evaluate(() => window.__printed >= 1));
const lTxt = pdfText(lbl);
check('Label 1 says NOT PAID; store copy has pickup lines and no paid status',
  lTxt.includes('NOT PAID') && lTxt.includes('STORE COPY') && lTxt.includes('Picked up') && (lTxt.match(/NOT PAID/g) || []).length === 1);
await page.click('[data-view="board"]');
// invoice order: INVOICE only, on both labels
await page.click('.pill[data-filter="all"]');
const lbl3 = await printLabelsPdf('ord-sample3', 'labels-1003.pdf');
const l3 = pdfText(lbl3);
check('Invoice order labels show INVOICE only', (l3.match(/INVOICE/g) || []).length === 2 && !/PAID/.test(l3));
// 14-item order still fits
await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('pc_state_v2'));
  const names = ['B&W copies', 'Color copies', 'Banner 3x6', 'Invitations 5x7', 'Business cards (250)', 'Lamination', 'Coil binding',
    'Flyers 8.5x11', 'Yard signs', 'Foamboard 24x36', 'Postcards 4x6', 'Door hangers', 'Envelopes #10', 'Rack cards'];
  const lines = names.map((desc, i) => ({ itemId: '', desc, unit: 'each', qty: (i + 1) * 5, price: 1.25 + i }));
  const longLines = Array.from({ length: 16 }, (_, i) => ({ itemId: '', desc: `Item ${i + 1}: full color flyer 8.5x11 on 100# gloss text, cut and folded`, unit: 'each', qty: i + 1, price: 1.25 + i }));
  s.orders.push({ id: 'ord-big', num: 1007, customer: { first: 'Big', last: 'Order', name: 'Big Order', company: 'Spartan Events', phone: '864-555-0177', email: '' },
    lines, notes: 'Large test order', orderDate: s.orders[0].orderDate, due: '', stage: 'new', paid: false, invoice: false, taxExempt: false,
    taxRate: 0.07, archived: false, closedAt: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), stageAt: new Date().toISOString() });
  s.orders.push(Object.assign({}, s.orders[s.orders.length - 1], { id: 'ord-long', num: 1008, lines: longLines, customer: { first: 'Long', last: 'Order', name: 'Long Order', company: '', phone: '', email: '' } }));
  localStorage.setItem('pc_state_v2', JSON.stringify(s));
});
await page.reload();
await page.waitForTimeout(400);
const big = await printLabelsPdf('ord-big', 'labels-14-items.pdf');
check('A 14-item order fits on label 1 (2 pages, no "more items")',
  /Pages:\s+2\b/.test(pdfInfo(big)) && await page.locator('#printArea .lb-more').count() === 0 &&
  await page.evaluate(() => { const t = document.querySelector('#printArea .lb-top'); return t.scrollHeight <= t.clientHeight + 1; }));
const long = await printLabelsPdf('ord-long', 'labels-16-long-items.pdf');
check('An order too long for one label prints "+ N more items" and still 2 pages',
  /Pages:\s+2\b/.test(pdfInfo(long)) && (await page.locator('#printArea .lb-more').count()) === 1 &&
  await page.evaluate(() => { const t = document.querySelector('#printArea .lb-top'); return t.scrollHeight <= t.clientHeight + 1; }),
  await page.locator('#printArea .lb-more').count() ? await text('#printArea .lb-more') : 'all items fit');
await page.screenshot({ path: join(out, 'board-fluent.png') });

/* ---------- closing orders (SPEC 3.4) ---------- */
await page.click('[data-pickup="ord-sample4"]');
await page.waitForTimeout(200);
check('Paid order: card pickup skips the payment question', !(await page.isVisible('#dlg.on')) && await page.locator('.card[data-id="ord-sample4"]').count() === 0);
await page.click('.toast button:has-text("Undo")');
await page.waitForTimeout(200);
check('Pickup is undoable', await page.locator('.card[data-id="ord-sample4"]').count() === 1);
await page.click('[data-advance="ord-sample1"]');
await page.waitForTimeout(150);
await page.click('[data-pickup="ord-sample1"]');
await page.waitForTimeout(150);
check('Unpaid order: pickup asks whether they paid', await page.isVisible('#dlg.on') && (await text('#dlgAlt')) === 'Picked up, not paid');
await page.click('#dlgCancel');
await openCard('ord-sample3');
await page.selectOption('#f-loc', 'Shipped to Customer');
await page.click('#d-save');
await page.waitForTimeout(250);
check('Location "Shipped to Customer" closes an invoice order without asking', !(await page.isVisible('#dlg.on')) &&
  await page.locator('.card[data-id="ord-sample3"]').count() === 0);

/* ---------- unclaimed (SPEC 3.5) ---------- */
await nav('unclaimed');
check('Unclaimed page lists the 41-day job', (await text('#ucBody')).includes('#1005') && (await text('#ucBody')).includes('41 days'));
await page.click('[data-contact="ord-sample5"]');
await page.waitForTimeout(150);
check('Log contact counts attempts', (await text('#ucBody')).includes('2 times'));
await page.click('[data-pu="ord-sample5"]');
await page.click('#dlgOk');
await page.waitForTimeout(200);
check('Unclaimed pickup clears the badge', await page.isHidden('#ucBadge'));

/* ---------- customers & reorder (SPEC 3.3, 3.6) ---------- */
await nav('customers');
await page.waitForTimeout(250);
check('Customers group by phone (7 customers; Maria\'s two phone formats merge)', await page.locator('.cust-row').count() === 7,
  `${await page.locator('.cust-row').count()} customers`);
await page.click('.cust-row:has-text("Maria")');
check('Maria has 2 orders (#1001 and closed #1006)', (await text('#custDetail')).includes('#1006') && (await text('#custDetail')).includes('#1001'));
await page.click('[data-reorder="ord-sample1"]');
await page.waitForSelector('#drawer.on');
check('Reorder copies items, fees and discounts (no postage)', (await lastTotal()) === '$219.89' && (await page.inputValue('#f-rush')) === '25', await lastTotal());
await page.click('#d-close');
await page.click('#dlgOk');
await page.waitForTimeout(150);

/* ---------- backup round trip (SPEC 12) ---------- */
await nav('settings');
const before = await page.evaluate(() => localStorage.getItem('pc_state_v2'));
const backup = await download(() => page.click('#backupBtn'));
const bk = JSON.parse(readFileSync(backup, 'utf8'));
check('Backup file format', bk.app === 'print-counter' && bk.version === 1 && Array.isArray(bk.orders) && bk.orders.length === 8);
const csv = await download(() => page.click('#exportBtn'));
const csvTxt = readFileSync(csv, 'utf8');
check('CSV export has every order and CRLF rows', csvTxt.split('\r\n').length === 9 && csvTxt.startsWith('Order,Order date,Customer,First name'));
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForTimeout(300);
check('Clearing storage empties the app', await page.locator('.card').count() === 0);
await restore(backup);
const after = await page.evaluate(() => localStorage.getItem('pc_state_v2'));
check('Backup -> clear -> restore round-trips everything', JSON.stringify(JSON.parse(after).orders) === JSON.stringify(JSON.parse(before).orders) &&
  JSON.stringify(JSON.parse(after).settings) === JSON.stringify(JSON.parse(before).settings));

/* ---------- designs (SPEC 13) ---------- */
for (const look of ['fluent', 'counter', 'ticket', 'press']) {
  for (const theme of ['light', 'dark']) {
    await page.evaluate(a => localStorage.setItem('pc_appearance', JSON.stringify(a)), { theme, look });
    await page.reload();
    await page.waitForTimeout(250);
    const attrs = await page.evaluate(() => [document.documentElement.dataset.mode, document.documentElement.dataset.look || 'fluent']);
    await page.screenshot({ path: join(out, `design-${look}-${theme}.png`) });
    if (theme === 'light') {
      const border = await page.evaluate(() => getComputedStyle(document.querySelector('.card')).borderTopColor);
      check(`${look} light: dark card outlines`, ['rgb(23, 32, 36)', 'rgb(31, 27, 21)', 'rgb(17, 17, 17)'].includes(border), border);
    }
    check(`${look} ${theme} renders`, attrs[0] === theme && attrs[1] === look);
  }
}
await page.evaluate(() => localStorage.setItem('pc_order_mode', JSON.stringify('detailed')));
await page.evaluate(() => localStorage.setItem('pc_appearance', JSON.stringify({ theme: 'light', look: 'fluent' })));
await page.reload();
await page.waitForTimeout(250);
await openCard('ord-sample2');
await page.screenshot({ path: join(out, 'detailed-mode.png') });
await page.evaluate(() => localStorage.setItem('pc_order_mode', JSON.stringify('simple')));

/* ---------- packaging ---------- */
const zipPath = join(root, 'dist', 'Print-Counter-App.zip');
const listing = execFileSync('python3', ['-c', `import zipfile,sys;z=zipfile.ZipFile(sys.argv[1]);assert z.testzip() is None;print('\\n'.join(z.namelist()));print('CRLF' if b'\\r\\n' in z.read('Print Counter/setup.ps1') and b'\\r\\n' in z.read('Print Counter/Set Up Print Counter.bat') else 'LF')`, zipPath]).toString();
check('Launcher folder zips cleanly with CRLF scripts', ['Print-Counter.html', 'setup.ps1', 'Set Up Print Counter.bat', 'READ ME.txt', 'Print Counter.ico'].every(f => listing.includes(f)) && listing.trim().endsWith('CRLF'));

check('Zero network requests', remote.length === 0, remote.slice(0, 3).join(', '));
check('No page errors', errors.length === 0, errors.slice(0, 3).join(' | '));

await browser.close();
const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) process.exit(1);
