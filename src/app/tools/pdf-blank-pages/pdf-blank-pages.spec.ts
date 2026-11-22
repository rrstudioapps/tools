// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 rrstudio — rrstudio Tools
import { PDFDocument } from 'pdf-lib';
import { DARK_LUMA, formatPageList, inkFraction, inkFractionLuma, isBlank, lumaOf, removePages } from './pdf-blank-pages';

const W = 100;
const H = 100;
/** Immagine RGBA bianca, con una funzione che può scurire singoli pixel. */
function image(paint?: (set: (x: number, y: number, v?: number, a?: number) => void) => void): Uint8ClampedArray {
  const d = new Uint8ClampedArray(W * H * 4).fill(255);
  paint?.((x, y, v = 0, a = 255) => {
    const k = (y * W + x) * 4;
    d[k] = d[k + 1] = d[k + 2] = v;
    d[k + 3] = a;
  });
  return d;
}
const none = { margin: 0, minNeighbors: 0 };

describe('frazione di inchiostro', () => {
  it('una pagina bianca ha zero inchiostro', () => {
    expect(inkFraction(image(), W, H, none)).toBe(0);
  });
  it('misura la frazione di pixel scuri', () => {
    const img = image((s) => {
      for (let y = 0; y < 10; y++) for (let x = 0; x < 100; x++) s(x, y);
    });
    expect(inkFraction(img, W, H, none)).toBeCloseTo(0.1, 10);
  });
  it('i grigi chiari (carta ingiallita, ombre leggere) non contano', () => {
    const img = image((s) => {
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) s(x, y, DARK_LUMA + 10);
    });
    expect(inkFraction(img, W, H, none)).toBe(0);
  });
  it('un pixel trasparente vale bianco', () => {
    const img = image((s) => {
      for (let x = 0; x < W; x++) s(x, 50, 0, 0);
    });
    expect(inkFraction(img, W, H, none)).toBe(0);
    expect(lumaOf(img, W * H)[50 * W + 3]).toBe(255);
  });
  it('ignora il margine (bordo nero di scansione)', () => {
    const img = image((s) => {
      for (let i = 0; i < 100; i++) {
        s(i, 0);
        s(i, 99);
        s(0, i);
        s(99, i);
      }
    });
    expect(inkFraction(img, W, H, none)).toBeGreaterThan(0.03);
    expect(inkFraction(img, W, H, { margin: 3, minNeighbors: 0 })).toBe(0);
  });
  it('con il margine il contenuto interno resta contato', () => {
    const img = image((s) => {
      for (let y = 40; y < 60; y++) for (let x = 40; x < 60; x++) s(x, y);
    });
    expect(inkFraction(img, W, H, { margin: 10, minNeighbors: 0 })).toBeCloseTo(400 / 6400, 10);
  });
  it('il filtro del rumore toglie i puntini isolati ma non i blocchi', () => {
    const dots = image((s) => {
      s(20, 20);
      s(60, 30);
      s(80, 80);
    });
    expect(inkFraction(dots, W, H, none)).toBeCloseTo(0.0003, 10);
    expect(inkFraction(dots, W, H, { margin: 0, minNeighbors: 1 })).toBe(0);
    const block = image((s) => {
      for (let y = 40; y < 45; y++) for (let x = 40; x < 45; x++) s(x, y);
    });
    expect(inkFraction(block, W, H, { margin: 0, minNeighbors: 1 })).toBeCloseTo(25 / 10000, 10);
  });
  it('margini enormi o dimensioni sbagliate', () => {
    expect(inkFraction(image(), W, H, { margin: 80, minNeighbors: 0 })).toBe(0);
    expect(() => inkFractionLuma(new Uint8Array(5), W, H, none)).toThrow();
  });
});

describe('soglia e elenco', () => {
  it('isBlank confronta in percentuale', () => {
    expect(isBlank(0.0005, 0.1)).toBe(true);
    expect(isBlank(0.001, 0.1)).toBe(true);
    expect(isBlank(0.002, 0.1)).toBe(false);
    expect(isBlank(0, 0)).toBe(true);
  });
  it('formatPageList raggruppa gli intervalli', () => {
    expect(formatPageList([7, 2, 5, 6, 2])).toBe('2, 5-7');
    expect(formatPageList([])).toBe('');
    expect(formatPageList([1, 2, 3])).toBe('1-3');
  });
});

describe('rimozione delle pagine', () => {
  async function sample(n: number): Promise<Uint8Array> {
    const doc = await PDFDocument.create();
    for (let i = 0; i < n; i++) doc.addPage([100 + i, 200]);
    return doc.save();
  }
  it('toglie le pagine indicate e tiene le altre in ordine', async () => {
    const r = await removePages(await sample(5), [1, 3]);
    if (!r.ok) throw new Error('no');
    const doc = await PDFDocument.load(r.bytes);
    expect(doc.getPages().map((p) => p.getWidth())).toEqual([100, 102, 104]);
  });
  it('errori: nessuna pagina, tutte, fuori intervallo', async () => {
    const b = await sample(2);
    expect(await removePages(b, [])).toEqual({ ok: false, error: 'none' });
    expect(await removePages(b, [0, 1])).toEqual({ ok: false, error: 'all' });
    expect(await removePages(b, [2])).toEqual({ ok: false, error: 'range' });
    expect(await removePages(b, [-1])).toEqual({ ok: false, error: 'range' });
  });
});
