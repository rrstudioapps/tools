// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 rrstudio — rrstudio Tools
import { PRODUCER, openForEdit } from '../pdf-common/pdf-file';

/** Logica pura di «Rimuovi pagine vuote»: misura dell'inchiostro su pixel a bassa risoluzione e riscrittura del PDF. */

/** Un pixel con luminosità sotto questo valore (0-255) conta come «scuro» (inchiostro). */
export const DARK_LUMA = 180;
/** Numero massimo di pagine analizzate (per non bloccare il browser). */
export const MAX_PAGES = 300;
/** Lato lungo (px) con cui si renderizza ogni pagina per l'analisi. */
export const ANALYSIS_SIDE = 360;

export interface InkOptions {
  /** Margine ignorato su ogni lato, in percentuale (0-25): bordi neri e ombre di scansione. */
  margin: number;
  /** Rumore: un pixel scuro conta solo se ha almeno tanti vicini scuri (su 8). 0 = nessun filtro. */
  minNeighbors: number;
}

/** Luminosità (0-255) di ogni pixel RGBA; la trasparenza si compone su bianco. */
export function lumaOf(rgba: ArrayLike<number>, pixels: number): Uint8Array {
  const out = new Uint8Array(pixels);
  for (let i = 0, k = 0; i < pixels; i++, k += 4) {
    const a = rgba[k + 3] / 255;
    const y = 0.299 * rgba[k] + 0.587 * rgba[k + 1] + 0.114 * rgba[k + 2];
    out[i] = Math.round(y * a + 255 * (1 - a));
  }
  return out;
}

/** Frazione (0-1) di pixel scuri nell'area interna ai margini, dopo il filtro del rumore. */
export function inkFractionLuma(luma: Uint8Array, width: number, height: number, opts: InkOptions): number {
  if (luma.length !== width * height) throw new RangeError('size');
  const m = Math.max(0, Math.min(25, opts.margin)) / 100;
  const x0 = Math.floor(width * m);
  const y0 = Math.floor(height * m);
  const x1 = width - x0;
  const y1 = height - y0;
  if (x1 <= x0 || y1 <= y0) return 0;
  const need = Math.max(0, Math.min(8, Math.floor(opts.minNeighbors)));
  const dark = (x: number, y: number): boolean => luma[y * width + x] < DARK_LUMA;
  let ink = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      if (!dark(x, y)) continue;
      if (need > 0) {
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if ((dx || dy) && x + dx >= x0 && x + dx < x1 && y + dy >= y0 && y + dy < y1 && dark(x + dx, y + dy)) n++;
          }
        }
        if (n < need) continue;
      }
      ink++;
    }
  }
  return ink / ((x1 - x0) * (y1 - y0));
}

/** Come {@link inkFractionLuma}, partendo dai pixel RGBA di un canvas. */
export function inkFraction(rgba: ArrayLike<number>, width: number, height: number, opts: InkOptions): number {
  return inkFractionLuma(lumaOf(rgba, width * height), width, height, opts);
}

/** La pagina è vuota se l'inchiostro non supera la soglia (in percentuale della pagina). */
export const isBlank = (ink: number, thresholdPct: number): boolean => ink * 100 <= thresholdPct;

/** Elenco compatto dei numeri di pagina (da 1): «2, 5-7». */
export function formatPageList(pages: readonly number[]): string {
  const s = [...new Set(pages)].sort((a, b) => a - b);
  const parts: string[] = [];
  for (let i = 0; i < s.length; ) {
    let j = i;
    while (j + 1 < s.length && s[j + 1] === s[j] + 1) j++;
    parts.push(j > i ? `${s[i]}-${s[j]}` : String(s[i]));
    i = j + 1;
  }
  return parts.join(', ');
}

export type RemoveResult = { ok: true; bytes: Uint8Array } | { ok: false; error: 'none' | 'all' | 'range' };

/** Crea un PDF senza le pagine indicate (indici da 0), copiando le altre con pdf-lib. */
export async function removePages(bytes: Uint8Array, remove: readonly number[]): Promise<RemoveResult> {
  const src = await openForEdit(bytes);
  const total = src.getPageCount();
  const drop = new Set(remove);
  if ([...drop].some((i) => !Number.isInteger(i) || i < 0 || i >= total)) return { ok: false, error: 'range' };
  if (drop.size === 0) return { ok: false, error: 'none' };
  const keep = Array.from({ length: total }, (_, i) => i).filter((i) => !drop.has(i));
  if (keep.length === 0) return { ok: false, error: 'all' };
  const { PDFDocument } = await import('pdf-lib');
  const out = await PDFDocument.create();
  for (const p of await out.copyPages(src, keep)) out.addPage(p);
  out.setProducer(PRODUCER);
  out.setCreator(PRODUCER);
  return { ok: true, bytes: await out.save({ useObjectStreams: true }) };
}
