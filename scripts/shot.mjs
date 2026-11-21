// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 rrstudio — rrstudio Tools
// Screenshot veloce di una pagina del sito già costruito (dist/rrstudio-tools/browser), senza rigenerare tutti i PNG.
// Uso: node scripts/shot.mjs <percorso> [opzioni]   (prima: nice -n 19 npm run build)
//   --out <file>        PNG di destinazione (default: shot.png nella cartella temporanea del sistema)
//   --dark              tema scuro (preferenza del sistema + data-theme)
//   --width <px>        larghezza (default 1280)   --height <px>  altezza (default 800)
//   --lang en           lingua del browser (default it); le pagine inglesi stanno sotto /en/
//   --do <azione>       ripetibile, in ordine: click:<css> | fill:<css>=<testo> | type:<testo> | press:<Tasto> | wait:<ms> | waitfor:<css>
//   --selector <css>    ritaglia sull'elemento (il primo)   --clip x,y,w,h  ritaglia su un rettangolo   --full  pagina intera
// Esempio: node scripts/shot.mjs /text-diff/ --do "fill:#diff-a=uno" --do "fill:#diff-b=due" --do "click:[data-testid=diff-next]" --selector div.bar --out /tmp/bar.png
// Il browser è playwright-core (non «playwright»): CHROMIUM_PATH se serve, altrimenti il Chromium di ~/.cache/ms-playwright.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';

const argv = process.argv.slice(2);
const path = argv[0] && !argv[0].startsWith('--') ? argv[0] : '/';
const opt = (name, def) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : def);
const flag = (name) => argv.includes(name);
const actions = argv.flatMap((a, i) => (a === '--do' ? [argv[i + 1]] : []));

const dark = flag('--dark');
const width = Number(opt('--width', 1280));
const height = Number(opt('--height', 800));
const lang = opt('--lang', 'it');
const out = opt('--out', join(tmpdir(), 'shot.png'));
const port = 4390 + Math.floor(Math.random() * 100);
const dist = 'dist/rrstudio-tools/browser';
if (!existsSync(join(dist, 'index.html'))) {
  console.error('Manca ' + dist + ': lancia prima `nice -n 19 npm run build`.');
  process.exit(1);
}

let exe = process.env.CHROMIUM_PATH;
if (!exe) {
  const guess = join(homedir(), '.cache/ms-playwright/chromium-1254/chrome-linux-arm64/chrome');
  if (existsSync(guess)) exe = guess;
}

const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: dist, stdio: 'ignore' });
process.on('exit', () => server.kill());
await new Promise((r) => setTimeout(r, 800));

const browser = await chromium.launch({ ...(exe ? { executablePath: exe } : {}) });
try {
  const ctx = await browser.newContext({ viewport: { width, height }, colorScheme: dark ? 'dark' : 'light', locale: lang === 'en' ? 'en-GB' : 'it-IT' });
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${port}${path}`);
  await page.waitForSelector('html[data-hydrated]', { state: 'attached', timeout: 20000 }).catch(() => undefined);
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.waitForTimeout(600); // animazione d'ingresso
  for (const a of actions) {
    const i = a.indexOf(':');
    const kind = a.slice(0, i);
    const rest = a.slice(i + 1);
    if (kind === 'click') await page.locator(rest).first().click();
    else if (kind === 'fill') {
      const j = rest.lastIndexOf('=');
      await page.locator(rest.slice(0, j)).first().fill(rest.slice(j + 1));
    } else if (kind === 'type') await page.keyboard.type(rest);
    else if (kind === 'press') await page.keyboard.press(rest);
    else if (kind === 'wait') await page.waitForTimeout(Number(rest));
    else if (kind === 'waitfor') await page.locator(rest).first().waitFor();
    else throw new Error('azione sconosciuta: ' + a);
    await page.waitForTimeout(150); // il DOM si aggiorna con ritardo dopo un'azione
  }
  const sel = opt('--selector', '');
  const clip = opt('--clip', '');
  if (sel) await page.locator(sel).first().screenshot({ path: out });
  else if (clip) {
    const [x, y, w, h] = clip.split(',').map(Number);
    await page.screenshot({ path: out, clip: { x, y, width: w, height: h } });
  } else await page.screenshot({ path: out, fullPage: flag('--full') });
  console.log('Screenshot: ' + out + (errors.length ? '\nErrori nella pagina: ' + errors.join(' | ') : ''));
} finally {
  await browser.close();
  server.kill();
}
