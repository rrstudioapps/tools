// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 rrstudio — rrstudio Tools
import { openPdf } from '../pdf-tools/pdf-thumbs';
import { ANALYSIS_SIDE, lumaOf } from './pdf-blank-pages';

/** Parte di «Rimuovi pagine vuote» che dipende dal browser (pdf.js e canvas). */

export interface PageSample {
  /** Luminosità dei pixel della pagina a bassa risoluzione. */
  luma: Uint8Array;
  width: number;
  height: number;
  /** Miniatura JPEG della stessa immagine. */
  thumb: Blob | null;
}

/** Renderizza ogni pagina a bassa risoluzione (sfondo bianco) e ne tiene i pixel e una miniatura. */
export async function samplePages(bytes: Uint8Array, onPage: (done: number, total: number) => void, cancelled: () => boolean): Promise<PageSample[]> {
  const doc = await openPdf(bytes.slice());
  const out: PageSample[] = [];
  try {
    for (let i = 1; i <= doc.numPages; i++) {
      if (cancelled()) return out;
      onPage(i - 1, doc.numPages);
      const page = await doc.getPage(i);
      try {
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: ANALYSIS_SIDE / Math.max(base.width, base.height) });
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.floor(viewport.width));
        canvas.height = Math.max(1, Math.floor(viewport.height));
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) throw new Error('canvas');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvas, viewport }).promise;
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        const thumb = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.7));
        out.push({ luma: lumaOf(data, canvas.width * canvas.height), width: canvas.width, height: canvas.height, thumb });
        canvas.width = canvas.height = 0;
      } finally {
        page.cleanup();
      }
    }
    onPage(doc.numPages, doc.numPages);
  } finally {
    void doc.loadingTask.destroy();
  }
  return out;
}
