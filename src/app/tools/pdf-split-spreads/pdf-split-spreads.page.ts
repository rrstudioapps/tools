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
import { openPdf, renderThumb } from '../pdf-tools/pdf-thumbs';
import { CUT_MAX, CUT_MIN, Layout, Order, excludedPages, splitSpreads } from './pdf-split-spreads';
import { PDF_SPLIT_SPREADS_DICTIONARIES } from './pdf-split-spreads.i18n';

@Component({
  selector: 'app-pdf-split-spreads',
  imports: [Icon, PrivacyNote, PdfSource, Segmented],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pdf-split-spreads.page.html',
  styleUrl: './pdf-split-spreads.page.scss',
})
export class PdfSplitSpreadsPage {
  protected readonly i18n = inject(I18nService);
  protected readonly cutMin = CUT_MIN;
  protected readonly cutMax = CUT_MAX;
  protected readonly pdf = signal<LoadedPdf | null>(null);
  protected readonly layout = signal<Layout>('side');
  protected readonly cut = signal(50);
  protected readonly order = signal<Order>('normal');
  protected readonly exclude = signal('');
  protected readonly previewPage = signal(1);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly done = signal('');
  protected readonly thumb = signal<string | null>(null);
  private doc: PDFDocumentProxy | null = null;
  /** Evita che una miniatura lenta sovrascriva una più recente. */
  private thumbToken = 0;

  protected readonly layouts = computed<SegmentOption<Layout>[]>(() => [
    { value: 'side', label: this.i18n.t('psp.layout.side') },
    { value: 'stacked', label: this.i18n.t('psp.layout.stacked') },
  ]);
  protected readonly orders = computed<SegmentOption<Order>[]>(() => [
    { value: 'normal', label: this.i18n.t(this.layout() === 'side' ? 'psp.order.ltr' : 'psp.order.ttb') },
    { value: 'reverse', label: this.i18n.t(this.layout() === 'side' ? 'psp.order.rtl' : 'psp.order.btt') },
  ]);
  /** La pagina mostrata nell'anteprima è tra quelle escluse (non verrà divisa)? */
  protected readonly previewExcluded = computed(() => {
    const p = this.pdf();
    if (!p) return false;
    const ex = excludedPages(this.exclude(), p.pages);
    return ex.ok && ex.set.has(this.previewPage() - 1);
  });
  /** Quante pagine avrà il risultato (null se l'elenco delle escluse non è valido). */
  protected readonly outPages = computed(() => {
    const p = this.pdf();
    if (!p) return null;
    const ex = excludedPages(this.exclude(), p.pages);
    return ex.ok ? { total: 2 * p.pages - ex.set.size, split: p.pages - ex.set.size } : null;
  });
  /** Linea di taglio e numero delle due metà nell'anteprima, in percentuale (della pagina mostrata). */
  protected readonly badges = computed(() => {
    const c = this.cut();
    const rev = this.order() === 'reverse';
    const [a, b] = rev ? [2, 1] : [1, 2];
    // metà «prima» e «seconda» nello spazio della pagina: sinistra/destra oppure alto/basso
    return this.layout() === 'side'
      ? { first: { left: c / 2, top: 50, n: a }, second: { left: c + (100 - c) / 2, top: 50, n: b } }
      : { first: { left: 50, top: c / 2, n: a }, second: { left: 50, top: c + (100 - c) / 2, n: b } };
  });

  constructor() {
    this.i18n.register(PDF_SPLIT_SPREADS_DICTIONARIES);
    inject(DestroyRef).onDestroy(() => this.dropDoc());
  }

  private dropDoc(): void {
    this.thumbToken++;
    void this.doc?.loadingTask.destroy();
    this.doc = null;
    const url = this.thumb();
    if (url) URL.revokeObjectURL(url);
    this.thumb.set(null);
  }

  protected async onLoaded(p: LoadedPdf): Promise<void> {
    this.dropDoc();
    this.pdf.set(p);
    this.previewPage.set(1);
    this.error.set('');
    this.done.set('');
    try {
      this.doc = await openPdf(p.bytes.slice());
      // pagina più larga che alta: probabilmente due pagine affiancate, altrimenti una sopra l'altra
      const vp = (await this.doc.getPage(1)).getViewport({ scale: 1 });
      this.layout.set(vp.width >= vp.height ? 'side' : 'stacked');
      await this.showThumb();
    } catch {
      /* l'anteprima è facoltativa */
    }
  }

  protected onCleared(): void {
    this.dropDoc();
    this.pdf.set(null);
    this.done.set('');
  }

  protected setPreviewPage(e: Event): void {
    const p = this.pdf();
    if (!p) return;
    const n = Math.round(Number((e.target as HTMLInputElement).value));
    this.previewPage.set(Number.isFinite(n) ? Math.min(p.pages, Math.max(1, n)) : 1);
    void this.showThumb();
  }

  private async showThumb(): Promise<void> {
    const doc = this.doc;
    if (!doc) return;
    const token = ++this.thumbToken;
    const blob = await renderThumb(doc, this.previewPage() - 1);
    if (!blob || token !== this.thumbToken) return;
    const old = this.thumb();
    if (old) URL.revokeObjectURL(old);
    this.thumb.set(URL.createObjectURL(blob));
  }

  /** Il taglio si imposta sia dal cursore sia dal campo numerico. */
  protected setCut(e: Event): void {
    this.done.set('');
    const v = Number((e.target as HTMLInputElement).value);
    this.cut.set(Number.isFinite(v) ? v : 50);
  }

  protected async go(): Promise<void> {
    const p = this.pdf();
    if (!p) return;
    this.busy.set(true);
    this.error.set('');
    this.done.set('');
    try {
      const r = await splitSpreads(p.bytes, { layout: this.layout(), cut: this.cut(), order: this.order(), exclude: this.exclude() });
      if (!r.ok) {
        const e = r.error;
        this.error.set(e.code === 'range' ? this.i18n.t('psp.err.range', { token: e.error.token, total: e.error.total }) : this.i18n.t('psp.err.cut', { min: CUT_MIN, max: CUT_MAX }));
        return;
      }
      downloadPdf(r.bytes, p.base, 'diviso');
      this.done.set(this.i18n.t('psp.done', { name: `${p.base}-diviso.pdf`, pages: r.pages, split: r.split, size: formatBytes(r.bytes.length, this.i18n.locale()) }));
    } catch {
      this.error.set(this.i18n.t('pc.err.build'));
    } finally {
      this.busy.set(false);
    }
  }
}
