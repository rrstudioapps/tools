// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 rrstudio — rrstudio tools
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { CopyButton } from '../../shared/copy-button';
import { parseDecimal } from '../../shared/decimal';
import { PrivacyNote } from '../../shared/privacy-note';
import { Segmented, SegmentOption } from '../../shared/segmented';
import { ShareLink, applyShare, snapshotShare } from '../../shared/share-link';
import type { ShareData } from '../../shared/share-state';
import { BANKNOTES, COINS, denominationEuro, euroToLire, formatScaled, lireToEuro, toHundredths } from './lire';
import { LIRE_DICTIONARIES } from './convertitore-lire-euro.i18n';
import { SHARE_SCHEMA } from './convertitore-lire-euro.share';

type Mode = 'toEuro' | 'toLire';

interface Res {
  main: string;
  copy: string;
  exact: string;
  note: string;
}
type Outcome = Res | { error: 'invalid' | 'negative' | 'range' };

@Component({
  selector: 'app-convertitore-lire-euro',
  imports: [ShareLink, PrivacyNote, Segmented, CopyButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './convertitore-lire-euro.page.html',
  styleUrl: './convertitore-lire-euro.page.scss',
})
export class ConvertitoreLireEuroPage {
  protected readonly i18n = inject(I18nService);

  protected readonly mode = signal<Mode>('toEuro');
  protected readonly amount = signal('');

  protected readonly modes = computed<SegmentOption<Mode>[]>(() => [
    { value: 'toEuro', label: this.i18n.t('lire.mode.toEuro') },
    { value: 'toLire', label: this.i18n.t('lire.mode.toLire') },
  ]);

  protected readonly outcome = computed<Outcome | null>(() => {
    const raw = this.amount().trim();
    if (raw === '') return null;
    const n = parseDecimal(raw, this.i18n.lang());
    if (n === null) return { error: 'invalid' };
    if (n < 0) return { error: 'negative' };
    const h = toHundredths(n);
    if (h === null) return { error: 'range' };
    if (this.mode() === 'toEuro') {
      const c = lireToEuro(h);
      return {
        main: this.i18n.t('lire.res.euro', { v: formatScaled(c.rounded, 2, this.i18n.lang()) }),
        copy: formatScaled(c.rounded, 2, this.i18n.lang()),
        exact: this.i18n.t('lire.res.exactEuro', { v: formatScaled(c.exact, 4, this.i18n.lang()) }),
        note: this.i18n.t('lire.note.euro'),
      };
    }
    const c = euroToLire(h);
    return {
      main: this.i18n.t('lire.res.lire', { v: formatScaled(c.rounded, 0, this.i18n.lang()) }),
      copy: formatScaled(c.rounded, 0, this.i18n.lang()),
      exact: this.i18n.t('lire.res.exactLire', { v: formatScaled(c.exact, 2, this.i18n.lang()) }),
      note: this.i18n.t('lire.note.lire'),
    };
  });

  protected readonly result = computed<Res | null>(() => {
    const o = this.outcome();
    return o && 'main' in o ? o : null;
  });
  protected readonly error = computed(() => {
    const o = this.outcome();
    return o && 'error' in o ? this.i18n.t('lire.err.' + o.error) : '';
  });

  protected readonly banknotes = computed(() => BANKNOTES.map((d) => ({ ...d, euro: formatScaled(denominationEuro(d.lire), 2, this.i18n.lang()), label: formatScaled(BigInt(d.lire), 0, this.i18n.lang()) })));
  protected readonly coins = computed(() => COINS.map((d) => ({ ...d, euro: formatScaled(denominationEuro(d.lire), 2, this.i18n.lang()), label: formatScaled(BigInt(d.lire), 0, this.i18n.lang()) })));

  // Link di condivisione: lo stato sta nell'hash dell'URL (vedi shared/share-link.ts)
  protected readonly shareSchema = SHARE_SCHEMA;
  private readonly shared = { mode: this.mode, amount: this.amount };
  protected readonly shareState = (): ShareData => snapshotShare(this.shared);
  protected restoreShared(data: ShareData): void {
    applyShare(data, this.shared);
  }

  constructor() {
    this.i18n.register(LIRE_DICTIONARIES);
  }
}
