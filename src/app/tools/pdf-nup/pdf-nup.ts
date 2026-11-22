// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 rrstudio — rrstudio tools
import { degrees } from 'pdf-lib';
import { openForEdit, PRODUCER } from '../pdf-common/pdf-file';

/**
 * Più pagine per foglio (2, 4, 6, 9) e libretto (fronte-retro, da piegare a metà).
 * Le pagine di origine vengono incorporate con `embedPage` (il contenuto resta vettoriale) e disposte in una griglia.
 * Le pagine ruotate (/Rotate) vengono messe dritte; i link e i campi di modulo non si conservano.
 */

export const MM = 72 / 25.4;
export const SHEETS = { A4: [595.28, 841.89], Letter: [612, 792] } as const;
export type SheetName = keyof typeof SHEETS;
export type PerSheet = 2 | 4 | 6 | 9;
export type Orientation = 'portrait' | 'landscape';
export type ReadOrder = 'rows' | 'cols';
export type Binding = 'left' | 'right';
export const PER_SHEET: readonly PerSheet[] = [2, 4, 6, 9];
/** Oltre questo numero di pagine lo strumento rifiuta il file (per non bloccare il browser). */
export const MAX_PAGES = 1000;
/** Lato minimo (in punti) di una cella, sotto il quale la pagina non sarebbe leggibile. */
const MIN_CELL = 20;

export interface NupOptions {
  mode: 'nup' | 'booklet';
  perSheet: PerSheet;
  size: SheetName;
  orientation: Orientation;
  /** Margine esterno e distanza tra le pagine, in millimetri. */
  marginMm: number;
  gapMm: number;
  border: boolean;
  order: ReadOrder;
  /** Solo libretto: rilegatura a sinistra (testo da sinistra a destra) o a destra (arabo, ebraico, giapponese verticale). */
  binding: Binding;
}

export const DEFAULTS: NupOptions = {
  mode: 'nup',
  perSheet: 2,
  size: 'A4',
  orientation: 'landscape',
  marginMm: 10,
  gapMm: 5,
  border: false,
  order: 'rows',
  binding: 'left',
};

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Colonne e righe: sul foglio in orizzontale le colonne sono più delle righe e viceversa. */
export function gridFor(n: PerSheet, orientation: Orientation): { cols: number; rows: number } {
  const base = { 2: [2, 1], 4: [2, 2], 6: [3, 2], 9: [3, 3] }[n];
  const [a, b] = base;
  return orientation === 'landscape' ? { cols: a, rows: b } : { cols: b, rows: a };
}

/** Misure del foglio in punti, già girate secondo l'orientamento. */
export function sheetSize(size: SheetName, orientation: Orientation): { width: number; height: number } {
  const [w, h] = SHEETS[size];
  return orientation === 'landscape' ? { width: h, height: w } : { width: w, height: h };
}

/** Il libretto è sempre 2 pagine per foglio, in orizzontale. */
export function layoutOf(o: NupOptions): { cols: number; rows: number; width: number; height: number } {
  const per: PerSheet = o.mode === 'booklet' ? 2 : o.perSheet;
  const orientation: Orientation = o.mode === 'booklet' ? 'landscape' : o.orientation;
  return { ...gridFor(per, orientation), ...sheetSize(o.size, orientation) };
}

/** Celle (origine in basso a sinistra) in ordine riga per riga dall'alto; null se i margini non lasciano spazio. */
export function cellRects(width: number, height: number, cols: number, rows: number, margin: number, gap: number): Rect[] | null {
  const cw = (width - 2 * margin - (cols - 1) * gap) / cols;
  const ch = (height - 2 * margin - (rows - 1) * gap) / rows;
  if (!(cw >= MIN_CELL) || !(ch >= MIN_CELL)) return null;
  const out: Rect[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) out.push({ x: margin + c * (cw + gap), y: height - margin - (r + 1) * ch - r * gap, width: cw, height: ch });
  }
  return out;
}

/**
 * Piano dei fogli: per ogni facciata, l'indice (da 0) della pagina di origine in ciascuna cella (riga per riga), o null se vuota.
 * Libretto: il totale è portato a un multiplo di 4 con pagine vuote; per ogni foglio fisico c'è un fronte [ultima, prima] e un retro [seconda, penultima].
 */
