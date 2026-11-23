// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 rrstudio — rrstudio tools
import { TOOLS, type ToolDefinition } from '../tools/tools.registry';
import { relatedTools } from './related-tools';

const fake = (id: string, category: ToolDefinition['category'], it: string, extra: Partial<ToolDefinition> = {}): ToolDefinition =>
  ({ id, path: id, category, keywords: { it, en: it }, ...extra }) as ToolDefinition;

describe('relatedTools', () => {
  const a = fake('a', 'text', 'ordina righe elenco duplicati');
  const b = fake('b', 'text', 'elenco duplicati confronta');
  const c = fake('c', 'text', 'elenco altro');
  const d = fake('d', 'dev', 'elenco duplicati ordina righe');
  const e = fake('e', 'text', 'niente in comune');
  const all = [a, b, c, d, e];

  it('stessa categoria, esclude se stesso, ordina per parole in comune', () => {
    expect(relatedTools(a, all).map((t) => t.id)).toEqual(['b', 'c', 'e']);
  });
  it('a parità vale l\'ordine del registro', () => {
    expect(relatedTools(c, [c, b, a]).map((t) => t.id)).toEqual(['b', 'a']);
  });
  it('rispetta il limite', () => {
    expect(relatedTools(a, all, 1).length).toBe(1);
  });
  it('registro reale: ogni strumento ne ha qualcuno in italiano e il risultato è stabile', () => {
    for (const t of TOOLS) {
      const r1 = relatedTools(t, TOOLS);
      expect(r1.map((x) => x.id)).toEqual(relatedTools(t, TOOLS).map((x) => x.id));
      expect(r1.length, t.id).toBeGreaterThan(0);
      expect(r1.every((x) => x.id !== t.id && x.category === t.category)).toBe(true);
    }
  });
});
