// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 rrstudio — rrstudio Tools
import { openForEdit, PRODUCER } from '../pdf-common/pdf-file';
import { parseRanges, rangePages, type RangeError } from '../pdf-tools/page-ranges';

/**
 * Divide le pagine doppie (due pagine affiancate o una sopra l'altra su un solo foglio) in due pagine.
 * Ogni metà è la pagina originale con MediaBox e CropBox ridotti: il contenuto resta vettoriale, il testo
 * selezionabile e i link restano; i dati della pagina sono condivisi tra le due metà (il file non raddoppia).
 * Il contenuto fuori dal riquadro resta nel file ma non si vede.
 */

export type Layout = 'side' | 'stacked';
/** `normal`: prima la metà sinistra (o alta); `reverse`: prima la destra (o bassa), per manga e libri arabi. */
export type Order = 'normal' | 'reverse';

export interface SplitOptions {
  layout: Layout;
  /** Posizione della linea di taglio in percentuale (da sinistra, o dall'alto): da 5 a 95. */
  cut: number;
  order: Order;
  /** Pagine da NON dividere, es. "1, 12": vuoto = si dividono tutte. */
  exclude: string;
}

export const CUT_MIN = 5;
export const CUT_MAX = 95;

export type SplitError = { code: 'range'; error: RangeError } | { code: 'cut' };
export type SplitResult = { ok: true; bytes: Uint8Array; pages: number; split: number } | { ok: false; error: SplitError };

/** Rettangolo con origine in basso a sinistra, nello spazio visibile (dopo la rotazione). */
export interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Le due metà della pagina visibile `w` x `h`, nell'ordine in cui finiranno nel file. */
export function halves(w: number, h: number, o: Pick<SplitOptions, 'layout' | 'cut' | 'order'>): [Rect, Rect] {
  const c = o.cut / 100;
  const pair: [Rect, Rect] =
    o.layout === 'side'
      ? [{ x0: 0, y0: 0, x1: w * c, y1: h }, { x0: w * c, y0: 0, x1: w, y1: h }]
      : [{ x0: 0, y0: h * (1 - c), x1: w, y1: h }, { x0: 0, y0: 0, x1: w, y1: h * (1 - c) }];
  return o.order === 'reverse' ? [pair[1], pair[0]] : pair;
}

/**
 * Porta un rettangolo dello spazio visibile sulla pagina «vera» (non ruotata) di dimensioni `w` x `h`,
 * sapendo che la pagina viene mostrata ruotata di `rotation` gradi in senso orario. Origine in basso a sinistra.
 */
export function visualToRaw(rotation: number, w: number, h: number, r: Rect): Rect {
  switch (((rotation % 360) + 360) % 360) {
    case 90: return { x0: w - r.y1, x1: w - r.y0, y0: r.x0, y1: r.x1 };
    case 180: return { x0: w - r.x1, x1: w - r.x0, y0: h - r.y1, y1: h - r.y0 };
    case 270: return { x0: r.y0, x1: r.y1, y0: h - r.x1, y1: h - r.x0 };
    default: return r;
  }
}

/** Pagine (indici da 0) escluse dalla divisione. */
export function excludedPages(text: string, total: number): { ok: true; set: Set<number> } | { ok: false; error: RangeError } {
  if (text.trim() === '') return { ok: true, set: new Set() };
  const r = parseRanges(text, total);
  if (!r.ok) return { ok: false, error: r.error };
  return { ok: true, set: new Set(r.ranges.flatMap(rangePages).map((p) => p - 1)) };
}

export async function splitSpreads(bytes: Uint8Array, o: SplitOptions): Promise<SplitResult> {
  if (!(o.cut >= CUT_MIN && o.cut <= CUT_MAX)) return { ok: false, error: { code: 'cut' } };
  const doc = await openForEdit(bytes);
  const total = doc.getPageCount();
  const ex = excludedPages(o.exclude, total);
  if (!ex.ok) return { ok: false, error: { code: 'range', error: ex.error } };

  // una sola copia con gli indici ripetuti: le due metà condividono contenuto e risorse
  const indices: number[] = [];
  for (let i = 0; i < total; i++) indices.push(...(ex.set.has(i) ? [i] : [i, i]));
  const { PDFDocument } = await import('pdf-lib');
  const out = await PDFDocument.create();
  const copies = await out.copyPages(doc, indices);

  let k = 0;
  for (let i = 0; i < total; i++) {
    if (ex.set.has(i)) {
      out.addPage(copies[k++]);
      continue;
    }
    const rot = doc.getPage(i).getRotation().angle;
    const b = copies[k].getCropBox();
    const swap = rot % 180 !== 0;
    const parts = halves(swap ? b.height : b.width, swap ? b.width : b.height, o);
    for (const part of parts) {
      const raw = visualToRaw(rot, b.width, b.height, part);
      const page = copies[k++];
      const x = b.x + raw.x0;
      const y = b.y + raw.y0;
      page.setMediaBox(x, y, raw.x1 - raw.x0, raw.y1 - raw.y0);
      page.setCropBox(x, y, raw.x1 - raw.x0, raw.y1 - raw.y0);
      out.addPage(page);
    }
  }
  out.setProducer(PRODUCER);
  out.setCreator(PRODUCER);
  const title = doc.getTitle();
  if (title) out.setTitle(title);
  return { ok: true, bytes: await out.save({ useObjectStreams: true }), pages: indices.length, split: total - ex.set.size };
}
