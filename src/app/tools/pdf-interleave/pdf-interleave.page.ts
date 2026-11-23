// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 rrstudio — rrstudio Tools
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { I18nService } from '../../core/i18n/i18n.service';
import { Icon } from '../../shared/icon';
import { PrivacyNote } from '../../shared/privacy-note';
import { Segmented, SegmentOption } from '../../shared/segmented';
import { formatBytes } from '../../shared/text-stats';
import { LoadedPdf, downloadPdf } from '../pdf-common/pdf-file';
import { PdfSource } from '../pdf-common/pdf-source';
import { LazyVisible } from '../pdf-tools/lazy-visible';
import { openPdf, renderThumb } from '../pdf-tools/pdf-thumbs';
import { ExtraMode, Side, Slot, interleavePdfs, interleavePlan } from './pdf-interleave';
import { PDF_INTERLEAVE_DICTIONARIES } from './pdf-interleave.i18n';

/** Quante pagine del risultato si mostrano nell'anteprima. */
const PREVIEW_MAX = 60;

interface Card {
  key: string;
  /** Posizione nel risultato (da 1). */
  pos: number;
  label: string;
  /** Chiave della miniatura (null: pagina vuota). */
  thumb: string | null;
  side: Side | null;
  index: number;
}

@Component({
  selector: 'app-pdf-interleave',
  imports: [Icon, PrivacyNote, PdfSource, Segmented, LazyVisible],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pdf-interleave.page.html',
  styleUrl: './pdf-interleave.page.scss',
})
export class PdfInterleavePage {
  protected readonly i18n = inject(I18nService);
  protected readonly front = signal<LoadedPdf | null>(null);
  protected readonly back = signal<LoadedPdf | null>(null);
  protected readonly reverse = signal(false);
  protected readonly extra = signal<ExtraMode>('pad');
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly done = signal('');
  /** Miniature già disegnate (chiave `front<i>` / `back<i>`, indice da 0). */
  protected readonly thumbs = signal<Record<string, string>>({});
  private docs: Record<Side, PDFDocumentProxy | null> = { front: null, back: null };
  private readonly pending = new Set<string>();

  protected readonly extraOptions = computed<SegmentOption<ExtraMode>[]>(() => [
    { value: 'pad', label: this.i18n.t('pil.extra.pad') },
    { value: 'ignore', label: this.i18n.t('pil.extra.ignore') },
  ]);
  protected readonly counts = computed(() => ({ front: this.front()?.pages ?? 0, back: this.back()?.pages ?? 0 }));
  protected readonly mismatch = computed(() => this.front() !== null && this.back() !== null && this.front()!.pages !== this.back()!.pages);
  protected readonly plan = computed<Slot[]>(() => {
    const c = this.counts();
    return this.front() && this.back() ? interleavePlan(c.front, c.back, { reverseBacks: this.reverse(), extra: this.extra() }) : [];
  });
  protected readonly cards = computed<Card[]>(() =>
    this.plan()
      .slice(0, PREVIEW_MAX)
      .map((s, i) => {
        const pos = i + 1;
        if (s.kind === 'blank') return { key: 'blank' + pos, pos, label: this.i18n.t('pil.card.blank'), thumb: null, side: null, index: -1 };
        return {
          key: s.kind + s.index + '-' + pos,
          pos,
          label: this.i18n.t(s.kind === 'front' ? 'pil.card.front' : 'pil.card.back', { n: s.index + 1 }),
          thumb: s.kind + s.index,
          side: s.kind,
          index: s.index,
        };
      }),
  );
  protected readonly more = computed(() => Math.max(0, this.plan().length - PREVIEW_MAX));

  constructor() {
    this.i18n.register(PDF_INTERLEAVE_DICTIONARIES);
    inject(DestroyRef).onDestroy(() => {
      this.dropSide('front');
      this.dropSide('back');
    });
  }

  private dropSide(side: Side): void {
    void this.docs[side]?.loadingTask.destroy();
    this.docs[side] = null;
    this.thumbs.update((t) => {
      const next: Record<string, string> = {};
      for (const [k, url] of Object.entries(t)) {
        if (k.startsWith(side)) URL.revokeObjectURL(url);
        else next[k] = url;
      }
      return next;
    });
    for (const k of [...this.pending]) if (k.startsWith(side)) this.pending.delete(k);
  }

  /** Contatore per lato: un caricamento superato da uno più recente (o da «rimuovi») non deve più toccare lo stato. */
  private readonly seq: Record<Side, number> = { front: 0, back: 0 };

  protected async onLoaded(side: Side, p: LoadedPdf): Promise<void> {
    const n = ++this.seq[side];
    this.dropSide(side);
    this.error.set('');
    this.done.set('');
    // il documento si apre PRIMA di mostrare le schede: la miniatura parte quando la scheda diventa visibile e,
    // se il documento non c'è ancora, non verrebbe più ritentata
    let doc: PDFDocumentProxy | null = null;
    try {
      doc = await openPdf(p.bytes.slice());
    } catch {
      /* le miniature sono facoltative */
    }
    if (n !== this.seq[side]) {
      void doc?.loadingTask.destroy();
      return;
    }
    this.docs[side] = doc;
    (side === 'front' ? this.front : this.back).set(p);
  }

  protected onCleared(side: Side): void {
    this.seq[side]++;
    this.dropSide(side);
    (side === 'front' ? this.front : this.back).set(null);
    this.done.set('');
  }

  /** Disegna la miniatura di una pagina quando la scheda si avvicina alla zona visibile. */
  protected async loadThumb(c: Card): Promise<void> {
    if (!c.thumb || !c.side || this.thumbs()[c.thumb] || this.pending.has(c.thumb)) return;
    const doc = this.docs[c.side];
    if (!doc) return;
    this.pending.add(c.thumb);
    try {
      const blob = await renderThumb(doc, c.index);
      if (blob && this.docs[c.side] === doc) {
        const url = URL.createObjectURL(blob);
        this.thumbs.update((t) => ({ ...t, [c.thumb!]: url }));
      }
    } catch {
      /* resta il segnaposto */
    } finally {
      this.pending.delete(c.thumb);
    }
  }

  protected async go(): Promise<void> {
    const f = this.front();
    const b = this.back();
    if (!f || !b) return;
    this.busy.set(true);
    this.error.set('');
    this.done.set('');
    try {
      const r = await interleavePdfs(f.bytes, b.bytes, { reverseBacks: this.reverse(), extra: this.extra() });
      if (!r.ok) {
        this.error.set(this.i18n.t('pil.err.empty'));
        return;
      }
      downloadPdf(r.bytes, f.base, 'fronte-retro');
      this.done.set(this.i18n.t('pil.done', { name: `${f.base}-fronte-retro.pdf`, pages: r.pages, size: formatBytes(r.bytes.length, this.i18n.locale()) }));
    } catch {
      this.error.set(this.i18n.t('pc.err.build'));
    } finally {
      this.busy.set(false);
    }
  }
}
