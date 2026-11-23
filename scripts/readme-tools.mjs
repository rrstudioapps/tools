// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 rrstudio — rrstudio Tools
// Allinea le tabelle degli strumenti del README (inglese) al registry, senza leggere né modificare il README a mano.
// Uso: node scripts/readme-tools.mjs            elenca gli strumenti del registry che mancano nel README
//      node scripts/readme-tools.mjs --write    aggiunge una riga per ciascuno in fondo alla tabella della sua categoria
// La riga usa titolo e descrizione inglesi del dizionario (src/app/core/i18n/en.ts, con ripiego su it.ts): se serve un testo più
// curato, si ritocca la riga dopo. Le sezioni di dettaglio con gli screenshot non vengono toccate.
import { readFileSync, writeFileSync } from 'node:fs';

const WRITE = process.argv.includes('--write');
const BASE = 'https://tools.rrstudio.app/';
const SECTION = { text: 'Text', data: 'Data', media: 'Images, PDF & codes', calc: 'Calculators', dev: 'Developers', web: 'Web & design', security: 'Security', italy: 'Italy: tax & banking' };

const registry = readFileSync('src/app/tools/tools.registry.ts', 'utf8');
const body = registry.slice(registry.indexOf('export const TOOLS'));
const tools = [...body.matchAll(/\n {2}\{\n([\s\S]*?)\n {2}\},/g)].map((m) => {
  const get = (re) => re.exec(m[1])?.[1];
  return { path: get(/\n? {4}path: '([^']+)'/), category: get(/\n {4}category: '([^']+)'/), titleKey: get(/titleKey: '([^']+)'/), descriptionKey: get(/\n {4}descriptionKey: '([^']+)'/) };
});

const dict = (file) => readFileSync(file, 'utf8');
const en = dict('src/app/core/i18n/en.ts');
const it = dict('src/app/core/i18n/it.ts');
function text(source, key) {
  const esc = key.replace(/\./g, '\\.');
  const m = new RegExp(`'${esc}':\\s*(?:'((?:[^'\\\\]|\\\\.)*)'|"((?:[^"\\\\]|\\\\.)*)"|\`([^\`]*)\`)`).exec(source);
  const raw = m?.[1] ?? m?.[2] ?? m?.[3];
  return raw === undefined ? undefined : raw.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\n/g, ' ').replace(/\s+/g, ' ').trim();
}

let readme = readFileSync('README.md', 'utf8');
const missing = tools.filter((t) => t.path && !readme.includes(`(${BASE}${t.path})`));
if (!missing.length) {
  console.log(`README allineato: ${tools.length} strumenti, nessuno mancante.`);
  process.exit(0);
}
console.log(`Mancanti nel README (${missing.length} su ${tools.length}):`);
for (const t of missing) console.log(`  ${t.path}  [${t.category}]`);
if (!WRITE) {
  console.log('\nCon --write aggiungo le righe.');
  process.exit(0);
}

const lines = readme.split('\n');
for (const t of missing) {
  const heading = SECTION[t.category];
  const start = lines.findIndex((l) => l === `### ${heading}`);
  if (start < 0) {
    console.error(`Sezione «${heading}» non trovata: salto ${t.path}`);
    continue;
  }
  let last = -1;
  for (let i = start + 1; i < lines.length && !lines[i].startsWith('#'); i++) if (lines[i].startsWith('| [**')) last = i;
  if (last < 0) {
    console.error(`Tabella della sezione «${heading}» non trovata: salto ${t.path}`);
    continue;
  }
  const title = text(en, t.titleKey) ?? text(it, t.titleKey) ?? t.path;
  const desc = text(en, t.descriptionKey) ?? text(it, t.descriptionKey) ?? '';
  lines.splice(last + 1, 0, `| [**${title}**](${BASE}${t.path}) | ${desc.endsWith('.') || !desc ? desc : desc + '.'} |`);
}
readme = lines.join('\n');
writeFileSync('README.md', readme);
console.log('README aggiornato: controlla `git diff README.md` e ritocca le righe nuove se serve.');