export function planSheets(total: number, o: NupOptions): (number | null)[][] {
  const page = (i: number): number | null => (i >= 0 && i < total ? i : null);
  if (total <= 0) return [];
  if (o.mode === 'booklet') {
    const n = Math.ceil(total / 4) * 4;
    const out: (number | null)[][] = [];
    for (let k = 0; k < n / 4; k++) {
      const front = [page(n - 1 - 2 * k), page(2 * k)];
      const back = [page(2 * k + 1), page(n - 2 - 2 * k)];
      out.push(o.binding === 'right' ? front.reverse() : front, o.binding === 'right' ? back.reverse() : back);
    }
    return out;
  }
  const { cols, rows } = gridFor(o.perSheet, o.orientation);
  const out: (number | null)[][] = [];
  for (let s = 0; s < Math.ceil(total / o.perSheet); s++) {
    const cells: (number | null)[] = new Array<number | null>(o.perSheet).fill(null);
    for (let p = 0; p < o.perSheet; p++) {
      const idx = o.order === 'rows' ? p : (p % rows) * cols + Math.floor(p / rows);
      cells[idx] = page(s * o.perSheet + p);
    }
    out.push(cells);
  }
  return out;
}

export interface Placement {
  /** Origine del contenuto incorporato, scala e rotazione (gradi antiorari) da passare a `drawPage`. */
  x: number;
  y: number;
  scale: number;
  rotate: number;
  /** Rettangolo visibile della pagina sul foglio (per il bordo). */
  box: Rect;
}

/** Mette una pagina di misure grezze `w`×`h` (rotazione `rotation`, multipla di 90 in senso orario) al centro di una cella, in scala. */
export function placePage(cell: Rect, w: number, h: number, rotation: number): Placement {
  const rot = ((Math.round(rotation / 90) * 90) % 360 + 360) % 360;
  const swap = rot === 90 || rot === 270;
  const vw = swap ? h : w;
  const vh = swap ? w : h;
  const scale = Math.min(cell.width / vw, cell.height / vh);
  const box = { x: cell.x + (cell.width - scale * vw) / 2, y: cell.y + (cell.height - scale * vh) / 2, width: scale * vw, height: scale * vh };
  const origin = {
    0: [box.x, box.y],
    90: [box.x, box.y + scale * w],
    180: [box.x + scale * w, box.y + scale * h],
    270: [box.x + scale * h, box.y],
  }[rot as 0 | 90 | 180 | 270];
  return { x: origin[0], y: origin[1], scale, rotate: -rot, box };
}

export type NupError = 'noPages' | 'tooMany' | 'margin';
export type NupResult = { ok: true; bytes: Uint8Array; sheets: number; sheetsTotal: number } | { ok: false; error: NupError };

/** Crea il PDF. `maxSheets` limita le facciate prodotte (per l'anteprima). */
export async function buildNup(bytes: Uint8Array, o: NupOptions, maxSheets = Infinity): Promise<NupResult> {
  const src = await openForEdit(bytes);
  const total = src.getPageCount();
  if (total === 0) return { ok: false, error: 'noPages' };
  if (total > MAX_PAGES) return { ok: false, error: 'tooMany' };
  const lay = layoutOf(o);
  const cells = cellRects(lay.width, lay.height, lay.cols, lay.rows, Math.max(0, o.marginMm) * MM, Math.max(0, o.gapMm) * MM);
  if (!cells) return { ok: false, error: 'margin' };
  const plan = planSheets(total, o);

  const { PDFDocument, rgb } = await import('pdf-lib');
  const out = await PDFDocument.create();
  out.setProducer(PRODUCER);
  out.setCreator(PRODUCER);
  const embedded = new Map<number, Awaited<ReturnType<typeof out.embedPage>>>();
  const pageOf = async (i: number) => {
    let e = embedded.get(i);
    if (!e) {
      const p = src.getPage(i);
      const b = p.getCropBox();
      e = await out.embedPage(p, { left: b.x, bottom: b.y, right: b.x + b.width, top: b.y + b.height });
      embedded.set(i, e);
    }
    return e;
  };

  const used = plan.slice(0, maxSheets);
  for (const sheet of used) {
    const page = out.addPage([lay.width, lay.height]);
    for (let c = 0; c < cells.length; c++) {
      const idx = sheet[c];
      if (idx === null || idx === undefined) continue;
      const e = await pageOf(idx);
      const pl = placePage(cells[c], e.width, e.height, src.getPage(idx).getRotation().angle);
      page.drawPage(e, { x: pl.x, y: pl.y, xScale: pl.scale, yScale: pl.scale, rotate: degrees(pl.rotate) });
      if (o.border) page.drawRectangle({ ...pl.box, borderColor: rgb(0.45, 0.45, 0.45), borderWidth: 0.5 });
    }
  }
  return { ok: true, bytes: await out.save({ useObjectStreams: true }), sheets: used.length, sheetsTotal: plan.length };
}
