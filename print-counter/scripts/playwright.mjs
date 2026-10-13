// Finds Playwright: a local install if there is one, otherwise the copy preinstalled
// in Claude Code's cloud containers (with its bundled Chromium).
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';

export async function loadPlaywright() {
  const require = createRequire(import.meta.url);
  let pw;
  for (const from of [import.meta.url, '/opt/node-tools/node_modules/']) {
    try { pw = createRequire(from)('playwright'); break; } catch { /* try next */ }
  }
  if (!pw) {
    try { pw = require('playwright'); } catch {
      throw new Error('Playwright not found. Run: npm i -D playwright && npx playwright install chromium');
    }
  }
  const exe = '/opt/pw-browsers/chromium';
  const launchOptions = existsSync(exe) ? { executablePath: exe } : {};
  return { chromium: pw.chromium, launchOptions };
}
