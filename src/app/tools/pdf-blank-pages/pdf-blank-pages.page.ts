// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 rrstudio — rrstudio Tools
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { CopyButton } from '../../shared/copy-button';
import { Icon } from '../../shared/icon';
import { PrivacyNote } from '../../shared/privacy-note';
import { ShareLink } from '../../shared/share-link';
import type { ShareData } from '../../shared/share-state';
import { formatBytes } from '../../shared/text-stats';
import { LoadedPdf, downloadPdf } from '../pdf-common/pdf-file';
import { PdfSource } from '../pdf-common/pdf-source';
import { PageSample, samplePages } from './pdf-blank-pages-browser';
import { MAX_PAGES, formatPageList, inkFractionLuma, isBlank, removePages } from './pdf-blank-pages';
import { PDF_BLANK_PAGES_DICTIONARIES } from './pdf-blank-pages.i18n';
import { SHARE_SCHEMA } from './pdf-blank-pages.share';

interface Card {
  number: number;
  url: string;
  width: number;
  height: number;
  ink: number;
  blank: boolean;
}

@Component({
  selector: 'app-pdf-blank-pages',
  imports: [Icon, PrivacyNote, PdfSource, CopyButton, ShareLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pdf-blank-pages.page.html',
  styleUrl: './pdf-blank-pages.page.scss',
})
export class PdfBlankPagesPage {
  protected readonly i18n = inject(I18nService);
  protected readonly noiseLevels: readonly number[] = [0, 1, 2, 3];
  protected readonly pdf = signal<LoadedPdf | null>(null);
  protected readonly threshold = signal(0.1);
  protected readonly margin = signal(3);
  protected readonly noise = signal(1);
  protected readonly busy = signal(false);
  protected readonly progress = signal('');
  protected readonly error = signal('');
  protected readonly done = signal('');
  /** Pagine analizzate (pixel e miniature), nell'ordine del PDF. */
  private readonly samples = signal<PageSample[]>([]);
  private readonly urls = signal<string[]>([]);
  /** Scelte dell'utente per pagina (indice da 0): true = rimuovi, false = tieni. Sostituiscono il rilevamento. */
  private readonly overrides = signal<Readonly<Record<number, boolean>>>({});
  private token = 0;

  protected readonly cards = computed<Card[]>(() => {
    const s = this.samples();
    const urls = this.urls();
    const t = this.threshold();
    const opts = { margin: this.margin(), minNeighbors: this.noise() };
    return s.map((p, i) => {
      const ink = inkFractionLuma(p.luma, p.width, p.height, opts);
      return { number: i + 1, url: urls[i] ?? '', width: p.width, height: p.height, ink, blank: isBlank(ink, t) };
    });
  });
  protected readonly removeIdx = computed(() => {
    const o = this.overrides();
    return this.cards()
      .filter((c) => o[c.number - 1] ?? c.blank)
      .map((c) => c.number - 1);
  });
  protected readonly blankCount = computed(() => this.cards().filter((c) => c.blank).length);
  protected readonly removedList = computed(() => formatPageList(this.removeIdx().map((i) => i + 1)));
  protected readonly canDownload = computed(() => this.removeIdx().length > 0 && this.removeIdx().length < this.cards().length);

  constructor() {
    this.i18n.register(PDF_BLANK_PAGES_DICTIONARIES);
    inject(DestroyRef).onDestroy(() => this.reset());
  }

  private reset(): void {
    this.token++;
    for (const u of this.urls()) URL.revokeObjectURL(u);
    this.urls.set([]);
    this.samples.set([]);
    this.overrides.set({});
  }

  protected onLoaded(p: LoadedPdf): void {
    this.reset();
    this.pdf.set(p);
    this.done.set('');
    this.error.set(p.pages > MAX_PAGES ? this.i18n.t('pbl.err.pages', { max: MAX_PAGES }) : '');
  }

  protected onCleared(): void {
    this.reset();
    this.pdf.set(null);
    this.error.set('');
    this.done.set('');
  }

  protected canAnalyze(): boolean {
    const p = this.pdf();
    return !!p && p.pages <= MAX_PAGES && !this.busy();
  }

  protected async analyze(): Promise<void> {
    const p = this.pdf();
    if (!p || p.pages > MAX_PAGES) return;
    this.reset();
    const mine = this.token;
    this.busy.set(true);
    this.error.set('');
    this.done.set('');
    try {
      const s = await samplePages(p.bytes, (d, t) => this.progress.set(this.i18n.t('pbl.progress', { done: d, total: t })), () => mine !== this.token);
      if (mine !== this.token) return;
      this.urls.set(s.map((x) => (x.thumb ? URL.createObjectURL(x.thumb) : '')));
      this.samples.set(s);
    } catch {
      if (mine === this.token) this.error.set(this.i18n.t('pbl.err.analyze'));
    } finally {
      if (mine === this.token) this.busy.set(false);
      this.progress.set('');
    }
  }

  protected isRemoved(c: Card): boolean {
    return this.overrides()[c.number - 1] ?? c.blank;
  }

  protected toggle(c: Card): void {
    const now = this.isRemoved(c);
    this.done.set('');
    this.overrides.update((o) => ({ ...o, [c.number - 1]: !now }));
  }

  /** Cambiando le impostazioni il rilevamento si rifà da capo: le scelte manuali si azzerano. */
  protected setNumber(target: 'threshold' | 'margin' | 'noise', e: Event): void {
    const v = Number((e.target as HTMLInputElement | HTMLSelectElement).value);
    if (!Number.isFinite(v)) return;
    this[target].set(v);
    this.overrides.set({});
    this.done.set('');
  }

  protected resetChoices(): void {
    this.overrides.set({});
    this.done.set('');
  }

  protected pct(ink: number): string {
    return (ink * 100).toLocaleString(this.i18n.locale(), { maximumFractionDigits: 2 });
  }

  protected async download(): Promise<void> {
    const p = this.pdf();
    if (!p || !this.canDownload()) return;
    this.error.set('');
    try {
      const r = await removePages(p.bytes, this.removeIdx());
      if (!r.ok) {
        this.error.set(this.i18n.t('pbl.err.' + r.error));
        return;
      }
      downloadPdf(r.bytes, p.base, 'senza-vuote');
      this.done.set(this.i18n.t('pc.done', { name: `${p.base}-senza-vuote.pdf`, size: formatBytes(r.bytes.length, this.i18n.locale()) }));
    } catch {
      this.error.set(this.i18n.t('pc.err.build'));
    }
  }

  protected readonly shareSchema = SHARE_SCHEMA;
  protected readonly shareState = (): ShareData => ({ threshold: this.threshold(), margin: this.margin(), noise: this.noise() });
  protected restoreShared(data: ShareData): void {
    const s = data as Partial<Record<string, unknown>>;
    if (typeof s['threshold'] === 'number') this.threshold.set(s['threshold']);
    if (typeof s['margin'] === 'number') this.margin.set(s['margin']);
    if (typeof s['noise'] === 'number') this.noise.set(s['noise']);
    this.overrides.set({});
  }
}
