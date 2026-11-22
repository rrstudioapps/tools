// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 rrstudio — rrstudio tools
//
// Controllo dei dizionari it/en (npm run i18n-check). Il compilatore verifica già che en abbia le chiavi di it;
// qui si controlla il resto, che altrimenti si vede solo nel browser (una chiave mancante mostra la chiave stessa):
//  - errori (exit 1): chiavi diverse tra it ed en, segnaposto {nome} diversi, valori vuoti, guide incomplete
//    (domanda senza risposta), chiavi usate con i18n.t('...') nei sorgenti ma non definite in nessun dizionario;
//  - avvisi (exit 0): testi letterali nei template HTML e attributi (placeholder, title, aria-label, alt) fuori dai dizionari.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const src = join(root, 'src/app');
const errors = [];
const warnings = [];

/** Estrae le chiavi `'chiave': valore` (a due spazi di rientro) con il valore grezzo, divise per blocco `const <nome>`. */
function parseDicts(file) {
  const blocks = { it: new Map(), en: new Map() };
  let lang = null;
  let name = null;
  let current = null;
  const byName = new Map(); // nome del blocco -> chiavi, per risolvere gli spread
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const decl = line.match(/^(?:export )?const (\w+)\b/);
    if (decl) {
      name = decl[1];
      byName.set(name, { map: new Map() });
      lang = /^(it|\w*It)$/.test(name) ? 'it' : /^(en|\w*En)$/.test(name) ? 'en' : null;
      current = null;
      continue;
    }
    if (!lang) continue;
    const spread = line.match(/^ {2}\.\.\.(\w+),?\s*$/);
    if (spread) {
      // `...it` / `...guideIt`: include le chiavi del blocco già letto (it o en secondo il nome)
      const from = byName.get(spread[1]);
      if (from) for (const [k, v] of from.map) blocks[lang].set(k, v);
      continue;
    }
    const key = line.match(/^ {2}'([^']+)':\s*(.*)$/);
    if (key) {
      current = { key: key[1], raw: key[2] };
      blocks[lang].set(current.key, current);
      byName.get(name).map.set(current.key, current);
    } else if (current && /^ {4}\S/.test(line)) {
      current.raw += ' ' + line.trim(); // valore sulla riga successiva
    }
  }
  return blocks;
}

const placeholders = (raw) => [...new Set([...raw.matchAll(/\{(\w+)\}/g)].map((m) => m[1]))].sort().join(',');
const rel = (f) => f.replace(root, '');

const allKeys = new Set();

function compare(label, it, en, guideOnlyIt = false) {
  for (const [k, v] of it) {
    allKeys.add(k);
    const e = en.get(k);
    if (!e && guideOnlyIt && k.startsWith('guide.')) continue; // strumento solo italiano: guida senza versione inglese
    if (!e) {
      errors.push(`${label}: chiave solo in it: ${k}`);
      continue;
    }
    if (/^'{2}[,]?$/.test(v.raw.trim()) || /^'{2}[,]?$/.test(e.raw.trim())) errors.push(`${label}: valore vuoto: ${k}`);
    if (placeholders(v.raw) !== placeholders(e.raw))
      errors.push(`${label}: segnaposto diversi in ${k}: it {${placeholders(v.raw)}} / en {${placeholders(e.raw)}}`);
  }
  for (const k of en.keys()) if (!it.has(k)) errors.push(`${label}: chiave solo in en: ${k}`);
  // guide: ogni domanda ha la sua risposta e viceversa
  for (const k of it.keys()) {
    const q = k.match(/^(guide\.[\w-]+)\.q\.(\d+)$/);
    if (q && !it.has(`${q[1]}.a.${q[2]}`)) errors.push(`${label}: domanda senza risposta: ${k}`);
    const a = k.match(/^(guide\.[\w-]+)\.a\.(\d+)$/);
    if (a && !it.has(`${a[1]}.q.${a[2]}`)) errors.push(`${label}: risposta senza domanda: ${k}`);
  }
}

