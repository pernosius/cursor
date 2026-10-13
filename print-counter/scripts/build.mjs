// Builds Print Counter into one self-contained file with no network requests:
//   dist/Print-Counter.html        the app (CSS, JS, fonts, icon and PDF libraries inlined)
//   dist/Print Counter/            the folder that goes on the store PC (app + launcher, CRLF scripts)
//   dist/Print-Counter-App.zip     that folder, zipped
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { deflateRawSync } from 'node:zlib';
import { join } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (p, enc = 'utf8') => readFileSync(join(root, p), enc);
const b64 = p => readFileSync(join(root, p)).toString('base64');
const inlineScript = s => s.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');

const fontFaces = [
  ['Regular', 400, 'normal'], ['Italic', 400, 'italic'], ['Bold', 700, 'normal'], ['BoldItalic', 700, 'italic'],
].map(([name, weight, style]) =>
  `@font-face{font-family:"Libron";src:url(data:font/woff2;base64,${b64(`fonts/ui/Libron-${name}.woff2`)}) format("woff2");font-weight:${weight};font-style:${style};font-display:block}`
).join('\n');

const parts = {
  ICON: 'data:image/png;base64,' + b64('src/icon.png'),
  CSS: read('src/styles.css').replace('/*@FONTS@*/', fontFaces),
  JSPDF: inlineScript(read('node_modules/jspdf/dist/jspdf.umd.min.js')),
  AUTOTABLE: inlineScript(read('node_modules/jspdf-autotable/dist/jspdf.plugin.autotable.min.js')),
  PDF_FONTS: JSON.stringify({ regular: b64('fonts/pdf/Libron-Regular.ttf'), bold: b64('fonts/pdf/Libron-Bold.ttf') }),
  APP: inlineScript(read('src/app.js')),
};

function render(extra) {
  let html = read('src/index.html');
  for (const [key, value] of Object.entries({ ...parts, ...extra })) {
    const marker = `<!--@${key}@-->`;
    if (!html.includes(marker)) throw new Error(`Template is missing ${marker}`);
    html = html.split(marker).join(value);
  }
  const leftover = html.match(/<!--@[A-Z_]+@-->/);
  if (leftover) throw new Error(`Unfilled placeholder ${leftover[0]}`);
  const remote = html.match(/\b(?:src|href)\s*=\s*["']?(?:https?:)?\/\//i);
  if (remote) throw new Error(`Build references a remote resource: ${remote[0]}`);
  return html;
}
const html = render({ DEMO_SCRIPT: '' });

// Demo for presenting as a claude.ai Artifact: sample orders, on-screen label preview, and no
// document wrapper (the Artifact publisher adds its own doctype, head and body).
const demo = render({ DEMO_SCRIPT: `<script>\n${inlineScript(read('src/demo.js'))}</script>` })
  .replace(/^<!DOCTYPE html>\s*<html[^>]*>\s*<head>\s*<meta charset="UTF-8">\s*<meta name="viewport"[^>]*>\s*/, '')
  .replace(/<title>Print Counter<\/title>\s*/, '')
  .replace(/<\/head>\s*<body>\s*/, '')
  .replace(/<\/body>\s*<\/html>\s*$/, '');
if (/^\s*<(?:!DOCTYPE|html|head)/i.test(demo) || /<\/html>\s*$/i.test(demo) || !demo.startsWith('<meta name="theme-color"')) throw new Error('Demo still has a document wrapper');

const dist = join(root, 'dist');
rmSync(dist, { recursive: true, force: true });
mkdirSync(join(dist, 'Print Counter'), { recursive: true });
writeFileSync(join(dist, 'Print-Counter.html'), html);
writeFileSync(join(dist, 'Print-Counter-Demo.html'), '<title>Print Counter</title>\n' + demo);

// Store-PC folder: the app plus the launcher. Windows scripts and text get CRLF line endings.
const crlf = s => s.replace(/\r?\n/g, '\r\n');
const files = [['Print-Counter.html', Buffer.from(html)]];
for (const name of readdirSync(join(root, 'launcher'))) {
  const buf = readFileSync(join(root, 'launcher', name));
  files.push([name, /\.(bat|ps1|txt)$/i.test(name) ? Buffer.from(crlf(buf.toString('utf8'))) : buf]);
}
for (const [name, buf] of files) writeFileSync(join(dist, 'Print Counter', name), buf);
writeFileSync(join(dist, 'Print-Counter-App.zip'), zip(files.map(([n, b]) => ['Print Counter/' + n, b])));

const kb = n => Math.round(n / 1024) + ' KB';
console.log(`dist/Print-Counter.html      ${kb(Buffer.byteLength(html))}`);
console.log(`dist/Print Counter/          ${files.map(f => f[0]).join(', ')}`);
console.log(`dist/Print-Counter-App.zip`);
console.log(`dist/Print-Counter-Demo.html  ${kb(Buffer.byteLength(demo))} (for presenting as a claude.ai Artifact)`);

/* Minimal zip writer (deflate), so the build needs no extra dependencies. */
function zip(entries) {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc32 = buf => {
    let c = 0xFFFFFFFF;
    for (const b of buf) c = crcTable[(c ^ b) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  };
  const d = new Date();
  const dosTime = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const dosDate = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  const locals = [], centrals = [];
  let offset = 0;
  for (const [name, data] of entries) {
    const nameBuf = Buffer.from(name, 'utf8'), packed = deflateRawSync(data, { level: 9 }), crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(8, 8); local.writeUInt16LE(dosTime, 10); local.writeUInt16LE(dosDate, 12);
    local.writeUInt32LE(crc, 14); local.writeUInt32LE(packed.length, 18); local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26); local.writeUInt16LE(0, 28);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8); central.writeUInt16LE(8, 10); central.writeUInt16LE(dosTime, 12);
    central.writeUInt16LE(dosDate, 14); central.writeUInt32LE(crc, 16); central.writeUInt32LE(packed.length, 20);
    central.writeUInt32LE(data.length, 24); central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(local, nameBuf, packed);
    centrals.push(central, nameBuf);
    offset += local.length + nameBuf.length + packed.length;
  }
  const cdSize = centrals.reduce((a, b) => a + b.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cdSize, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, ...centrals, end]);
}
