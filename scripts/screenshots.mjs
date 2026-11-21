// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 rrstudio — rrstudio tools
// Genera gli screenshot in docs/screenshots/ servendo dist/rrstudio-tools/browser in locale.
// Uso: npm run build && npm run screenshots   (serve Chromium di Playwright già installato)
// Con --check (npm run e2e) esegue tutte le interazioni ma non scrive nulla; exit 1 se una pagina
// dà errori in console, fa richieste esterne o un'interazione fallisce.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PDFDocument, PDFName, StandardFonts, decodePDFRawStream, rgb, PDFRawStream } from 'pdf-lib';

const HOST = process.env.HOST ?? '127.0.0.1';
const PORT = 4377;
const base = `http://${HOST}:${PORT}`;
const out = 'docs/screenshots';
const CHECK = process.argv.includes('--check') || process.env.CHECK === '1';
if (!CHECK) mkdirSync(out, { recursive: true });

// Server statico temporaneo, fermato per PID al termine
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', HOST], {
  cwd: 'dist/rrstudio-tools/browser',
  stdio: 'ignore',
});
await new Promise((r) => setTimeout(r, 1000));
// il server va fermato anche se qualcosa fallisce più avanti
process.on('exit', () => server.kill());

// rete di sicurezza (15 minuti: con oltre 100 strumenti il giro completo supera i 5): se qualcosa si blocca lo script finisce comunque e ferma il server
const watchdog = setTimeout(() => {
  console.error('Timeout: screenshot interrotti dopo 15 minuti');
  server.kill();
  process.exit(1);
}, 15 * 60 * 1000);
watchdog.unref();

