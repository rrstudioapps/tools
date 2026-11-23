// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 rrstudio — rrstudio tools
// Genera le immagini Open Graph (1200×630, stile "Carta") di ogni strumento e lingua in
// public/og/<lang>/<slug>.png: nome dello strumento, una riga di descrizione, logo e "tools.rrstudio.app".
// Testi presi dai dizionari (it.ts, en.ts) e dal registro; font del progetto (Inter Tight, JetBrains Mono).
// Idempotente: un file già uguale non viene riscritto.
// Uso: npm run og-images   (serve il Chromium di Playwright già installato; CHROMIUM_PATH se serve)
import { chromium } from 'playwright-core';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { deflateSync, crc32 } from 'node:zlib';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const fontUrl = (p) => pathToFileURL(join(root, 'node_modules', p)).href;

// --- Dati: registro e dizionari ---------------------------------------------------------------
const registry = read('src/app/tools/tools.registry.ts');
const tools = registry
  .split(/\n  \{\n    id: '/)
  .slice(1)
  .map((block) => ({
    id: block.slice(0, block.indexOf("'")),
    path: /^\s{4}path: '([^']+)'/m.exec(block)?.[1],
    titleKey: /^\s{4}titleKey: '([^']+)'/m.exec(block)?.[1],
    descKey: /^\s{4}descriptionKey: '([^']+)'/m.exec(block)?.[1],
  }));

function dictionary(lang) {
  const src = read(`src/app/core/i18n/${lang}.ts`);
  const dict = new Map();
  const re = /'([\w.-]+)':\s*'((?:[^'\\]|\\.)*)'/g;
  for (const m of src.matchAll(re)) dict.set(m[1], m[2].replace(/\\(.)/g, '$1'));
  return dict;
}
const dicts = { it: dictionary('it'), en: dictionary('en') };

/** Prima frase della descrizione: una riga sola nell'immagine. */
const firstSentence = (s) => {
  const i = s.search(/[.!?](\s|$)/);
  return (i > 0 ? s.slice(0, i) : s).trim();
};

const jobs = [];
for (const lang of ['it', 'en']) {
  for (const t of tools) {
    const d = dicts[lang];
    const title = d.get(t.titleKey);
    const desc = d.get(t.descKey);
    if (!title || !desc) throw new Error(`Testi mancanti per ${t.id} (${lang})`);
    jobs.push({ lang, slug: t.path, title, desc: firstSentence(desc), privacy: d.get('privacy.headline') });
  }
}

// --- Pagina da fotografare ----------------------------------------------------------------------
const logo = `data:image/svg+xml;base64,${Buffer.from(read('public/favicon.svg')).toString('base64')}`;
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const html = (j) => `<!doctype html><html lang="${j.lang}"><head><meta charset="utf-8"><style>
@font-face{font-family:IT;src:url("${fontUrl('@fontsource-variable/inter-tight/files/inter-tight-latin-wght-normal.woff2')}") format("woff2");font-weight:100 900}
@font-face{font-family:JM;src:url("${fontUrl('@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2')}") format("woff2")}
*{box-sizing:border-box}
body{margin:0;width:1200px;height:630px;background:#f7f6f3;color:#1c1c1e;font-family:IT,sans-serif;padding:72px 88px 64px;display:flex;flex-direction:column;justify-content:space-between;-webkit-font-smoothing:antialiased}
.top{display:flex;align-items:center;gap:16px;font-size:28px;font-weight:600;letter-spacing:-.01em}
.top img{width:48px;height:48px}.top span{color:#6b6b70;font-weight:500}
.mid{display:flex;flex-direction:column;gap:24px}
h1{margin:0;font-size:96px;line-height:1;font-weight:600;letter-spacing:-.045em;max-height:300px;overflow:hidden}
p{margin:0;font-size:34px;line-height:1.3;color:#55555a;letter-spacing:-.01em;max-height:90px;overflow:hidden}
.bot{display:flex;justify-content:space-between;align-items:center;border-top:1px solid #e4e2dc;padding-top:26px;font-family:JM,monospace;font-size:20px;color:#55555a}
.dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#1c1c1e;margin-right:12px;vertical-align:middle}
</style></head><body>
<div class="top"><img src="${logo}" alt="">rrstudio <span>tools</span></div>
<div class="mid"><h1 id="t">${esc(j.title)}</h1><p id="d">${esc(j.desc)}</p></div>
<div class="bot"><span><i class="dot"></i>${esc(j.privacy)}</span><span>tools.rrstudio.app</span></div>
</body></html>`;

