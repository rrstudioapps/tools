// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 rrstudio — rrstudio tools
import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CHANGELOG } from '../changelog';
import { CATEGORIES, TOOLS } from '../../tools/tools.registry';
import {
  alternatePath,
  allSlugs,
  buildSitemap,
  lastModified,
  hasLang,
  hreflangLinks,
  langFromPath,
  publicUrl,
  routePath,
  SHARE_SLUG,
  isShareSlug,
  slugFromPath,
  STATIC_PAGES,
} from './lang-routing';

describe('URL ↔ lingua', () => {
  it('la radice è italiana, /en è inglese', () => {
    expect(langFromPath('/')).toBe('it');
    expect(langFromPath('/pdf-tools')).toBe('it');
    expect(langFromPath('/en')).toBe('en');
    expect(langFromPath('/en/')).toBe('en');
    expect(langFromPath('/en/pdf-tools?x=1#a')).toBe('en');
    expect(langFromPath('/english-tool')).toBe('it');
  });
  it('slugFromPath toglie prefisso, slash, query e fragment', () => {
    expect(slugFromPath('/')).toBe('');
    expect(slugFromPath('/en/')).toBe('');
    expect(slugFromPath('/en')).toBe('');
    expect(slugFromPath('/pdf-tools/')).toBe('pdf-tools');
    expect(slugFromPath('/en/pdf-tools?categoria=dati#x')).toBe('pdf-tools');
  });
  it('routePath e publicUrl', () => {
    expect(routePath('', 'it')).toBe('/');
    expect(routePath('', 'en')).toBe('/en');
    expect(routePath('pdf-tools', 'it')).toBe('/pdf-tools');
    expect(routePath('pdf-tools', 'en')).toBe('/en/pdf-tools');
    expect(publicUrl('', 'it')).toBe('https://tools.rrstudio.app/');
    expect(publicUrl('', 'en')).toBe('https://tools.rrstudio.app/en/');
    expect(publicUrl('pdf-tools', 'en')).toBe('https://tools.rrstudio.app/en/pdf-tools');
  });
  it('alternatePath: stessa pagina nell\'altra lingua, anche per gli strumenti per l\'Italia', () => {
    expect(alternatePath('/pdf-tools', 'en')).toBe('/en/pdf-tools');
    expect(alternatePath('/en/pdf-tools', 'it')).toBe('/pdf-tools');
    expect(alternatePath('/', 'en')).toBe('/en');
    expect(alternatePath('/en', 'it')).toBe('/');
    expect(alternatePath('/codice-fiscale', 'en')).toBe('/en/codice-fiscale');
    expect(alternatePath('/en/codice-fiscale', 'it')).toBe('/codice-fiscale');
  });
  it('la pagina di ricezione delle condivisioni: slug per lingua, cambio lingua, fuori da sitemap', () => {
    expect(SHARE_SLUG).toEqual({ it: 'condividi', en: 'share' });
    expect(isShareSlug('condividi') && isShareSlug('share') && !isShareSlug('preferiti')).toBe(true);
    expect(alternatePath('/condividi', 'en')).toBe('/en/share');
    expect(alternatePath('/en/share', 'it')).toBe('/condividi');
    expect(allSlugs()).not.toContain('condividi');
    expect(buildSitemap()).not.toContain('condividi');
    expect(buildSitemap()).not.toContain('/share');
  });
  it('hasLang: ogni strumento esiste in italiano e in inglese', () => {
    for (const t of TOOLS) {
      expect(hasLang(t.path, 'it'), t.id).toBe(true);
      expect(hasLang(t.path, 'en'), t.id).toBe(true);
    }
    expect(hasLang('', 'en')).toBe(true);
    expect(hasLang('inesistente', 'en')).toBe(false);
    expect(hasLang('privacy', 'en')).toBe(true);
  });
  it('la categoria Italia ha gli strumenti attesi, tutti con slug italiano', () => {
    const italy = TOOLS.filter((t) => t.category === 'italy').map((t) => t.id).sort();
    expect(italy).toEqual([
      'calcolo-giorni-lavorativi',
      'calcolo-iva',
      'calcolo-rata-mutuo',
      'calcolo-ritenuta-acconto',
      'codice-fiscale',
      'convertitore-lire-euro',
      'fattura-elettronica',
      'generatore-codice-fiscale',
      'iban-partita-iva',
      'numeri-in-lettere',
      'scadenze-fatture',
    ]);
    expect(new Set(CATEGORIES.map((c) => c.slugEn)).size).toBe(CATEGORIES.length);
  });
});

