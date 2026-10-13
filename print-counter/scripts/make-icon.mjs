// Renders the app icon (teal rounded tile with a white printer) to PNGs with the
// preinstalled Chromium, then writes:
//   src/icon.png               64px favicon embedded in the page
//   launcher/Print Counter.ico 16-256px icon for the desktop / Start menu shortcuts
// Run with: npm run icon   (only needed if the icon design changes)
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadPlaywright } from './playwright.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect x="2" y="2" width="60" height="60" rx="14" fill="#009CBD"/>
  <g transform="translate(10 10) scale(1.8333)" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
    <path d="M7 9V3.5h10V9"/><rect x="3.5" y="9" width="17" height="8" rx="2"/><path d="M7 14h10v6.5H7z" fill="#009CBD"/>
  </g></svg>`;

const sizes = [16, 24, 32, 48, 64, 256];
const { chromium, launchOptions } = await loadPlaywright();
const browser = await chromium.launch(launchOptions);
const page = await browser.newPage();
const pngs = {};
for (const s of sizes) {
  await page.setViewportSize({ width: s, height: s });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${s}" height="${s}" `)}</body></html>`);
  pngs[s] = await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: s, height: s } });
}
await browser.close();

// ICO container with PNG-compressed entries (supported since Windows Vista)
const head = Buffer.alloc(6 + 16 * sizes.length);
head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(sizes.length, 4);
let offset = head.length;
sizes.forEach((s, i) => {
  const e = 6 + 16 * i, png = pngs[s];
  head.writeUInt8(s >= 256 ? 0 : s, e); head.writeUInt8(s >= 256 ? 0 : s, e + 1);
  head.writeUInt8(0, e + 2); head.writeUInt8(0, e + 3);
  head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6);
  head.writeUInt32LE(png.length, e + 8); head.writeUInt32LE(offset, e + 12);
  offset += png.length;
});
writeFileSync(root + 'launcher/Print Counter.ico', Buffer.concat([head, ...sizes.map(s => pngs[s])]));
writeFileSync(root + 'src/icon.png', pngs[64]);
console.log('Wrote launcher/Print Counter.ico and src/icon.png');
