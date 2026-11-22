// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 rrstudio — rrstudio Tools
import { PDFDocument, degrees } from 'pdf-lib';
import { CUT_MAX, halves, splitSpreads, visualToRaw } from './pdf-split-spreads';

async function sample(sizes: [number, number, number?][]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont('Helvetica');
  for (const [w, h, r] of sizes) {
    const p = doc.addPage([w, h]);
    p.drawText('x', { x: 10, y: 10, font });
    if (r) p.setRotation(degrees(r));
  }
  return doc.save();
}
const boxes = async (b: Uint8Array) => (await PDFDocument.load(b)).getPages().map((p) => {
  const m = p.getMediaBox();
  return [m.x, m.y, m.width, m.height];
});
const base = { layout: 'side', cut: 50, order: 'normal', exclude: '' } as const;

describe('metà', () => {
  it('affiancate: sinistra poi destra, taglio regolabile', () => {
    expect(halves(400, 300, base)).toEqual([{ x0: 0, y0: 0, x1: 200, y1: 300 }, { x0: 200, y0: 0, x1: 400, y1: 300 }]);
    expect(halves(400, 300, { ...base, cut: 25 })[0].x1).toBe(100);
  });
  it('ordine inverso (manga): prima la destra', () => {
    expect(halves(400, 300, { ...base, order: 'reverse' })[0].x0).toBe(200);
  });
  it('una sopra l\'altra: prima quella in alto', () => {
    const [a, b] = halves(400, 300, { ...base, layout: 'stacked' });
    expect(a).toEqual({ x0: 0, y0: 150, x1: 400, y1: 300 });
    expect(b).toEqual({ x0: 0, y0: 0, x1: 400, y1: 150 });
  });
  it('rotazioni: la metà sinistra a schermo cade sul lato giusto della pagina vera', () => {
    const left = { x0: 0, y0: 0, x1: 200, y1: 300 };
    expect(visualToRaw(90, 300, 400, left)).toEqual({ x0: 0, x1: 300, y0: 0, y1: 200 });
    expect(visualToRaw(270, 300, 400, left)).toEqual({ x0: 0, x1: 300, y0: 200, y1: 400 });
    expect(visualToRaw(180, 400, 300, left)).toEqual({ x0: 200, x1: 400, y0: 0, y1: 300 });
  });
});

describe('divisione', () => {
  it('raddoppia le pagine e le metà condividono il contenuto', async () => {
    const src = await sample([[400, 300], [400, 300]]);
    const r = await splitSpreads(src, base);
    if (!r.ok) throw new Error('no');
    expect(r).toMatchObject({ pages: 4, split: 2 });
    expect(await boxes(r.bytes)).toEqual([[0, 0, 200, 300], [200, 0, 200, 300], [0, 0, 200, 300], [200, 0, 200, 300]]);
    const doc = await PDFDocument.load(r.bytes);
    expect(doc.getPage(0).getCropBox().width).toBe(200);
    expect(r.bytes.length).toBeLessThan(src.length * 1.6);
  });
  it('taglio al 30% e ordine inverso', async () => {
    const r = await splitSpreads(await sample([[1000, 500]]), { ...base, cut: 30, order: 'reverse' });
    if (!r.ok) throw new Error('no');
    expect(await boxes(r.bytes)).toEqual([[300, 0, 700, 500], [0, 0, 300, 500]]);
  });
  it('pagine escluse restano intere (copertina)', async () => {
    const r = await splitSpreads(await sample([[300, 400], [400, 300], [400, 300]]), { ...base, exclude: '1, 3' });
    if (!r.ok) throw new Error('no');
    expect(r).toMatchObject({ pages: 4, split: 1 });
    expect((await boxes(r.bytes)).map((b) => b[2])).toEqual([300, 200, 200, 400]);
  });
  it('una sopra l\'altra con pagina ruotata', async () => {
    const r = await splitSpreads(await sample([[300, 400, 90]]), { ...base, layout: 'stacked' });
    if (!r.ok) throw new Error('no');
    // a schermo 400 x 300: la metà alta è il lato sinistro della pagina vera
    expect(await boxes(r.bytes)).toEqual([[0, 0, 150, 400], [150, 0, 150, 400]]);
  });
  it('errori: taglio fuori scala e pagine escluse non valide', async () => {
    const src = await sample([[400, 300]]);
    expect(await splitSpreads(src, { ...base, cut: 0 })).toMatchObject({ ok: false, error: { code: 'cut' } });
    expect(await splitSpreads(src, { ...base, cut: CUT_MAX + 1 })).toMatchObject({ ok: false, error: { code: 'cut' } });
    expect(await splitSpreads(src, { ...base, exclude: '7' })).toMatchObject({ ok: false, error: { code: 'range' } });
    expect(await splitSpreads(src, { ...base, exclude: 'a' })).toMatchObject({ ok: false, error: { code: 'range' } });
  });
});
