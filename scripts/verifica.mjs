// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 rrstudio — rrstudio Tools
// Verifica mirata: guarda i file modificati (git), ricava gli strumenti toccati e lancia solo i controlli utili,
// fermandosi al primo errore e stampando poche righe. Uso: node scripts/verifica.mjs [--full] [--since <rif>] [--pwa] [--no-e2e]
//   (nessuna opzione)  modifiche non committate (staged, non staged, nuovi file)
//   --since <rif>      confronta con un riferimento git (es. HEAD~3, origin/main)
//   --full             smoke ed e2e su tutto (lento: lo smoke completo supera i 20 minuti)
//   --pwa              aggiunge `npm run pwa-check`
// Cosa gira: typecheck + test sempre; poi, solo se cambia codice dell'app, build + e2e + smoke ristretti agli strumenti toccati.
// Se cambia il codice condiviso (src/app/shared, core, pages, stili) lo smoke gira su un campione di pagine, non su tutte.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const args = process.argv.slice(2);
const FULL = args.includes('--full');
const PWA = args.includes('--pwa');
const NO_E2E = args.includes('--no-e2e');
const since = args.includes('--since') ? args[args.indexOf('--since') + 1] : null;

const git = (...a) => execFileSync('git', a, { encoding: 'utf8' }).split('\n').filter(Boolean);
const changed = [
  ...new Set(since ? git('diff', '--name-only', since) : [...git('diff', '--name-only', 'HEAD'), ...git('ls-files', '--others', '--exclude-standard')]),
];

// cartella -> percorso pubblico, dal registry degli strumenti
const registry = readFileSync('src/app/tools/tools.registry.ts', 'utf8');
const folderToPath = new Map();
for (const m of registry.matchAll(/\n {4}path: '([^']+)'[\s\S]*?import\('\.\/([^/']+)\//g)) folderToPath.set(m[2], m[1]);

const toolFolders = new Set();
let shared = false;
let appCode = false;
for (const f of changed) {
  const t = /^src\/app\/tools\/([^/]+)\//.exec(f);
  if (t) {
    toolFolders.add(t[1]);
    appCode = true;
  } else if (/^(src|public)\//.test(f) && !/\.spec\.ts$/.test(f)) {
    shared = true;
    appCode = true;
  }
}
const toolPaths = [...toolFolders].map((d) => folderToPath.get(d) ?? d);

// nomi degli screenshot dello strumento (shot('<nome>.png' in screenshots.mjs e in scripts/shots)
const shotSources = [readFileSync('scripts/screenshots.mjs', 'utf8')];
if (existsSync('scripts/shots')) for (const f of readdirSync('scripts/shots')) if (f.endsWith('.mjs')) shotSources.push(readFileSync(join('scripts/shots', f), 'utf8'));
const allShots = shotSources.flatMap((s) => [...s.matchAll(/shot\('([^']+\.png)'/g)].map((m) => m[1]));
const SAMPLE_SHOTS = ['home-light.png', 'home-mobile.png', 'base64.png', 'json-formatter.png', 'text-diff-position.png'];
// con ONLY impostato le schermate non elencate vengono saltate (i casi di passaggio file girano comunque)
const onlyShots = FULL ? [] : shared ? SAMPLE_SHOTS : allShots.filter((n) => toolPaths.some((p) => n === p + '.png' || n.startsWith(p + '-')));
const skipAllShots = !FULL && !shared && onlyShots.length === 0;

const SAMPLE = ['=/', '=/preferiti/', 'base64', 'json-formatter', 'text-diff'];
const smokeOnly = FULL ? '' : shared ? SAMPLE.join(',') : toolPaths.join(',');

const env = { ...process.env };
const chromium = join(homedir(), '.cache/ms-playwright/chromium-1254/chrome-linux-arm64/chrome');
if (!env.CHROMIUM_PATH && existsSync(chromium)) env.CHROMIUM_PATH = chromium;

console.log(`File modificati: ${changed.length}. Strumenti toccati: ${toolPaths.join(', ') || 'nessuno'}${shared ? ' + codice condiviso' : ''}.`);

function step(nome, cmd, argv, extraEnv = {}) {
  const t0 = Date.now();
  const r = spawnSync('nice', ['-n', '19', cmd, ...argv], { env: { ...env, ...extraEnv }, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const secondi = Math.round((Date.now() - t0) / 1000);
  const out = `${r.stdout ?? ''}${r.stderr ?? ''}`.replace(/\x1B\[[0-9;]*m/g, '');
  if (r.status === 0) {
    console.log(`OK  ${nome} (${secondi}s)`);
    return;
  }
  console.log(`KO  ${nome} (${secondi}s)\n${out.split('\n').filter(Boolean).slice(-25).join('\n')}`);
  process.exit(1);
}

step('typecheck', 'npm', ['run', '--silent', 'typecheck']);
step('test', 'npm', ['test', '--silent']);
if (!appCode && !FULL) {
  console.log('Nessun codice dell\'app toccato: build, e2e e smoke non servono.');
  process.exit(0);
}
step('build', 'npm', ['run', '--silent', 'build']);
if (!NO_E2E) step(`e2e${FULL ? ' completo' : ' (' + onlyShots.length + ' schermate)'}`, 'node', ['scripts/screenshots.mjs', '--check'], FULL ? {} : { ONLY: skipAllShots ? '__nessuna__' : onlyShots.join(',') });
step(`smoke${smokeOnly ? ' (' + smokeOnly + ')' : ' completo'}`, 'node', ['scripts/smoke.mjs'], smokeOnly ? { SMOKE_ONLY: smokeOnly } : {});
if (PWA) step('pwa-check', 'npm', ['run', '--silent', 'pwa-check']);
console.log('Tutto a posto.');
