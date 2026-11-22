// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 rrstudio — rrstudio tools
import { PDFDocument, degrees } from 'pdf-lib';
import { DEFAULTS, MM, NupOptions, buildNup, cellRects, gridFor, layoutOf, placePage, planSheets, sheetSize } from './pdf-nup';

async function sample(n: number, rot = 0): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont('Helvetica');
  for (let i = 0; i < n; i++) {
    const p = doc.addPage([300, 400]);
    p.drawText(String(i + 1), { x: 10, y: 10, font });
    if (rot) p.setRotation(degrees(rot));
  }
  return doc.save();
}
const opts = (o: Partial<NupOptions>): NupOptions => ({ ...DEFAULTS, ...o });

describe('griglia e foglio', () => {
  it('colonne e righe seguono l\'orientamento', () => {
    expect(gridFor(2, 'landscape')).toEqual({ cols: 2, rows: 1 });
    expect(gridFor(2, 'portrait')).toEqual({ cols: 1, rows: 2 });
    expect(gridFor(6, 'landscape')).toEqual({ cols: 3, rows: 2 });
    expect(gridFor(6, 'portrait')).toEqual({ cols: 2, rows: 3 });
    expect(gridFor(9, 'portrait')).toEqual({ cols: 3, rows: 3 });
  });
  it('il foglio si gira e il libretto è sempre 2 in orizzontale', () => {
    expect(sheetSize('A4', 'landscape')).toEqual({ width: 841.89, height: 595.28 });
    expect(layoutOf(opts({ mode: 'booklet', perSheet: 9, orientation: 'portrait' }))).toMatchObject({ cols: 2, rows: 1, width: 841.89 });
  });
  it('le celle stanno nel foglio e i margini troppo grandi sono rifiutati', () => {
    const r = cellRects(600, 800, 2, 2, 20, 10)!;
    expect(r).toHaveLength(4);
    expect(r[0]).toEqual({ x: 20, y: 800 - 20 - 375, width: 275, height: 375 });
    expect(r[3].x + r[3].width).toBeCloseTo(580);
    expect(cellRects(600, 800, 2, 2, 290, 10)).toBeNull();
    expect(cellRects(600, 800, 3, 3, 0, 300)).toBeNull();
  });
});

describe('piano dei fogli', () => {
  it('n-up per righe e per colonne, con celle vuote in fondo', () => {
    expect(planSheets(5, opts({ perSheet: 4, orientation: 'portrait' }))).toEqual([[0, 1, 2, 3], [4, null, null, null]]);
    expect(planSheets(4, opts({ perSheet: 4, order: 'cols' }))).toEqual([[0, 2, 1, 3]]);
    expect(planSheets(6, opts({ perSheet: 6, order: 'cols', orientation: 'landscape' }))).toEqual([[0, 2, 4, 1, 3, 5]]);
    expect(planSheets(0, opts({}))).toEqual([]);
  });
  it('libretto da 8 pagine: fronte e retro dei 4 fogli', () => {
    expect(planSheets(8, opts({ mode: 'booklet' }))).toEqual([[7, 0], [1, 6], [5, 2], [3, 4]]);
  });
  it('libretto: completa a multiplo di 4 con pagine vuote', () => {
    expect(planSheets(5, opts({ mode: 'booklet' }))).toEqual([[null, 0], [1, null], [null, 2], [3, 4]]);
    expect(planSheets(1, opts({ mode: 'booklet' }))).toEqual([[null, 0], [null, null]]);
  });
  it('libretto con rilegatura a destra scambia le facce di ogni coppia', () => {
    expect(planSheets(4, opts({ mode: 'booklet', binding: 'right' }))).toEqual([[0, 3], [2, 1]]);
  });
});

describe('posizione della pagina', () => {
  const cell = { x: 0, y: 0, width: 100, height: 100 };
  it('centra e scala senza deformare', () => {
    const p = placePage(cell, 50, 100, 0);
    expect(p.scale).toBe(1);
    expect(p.box).toEqual({ x: 25, y: 0, width: 50, height: 100 });
    expect(placePage(cell, 200, 400, 0).scale).toBe(0.25);
  });
  it('pagine ruotate: ingombro scambiato e origine corretta', () => {
    const p = placePage(cell, 50, 100, 90);
    expect(p.box).toEqual({ x: 0, y: 25, width: 100, height: 50 });
    expect([p.x, p.y, p.rotate]).toEqual([0, 75, -90]);
    const q = placePage(cell, 50, 100, 180);
    expect([q.x, q.y]).toEqual([75, 100]);
    const r = placePage(cell, 50, 100, 270);
    expect([r.x, r.y, r.rotate]).toEqual([100, 25, -270]);
    expect(placePage(cell, 50, 100, -90).rotate).toBe(-270);
  });
});

describe('creazione del PDF', () => {
  it('4 per foglio: 9 pagine diventano 3 fogli A4 in verticale', async () => {
    const r = await buildNup(await sample(9), opts({ perSheet: 4, orientation: 'portrait', border: true }));
    if (!r.ok) throw new Error('no');
    expect(r.sheets).toBe(3);
    const d = await PDFDocument.load(r.bytes);
    expect(d.getPageCount()).toBe(3);
    const s = d.getPage(0).getSize();
    expect(s.width).toBeCloseTo(595.28);
    expect(s.height).toBeCloseTo(841.89);
  });
  it('Letter in orizzontale, pagine ruotate comprese', async () => {
    const r = await buildNup(await sample(3, 90), opts({ perSheet: 2, size: 'Letter' }));
    if (!r.ok) throw new Error('no');
    expect((await PDFDocument.load(r.bytes)).getPage(0).getSize()).toEqual({ width: 792, height: 612 });
    expect(r.sheets).toBe(2);
  });
  it('libretto: 5 pagine danno 4 facciate; l\'anteprima si limita', async () => {
    const bytes = await sample(5);
    const r = await buildNup(bytes, opts({ mode: 'booklet' }));
    if (!r.ok) throw new Error('no');
    expect(r.sheets).toBe(4);
    const p = await buildNup(bytes, opts({ mode: 'booklet' }), 2);
    if (!p.ok) throw new Error('no');
    expect(p.sheets).toBe(2);
    expect(p.sheetsTotal).toBe(4);
  });
  it('errori: margini troppo grandi', async () => {
    const r = await buildNup(await sample(2), opts({ marginMm: 500 / MM }));
    expect(r).toEqual({ ok: false, error: 'margin' });
  });
});
