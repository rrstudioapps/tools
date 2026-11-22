// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 rrstudio — rrstudio Tools
import { PDFDocument } from 'pdf-lib';
import { interleavePdfs, interleavePlan } from './pdf-interleave';

/** PDF in cui la larghezza di ogni pagina identifica la pagina (base + numero). */
async function marked(base: number, n: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 1; i <= n; i++) doc.addPage([base + i, 300]);
  return doc.save();
}
const widths = async (b: Uint8Array) => (await PDFDocument.load(b)).getPages().map((p) => p.getWidth());
const label = (s: ReturnType<typeof interleavePlan>[number]): string => (s.kind === 'blank' ? '-' : (s.kind === 'front' ? 'F' : 'R') + (s.index + 1));

describe('ordine', () => {
  it('alterna fronti e retri', () => {
    expect(interleavePlan(3, 3, { reverseBacks: false, extra: 'ignore' }).map(label)).toEqual(['F1', 'R1', 'F2', 'R2', 'F3', 'R3']);
  });
  it('retri in ordine inverso', () => {
    expect(interleavePlan(3, 3, { reverseBacks: true, extra: 'ignore' }).map(label)).toEqual(['F1', 'R3', 'F2', 'R2', 'F3', 'R1']);
  });
  it('numero diverso: ignora le pagine in più', () => {
    expect(interleavePlan(3, 2, { reverseBacks: false, extra: 'ignore' }).map(label)).toEqual(['F1', 'R1', 'F2', 'R2']);
    expect(interleavePlan(1, 3, { reverseBacks: false, extra: 'ignore' }).map(label)).toEqual(['F1', 'R1']);
  });
  it('numero diverso: aggiunge pagine vuote', () => {
    expect(interleavePlan(3, 2, { reverseBacks: false, extra: 'pad' }).map(label)).toEqual(['F1', 'R1', 'F2', 'R2', 'F3', '-']);
    expect(interleavePlan(1, 2, { reverseBacks: false, extra: 'pad' }).map(label)).toEqual(['F1', 'R1', '-', 'R2']);
  });
  it('file vuoto o niente da unire', () => {
    expect(interleavePlan(0, 0, { reverseBacks: false, extra: 'pad' })).toEqual([]);
    expect(interleavePlan(2, 0, { reverseBacks: false, extra: 'ignore' })).toEqual([]);
  });
});

describe('unione', () => {
  it('produce le pagine nell\'ordine previsto', async () => {
    const r = await interleavePdfs(await marked(100, 3), await marked(200, 3), { reverseBacks: true, extra: 'ignore' });
    if (!r.ok) throw new Error('no');
    expect(r.pages).toBe(6);
    expect(await widths(r.bytes)).toEqual([101, 203, 102, 202, 103, 201]);
  });
  it('la pagina vuota prende la misura della pagina accanto', async () => {
    const r = await interleavePdfs(await marked(100, 1), await marked(200, 2), { reverseBacks: false, extra: 'pad' });
    if (!r.ok) throw new Error('no');
    expect(await widths(r.bytes)).toEqual([101, 201, 202, 202]);
  });
  it('stessa pagina usata una volta sola, nessun errore con file di una pagina', async () => {
    const r = await interleavePdfs(await marked(100, 1), await marked(200, 1), { reverseBacks: true, extra: 'pad' });
    expect(r).toMatchObject({ ok: true, pages: 2 });
  });
});
