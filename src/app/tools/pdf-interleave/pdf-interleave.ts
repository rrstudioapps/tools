// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 rrstudio — rrstudio Tools
import { openForEdit, PRODUCER } from '../pdf-common/pdf-file';

/**
 * Unisce due PDF (fronti e retri di una scansione) in uno solo con le pagine alternate: F1, R1, F2, R2…
 * Con «retri in ordine inverso» si gestisce lo scanner con alimentatore che prima scansiona tutti i fronti
 * e poi i retri a partire dall'ultimo foglio.
 */

/** Cosa fare se i due file hanno un numero diverso di pagine. */
export type ExtraMode = 'ignore' | 'pad';
export type Side = 'front' | 'back';

export interface InterleaveOptions {
  reverseBacks: boolean;
  extra: ExtraMode;
}

/** Una pagina del risultato: presa da un file oppure vuota (della misura della pagina `like`). */
export type Slot = { kind: Side; index: number } | { kind: 'blank'; like: { kind: Side; index: number } };

/** Ordine finale delle pagine, senza toccare i file. */
export function interleavePlan(frontCount: number, backCount: number, o: InterleaveOptions): Slot[] {
  const backs = Array.from({ length: backCount }, (_, i) => (o.reverseBacks ? backCount - 1 - i : i));
  const n = o.extra === 'ignore' ? Math.min(frontCount, backCount) : Math.max(frontCount, backCount);
  const out: Slot[] = [];
  for (let k = 0; k < n; k++) {
    const f = k < frontCount ? { kind: 'front' as const, index: k } : null;
    const b = k < backCount ? { kind: 'back' as const, index: backs[k] } : null;
    // se manca una delle due, la pagina vuota ha la misura dell'altra
    if (f) out.push(f);
    else if (b) out.push({ kind: 'blank', like: b });
    if (b) out.push(b);
    else if (f) out.push({ kind: 'blank', like: f });
  }
  return out;
}

export type InterleaveResult = { ok: true; bytes: Uint8Array; pages: number } | { ok: false; error: 'empty' };

export async function interleavePdfs(frontBytes: Uint8Array, backBytes: Uint8Array, o: InterleaveOptions): Promise<InterleaveResult> {
  const [fd, bd] = await Promise.all([openForEdit(frontBytes), openForEdit(backBytes)]);
  const plan = interleavePlan(fd.getPageCount(), bd.getPageCount(), o);
  if (plan.length === 0) return { ok: false, error: 'empty' };
  const { PDFDocument } = await import('pdf-lib');
  const out = await PDFDocument.create();
  const used = (side: Side): number[] => {
    const set = new Set<number>();
    for (const s of plan) if (s.kind === side) set.add(s.index);
    return [...set].sort((a, b) => a - b);
  };
  const copied = new Map<string, import('pdf-lib').PDFPage>();
  for (const [side, doc] of [['front', fd], ['back', bd]] as const) {
    const idx = used(side);
    const pages = await out.copyPages(doc, idx);
    idx.forEach((i, k) => copied.set(side + i, pages[k]));
  }
  for (const s of plan) {
    if (s.kind !== 'blank') {
      out.addPage(copied.get(s.kind + s.index));
      continue;
    }
    const like = (s.like.kind === 'front' ? fd : bd).getPage(s.like.index);
    const box = like.getMediaBox();
    const blank = out.addPage([box.width, box.height]);
    const rot = like.getRotation();
    if (rot.angle) blank.setRotation(rot);
  }
  out.setProducer(PRODUCER);
  out.setCreator(PRODUCER);
  const title = fd.getTitle();
  if (title) out.setTitle(title);
  return { ok: true, bytes: await out.save({ useObjectStreams: true }), pages: plan.length };
}