let browser;
try {
  // http su un IP non è un contesto sicuro: senza questo flag crypto.subtle (hash) non esisterebbe
  browser = await chromium.launch({
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
    args: [`--unsafely-treat-insecure-origin-as-secure=${base}`],
  });
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
// Ogni page.goto aspetta che l'app sia idratata (marcatore data-hydrated su <html>, messo da App quando l'app è stabile):
// le pagine statiche sono già visibili prima, ma input ed eventi (fill, setInputFiles, clic) si perdono finché Angular non è partito.
// È la causa dell'instabilità sotto carico (con E2E_SLOW_JS=2500 si riproduce sempre).
const newContext = browser.newContext.bind(browser);
browser.newContext = async (opts) => {
  const ctx = await newContext(opts);
  const newPage = ctx.newPage.bind(ctx);
  ctx.newPage = async () => {
    const p = await newPage();
    const goto = p.goto.bind(p);
    p.goto = async (url, o) => {
      const r = await goto(url, o);
      await p.waitForSelector('html[data-hydrated]', { state: 'attached', timeout: 20000 }).catch(() => undefined);
      return r;
    };
    return p;
  };
  return ctx;
};
const errors = [];
try {
  // ONLY=home-light.png,base64.png limita gli screenshot a quelli elencati
  const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
  /**
   * Aspetta che l'elemento abbia il testo (o il valore, per input e textarea) atteso. Dopo un clic il DOM si aggiorna con ritardo e il
   * valore precedente resta in pagina: sulla CI, più lenta, si legge quello vecchio. Se il valore non arriva, l'errore riporta cosa c'è.
   */
  async function expectValue(page, selector, expected, what = selector, timeout = 5000) {
    // la funzione gira nel browser: deve bastare a sé stessa (niente variabili di questo file)
    const read = ([sel]) => {
      const el = document.querySelector(sel);
      return (el && 'value' in el ? el.value : (el?.textContent ?? '')).trim();
    };
    await page.waitForFunction(`(${read})(${JSON.stringify([selector])}) === ${JSON.stringify(expected)}`, null, { timeout }).catch(() => {});
    const got = await page.evaluate(read, [selector]);
    if (got !== expected) throw new Error(`${what}: atteso «${expected}», trovato «${got}»`);
  }

  async function shot(name, { width, dark, path = '/', setup }) {
    if (only && !only.includes(name)) return;
    const ctx = await browser.newContext({
      viewport: { width, height: 900 },
      colorScheme: dark ? 'dark' : 'light',
      locale: 'it-IT',
    });
    // E2E_SLOW_JS=<ms>: rallenta ogni script per riprodurre un avvio lento (server sotto carico)
    if (process.env.E2E_SLOW_JS) await ctx.route(/\.js(\?.*)?$/, async (route) => (await new Promise((r) => setTimeout(r, Number(process.env.E2E_SLOW_JS))), route.continue()));
    const page = await ctx.newPage();
    page.setDefaultTimeout(20000);
    const prefix = `[${name}] `;
    page.on('request', (r) => !/^(blob:|data:)/.test(r.url()) && !r.url().startsWith(base) && errors.push(prefix + 'richiesta esterna: ' + r.url()));
    page.on('console', (m) => m.type() === 'error' && errors.push(prefix + m.text()));
    page.on('pageerror', (e) => errors.push(prefix + e.message));
    try {
      await page.goto(base + path);
      await page.waitForTimeout(900); // animazione d'ingresso delle sezioni
      if (setup) await setup(page);
      if (!CHECK) await page.screenshot({ path: join(out, name), fullPage: true });
    } catch (e) {
      // un'interazione fallita non ferma gli altri: viene riportata alla fine con exit 1
      errors.push(prefix + 'interazione fallita: ' + (process.env.E2E_VERBOSE ? e.message + ' @' + (/screenshots\.mjs:(\d+)/.exec(e.stack ?? '')?.[1] ?? '?') + ' ' + (e.stack ?? '').split('\n').slice(1, 4).join(' | ').slice(0, 300) : e.message.split('\n')[0]));
    }
    await ctx.close();
  }
  const csvSample = async (page) => {
    await page.getByRole('button', { name: /dati di esempio/i }).click();
    await page.waitForSelector('app-kpi-cards .kpi');
    await page.waitForTimeout(1200); // animazioni dei grafici
  };
  const csv = { path: '/csv-dashboard/', setup: csvSample };
  await shot('home-light.png', { width: 1280, dark: false });
  await shot('home-dark.png', { width: 1280, dark: true });
  await shot('home-mobile.png', { width: 390, dark: false });
  await shot('dashboard-light.png', { width: 1280, dark: false, ...csv });
  await shot('dashboard-dark.png', { width: 1280, dark: true, ...csv });
  await shot('dashboard-mobile.png', { width: 390, dark: false, ...csv });
  // Tool di testo: tema chiaro, con un input d'esempio già inserito
  await shot('base64.png', {
    width: 1280,
    dark: false,
    path: '/base64/',
    setup: async (page) => {
      await page.fill('#b64-in', 'Ciao àèì: Base64 senza uscire dal browser.');
    },
  });
  await shot('url-encode.png', {
    width: 1280,
    dark: false,
    path: '/url-encode/',
    setup: async (page) => {
      await page.getByRole('button', { name: 'Decodifica', exact: true }).click();
      await page.fill('#url-in', 'https://example.com/cerca/caff%C3%A8?q=pizza+e+caff%C3%A8&lingua=it&tag=a%26b#risultati');
    },
  });
  // Immagini di esempio disegnate al volo con un canvas (nessun file scaricato)
  const sampleImages = async (page) => {
    const files = await page.evaluate(async () => {
      // conversione a ciclo: lo spread su un array di ~1 MB manda in stack overflow
      const toB64 = async (c, type, q) => {
        const blob = await new Promise((res) => c.toBlob(res, type, q));
        const bytes = new Uint8Array(await blob.arrayBuffer());
        let s = '';
        for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
        return btoa(s);
      };
      const photo = document.createElement('canvas');
      photo.width = 2400;
      photo.height = 1600;
      const g = photo.getContext('2d');
      const sky = g.createLinearGradient(0, 0, 0, 1600);
      sky.addColorStop(0, '#2b5a8a');
      sky.addColorStop(0.6, '#e8b27a');
      sky.addColorStop(1, '#3d5a3a');
      g.fillStyle = sky;
      g.fillRect(0, 0, 2400, 1600);
      for (let i = 0; i < 9000; i++) {
        g.fillStyle = `rgba(${(Math.random() * 255) | 0},${(Math.random() * 255) | 0},${(Math.random() * 255) | 0},0.35)`;
        g.fillRect(Math.random() * 2400, Math.random() * 1600, 6 + Math.random() * 30, 6 + Math.random() * 30);
      }
      g.fillStyle = '#1c2b1f';
      g.beginPath();
      g.moveTo(0, 1200);
      for (let x = 0; x <= 2400; x += 120) g.lineTo(x, 1000 + Math.sin(x / 300) * 160);
      g.lineTo(2400, 1600);
      g.lineTo(0, 1600);
      g.fill();
      const logo = document.createElement('canvas');
      logo.width = logo.height = 800;
      const l = logo.getContext('2d');
      l.fillStyle = '#d9480f';
      l.beginPath();
      l.arc(400, 400, 360, 0, 7);
      l.fill();
      l.fillStyle = '#fff';
      l.font = 'bold 300px sans-serif';
      l.textAlign = 'center';
      l.fillText('rr', 400, 480);
      const shot = document.createElement('canvas');
      shot.width = 1600;
      shot.height = 900;
      const s = shot.getContext('2d');
      s.fillStyle = '#f1f3f5';
      s.fillRect(0, 0, 1600, 900);
      for (let i = 0; i < 12; i++) {
        s.fillStyle = i % 2 ? '#4c6ef5' : '#adb5bd';
        s.fillRect(100 + i * 110, 800 - (i * 53) % 500 - 100, 80, (i * 53) % 500 + 100);
      }
      return [
        { name: 'paesaggio.jpg', mimeType: 'image/jpeg', b64: await toB64(photo, 'image/jpeg', 0.95) },
        { name: 'logo.png', mimeType: 'image/png', b64: await toB64(logo, 'image/png') },
        { name: 'grafico.png', mimeType: 'image/png', b64: await toB64(shot, 'image/png') },
      ];
    });
    await page.setInputFiles(
      'input[type=file]',
      files.map((f) => ({ name: f.name, mimeType: f.mimeType, buffer: Buffer.from(f.b64, 'base64') })),
    );
    await page.selectOption('#ic-format', 'webp');
    await page.waitForFunction(() => document.querySelectorAll('.row[data-status="done"]').length === 3, null, { timeout: 30000 });
    await page.waitForTimeout(400);
  };
  await shot('image-compressor.png', { width: 1280, dark: false, path: '/image-compressor/', setup: sampleImages });
  // PDF di esempio creati al volo con pdf-lib (nessun file scaricato): pagine di testo e colori diversi
  const makePdf = async (title, label, palette, pages) => {
    const doc = await PDFDocument.create();
    doc.setTitle(title);
    const font = await doc.embedFont(StandardFonts.HelveticaBold);
    const body = await doc.embedFont(StandardFonts.Helvetica);
    for (let n = 1; n <= pages; n++) {
      const page = doc.addPage(n % 3 === 0 ? [842, 595] : [595, 842]);
      const { width, height } = page.getSize();
      const [r, g, b] = palette[(n - 1) % palette.length];
      page.drawRectangle({ x: 0, y: height - 140, width, height: 140, color: rgb(r, g, b) });
      page.drawText(label, { x: 40, y: height - 85, size: 36, font, color: rgb(1, 1, 1) });
      page.drawText(`Pagina ${n}`, { x: 40, y: height - 200, size: 28, font, color: rgb(0.1, 0.1, 0.12) });
      for (let k = 0; k < 14; k++) {
        page.drawText('Testo di esempio per la miniatura: righe di prova del documento.', {
          x: 40,
          y: height - 250 - k * 22,
          size: 12,
          font: body,
          color: rgb(0.35, 0.35, 0.38),
        });
      }
      page.drawRectangle({ x: 40, y: 60, width: width - 80, height: 70, color: rgb(r, g, b), opacity: 0.25 });
    }
    return Buffer.from(await doc.save());
  };
  const samplePdfs = async (page) => {
    const a = await makePdf('Contratto di esempio', 'Contratto', [[0.7, 0.33, 0.16], [0.75, 0.5, 0.1], [0.55, 0.3, 0.2]], 4);
    const b = await makePdf('Allegati di esempio', 'Allegati', [[0.18, 0.43, 0.62], [0.2, 0.5, 0.45]], 3);
    await page.setInputFiles('input[type=file]', [
      { name: 'contratto.pdf', mimeType: 'application/pdf', buffer: a },
      { name: 'allegati.pdf', mimeType: 'application/pdf', buffer: b },
    ]);
    await page.waitForFunction(() => document.querySelectorAll('.card .thumb img').length === 7, null, { timeout: 30000 });
    await page.getByRole('button', { name: 'Ruota la pagina 2 a destra' }).click();
    await page.getByRole('checkbox', { name: /Seleziona la pagina 5/ }).check();
    await page.getByRole('checkbox', { name: /Seleziona la pagina 6/ }).check();
    await page.waitForTimeout(500);
  };
  await shot('pdf-tools.png', { width: 1280, dark: false, path: '/pdf-tools/', setup: samplePdfs });
  await shot('json-formatter.png', {
    width: 1280,
    dark: false,
    path: '/json-formatter/',
    setup: async (page) => {
      await page.getByRole('button', { name: 'Prova con un esempio' }).click();
    },
  });
  // JSON Viewer: esempio caricato (albero aperto al livello 3) e un nodo selezionato, con percorso nel pannello
  await shot('json-viewer.png', {
    width: 1280,
    dark: false,
    path: '/json-viewer/',
    setup: async (page) => {
      await page.getByRole('button', { name: 'Prova con un esempio' }).click();
      await page.waitForSelector('.tree .row');
      await page.locator('.tree .row', { hasText: 'Mario Rossi' }).first().click();
      await page.waitForTimeout(300);
    },
  });
  // XML viewer: esempio, selezione, modifica (tag, attributo, testo), annulla/ripeti, ricerca e vista Testo
  await shot('xml-viewer.png', {
    width: 1280,
    dark: false,
    path: '/xml-viewer/',
    setup: async (page) => {
      const must = (c, msg) => {
        if (!c) throw new Error('xml-viewer: ' + msg);
      };
      await page.getByRole('button', { name: 'Prova con un esempio' }).click();
      await page.waitForSelector('.tree .row');
      must((await page.locator('.tree .row').count()) >= 6, 'albero troppo corto');
      await page.locator('.tree .row', { hasText: 'Il nome della rosa' }).first().click();
      await page.waitForTimeout(200);
      must(/\/biblioteca\/libro\[2\]\/titolo/.test(await page.locator('.facts code').first().innerText()), 'XPath');
      // rinomina il tag di un libro
      await page.locator('.tree .row', { hasText: 'b1' }).first().click();
      await page.fill('#xv-tag', 'volume');
      await page.press('#xv-tag', 'Enter');
      await page.waitForFunction(() => document.querySelector('.tree')?.textContent.includes('volume'));
      // tag non valido: rifiutato con messaggio e valore ripristinato
      await page.fill('#xv-tag', '1x');
      await page.press('#xv-tag', 'Enter');
      await page.waitForSelector('.tool-error');
      must((await page.inputValue('#xv-tag')) === 'volume', 'valore non ripristinato');
      // testo di un elemento
      await page.locator('.tree .row', { hasText: 'I promessi sposi' }).first().click();
      await page.fill('#xv-content', 'Titolo <nuovo> & prova');
      await page.press('#xv-content', 'Tab');
      await page.waitForFunction(() => document.querySelector('.tree')?.textContent.includes('Titolo <nuovo> & prova'));
      // annulla e ripeti
      await page.getByRole('button', { name: 'Annulla' }).click();
      await page.waitForFunction(() => !document.querySelector('.tree')?.textContent.includes('Titolo <nuovo>'));
      await page.getByRole('button', { name: 'Ripeti' }).click();
      await page.waitForFunction(() => document.querySelector('.tree')?.textContent.includes('Titolo <nuovo> & prova'));
      // query XPath: i risultati portano al nodo
      await page.fill('#xv-xp', "//libro[@id='b3']/autore");
      await page.press('#xv-xp', 'Enter');
      await page.waitForSelector('.xp-item');
      await page.locator('.xp-item').first().click();
      await page.waitForFunction(() => document.querySelector('.row.sel')?.textContent.includes('Italo Calvino'));
      await page.fill('#xv-xp', 'count(//autore)');
      await page.press('#xv-xp', 'Enter');
      await page.waitForFunction(() => document.querySelector('.xp-value code')?.textContent === '3');
      // ricerca
      await page.fill('#xv-search', 'calvino');
      await page.waitForFunction(() => document.querySelector('.search-count')?.textContent.includes('1 di 1'));
      // vista Testo: il documento modificato, con le entità
      await page.getByRole('button', { name: 'Testo', exact: true }).click();
      const t = await page.inputValue('#xv-text');
      must(t.includes('<volume id="b1"') && t.includes('Titolo &lt;nuovo&gt; &amp; prova'), 'testo non aggiornato: ' + t.slice(0, 120));
      must(await page.locator('.tool-ok').count() > 0, 'messaggio ben formato');
      // errore di buona formazione nel testo: la vista Albero non si apre
      await page.fill('#xv-text', '<a><b></a>');
      await page.waitForSelector('.tool-error');
      await page.getByRole('button', { name: 'Albero', exact: true }).click();
      must((await page.locator('#xv-text').count()) === 1, 'è passato all\'albero con un XML non valido');
      await page.fill('#xv-text', '<?xml version="1.0"?><r a="1"><x/></r>');
      await page.getByRole('button', { name: 'Albero', exact: true }).click();
      await page.waitForSelector('.tree .row');
      await page.getByRole('button', { name: 'Aggiungi elemento' }).click();
      await page.waitForFunction(() => document.querySelectorAll('.tree .row').length >= 3);
      await page.locator('.tree .row', { hasText: 'r' }).first().click();
      await page.waitForTimeout(150);
      // file grande (30000 elementi): rendering a finestra, nel DOM poche righe, nessun troncamento, si arriva fino all'ultimo
      await page.getByRole('button', { name: 'Testo', exact: true }).click();
      await page.fill('#xv-text', '<r>' + Array.from({ length: 30000 }, (_, i) => `<i n="${i}">v${i}</i>`).join('') + '</r>');
      await page.getByRole('button', { name: 'Albero', exact: true }).click();
      await page.waitForSelector('.tree .row');
      const rowsInDom = await page.locator('.tree .row').count();
      must(rowsInDom > 5 && rowsInDom < 120, 'righe nel DOM con 30000 elementi: ' + rowsInDom);
      must(!(await page.locator('.tree').innerText()).includes('molto grande'), 'albero troncato con 30000 elementi');
      await page.locator('.tree').focus();
      await page.keyboard.press('End');
      await page.waitForFunction(() => document.querySelector('.tree .row.sel')?.textContent.includes('v29999'));
      must((await page.locator('.tree .row').count()) < 120, 'dopo End le righe nel DOM sono troppe');
      await page.keyboard.press('Home');
      await page.waitForFunction(() => document.querySelector('.tree .row.sel')?.textContent.includes('<r>') || document.querySelector('.tree .row.sel')?.textContent.trim().startsWith('r'));
      // ritorna all'esempio per lo screenshot
      await page.getByRole('button', { name: 'Prova con un esempio' }).click();
      await page.locator('.tree .row', { hasText: 'Umberto Eco' }).first().click();
      await page.waitForTimeout(300);
    },
  });
  // Confronto XML: esempio con aggiunte, rimozioni e modifiche
  await shot('xml-diff.png', {
    width: 1280,
    dark: false,
    path: '/xml-diff/',
    setup: async (page) => {
      await page.getByRole('button', { name: 'Esempio' }).click();
      await page.waitForSelector('.changes .chg');
      const text = await page.locator('.changes').innerText();
      for (const part of ['/catalogo/libro[1]', '/catalogo/libro[3]/note', 'versione', '13.50'])
        if (!text.includes(part)) throw new Error('xml-diff: manca ' + part + ' in ' + text.slice(0, 200));
      await page.fill('#xd-b', await page.inputValue('#xd-a'));
      await page.waitForSelector('.tool-ok');
      if ((await page.locator('.changes .chg').count()) !== 0) throw new Error('xml-diff: documenti uguali con differenze');
      await page.getByRole('button', { name: 'Esempio' }).click();
      await page.waitForSelector('.changes .chg');
    },
  });
  // Da XML a tabella: record scelto, colonne, CSV
  await shot('xml-to-csv.png', {
    width: 1280,
    dark: false,
    path: '/xml-to-csv/',
    setup: async (page) => {
      await page.getByRole('button', { name: 'Esempio' }).click();
      await page.waitForSelector('.scroll table tbody tr');
      const head = await page.locator('.scroll thead').innerText();
      for (const c of ['@id', 'titolo', 'prezzo/@valuta'])
        if (!head.includes(c)) throw new Error('xml-to-csv: manca la colonna ' + c);
      if ((await page.locator('.scroll tbody tr').count()) !== 3) throw new Error('xml-to-csv: righe');
      await page.selectOption('.out-bar select', ';');
      await page.waitForTimeout(300);
    },
  });
  // XML ↔ JSON: andata, JSON, ritorno con «Inverti»
  await shot('xml-json-converter.png', {
    width: 1280,
    dark: false,
    path: '/xml-json-converter/',
    setup: async (page) => {
      await page.getByRole('button', { name: 'Esempio' }).click();
      await page.waitForFunction(() => document.querySelector('[data-testid=xj-out]')?.value.includes('"@id": "1"'));
      const json = JSON.parse(await page.inputValue('[data-testid=xj-out]'));
      if (json.catalogo.libro.length !== 2 || json.catalogo.libro[0].prezzo['#text'] !== '12.50') throw new Error('xml-json: struttura inattesa');
      await page.getByLabel('Numeri e booleani').check();
      await page.waitForFunction(() => document.querySelector('[data-testid=xj-out]')?.value.includes('"@id": 1'));
      await page.getByLabel('Numeri e booleani').uncheck();
      await page.getByRole('button', { name: 'Inverti', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('[data-testid=xj-out]')?.value.startsWith('<?xml'));
      const xml = await page.inputValue('[data-testid=xj-out]');
      if (!xml.includes('<libro id="1" disponibile="true">') || !xml.includes('<prezzo valuta="EUR">12.50</prezzo>')) throw new Error('xml-json: ritorno inatteso ' + xml.slice(0, 200));
      await page.fill('#xj-in', '{"a b": 1}');
      await page.waitForSelector('[data-testid=xj-error]');
      await page.getByRole('button', { name: 'Esempio' }).click();
      await page.waitForSelector('.tool-ok');
    },
  });
  // Visualizzatore HTML/DOM: albero, query CSS e XPath, nodo scelto con i suoi percorsi
  await shot('html-dom-viewer.png', {
    width: 1280,
    dark: false,
    path: '/html-dom-viewer/',
    setup: async (page) => {
      await page.getByRole('button', { name: 'Esempio' }).click();
      await page.waitForSelector('[data-testid=hd-stats]');
      if (!(await page.locator('[role=tree]').innerText()).includes('article')) throw new Error('html-dom: albero senza article');
      await page.fill('#hd-q', 'article.post h2');
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.querySelector('[data-testid=hd-q-count]')?.textContent?.includes('2 nodi'));
      await page.locator('.xp-item', { hasText: 'h2' }).nth(1).click();
      await page.waitForSelector('[data-testid=hd-html]');
      if (!(await page.locator('[data-testid=hd-html]').innerText()).includes('Secondo')) throw new Error('html-dom: nodo scelto inatteso');
      const panel = await page.locator('section.panel').innerText();
      if (!panel.includes('/html/body/main/article[2]/h2') || !panel.includes('article:nth-of-type(2) > h2')) throw new Error('html-dom: percorsi ' + panel.slice(0, 300));
      await page.getByRole('button', { name: 'XPath', exact: true }).click();
      await page.fill('#hd-q', 'count(//li)');
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.querySelector('.xp-value code')?.textContent === '3');
      await page.fill('#hd-q', '//li[');
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.querySelector('[data-testid=hd-q-count]')?.textContent?.includes('non valida'));
      await page.fill('#hd-q', '//a[@class="on"]/@href');
      await page.keyboard.press('Enter');
      await page.locator('.xp-item', { hasText: '@href' }).waitFor();
      await page.locator('[role=tree]').focus();
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(200);
    },
  });
  // Editor YAML/TOML ad albero: esempio, ricerca, modifica con annulla, passaggio a TOML
  await shot('yaml-viewer.png', {
    width: 1280,
    dark: false,
    path: '/yaml-viewer/',
    setup: async (page) => {
      await page.getByRole('button', { name: 'Prova con un esempio' }).click();
      await page.waitForSelector('[role=tree]');
      const tree = async () => page.locator('[role=tree]').innerText();
      if (!(await tree()).includes('servizio')) throw new Error('yaml-viewer: albero senza servizio');
      await page.fill('#yv-search', 'Anna');
      await page.waitForFunction(() => document.querySelector('.search-count')?.textContent?.includes('1'));
      await page.getByRole('button', { name: 'Elimina' }).click().catch(() => {});
      await page.getByRole('button', { name: 'Testo', exact: true }).click();
      const yaml = await page.locator('#yv-text').inputValue();
      if (!yaml.includes('ambiente:')) throw new Error('yaml-viewer: testo YAML inatteso');
      await page.getByRole('button', { name: 'TOML', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('#yv-text')?.value.includes('[ambiente]'));
      if (!(await page.locator('#yv-text').inputValue()).includes('[[utenti]]')) throw new Error('yaml-viewer: TOML senza [[utenti]]');
      await page.getByRole('button', { name: 'Albero', exact: true }).click();
      await page.waitForSelector('[role=tree]');
    },
  });
  // Confronto YAML e CSV: esempio YAML con liste per chiave, poi CSV con colonna chiave
  await shot('yaml-csv-diff.png', {
    width: 1280,
    dark: false,
    path: '/yaml-csv-diff/',
    setup: async (page) => {
      await page.getByRole('button', { name: 'Esempio' }).click();
      await page.waitForSelector('[data-testid=yc-summary]');
      const list = await page.locator('.changes').innerText();
      if (!list.includes('repliche') || !list.includes('utenti')) throw new Error('yaml-csv-diff: elenco YAML ' + list.slice(0, 200));
      await page.fill('#yc-a', 'a: [1\n');
      await page.waitForSelector('[data-testid=yc-error]');
      await page.getByRole('button', { name: 'CSV', exact: true }).click();
      await page.getByRole('button', { name: 'Esempio' }).click();
      await page.waitForFunction(() => document.querySelector('.changes')?.textContent?.includes('[id=1].prezzo'));
      const csv = await page.locator('.changes').innerText();
      if (!csv.includes('iva') || !csv.includes('[id=4]')) throw new Error('yaml-csv-diff: elenco CSV ' + csv.slice(0, 200));
      await page.fill('#yc-keycols', 'sku');
      await page.waitForSelector('[data-testid=yc-error]');
      await page.fill('#yc-keycols', 'id');
      await page.waitForSelector('[data-testid=yc-summary]');
    },
  });
  // JSON Schema ↔ XSD: esempio con avviso, inversione e ritorno
  await shot('json-schema-xsd.png', {
    width: 1280,
    dark: false,
    path: '/json-schema-xsd/',
    setup: async (page) => {
      await page.getByRole('button', { name: 'Esempio' }).click();
      await page.waitForSelector('[data-testid=sx-ok]');
      const xsd = await page.locator('[data-testid=sx-out]').inputValue();
      if (!xsd.includes('<xs:element name="ordine">') || !xsd.includes('maxOccurs="unbounded"')) throw new Error('json-schema-xsd: XSD inatteso ' + xsd.slice(0, 200));
      if (!(await page.locator('[data-testid=sx-warnings]').innerText()).includes('uniqueItems')) throw new Error('json-schema-xsd: manca l\'avviso uniqueItems');
      await page.getByRole('button', { name: 'Inverti' }).click();
      await page.waitForFunction(() => document.querySelector('[data-testid=sx-out]')?.value.includes('"$schema"'));
      const js = await page.locator('[data-testid=sx-out]').inputValue();
      if (!js.includes('"@n"') || !js.includes('"ordine"')) throw new Error('json-schema-xsd: JSON Schema inatteso');
      await page.fill('#sx-in', '<a/>');
      await page.waitForSelector('[data-testid=sx-error]');
    },
  });
  // Dati di prova da schema: esempio JSON Schema, seme ripetibile, XML e CSV
  await shot('schema-test-data.png', {
    width: 1280,
    dark: false,
    path: '/schema-test-data/',
    setup: async (page) => {
      await page.getByRole('button', { name: 'Esempio' }).click();
      await page.waitForSelector('[data-testid=st-ok]');
      const first = await page.locator('[data-testid=st-out]').inputValue();
      const rec = JSON.parse(first);
      if (!Array.isArray(rec) || rec.length !== 5 || !/^[A-Z]{3}-\d{4}$/.test(rec[0].codice)) throw new Error('schema-test-data: record inattesi');
      await page.fill('#st-seed', '9999');
      await page.waitForFunction((f) => document.querySelector('[data-testid=st-out]')?.value !== f, first);
      await page.fill('#st-seed', '1234');
      await page.waitForFunction((f) => document.querySelector('[data-testid=st-out]')?.value === f, first);
      await page.getByRole('button', { name: 'CSV', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('[data-testid=st-out]')?.value.startsWith('id,nome'));
      await page.getByRole('button', { name: 'XML', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('[data-testid=st-out]')?.value.includes('<records>'));
      await page.getByRole('button', { name: 'JSON', exact: true }).click();
      await page.fill('#st-in', '{"type": ');
      await page.waitForSelector('[data-testid=st-error]');
      await page.getByRole('button', { name: 'Esempio' }).click();
      await page.waitForSelector('[data-testid=st-ok]');
    },
  });
  // Validatore XSD: esempio con più problemi
  await shot('xsd-validator.png', {
    width: 1280,
    dark: false,
    path: '/xsd-validator/',
    setup: async (page) => {
      await page.getByRole('button', { name: 'Esempio' }).click();
      await page.waitForSelector('.issues li');
      const t = await page.locator('.issues').innerText();
      for (const part of ['/ordine/@data', '/ordine/riga[2]/@codice', '/ordine/riga[2]/quantita', '/ordine/nota'])
        if (!t.includes(part)) throw new Error('xsd-validator: manca ' + part + ' in ' + t.slice(0, 300));
      await page.fill('#xsd-xml', '<ordine data="2026-11-19"><cliente>A</cliente><riga codice="AB123"><prodotto>P</prodotto><quantita>2</quantita><prezzo>1.50</prezzo></riga></ordine>');
      await page.waitForSelector('.tool-ok');
      await page.getByRole('button', { name: 'Esempio' }).click();
      await page.waitForSelector('.issues li');
    },
  });
  await shot('password-generator.png', {
    width: 1280,
    dark: false,
    path: '/password-generator/',
    setup: async (page) => {
      await page.waitForFunction(() => document.querySelector('#pw-out')?.textContent.trim().length > 0);
      await page.getByRole('button', { name: 'Genera 10' }).click();
      await page.waitForSelector('[data-testid=pw-list] code');
    },
  });
  await shot('hash-generator.png', {
    width: 1280,
    dark: false,
    path: '/hash-generator/',
    setup: async (page) => {
      await page.fill('#hash-in', 'abc');
      await page.fill('#hash-cmp', 'BA7816BF 8F01CFEA414140DE5DAE2223B00361A396177A9CB410FF61F20015AD');
      await page.waitForSelector('article.match');
    },
  });
  // Dati inventati: Mario Rossi, nato a Roma il 01/01/1980
  await shot('codice-fiscale.png', {
    width: 1280,
    dark: false,
    path: '/codice-fiscale/',
    setup: async (page) => {
      await page.fill('#cf-surname', 'Rossi');
      await page.fill('#cf-name', 'Mario');
      await page.getByLabel('Maschio').check();
      await page.fill('#cf-date', '1980-01-01');
      await page.getByRole('combobox').focus();
      await page.keyboard.type('Roma', { delay: 80 });
      await page.waitForTimeout(300);
      await page.keyboard.press('Enter');
      await page.waitForSelector('[data-testid=cf-code]');
    },
  });
  await shot('iban-partita-iva.png', {
    width: 1280,
    dark: false,
    path: '/iban-partita-iva/',
    setup: async (page) => {
      await page.fill('#ibv-input', 'IT60 X054 2811 1010 0000 0123 456');
      await page.waitForSelector('[data-testid=ibv-it]');
    },
  });
  // ---- Fattura elettronica: fattura inventata (nessun dato reale) ----
  const sampleInvoice = `<?xml version="1.0" encoding="UTF-8"?>
<p:FatturaElettronica versione="FPR12" xmlns:p="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2">
<FatturaElettronicaHeader>
<DatiTrasmissione><IdTrasmittente><IdPaese>IT</IdPaese><IdCodice>09999999999</IdCodice></IdTrasmittente><ProgressivoInvio>00042</ProgressivoInvio><FormatoTrasmissione>FPR12</FormatoTrasmissione><CodiceDestinatario>ABC1234</CodiceDestinatario></DatiTrasmissione>
<CedentePrestatore><DatiAnagrafici><IdFiscaleIVA><IdPaese>IT</IdPaese><IdCodice>09999999999</IdCodice></IdFiscaleIVA><Anagrafica><Denominazione>Alfa Servizi di Prova S.r.l.</Denominazione></Anagrafica><RegimeFiscale>RF01</RegimeFiscale></DatiAnagrafici><Sede><Indirizzo>Via dei Campioni</Indirizzo><NumeroCivico>10</NumeroCivico><CAP>00100</CAP><Comune>Roma</Comune><Provincia>RM</Provincia><Nazione>IT</Nazione></Sede></CedentePrestatore>
<CessionarioCommittente><DatiAnagrafici><IdFiscaleIVA><IdPaese>IT</IdPaese><IdCodice>08888888888</IdCodice></IdFiscaleIVA><Anagrafica><Denominazione>Beta Costruzioni di Esempio S.p.A.</Denominazione></Anagrafica></DatiAnagrafici><Sede><Indirizzo>Via Fittizia</Indirizzo><NumeroCivico>5</NumeroCivico><CAP>20100</CAP><Comune>Milano</Comune><Provincia>MI</Provincia><Nazione>IT</Nazione></Sede></CessionarioCommittente>
</FatturaElettronicaHeader>
<FatturaElettronicaBody>
<DatiGenerali><DatiGeneraliDocumento><TipoDocumento>TD01</TipoDocumento><Divisa>EUR</Divisa><Data>2026-03-15</Data><Numero>2026/0042</Numero><ImportoTotaleDocumento>470.90</ImportoTotaleDocumento><Causale>Servizi di consulenza di esempio, marzo 2026.</Causale></DatiGeneraliDocumento><DatiOrdineAcquisto><IdDocumento>ORD-7788</IdDocumento><Data>2026-02-20</Data></DatiOrdineAcquisto></DatiGenerali>
<DatiBeniServizi>
<DettaglioLinee><NumeroLinea>1</NumeroLinea><Descrizione>Consulenza oraria</Descrizione><Quantita>10.00</Quantita><UnitaMisura>ore</UnitaMisura><PrezzoUnitario>30.00</PrezzoUnitario><PrezzoTotale>300.00</PrezzoTotale><AliquotaIVA>22.00</AliquotaIVA></DettaglioLinee>
<DettaglioLinee><NumeroLinea>2</NumeroLinea><Descrizione>Materiale di consumo</Descrizione><Quantita>4.00</Quantita><PrezzoUnitario>12.50</PrezzoUnitario><ScontoMaggiorazione><Tipo>SC</Tipo><Percentuale>10.00</Percentuale></ScontoMaggiorazione><PrezzoTotale>45.00</PrezzoTotale><AliquotaIVA>22.00</AliquotaIVA></DettaglioLinee>
<DettaglioLinee><NumeroLinea>3</NumeroLinea><Descrizione>Formazione esente</Descrizione><PrezzoUnitario>50.00</PrezzoUnitario><PrezzoTotale>50.00</PrezzoTotale><AliquotaIVA>0.00</AliquotaIVA><Natura>N4</Natura></DettaglioLinee>
<DatiRiepilogo><AliquotaIVA>22.00</AliquotaIVA><ImponibileImporto>345.00</ImponibileImporto><Imposta>75.90</Imposta><EsigibilitaIVA>I</EsigibilitaIVA></DatiRiepilogo>
<DatiRiepilogo><AliquotaIVA>0.00</AliquotaIVA><Natura>N4</Natura><ImponibileImporto>50.00</ImponibileImporto><Imposta>0.00</Imposta><RiferimentoNormativo>Art. 10 DPR 633/72</RiferimentoNormativo></DatiRiepilogo>
</DatiBeniServizi>
<DatiPagamento><CondizioniPagamento>TP02</CondizioniPagamento><DettaglioPagamento><ModalitaPagamento>MP05</ModalitaPagamento><DataScadenzaPagamento>2026-04-14</DataScadenzaPagamento><ImportoPagamento>470.90</ImportoPagamento><IBAN>IT00A0000000000000000000000</IBAN></DettaglioPagamento></DatiPagamento>
<Allegati><NomeAttachment>condizioni.txt</NomeAttachment><FormatoAttachment>TXT</FormatoAttachment><Attachment>${Buffer.from('Allegato di esempio').toString('base64')}</Attachment></Allegati>
</FatturaElettronicaBody>
</p:FatturaElettronica>`;
  await shot('fattura-elettronica.png', {
    width: 1280,
    dark: false,
    path: '/fattura-elettronica/',
    setup: async (page) => {
      await page.setInputFiles('input[type=file]', [{ name: 'fattura-esempio.xml', mimeType: 'text/xml', buffer: Buffer.from(sampleInvoice) }]);
      await page.waitForSelector('[data-testid=fe-invoice]');
    },
  });

  // ---- Immagini <-> PDF: immagini disegnate al volo ----
  const drawImages = async (page) => {
    const files = await page.evaluate(async () => {
      const mk = async (w, h, c1, c2, type) => {
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const g = c.getContext('2d');
        const grad = g.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, c1);
        grad.addColorStop(1, c2);
        g.fillStyle = grad;
        g.fillRect(0, 0, w, h);
        g.fillStyle = 'rgba(255,255,255,0.55)';
        g.beginPath();
        g.arc(w * 0.7, h * 0.3, Math.min(w, h) * 0.14, 0, 7);
        g.fill();
        const b = await new Promise((r) => c.toBlob(r, type, 0.9));
        const bytes = new Uint8Array(await b.arrayBuffer());
        let s = '';
        for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
        return btoa(s);
      };
      return [
        { name: 'montagna.jpg', mimeType: 'image/jpeg', b64: await mk(1600, 1067, '#2b5a8a', '#e8b27a', 'image/jpeg') },
        { name: 'ritratto.png', mimeType: 'image/png', b64: await mk(900, 1200, '#5a7d2a', '#1c2b1f', 'image/png') },
        { name: 'bosco.webp', mimeType: 'image/webp', b64: await mk(1200, 1200, '#8a4f9e', '#2f6f9f', 'image/webp') },
        { name: 'mare.jpg', mimeType: 'image/jpeg', b64: await mk(1500, 1000, '#2a7f7a', '#f1f3f5', 'image/jpeg') },
      ];
    });
    return files.map((f) => ({ name: f.name, mimeType: f.mimeType, buffer: Buffer.from(f.b64, 'base64') }));
  };
  await shot('images-to-pdf.png', {
    width: 1280,
    dark: false,
    path: '/images-to-pdf/',
    setup: async (page) => {
      await page.setInputFiles('input[type=file]', await drawImages(page));
      await page.waitForFunction(() => document.querySelectorAll('.card .thumb img').length === 4);
      await page.locator('[data-uid="1"] [data-act="after"]').click();
      await page.waitForTimeout(300);
    },
  });
  await shot('pdf-to-images.png', {
    width: 1280,
    dark: false,
    path: '/pdf-to-images/',
    setup: async (page) => {
      const pdf = await makePdf('Relazione di esempio', 'Relazione', [[0.18, 0.43, 0.62], [0.7, 0.33, 0.16], [0.35, 0.5, 0.16]], 4);
      await page.setInputFiles('input[type=file]', [{ name: 'relazione.pdf', mimeType: 'application/pdf', buffer: pdf }]);
      await page.waitForSelector('#ip-dpi');
      await page.selectOption('#ip-dpi', '72');
      await page.getByRole('button', { name: 'Converti' }).click();
      await page.waitForFunction(() => document.querySelectorAll('[data-testid=ip-results] li').length === 4, null, { timeout: 60000 });
      await page.waitForTimeout(400);
    },
  });

  // ---- Metadati foto: JPEG inventato con EXIF (telefono fittizio, GPS) costruito a mano ----
  const exifJpeg = (jpeg) => {
    const ascii = (s) => [...Buffer.from(s + '\0')];
    const u16 = (n) => [n & 255, n >> 8];
    const u32 = (n) => [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255];
    const rat = (list) => list.flatMap(([n, d]) => [...u32(n), ...u32(d)]);
    // IFD0 (5 voci), Exif (3 voci), GPS (4 voci): i valori lunghi vanno in coda
    const data = [];
    const ifd0N = 5, exN = 3, gpsN = 4;
    const size = (n) => 2 + n * 12 + 4;
    const offIfd0 = 8, offEx = offIfd0 + size(ifd0N), offGps = offEx + size(exN), dataStart = offGps + size(gpsN);
    const val = (bytes) => {
      if (bytes.length <= 4) return [...bytes, ...Array(4 - bytes.length).fill(0)];
      const o = dataStart + data.length;
      data.push(...bytes);
      return u32(o);
    };
    const entry = (tag, type, count, bytes) => [...u16(tag), ...u16(type), ...u32(count), ...val(bytes)];
    const str = (tag, s) => entry(tag, 2, s.length + 1, ascii(s));
    const ifd0 = [...u16(ifd0N), ...str(0x010f, 'Marca Fittizia'), ...str(0x0110, 'Prova Phone 1'), ...entry(0x0112, 3, 1, u16(1)), ...entry(0x8769, 4, 1, u32(offEx)), ...entry(0x8825, 4, 1, u32(offGps)), ...u32(0)];
    const ex = [...u16(exN), ...entry(0x829a, 5, 1, rat([[1, 250]])), ...str(0x9003, '2026:03:15 10:22:01'), ...str(0xa431, 'SN-000123'), ...u32(0)];
    const gps = [...u16(gpsN), ...entry(0x0001, 2, 2, ascii('N')), ...entry(0x0002, 5, 3, rat([[41, 1], [53, 1], [2160, 100]])), ...entry(0x0003, 2, 2, ascii('E')), ...entry(0x0004, 5, 3, rat([[12, 1], [29, 1], [3240, 100]])), ...u32(0)];
    const tiff = [0x49, 0x49, 42, 0, ...u32(offIfd0), ...ifd0, ...ex, ...gps, ...data];
    const len = tiff.length + 8;
    return Buffer.concat([jpeg.subarray(0, 2), Buffer.from([0xff, 0xe1, len >> 8, len & 255, 0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff]), jpeg.subarray(2)]);
  };
  await shot('exif-viewer.png', {
    width: 1280,
    dark: false,
    path: '/exif-viewer/',
    setup: async (page) => {
      const [photo] = await drawImages(page);
      await page.setInputFiles('input[type=file]', [{ name: 'gita-in-montagna.jpg', mimeType: 'image/jpeg', buffer: exifJpeg(photo.buffer) }]);
      await page.waitForSelector('[data-testid=exif-warn]');
      await page.getByRole('button', { name: 'Rimuovi i metadati' }).first().click();
      await page.waitForSelector('[data-testid=exif-result]');
    },
  });
  // ---- Generatore di QR code, calcolo IVA, confronto testi, convertitore CSV/JSON/Excel (dati inventati) ----
  await shot('qr-code-generator.png', {
    width: 1280,
    dark: false,
    path: '/qr-code-generator/',
    setup: async (page) => {
      await page.fill('#qr-url', 'https://example.com/ciao');
      await page.waitForSelector('[data-testid=qr-preview]');
      await page.waitForTimeout(300);
    },
  });
  await shot('calcolo-iva.png', {
    width: 1280,
    dark: false,
    path: '/calcolo-iva/',
    setup: async (page) => {
      await page.getByRole('button', { name: 'Notula / fattura', exact: true }).click();
      await page.fill('#iva-amount', '1.000,00');
      await page.getByLabel('Rivalsa INPS 4%').check();
      await page.selectOption('#iva-cassa', '400');
      await page.waitForSelector('[data-testid=iva-table]');
    },
  });
  await shot('calcolo-ritenuta-acconto.png', {
    width: 1280,
    dark: false,
    path: '/calcolo-ritenuta-acconto/',
    setup: async (page) => {
      await page.getByRole('button', { name: 'Professionista', exact: true }).click();
      await page.fill('#rit-amount', '1.000,00');
      await page.fill('#rit-cassa', '4');
      await page.waitForSelector('[data-testid=rit-table]');
    },
  });
  await shot('calcolo-rata-mutuo.png', {
    width: 1280,
    dark: false,
    path: '/calcolo-rata-mutuo/',
    setup: async (page) => {
      await page.fill('#mutuo-capital', '150.000');
      await page.fill('#mutuo-tan', '3,25');
      await page.fill('#mutuo-years', '25');
      await page.waitForSelector('[data-testid=mutuo-table]');
    },
  });
  await shot('numeri-in-lettere.png', {
    width: 1280,
    dark: false,
    path: '/numeri-in-lettere/',
    setup: async (page) => {
      await page.getByRole('button', { name: 'Assegno / importo', exact: true }).click();
      await page.fill('#nl-input', '1.234,56');
      await page.getByLabel('Aggiungi «euro» davanti').check();
      await page.waitForSelector('[data-testid=nl-result]');
    },
  });
  await shot('statistics-calculator.png', {
    width: 1280,
    dark: false,
    path: '/statistics-calculator/',
    setup: async (page) => {
      await page.getByTestId('stat-sample').click();
      await page.waitForSelector('[data-testid=stat-results]');
      await page.waitForSelector('[data-testid=stat-hist]');
    },
  });
  await shot('aspect-ratio-calculator.png', {
    width: 1280,
    dark: false,
    path: '/aspect-ratio-calculator/',
    setup: async (page) => {
      await page.waitForSelector('[data-testid=ar-ratio]');
    },
  });
  await shot('timer.png', {
    width: 1280,
    dark: false,
    path: '/timer/',
    setup: async (page) => {
      const seg = (name) => page.getByRole('button', { name, exact: true });
      const text = (id) => page.getByTestId(id).innerText();
      // cronometro: parte, segna un giro, si ferma e conserva il tempo
      await seg('Cronometro').click();
      await page.getByTestId('sw-toggle').click();
      await page.waitForTimeout(350);
      await page.getByTestId('sw-lap').click();
      await page.waitForSelector('[data-testid=sw-lap-row]');
      await page.getByTestId('sw-toggle').click();
      await page.waitForTimeout(500); // il display si aggiorna dopo il clic (su CI più lentamente)
      const frozen = await text('sw-display');
      await page.waitForTimeout(250);
      if ((await text('sw-display')) !== frozen) throw new Error('il cronometro in pausa continua a contare');
      if (/^00:00\.00$/.test(frozen)) throw new Error('il cronometro non ha contato');
      // pomodoro: lavoro 25:00, «Salta» porta alla pausa breve di 5:00
      await seg('Pomodoro').click();
      if ((await text('pm-display')) !== '25:00') throw new Error('pomodoro: durata iniziale ' + (await text('pm-display')));
      await page.getByTestId('pm-skip').click();
      await page.waitForFunction(() => /pausa breve/i.test(document.querySelector('[data-testid=pm-phase]')?.textContent ?? ''));
      if (!/pausa breve/i.test(await text('pm-phase'))) throw new Error('pomodoro: dopo il lavoro manca la pausa breve');
      if ((await text('pm-display')) !== '05:00') throw new Error('pomodoro: durata della pausa ' + (await text('pm-display')));
      // timer: durata non valida segnalata, poi 2 secondi che scadono
      await seg('Timer').click();
      await page.fill('#tm-duration', '100h');
      await page.waitForSelector('[data-testid=tm-error]');
      await page.fill('#tm-duration', '0:02');
      await page.waitForFunction(() => document.querySelector('[data-testid=tm-display]')?.textContent.trim() === '00:02');
      if ((await text('tm-display')) !== '00:02') throw new Error('timer: display ' + (await text('tm-display')));
      await page.getByTestId('tm-toggle').click();
      await page.waitForSelector('[data-testid=tm-done]', { timeout: 6000 });
      if ((await text('tm-display')) !== '00:00') throw new Error('timer: scaduto ma display ' + (await text('tm-display')));
    },
  });
  await shot('scientific-calculator.png', {
    width: 1280,
    dark: false,
    path: '/scientific-calculator/',
    setup: async (page) => {
      const result = () => page.getByTestId('sci-result').innerText();
      const expect = async (expr, out) => {
        await page.fill('#sci-expr', expr);
        await expectValue(page, '[data-testid=sci-result]', out, expr);
      };
      await expect('2(3+4)^2/sqrt(16)', '24,5');
      await page.getByTestId('key-eq').click();
      await expect('200+10%', '220');
      await expect('sin(30)', '0,5');
      await expect('0,1+0,2', '0,3');
      await page.fill('#sci-expr', '1/0');
      await page.waitForSelector('[data-testid=sci-error]');
      // tastiera a schermo: 7 × 6, poi «=» e un operatore che riparte dal risultato (ans)
      await page.getByTestId('key-clear').click();
      const field = (expected, what) => expectValue(page, '#sci-expr', expected, what, 4000);
      for (const k of ['7', '×', '6']) {
        await page.getByTestId('key-' + k).click();
        // un campo senza focus non conserva la selezione in tutti i browser (su CI finiva a 0): i tasti devono usare la posizione ricordata
        await page.evaluate(() => document.querySelector('#sci-expr').setSelectionRange(0, 0));
      }
      await field('7×6', 'i tasti non scrivono nel campo');
      await page.getByTestId('key-eq').click();
      await page.getByTestId('key-+').click();
      await field('ans+', '«+» dopo «=» non riparte dal risultato');
      await page.getByTestId('key-1').click();
      await field('ans+1', 'cifra dopo l\'operatore');
      await page.waitForFunction(() => document.querySelector('[data-testid=sci-result]')?.textContent.trim() === '43', null, { timeout: 4000 }).catch(() => {});
      if ((await result()) !== '43') throw new Error('«ans+1» doveva valere 43, vale ' + (await result()));
      await page.getByTestId('key-eq').click();
      await page.waitForFunction(() => document.querySelectorAll('[data-testid=sci-hist-row]').length >= 3);
      await page.fill('#sci-expr', '(1+sqrt(5))/2');
      await page.waitForFunction(() => document.querySelector('[data-testid=sci-result]')?.textContent.trim() === '1,61803398875');
    },
  });
  await shot('random-number-generator.png', {
    width: 1280,
    dark: false,
    path: '/random-number-generator/',
    setup: async (page) => {
      const seg = (name) => page.getByRole('button', { name, exact: true });
      // numeri senza ripetizioni: 5 valori diversi tra 1 e 6
      await page.fill('#rnd-min', '1');
      await page.fill('#rnd-max', '6');
      await page.fill('#rnd-count', '5');
      await page.getByTestId('rnd-unique').check();
      await page.getByTestId('rnd-go').click();
      await page.waitForSelector('[data-testid=rnd-numbers] li');
      const nums = (await page.locator('[data-testid=rnd-numbers] li').allInnerTexts()).map(Number);
      if (nums.length !== 5 || new Set(nums).size !== 5 || nums.some((n) => n < 1 || n > 6)) throw new Error('numeri non validi: ' + nums);
      await page.fill('#rnd-count', '7');
      await page.getByTestId('rnd-go').click();
      await page.waitForSelector('[data-testid=rnd-error]');
      // dadi
      await seg('Dadi').click();
      await page.fill('#rnd-dice', '2d6+3');
      await page.getByTestId('rnd-go').click();
      const total = Number(await page.getByTestId('rnd-total').innerText());
      if (!(total >= 5 && total <= 15)) throw new Error('totale dei dadi fuori intervallo: ' + total);
      // moneta
      await seg('Moneta').click();
      await page.fill('#rnd-flips', '100');
      await page.getByTestId('rnd-go').click();
      const m = /(\d+) testa, (\d+) croce/.exec(await page.getByTestId('rnd-coin').innerText());
      if (!m || Number(m[1]) + Number(m[2]) !== 100) throw new Error('lanci di moneta incoerenti');
      // elenco: sei nomi in due squadre da tre
      await seg('Elenco').click();
      await page.fill('#rnd-list', 'Anna\nLuca\nMarta\nGiulia\nPaolo\nSara');
      await seg('Forma squadre').click();
      await page.fill('#rnd-teams', '2');
      await page.getByTestId('rnd-go').click();
      await page.waitForSelector('[data-testid=rnd-teams-out] section');
      const sizes = await page.locator('[data-testid=rnd-teams-out] section').evaluateAll((els) => els.map((e) => e.querySelectorAll('li').length));
      if (sizes.join() !== '3,3') throw new Error('squadre non equilibrate: ' + sizes);
    },
  });
  await shot('text-cleaner.png', { width: 1280, dark: false, path: '/text-cleaner/', setup: async (page) => {
        await page.fill('#tcl-input', 'Il gat-\nto dormiva sul   divano.\n\n\n\n\u201cChe bello\u201d,\ndisse\u00a0il\u200b padrone.');
        await page.getByTestId('tcl-opt-dehyphen').check();
        await page.waitForTimeout(250);
        const out = await page.getByTestId('tcl-output').inputValue();
        if (out !== 'Il gatto dormiva sul divano.\n\n"Che bello", disse il padrone.') throw new Error('text-cleaner: risultato inatteso ' + JSON.stringify(out));
        if (!/tolti \d+ caratteri/i.test(await page.getByTestId('tcl-removed').innerText())) throw new Error('text-cleaner: manca il conteggio dei caratteri tolti');
      } });
  await shot('list-compare.png', { width: 1280, dark: false, path: '/list-compare/', setup: async (page) => {
        await page.fill('#lcmp-a', 'mela\nPera\nkiwi\nmela\nfico');
        await page.fill('#lcmp-b', 'pera\nbanana\nkiwi\nuva\nuva');
        await page.getByTestId('lcmp-ignore-case').check();
        await page.waitForTimeout(250);
        const summary = await page.getByTestId('lcmp-summary').innerText();
        if (!/A ha 5 voci, B ha 5 voci: 2 in comune, 2 solo in A, 2 solo in B/.test(summary)) throw new Error('list-compare: riepilogo inatteso ' + summary);
        await page.getByRole('button', { name: /^Solo in A/ }).click();
        await page.waitForTimeout(150);
        if ((await page.getByTestId('lcmp-out').inputValue()) !== 'mela\nfico') throw new Error('list-compare: scheda «Solo in A» inattesa');
        await page.getByRole('button', { name: /^In comune/ }).click();
        await page.waitForTimeout(150);
        if ((await page.getByTestId('lcmp-out').inputValue()) !== 'Pera\nkiwi') throw new Error('list-compare: scheda «In comune» inattesa');
      } });
  await shot('countdown.png', {
      width: 1280,
      dark: false,
      path: '/countdown/',
      setup: async (page) => {
        // orologio fisso: il numero di giorni passati nello screenshot non deve cambiare da un giorno all'altro
        await page.clock.setFixedTime(new Date('2026-11-18T12:00:00Z'));
        const text = (id) => page.getByTestId(id).innerText();
        // data fissa nel passato: lo screenshot non mostra mai la data odierna
        await page.fill('#cdt-name', 'Capodanno 2020');
        await page.selectOption('#cdt-zone', 'UTC');
        await page.fill('#cdt-at', '2020-01-01T00:00');
        await page.waitForTimeout(250);
        if (!/è passato da/i.test(await text('cdt-status'))) throw new Error('countdown: manca «è passato da»: ' + (await text('cdt-status')));
        const days = Number((await text('cdt-days')).replace(/\D/g, ''));
        if (!(days > 2000)) throw new Error('countdown: giorni trascorsi non plausibili: ' + days);
        if (!/capodanno 2020/i.test(await page.getByTestId('cdt-result').innerText())) throw new Error('countdown: nome non mostrato');
        // una ricorrenza porta a una data futura: «Mancano»
        await page.getByTestId('cdt-h-christmas').click();
        await page.waitForTimeout(250);
        if (!/mancano/i.test(await text('cdt-status'))) throw new Error('countdown: dopo Natale manca «Mancano»');
        // si torna alla data fissa nel passato per lo screenshot
        await page.fill('#cdt-name', 'Capodanno 2020');
        await page.fill('#cdt-at', '2020-01-01T00:00');
        await page.waitForTimeout(250);
        if (!/è passato da/i.test(await text('cdt-status'))) throw new Error('countdown: stato finale errato');
        await page.waitForTimeout(1300); // un tick dell'orologio con l'ora fissa

      },
    });
  await shot('split-bill.png', {
      width: 1280,
      dark: false,
      path: '/split-bill/',
      setup: async (page) => {
        const text = (id) => page.getByTestId(id).innerText();
        const seg = (name) => page.getByRole('button', { name, exact: true });
        // in parti uguali: 87,50 € + 10% in 4, quota arrotondata per eccesso a 0,10 €
        await page.fill('#bill-total', '87,50');
        await page.fill('#bill-people', '4');
        await page.fill('#bill-tip', '10');
        await page.selectOption('#bill-step', '10');
        await page.waitForTimeout(250);
        if (!/24,10\s*€/.test(await text('bill-r-share'))) throw new Error('split-bill: quota a testa ' + (await text('bill-r-share')));
        if (!/96,40\s*€/.test(await text('bill-r-paid'))) throw new Error('split-bill: totale pagato ' + (await text('bill-r-paid')));
        if (!/0,15\s*€/.test(await text('bill-r-surplus'))) throw new Error('split-bill: eccedenza ' + (await text('bill-r-surplus')));
        // per consumo: costi comuni e mancia del 10% in proporzione, la somma torna al totale
        await seg('Per consumo').click();
        await page.fill('#bill-lines', 'Anna: 22,50\nBruno 15,00\nCarla; 18,50\nDario: 31,50');
        await page.fill('#bill-common', '6');
        await page.waitForSelector('[data-testid=bill-row]');
        await page.waitForTimeout(250);
        const totals = (await page.getByTestId('bill-row-total').allInnerTexts()).map((t) => t.replace(/\s/g, ' '));
        const expected = ['26,40 €', '18,10 €', '21,98 €', '36,37 €'];
        if (totals.join('|') !== expected.join('|')) throw new Error('split-bill: quote ' + totals.join('|'));
        if (!/102,85\s*€/.test(await text('bill-sum'))) throw new Error('split-bill: somma di controllo ' + (await text('bill-sum')));
        // una riga malformata viene segnalata con il suo numero
        await page.fill('#bill-lines', 'Anna: 22,50\nBruno\nCarla; 18,50');
        await page.waitForTimeout(250);
        if (!/Riga 2/.test(await text('bill-lines-error'))) throw new Error('split-bill: errore di riga non mostrato');
        // stato finale per lo screenshot
        await page.fill('#bill-lines', 'Anna: 22,50\nBruno 15,00\nCarla; 18,50\nDario: 31,50');
        await page.waitForSelector('[data-testid=bill-row]');
        await page.waitForTimeout(250);
      },
    });
  await shot('image-redact.png', {
      width: 1280,
      dark: false,
      path: '/image-redact/',
      setup: async (page) => {
        const seg = (name) => page.getByRole('button', { name, exact: true });
        // immagine di prova 400x300 azzurra con una macchia rossa: generata nella pagina con un canvas
        const b64 = await page.evaluate(() => {
          const c = document.createElement('canvas');
          c.width = 400;
          c.height = 300;
          const g = c.getContext('2d');
          g.fillStyle = '#3a86c8';
          g.fillRect(0, 0, 400, 300);
          g.fillStyle = '#e63946';
          g.fillRect(40, 40, 120, 80);
          g.fillStyle = '#ffd166';
          g.fillRect(220, 150, 140, 100);
          g.fillStyle = '#222';
          for (let x = 228; x < 360; x += 24) g.fillRect(x, 150, 8, 100); // strisce: la pixelatura le mescola
          return c.toDataURL('image/png').split(',')[1];
        });
        await page.setInputFiles('app-file-drop input[type=file]', { name: 'prova.png', mimeType: 'image/png', buffer: Buffer.from(b64, 'base64') });
        await page.waitForSelector('[data-testid=red-source]');
        if (!/400×300/.test(await page.getByTestId('red-source').innerText())) throw new Error('image-redact: dimensioni non lette');
        // primo rettangolo: riquadro pieno nero sulla macchia rossa, impostato con i campi numerici
        await page.getByTestId('red-add').click();
        await page.waitForSelector('#red-x');
        for (const [id, v] of [['red-x', '40'], ['red-y', '40'], ['red-w', '120'], ['red-h', '80']]) {
          await page.fill('#' + id, v);
          await page.press('#' + id, 'Tab');
        }
        await page.waitForTimeout(200);
        const px = (x, y) => page.evaluate(([x, y]) => Array.from(document.querySelector('canvas.img').getContext('2d').getImageData(x, y, 1, 1).data), [x, y]);
        const covered = await px(100, 80);
        if (covered[0] !== 0 || covered[1] !== 0 || covered[2] !== 0) throw new Error('image-redact: il riquadro pieno non copre i pixel: ' + covered);
        // secondo rettangolo: pixelatura sulla macchia gialla
        await page.getByTestId('red-add').click();
        await page.waitForTimeout(150);
        await seg('Pixelatura').click();
        for (const [id, v] of [['red-x', '220'], ['red-y', '150'], ['red-w', '140'], ['red-h', '100']]) {
          await page.fill('#' + id, v);
          await page.press('#' + id, 'Tab');
        }
        await page.waitForTimeout(150);
        if (!/Rettangoli: 2/.test(await page.locator('.hint[aria-live=polite]').innerText())) throw new Error('image-redact: attesi 2 rettangoli');
        // annulla e ripristina: ogni modifica dei campi è un passo, quindi si ripete finché il numero cambia
        const count = async () => Number(/Rettangoli: (\d+)/.exec(await page.locator('.hint[aria-live=polite]').innerText())?.[1]);
        for (let i = 0; i < 12 && (await count()) !== 1; i++) {
          await seg('Annulla').click();
          await page.waitForTimeout(100);
        }
        if ((await count()) !== 1) throw new Error('image-redact: annulla non ha tolto il rettangolo');
        for (let i = 0; i < 20 && !(await seg('Ripristina').isDisabled()); i++) {
          await seg('Ripristina').click();
          await page.waitForTimeout(100);
        }
        if ((await count()) !== 2) throw new Error('image-redact: ripristina non ha rimesso il rettangolo');
        if (!/Pixelatura.*140×100 px in \(220, 150\)/.test(await page.locator('body').innerText())) throw new Error('image-redact: il ripristino non ha riportato la pixelatura impostata');
      },
    });
  await shot('zip-tool.png', {
      width: 1280,
      dark: false,
      path: '/zip-tool/',
      setup: async (page) => {
        const { zipSync, strToU8 } = await import('fflate');
        const seg = (name) => page.getByRole('button', { name, exact: true });
        const downloadBuf = async (click) => {
          const [dl] = await Promise.all([page.waitForEvent('download'), click()]);
          const chunks = [];
          for await (const c of await dl.createReadStream()) chunks.push(c);
          return { name: dl.suggestedFilename(), buffer: Buffer.concat(chunks) };
        };
        const fileInput = 'app-file-drop .bar input[type=file]';
        // crea: tre file (anche con nome unicode), poi scarica lo ZIP
        await page.setInputFiles(fileInput, [
          { name: 'nota.txt', mimeType: 'text/plain', buffer: Buffer.from('ciao '.repeat(400)) },
          { name: 'dati.csv', mimeType: 'text/csv', buffer: Buffer.from('a;b\n1;2\n'.repeat(100)) },
          { name: 'è già così.txt', mimeType: 'text/plain', buffer: Buffer.from('accenti') },
        ]);
        await page.waitForSelector('[data-testid=zip-total]');
        if (!/3 file/.test(await page.getByTestId('zip-total').innerText())) throw new Error('zip-tool: attesi 3 file nell\'elenco');
        const created = await downloadBuf(() => page.getByTestId('zip-create').click());
        if (created.name !== 'archivio.zip') throw new Error('zip-tool: nome archivio ' + created.name);
        if (created.buffer.subarray(0, 2).toString() !== 'PK') throw new Error('zip-tool: l\'archivio creato non è uno ZIP');
        await page.waitForTimeout(200);
        if (!/Creato archivio\.zip/.test(await page.getByTestId('zip-status').innerText())) throw new Error('zip-tool: manca il messaggio di creazione');
        // estrai: archivio con date fisse e una voce pericolosa
        const fixed = new Date(2025, 0, 15, 9, 30, 0).getTime();
        const archive = zipSync({
          'relazione.txt': [strToU8('Relazione di prova. '.repeat(50)), { mtime: fixed }],
          'immagini/logo.svg': [strToU8('<svg xmlns="http://www.w3.org/2000/svg"/>'), { mtime: fixed }],
          'ünïcödé/ß.txt': [strToU8('ciao'), { mtime: fixed }],
          '../fuori.txt': [strToU8('x'), { mtime: fixed }],
        });
        await seg('Estrai').click();
        await page.waitForSelector('[data-testid=zip-name]', { state: 'detached' }); // la modalità è cambiata
        await page.setInputFiles(fileInput, { name: 'esempio.zip', mimeType: 'application/zip', buffer: Buffer.from(archive) });
        await page.waitForSelector('[data-testid=zip-table], [data-testid=zip-error]');
        if (await page.getByTestId('zip-error').count()) throw new Error('zip-tool: errore in estrazione: ' + (await page.getByTestId('zip-error').innerText()));
        if ((await page.getByTestId('zip-row').count()) !== 4) throw new Error('zip-tool: attese 4 voci');
        if (!/percorso pericoloso/i.test(await page.getByTestId('zip-warn-unsafe').innerText())) throw new Error('zip-tool: manca l\'avviso sul percorso pericoloso');
        await page.fill('#zip-search', 'logo');
        await page.waitForTimeout(150);
        if ((await page.getByTestId('zip-row').count()) !== 1) throw new Error('zip-tool: la ricerca non filtra');
        await page.fill('#zip-search', '');
        await page.waitForTimeout(150);
        const one = await downloadBuf(() => page.getByRole('button', { name: 'Scarica relazione.txt', exact: true }).click());
        if (one.name !== 'relazione.txt' || !one.buffer.toString().startsWith('Relazione di prova.')) throw new Error('zip-tool: download singolo errato');
        await page.getByRole('checkbox', { name: 'Seleziona immagini/logo.svg' }).check();
        await page.waitForTimeout(150);
        const sel = await downloadBuf(() => page.getByTestId('zip-dl-selected').click());
        if (sel.name !== 'esempio-selezione.zip' || sel.buffer.subarray(0, 2).toString() !== 'PK') throw new Error('zip-tool: ZIP dei selezionati errato ' + sel.name);
        const all = await downloadBuf(() => page.getByTestId('zip-dl-all').click());
        const names = Object.keys((await import('fflate')).unzipSync(new Uint8Array(all.buffer)));
        if (names.length !== 3 || names.some((n) => n.includes('..'))) throw new Error('zip-tool: «scarica tutti» doveva avere 3 file sicuri: ' + names);
        await page.waitForTimeout(200);
      },
    });
  await shot('string-escape.png', {
      width: 1280,
      dark: false,
      path: '/string-escape/',
      setup: async (page) => {
        const seg = (name) => page.getByRole('button', { name, exact: true });
        const out = async () => {
          await page.waitForTimeout(150);
          return page.getByTestId('esc-output').inputValue();
        };
        // JSON: escape di un testo con a capo, virgolette e backslash
        await page.fill('#esc-input', 'Riga 1\n"citazione" e C:\\temp\\file');
        let v = await out();
        if (v !== 'Riga 1\\n\\"citazione\\" e C:\\\\temp\\\\file') throw new Error('escape JSON errato: ' + v);
        // regex
        await seg('Regex').click();
        await page.fill('#esc-input', 'prezzo (€) 3.50?');
        v = await out();
        if (v !== 'prezzo \\(€\\) 3\\.50\\?') throw new Error('escape regex errato: ' + v);
        // unescape JavaScript con coppia di surrogati
        await seg('JavaScript').click();
        await seg('Unescape').click();
        await page.fill('#esc-input', 'Caff\\u00e8 \\uD83D\\uDE00\\n\\u{1F680}');
        v = await out();
        if (v !== 'Caffè 😀\n🚀') throw new Error('unescape JS errato: ' + v);
        // errore con posizione
        await page.fill('#esc-input', 'ok \\u12');
        await page.waitForSelector('[data-testid=esc-error]');
        if (!/posizione 4/i.test(await page.getByTestId('esc-error').innerText())) throw new Error('posizione dell\'errore mancante');
        await page.fill('#esc-input', 'Caff\\u00e8 \\uD83D\\uDE00\\n\\u{1F680}');
        v = await out();
        if (!v.includes('😀')) throw new Error('risultato finale errato: ' + v);
      },
    });
  await shot('text-binary-converter.png', {
      width: 1280,
      dark: false,
      path: '/text-binary-converter/',
      setup: async (page) => {
        const seg = (name) => page.getByRole('button', { name, exact: true });
        const out = async () => {
          await page.waitForTimeout(150);
          return page.getByTestId('tbin-output').inputValue();
        };
        // testo → byte in UTF-8
        await page.fill('#tbin-input', 'Ciao è 😀');
        let v = await out();
        if (v !== '43 69 61 6F 20 C3 A8 20 F0 9F 98 80') throw new Error('hex UTF-8 errato: ' + v);
        // Latin-1: l'emoji non esiste, diventa ? e compare l'avviso
        await page.selectOption('#tbin-enc', 'latin1');
        v = await out();
        if (v !== '43 69 61 6F 20 E8 20 3F') throw new Error('hex Latin-1 errato: ' + v);
        await page.waitForSelector('[data-testid=tbin-warning]');
        await page.selectOption('#tbin-enc', 'utf-8');
        // binario
        await seg('Binario').click();
        v = await out();
        if (!v.startsWith('01000011 01101001')) throw new Error('binario errato: ' + v);
        await seg('Esadecimale').click();
        // scambia: i byte tornano testo
        await page.getByTestId('tbin-swap').click();
        v = await out();
        if (v !== 'Ciao è 😀') throw new Error('byte → testo errato: ' + v);
        // errore: byte isolato FF, con la posizione
        await page.fill('#tbin-input', '48 65 FF');
        await page.waitForSelector('[data-testid=tbin-error]');
        if (!/posizione 2/i.test(await page.getByTestId('tbin-error').innerText())) throw new Error('posizione dell\'errore mancante');
        // prefissi misti
        await page.fill('#tbin-input', '0x43 \\x69,61-6f 20 %C3%A8 F0 9F 98 80');
        v = await out();
        if (v !== 'Ciao è😀') throw new Error('prefissi misti errati: ' + v); // i byte sono 43 69 61 6F 20 C3 A8 F0…: nessuno spazio tra è e l'emoji
      },
    });
  await shot('text-extractor.png', { width: 1280, dark: false, path: '/text-extractor/', setup: async (page) => {
        await page.fill('#ext-text', 'Scrivi a mario.rossi@example.com o a info@sito.it (copia: Mario.Rossi@example.com). Vedi https://sito.it/x, poi www.esempio.it. Fattura del 15/03/2024 e del 31/02/2024, IBAN IT60X0542811101000000123456, tel. +39 333 1234567.');
        await page.waitForTimeout(250);
        const seg = (re) => page.getByRole('button', { name: re });
        for (const re of [/^Email \(2\)/, /^URL \(2\)/, /^Date \(1\)/, /^IBAN \(1\)/, /^Telefoni \(1\)/]) {
          if ((await seg(re).count()) !== 1) throw new Error('text-extractor: pulsante atteso ' + re);
        }
        await seg(/^URL/).click();
        await page.waitForTimeout(150);
        if ((await page.getByTestId('ext-out').inputValue()) !== 'https://sito.it/x\nwww.esempio.it') throw new Error('text-extractor: URL inattesi');
        await seg(/^Email/).click();
        await page.getByTestId('ext-show-count').check();
        await page.waitForTimeout(150);
        if ((await page.getByTestId('ext-out').inputValue()) !== 'mario.rossi@example.com (2)\ninfo@sito.it (1)') throw new Error('text-extractor: email inattese');
      } });
  await shot('list-converter.png', { width: 1280, dark: false, path: '/list-converter/', setup: async (page) => {
        await page.fill('#lco-text', "mela\nO'Brien\n12\n007\nmela");
        await page.getByTestId('lco-preset-sql').click();
        await page.getByTestId('lco-unique').check();
        await page.waitForTimeout(250);
        const out = () => page.getByTestId('lco-out').inputValue();
        if ((await out()) !== "('mela', 'O''Brien', 12, '007')") throw new Error('list-converter: SQL inatteso ' + (await out()));
        if (!/4 voci/.test(await page.getByTestId('lco-count').innerText())) throw new Error('list-converter: conteggio inatteso');
        // andata e ritorno: scambia direzione e rileggi la lista
        await page.getByTestId('lco-swap').click();
        await page.waitForTimeout(250);
        if ((await out()) !== "mela\nO'Brien\n12\n007") throw new Error('list-converter: ritorno inatteso ' + (await out()));
        await page.getByTestId('lco-swap').click();
        await page.waitForTimeout(250);
        if ((await out()) !== "('mela', 'O''Brien', 12, '007')") throw new Error('list-converter: secondo scambio inatteso ' + (await out()));
      } });
  await shot('trip-cost-calculator.png', { width: 1280, dark: false, path: '/trip-cost-calculator/', setup: async (page) => { const text = (id) => page.getByTestId(id).innerText(); await page.fill('#trip-distance', '350'); await page.getByTestId('trip-round').check(); await page.fill('#trip-cons', '6,5'); await page.fill('#trip-price', '1,85'); await page.fill('#trip-fixed', '12'); await page.fill('#trip-people', '3'); await page.getByTestId('trip-co2').check(); await page.waitForTimeout(250); if (!/45,5\s*l/.test(await text('trip-r-energy'))) throw new Error('trip-cost: litri ' + (await text('trip-r-energy'))); if (!/84,18\s*€/.test(await text('trip-r-fuel'))) throw new Error('trip-cost: carburante ' + (await text('trip-r-fuel'))); if (!/96,18\s*€/.test(await text('trip-r-total'))) throw new Error('trip-cost: totale ' + (await text('trip-r-total'))); if (!/32,06\s*€/.test(await text('trip-r-person'))) throw new Error('trip-cost: a persona ' + (await text('trip-r-person'))); if (!/105,1\s*kg/.test(await text('trip-r-co2'))) throw new Error('trip-cost: CO2 ' + (await text('trip-r-co2'))); await page.selectOption('[data-testid=trip-cons-unit]', 'mpgUs'); await page.waitForTimeout(250); const mpg = await page.getByTestId('trip-consumption').inputValue(); if (!/^36,1/.test(mpg)) throw new Error('trip-cost: conversione mpg ' + mpg); await page.selectOption('[data-testid=trip-cons-unit]', 'l100'); await page.waitForTimeout(250); await page.getByRole('button', { name: 'Consumo medio', exact: true }).click(); await page.fill('#trip-distance', '450'); await page.fill('#trip-liters', '30'); await page.fill('#trip-spend', '54'); await page.waitForSelector('[data-testid=trip-a-l100]'); await page.waitForTimeout(250); if (!/6,67/.test(await text('trip-a-l100'))) throw new Error('trip-cost: l/100 km ' + (await text('trip-a-l100'))); await page.getByRole('button', { name: 'Costo del viaggio', exact: true }).click(); await page.waitForSelector('[data-testid=trip-r-total]'); } });
  await shot('utm-link-builder.png', {
    width: 1280,
    dark: false,
    path: '/utm-link-builder/',
    setup: async (page) => {
      const text = (id) => page.getByTestId(id).innerText();
      const seg = (name) => page.getByRole('button', { name, exact: true });
      const good = 'https://www.esempio.it/offerta?ref=home#prezzi';
      // un link: canale preimpostato, campagna con maiuscole e spazi, query e frammento mantenuti
      await page.fill('#utm-url', good);
      await page.getByTestId('utm-preset-newsletter').click();
      await page.fill('#utm-campaign', 'Saldi Primavera');
      await page.waitForSelector('[data-testid=utm-result]');
      await page.waitForTimeout(250);
      const expected = 'https://www.esempio.it/offerta?ref=home&utm_source=newsletter&utm_medium=email&utm_campaign=saldi%20primavera#prezzi';
      if ((await text('utm-result')).trim() !== expected) throw new Error('utm: link ' + (await text('utm-result')));
      if (!/maiuscole/i.test(await text('utm-warnings'))) throw new Error('utm: avviso maiuscole mancante');
      // javascript: rifiutato
      await page.fill('#utm-url', 'javascript:alert(1)');
      await page.waitForSelector('[data-testid=utm-url-error]');
      if ((await page.getByTestId('utm-result').count()) !== 0) throw new Error('utm: javascript: non rifiutato');
      await page.fill('#utm-url', good);
      // più sorgenti: una riga per canale, la stessa campagna
      await seg('Più sorgenti').click();
      await page.fill('#utm-bulk', 'solo');
      await page.waitForSelector('[data-testid=utm-bulk-error]');
      if (!/Riga 1/.test(await text('utm-bulk-error'))) throw new Error('utm: errore di riga non mostrato');
      await page.fill('#utm-bulk', 'facebook,social\ninstagram,social,storia\nnewsletter email');
      await page.waitForFunction(() => document.querySelectorAll('[data-testid=utm-row]').length === 3);
      await page.waitForTimeout(250);
      const links = (await page.getByTestId('utm-row-link').allInnerTexts()).map((t) => t.trim());
      if (links[1] !== 'https://www.esempio.it/offerta?ref=home&utm_source=instagram&utm_medium=social&utm_campaign=saldi%20primavera&utm_content=storia#prezzi') throw new Error('utm: link riga 2 ' + links[1]);
    },
  });
  await shot('roman-numerals.png', {
    width: 1280,
    dark: false,
    path: '/roman-numerals/',
    setup: async (page) => {
      await page.fill('#rom-input', 'MCMXCIV');
      await page.waitForSelector('[data-testid=rom-result]');
    },
  });
  await shot('unicode-inspector.png', {
    width: 1280,
    dark: false,
    path: '/unicode-inspector/',
    setup: async (page) => {
      await page.getByTestId('uni-sample').click();
      await page.waitForSelector('[data-testid=uni-summary]');
      await page.waitForSelector('[data-testid=uni-homoglyph]');
    },
  });
  await shot('morse-code.png', {
    width: 1280,
    dark: false,
    path: '/morse-code/',
    setup: async (page) => {
      await page.fill('#morse-in', 'SOS ciao mondo');
      await page.waitForFunction(() => document.querySelector('#morse-out')?.value.startsWith('...'));
    },
  });
  await shot('classic-ciphers.png', {
    width: 1280,
    dark: false,
    path: '/classic-ciphers/',
    setup: async (page) => {
      await page.fill('#cph-in', 'Attacco all\'alba');
      await page.waitForSelector('[data-testid=cph-brute]');
    },
  });
  await shot('convertitore-lire-euro.png', {
    width: 1280,
    dark: false,
    path: '/convertitore-lire-euro/',
    setup: async (page) => {
      await page.fill('#lire-amount', '100.000');
      await page.waitForSelector('[data-testid=lire-result]');
    },
  });
  await shot('subnet-calculator.png', {
    width: 1280,
    dark: false,
    path: '/subnet-calculator/',
    setup: async (page) => {
      await page.fill('#subnet-input', '192.168.10.37/26');
      await page.fill('#subnet-split', '4');
      await page.waitForSelector('[data-testid=subnet-split-table]');
    },
  });
  await shot('docker-run-to-compose.png', {
    width: 1280,
    dark: false,
    path: '/docker-run-to-compose/',
    setup: async (page) => {
      await page.click('[data-testid=docker-sample]');
      await page.waitForFunction(() => document.querySelector('#docker-output')?.value.startsWith('services:'));
    },
  });
  await shot('css-clamp-calculator.png', {
    width: 1280,
    dark: false,
    path: '/css-clamp-calculator/',
    setup: async (page) => {
      await page.waitForSelector('[data-testid=clamp-output]');
    },
  });
  await shot('time-calculator.png', {
    width: 1280,
    dark: false,
    path: '/time-calculator/',
    setup: async (page) => {
      await page.click('[data-testid=time-sample]');
      await page.waitForSelector('[data-testid=time-sum-total]');
    },
  });
  await shot('scadenze-fatture.png', {
    width: 1280,
    dark: false,
    path: '/scadenze-fatture/',
    setup: async (page) => {
      await page.click('[data-testid=scad-sample]');
      await page.waitForSelector('[data-testid=scad-table]');
    },
  });
  await shot('generatore-codice-fiscale.png', {
    width: 1280,
    dark: false,
    path: '/generatore-codice-fiscale/',
    setup: async (page) => {
      await page.waitForSelector('[data-testid=gcf-table] tbody tr');
      await page.fill('#gcf-seed', 'demo');
      await page.fill('#gcf-count', '8');
      await page.locator('#gcf-count').dispatchEvent('change');
      await page.getByRole('button', { name: 'Femmina' }).click();
      await page.fill('#gcf-yfrom', '1985');
      await page.locator('#gcf-yfrom').dispatchEvent('change');
      await page.fill('#gcf-yto', '1995');
      await page.locator('#gcf-yto').dispatchEvent('change');
      await page.getByRole('button', { name: 'Comune italiano' }).click();
      await page.getByRole('combobox', { name: 'Comune italiano' }).focus();
      await page.keyboard.type('Milano', { delay: 80 });
      await page.waitForTimeout(300);
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.querySelectorAll('[data-testid=gcf-table] tbody tr').length === 8);
      // ogni riga è coerente con i filtri e il seme rende i risultati ripetibili
      const rows = await page.locator('[data-testid=gcf-table] tbody tr').allInnerTexts();
      if (!rows.every((r) => /\tF\t/.test(r) && r.includes('Milano (MI)'))) throw new Error('le righe non rispettano i filtri: ' + rows[0]);
      await page.getByRole('button', { name: 'Genera di nuovo' }).click();
      await page.waitForTimeout(200);
      const again = await page.locator('[data-testid=gcf-table] tbody tr').allInnerTexts();
      if (JSON.stringify(rows) !== JSON.stringify(again)) throw new Error('il seme non rende riproducibili i codici');
      await page.waitForSelector('[data-testid=gcf-warning]');
    },
  });
  await shot('percentage-calculator.png', {
    width: 1280,
    dark: false,
    path: '/percentage-calculator/',
    setup: async (page) => {
      const fill = async (id, a, b) => {
        await page.fill(`#pct-${id}-a`, a);
        await page.fill(`#pct-${id}-b`, b);
      };
      await fill('of', '22', '1250');
      await fill('is', '45', '180');
      await fill('change', '80', '100');
      await fill('apply', '250', '15');
      await fill('reverse', '85', '15');
      await page.waitForSelector('[data-testid=pct-out-reverse] .answer');
    },
  });
  await shot('unit-converter.png', {
    width: 1280,
    dark: false,
    path: '/unit-converter/',
    setup: async (page) => {
      await page.fill('#uc-value', '42,195');
      await page.waitForSelector('[data-testid=uc-table]');
    },
  });
  await shot('date-calculator.png', {
    width: 1280,
    dark: false,
    path: '/date-calculator/',
    setup: async (page) => {
      await page.fill('#dc-from', '2020-02-29');
      await page.fill('#dc-to', '2026-11-16');
      await page.waitForSelector('[data-testid=dc-table]');
    },
  });
  await shot('timezone-converter.png', {
    width: 1280,
    dark: false,
    path: '/timezone-converter/',
    setup: async (page) => {
      // data e ora si impostano dopo l'idratazione: si aspettano le schede e poi si scrive
      await page.waitForSelector('[data-testid=tz-cards]');
      await page.fill('#tz-date', '2026-11-16');
      await page.fill('#tz-time', '09:30');
      await page.fill('#tz-search', 'Sydney');
      await page.getByRole('button', { name: /Aggiungi Sydney/ }).click();
      await page.waitForTimeout(300);
    },
  });
  await shot('number-base-converter.png', {
    width: 1280,
    dark: false,
    path: '/number-base-converter/',
    setup: async (page) => {
      await page.fill('#nb-input', '-42');
      await page.fill('#nb-float', '0,1');
      await page.waitForSelector('[data-testid=nb-float]');
      await page.waitForSelector('[data-testid=nb-bits]');
    },
  });
  await shot('text-diff.png', {
    width: 1280,
    dark: false,
    path: '/text-diff/',
    setup: async (page) => {
      await page.getByRole('button', { name: 'Carica un esempio' }).click();
      await page.waitForSelector('table.diff');
      // «Successiva» porta il contenitore in cima alla finestra a ogni clic, non solo al primo
      // allineato = in cima alla finestra, oppure la pagina è già scesa al massimo (non può scorrere oltre)
      const aligned = () =>
        page.evaluate(() => {
          const top = document.querySelector('.viewer').getBoundingClientRect().top;
          const max = document.documentElement.scrollHeight - innerHeight;
          return { ok: Math.abs(top) <= 4 || scrollY >= max - 1, top: Math.round(top), y: Math.round(scrollY), max };
        });
      for (const [i, scrollTo] of [0, 0, 400].entries()) {
        await page.evaluate((y) => window.scrollTo(0, y), scrollTo);
        await page.getByTestId('diff-next').click();
        await page
          .waitForFunction(() => Math.abs(document.querySelector('.viewer').getBoundingClientRect().top) <= 4 || scrollY >= document.documentElement.scrollHeight - innerHeight - 1, null, { timeout: 4000 })
          .catch(() => {});
        const r = await aligned();
        if (!r.ok) throw new Error(`clic ${i + 1} su «Successiva»: il contenitore è a ${r.top}px dalla cima (pagina a ${r.y} di ${r.max}), non allineato`);
      }
      await page.evaluate(() => window.scrollTo(0, 0));
    },
  });
  await shot('json-diff.png', {
    width: 1280,
    dark: false,
    path: '/json-diff/',
    setup: async (page) => {
      await page.getByTestId('jd-sample').click();
      await page.getByTestId('jd-count').waitFor();
      await page.waitForTimeout(300);
    },
  });
  // ---- Markdown, contatore, regex, giorni lavorativi (dati inventati) ----
  await shot('markdown-editor.png', {
    width: 1280,
    dark: false,
    path: '/markdown-editor/',
    setup: async (page) => {
      await page.waitForSelector('[data-testid=md-preview] h1');
    },
  });
  await shot('word-counter.png', {
    width: 1280,
    dark: false,
    path: '/word-counter/',
    setup: async (page) => {
      await page.getByRole('button', { name: 'Carica un esempio' }).click();
      await page.waitForSelector('[data-testid=wc-freq]');
    },
  });
  await shot('regex-tester.png', {
    width: 1280,
    dark: false,
    path: '/regex-tester/',
    setup: async (page) => {
      await page.selectOption('#rx-examples', 'date');
      await page.waitForSelector('[data-testid=rx-matches]');
    },
  });
  await shot('calcolo-giorni-lavorativi.png', {
    width: 1280,
    dark: false,
    path: '/calcolo-giorni-lavorativi/',
    setup: async (page) => {
      await page.fill('#wd-start', '2026-04-01');
      await page.fill('#wd-end', '2026-04-30');
      await page.waitForSelector('[data-testid=wd-result]');
    },
  });
  await shot('csv-json-converter.png', {
    width: 1280,
    dark: false,
    path: '/csv-json-converter/',
    setup: async (page) => {
      await page.getByRole('button', { name: 'Carica un esempio' }).click();
      await page.waitForSelector('[data-testid=cj-preview]');
    },
  });
  // ---- Strumenti per sviluppatori: JWT, UUID, timestamp, contrasto (dati inventati) ----
  await shot('jwt-decoder.png', {
    width: 1280,
    dark: false,
    path: '/jwt-decoder/',
    setup: async (page) => {
      await page.getByRole('button', { name: 'Carica un esempio' }).click();
      await page.waitForSelector('[data-testid=jwt-dates]');
    },
  });
  await shot('uuid-generator.png', {
    width: 1280,
    dark: false,
    path: '/uuid-generator/',
    setup: async (page) => {
      await page.getByRole('button', { name: 'UUID v7' }).click();
      await page.fill('#uuid-count', '8');
      await page.locator('#uuid-count').dispatchEvent('change');
      await page.fill('#uuid-check', '0190a1b2-c3d4-7e5f-8a6b-7c8d9e0f1a2b');
      await page.waitForSelector('[data-testid=uuid-date]');
    },
  });
  await shot('fake-data-generator.png', {
    width: 1280,
    dark: false,
    path: '/fake-data-generator/',
    setup: async (page) => {
      await page.waitForSelector('[data-testid=fake-table] tbody tr');
      await page.fill('#fake-seed', 'demo');
      for (const name of ['Codice fiscale', 'Partita IVA', 'IBAN']) {
        await page.getByRole('button', { name, exact: false }).filter({ hasText: name }).first().click();
      }
      await page.fill('#fake-count', '12');
      await page.locator('#fake-count').dispatchEvent('change');
      await page.getByRole('button', { name: 'SQL INSERT' }).click();
      await page.waitForFunction(() => document.querySelectorAll('[data-testid=fake-table] tbody tr').length === 12);
      await page.waitForFunction(() => /INSERT INTO/.test(document.querySelector('[data-testid=fake-sample]')?.value ?? ''));
      // e2e: stesso seme, stesso primo valore dopo una nuova generazione; avviso sempre visibile
      const first = await page.locator('[data-testid=fake-table] tbody tr').first().innerText();
      await page.getByRole('button', { name: 'Genera di nuovo' }).click();
      await page.waitForTimeout(300);
      const again = await page.locator('[data-testid=fake-table] tbody tr').first().innerText();
      if (first !== again) throw new Error('il seme non rende riproducibili i dati');
      await page.waitForSelector('[data-testid=fake-warning]');
    },
  });
  await shot('json-query.png', {
    width: 1280,
    dark: false,
    path: '/json-query/',
    setup: async (page) => {
      await page.getByRole('button', { name: 'Esempio: libreria' }).click();
      await page.fill('#jq-expr', "$..book[?(@.category == 'fiction' && @.price > 10)].title");
      await page.waitForSelector('[data-testid=jq-summary]');
      const summary = await page.locator('[data-testid=jq-summary]').innerText();
      if (!/2 risultati/.test(summary)) throw new Error('risultati inattesi: ' + summary);
      // errore con posizione
      await page.fill('#jq-expr', '$.store.book[?(@.price >]');
      await page.waitForSelector('[data-testid=jq-expr-error]');
      await page.fill('#jq-expr', "$..book[?(@.category == 'fiction' && @.price > 10)].title");
      await page.waitForSelector('[data-testid=jq-paths] tbody tr');
      // schede TypeScript e JSON Schema
      await page.getByRole('button', { name: 'JSON → TypeScript' }).click();
      await page.waitForFunction(() => /interface/.test(document.querySelector('[data-testid=jq-ts]')?.value ?? ''));
      await page.getByRole('button', { name: 'JSON → JSON Schema' }).click();
      await page.waitForFunction(() => /2020-12/.test(document.querySelector('[data-testid=jq-schema]')?.value ?? ''));
      await page.getByRole('button', { name: 'JSONPath', exact: true }).click();
      await page.waitForSelector('[data-testid=jq-values]');
    },
  });
  await shot('timestamp-converter.png', {
    width: 1280,
    dark: false,
    path: '/timestamp-converter/',
    setup: async (page) => {
      await page.selectOption('#ts-tz', 'Europe/Rome');
      await page.fill('#ts-in', '1700000000');
      await page.fill('#ts-date', '2026-03-29 02:30:00');
      await page.getByRole('button', { name: 'Carica un esempio' }).click();
      await page.waitForSelector('[data-testid=ts-batch-table]');
    },
  });
  await shot('color-contrast-checker.png', {
    width: 1280,
    dark: false,
    path: '/color-contrast-checker/',
    setup: async (page) => {
      await page.waitForSelector('[data-testid=cc-ratio]');
    },
  });
  await shot('yaml-json-converter.png', {
    width: 1280,
    dark: false,
    path: '/yaml-json-converter/',
    setup: async (page) => {
      await page.getByRole('button', { name: 'Esempio' }).click();
      await page.waitForSelector('[data-testid=yj-out]');
    },
  });
  await shot('xml-formatter.png', {
    width: 1280,
    dark: false,
    path: '/xml-formatter/',
    setup: async (page) => {
      await page.getByRole('button', { name: 'Esempio' }).click();
      await page.waitForFunction(() => document.querySelector('[data-testid=xml-out]')?.value.includes('\n'));
    },
  });
  await shot('sql-formatter.png', {
    width: 1280,
    dark: false,
    path: '/sql-formatter/',
    setup: async (page) => {
      await page.selectOption('#sql-dialect', 'postgresql');
      await page.getByRole('button', { name: 'Esempio' }).click();
      await page.waitForFunction(() => document.querySelector('[data-testid=sql-out]')?.value.includes('SELECT'));
    },
  });
  await shot('html-entities.png', {
    width: 1280,
    dark: false,
    path: '/html-entities/',
    setup: async (page) => {
      await page.getByRole('button', { name: 'Esempio' }).click();
      await page.waitForFunction(() => document.querySelector('[data-testid=ent-out]')?.value.includes('&'));
    },
  });
  await shot('case-converter.png', {
    width: 1280,
    dark: false,
    path: '/case-converter/',
    setup: async (page) => {
      await page.getByRole('button', { name: 'Esempio' }).click();
      await page.waitForSelector('[data-testid=case-snake]');
    },
  });
  await shot('slug-generator.png', {
    width: 1280,
    dark: false,
    path: '/slug-generator/',
    setup: async (page) => {
      await page.getByRole('button', { name: 'Esempio' }).click();
      await page.waitForFunction(() => document.querySelector('[data-testid=slug-out]')?.value.length > 0);
    },
  });
  await shot('lorem-ipsum-generator.png', {
    width: 1280,
    dark: false,
    path: '/lorem-ipsum-generator/',
    setup: async (page) => {
      await page.fill('#lorem-seed', 'rrstudio');
      await page.waitForFunction(() => document.querySelector('[data-testid=lorem-out]')?.value.startsWith('Lorem ipsum'));
    },
  });
  await shot('cron-expression.png', {
    width: 1280,
    dark: false,
    path: '/cron-expression/',
    setup: async (page) => {
      await page.fill('#cron-expr', '*/15 9-17 * * 1-5');
      await page.waitForSelector('[data-testid=cron-runs]');
    },
  });
  await shot('chmod-calculator.png', {
    width: 1280,
    dark: false,
    path: '/chmod-calculator/',
    setup: async (page) => {
      await page.getByRole('button', { name: 'Usa 755' }).click();
      await page.fill('#chmod-expr', 'g+w,o-x');
      await page.waitForSelector('[data-testid=chmod-expr-result]');
    },
  });
  await shot('css-unit-converter.png', {
    width: 1280,
    dark: false,
    path: '/css-unit-converter/',
    setup: async (page) => {
      await page.fill('#cssu-value', '24');
      await page.fill('#cssu-in', '.card {\n  padding: 24px 16px;\n  margin: 0 auto 8px;\n  font-size: 14px;\n  border: 1px solid #ccc;\n  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);\n}\n@media (min-width: 768px) {\n  .card { padding: 32px; }\n}\n');
      await page.waitForFunction(() => document.querySelector('[data-testid=cssu-out]')?.value.includes('rem'));
    },
  });
  await shot('css-generator.png', {
    width: 1280,
    dark: false,
    path: '/css-generator/',
    setup: async (page) => {
      await page.getByRole('button', { name: 'Tramonto' }).click();
      await page.getByRole('button', { name: 'Aggiungi stop' }).click();
      // il codice si aggiorna dopo il clic: senza questa attesa lo snapshot «prima» può essere ancora quello a due stop
      await page.waitForFunction(() => document.querySelector('[data-testid=cssg-code]')?.textContent.includes('50%'));
    },
  });
  await shot('svg-optimizer.png', {
    width: 1280,
    dark: false,
    path: '/svg-optimizer/',
    setup: async (page) => {
      await page.fill('#svgo-paste', "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<!-- Generator: Illustrator 27.0 -->\n<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\" width=\"64\" height=\"64\">\n  <metadata>editor data that nobody needs</metadata>\n  <title>Logo</title>\n  <g id=\"Livello_1\">\n    <circle cx=\"32.000000\" cy=\"32.000000\" r=\"28.500000\" fill=\"#6366F1\" stroke=\"#000000\" stroke-width=\"1.000000\"/>\n    <path d=\"M 20.123456 34.654321 L 28.987654 43.111111 L 45.555555 22.222222\" fill=\"none\" stroke=\"#FFFFFF\" stroke-width=\"5.000000\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n  </g>\n</svg>\n");
      await page.getByRole('button', { name: 'Ottimizza il codice incollato' }).click();
      await page.waitForSelector('[data-testid=svgo-after]');
      await page.waitForTimeout(300);
    },
  });
  await shot('favicon-generator.png', {
    width: 1280,
    dark: false,
    path: '/favicon-generator/',
    setup: async (page) => {
      await page.fill('#fav-name', 'Il mio sito');
      await page.fill('#fav-short', 'Sito');
      await page.waitForSelector('[data-testid=fav-previews]');
      await page.waitForTimeout(300);
    },
  });
  await shot('htpasswd-generator.png', {
    width: 1280,
    dark: false,
    path: '/htpasswd-generator/',
    setup: async (page) => {
      await page.fill('#ht-cost', '6');
      await page.locator('#ht-cost').dispatchEvent('change');
      await page.fill('#ht-user-1', 'mario');
      await page.fill('#ht-pw-1', 'una-password-lunga-e-casuale');
      await page.getByRole('button', { name: 'Aggiungi utente' }).click();
      await page.fill('#ht-user-2', 'giulia');
      await page.fill('#ht-pw-2', 'un-altra-password');
      await page.getByRole('button', { name: 'Genera', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('[data-testid=ht-out]')?.value.split('\n').length === 2);
    },
  });
  await shot('certificate-decoder.png', {
    width: 1280,
    dark: false,
    path: '/certificate-decoder/',
    setup: async (page) => {
      await page.fill('#cert-in', "-----BEGIN CERTIFICATE-----\nMIIEDTCCAvWgAwIBAgIUfyC3V5lv3ljF/1wkogHIaIherScwDQYJKoZIhvcNAQEL\nBQAwQTELMAkGA1UEBhMCSVQxGDAWBgNVBAoMD0VzZW1waW8gVGVzdCBDQTEYMBYG\nA1UEAwwPRXNlbXBpbyBSb290IENBMCAXDTI2MTExNzA1NTI0MloYDzIxMjYxMDI0\nMDU1MjQyWjBjMQswCQYDVQQGEwJJVDESMBAGA1UECAwJTG9tYmFyZGlhMQ8wDQYD\nVQQHDAZNaWxhbm8xFDASBgNVBAoMC0VzZW1waW8gU3JsMRkwFwYDVQQDDBB3d3cu\nZXNlbXBpby50ZXN0MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAufaV\nR5ZLiBU8DqVZhWafAs5B+1OmtioWLGFKs+JqXA6PtZrkq9OU6LVrBCSFqG9azSBZ\n6BIMhddJkGUiND5n8m+goEzEM0zNIWwICkLAfG2cWAM40X28Z0jTnT50M0AgVQP9\n+hrnm4jl2zErJ08chIAId2gLgbgkRyZx/UF9VrMsIw1FmKLo3rBfkHKf+JAP+61x\nzd366smlN8vpynhIgTqbsW77hSFSKzmj5Ifr0FT1Wg7FcGYuyq5mf429pC5G5F62\nTv1KrwnBD6hh67lxppu4gVDiT3fqFXcEyosh5FbJLSC01M8BdsD4tGt41+tixtQ+\nNbhjup7SH3jGrG/pNQIDAQABo4HYMIHVMFkGA1UdEQRSMFCCEHd3dy5lc2VtcGlv\nLnRlc3SCDGVzZW1waW8udGVzdIcEwAACCoERaW5mb0Blc2VtcGlvLnRlc3SGFWh0\ndHBzOi8vZXNlbXBpby50ZXN0LzAOBgNVHQ8BAf8EBAMCBaAwHQYDVR0lBBYwFAYI\nKwYBBQUHAwEGCCsGAQUFBwMCMAkGA1UdEwQCMAAwHQYDVR0OBBYEFBSff/tLoe9D\n0vhQ39aiT4ijIb7IMB8GA1UdIwQYMBaAFGNBlJcieMCAKIqEyhsxaYbtq0aHMA0G\nCSqGSIb3DQEBCwUAA4IBAQBLch6w7zRfNFDedmmD/SunpASomCpcqEAmYwRon1go\nX9dN7DtPOXukikJMy33wHgW1XMrHq+bc6Q1NvOLCJezVAQdZHvHFuZJchikivNci\nvM/a6JEUlLyqjT4/XZAzDJoZuGyLF8XBgvSx1IrMtB+FR/wJpxK2n35Zc6dYvaN0\nU4oW9KBhzGWhKQhVjAa0E9p3I6OB/WxQMsod+b09QUWnfXyUoIbFw9I+MCQpejOx\nO3nl5O6A6zZVRZhmBuuFMAgVLOUP+FH0+1YDvjb6U24f8sTF0GWm9fAzsdTgqV8z\nCGyDq5gCwtOeWlFmG0GOykQyveW4ItdfJQQ3cO7IKz7I\n-----END CERTIFICATE-----\n-----BEGIN CERTIFICATE-----\nMIIDeDCCAmCgAwIBAgIUZYp5F1F1ianL1tW3CrVSsWeTBgQwDQYJKoZIhvcNAQEL\nBQAwQTELMAkGA1UEBhMCSVQxGDAWBgNVBAoMD0VzZW1waW8gVGVzdCBDQTEYMBYG\nA1UEAwwPRXNlbXBpbyBSb290IENBMCAXDTI2MTExNzA1NTI0MVoYDzIxMjYxMDI0\nMDU1MjQxWjBBMQswCQYDVQQGEwJJVDEYMBYGA1UECgwPRXNlbXBpbyBUZXN0IENB\nMRgwFgYDVQQDDA9Fc2VtcGlvIFJvb3QgQ0EwggEiMA0GCSqGSIb3DQEBAQUAA4IB\nDwAwggEKAoIBAQC1N3cjhtmhLRO3JOmo9Wn/HaQwxuh3ywAbZybVFiD7Re9dZ/D6\n4cRNYb3H21RfxgT6ErL+T7weJ3YLCWha4QfeU6J56rtthEky4mjizlm120Yssl7o\nNoSzHga7iPwSKfQAgkLqgTMf2ib8F4miVyRgkkiLGAO2Nzl4Gbpe2Gyo1IsldIEm\nQMJzvBsgxBrB3lSKf1q999SkiiPUdp7nCXBTUqg0p1t+WAqipOI0aFx5BBUWY1Hj\nHImnSxqcyGsjl7+zQj+8uj7OGX0Ao2T5PovGJ4Bu2B09XTD9I7XfEcegqFp7oS/0\n3HvqZjVZROdd8cjyImFuDrxVXBeDUCMhDS8NAgMBAAGjZjBkMB0GA1UdDgQWBBRj\nQZSXInjAgCiKhMobMWmG7atGhzAfBgNVHSMEGDAWgBRjQZSXInjAgCiKhMobMWmG\n7atGhzASBgNVHRMBAf8ECDAGAQH/AgEAMA4GA1UdDwEB/wQEAwIBBjANBgkqhkiG\n9w0BAQsFAAOCAQEAb8lZATQCAnBIDa2TjpbchD8meg+GdYHa2uka+D8bE+4iHN3v\nZ5L4x711bkr0EvPrJkIw1DuqeG0R6AWgTx/9Stsg6LzxznEh2GHcVu72ZC64HqdI\nYu8OSCc/a1fhoFnD6mfAFZwpwEW7Y/2TYL4AYXDRv/QKRVHEsRmnAMf36vrnnn67\nhlj7RlVQqXW1Elm22uDUYHsRo/ljggM7e2UcHrDhb5EBbIiWieOzwAvlHFHezJkb\n4k1kCWBxvzsyOaIw+LJvxnoAfb3Ay5qnM2DQ0BTWp/nZBIi0Ni1JYo/3oRJ+VWdj\nlABdaTi/QnoLNGh+JLuSZi4yNxgTEQHuOK4TEA==\n-----END CERTIFICATE-----\n");
      await page.waitForSelector('[data-testid=cert-status]');
    },
  });
  await shot('password-strength-checker.png', {
    width: 1280,
    dark: false,
    path: '/password-strength-checker/',
    setup: async (page) => {
      await page.fill('#pws-input', 'Roma1990!');
      await page.getByRole('button', { name: 'Mostra la password' }).click();
      await page.waitForSelector('[data-testid=pws-crack]');
      await page.waitForTimeout(300);
    },
  });
  await shot('totp-generator.png', {
    width: 1280,
    dark: false,
    path: '/totp-generator/',
    setup: async (page) => {
      await page.fill('#totp-secret', 'JBSWY3DPEHPK3PXP');
      await page.fill('#totp-label', 'mario@example.com');
      await page.fill('#totp-issuer', 'Esempio');
      await page.waitForFunction(() => /\d/.test(document.querySelector('[data-testid=totp-code]')?.textContent ?? ''));
      const code = ((await page.textContent('[data-testid=totp-code]')) ?? '').replace(/\s/g, '');
      await page.fill('#totp-verify-code', code);
      await page.waitForSelector('[data-testid=totp-verify-result]');
      await page.waitForSelector('[data-testid=totp-qr]');
      await page.waitForTimeout(300);
    },
  });
  const chk = (cond, msg) => {
    if (!cond) throw new Error(msg);
  };
  await shot('hmac-generator.png', {
    width: 1280,
    dark: false,
    path: '/hmac-generator/',
    setup: async (page) => {
      // caso 2 dell'RFC 4231 (HMAC-SHA-256 con chiave "Jefe")
      await page.fill('#hmac-key', 'Jefe');
      await page.fill('#hmac-msg', 'what do ya want for nothing?');
      await page.waitForSelector('[data-testid=hmac-output]');
      const mac = (await page.locator('[data-testid=hmac-output]').innerText()).trim();
      chk(mac === '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843', 'HMAC inatteso: ' + mac);
      await page.fill('#hmac-expected', 'sha256=' + mac.toUpperCase());
      await page.waitForSelector('[data-testid=hmac-verify-result]');
      chk(/✓/.test(await page.locator('[data-testid=hmac-verify-result]').innerText()), 'verifica HMAC non riuscita');
    },
  });
  await shot('ssh-key-generator.png', {
    width: 1280,
    dark: false,
    path: '/ssh-key-generator/',
    setup: async (page) => {
      await page.fill('#ssh-comment', 'mario@portatile');
      await page.click('[data-testid=ssh-generate]');
      await page.waitForSelector('[data-testid=ssh-fingerprint]');
      chk(/^SHA256:[A-Za-z0-9+/]{43}$/.test((await page.locator('[data-testid=ssh-fingerprint]').innerText()).trim()), 'fingerprint SSH inatteso');
      chk((await page.locator('[data-testid=ssh-private]').inputValue()).startsWith('-----BEGIN OPENSSH PRIVATE KEY-----'), 'chiave privata OpenSSH inattesa');
    },
  });
  await shot('csr-generator.png', {
    width: 1280,
    dark: false,
    path: '/csr-generator/',
    setup: async (page) => {
      await page.fill('#csr-cn', 'www.example.com');
      await page.fill('#csr-o', 'Esempio S.r.l.');
      await page.fill('#csr-l', 'Milano');
      await page.fill('#csr-c', 'it');
      await page.fill('#csr-san', 'www.example.com\nexample.com\n192.0.2.10');
      await page.click('[data-testid=csr-generate]');
      await page.waitForSelector('[data-testid=csr-check]');
      chk(/Valida/.test(await page.locator('[data-testid=csr-check-sig]').innerText()), 'firma della CSR non valida');
      chk((await page.locator('[data-testid=csr-output]').inputValue()).startsWith('-----BEGIN CERTIFICATE REQUEST-----'), 'CSR inattesa');
    },
  });
  await shot('shamir-secret-sharing.png', {
    width: 1280,
    dark: false,
    path: '/shamir-secret-sharing/',
    setup: async (page) => {
      await page.fill('#sss-secret', 'correct horse battery staple');
      await page.click('[data-testid=sss-split]');
      await page.waitForSelector('[data-testid=sss-share]');
      chk((await page.locator('[data-testid=sss-share]').count()) === 5, 'numero di parti inatteso');
    },
  });
  await shot('file-encrypt.png', {
    width: 1280,
    dark: false,
    path: '/file-encrypt/',
    setup: async (page) => {
      await page.getByRole('button', { name: 'Testo', exact: true }).click();
      await page.fill('#fe-pass', 'una passphrase lunga e difficile');
      await page.fill('#fe-pass2', 'una passphrase lunga e difficile');
      await page.fill('#fe-text', 'Messaggio riservato: ci vediamo domani alle 18:30.');
      await page.locator('[data-testid=fe-run]').click();
      await page.waitForFunction(() => (document.querySelector('[data-testid=fe-out]')?.value ?? '').length > 20);
    },
  });
  await shot('barcode-generator.png', {
    width: 1280,
    dark: false,
    path: '/barcode-generator/',
    setup: async (page) => {
      await page.fill('[data-testid=bc-text]', '400638133393');
      await page.waitForSelector('[data-testid=bc-preview]');
      await page.waitForSelector('[data-testid=bc-check]');
      await page.waitForTimeout(300);
    },
  });
  await shot('qr-code-reader.png', {
    width: 1280,
    dark: false,
    path: '/qr-code-reader/',
    setup: async (page) => {
      const t0 = Date.now();
      const tr = (m) => process.env.E2E_TRACE && console.error(`[qr +${Date.now() - t0}ms] ${m}`);
      // il QR da leggere viene creato con il generatore QR dello stesso sito e scaricato come PNG
      const gen = await page.context().newPage();
      await gen.goto(base + '/qr-code-generator/');
      tr('generatore caricato');
      await gen.fill('#qr-url', 'https://example.com/ciao?da=qr');
      await gen.waitForSelector('[data-testid=qr-preview]', { timeout: 60000 });
      tr('anteprima');
      // sotto carico il QR può non essere ancora disegnato: il pulsante PNG deve essere attivo prima del clic
      const pngBtn = gen.getByRole('button', { name: /PNG/ }).first();
      await pngBtn.waitFor({ state: 'visible', timeout: 60000 });
      await gen.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => /PNG/.test(b.textContent ?? '') && !b.disabled), null, { timeout: 60000 });
      tr('pulsante PNG attivo');
      const [download] = await Promise.all([gen.waitForEvent('download', { timeout: 60000 }), pngBtn.click()]);
      tr('download partito');
      const stream = await download.createReadStream();
      const chunks = [];
      for await (const c of stream) chunks.push(c);
      tr('download letto: ' + chunks.length + ' pezzi');
      await gen.close();
      await page.setInputFiles('input[type=file]', [{ name: 'qr.png', mimeType: 'image/png', buffer: Buffer.concat(chunks) }]);
      tr('file inserito');
      await page.waitForSelector('[data-testid=qrr-result]', { timeout: 60000 });
      tr('risultato');
    },
  });
  await shot('sort-lines.png', {
    width: 1280,
    dark: false,
    path: '/sort-lines/',
    setup: async (page) => {
      await page.fill('#sl-in', 'mela\nPera\nbanana\nmela\n\nalbicocca\nbanana\nmela\nciliegia\nPera');
      await page.selectOption('#sl-mode', 'frequency');
      await page.selectOption('#sl-dedupe', 'ignoreCase');
      await page.locator('[data-testid=sl-count]').check();
      await page.waitForFunction(() => (document.querySelector('[data-testid=sl-out]')?.value ?? '').includes('3×'));
    },
  });
  await shot('find-replace.png', {
    width: 1280,
    dark: false,
    path: '/find-replace/',
    setup: async (page) => {
      await page.getByRole('button', { name: 'Carica un esempio' }).click();
      await page.waitForSelector('[data-testid=fr-preview] mark');
      await page.waitForTimeout(300);
    },
  });
  await shot('text-to-speech.png', {
    width: 1280,
    dark: false,
    path: '/text-to-speech/',
    setup: async (page) => {
      await page.getByRole('button', { name: 'Testo di esempio' }).click();
      await page.waitForTimeout(1800); // il browser carica le voci locali (se ce ne sono)
    },
  });

  // ---- Firma PDF, ritaglio immagini, anteprima meta tag (verificano anche il risultato scaricato) ----
  const need = (cond, msg) => {
    if (!cond) throw new Error(msg);
  };
  const downloadBuffer = async (page, click) => {
    const [dl] = await Promise.all([page.waitForEvent('download'), click()]);
    const chunks = [];
    for await (const c of await dl.createReadStream()) chunks.push(c);
    return { name: dl.suggestedFilename(), buffer: Buffer.concat(chunks) };
  };
  const jpegSize = (b) => {
    for (let i = 2; i + 9 < b.length; ) {
      if (b[i] !== 0xff) return null;
      const m = b[i + 1];
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { width: b.readUInt16BE(i + 7), height: b.readUInt16BE(i + 5) };
      i += 2 + b.readUInt16BE(i + 2);
    }
    return null;
  };
  // PNG di prova con uno scarabocchio scuro su fondo bianco (firma "fotografata")
  const scribblePng = (page) =>
    page.evaluate(async () => {
      const c = document.createElement('canvas');
      c.width = 600;
      c.height = 240;
      const g = c.getContext('2d');
      g.fillStyle = '#fff';
      g.fillRect(0, 0, 600, 240);
      g.strokeStyle = '#1b1b4b';
      g.lineWidth = 8;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(60, 160);
      for (let x = 60; x < 540; x += 30) g.lineTo(x + 15, x % 60 ? 70 : 170);
      g.stroke();
      const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let s = '';
      for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      return btoa(s);
    });
  // Strumenti PDF a un solo file (blocco comune: PdfSource); ogni caso carica un PDF di prova e controlla il file scaricato
  const loadPdfIn = async (page, buffer, name = 'documento.pdf') => {
    await page.setInputFiles('app-file-drop input[type=file]', [{ name, mimeType: 'application/pdf', buffer }]);
    await page.waitForSelector('[data-testid=pdf-info]');
  };
  await shot('pdf-metadata.png', {
    width: 1280,
    dark: false,
    path: '/pdf-metadata/',
    setup: async (page) => {
      await loadPdfIn(page, await makePdf('Contratto di esempio', 'Contratto', [[0.18, 0.43, 0.62]], 2));
      need((await page.inputValue('#pm-title')) === 'Contratto di esempio', 'titolo non letto');
      await page.fill('#pm-author', 'Mario Rossi');
      await page.fill('#pm-created', 'ieri');
      await page.getByTestId('pm-save').click();
      await page.getByTestId('pm-error').waitFor();
      await page.fill('#pm-created', '2026-01-02T03:04:05Z');
      const saved = await downloadBuffer(page, () => page.getByTestId('pm-save').click());
      const d1 = await PDFDocument.load(saved.buffer, { updateMetadata: false });
      need(d1.getAuthor() === 'Mario Rossi' && d1.getTitle() === 'Contratto di esempio', 'metadati non scritti');
      need(d1.getCreationDate()?.toISOString() === '2026-01-02T03:04:05.000Z', 'data non scritta');
      const wiped = await downloadBuffer(page, () => page.getByTestId('pm-wipe').click());
      const d2 = await PDFDocument.load(wiped.buffer, { updateMetadata: false });
      need(!d2.getTitle() && !d2.getAuthor() && d2.getPageCount() === 2, 'metadati non rimossi');
      await page.waitForSelector('[data-testid=pm-done]');
    },
  });
  // testo (in chiaro) scritto nelle pagine di un PDF creato da pdf-lib: i flussi sono compressi e le stringhe in esadecimale
  const pageTexts = async (buffer) => {
    const doc = await PDFDocument.load(buffer);
    return doc.getPages().map((pg) => {
      const c = pg.node.Contents();
      const refs = c?.asArray?.() ?? (c ? [c] : []);
      return refs
        .map((r) => doc.context.lookup(r))
        .filter((st) => st instanceof PDFRawStream)
        .map((st) => Buffer.from(decodePDFRawStream(st).decode()).toString('latin1'))
        .join('\n')
        .replace(/<([0-9A-F]+)> Tj/g, (_, h) => '(' + Buffer.from(h, 'hex').toString('latin1') + ') Tj');
    });
  };
  await shot('pdf-page-text.png', {
    width: 1280,
    dark: false,
    path: '/pdf-page-text/',
    setup: async (page) => {
      await loadPdfIn(page, await makePdf('Relazione di esempio', 'Relazione', [[0.18, 0.43, 0.62], [0.7, 0.33, 0.16]], 3));
      await page.getByTestId('pt-preset-nm').click();
      await page.fill('#pt-header-left', '{name}');
      await page.fill('#pt-pages', '9');
      await page.getByTestId('pt-go').click();
      await page.getByTestId('pt-error').waitFor();
      await page.fill('#pt-pages', '');
      await page.check('text=Salta la prima pagina (copertina)');
      const out = await downloadBuffer(page, () => page.getByTestId('pt-go').click());
      const t = await pageTexts(out.buffer);
      need(t.length === 3, 'pagine');
      need(!t[0].includes('(1 / 3) Tj') && t[1].includes('(2 / 3) Tj') && t[2].includes('(3 / 3) Tj'), 'numeri di pagina: ' + t.map((x) => x.length));
      need(t[1].includes('(documento.pdf) Tj'), 'nome del file nell\'intestazione');
      await page.getByTestId('pt-preview').click();
      await page.getByTestId('pt-preview-img').waitFor();
    },
  });
  await shot('pdf-compress.png', {
    width: 1280,
    dark: false,
    path: '/pdf-compress/',
    setup: async (page) => {
      // PDF di 2 pagine con una foto rumorosa (JPEG pesante) creata in pagina con un canvas
      const jpegB64 = await page.evaluate(async () => {
        const c = document.createElement('canvas');
        c.width = 1600;
        c.height = 1200;
        const x = c.getContext('2d');
        const img = x.createImageData(1600, 1200);
        for (let i = 0; i < img.data.length; i += 4) {
          img.data[i] = (Math.sin(i * 0.0007) * 127 + 128 + Math.random() * 90) & 255;
          img.data[i + 1] = (i / 4) % 256;
          img.data[i + 2] = Math.random() * 255;
          img.data[i + 3] = 255;
        }
        x.putImageData(img, 0, 0);
        const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.95));
        const buf = new Uint8Array(await blob.arrayBuffer());
        let s = '';
        for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
        return btoa(s);
      });
      const doc = await PDFDocument.create();
      const jpg = await doc.embedJpg(Buffer.from(jpegB64, 'base64'));
      for (let i = 0; i < 2; i++) doc.addPage([595, 842]).drawImage(jpg, { x: 20, y: 300, width: 555, height: 416 });
      const src = Buffer.from(await doc.save());
      await loadPdfIn(page, src);
      await page.selectOption('#pcz-side', '800');
      await page.getByTestId('pcz-go').click();
      await page.getByTestId('pcz-result').waitFor();
      const out = await downloadBuffer(page, () => page.getByTestId('pcz-download').click());
      const d = await PDFDocument.load(out.buffer);
      need(d.getPageCount() === 2, 'pagine dopo la compressione');
      need(out.buffer.length < src.length * 0.6, 'riduzione insufficiente: ' + src.length + ' -> ' + out.buffer.length);
      // solo ottimizzazione: nessun guadagno per un file già compatto, niente download offerto
      await page.getByRole('button', { name: 'Solo ottimizza il file' }).click();
      await page.getByTestId('pcz-go').click();
      await page.waitForFunction(() => document.querySelector('[data-testid=pcz-result]') !== null);
      // pagine come immagini
      await page.getByRole('button', { name: 'Pagine come immagini' }).click();
      await page.getByTestId('pcz-go').click();
      await page.waitForFunction(() => document.querySelector('[data-testid=pcz-download]') !== null || document.querySelector('.tool-warn')?.textContent.includes('Il PDF non diventa'));
      await page.getByRole('button', { name: 'Ricomprimi le immagini' }).click();
    },
  });
  await shot('pdf-crop.png', {
    width: 1280,
    dark: false,
    path: '/pdf-crop/',
    setup: async (page) => {
      await loadPdfIn(page, await makePdf('Relazione di esempio', 'Relazione', [[0.18, 0.43, 0.62], [0.7, 0.33, 0.16]], 3));
      await page.getByTestId('pcr-thumb').waitFor();
      await page.getByTestId('pcr-frame').waitFor();
      await page.fill('#pcr-top', '500');
      await page.getByTestId('pcr-go').click();
      await page.getByTestId('pcr-error').waitFor();
      await page.fill('#pcr-top', '20');
      const cropped = await downloadBuffer(page, () => page.getByTestId('pcr-go').click());
      const sizes = (await PDFDocument.load(cropped.buffer)).getPages().map((p) => p.getMediaBox());
      const mm = 72 / 25.4;
      need(Math.abs(sizes[0].width - (595 - 20 * mm)) < 1 && Math.abs(sizes[0].height - (842 - 30 * mm)) < 1, 'ritaglio: ' + JSON.stringify(sizes[0]));
      await page.getByRole('button', { name: 'Cambia la scala' }).click();
      await page.fill('#pcr-pct', '50');
      const scaled = await downloadBuffer(page, () => page.getByTestId('pcr-go').click());
      const s0 = (await PDFDocument.load(scaled.buffer)).getPage(0).getSize();
      need(Math.abs(s0.width - 297.5) < 1, 'scala: ' + s0.width);
      await page.getByRole('button', { name: 'Adatta al formato' }).click();
      await page.selectOption('#pcr-size', 'A5');
      const fit = await downloadBuffer(page, () => page.getByTestId('pcr-go').click());
      const f = (await PDFDocument.load(fit.buffer)).getPages().map((p) => p.getSize());
      need(f.length === 3 && Math.abs(f[0].width - 419.53) < 1 && Math.abs(f[2].width - 595.28) < 1, 'adatta: ' + JSON.stringify(f));
      await page.getByRole('button', { name: 'Ritaglia i margini' }).click();
    },
  });
  await shot('pdf-images.png', {
    width: 1280,
    dark: false,
    path: '/pdf-images/',
    setup: async (page) => {
      // un PDF con un JPEG e un PNG trasparente (creati in pagina con un canvas)
      const [jpg, png] = await page.evaluate(async () => {
        const make = async (type, alpha) => {
          const c = document.createElement('canvas');
          c.width = 96;
          c.height = 64;
          const x = c.getContext('2d');
          const g = x.createLinearGradient(0, 0, 96, 64);
          g.addColorStop(0, '#2b8a3e');
          g.addColorStop(1, '#1c7ed6');
          x.fillStyle = g;
          if (alpha) x.arc(48, 32, 30, 0, 7);
          x.fill();
          if (!alpha) x.fillRect(0, 0, 96, 64);
          const blob = await new Promise((r) => c.toBlob(r, type, 0.9));
          const buf = new Uint8Array(await blob.arrayBuffer());
          let s = '';
          for (const b of buf) s += String.fromCharCode(b);
          return btoa(s);
        };
        return [await make('image/jpeg', false), await make('image/png', true)];
      });
      const doc = await PDFDocument.create();
      const pg = doc.addPage([400, 300]);
      pg.drawImage(await doc.embedJpg(new Uint8Array(Buffer.from(jpg, 'base64'))) /* copia: i Buffer piccoli stanno in un pool condiviso e pdf-lib legge .buffer intero */, { x: 20, y: 150, width: 192, height: 128 });
      pg.drawImage(await doc.embedPng(new Uint8Array(Buffer.from(png, 'base64'))), { x: 220, y: 150, width: 160, height: 107 });
      await loadPdfIn(page, Buffer.from(await doc.save()));
      await page.waitForSelector('[data-testid=pim-card]');
      need((await page.locator('[data-testid=pim-card]').count()) === 2, 'immagini trovate: ' + (await page.locator('[data-testid=pim-card]').count()));
      const meta = await page.locator('[data-testid=pim-card]').allInnerTexts();
      need(meta.some((t) => /JPG/.test(t)) && meta.some((t) => /PNG/.test(t) && /α/.test(t)), 'formati: ' + meta.join('|'));
      const zip = await downloadBuffer(page, () => page.getByTestId('pim-zip').click());
      need(zip.buffer.subarray(0, 2).toString() === 'PK' && zip.buffer.includes('.jpg') && zip.buffer.includes('.png'), 'ZIP inatteso');
      await page.getByRole('button', { name: 'Deseleziona' }).click();
      await page.locator('[data-testid=pim-card] input[type=checkbox]').first().check();
      await page.waitForFunction(() => document.querySelector('[data-testid=pim-zip]') && !document.querySelector('[data-testid=pim-zip]').disabled); // con una sola immagine scelta il pulsante torna attivo
      // PDF senza immagini
      const empty = await PDFDocument.create();
      empty.addPage();
      await loadPdfIn(page, Buffer.from(await empty.save()));
      await page.getByTestId('pim-none').waitFor();
    },
  });
  await shot('pdf-form.png', {
    width: 1280,
    dark: false,
    path: '/pdf-form/',
    setup: async (page) => {
      const doc = await PDFDocument.create();
      const pg = doc.addPage([400, 300]);
      const form = doc.getForm();
      form.createTextField('nome').addToPage(pg, { x: 20, y: 250, width: 200, height: 20 });
      form.createCheckBox('accetto').addToPage(pg, { x: 20, y: 220, width: 16, height: 16 });
      const dd = form.createDropdown('citta');
      dd.addOptions(['Roma', 'Milano']);
      dd.addToPage(pg, { x: 20, y: 180, width: 120, height: 20 });
      await loadPdfIn(page, Buffer.from(await doc.save()));
      await page.waitForSelector('#pfm-f0');
      need((await page.locator('.fields > li').count()) === 3, 'campi del modulo');
      await page.fill('#pfm-f0', 'Mario Rossi');
      await page.check('#pfm-f1');
      await page.selectOption('#pfm-f2', 'Milano');
      const filled = await downloadBuffer(page, () => page.getByTestId('pfm-save').click());
      const f = (await PDFDocument.load(filled.buffer)).getForm();
      need(f.getTextField('nome').getText() === 'Mario Rossi' && f.getCheckBox('accetto').isChecked() && f.getDropdown('citta').getSelected()[0] === 'Milano', 'valori non scritti');
      const flat = await downloadBuffer(page, () => page.getByTestId('pfm-flatten').click());
      need((await PDFDocument.load(flat.buffer)).getForm().getFields().length === 0, 'campi non appiattiti');
      // PDF senza moduli
      const plain = await PDFDocument.create();
      plain.addPage();
      await loadPdfIn(page, Buffer.from(await plain.save()));
      await page.getByTestId('pfm-none').waitFor();
    },
  });
  await shot('pdf-redact.png', {
    width: 1280,
    dark: false,
    path: '/pdf-redact/',
    setup: async (page) => {
      need(await page.getByTestId('prd-warning').isVisible(), 'avviso sull\'oscuramento non visibile');
      await loadPdfIn(page, await makePdf('Relazione di esempio', 'Relazione', [[0.18, 0.43, 0.62], [0.7, 0.33, 0.16]], 3));
      await page.getByTestId('prd-stage').locator('canvas').waitFor();
      await page.waitForFunction(() => (document.querySelector('[data-testid=prd-stage] canvas')?.width ?? 0) > 100);
      // un rettangolo disegnato con il mouse sulla prima pagina
      const box = await page.getByTestId('prd-stage').boundingBox();
      await page.mouse.move(box.x + box.width * 0.1, box.y + box.height * 0.1);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.2, { steps: 5 });
      await page.mouse.up();
      await page.waitForSelector('[data-testid=prd-area]');
      need((await page.getByTestId('prd-total').innerText()).includes('1 aree'), 'totale: ' + (await page.getByTestId('prd-total').innerText()));
      // ricerca: il testo «Pagina 3» si copre dove compare
      await page.fill('#prd-q', 'Pagina 3');
      await page.getByTestId('prd-find').click();
      await page.waitForFunction(() => document.querySelector('[data-testid=prd-search-note]')?.textContent.includes('1 occorrenze'));
      const out = await downloadBuffer(page, () => page.getByTestId('prd-go').click());
      const d = await PDFDocument.load(out.buffer);
      const pages = d.getPages();
      const fonts = pages.map((p) => (p.node.Resources()?.lookup(PDFName.of('Font'))?.keys().length ?? 0) > 0); // con almeno un carattere: pagina con testo vero
      need(pages.length === 3, 'pagine: ' + pages.length);
      need(fonts[0] === false && fonts[1] === true && fonts[2] === false, 'pagine oscurate/intatte: ' + fonts.join(','));
      await page.getByTestId('prd-next').click();
      await page.getByTestId('prd-whole').click();
      await page.waitForFunction(() => document.querySelector('[data-testid=prd-total]')?.textContent.includes('3 aree'));
    },
  });
  await shot('pdf-protect.png', {
    width: 1280,
    dark: false,
    path: '/pdf-protect/',
    setup: async (page) => {
      need(await page.getByTestId('ppw-warning').isVisible(), 'avviso sulla password perduta non visibile');
      await loadPdfIn(page, await makePdf('Relazione di esempio', 'Relazione', [[0.18, 0.43, 0.62]], 2));
      await page.getByTestId('ppw-go').click();
      await page.getByTestId('ppw-error').waitFor(); // nessuna password e nessun limite
      await page.fill('#ppw-user', 'segreta');
      await page.fill('#ppw-user2', 'diversa');
      await page.getByTestId('ppw-go').click();
      await page.waitForFunction(() => document.querySelector('[data-testid=ppw-error]')?.textContent.includes('non coincidono'));
      await page.fill('#ppw-user2', 'segreta');
      await page.uncheck('#ppw-copy');
      const out = await downloadBuffer(page, () => page.getByTestId('ppw-go').click());
      need(out.name.endsWith('-protetto.pdf') && out.buffer.includes('/AESV3') && out.buffer.includes('/Encrypt'), 'PDF non cifrato');
      let rejected = false;
      await PDFDocument.load(out.buffer).catch(() => (rejected = true));
      need(rejected, 'pdf-lib apre il PDF cifrato');
      // il PDF protetto non è più accettato dagli altri strumenti PDF (serve la password): messaggio chiaro
      await page.setInputFiles('app-file-drop input[type=file]', [{ name: 'protetto.pdf', mimeType: 'application/pdf', buffer: out.buffer }]);
      await page.getByTestId('pdf-error').waitFor();
    },
  });
  await shot('pdf-sign.png', {
    width: 1280,
    dark: false,
    path: '/pdf-sign/',
    setup: async (page) => {
      need(await page.locator('[data-testid=sign-warning]').isVisible(), 'avviso sulla firma grafica non visibile');
      // PDF cifrato: errore chiaro e nessun documento caricato
      const enc = await PDFDocument.create();
      enc.addPage();
      enc.context.trailerInfo.Encrypt = enc.context.register(enc.context.obj({ Filter: 'Standard' }));
      await page.setInputFiles('app-file-drop input[type=file]', [{ name: 'cifrato.pdf', mimeType: 'application/pdf', buffer: Buffer.from(await enc.save()) }]);
      await page.locator('[data-testid=sign-error]', { hasText: /cifrat|protett/i }).waitFor();
      need((await page.locator('[data-testid=sign-doc]').count()) === 0, 'un PDF cifrato è stato caricato');
      // PDF vero: 3 pagine (la terza è orizzontale)
      const pdf = await makePdf('Contratto di esempio', 'Contratto', [[0.18, 0.43, 0.62], [0.7, 0.33, 0.16]], 3);
      await page.setInputFiles('app-file-drop input[type=file]', [{ name: 'contratto.pdf', mimeType: 'application/pdf', buffer: pdf }]);
      await page.locator('[data-testid=sign-doc]').waitFor();
      await page.waitForFunction(() => document.querySelector('[data-testid=sign-stage] canvas')?.width > 100);
      need((await page.locator('[data-testid=sign-error]').count()) === 0, 'errore rimasto dopo un PDF valido');

      // 1. firma disegnata con il mouse
      const pad = await page.locator('[data-testid=sign-pad]').boundingBox();
      await page.mouse.move(pad.x + pad.width * 0.1, pad.y + pad.height * 0.6);
      await page.mouse.down();
      for (let i = 1; i <= 12; i++) await page.mouse.move(pad.x + pad.width * (0.1 + i * 0.07), pad.y + pad.height * (i % 2 ? 0.25 : 0.75), { steps: 4 });
      await page.mouse.up();
      await page.locator('[data-testid=sign-use-draw]').click();
      await page.locator('[data-testid=sign-library] li').first().waitFor();
      // 2. pagina 2: firma, trascinata e poi spostata con la tastiera
      await page.getByRole('button', { name: 'Successiva' }).click();
      await page.locator('[data-testid=sign-add]').click();
      const sig = page.locator('.item[data-kind=signature]');
      await sig.waitFor();
      const stageBox = () => page.locator('[data-testid=sign-stage]').boundingBox();
      const itemBox = () => sig.boundingBox();
      await sig.scrollIntoViewIfNeeded();
      const before = await itemBox();
      await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
      await page.mouse.down();
      await page.mouse.move(before.x + before.width / 2 - 120, before.y + before.height / 2 - 160, { steps: 6 });
      await page.mouse.up();
      await page.waitForTimeout(200);
      const dragged = await itemBox();
      need(Math.abs(dragged.x - (before.x - 120)) < 3 && Math.abs(dragged.y - (before.y - 160)) < 3, 'il trascinamento non ha spostato la firma');
      await sig.focus();
      for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight');
      await page.keyboard.press('+');
      await page.waitForTimeout(200);
      const keyed = await itemBox();
      need(keyed.x > dragged.x + 2 && keyed.width > dragged.width, 'le frecce o + non hanno agito');
      // 3. data sulla stessa pagina
      await page.locator('[data-testid=sign-add-date]').click();
      await page.locator('.item[data-kind=date]').waitFor();
      // 4. firma digitata sulla pagina 3
      await page.getByRole('button', { name: 'Scrivi', exact: true }).click();
      await page.fill('#sign-text', 'Mario Rossi');
      await page.locator('[data-testid=sign-use-type]').click();
      await page.waitForFunction(() => document.querySelectorAll('[data-testid=sign-library] li').length === 2);
      await page.getByRole('button', { name: 'Successiva' }).click();
      await page.locator('[data-testid=sign-add]').click();
      await page.locator('.item[data-kind=signature]').waitFor();
      // 5. firma da immagine con sfondo bianco rimosso, sulla pagina 1
      await page.getByRole('button', { name: 'Da immagine', exact: true }).click();
      await page.setInputFiles('[data-testid=sign-image-input]', [{ name: 'firma.png', mimeType: 'image/png', buffer: Buffer.from(await scribblePng(page), 'base64') }]);
      await page.locator('[data-testid=sign-image-preview]').waitFor();
      await page.locator('[data-testid=sign-use-image]').click();
      await page.waitForFunction(() => document.querySelectorAll('[data-testid=sign-library] li').length === 3);
      await page.fill('#sign-page', '1');
      await page.locator('#sign-page').dispatchEvent('change');
      await page.locator('[data-testid=sign-add]').click();
      await page.locator('.item[data-kind=signature]').waitFor();
      // torna alla pagina 2 per leggere dove sta la firma trascinata
      await page.fill('#sign-page', '2');
      await page.locator('#sign-page').dispatchEvent('change');
      await page.locator('.item[data-kind=date]').waitFor();
      const st = await stageBox();
      const final = await itemBox();
      const frac = { x: (final.x - st.x) / st.width, y: (final.y - st.y) / st.height, w: final.width / st.width, h: final.height / st.height };

      // 6. il PDF scaricato contiene davvero le immagini, nella pagina giusta e nel punto giusto
      const out = await downloadBuffer(page, () => page.locator('[data-testid=sign-download]').click());
      need(out.name === 'contratto-firmato.pdf', 'nome del file inatteso: ' + out.name);
      const doc = await PDFDocument.load(out.buffer);
      need(doc.getPageCount() === 3, 'il PDF firmato non ha 3 pagine');
      const xobjects = (i) => {
        const xo = doc.getPage(i).node.Resources()?.lookup(PDFName.of('XObject'));
        return xo ? xo.entries().length : 0;
      };
      need(xobjects(0) === 1 && xobjects(1) === 1 && xobjects(2) === 1, `immagini per pagina: ${[0, 1, 2].map(xobjects)} (attese 1,1,1)`);
      need(!!doc.getPage(1).node.Resources()?.lookup(PDFName.of('Font')), 'la data non è nella pagina 2');
      const contents = doc.getPage(1).node.Contents();
      const parts = (contents.asArray ? contents.asArray() : [contents]).map((r) => Buffer.from(decodePDFRawStream(doc.context.lookup(r)).decode()).toString('latin1'));
      const text = parts.join('\n');
      const lastDo = text.lastIndexOf(' Do');
      need(lastDo > 0, 'operatore Do non trovato nella pagina 2');
      const cms = [...text.slice(0, lastDo).matchAll(/q\n1 0 0 1 ([-\d.]+) ([-\d.]+) cm/g)];
      const cm = cms[cms.length - 1];
      const { width: pw, height: ph } = doc.getPage(1).getSize();
      const gotX = Number(cm[1]);
      const gotY = Number(cm[2]);
      const wantX = frac.x * pw;
      const wantY = ph - (frac.y + frac.h) * ph;
      need(Math.abs(gotX - wantX) < 1.5 && Math.abs(gotY - wantY) < 1.5, `posizione della firma nel PDF (${gotX}, ${gotY}) diversa da quella a schermo (${wantX.toFixed(1)}, ${wantY.toFixed(1)})`);
      await page.waitForTimeout(300);
    },
  });
  await shot('image-crop.png', {
    width: 1280,
    dark: false,
    path: '/image-crop/',
    setup: async (page) => {
      const [photo] = await drawImages(page);
      // orientamento EXIF 6 (ruotata di 90°): lo strumento deve mostrarla già dritta, cioè con i lati scambiati
      const rotated = Buffer.from(exifJpeg(photo.buffer));
      const at = rotated.indexOf(Buffer.from([0x12, 0x01, 0x03, 0x00, 0x01, 0x00, 0x00, 0x00]));
      need(at > 0, 'voce Orientation non trovata nel JPEG di prova');
      rotated[at + 8] = 6;
      await page.setInputFiles('input[type=file]', [{ name: 'montagna.jpg', mimeType: 'image/jpeg', buffer: rotated }]);
      await page.locator('[data-testid=crop-source]', { hasText: '1067×1600' }).waitFor();
      // ritorna all'immagine normale per le prove di ritaglio
      await page.setInputFiles('input[type=file]', [{ name: 'montagna.jpg', mimeType: 'image/jpeg', buffer: photo.buffer }]);
      await page.locator('[data-testid=crop-source]', { hasText: '1600×1067' }).waitFor();
      await page.waitForFunction(() => document.querySelector('[data-testid=crop-stage] canvas')?.width > 100);

      // proporzioni 1:1 e maniglia SE trascinata: il rapporto resta 1:1
      await page.getByRole('button', { name: '1:1', exact: true }).click();
      // si aspetta l'aggiornamento dei campi (sui runner veloci la lettura immediata vede ancora i valori vecchi)
      await page
        .waitForFunction(() => {
          const v = (id) => Number(document.querySelector(id).value);
          return Math.abs(v('#crop-w') - v('#crop-h')) <= 1;
        }, null, { timeout: 5000 })
        .catch(() => need(false, 'il ritaglio 1:1 non è quadrato'));
      const w0 = Number(await page.inputValue('#crop-w'));
      const handle = await page.locator('[data-handle=se]').boundingBox();
      await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
      await page.mouse.down();
      await page.mouse.move(handle.x + handle.width / 2 - 60, handle.y + handle.height / 2 - 20, { steps: 5 });
      await page.mouse.up();
      const w1 = Number(await page.inputValue('#crop-w'));
      const h1 = Number(await page.inputValue('#crop-h'));
      need(w1 < w0 && Math.abs(w1 - h1) <= 1, `la maniglia non ha ridotto il ritaglio mantenendo 1:1 (${w0} → ${w1}×${h1})`);
      // tastiera: le frecce spostano l'area
      const label = () => page.locator('[data-testid=crop-box]').getAttribute('aria-label');
      const l0 = await label();
      await page.locator('[data-testid=crop-box]').focus();
      await page.keyboard.press('ArrowLeft');
      await page.waitForTimeout(200);
      need((await label()) !== l0, 'le frecce non hanno spostato il ritaglio');
      // rotazione di 90° a destra e ridimensionamento a 300 px di larghezza
      await page.getByRole('button', { name: '90° a destra' }).click();
      await page.getByRole('button', { name: 'Ripristina il ritaglio' }).click();
      await page.fill('#crop-out-w', '300');
      await page.locator('[data-testid=crop-result]', { hasText: /^Risultato: 300×\d+ px$/ }).waitFor();
      const png = await downloadBuffer(page, () => page.locator('[data-testid=crop-download]').click());
      need(png.name === 'montagna-ritaglio.png', 'nome file inatteso: ' + png.name);
      need(png.buffer.readUInt32BE(16) === 300, 'larghezza del PNG ≠ 300');
      const crop = await page.locator('[data-testid=crop-result]').textContent();
      need(png.buffer.readUInt32BE(20) === Number(/×(\d+)/.exec(crop)[1]), 'altezza del PNG diversa dal risultato annunciato');
      // foto tessera 35×45 in JPEG, 350 px di larghezza → 350×450
      await page.getByRole('button', { name: 'Foto tessera 35×45' }).click();
      await page.fill('#crop-out-w', '350');
      await page.locator('[data-testid=crop-result]', { hasText: 'Risultato: 350×450 px' }).waitFor();
      await page.getByRole('button', { name: 'JPEG', exact: true }).click();
      const jpg = await downloadBuffer(page, () => page.locator('[data-testid=crop-download]').click());
      const dims = jpegSize(jpg.buffer);
      need(dims && dims.width === 350 && dims.height === 450, 'dimensioni del JPEG: ' + JSON.stringify(dims));
      need(!jpg.buffer.includes(Buffer.from('Exif')), 'il JPEG ritagliato contiene ancora metadati EXIF');
      await page.waitForTimeout(300);
    },
  });
  await shot('image-converter.png', {
    width: 1280,
    dark: false,
    path: '/image-converter/',
    setup: async (page) => {
      const photos = await drawImages(page);
      await page.setInputFiles('input[type=file]', photos);
      await page.waitForFunction(() => document.querySelectorAll('.row[data-status="done"]').length === document.querySelectorAll('li.row').length, null, { timeout: 30000 });
      await page.waitForTimeout(300);
    },
  });
  await shot('image-watermark.png', {
    width: 1280,
    dark: false,
    path: '/image-watermark/',
    setup: async (page) => {
      await page.setInputFiles('input[type=file]', await drawImages(page));
      await page.waitForSelector('[data-testid=wm-files] li');
      await page.locator('[data-pos=tile]').click();
      await page.fill('#wm-text', 'rrstudio');
      await page.waitForTimeout(500);
    },
  });
  // PDF di prova per "PDF in testo", creati al volo con pdf-lib: tre pagine con intestazione e piè di pagina ripetuti,
  // una parola spezzata col trattino a fine riga e due paragrafi; poi un PDF di sole immagini (nessun livello di testo)
  const textPdf = async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const bodies = [
      [
        ['Contratto di prova', 20, 700, bold],
        ["Questo documento serve a verificare che l'estrazione ricostruisca", 12, 650],
        ['correttamente le righe e le parole spez-', 12, 634],
        ["zate a fine riga senza perdere l'ordine.", 12, 618],
        ['Secondo paragrafo con una frase conclusiva.', 12, 570],
      ],
      [['Seconda pagina: testo diverso da quello della prima.', 12, 650]],
      [['Terza pagina: qui finisce il documento di prova.', 12, 650]],
    ];
    bodies.forEach((lines, i) => {
      const pg = doc.addPage([595, 842]);
      pg.drawText('Contratto di esempio', { x: 40, y: 800, size: 9, font });
      for (const [t, size, y, f] of lines) pg.drawText(t, { x: 40, y, size, font: f ?? font });
      pg.drawText(`Pagina ${i + 1} di 3`, { x: 40, y: 30, size: 9, font });
    });
    return Buffer.from(await doc.save());
  };
  const imageOnlyPdf = async () => {
    const doc = await PDFDocument.create();
    const png = await doc.embedPng(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'));
    for (let i = 0; i < 2; i++) doc.addPage([595, 842]).drawImage(png, { x: 40, y: 40, width: 515, height: 760 });
    return Buffer.from(await doc.save());
  };
  await shot('pdf-to-text.png', {
    width: 1280,
    dark: false,
    path: '/pdf-to-text/',
    setup: async (page) => {
      // 1. PDF di sole immagini: messaggio "serve OCR" e conteggio delle pagine senza testo
      await page.setInputFiles('input[type=file]', [{ name: 'scansione.pdf', mimeType: 'application/pdf', buffer: await imageOnlyPdf() }]);
      await page.locator('[data-testid=p2t-ocr]').waitFor({ timeout: 30000 });
      need(/OCR/.test(await page.locator('[data-testid=p2t-ocr]').innerText()), 'il messaggio per i PDF senza testo non cita l\'OCR');
      need(/2 senza testo/.test(await page.locator('[data-testid=p2t-without]').innerText()), 'conteggio delle pagine senza testo errato');
      need((await page.locator('[data-testid=p2t-ocr] a[href$="pdf-to-images"]').count()) === 1, 'manca il link a pdf-to-images');
      await page.locator('[data-shortcut=clear]').click();
      // 2. PDF con testo: frasi nell'ordine giusto, trattino unito, intestazione e piè di pagina tolti
      await page.setInputFiles('input[type=file]', [{ name: 'contratto.pdf', mimeType: 'application/pdf', buffer: await textPdf() }]);
      await page.locator('[data-testid=p2t-with]', { hasText: '3 con testo' }).waitFor({ timeout: 30000 });
      const shown = await page.locator('[data-testid=p2t-pages-text]').innerText();
      const flat = shown.replace(/\s+/g, ' ');
      const phrases = ['Contratto di prova', "Questo documento serve a verificare che l'estrazione ricostruisca", 'Secondo paragrafo con una frase conclusiva.', 'Seconda pagina', 'Terza pagina'];
      let from = 0;
      for (const ph of phrases) {
        const at = flat.indexOf(ph, from);
        need(at >= 0, `frase mancante o fuori ordine nel testo estratto: «${ph}»`);
        from = at + ph.length;
      }
      need(flat.includes('le parole spezzate a fine riga'), 'il trattino a fine riga non è stato unito: ' + flat.slice(0, 300));
      need(!/spez-/.test(flat), 'resta una parola spezzata col trattino');
      need(!/Contratto di esempio/.test(flat) && !/Pagina \d di 3/.test(flat), 'intestazione o piè di pagina ripetuti non tolti');
      // con l'opzione dei trattini spenta il trattino resta
      await page.locator('[data-testid=p2t-dehyphenate]').uncheck();
      await page.waitForFunction(() => /spez-/.test(document.querySelector('[data-testid=p2t-pages-text]').textContent));
      await page.locator('[data-testid=p2t-dehyphenate]').check();
      await page.waitForFunction(() => !/spez-/.test(document.querySelector('[data-testid=p2t-pages-text]').textContent));
      // scarico del .txt con i separatori di pagina
      const txt = await downloadBuffer(page, () => page.locator('[data-testid=p2t-txt]').click());
      need(txt.name === 'contratto.txt', 'nome del .txt inatteso: ' + txt.name);
      const body = txt.buffer.toString('utf8');
      need(body.startsWith('--- Pagina 1 ---') && body.includes('--- Pagina 3 ---') && body.includes('spezzate a fine riga'), 'contenuto del .txt inatteso');
      const md = await downloadBuffer(page, () => page.locator('[data-testid=p2t-md]').click());
      need(md.name === 'contratto.md' && md.buffer.toString('utf8').startsWith('# contratto.pdf\n\n## Pagina 1'), 'contenuto del .md inatteso');
      await page.waitForTimeout(300);
    },
  });
  await shot('image-color-picker.png', {
    width: 1280,
    dark: false,
    path: '/image-color-picker/',
    setup: async (page) => {
      const [photo] = await drawImages(page);
      await page.setInputFiles('input[type=file]', [photo]);
      await page.waitForSelector('[data-testid=cpk-palette] li');
      await page.locator('[data-testid=cpk-stage]').click({ position: { x: 60, y: 60 } });
      await page.waitForTimeout(300);
    },
  });
  await shot('svg-to-png.png', {
    width: 1280,
    dark: false,
    path: '/svg-to-png/',
    setup: async (page) => {
      await page.locator('[data-testid=s2p-sample]').click();
      await page.waitForSelector('[data-testid=s2p-preview]');
      await page.waitForTimeout(300);
    },
  });
  await shot('color-converter.png', {
    width: 1280,
    dark: false,
    path: '/color-converter/',
    setup: async (page) => {
      await page.fill('[data-testid=colc-text]', 'oklch(62% 0.19 260)');
      await page.waitForSelector('[data-testid=colc-shades]');
    },
  });
  await shot('curl-converter.png', {
    width: 1280,
    dark: false,
    path: '/curl-converter/',
    setup: async (page) => {
      await page.click('[data-testid=curl-sample]');
      await page.waitForFunction(() => document.querySelector('[data-testid=curl-output]')?.value.includes('fetch('));
      // con fetch nel browser l'intestazione Referer non è impostabile: deve comparire l'avviso
      await page.waitForSelector('[data-testid=curl-warnings]');
      await page.getByRole('button', { name: 'Python (requests)' }).click();
      await page.waitForFunction(() => document.querySelector('[data-testid=curl-output]')?.value.includes('import requests'));
      const code = await page.locator('[data-testid=curl-output]').inputValue();
      need(code.includes('json_data = {') && code.includes("'customer': 'Mario Rossi'"), 'corpo JSON non convertito in Python');
      await page.getByRole('button', { name: 'JavaScript (fetch)' }).click();
      await page.waitForSelector('[data-testid=curl-warnings]');
    },
  });
  await shot('url-parser.png', {
    width: 1280,
    dark: false,
    path: '/url-parser/',
    setup: async (page) => {
      await page.click('[data-testid=urlp-sample]');
      await page.waitForSelector('[data-testid=urlp-table]');
      // rimuovi tracciamento: nell'URL ricostruito non restano utm_* e fbclid
      await page.click('[data-testid=urlp-strip]');
      await page.waitForFunction(() => !document.querySelector('[data-testid=urlp-output]')?.value.includes('utm_'));
      const out = await page.locator('[data-testid=urlp-output]').inputValue();
      need(out.includes('colore=rosso') && !out.includes('fbclid') && out.endsWith('#recensioni'), 'URL ricostruito dopo la rimozione del tracciamento: ' + out);
      await page.click('[data-testid=urlp-sample]');
      await page.waitForSelector('[data-testid=urlp-table] .badge');
    },
  });
  await shot('compound-interest.png', {
    width: 1280,
    dark: false,
    path: '/compound-interest/',
    setup: async (page) => {
      await page.fill('#ci-principal', '10.000');
      await page.fill('#ci-contribution', '200');
      await page.fill('#ci-rate', '6');
      await page.fill('#ci-years', '20');
      await page.fill('#ci-inflation', '2');
      await page.waitForSelector('[data-testid=ci-chart] rect');
      // 10.000 € + 200 €/mese a fine mese, 6% annuo capitalizzato mensilmente: montante 10.000·1,005^240 + 200·(1,005^240 − 1)/0,005
      const fin = (await page.locator('[data-testid=ci-final]').innerText()).replace(/\s/g, '');
      need(fin === '125.510,22€', 'montante inatteso: ' + fin);
    },
  });
  await shot('meta-tag-preview.png', {
    width: 1280,
    dark: false,
    path: '/meta-tag-preview/',
    setup: async (page) => {
      // HTML pieno di risorse esterne: non deve partire nessuna richiesta (shot() le segnala come errori)
      const external = [];
      page.on('request', (r) => !/^(blob:|data:)/.test(r.url()) && !r.url().startsWith(base) && external.push(r.url()));
      await page.fill(
        '#meta-html',
        `<html lang="en"><head><title>Prova</title>
<link rel="stylesheet" href="https://cdn.tracker.test/x.css"><link rel="icon" href="https://cdn.tracker.test/f.png">
<script src="https://cdn.tracker.test/a.js"></script>
<meta property="og:image" content="https://cdn.tracker.test/og.png"><meta name="twitter:image" content="https://cdn.tracker.test/tw.png">
</head><body><img src="https://cdn.tracker.test/pixel.gif"><iframe src="https://cdn.tracker.test/f"></iframe><video poster="https://cdn.tracker.test/p.jpg"></video></body></html>`,
      );
      await page.locator('[data-testid=meta-parsed]', { hasText: /Letti \d+ campi/ }).waitFor();
      await page.locator('[data-testid=meta-placeholder]').first().waitFor();
      need((await page.locator('[data-testid=meta-placeholder]').first().textContent()).includes('https://cdn.tracker.test/og.png'), 'il segnaposto non mostra l\'URL di og:image');
      need((await page.locator('[data-testid=meta-checks] li[data-code=descMissing]').count()) === 1, 'avviso description mancante assente');
      need((await page.locator('[data-testid=meta-checks] li[data-code=ogTitleMissing]').count()) === 1, 'avviso og:title mancante assente');
      need((await page.locator('img[src^="http"]').count()) === 0, 'un\'immagine remota è finita nella pagina');
      await page.waitForTimeout(500);
      need(external.length === 0, 'richieste di rete da HTML incollato: ' + external.join(', '));
      // modifica di un campo → controllo "titolo lungo" e snippet
      await page.fill('#meta-f-title', 'Un titolo decisamente troppo lungo per comparire per intero in un risultato di ricerca di Google');
      await page.locator('[data-testid=meta-checks] li[data-code=titleLong]').waitFor();
      need((await page.inputValue('[data-testid=meta-snippet]')).includes('<title>Un titolo decisamente'), 'lo snippet non riflette il titolo');
      // esempio completo e immagine locale per l'anteprima
      await page.getByRole('button', { name: 'Carica un esempio' }).click();
      await page.setInputFiles('[data-testid=meta-image-input]', [{ name: 'og.png', mimeType: 'image/png', buffer: Buffer.from(await scribblePng(page), 'base64') }]);
      await page.locator('[data-testid=meta-local-img]').first().waitFor();
      need(external.length === 0, 'richieste di rete dopo l\'esempio: ' + external.join(', '));
      await page.waitForTimeout(300);
    },
  });

  // Preferiti e menu personalizzati: due stelle dalla home, un menu, esportazione, cancellazione e reimport da link.
  // Lo screenshot finale è quello della pagina di gestione con dati d'esempio.
  const must = (cond, msg) => {
    if (!cond) throw new Error(msg);
  };
  await shot('favorites.png', {
    width: 1280,
    dark: false,
    path: '/',
    setup: async (page) => {
      const readKey = () => page.evaluate(() => localStorage.getItem('rrtools.favorites'));
      // 1. due preferiti dalle card della home
      const star = (title) => page.getByRole('button', { name: 'Aggiungi ai preferiti: ' + title, exact: true });
      // con l'idratazione incrementale i pulsanti delle categorie fuori schermo restano disabilitati finché non compaiono: basta che i primi siano attivi
      await page.waitForFunction(() => document.querySelector('app-favorite-button button:not(:disabled)'));
      must((await page.locator('.pills button.pill', { hasText: 'Preferiti' }).count()) === 0, 'filtro Preferiti senza preferiti');
      await star('Base64 Encode/Decode').click();
      await star('Hash e checksum').click();
      const favCount = (n, msg) =>
        page
          .waitForFunction((n) => document.querySelector('#fav-h .cat-count')?.textContent.trim() === String(n), n, { timeout: 5000 })
          .catch(() => must(false, msg));
      await favCount(2, 'la sezione preferiti non mostra 2 strumenti');
      // il pulsante sta fuori dal link: nessun elemento interattivo annidato nelle card
      must((await page.locator('a button, a app-favorite-button').count()) === 0, 'pulsante dentro un link');
      // persistenza: dopo il ricaricamento restano premuti
      await page.reload();
      await favCount(2, 'i preferiti non sono sopravvissuti al ricaricamento');
      must(JSON.parse(await readKey()).favorites.length === 2, 'chiave rrtools.favorites mancante');
      // filtro "Preferiti" tra le categorie: compare con almeno un preferito e mostra solo quelli
      const favPill = page.locator('.pills button.pill', { hasText: 'Preferiti' });
      await favPill.waitFor();
      await page
        .waitForFunction(() => [...document.querySelectorAll('.pills .pill')].some((b) => /Preferiti\s*2$/.test(b.textContent.trim())), null, { timeout: 5000 })
        .catch(() => must(false, 'il filtro Preferiti non conta 2 strumenti'));
      await favPill.click();
      await page.waitForURL('**/?categoria=preferiti');
      await page.waitForSelector('.pill[aria-pressed=true]:has-text("Preferiti")');
      must((await page.locator('section.cat:not(.fav-sec) .card').count()) === 0, 'con il filtro Preferiti restano le categorie');
      await favCount(2, 'il filtro Preferiti non mostra i 2 preferiti');
      await page.reload(); // il filtro sopravvive al ricaricamento (dall'URL)
      await page.waitForSelector('.pill[aria-pressed=true]:has-text("Preferiti")');
      await page.locator('.pills button.pill').first().click(); // torna a "Tutti"
      await page.waitForSelector('.pill[aria-pressed=true]:has-text("Tutti")');
      // la stella nella pagina di uno strumento
      await page.goto(base + '/url-encode/');
      const toolStar = page.getByRole('button', { name: 'Aggiungi ai preferiti', exact: true });
      await toolStar.waitFor();
      must((await toolStar.getAttribute('aria-pressed')) === 'false', 'stella dello strumento già premuta');
      await toolStar.click();
      await page.waitForSelector('app-tool-frame button[aria-pressed=true]'); // stella premuta (con attesa dell'aggiornamento)
      await toolStar.click(); // la toglie di nuovo
      await page.waitForSelector('app-tool-frame button[aria-pressed=false]');
      // 2. menu a tendina dell'intestazione: Esc chiude e riporta il focus sul pulsante
      const menuBtn = page.locator('app-favorites-menu button.trigger');
      await menuBtn.click();
      await page.waitForSelector('button.trigger[aria-expanded=true]');
      await page.getByRole('link', { name: 'Hash e checksum', exact: true }).waitFor();
      await page.keyboard.press('Escape');
      await page.waitForSelector('button.trigger[aria-expanded=false]');
      must(await menuBtn.evaluate((el) => el === document.activeElement), 'il focus non torna sul pulsante');
      await menuBtn.click();
      await page.getByRole('link', { name: 'Gestisci preferiti e menu' }).click();
      await page.waitForURL('**/preferiti');
      await page.waitForSelector('#new-group');
      must((await page.locator('meta[name=robots]').getAttribute('content')).includes('noindex'), 'noindex mancante');
      // 3. un menu personalizzato con uno strumento aggiunto dalla ricerca
      await page.fill('#new-group', 'Lavoro');
      await page.getByRole('button', { name: 'Crea menu' }).click();
      await page.getByRole('button', { name: 'Aggiungi strumenti' }).nth(1).click();
      await page.getByRole('searchbox', { name: 'Cerca uno strumento da aggiungere' }).fill('uuid');
      await page.getByRole('button', { name: /^Aggiungi «Generatore UUID»/ }).click();
      await page.getByRole('button', { name: /^Aggiungi «Generatore UUID»/ }).waitFor({ state: 'detached' });
      // riordino da tastiera: "Hash" sotto "Base64" e di nuovo su
      const down = page.getByRole('button', { name: 'Sposta «Base64 Encode/Decode» in basso' });
      await down.click();
      await page.waitForFunction(() => {
        const t = [...document.querySelectorAll('ol[aria-label="Preferiti"] .row-title')].map((e) => e.textContent);
        return t[0] === 'Hash e checksum' && t[1] === 'Base64 Encode/Decode';
      });
      // 4. esportazione
      const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Esporta JSON' }).click()]);
      const exported = readFileSync(await dl.path(), 'utf8');
      const data = JSON.parse(exported);
      must(data.v === 1 && data.favorites.length === 2 && data.groups.length === 1 && data.groups[0].tools.length === 1, 'esportazione inattesa');
      // 5. link di condivisione
      await page.getByRole('button', { name: 'Crea link di condivisione' }).click();
      const url = await page.inputValue('#share-url');
      must(url.includes('/preferiti#d='), 'link di condivisione inatteso: ' + url);
      // 6. cancella tutto (con conferma)
      await page.getByRole('button', { name: 'Cancella preferiti e menu' }).click();
      await page.getByRole('button', { name: 'Sì, cancella tutto' }).click();
      await page.waitForFunction(() => localStorage.getItem('rrtools.favorites') === null);
      // 7. reimport dal link: anteprima e conferma, mai import automatico
      await page.goto(url);
      await page.getByRole('heading', { name: 'Importare questi dati?' }).waitFor();
      must((await readKey()) === null, 'import automatico dal link');
      await page.waitForFunction(() => !location.hash, null, { timeout: 5000 }).catch(() => {
        throw new Error('dati lasciati nell\'indirizzo');
      });
      await page.getByRole('button', { name: 'Importa', exact: true }).click();
      must(JSON.parse(await readKey()).groups.length === 1, 'import dal link non riuscito');
      // 8. file non valido: messaggio chiaro, nessuna modifica
      await page.setInputFiles('input[type=file]', { name: 'rotto.json', mimeType: 'application/json', buffer: Buffer.from('{non json') });
      await page.getByRole('alert').filter({ hasText: 'JSON' }).waitFor();
      // 9. la home mostra preferiti e menu
      await page.goto(base + '/');
      await page.waitForSelector('#fav-h');
      must((await page.locator('#fav-h').textContent()).includes('2'), 'home senza i preferiti reimportati');
      must((await page.locator('h2.cat-title', { hasText: 'Lavoro' }).count()) === 1, 'home senza il menu personalizzato');
      // schermata finale: la pagina di gestione con i dati d'esempio
      await page.goto(base + '/preferiti/');
      await page.waitForSelector('.group');
      await page.waitForTimeout(300);
    },
  });

  // Novità: la pagina si apre, il filtro "Nuovi strumenti" riduce le voci e il link a uno strumento funziona;
  // il badge "Nuovo" della home è già nell'HTML prerenderizzato e coincide con quello dopo l'idratazione.
  await shot('changelog.png', {
    width: 1280,
    dark: false,
    path: '/novita/',
    setup: async (page) => {
      await page.waitForSelector('[data-testid=changelog-version]');
      must((await page.title()).includes('Novità'), 'titolo della pagina Novità');
      const feed = await page.locator('head link[rel=alternate][type="application/atom+xml"]').getAttribute('href');
      must(feed === 'https://tools.rr-dev.eu/changelog.xml', 'link al feed nella head: ' + feed);
      const all = await page.locator('[data-testid=changelog-entry]').count();
      await page.getByRole('button', { name: 'Nuovi strumenti', exact: true }).click();
      await page.waitForFunction((n) => document.querySelectorAll('[data-testid=changelog-entry]').length < n, all, { timeout: 3000 }).catch(() => {});
      const onlyNew = await page.locator('[data-testid=changelog-entry]').count();
      must(onlyNew > 0 && onlyNew < all, `filtro Nuovi strumenti: ${onlyNew} voci su ${all}`);
      must((await page.locator('.badge:not([data-kind=new-tool])').count()) === 0, 'il filtro lascia voci di altro tipo');
      await page.getByRole('button', { name: 'Tutto', exact: true }).click();
      await page.waitForFunction((n) => document.querySelectorAll('[data-testid=changelog-entry]').length === n, all, { timeout: 3000 }).catch(() => {
        throw new Error('il filtro Tutto non ripristina le voci');
      });
      // link a uno strumento
      await page.locator('[data-testid=changelog-tool]', { hasText: 'Confronto testi' }).first().click();
      await page.waitForURL('**/text-diff');
      // inglese: stessa pagina sotto /en/changelog, con feed inglese
      await page.goto(base + '/en/changelog/');
      await page.waitForSelector('[data-testid=changelog-version]');
      must((await page.locator('head link[rel=alternate][type="application/atom+xml"]').getAttribute('href')).endsWith('/changelog.en.xml'), 'feed inglese');
      must((await page.locator('time').first().textContent()).includes('November'), 'data in inglese');
      // la home: badge Nuovo identici nell'HTML del server e nel DOM
      const raw = await (await page.request.get(base + '/')).text();
      const served = (raw.match(/data-testid="new-badge"/g) ?? []).length;
      await page.goto(base + '/');
      await page.waitForSelector('app-home .card');
      await page.waitForTimeout(500);
      const live = await page.locator('[data-testid=new-badge]').count();
      must(served <= 12 && served === live, `badge Nuovo (al massimo 12): ${served} nell'HTML, ${live} nel DOM`);
      must((await page.locator('[data-testid=footer-changelog]').count()) === 1, 'link Novità nel footer');
      await page.goto(base + '/novita/');
      await page.waitForSelector('[data-testid=changelog-version]');
    },
  });

  // Link di condivisione ("Copia link"): lo stato sta nell'hash. Solo in --check (niente screenshot):
  // si imposta uno stato, si preme il pulsante, si legge l'indirizzo da location (non dagli appunti)
  // e si apre in una pagina nuova, dove stato e risultato devono essere ripristinati.
  const shareCase = async (name, path, setup, snapshot) => {
    if (!CHECK) return;
    const prefix = `[share ${name}] `;
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'it-IT' });
    const watch = (pg) => {
      pg.setDefaultTimeout(20000);
      pg.on('request', (r) => !/^(blob:|data:)/.test(r.url()) && !r.url().startsWith(base) && errors.push(prefix + 'richiesta esterna: ' + r.url()));
      pg.on('console', (m) => m.type() === 'error' && errors.push(prefix + m.text()));
      pg.on('pageerror', (e) => errors.push(prefix + e.message));
    };
    try {
      const page = await ctx.newPage();
      watch(page);
      await page.goto(base + path);
      await page.waitForTimeout(900);
      await setup(page);
      must(!(await page.evaluate(() => location.hash)), 'l\'hash cambia prima di premere il pulsante');
      await page.getByRole('button', { name: 'Copia link' }).click();
      await page.waitForFunction(() => location.hash.startsWith('#s='));
      const url = page.url();
      must(url.length <= 8000, 'link troppo lungo: ' + url.length);
      await page.getByRole('button', { name: 'Link copiato' }).waitFor();
      // lo stato di riferimento si legge ora, quando il link è stato creato e la pagina ha finito di aggiornarsi (in CI la lettura prima del clic poteva essere in ritardo)
      const before = JSON.stringify(await snapshot(page));
      const page2 = await ctx.newPage();
      watch(page2);
      await page2.goto(url);
      // il ripristino è asincrono (fflate si carica a richiesta): si aspetta che lo stato coincida
      let after = '';
      for (let i = 0; i < 50; i++) {
        await page2.waitForTimeout(100);
        after = JSON.stringify(await snapshot(page2));
        if (after === before) break;
      }
      must(after === before, `stato non ripristinato\n  atteso:   ${before.slice(0, 300)}\n  ottenuto: ${after.slice(0, 300)}`);
      // nessun messaggio d'errore sul link valido
      must(!(await page2.locator('[data-testid=share-status]').textContent()).trim(), 'messaggio inatteso su un link valido');
      // un link tagliato: messaggio discreto, pagina che continua a funzionare
      if (name === 'regex-tester') {
        const page3 = await ctx.newPage();
        watch(page3);
        await page3.goto(url.slice(0, -12));
        await page3.locator('[data-testid=share-status]', { hasText: 'non è valido' }).waitFor();
        await page3.fill('#rx-pattern', 'a+');
        await page3.fill('#rx-text', 'caaandy');
        await page3.waitForSelector('[data-testid=rx-matches]');
        const bad = await ctx.newPage();
        watch(bad);
        await bad.goto(base + '/regex-tester/#s=non-base64!!!!xx');
        await bad.locator('[data-testid=share-status]', { hasText: 'non è valido' }).waitFor();
      }
    } catch (e) {
      errors.push(prefix + 'interazione fallita: ' + e.message.split('\n').slice(0, 3).join(' | '));
    }
    await ctx.close();
  };
  const val = (page, sel) => page.locator(sel).first().evaluate((el) => el.value ?? el.textContent.trim());
  const txt = (page, sel) => page.locator(sel).first().evaluate((el) => el.textContent.replace(/\s+/g, ' ').trim());

  await shareCase(
    'regex-tester',
    '/regex-tester/',
    async (page) => {
      await page.fill('#rx-pattern', '(\\d{4})-(\\d{2})');
      await page.fill('#rx-text', 'Date: 2026-11 e 2027-01. È già così.');
      await page.fill('#rx-repl', '$2/$1');
      await page.waitForSelector('[data-testid=rx-matches]');
      await page.waitForTimeout(400);
    },
    async (page) => [await val(page, '#rx-pattern'), await val(page, '#rx-text'), await val(page, '#rx-repl'), await txt(page, '[data-testid=rx-count]'), await txt(page, '[data-testid=rx-replaced]').catch(() => '')],
  );
  await shareCase(
    'text-diff',
    '/text-diff/',
    async (page) => {
      await page.fill('#diff-a', 'prima riga\nseconda riga\nterza');
      await page.fill('#diff-b', 'prima riga\nseconda RIGA modificata\nterza\nquarta');
      await page.waitForSelector('table.diff');
    },
    async (page) => [await val(page, '#diff-a'), await val(page, '#diff-b'), await txt(page, '[data-testid=diff-summary]')],
  );
  await shareCase(
    'json-formatter',
    '/json-formatter/',
    async (page) => {
      await page.fill('#json-in', '{"nome":"Zoë","b":[1,2,{"c":null}],"a":true}');
      await page.waitForTimeout(500);
    },
    async (page) => [await val(page, '#json-in'), await val(page, '#json-out')],
  );
  await shareCase(
    'cron-expression',
    '/cron-expression/',
    async (page) => {
      await page.fill('#cron-expr', '30 8 * * 1');
      await page.waitForSelector('[data-testid=cron-runs]');
    },
    async (page) => [await val(page, '#cron-expr'), await txt(page, '[data-testid=cron-description]')],
  );
  await shareCase(
    'css-generator',
    '/css-generator/',
    async (page) => {
      await page.getByRole('button', { name: 'Tramonto' }).click();
      await page.getByRole('button', { name: 'Aggiungi stop' }).click();
      await page.waitForSelector('[data-testid=cssg-code]');
    },
    async (page) => [await txt(page, '[data-testid=cssg-code]')],
  );
  await shareCase(
    'calcolo-rata-mutuo',
    '/calcolo-rata-mutuo/',
    async (page) => {
      await page.fill('#mutuo-capital', '150.000');
      await page.fill('#mutuo-tan', '3,25');
      await page.fill('#mutuo-years', '25');
      await page.waitForSelector('[data-testid=mutuo-table]');
    },
    async (page) => [await val(page, '#mutuo-capital'), await val(page, '#mutuo-tan'), await val(page, '#mutuo-years'), await txt(page, '[data-testid=mutuo-stats]')],
  );
  await shareCase(
    'curl-converter',
    '/curl-converter/',
    async (page) => {
      await page.click('[data-testid=curl-sample]');
      await page.waitForFunction(() => document.querySelector('[data-testid=curl-output]')?.value.includes('fetch('));
    },
    async (page) => [await val(page, '[data-testid=curl-input]'), await val(page, '[data-testid=curl-output]')],
  );
  await shareCase(
    'url-parser',
    '/url-parser/',
    async (page) => {
      await page.click('[data-testid=urlp-sample]');
      await page.waitForSelector('[data-testid=urlp-table]');
    },
    async (page) => [await val(page, '[data-testid=urlp-input]'), await val(page, '[data-testid=urlp-output]')],
  );
  await shareCase(
    'compound-interest',
    '/compound-interest/',
    async (page) => {
      await page.fill('#ci-principal', '10.000');
      await page.fill('#ci-contribution', '200');
      await page.fill('#ci-rate', '6');
      await page.fill('#ci-years', '20');
      await page.waitForSelector('[data-testid=ci-table]');
    },
    async (page) => [await val(page, '#ci-principal'), await val(page, '#ci-rate'), await val(page, '#ci-years'), await txt(page, '[data-testid=ci-stats]')],
  );
  await shareCase(
    'find-replace',
    '/find-replace/',
    async (page) => {
      await page.getByRole('button', { name: 'Carica un esempio' }).click();
      await page.waitForSelector('[data-testid=fr-preview] mark');
      await page.waitForTimeout(400);
    },
    async (page) => [await val(page, '[data-testid=fr-text]'), await val(page, '[data-testid=fr-find]'), await val(page, '[data-testid=fr-replace]'), await val(page, '[data-testid=fr-out]')],
  );
  await shareCase(
    'unit-converter',
    '/unit-converter/',
    async (page) => {
      await page.fill('#uc-value', '42,195');
      await page.selectOption('#uc-from', { index: 3 });
      await page.selectOption('#uc-to', { index: 5 });
      await page.waitForSelector('[data-testid=uc-table]');
    },
    async (page) => [await val(page, '#uc-value'), await val(page, '#uc-from'), await val(page, '#uc-to'), await txt(page, '[data-testid=uc-table]')],
  );
  await shareCase(
    'meta-tag-preview',
    '/meta-tag-preview/',
    async (page) => {
      await page.fill('#meta-f-title', 'Titolo di prova per il link');
      await page.fill('#meta-f-description', 'Una descrizione "con virgolette" & simboli <speciali>.');
      await page.fill('#meta-f-ogImage', 'https://example.com/og.png');
      await page.locator('[data-testid=meta-checks] li[data-code=ogImageMissing]').waitFor({ state: 'detached' });
    },
    async (page) => [await val(page, '#meta-f-title'), await val(page, '#meta-f-description'), await val(page, '#meta-f-ogImage'), await val(page, '[data-testid=meta-snippet]')],
  );

  // "Invia a…": il risultato di uno strumento passa a un altro senza essere salvato. Solo in --check.
  const handoffCase = async (name, path, run) => {
    if (!CHECK) return;
    if (process.env.CASE && !name.includes(process.env.CASE)) return; // CASE=json-diff: solo i casi con quel nome
    const prefix = `[handoff ${name}] `;
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'it-IT' });
    const page = await ctx.newPage();
    page.setDefaultTimeout(20000);
    page.on('request', (r) => !/^(blob:|data:)/.test(r.url()) && !r.url().startsWith(base) && errors.push(prefix + 'richiesta esterna: ' + r.url()));
    page.on('console', (m) => m.type() === 'error' && errors.push(prefix + m.text()));
    page.on('pageerror', (e) => errors.push(prefix + e.message));
    try {
      await page.goto(base + path);
      await page.waitForTimeout(900);
      await run(page);
      // niente è stato scritto nello storage del browser e l'indirizzo non porta dati
      const leaked = await page.evaluate(() => JSON.stringify([{ ...localStorage }, { ...sessionStorage }, location.hash, location.search]));
      must(!/received|Mario|"a":1|montagna/.test(leaked), 'il contenuto inviato è finito nello storage o nell\'indirizzo: ' + leaked.slice(0, 200));
    } catch (e) {
      errors.push(prefix + 'interazione fallita: ' + e.message.split('\n').slice(0, 3).join(' | '));
    }
    await ctx.close();
  };
  const sendTo = async (page, title) => {
    await page.getByRole('button', { name: 'Invia a… un altro strumento' }).click();
    await page.getByRole('button', { name: title }).click();
  };
  await handoffCase('json-formatter → json-viewer', '/json-formatter/', async (page) => {
    await page.fill('#json-in', '{"a":1,"b":[1,2,3],"nome":"Mario"}');
    await page.waitForSelector('#json-out code span');
    await sendTo(page, 'JSON Viewer ed Editor');
    await page.waitForURL('**/json-viewer');
    await page.getByText('Ricevuto da JSON Formatter e Validator').waitFor();
    await page.locator('#jv-search').waitFor();
    must((await page.locator('main').innerText()).includes('nome'), 'il JSON ricevuto non è nel visualizzatore');
    // l'avviso sparisce alla navigazione successiva
    await page.getByRole('link', { name: /Privacy/ }).first().click();
    await page.waitForURL('**/privacy');
    must((await page.getByText('Ricevuto da').count()) === 0, 'l\'avviso "Ricevuto da" è rimasto dopo la navigazione');
  });
  // Ctrl+K: palette di ricerca globale (non nei campi di testo, non nella home dove c'è la ricerca della pagina)
  await handoffCase('palette ctrl+k', '/base64/', async (page) => {
    await page.locator('#main').focus();
    await page.keyboard.press('Control+k');
    const dlg = page.getByRole('dialog', { name: 'Cerca uno strumento' });
    await dlg.waitFor();
    await page.getByRole('combobox', { name: /Cerca uno strumento/ }).fill('uuid');
    await dlg.getByRole('option').first().waitFor();
    must((await dlg.getByRole('option').first().innerText()).includes('UUID'), 'palette: primo risultato inatteso');
    await page.keyboard.press('Enter');
    await page.waitForURL('**/uuid-generator');
    must((await page.locator('.rr-cp').count()) === 0, 'palette ancora aperta');
    // dentro un campo di testo Ctrl+K resta al browser
    await page.goto(base + '/json-formatter/');
    await page.fill('#json-in', 'x');
    await page.keyboard.press('Control+k');
    must((await page.locator('.rr-cp').count()) === 0, 'palette aperta da dentro un campo');
    // il pulsante dell'header apre la palette e Esc la chiude riportando il focus
    const open = page.getByRole('button', { name: /^Cerca uno strumento/ });
    await open.click();
    await page.getByRole('dialog', { name: 'Cerca uno strumento' }).waitFor();
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('.rr-cp'));
    must(await open.evaluate((el) => el === document.activeElement), 'palette: il focus non torna sul pulsante');
  });
  // Catene: creare, salvare, avviare e passare al passo successivo con «Invia a…»
  await handoffCase('catena json-formatter → json-viewer', '/', async (page) => {
    await page.getByRole('button', { name: 'Catene di strumenti' }).click();
    const dlg = page.getByRole('dialog', { name: 'Catene di strumenti' });
    await dlg.waitFor();
    await dlg.getByRole('textbox', { name: 'Nome' }).fill('Prova');
    await dlg.getByLabel('Strumento da aggiungere').selectOption('json-formatter');
    await dlg.getByRole('button', { name: 'Aggiungi passo' }).click();
    await dlg.getByLabel('Strumento da aggiungere').selectOption('json-viewer');
    await dlg.getByRole('button', { name: 'Aggiungi passo' }).click();
    await dlg.getByRole('button', { name: 'Salva', exact: true }).click();
    await dlg.getByText('Catena salvata.').waitFor();
    must(JSON.parse(await page.evaluate(() => localStorage.getItem('rrtools.chains')))[0].steps.join() === 'json-formatter,json-viewer', 'catena non salvata');
    await dlg.locator('ul.saved').getByRole('button', { name: 'Avvia' }).click();
    await page.waitForURL('**/json-formatter');
    const bar = page.getByRole('navigation', { name: 'Catena in corso: Prova' });
    await bar.locator('li[aria-current=step]', { hasText: '1.' }).waitFor();
    await page.fill('#json-in', '{"a":1,"b":[1,2,3],"nome":"Mario"}');
    await page.waitForSelector('#json-out code span');
    await page.getByRole('button', { name: 'Invia a… un altro strumento' }).click();
    await page.getByRole('button', { name: /^Passo successivo: JSON Viewer/ }).click();
    await page.waitForURL('**/json-viewer');
    await bar.locator('li[aria-current=step]', { hasText: '2.' }).waitFor();
    await page.locator('#jv-search').waitFor();
    must((await page.locator('main').innerText()).includes('nome'), 'catena: il JSON non è arrivato');
    // la catena sopravvive alla navigazione ma non al ricaricamento; si chiude con il pulsante
    await page.getByRole('button', { name: 'Chiudi catena' }).click();
    await bar.waitFor({ state: 'detached' });
    await page.evaluate(() => localStorage.removeItem('rrtools.chains')); // niente di salvato per il controllo sul contenuto
  });
  // Impostazioni: esportazione e importazione in un solo file JSON
  await handoffCase('impostazioni esporta/importa', '/privacy/', async (page) => {
    await page.getByRole('button', { name: 'Passa al tema scuro' }).click();
    await page.evaluate(() => localStorage.setItem('rrtools.favorites', JSON.stringify({ v: 1, favorites: ['base64'], groups: [] })));
    await page.reload();
    await page.waitForSelector('app-settings-transfer');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Esporta impostazioni' }).click()]);
    const data = JSON.parse(readFileSync(await dl.path(), 'utf8'));
    must(data.format === 'rrstudio-tools-settings' && data.theme === 'dark' && data.favorites.favorites[0] === 'base64', 'esportazione impostazioni inattesa');
    must(!/draft|markdown/i.test(JSON.stringify(data)), 'bozze nelle impostazioni');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.setInputFiles('app-settings-transfer input[type=file]', { name: 's.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(data)) });
    await page.getByRole('heading', { name: 'Importare queste impostazioni?' }).waitFor();
    must((await page.evaluate(() => localStorage.getItem('rrtools.favorites'))) === null, 'import automatico');
    await page.getByRole('button', { name: 'Importa', exact: true }).click();
    await page.getByText('Impostazioni importate.').waitFor();
    must(JSON.parse(await page.evaluate(() => localStorage.getItem('rrtools.favorites'))).favorites[0] === 'base64', 'preferiti non importati');
    must((await page.evaluate(() => localStorage.getItem('rrtools.theme'))) === 'dark', 'tema non importato');
    await page.setInputFiles('app-settings-transfer input[type=file]', { name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('{"a":1}') });
    await page.getByText('non è un file di impostazioni').waitFor();
  });
  await handoffCase('image-crop → image-compressor', '/image-crop/', async (page) => {
    const [photo] = await drawImages(page);
    await page.setInputFiles('input[type=file]', [{ name: 'montagna.jpg', mimeType: 'image/jpeg', buffer: photo.buffer }]);
    await page.locator('[data-testid=crop-source]', { hasText: '1600×1067' }).waitFor();
    await page.waitForFunction(() => document.querySelector('[data-testid=crop-stage] canvas')?.width > 100);
    await sendTo(page, 'Comprimi e converti immagini');
    await page.waitForURL('**/image-compressor');
    await page.getByText('Ricevuto da Ritaglia e ruota immagini').waitFor();
    await page.locator('li.row[data-status=done]').first().waitFor();
  });
  await handoffCase('generatore-codice-fiscale → codice-fiscale', '/generatore-codice-fiscale/', async (page) => {
    await page.fill('#gcf-count', '5');
    await page.locator('#gcf-count').dispatchEvent('change');
    await page.waitForFunction(() => document.querySelectorAll('[data-testid=gcf-table] tbody tr').length === 5);
    await page.getByRole('button', { name: 'Copia tutti' }).click();
    await page.getByText('Copiato', { exact: true }).first().waitFor();
    const first = (await page.locator('[data-testid=gcf-code]').first().innerText()).trim();
    await sendTo(page, 'Calcolo e verifica codice fiscale');
    await page.waitForURL('**/codice-fiscale');
    await page.getByText('Ricevuto da Generatore codice fiscale e partita IVA').waitFor();
    await page.locator('[data-testid=cf-verdict]').waitFor();
    must(/valido/i.test(await page.locator('[data-testid=cf-verdict]').innerText()), 'il validatore non dice "valido" per ' + first);
    must((await page.locator('main').innerText()).includes(first), 'il codice inviato non è nel validatore');
  });
  await handoffCase('generatore-codice-fiscale partita IVA → iban-partita-iva', '/generatore-codice-fiscale/', async (page) => {
    await page.getByRole('button', { name: 'Partita IVA' }).click();
    await page.locator('#gcf-office').selectOption('015');
    await page.locator('#gcf-prefix').check();
    await page.fill('#gcf-count', '5');
    await page.locator('#gcf-count').dispatchEvent('change');
    await page.waitForFunction(() => document.querySelectorAll('[data-testid=gcf-table] tbody tr').length === 5);
    must(/^IT\d{11}$/.test((await page.locator('[data-testid=gcf-code]').first().innerText()).trim()), 'partita IVA senza prefisso IT');
    await sendTo(page, 'Verifica IBAN e partita IVA');
    await page.waitForURL('**/iban-partita-iva');
    await page.locator('.badge.ok').first().waitFor();
    must((await page.locator('.badge.ok').count()) === 5, 'il validatore non ha accettato tutte e cinque le partite IVA');
    must((await page.locator('.badge:not(.ok)').count()) === 0, 'il validatore ha rifiutato una partita IVA generata');
  });
  // Scorciatoie da tastiera comuni agli strumenti (pulsanti marcati con data-shortcut). Solo in --check.
  await handoffCase('scorciatoie json-formatter', '/json-formatter/', async (page) => {
    await page.fill('#json-in', '{"nome":"Zoe","b":[1,2]}');
    await page.waitForSelector('#json-out code span');
    // Ctrl+Invio non rompe nulla (questo strumento formatta già mentre si scrive) e Alt+Maiusc+C copia il risultato
    await page.keyboard.press('Control+Enter');
    await page.keyboard.press('Alt+Shift+KeyC');
    await page.getByText('Copiato', { exact: true }).first().waitFor();
    // "?" dentro un campo si scrive e basta; fuori dai campi apre il pannello, Esc lo chiude
    await page.focus('#json-in');
    await page.keyboard.press('?');
    must((await page.locator('dialog[open]').count()) === 0, '"?" dentro un campo ha aperto il pannello');
    await page.locator('h1').click();
    await page.keyboard.press('?');
    const dlg = page.getByRole('dialog', { name: 'Scorciatoie da tastiera' });
    await dlg.waitFor();
    must((await dlg.innerText()).includes('Copia il risultato'), 'il pannello non elenca la scorciatoia "Copia"');
    await page.keyboard.press('Escape');
    await dlg.waitFor({ state: 'hidden' });
    // Pulisci chiede conferma (premere due volte): i dati non spariscono alla prima pressione, né con Esc
    await page.waitForTimeout(300); // il pannello ha tolto `open` ma l'evento close arriva un attimo dopo
    await page.keyboard.press('Alt+Shift+KeyX');
    try {
      await page.getByTestId('shortcut-status').getByText(/Premi di nuovo/).waitFor({ timeout: 8000 });
    } catch {
      const st = await page.evaluate(() => ({
        dialoghiAperti: document.querySelectorAll('dialog[open]').length,
        avviso: document.querySelector('[data-testid=shortcut-status]')?.textContent?.trim(),
        focus: document.activeElement?.tagName + '#' + (document.activeElement?.id ?? ''),
        pulsantiPulisci: document.querySelectorAll('[data-shortcut=clear]').length,
      }));
      throw new Error('Pulisci non ha mostrato la conferma: ' + JSON.stringify(st));
    }
    await page.keyboard.press('Escape');
    must((await page.inputValue('#json-in')).includes('Zoe'), 'Pulisci ha cancellato i dati alla prima pressione');
    await page.keyboard.press('Alt+Shift+KeyX');
    await page.waitForFunction(() => document.querySelector('#json-in').value === '');
  });
  // text-diff: scorciatoie F7 e Alt+Maiusc+H, scorrimento dentro il contenitore, clic sul numero di riga. Solo in --check.
  await handoffCase('scorciatoie text-diff', '/text-diff/', async (page) => {
    const lines = Array.from({ length: 240 }, (_, i) => `riga numero ${i + 1} del file di prova`);
    await page.fill('#diff-a', lines.join('\n'));
    await page.fill('#diff-b', lines.map((l, i) => (i % 30 === 15 ? l + ' modificata' : l)).join('\n'));
    await page.waitForSelector('[data-testid=diff-next]');
    await page.keyboard.press('F7');
    await page.getByTestId('diff-position').getByText(/1 di \d+/).waitFor();
    await page.waitForTimeout(1000); // fine dello scorrimento morbido iniziale che porta in vista il contenitore
    const y1 = await page.evaluate(() => window.scrollY);
    await page.keyboard.press('F7');
    await page.getByTestId('diff-position').getByText(/2 di \d+/).waitFor();
    await page.waitForTimeout(800);
    const y2 = await page.evaluate(() => window.scrollY);
    must(y1 === y2, `F7 ha mosso la pagina (scrollY ${y1} -> ${y2})`);
    const inner = await page.evaluate(() => document.querySelector('.viewer').scrollTop);
    must(inner > 0, 'F7 non ha scorso dentro il contenitore dei risultati');
    const h = await page.evaluate(() => document.querySelector('.viewer').getBoundingClientRect().height);
    must(h <= 900, 'il contenitore dei risultati supera l\'altezza della finestra');
    await page.keyboard.press('Shift+F7');
    await page.getByTestId('diff-position').getByText(/1 di \d+/).waitFor();
    // la barra sticky non è troppo alta (desktop: al massimo circa due righe)
    const barH = await page.evaluate(() => document.querySelector('.viewer .bar').offsetHeight);
    must(barH <= 140, `la barra dei risultati è alta ${barH}px`);
    // Alt+Maiusc+H nasconde i testi e li mostra di nuovo
    await page.locator('h1').click();
    await page.keyboard.press('Alt+Shift+KeyH');
    await page.getByTestId('diff-hidden-summary').waitFor();
    must((await page.locator('#diff-a').count()) === 0, 'i testi non sono stati nascosti');
    must((await page.getByRole('button', { name: 'Mostra i testi' }).getAttribute('aria-expanded')) === 'false', 'aria-expanded non aggiornato');
    // clic su un numero di riga: mostra i testi e il focus va alla textarea giusta, con il cursore a inizio riga
    await page.getByRole('button', { name: 'Vai alla riga 16 del testo B' }).first().click();
    await page.waitForSelector('#diff-b');
    await page.waitForFunction(() => document.activeElement && document.activeElement.id === 'diff-b');
    const caret = await page.evaluate(() => {
      const t = document.querySelector('#diff-b');
      return t.value.slice(0, t.selectionStart).split('\n').length;
    });
    must(caret === 16, `cursore alla riga ${caret} invece della 16`);
    // "A capo" disattivato: niente a capo nelle righe
    await page.getByLabel('A capo').uncheck();
    await page.locator('.viewer.nowrap').waitFor({ timeout: 3000 }).catch(() => {});
    must((await page.locator('.viewer.nowrap').count()) === 1, 'l\'opzione "A capo" non agisce');
  });
  // json-diff: esempio e conteggio, F7, array per chiave id (spostamento non modificato), albero unito, export JSON Patch. Solo in --check.
  if (!only || only.includes('json-diff.png')) {
    await handoffCase('json-diff', '/json-diff/', async (page) => {
      await page.getByTestId('jd-sample').click();
      await page.getByTestId('jd-count').waitFor();
      const count = async () => Number((await txt(page, '[data-testid=jd-count]')).match(/\d+/)[0]);
      const n = await count();
      must(n > 8, `per indice l'esempio dovrebbe avere più di 8 differenze (trovate ${n})`);
      await page.keyboard.press('F7');
      await page.getByTestId('jd-position').getByText(new RegExp(`1 di ${n}$`)).waitFor();
      await page.keyboard.press('F7');
      await page.getByTestId('jd-position').getByText(new RegExp(`2 di ${n}$`)).waitFor();
      must((await page.evaluate(() => document.querySelector('.viewer').getBoundingClientRect().height)) <= 900, 'il contenitore dei risultati supera la finestra');
      // array per chiave: lo spostamento non è una modifica
      await page.getByRole('button', { name: 'Per chiave', exact: true }).click();
      await page.fill('#jd-key', 'id');
      await page.getByTestId('jd-count').getByText('8 differenze').waitFor();
      const list = await txt(page, '[data-testid=jd-list]');
      must(list.includes('users[id=2].role') && list.includes('users[id=4]'), 'mancano le differenze degli utenti 2 e 4');
      must(!list.includes('users[id=1]') && !list.includes('users[id=3]'), 'lo spostamento degli utenti 1 e 3 è stato segnalato come modifica');
      // albero unito: i rami invariati sono compressi
      await page.getByRole('button', { name: 'Albero unito', exact: true }).click();
      await page.locator('[data-testid=jd-tree] .trow.fold').first().waitFor();
      await page.keyboard.press('Alt+Shift+KeyU');
      await page.waitForFunction(() => document.querySelectorAll('[data-testid=jd-tree] .trow.fold').length === 0);
      // JSON Patch (RFC 6902) scaricata
      const patch = JSON.parse((await downloadBuffer(page, () => page.getByTestId('jd-download').click())).buffer.toString('utf8'));
      must(Array.isArray(patch) && patch.every((o) => ['add', 'remove', 'replace'].includes(o.op)), 'la JSON Patch non è valida');
      must(patch.some((o) => o.op === 'remove' && o.path === '/legacy') && patch.some((o) => o.op === 'add' && o.path === '/meta'), 'la JSON Patch non contiene le operazioni attese');
      // errore di lettura con riga e colonna
      await page.fill('#jd-a', '{\n  "a": 1,\n  "b": ,\n}');
      await page.locator('[data-testid=jd-error]').getByText(/riga 3, colonna/).waitFor();
    });
  }
  // Riquadro Feedback: i link a GitHub non portano mai l'hash (#s=) con lo stato dello strumento. Solo in --check.
  await handoffCase('feedback json-formatter senza hash', '/json-formatter/#s=SEGRETO123', async (page) => {
    const link = page.getByTestId('tool-feedback').getByRole('link', { name: /Segnala un problema/ });
    await link.waitFor();
    const href = (await link.getAttribute('href')) ?? '';
    must(href.includes('template=bug.yml'), 'href senza template=bug.yml');
    must(href.includes('tool=json-formatter'), 'href senza tool=json-formatter');
    must(!href.includes('#s=') && !href.includes('SEGRETO123'), "l'href contiene lo stato condiviso");
    must((await link.getAttribute('rel')) === 'noopener noreferrer' && (await link.getAttribute('target')) === '_blank', 'target/rel errati');
  });
  // Stampa / salva PDF: in modalità "print" restano solo intestazione di stampa, riepilogo e risultati; l'indirizzo stampato non ha hash. Solo in --check.
  await handoffCase('stampa compound-interest', '/compound-interest/#s=SEGRETO123', async (page) => {
    await page.fill('#ci-principal', '10.000');
    await page.fill('#ci-rate', '5');
    await page.fill('#ci-years', '30');
    await page.waitForSelector('[data-testid=ci-table] tbody tr');
    // il pulsante e la scorciatoia Alt+Maiusc+P chiamano window.print() (qui sostituita per non aprire il dialogo)
    await page.evaluate(() => { window.__printCalls = 0; window.print = () => { window.__printCalls++; }; });
    await page.getByRole('button', { name: /Stampa o salva PDF/ }).click();
    await page.keyboard.press('Alt+Shift+KeyP');
    must((await page.evaluate(() => window.__printCalls)) === 2, 'il pulsante o Alt+Maiusc+P non chiamano window.print()');
    await page.emulateMedia({ media: 'print' });
    for (const sel of ['app-header', 'app-footer', '[data-testid=tool-feedback]', 'app-privacy-note', 'app-print-button button', '.controls']) {
      const loc = page.locator(sel).first();
      must((await loc.count()) === 0 || !(await loc.isVisible()), 'in stampa è ancora visibile: ' + sel);
    }
    const head = page.getByTestId('print-head');
    must(await head.isVisible(), "l'intestazione di stampa non è visibile");
    must(await page.locator('[data-testid=ci-table]').isVisible(), 'la tabella non è visibile in stampa');
    must(await page.locator('[data-testid=ci-chart]').isVisible(), 'il grafico non è visibile in stampa');
    const addr = await page.getByTestId('print-url').innerText();
    must(addr === 'https://tools.rr-dev.eu/compound-interest', "indirizzo stampato inatteso: " + addr);
    must(!/[#?]/.test(addr) && !(await head.innerText()).includes('SEGRETO123'), "l'intestazione di stampa contiene hash o dati");
    const txt = await head.innerText();
    must(txt.includes('Calcolo interesse composto') && txt.includes('Calcolo indicativo, generato nel browser da tools.rr-dev.eu'), 'titolo o nota mancanti in stampa: ' + txt);
    must(txt.includes('10.000'), 'il riepilogo dei parametri non contiene il capitale');
    must(/\d{4}/.test(await page.getByTestId('print-date').innerText()), 'data di stampa mancante');
  });
  // Incolla intelligente e trascinamento di file sulla home: riconoscimento, proposta degli strumenti, passaggio in memoria. Solo in --check.
  await handoffCase('incolla JSON in home → json-formatter', '/', async (page) => {
    // Ctrl+V senza focus in un campo: evento paste sul documento (come fa il browser)
    await page.evaluate(() => {
      const dt = new DataTransfer();
      dt.setData('text/plain', '{"a":1,"nome":"Zoe"}');
      document.body.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    });
    await page.getByText('Rilevato: JSON').waitFor();
    await page.getByText('Il contenuto resta in questa scheda').waitFor();
    must((await page.locator('pre.preview').innerText()).includes('Zoe'), 'anteprima del JSON incollato assente');
    const names = await page.locator('ul.tools button').allInnerTexts();
    must(names[0].includes('JSON Formatter'), 'il primo strumento proposto per un JSON non è il formatter: ' + names.join(' | '));
    await page.locator('ul.tools').getByRole('button', { name: /JSON Formatter e Validator/ }).click();
    await page.waitForURL('**/json-formatter');
    await page.waitForFunction(() => document.querySelector('#json-in')?.value.includes('Zoe'));
  });
  await handoffCase('incolla nella ricerca (comportamento normale)', '/', async (page) => {
    await page.fill('#tool-q', 'hash');
    await page.locator('#tool-q').focus();
    await page.evaluate(() => {
      const dt = new DataTransfer();
      dt.setData('text/plain', '{"a":1}');
      document.querySelector('#tool-q').dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    });
    await page.waitForTimeout(300);
    must((await page.getByText('Rilevato:').count()) === 0, 'l\'incolla nel campo di ricerca ha attivato il riconoscimento');
  });
  await handoffCase('drop immagine in home → image-compressor', '/', async (page) => {
    await page.evaluate(async () => {
      const c = document.createElement('canvas');
      c.width = 64;
      c.height = 48;
      const g = c.getContext('2d');
      g.fillStyle = '#3399cc';
      g.fillRect(0, 0, 64, 48);
      const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
      const dt = new DataTransfer();
      dt.items.add(new File([blob], 'foto.png', { type: 'image/png' }));
      window.__dt = dt;
      for (const t of ['dragenter', 'dragover']) document.dispatchEvent(new DragEvent(t, { dataTransfer: dt, bubbles: true, cancelable: true }));
    });
    await page.getByText('Rilascia qui il file per scegliere lo strumento').waitFor();
    await page.evaluate(() => document.dispatchEvent(new DragEvent('drop', { dataTransfer: window.__dt, bubbles: true, cancelable: true })));
    await page.getByText('File: immagine').waitFor();
    must((await page.getByText('Rilascia qui il file per scegliere lo strumento').count()) === 0, 'l\'overlay di trascinamento è rimasto dopo il rilascio');
    await page.locator('ul.tools').getByRole('button', { name: /Comprimi e converti immagini/ }).click();
    await page.waitForURL('**/image-compressor');
    await page.locator('li.row[data-status=done]').first().waitFor();
  });
  await handoffCase('scegli un file in home → csv', '/', async (page) => {
    await page.setInputFiles('app-smart-intake input[type=file]', [{ name: 'dati.csv', mimeType: 'text/csv', buffer: Buffer.from('a;b\n1;2\n3;4\n') }]);
    await page.getByText('File: CSV').waitFor();
    must((await page.locator('ul.tools').getByRole('button', { name: /Hash/ }).count()) > 0, 'hash non proposto per un file qualunque');
  });
  await handoffCase('pagina di ricezione dopo un POST senza service worker', '/condividi/?retry=1', async (page) => {
    await page.getByText(/Non sono riuscito a ricevere il contenuto/).waitFor();
  });
  // Scenari dei nuovi strumenti: un file per strumento in scripts/shots/<id>.mjs (vedi _template.mjs), così non serve
  // più modificare questo file. I file che iniziano con «_» sono ignorati.
  if (existsSync('scripts/shots')) {
    for (const f of readdirSync('scripts/shots').filter((n) => n.endsWith('.mjs') && !n.startsWith('_')).sort()) {
      const mod = await import(pathToFileURL(resolve('scripts/shots', f)).href);
      await mod.default({ shot, handoffCase, expectValue, must, base, errors, CHECK, browser });
    }
  }
} finally {
  clearTimeout(watchdog);
  await browser.close();
  server.kill();
}
if (errors.length) {
  console.error('Errori:', errors);
  process.exitCode = 1;
} else if (CHECK) {
  console.log('e2e: tutte le interazioni riuscite, nessun errore in console');
}
