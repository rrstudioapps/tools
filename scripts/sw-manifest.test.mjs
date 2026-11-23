// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 rrstudio — rrstudio tools
// Test della logica pura di sw-manifest.mjs. Uso: node --test scripts/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HASHED_RE, buildLists, htmlRefs, isExcluded, pageUrl, versionInput } from './sw-manifest.mjs';

test('pattern dei file con hash', () => {
  assert.ok(HASHED_RE.test('main-YP2F5GDF.js'));
  assert.ok(HASHED_RE.test('chunk-DxqKAYlM.js'));
  assert.ok(HASHED_RE.test('styles-ABCD1234.css'));
  assert.ok(!HASHED_RE.test('pdfjs/pdf.worker.min.mjs'));
  assert.ok(!HASHED_RE.test('favicon.svg'));
  assert.ok(!HASHED_RE.test('sw.js'));
});

test('indirizzi delle pagine', () => {
  assert.equal(pageUrl('index.html'), '/');
  assert.equal(pageUrl('en/index.html'), '/en/');
  assert.equal(pageUrl('en/csv-dashboard/index.html'), '/en/csv-dashboard/');
  assert.equal(pageUrl('index.csr.html'), null);
  assert.equal(pageUrl('main-AAAAAAAA.js'), null);
});

test('esclusioni', () => {
  assert.ok(isExcluded('og/it/qr.png'));
  assert.ok(isExcluded('og-image.png'));
  assert.ok(isExcluded('sitemap.xml'));
  assert.ok(isExcluded('changelog.xml') && isExcluded('changelog.en.xml'));
  assert.ok(isExcluded('sw.js'));
  assert.ok(isExcluded('main-AAAAAAAA.js.map'));
  assert.ok(isExcluded('index.csr.html'));
  assert.ok(isExcluded('samples/grande.csv', 10 * 1024 * 1024));
  assert.ok(!isExcluded('samples/piccolo.csv', 1024));
  assert.ok(!isExcluded('pdfjs/pdf.worker.min.mjs'));
  assert.ok(!isExcluded('wordlists/eff-large.txt'));
});

test('riferimenti locali di una pagina', () => {
  const html = `<link rel="stylesheet" href="styles-AAAAAAAA.css"><link rel="icon" href="favicon.ico">
    <link rel="canonical" href="https://tools.rrstudio.app/"><link rel="modulepreload" href="chunk-AbCdEfGh.js">
    <link rel="preload" href="/fonts/a.woff2" as="font"><script src="main-BBBBBBBB.js" type="module"></script>
    <script src="https://esterno.example/x.js"></script>`;
  assert.deepEqual(htmlRefs(html).sort(), [
    '/chunk-AbCdEfGh.js',
    '/favicon.ico',
    '/fonts/a.woff2',
    '/main-BBBBBBBB.js',
    '/styles-AAAAAAAA.css',
  ]);
});

test('SHELL e ALL', () => {
  const files = [
    { path: 'index.html', size: 100 },
    { path: 'en/index.html', size: 100 },
    { path: 'qr/index.html', size: 100 },
    { path: 'en/qr/index.html', size: 100 },
    { path: 'index.csr.html', size: 100 },
    { path: 'main-AAAAAAAA.js', size: 1000, gzip: 300 },
    { path: 'chunk-AbCdEfGh.js', size: 5000, gzip: 1000 },
    { path: 'styles-CCCCCCCC.css', size: 500, gzip: 100 },
    { path: 'fonts/a.woff2', size: 2000 },
    { path: 'manifest.webmanifest', size: 400, gzip: 200 },
    { path: 'icon-192.png', size: 900 },
    { path: 'pdfjs/pdf.worker.min.mjs', size: 4000, gzip: 1500 },
    { path: 'og/it/qr.png', size: 99999 },
    { path: 'sitemap.xml', size: 99999 },
    { path: 'sw.js', size: 99999 },
  ];
  const home = '<link rel="stylesheet" href="styles-CCCCCCCC.css"><script src="main-AAAAAAAA.js"></script><link rel="preload" href="/fonts/a.woff2">';
  const { shell, all, pages, size } = buildLists(files, { '/': home, '/en/': home });
  assert.deepEqual(pages, ['/', '/en/', '/en/qr/', '/qr/']);
  assert.deepEqual(shell, ['/', '/en/', '/fonts/a.woff2', '/icon-192.png', '/main-AAAAAAAA.js', '/manifest.webmanifest', '/styles-CCCCCCCC.css']);
  assert.ok(all.includes('/chunk-AbCdEfGh.js') && all.includes('/pdfjs/pdf.worker.min.mjs'));
  assert.ok(!all.some((u) => u.startsWith('/og/') || u === '/sitemap.xml' || u === '/sw.js' || u === '/index.csr.html'));
  for (const u of shell) assert.ok(all.includes(u), `${u} dovrebbe stare anche in ALL`);
  assert.equal(size, 400 + 300 + 1000 + 100 + 2000 + 200 + 900 + 1500);
});

test('input della versione indipendente dall ordine', () => {
  const a = versionInput([{ path: 'b', hash: '2' }, { path: 'a', hash: '1' }]);
  const b = versionInput([{ path: 'a', hash: '1' }, { path: 'b', hash: '2' }]);
  assert.equal(a, b);
  assert.notEqual(a, versionInput([{ path: 'a', hash: '1' }, { path: 'b', hash: '3' }]));
});
