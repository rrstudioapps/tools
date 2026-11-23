// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 rrstudio — rrstudio tools
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { formatDate, parseIso } from '../calcolo-giorni-lavorativi/workdays';
import { CopyButton } from '../../shared/copy-button';
import { parseDecimal } from '../../shared/decimal';
import { saveBytes } from '../../shared/download';
import { Icon } from '../../shared/icon';
import { PrintButton, PrintParam } from '../../shared/print-button';
import { PrivacyNote } from '../../shared/privacy-note';
import { SendTo } from '../../shared/send-to';
import { Segmented, SegmentOption } from '../../shared/segmented';
import { ShareLink, applyShare, snapshotShare } from '../../shared/share-link';
import type { ShareData } from '../../shared/share-state';
import { Base, MAX_EXTRA, computeSchedule, formatCents, icsStamp, parseTerms, toCents, toCsv, toIcs } from './scadenze';
import { SCADENZE_DICTIONARIES } from './scadenze-fatture.i18n';
import { SHARE_SCHEMA } from './scadenze-fatture.share';

const PRESETS = ['30', '60', '90', '120', '30-60-90'];

@Component({
  selector: 'app-scadenze-fatture',
  imports: [CopyButton, Icon, PrintButton, PrivacyNote, Segmented, SendTo, ShareLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './scadenze-fatture.page.html',
  styleUrl: './scadenze-fatture.page.scss',
})
export class ScadenzeFatturePage {
  protected readonly i18n = inject(I18nService);

  protected readonly date = signal('');
  protected readonly terms = signal('30');
  protected readonly base = signal<Base>('invoice');
  protected readonly extra = signal('0');
  protected readonly shift = signal(false);
  protected readonly satWork = signal(false);
  protected readonly total = signal('');
  protected readonly reference = signal('');

  protected readonly presets = PRESETS;
  protected readonly bases = computed<SegmentOption<Base>[]>(() => [
    { value: 'invoice', label: this.i18n.t('scad.base.invoice') },
    { value: 'dffm', label: this.i18n.t('scad.base.dffm') },
    { value: 'fm', label: this.i18n.t('scad.base.fm') },
  ]);

  private readonly invoiceDay = computed(() => (this.date() === '' ? null : parseIso(this.date())));
  private readonly termList = computed(() => parseTerms(this.terms()));
  private readonly extraDays = computed(() => {
    const t = this.extra().trim();
    if (t === '') return 0;
    return /^\d{1,2}$/.test(t) && Number(t) <= MAX_EXTRA ? Number(t) : null;
  });
  private readonly totalCents = computed(() => {
    const t = this.total().trim();
    if (t === '') return { ok: true as const, cents: null };
    const n = parseDecimal(t, this.i18n.lang());
    const c = n === null ? null : toCents(n);
    return c === null ? { ok: false as const } : { ok: true as const, cents: c };
  });

  protected readonly errors = computed(() => {
    const e: string[] = [];
    if (this.date() !== '' && this.invoiceDay() === null) e.push(this.i18n.t('scad.err.date'));
    if (this.terms().trim() !== '' && this.termList() === null) e.push(this.i18n.t('scad.err.terms'));
    if (this.extraDays() === null) e.push(this.i18n.t('scad.err.extra', { max: MAX_EXTRA }));
    if (!this.totalCents().ok) e.push(this.i18n.t('scad.err.total'));
    return e;
  });

  private readonly schedule = computed(() => {
    const invoice = this.invoiceDay();
    const terms = this.termList();
    const extra = this.extraDays();
    const tc = this.totalCents();
    if (invoice === null || terms === null || extra === null || !tc.ok) return null;
    return computeSchedule({ invoice, terms, base: this.base(), extra, shift: this.shift(), saturdayWorking: this.satWork(), total: tc.cents });
  });

  protected readonly rangeError = computed(() => {
    const s = this.schedule();
    return s && 'error' in s ? this.i18n.t('scad.err.range') : '';
  });

  private reason(r: string): string {
    return r === 'saturday' ? this.i18n.t('scad.reason.saturday') : r === 'sunday' ? this.i18n.t('scad.reason.sunday') : r;
  }

  protected readonly rows = computed(() => {
    const s = this.schedule();
    if (!s || 'error' in s) return [];
    return s.map((r) => ({
      n: r.n,
      term: r.term,
      theoretical: formatDate(r.theoretical),
      due: formatDate(r.due),
      shifted: r.shifted,
      note: r.nonWorking ? (r.shifted ? this.i18n.t('scad.note.shifted', { r: this.reason(r.nonWorking) }) : this.i18n.t('scad.note.warn', { r: this.reason(r.nonWorking) })) : '',
      amount: r.cents === null ? '' : this.money(r.cents) + ' €',
    }));
  });

  protected readonly summary = computed(() => {
    const s = this.schedule();
    if (!s || 'error' in s) return '';
    const tc = this.totalCents();
    const total = tc.ok && tc.cents !== null ? ` · ${this.money(tc.cents)} €` : '';
    return this.i18n.t('scad.summary', { n: s.length }) + total;
  });

  private readonly csvText = computed(() => {
    const s = this.schedule();
    const inv = this.invoiceDay();
    if (!s || 'error' in s || inv === null) return '';
    const t = (k: string) => this.i18n.t('scad.csv.' + k);
    return toCsv(s, inv, { header: ['inst', 'days', 'invoice', 'theoretical', 'due', 'shifted', 'reason', 'amount'].map(t), reason: (r) => this.reason(r) });
  });
  protected readonly csv = this.csvText;

  protected downloadCsv(): void {
    const c = this.csvText();
    if (c) saveBytes(new TextEncoder().encode(c), 'scadenze-fattura.csv', 'text/csv');
  }

  protected downloadIcs(): void {
    const s = this.schedule();
    const inv = this.invoiceDay();
    if (!s || 'error' in s || inv === null) return;
    const ics = toIcs(s, inv, {
      reference: this.reference().trim(),
      summary: (n, count, ref, amount) => this.i18n.t(amount ? 'scad.ics.summaryAmount' : 'scad.ics.summary', { n, count, ref: ref || this.i18n.t('scad.ics.noRef'), amount: amount ?? '' }),
      amount: (c) => this.money(c) + ' €',
      description: this.i18n.t('scad.ics.desc'),
      stamp: icsStamp(new Date()),
    });
    saveBytes(new TextEncoder().encode(ics), 'scadenze-fattura.ics', 'text/calendar');
  }

  /** Importo nel formato della lingua dell'interfaccia (1.234,56 in italiano, 1,234.56 in inglese). */
  private money(c: bigint): string {
    return this.i18n.lang() === 'en' ? formatCents(c, '.', ',') : formatCents(c, ',', '.');
  }

  protected setPreset(p: string): void {
    this.terms.set(p);
  }
  protected loadSample(): void {
    this.date.set('2026-01-15');
    this.terms.set('30-60-90');
    this.base.set('dffm');
    this.shift.set(true);
    this.total.set('10.000,00');
    this.reference.set('Fattura 12/2026');
  }
  protected readonly hasData = computed(() => this.rows().length > 0);

  /** Parametri per il riepilogo di stampa (al posto dei campi). */
  protected readonly printParams = computed<PrintParam[]>(() => {
    const t = (k: string) => this.i18n.t(k);
    const p = (label: string, value: string): PrintParam => ({ label, value: value.trim() || '-' });
    const yn = (b: boolean) => t(b ? 'print.yes' : 'print.no');
    const out = [p(t('scad.date'), this.date()), p(t('scad.terms'), this.terms()), p(t('scad.base'), t('scad.base.' + this.base()))];
    if (this.base() === 'dffm') out.push(p(t('scad.extra'), this.extra()));
    out.push(p(t('scad.shift'), yn(this.shift())), p(t('scad.satWork'), yn(this.satWork())));
    if (this.total().trim()) out.push(p(t('scad.total'), this.total()));
    if (this.reference().trim()) out.push(p(t('scad.reference'), this.reference()));
    return out;
  });

  // Link di condivisione: lo stato sta nell'hash dell'URL (vedi shared/share-link.ts)
  protected readonly shareSchema = SHARE_SCHEMA;
  private readonly shared = {
    date: this.date,
    terms: this.terms,
    base: this.base,
    extra: this.extra,
    shift: this.shift,
    satWork: this.satWork,
    total: this.total,
    reference: this.reference,
  };
  protected readonly shareState = (): ShareData => snapshotShare(this.shared);
  protected restoreShared(data: ShareData): void {
    applyShare(data, this.shared);
  }

  constructor() {
    this.i18n.register(SCADENZE_DICTIONARIES);
  }
}
