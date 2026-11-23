// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 rrstudio — rrstudio Tools
//
// Prepara la build statica (dist/rrstudio-tools/browser) per Cloudflare Pages: scrive in dist/cloudflare/
//   site/       i file da pubblicare (pagine piatte, link assoluti, _headers, 404.html)
//   functions/  la Pages Function per la condivisione file senza service worker
//
// Uso: node scripts/cloudflare-pages.mjs [--src <cartella>] [--out <cartella>] [--noindex]
//
// Cosa cambia rispetto a nginx (vedi deploy/nginx.conf):
// 1. Pages serve `cartella/index.html` su `/cartella/` e manda un 308 a `/cartella`, ma canonical e sitemap usano gli
//    indirizzi senza barra finale: ogni `cartella/index.html` diventa `cartella.html`. Restano cartelle solo la home,
//    `/en/` (canonical con barra) e le pagine di ricezione `/condividi/` e `/en/share/`.
// 2. Cloudflare ricava gli Early Hints dai link `modulepreload` e li risolve rispetto all'indirizzo della pagina,
//    ignorando `<base href="/">`: i link relativi diventano assoluti (`/chunk-….js`).
// 3. Intestazioni di sicurezza e cache lunga per i file con hash: file `_headers`. Gli indirizzi `*.pages.dev`
//    (copie del sito e anteprime) hanno `noindex`.
// 4. Indirizzi sconosciuti: `404.html` (status 404), così non c'è una home duplicata a ogni indirizzo; nel browser
//    Angular porta alla home della lingua giusta. Nessun `_redirects`: le sue regole hanno la precedenza sui file veri.
// 5. Un POST su `/condividi/` (condivisione arrivata senza service worker) riceve un 303: Pages Function.

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, rmdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const args = process.argv.slice(2);
const opt = (nome, predefinito) => {
  const i = args.indexOf(nome);
  return i >= 0 ? args[i + 1] : predefinito;
};
const SRC = resolve(opt('--src', 'dist/rrstudio-tools/browser'));
const OUT = resolve(opt('--out', 'dist/cloudflare'));
const NOINDEX = args.includes('--noindex');

if (!existsSync(join(SRC, 'index.html'))) {
  console.error(`Build non trovata in ${SRC}: lancia prima "npm run build".`);
  process.exit(1);
}

// pagine che restano `cartella/index.html`
const RESTANO_CARTELLE = new Set(['', 'en', 'condividi', 'en/share']);

const CSP =
  "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; " +
  "font-src 'self' data:; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; " +
  "frame-ancestors 'none'; form-action 'none'";

const SITE = join(OUT, 'site');
rmSync(OUT, { recursive: true, force: true });
mkdirSync(SITE, { recursive: true });
cpSync(SRC, SITE, { recursive: true });

// elenco ricorsivo dei file
function tutti(dir) {
  const risultato = [];
  for (const nome of readdirSync(dir)) {
    const p = join(dir, nome);
    if (statSync(p).isDirectory()) risultato.push(...tutti(p));
    else risultato.push(p);
  }
  return risultato;
}

// 1. cartella/index.html -> cartella.html
let spostate = 0;
for (const file of tutti(SITE)) {
  if (!file.endsWith('/index.html')) continue;
  const cartella = relative(SITE, dirname(file)).split('\\').join('/');
  if (RESTANO_CARTELLE.has(cartella)) continue;
  renameSync(file, join(SITE, `${cartella}.html`));
  try {
    rmdirSync(dirname(file)); // solo se vuota
  } catch {
    /* la cartella contiene altri file: resta */
  }
  spostate++;
}

// 2. link relativi agli asset -> assoluti
let riscritte = 0;
for (const file of tutti(SITE).filter((f) => f.endsWith('.html'))) {
  const html = readFileSync(file, 'utf8');
  const nuovo = html
    .replace(/(rel="modulepreload" href=")([a-zA-Z])/g, '$1/$2')
    .replace(/(<link rel="stylesheet" href=")(styles-)/g, '$1/$2')
    .replace(/(<script src=")(main-|polyfills-)/g, '$1/$2');
  if (nuovo !== html) {
    writeFileSync(file, nuovo);
    riscritte++;
  }
}

// 3. intestazioni
const intestazioni = [
  '/*',
  `  Content-Security-Policy: ${CSP}`,
  '  X-Content-Type-Options: nosniff',
  '  Referrer-Policy: no-referrer',
  ...(NOINDEX ? ['  X-Robots-Tag: noindex'] : []),
  '',
  'https://:project.pages.dev/*',
  '  X-Robots-Tag: noindex',
  '',
  ...['/chunk-*', '/main-*', '/styles-*', '/worker-*'].flatMap((p) => [p, '  Cache-Control: public, max-age=31536000, immutable']),
  '',
].join('\n');
writeFileSync(join(SITE, '_headers'), intestazioni);

// 4. 404 vero: un indirizzo sconosciuto risponde 404 (senza 404.html Pages risponde 200 con la home a qualunque indirizzo).
// Il contenuto è la home: nel browser Angular rimanda comunque alla pagina giusta con la route "**"; i motori di ricerca vedono un 404.
const home = readFileSync(join(SITE, 'index.html'), 'utf8');
writeFileSync(join(SITE, '404.html'), home.replace('</head>', '<meta name="robots" content="noindex"></head>'));

// 5. condivisione file senza service worker
const funzione = `// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 rrstudio — rrstudio Tools
// Web Share Target senza service worker: un POST su /condividi/ riceve un 303 verso la pagina di ricezione.
// La lingua segue la prima preferenza di Accept-Language, come nel service worker. Le GET passano al sito statico.
export async function onRequest({ request, next }) {
  if (request.method !== 'POST') return next();
  const lingua = request.headers.get('Accept-Language') || '';
  const destinazione = /^en([-,;]|$)/.test(lingua) ? '/en/share/?retry=1' : '/condividi/?retry=1';
  return new Response(null, { status: 303, headers: { Location: destinazione, 'Cache-Control': 'no-cache' } });
}
`;
mkdirSync(join(OUT, 'functions', 'condividi'), { recursive: true });
writeFileSync(join(OUT, 'functions', 'condividi', 'index.js'), funzione);

const file = tutti(SITE).length;
console.log(`Cloudflare Pages: ${file} file in ${relative(process.cwd(), SITE) || SITE}`);
console.log(`  pagine rese piatte: ${spostate}, pagine con link assoluti: ${riscritte}${NOINDEX ? ', noindex attivo' : ''}`);
