// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 rrstudio — rrstudio tools
import { ChangeDetectionStrategy, Component, DestroyRef, WritableSignal, computed, effect, inject, signal, untracked } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { Icon } from '../../shared/icon';
import { PrivacyNote } from '../../shared/privacy-note';
import { Segmented, SegmentOption } from '../../shared/segmented';
import { formatBytes } from '../../shared/text-stats';
import { LoadedPdf, downloadPdf } from '../pdf-common/pdf-file';
import { PdfSource } from '../pdf-common/pdf-source';
import { openPdf, renderThumb } from '../pdf-tools/pdf-thumbs';
import { MAX_PAGES, NupError, NupOptions, Orientation, PER_SHEET, PerSheet, ReadOrder, SHEETS, SheetName, Binding, buildNup } from './pdf-nup';
import { PNU_DICTIONARIES } from './pdf-nup.i18n';

/** Facciate mostrate nell'anteprima. */
const PREVIEW_SHEETS = 4;

type Mode = NupOptions['mode'];

@Component({
  selector: 'app-pdf-nup',
  imports: [Icon, PrivacyNote, PdfSource, Segmented],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pdf-nup.page.html',
  styleUrl: './pdf-nup.page.scss',
})
export class PdfNupPage {
  protected readonly i18n = inject(I18nService);
  protected readonly perSheetValues = PER_SHEET;
  protected readonly sizeNames = Object.keys(SHEETS) as SheetName[];
  protected readonly pdf = signal<LoadedPdf | null>(null);
  protected readonly mode = signal<Mode>('nup');
  protected readonly perSheet = signal<PerSheet>(2);

  /** Il valore del select è una stringa: va riportato ai soli valori ammessi. */
  protected setPerSheet(value: string): void {
    const n = Number(value);
    if ((PER_SHEET as readonly number[]).includes(n)) this.perSheet.set(n as PerSheet);
  }
  protected readonly size = signal<SheetName>('A4');
  protected readonly orientation = signal<Orientation>('landscape');
  protected readonly margin = signal(10);
  protected readonly gap = signal(5);
  protected readonly border = signal(false);
  protected readonly order = signal<ReadOrder>('rows');
  protected readonly binding = signal<Binding>('left');
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly done = signal('');
  protected readonly previewBusy = signal(false);
  protected readonly previewError = signal('');
  protected readonly thumbs = signal<string[]>([]);
  protected readonly sheetsTotal = signal(0);

  protected readonly modes = computed<SegmentOption<Mode>[]>(() => [
    { value: 'nup', label: this.i18n.t('pnu.m.nup') },
    { value: 'booklet', label: this.i18n.t('pnu.m.booklet') },
  ]);
  protected readonly orientations = computed<SegmentOption<Orientation>[]>(() => [
    { value: 'portrait', label: this.i18n.t('pnu.o.portrait') },
    { value: 'landscape', label: this.i18n.t('pnu.o.landscape') },
  ]);
  protected readonly orders = computed<SegmentOption<ReadOrder>[]>(() => [
    { value: 'rows', label: this.i18n.t('pnu.r.rows') },
    { value: 'cols', label: this.i18n.t('pnu.r.cols') },
  ]);
  protected readonly bindings = computed<SegmentOption<Binding>[]>(() => [
    { value: 'left', label: this.i18n.t('pnu.b.left') },
    { value: 'right', label: this.i18n.t('pnu.b.right') },
  ]);

  private readonly options = computed<NupOptions>(() => ({
    mode: this.mode(),
    perSheet: this.perSheet(),
    size: this.size(),
    orientation: this.orientation(),
    marginMm: Math.max(0, this.margin() || 0),
    gapMm: Math.max(0, this.gap() || 0),
    border: this.border(),
    order: this.order(),
    binding: this.binding(),
  }));

  private timer: ReturnType<typeof setTimeout> | null = null;
  /** Numero progressivo dell'ultima anteprima richiesta: i risultati vecchi vengono scartati. */
  private generation = 0;

  constructor() {
    this.i18n.register(PNU_DICTIONARIES);
    // l'anteprima si rifà (con una piccola attesa) a ogni cambio di file o di impostazioni
    effect(() => {
      const p = this.pdf();
      const o = this.options();
      // il resto non deve essere tracciato: dropThumbs() legge e riscrive `thumbs`, e l'effetto si rilancerebbe all'infinito
      untracked(() => {
        this.done.set('');
        if (this.timer) clearTimeout(this.timer);
        this.generation++;
        if (!p) {
          this.dropThumbs();
          return;
        }
        const gen = this.generation;
        this.timer = setTimeout(() => void this.preview(p, o, gen), 250);
      });
    });
    inject(DestroyRef).onDestroy(() => {
      if (this.timer) clearTimeout(this.timer);
      this.generation++;
      this.dropThumbs();
    });
  }

  protected shown(): number {
    return this.thumbs().length;
  }

  private dropThumbs(): void {
    for (const u of this.thumbs()) URL.revokeObjectURL(u);
    this.thumbs.set([]);
    this.sheetsTotal.set(0);
    this.previewError.set('');
    this.previewBusy.set(false);
  }

  private errorText(e: NupError): string {
    return e === 'tooMany' ? this.i18n.t('pnu.err.tooMany', { max: MAX_PAGES }) : this.i18n.t('pnu.err.' + e);
  }

  private async preview(p: LoadedPdf, o: NupOptions, gen: number): Promise<void> {
    this.previewBusy.set(true);
    try {
      const r = await buildNup(p.bytes, o, PREVIEW_SHEETS);
      if (gen !== this.generation) return;
      if (!r.ok) {
        this.dropThumbs();
        this.previewError.set(this.errorText(r.error));
        return;
      }
      const doc = await openPdf(r.bytes);
      const urls: string[] = [];
      try {
        for (let i = 0; i < doc.numPages; i++) {
          const blob = await renderThumb(doc, i);
          if (blob) urls.push(URL.createObjectURL(blob));
        }
      } finally {
        void doc.loadingTask.destroy();
      }
      if (gen !== this.generation) {
        for (const u of urls) URL.revokeObjectURL(u);
        return;
      }
      this.dropThumbs();
      this.thumbs.set(urls);
      this.sheetsTotal.set(r.sheetsTotal);
    } catch {
      if (gen === this.generation) {
        this.dropThumbs();
        this.previewError.set(this.i18n.t('pc.err.build'));
      }
    } finally {
      if (gen === this.generation) this.previewBusy.set(false);
    }
  }

  protected onLoaded(p: LoadedPdf): void {
    this.error.set('');
    this.pdf.set(p);
  }

  protected onCleared(): void {
    this.pdf.set(null);
  }

  protected setNumber(target: WritableSignal<number>, e: Event): void {
    target.set(Number((e.target as HTMLInputElement).value));
  }

  protected async go(): Promise<void> {
    const p = this.pdf();
    if (!p) return;
    this.busy.set(true);
    this.error.set('');
    this.done.set('');
    try {
      const r = await buildNup(p.bytes, this.options());
      if (!r.ok) {
        this.error.set(this.errorText(r.error));
        return;
      }
      const suffix = this.mode() === 'booklet' ? 'libretto' : `${this.perSheet()}-per-foglio`;
      downloadPdf(r.bytes, p.base, suffix);
      this.done.set(this.i18n.t('pc.done', { name: `${p.base}-${suffix}.pdf`, size: formatBytes(r.bytes.length, this.i18n.locale()) }));
    } catch {
      this.error.set(this.i18n.t('pc.err.build'));
    } finally {
      this.busy.set(false);
    }
  }
}
