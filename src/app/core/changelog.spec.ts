// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 rrstudio — rrstudio tools
import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TOOLS } from '../tools/tools.registry';
import { it as itRaw } from './i18n/it';
import { en as enRaw } from './i18n/en';

const itDict = itRaw as Record<string, string>;
const enDict = enRaw as Record<string, string>;
import { CHANGELOG, ChangeKind } from './changelog';
import { FEED_PATH, FEED_VERSIONS, KIND_ORDER, buildFeed, daysBetween, latestChangelogDay, formatDay, isoDay, newToolIds } from './changelog.logic';
import { CHANGELOG_SLUG, alternatePath, hasOgImage, hreflangLinks } from './i18n/lang-routing';

describe('dati del changelog', () => {
  it('le date sono AAAA-MM-GG (mai l\'ora) in ordine decrescente e senza doppioni', () => {
    for (const v of CHANGELOG) expect(v.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    for (let i = 1; i < CHANGELOG.length; i++) expect(CHANGELOG[i - 1].date > CHANGELOG[i].date).toBe(true);
  });
  it('tipi validi, testi it/en non vuoti, titoli presenti', () => {
    for (const v of CHANGELOG) {
      expect(v.title.it.trim()).not.toBe('');
      expect(v.title.en.trim()).not.toBe('');
      expect(v.entries.length).toBeGreaterThan(0);
      for (const e of v.entries) {
        expect(KIND_ORDER).toContain(e.kind);
        expect(e.it.trim()).not.toBe('');
        expect(e.en.trim()).not.toBe('');
        for (const n of e.issues ?? []) expect(Number.isInteger(n) && n > 0).toBe(true);
      }
    }
  });
  it('i toolIds esistono nel registry; una voce new-tool li ha sempre', () => {
    const ids = new Set(TOOLS.map((t) => t.id));
    for (const v of CHANGELOG)
      for (const e of v.entries) {
        for (const id of e.toolIds ?? []) expect(ids.has(id), id).toBe(true);
        if (e.kind === 'new-tool') expect(e.toolIds?.length ?? 0).toBeGreaterThan(0);
      }
  });
  it('ogni strumento compare come nuovo in una sola versione', () => {
    const seen = new Set<string>();
    for (const v of CHANGELOG)
      for (const e of v.entries)
        if (e.kind === 'new-tool')
          for (const id of e.toolIds!) {
            // eccezione ammessa: nessuna
            expect(seen.has(id), id).toBe(false);
            seen.add(id);
          }
  });
  it('nessun orario né riferimento interno nei testi', () => {
    const all = JSON.stringify(CHANGELOG);
    expect(all).not.toMatch(/\d{1,2}:\d{2}/);
    expect(all).not.toMatch(/claude|portainer|gitea|vpn/i);
  });
});

describe('badge «Nuovo»', () => {
  const tools = [
    { id: 'old', added: '2026-10-01' },
    { id: 'b64', added: '2026-11-18' },
    { id: 'edge', added: '2026-10-20' },
    { id: 'same', added: '2026-11-18' },
    { id: 'future', added: '2026-12-31' },
  ];
  it('conta solo gli strumenti aggiunti negli ultimi 30 giorni, i più recenti prima', () => {
    expect([...newToolIds('2026-11-18', 30, tools)]).toEqual(['b64', 'same', 'edge']);
  });
  it('il 29° giorno è dentro, il 30° fuori', () => {
    expect(newToolIds('2026-12-17', 30, tools).has('b64')).toBe(true);
    expect(newToolIds('2026-12-18', 30, tools).has('b64')).toBe(false);
    expect(newToolIds('2026-11-18', 30, tools).has('edge')).toBe(true);
    expect(newToolIds('2026-11-19', 30, tools).has('edge')).toBe(false);
  });
  it('una data futura rispetto alla data di build non conta', () => {
    expect(newToolIds('2026-11-17', 30, tools).has('b64')).toBe(false);
    expect(newToolIds('2026-11-18', 30, tools).has('future')).toBe(false);
  });
  it('senza strumenti: vuoto', () => {
    expect(newToolIds('2026-11-18', 30, []).size).toBe(0);
  });
  it('tetto ai badge: i più recenti, nell\'ordine del registry', () => {
    expect([...newToolIds('2026-11-18', 30, tools, 2)]).toEqual(['b64', 'same']);
  });
  it('dati reali: ogni strumento ha una data valida, mai futura e mai prima della prima uscita', () => {
    for (const t of TOOLS) {
      expect(t.added, t.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(t.added >= '2026-11-15' && t.added <= latestChangelogDay(), t.id).toBe(true);
    }
    expect(newToolIds('2026-11-19').size).toBeGreaterThan(0);
    expect(newToolIds('2027-06-01').size).toBe(0);
  });
  it('date: differenza in giorni e giorno UTC', () => {
    expect(daysBetween('2026-10-31', '2026-11-01')).toBe(1);
    expect(daysBetween('2026-11-18', '2026-11-18')).toBe(0);
    expect(isoDay(Date.UTC(2026, 10, 18, 23, 59))).toBe('2026-11-18');
  });
});

describe('formato data', () => {
  it('lunga nella lingua, senza spostamenti di fuso', () => {
    expect(formatDay('2026-11-18', 'it')).toBe('18 novembre 2026');
    expect(formatDay('2026-11-18', 'en')).toBe('18 November 2026');
  });
});

describe('slug della pagina Novità', () => {
  it('alternate, hreflang e immagine social', () => {
    expect(alternatePath('/novita', 'en')).toBe('/en/changelog');
    expect(alternatePath('/en/changelog', 'it')).toBe('/novita');
    expect(hreflangLinks('novita').map((a) => a.href)).toEqual([
      'https://tools.rr-dev.eu/novita',
      'https://tools.rr-dev.eu/en/changelog',
      'https://tools.rr-dev.eu/en/changelog',
    ]);
    expect(hasOgImage(CHANGELOG_SLUG.it, 'it')).toBe(false);
  });
});

describe('dizionari della pagina', () => {
  it('chiavi presenti in italiano e inglese', () => {
    const keys = [
      'footer.changelog', 'home.new', 'changelog.title', 'changelog.feed', 'seo.changelog.title', 'seo.changelog.desc',
      ...KIND_ORDER.flatMap((k) => ['changelog.kind.' + k, 'changelog.filter.' + k]),
    ];
    for (const k of keys) {
      expect(itDict[k], k).toBeTruthy();
      expect(enDict[k], k).toBeTruthy();
    }
  });
});

describe('feed Atom', () => {
  const label = (lang: 'it' | 'en') => (k: ChangeKind) => (lang === 'it' ? itDict : enDict)['changelog.kind.' + k];
  for (const lang of ['it', 'en'] as const) {
    const xml = buildFeed(lang, label(lang));
    it(`${lang}: struttura, date e massimo ${FEED_VERSIONS} voci`, () => {
      expect(xml).toContain('<feed xmlns="http://www.w3.org/2005/Atom"');
      expect(xml.match(/<entry>/g)?.length).toBe(Math.min(CHANGELOG.length, FEED_VERSIONS));
      expect(xml).toContain(`<updated>${CHANGELOG[0].date}T00:00:00Z</updated>`);
      expect(xml).toContain(`href="https://tools.rr-dev.eu/${FEED_PATH[lang]}"`);
      expect(xml).not.toMatch(/<script|tracking|utm_/i);
    });
    it(`${lang}: public/${FEED_PATH[lang]} è aggiornato (UPDATE_SITEMAP=1 npm test lo riscrive)`, () => {
      const file = 'public/' + FEED_PATH[lang];
      if (process.env['UPDATE_SITEMAP'] === '1') writeFileSync(file, xml);
      expect(readFileSync(file, 'utf8')).toBe(xml);
    });
  }
  it('esegue l\'escape dei caratteri speciali e limita a 20 versioni', () => {
    const many = Array.from({ length: 25 }, (_, i) => ({
      date: `2026-10-${String(25 - i).padStart(2, '0')}`,
      title: { it: 'A & B', en: '<x>' },
      entries: [{ kind: 'fix' as const, it: 'a < b', en: 'a < b' }],
    }));
    const xml = buildFeed('it', () => 'Fix', many);
    expect(xml.match(/<entry>/g)?.length).toBe(20);
    expect(xml).toContain('A &amp; B');
    expect(xml).not.toContain('a < b');
  });
});