// dizionari principali: it.ts ed en.ts hanno un solo oggetto ciascuno, esportato con nomi diversi
function parseCore(file) {
  const m = new Map();
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const key = line.match(/^ {2}'([^']+)':\s*(.*)$/);
    if (key) m.set(key[1], { key: key[1], raw: key[2] });
  }
  return m;
}
compare('core', parseCore(join(src, 'core/i18n/it.ts')), parseCore(join(src, 'core/i18n/en.ts')));

for (const dir of readdirSync(join(src, 'tools'), { withFileTypes: true })) {
  if (!dir.isDirectory()) continue;
  const base = join(src, 'tools', dir.name);
  for (const f of readdirSync(base).filter((n) => n.endsWith('.i18n.ts'))) {
    const file = join(base, f);
    const { it, en } = parseDicts(file);
    // en dichiarato con Omit<typeof it, keyof typeof guideIt>: la guida esiste solo in italiano (strumenti italyOnly)
    compare(`tools/${dir.name}`, it, en, /Omit<typeof it/.test(readFileSync(file, 'utf8')));
  }
}

// elenco ricorsivo dei sorgenti (esclusi i test)
function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|html)$/.test(e.name) && !/\.spec\.ts$/.test(e.name) && !/\.i18n\.ts$/.test(e.name)) out.push(p);
  }
  return out;
}

const textNode = />\s*([A-Za-zÀ-ÿ][^<>{}&]{2,}?)\s*</g;
const attr = /\b(placeholder|title|aria-label|alt)="([A-Za-zÀ-ÿ][^"{}]{2,})"/g;
// parole che non si traducono (nomi propri, sigle, termini tecnici lasciati uguali di proposito)
const ALLOWED = /^(rrstudio|Tools|IBAN|BIC|JSON|YAML|XML|CSV|SVG|PDF|PNG|JPEG|WebP|clamp\(\)|GitHub|HTML|URL|UUID|JWT|HMAC|SHA[-\d]*|MD5|AES.*|RSA|TOTP|QR|Esc|rrstudio:|\w+\(\))$/;
// testi in inglese voluti, mostrati con lang="en" a chi legge in italiano (indicazioni sulla lingua)
const FIXED_ENGLISH = /^(Italian only: no English version|This page is also available in English →|English version|Language|Close)$/;

// pagine con i testi nelle due lingue scritti nel template (@if sulla lingua), non nei dizionari
const BILINGUAL_TEMPLATES = ['src/app/pages/privacy.html', 'src/app/pages/tutorial.html'];

for (const file of walk(src)) {
  const text = readFileSync(file, 'utf8');
  for (const m of text.matchAll(/\bi18n\.t\(\s*'([^'$]+)'\s*[,)]/g)) {
    if (!allKeys.has(m[1])) errors.push(`${rel(file)}: chiave non definita in nessun dizionario: ${m[1]}`);
  }
  if (BILINGUAL_TEMPLATES.includes(rel(file))) continue;
  if (file.endsWith('.html') || file.endsWith('.ts')) {
    const target = file.endsWith('.html') ? text : (text.match(/template:\s*`([\s\S]*?)`/)?.[1] ?? '');
    for (const m of target.matchAll(textNode)) {
      if (!ALLOWED.test(m[1].trim()) && !FIXED_ENGLISH.test(m[1].trim())) warnings.push(`${rel(file)}: testo fuori dai dizionari: «${m[1].trim().slice(0, 50)}»`);
    }
    for (const m of target.matchAll(attr)) {
      if (!ALLOWED.test(m[2].trim()) && !FIXED_ENGLISH.test(m[2].trim())) warnings.push(`${rel(file)}: ${m[1]} fuori dai dizionari: «${m[2].trim().slice(0, 50)}»`);
    }
  }
}

for (const w of warnings) console.log('avviso  ' + w);
for (const e of errors) console.log('ERRORE  ' + e);
console.log(`i18n-check: ${errors.length} errori, ${warnings.length} avvisi`);
process.exit(errors.length ? 1 : 0);
