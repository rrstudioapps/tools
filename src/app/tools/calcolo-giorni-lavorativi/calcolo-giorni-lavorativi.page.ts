// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 rrstudio — rrstudio tools
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { CopyButton } from '../../shared/copy-button';
import { PrintButton, PrintParam } from '../../shared/print-button';
import { PrivacyNote } from '../../shared/privacy-note';
import { Segmented, SegmentOption } from '../../shared/segmented';
import { WD_DICTIONARIES } from './calcolo-giorni-lavorativi.i18n';
import {
  DayOptions,
  HolidayHit,
  MAX_ADD,
  PATRONS,
  addWorkdays,
  countRange,
  easter,
  formatDate,
  fromDayNo,
  parseIso,
  toDayNo,
  toIso,
  weekdayName,
} from './workdays';
import { ShareLink, applyShare, snapshotShare } from '../../shared/share-link';
import type { ShareData } from '../../shared/share-state';
import { SHARE_SCHEMA } from './calcolo-giorni-lavorativi.share';

type Mode = 'between' | 'add';
type Dir = 'add' | 'sub';

interface HolidayRow {
  iso: string;
  date: string;
  name: string;
}

@Component({
  selector: 'app-calcolo-giorni-lavorativi',
  imports: [ShareLink, PrintButton, PrivacyNote, Segmented, CopyButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './calcolo-giorni-lavorativi.page.html',
  styleUrl: './calcolo-giorni-lavorativi.page.scss',
})
export class CalcoloGiorniLavorativiPage {
  protected readonly i18n = inject(I18nService);
  protected readonly patrons = [...PATRONS].sort((a, b) => a.city.localeCompare(b.city, 'it'));

  protected readonly mode = signal<Mode>('between');
  protected readonly startText = signal('');
  protected readonly endText = signal('');
  protected readonly includeEnd = signal(true);
  protected readonly daysText = signal('');
  protected readonly dir = signal<Dir>('add');
  protected readonly excludeSat = signal(true);
  protected readonly excludeSun = signal(true);
  protected readonly national = signal(true);
  protected readonly patron = signal('');
  protected readonly custom = signal('');

  protected readonly modes = computed<SegmentOption<Mode>[]>(() => [
    { value: 'between', label: this.i18n.t('wd.mode.between') },
    { value: 'add', label: this.i18n.t('wd.mode.add') },
  ]);
  protected readonly dirs = computed<SegmentOption<Dir>[]>(() => [
    { value: 'add', label: this.i18n.t('wd.dir.add') },
    { value: 'sub', label: this.i18n.t('wd.dir.sub') },
  ]);

  private readonly opts = computed<DayOptions>(() => ({
    excludeSaturday: this.excludeSat(),
    excludeSunday: this.excludeSun(),
    national: this.national(),
    patron: this.patron(),
    custom: this.custom(),
  }));

  private readonly start = computed(() => parseIso(this.startText()));
  private readonly end = computed(() => parseIso(this.endText()));

  /** Messaggio d'errore dei dati inseriti, o '' se si può calcolare. */
  protected readonly error = computed(() => {
    if (this.startText() === '' && this.endText() === '' && this.daysText() === '') return '';
    if (this.start() === null) return this.startText() === '' ? '' : this.i18n.t('wd.err.start');
    if (this.mode() === 'between') {
      if (this.end() === null) return this.endText() === '' ? '' : this.i18n.t('wd.err.end');
      if (this.end()! < this.start()!) return this.i18n.t('wd.err.order');
      return '';
    }
    if (this.daysText().trim() === '') return '';
    const n = this.parsedDays();
    return n === null ? this.i18n.t('wd.err.days') : '';
  });

  private parsedDays(): number | null {
    const t = this.daysText().trim();
    if (!/^\d+$/.test(t)) return null;
    const n = parseInt(t, 10);
    return n <= MAX_ADD ? n : null;
  }

  private readonly range = computed(() => {
    const s = this.start();
    const e = this.end();
    if (this.mode() !== 'between' || s === null || e === null) return null;
    return countRange(s, e, this.includeEnd(), this.opts());
  });

  private readonly addResult = computed(() => {
    const s = this.start();
    const n = this.parsedDays();
    if (this.mode() !== 'add' || s === null || n === null || this.daysText().trim() === '') return null;
    return { res: addWorkdays(s, this.dir() === 'sub' ? -n : n, this.opts()), n };
  });

  protected readonly rangeError = computed(() => (this.mode() === 'add' && this.addResult() !== null && this.addResult()!.res === null ? this.i18n.t('wd.err.range') : ''));

  private fmtNum(n: number): string {
    return new Intl.NumberFormat(this.i18n.lang() === 'en' ? 'en-GB' : 'it-IT').format(n);
  }

  /** Righe del risultato (etichetta/valore). */
  protected readonly rows = computed<{ id: string; label: string; value: string; strong?: boolean }[]>(() => {
    const t = (k: string): string => this.i18n.t('wd.r.' + k);
    const r = this.range();
    if (r) {
      return [
        { id: 'workdays', label: t('workdays'), value: this.fmtNum(r.workdays), strong: true },
        { id: 'calendar', label: t('calendar'), value: this.fmtNum(r.calendarDays) },
        { id: 'weekend', label: t('weekend'), value: this.fmtNum(r.weekendDays) },
        { id: 'holidays', label: t('holidays'), value: this.fmtNum(r.holidays.length) },
      ];
    }
    const a = this.addResult();
    if (a?.res) {
      return [
        { id: 'date', label: t('date'), value: formatDate(a.res.result), strong: true },
        { id: 'skipped', label: t('skipped'), value: this.fmtNum(a.res.skipped.length) },
      ];
    }
    return [];
  });

  private toRows(hits: readonly HolidayHit[]): HolidayRow[] {
    return hits.map((h) => ({ iso: toIso(h.day), date: formatDate(h.day), name: h.name }));
  }

  /** Festività cadute in giorni lavorativi: nell'intervallo o saltate nel calcolo della scadenza. */
  protected readonly holidayRows = computed<HolidayRow[]>(() => {
    const r = this.range();
    if (r) return this.toRows(r.holidays);
    const a = this.addResult();
    return a?.res ? this.toRows(a.res.skipped) : [];
  });

  protected readonly hasResult = computed(() => this.rows().length > 0);

  protected readonly notes = computed(() => {
    const a = this.addResult();
    const out: string[] = [];
    if (a?.res?.startNotWorking) out.push(this.i18n.t('wd.note.startOff'));
    if (a?.res && a.n === 0) out.push(this.i18n.t('wd.note.zero'));
    return out;
  });

  protected readonly summary = computed(() => {
    const s = this.start();
    if (s === null) return '';
    const r = this.range();
    if (r) {
      return this.i18n.t('wd.summary.between', {
        start: formatDate(s),
        end: formatDate(this.end()!),
        workdays: this.fmtNum(r.workdays),
        calendar: this.fmtNum(r.calendarDays),
      });
    }
    const a = this.addResult();
    if (a?.res) {
      return this.i18n.t('wd.summary.add', {
        start: formatDate(s),
        dir: this.i18n.t(this.dir() === 'sub' ? 'wd.summary.sub.sign' : 'wd.summary.add.sign'),
        n: this.fmtNum(a.n),
        result: formatDate(a.res.result),
      });
    }
    return '';
  });

  /** Pasqua dell'anno della data iniziale, come promemoria di quando cade. */
  protected readonly easterNote = computed(() => {
    const s = this.start();
    if (s === null || !this.national()) return '';
    const year = fromDayNo(s).y;
    const e = easter(year);
    const d = toDayNo(year, e.m, e.d);
    return `${this.i18n.t('wd.easter', { year })}: ${weekdayName(d)} ${e.d}/${e.m}`;
  });

  /** Parametri per il riepilogo di stampa (al posto dei campi). */
  protected readonly printParams = computed<PrintParam[]>(() => {
    const t = (k: string) => this.i18n.t(k);
    const p = (label: string, value: string): PrintParam => ({ label, value: value.trim() || '-' });
    const yn = (b: boolean) => t(b ? 'print.yes' : 'print.no');
    const out = [p(t('wd.mode'), t('wd.mode.' + this.mode())), p(t('wd.start'), this.startText())];
    if (this.mode() === 'between') out.push(p(t('wd.end'), this.endText()), p(t('wd.includeEnd'), yn(this.includeEnd())));
    else out.push(p(t('wd.dir'), t('wd.dir.' + this.dir())), p(t('wd.days'), this.daysText()));
    out.push(p(t('wd.sat'), yn(this.excludeSat())), p(t('wd.sun'), yn(this.excludeSun())), p(t('wd.national'), yn(this.national())));
    const patron = this.patrons.find((x) => x.id === this.patron());
    out.push(p(t('wd.patron'), patron ? this.patronLabel(patron) : t('wd.patron.none')));
    if (this.custom()) out.push(p(t('wd.custom'), this.custom()));
    return out;
  });

  // Link di condivisione: lo stato sta nell'hash dell'URL (vedi shared/share-link.ts)
  protected readonly shareSchema = SHARE_SCHEMA;
  private readonly shared = {
    mode: this.mode,
    startText: this.startText,
    endText: this.endText,
    includeEnd: this.includeEnd,
    daysText: this.daysText,
    dir: this.dir,
    excludeSat: this.excludeSat,
    excludeSun: this.excludeSun,
    national: this.national,
    patron: this.patron,
    custom: this.custom,
  };
  protected readonly shareState = (): ShareData => snapshotShare(this.shared);

  protected restoreShared(data: ShareData): void {
    applyShare(data, this.shared);
  }

  constructor() {
    this.i18n.register(WD_DICTIONARIES);
  }

  protected setToday(which: 'start' | 'end'): void {
    const now = new Date();
    const iso = toIso(toDayNo(now.getFullYear(), now.getMonth() + 1, now.getDate()));
    (which === 'start' ? this.startText : this.endText).set(iso);
  }

  protected onDate(sig: 'start' | 'end' | 'custom', e: Event): void {
    const v = (e.target as HTMLInputElement).value;
    (sig === 'start' ? this.startText : sig === 'end' ? this.endText : this.custom).set(v);
  }

  protected onDays(e: Event): void {
    this.daysText.set((e.target as HTMLInputElement).value);
  }

  protected onPatron(e: Event): void {
    this.patron.set((e.target as HTMLSelectElement).value);
  }

  protected patronLabel(p: { city: string; saint: string; day: number; month: number }): string {
    return `${p.city}: ${p.saint} (${p.day}/${p.month})`;
  }
}
