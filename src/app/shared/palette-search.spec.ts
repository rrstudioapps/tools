// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 rrstudio — rrstudio tools
import { describe, expect, it } from 'vitest';
import { PaletteItem, scorePaletteItem, searchPalette } from './palette-search';

const mk = (id: string, title: string, description = '', keywords = ''): PaletteItem => ({ id, title, description, keywords });
const items = [
  mk('a', 'Convertitore JSON', 'da e verso CSV'),
  mk('b', 'Formattatore JSON', 'abbellisce'),
  mk('c', 'Generatore di password', 'sicure', 'json no'),
  mk('d', 'Caffè', 'bar'),
];

describe('searchPalette', () => {
  it('senza ricerca restituisce le voci nell\'ordine dato, con limite', () => {
    expect(searchPalette(items, '  ').map((i) => i.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(searchPalette(items, '', 2)).toHaveLength(2);
  });
  it('tutte le parole devono comparire, senza accenti e senza maiuscole', () => {
    expect(searchPalette(items, 'CAFFE').map((i) => i.id)).toEqual(['d']);
    expect(searchPalette(items, 'json csv').map((i) => i.id)).toEqual(['a']);
    expect(searchPalette(items, 'zzz')).toEqual([]);
  });
  it('mette prima chi inizia col testo, poi chi lo contiene, poi descrizione e parole chiave', () => {
    expect(searchPalette(items, 'json').map((i) => i.id)).toEqual(['a', 'b', 'c']);
    expect(searchPalette(items, 'form').map((i) => i.id)).toEqual(['b']);
    expect(searchPalette(items, 'password json')[0].id).toBe('c');
  });
});

describe('scorePaletteItem', () => {
  it('dà 0 al titolo che inizia con la ricerca, 1 a quello che la contiene, 2 alla parola iniziale, 3 al resto', () => {
    expect(scorePaletteItem(mk('x', 'JSON Viewer'), 'json')).toBe(0);
    expect(scorePaletteItem(mk('x', 'Formattatore JSON'), 'json')).toBe(1);
    expect(scorePaletteItem(mk('x', 'Confronto di JSON schema'), 'schema json')).toBe(2);
    expect(scorePaletteItem(mk('x', 'Generatore di password', 'sicure', 'json'), 'json')).toBe(3);
  });
  it('restituisce null se una parola non compare, 0 senza ricerca, e ignora accenti e maiuscole', () => {
    expect(scorePaletteItem(mk('x', 'Caffè', 'bar'), 'tè')).toBeNull();
    expect(scorePaletteItem(mk('x', 'Caffè', 'bar'), '  ')).toBe(0);
    expect(scorePaletteItem(mk('x', 'Caffè', 'bar'), 'CAFFE')).toBe(0);
  });
  it('dà lo stesso ordine di searchPalette', () => {
    const byScore = items
      .map((item, i) => ({ item, i, s: scorePaletteItem(item, 'json') }))
      .filter((r) => r.s !== null)
      .sort((a, b) => (a.s as number) - (b.s as number) || a.i - b.i)
      .map((r) => r.item.id);
    expect(byScore).toEqual(searchPalette(items, 'json').map((i) => i.id));
  });
});