describe('hreflang', () => {
  it('pagina con due versioni: it, en e x-default (inglese)', () => {
    expect(hreflangLinks('pdf-tools')).toEqual([
      { hreflang: 'it', href: 'https://tools.rrstudio.app/pdf-tools' },
      { hreflang: 'en', href: 'https://tools.rrstudio.app/en/pdf-tools' },
      { hreflang: 'x-default', href: 'https://tools.rrstudio.app/en/pdf-tools' },
    ]);
    expect(hreflangLinks('').map((a) => a.href)).toEqual([
      'https://tools.rrstudio.app/',
      'https://tools.rrstudio.app/en/',
      'https://tools.rrstudio.app/en/',
    ]);
  });
  it('strumento per l\'Italia: slug italiano anche sotto /en/', () => {
    expect(hreflangLinks('codice-fiscale')).toEqual([
      { hreflang: 'it', href: 'https://tools.rrstudio.app/codice-fiscale' },
      { hreflang: 'en', href: 'https://tools.rrstudio.app/en/codice-fiscale' },
      { hreflang: 'x-default', href: 'https://tools.rrstudio.app/en/codice-fiscale' },
    ]);
  });
});

describe('sitemap', () => {
  const xml = buildSitemap();
  it('ha tutte le URL italiane e quelle inglesi di ogni strumento', () => {
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(locs.length).toBe(allSlugs().length + 1 + TOOLS.length + STATIC_PAGES.length + 2);
    expect(new Set(locs).size).toBe(locs.length);
    expect(locs).toContain('https://tools.rrstudio.app/en/');
    expect(locs).toContain('https://tools.rrstudio.app/en/pdf-tools');
    expect(locs).toContain('https://tools.rrstudio.app/codice-fiscale');
    expect(locs).toContain('https://tools.rrstudio.app/privacy');
    expect(locs).toContain('https://tools.rrstudio.app/en/privacy');
    expect(locs).toContain('https://tools.rrstudio.app/en/codice-fiscale');
    expect(locs).toContain('https://tools.rrstudio.app/novita');
    expect(locs).toContain('https://tools.rrstudio.app/en/changelog');
  });
  it('dichiara il namespace xhtml e ogni url ha i suoi link alternate', () => {
    expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
    const block = xml.split('<url>').find((b) => b.includes('<loc>https://tools.rrstudio.app/en/pdf-tools</loc>'))!;
    expect(block.match(/<xhtml:link /g)?.length).toBe(3);
    expect(block).toContain('hreflang="x-default" href="https://tools.rrstudio.app/en/pdf-tools"');
    const cf = xml.split('<url>').find((b) => b.includes('<loc>https://tools.rrstudio.app/codice-fiscale</loc>'))!;
    expect(cf.match(/<xhtml:link /g)?.length).toBe(3);
  });
  it('ogni URL ha lastmod nel formato AAAA-MM-GG, senza date nel futuro e senza ore', () => {
    const urls = xml.split('<url>').slice(1);
    for (const u of urls) expect(u).toMatch(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/);
    expect(urls.length).toBe((xml.match(/<loc>/g) ?? []).length);
  });
  it('lastModified: home e Novità hanno la data più recente, uno strumento quella dell\'ultima voce che lo nomina', () => {
    expect(lastModified('')).toBe(CHANGELOG[0].date);
    expect(lastModified('novita')).toBe(CHANGELOG[0].date);
    const withEntry = CHANGELOG[0].entries.find((e) => e.toolIds?.length)!;
    const tool = TOOLS.find((t) => t.id === withEntry.toolIds![0])!;
    expect(lastModified(tool.path)).toBe(CHANGELOG[0].date);
    expect(lastModified('privacy')).toBe('2026-11-24');
  });
  it('public/sitemap.xml è aggiornato (UPDATE_SITEMAP=1 npm test lo riscrive)', () => {
    const file = 'public/sitemap.xml';
    if (process.env['UPDATE_SITEMAP'] === '1') writeFileSync(file, xml);
    expect(readFileSync(file, 'utf8')).toBe(xml);
  });
});