// Rimpicciolisce titolo e descrizione finché stanno nello spazio (titolo max 3 righe, descrizione max 2)
const fit = () => {
  const fitEl = (el, maxLines, min) => {
    let size = parseFloat(getComputedStyle(el).fontSize);
    const lh = parseFloat(getComputedStyle(el).lineHeight) / size;
    while (size > min && el.scrollHeight > maxLines * size * lh + 1) {
      size -= 2;
      el.style.fontSize = size + 'px';
    }
  };
  fitEl(document.getElementById('t'), 3, 56);
  fitEl(document.getElementById('d'), 2, 26);
};

// --- PNG a palette: il disegno ha pochi colori (carta, inchiostro, sfumature dei bordi dei caratteri) -----
// I 256 colori più frequenti (esatti) formano la palette; gli altri vanno al più vicino. Poi PNG indicizzato.
function toIndexedPng(rgba, width, height) {
  const key = (i) => (rgba[i] << 16) | (rgba[i + 1] << 8) | rgba[i + 2];
  const freq = new Map();
  for (let i = 0; i < rgba.length; i += 4) freq.set(key(i), (freq.get(key(i)) ?? 0) + 1);
  const top = [...freq.entries()].sort((x, y) => y[1] - x[1] || x[0] - y[0]).slice(0, 256).map(([c]) => c);
  const rgb = (c) => [c >> 16, (c >> 8) & 255, c & 255];
  const index = new Map(top.map((c, i) => [c, i]));
  const nearest = (c) => {
    const [r, g, b] = rgb(c);
    let best = 0;
    let bestD = Infinity;
    top.forEach((t, i) => {
      const [tr, tg, tb] = rgb(t);
      const d = (r - tr) ** 2 + (g - tg) ** 2 + (b - tb) ** 2;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    return best;
  };
  const palette = Buffer.from(top.flatMap(rgb));
  const raw = Buffer.alloc((width + 1) * height); // ogni riga inizia con il filtro 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const c = key((y * width + x) * 4);
      let idx = index.get(c);
      if (idx === undefined) {
        idx = nearest(c);
        index.set(c, idx);
      }
      raw[y * (width + 1) + 1 + x] = idx;
    }
  }
  const chunk = (type, data) => {
    const b = Buffer.alloc(12 + data.length);
    b.writeUInt32BE(data.length, 0);
    b.write(type, 4, 'latin1');
    data.copy(b, 8);
    b.writeUInt32BE(crc32(b.subarray(4, 8 + data.length)) >>> 0, 8 + data.length);
    return b;
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bit per indice
  ihdr[9] = 3; // tipo colore: palette
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('PLTE', palette),
    chunk('IDAT', deflateSync(raw, { level: 9, memLevel: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- Esecuzione ---------------------------------------------------------------------------------
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
});
const tmp = join(tmpdir(), `og-images-${process.pid}.html`);
let written = 0;
let total = 0;
let bytes = 0;
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  for (const j of jobs) {
    writeFileSync(tmp, html(j));
    await page.goto(pathToFileURL(tmp).href);
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(`(${fit.toString()})()`);
    // pixel della schermata, letti dal canvas (nessun decodificatore PNG in Node)
    const shot = (await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1200, height: 630 } })).toString('base64');
    const pixels = await page.evaluate(async (b64) => {
      const bmp = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob());
      const cv = new OffscreenCanvas(bmp.width, bmp.height);
      const ctx = cv.getContext('2d');
      ctx.drawImage(bmp, 0, 0);
      const d = ctx.getImageData(0, 0, bmp.width, bmp.height).data;
      let bin = '';
      for (let i = 0; i < d.length; i += 0x8000) bin += String.fromCharCode(...d.subarray(i, i + 0x8000));
      return btoa(bin);
    }, shot);
    const png = toIndexedPng(Buffer.from(pixels, 'base64'), 1200, 630);
    const dir = join(root, 'public/og', j.lang);
    mkdirSync(dir, { recursive: true });
    const file = join(dir, `${j.slug}.png`);
    if (!existsSync(file) || !readFileSync(file).equals(png)) {
      writeFileSync(file, png);
      written++;
    }
    total++;
    bytes += png.length;
    if (png.length > 60 * 1024) console.warn(`Più di 60 KB: ${j.lang}/${j.slug}.png (${Math.round(png.length / 1024)} KB)`);
  }
} finally {
  await browser.close();
}
console.log(`${total} immagini (${written} scritte), media ${Math.round(bytes / total / 1024)} KB`);
