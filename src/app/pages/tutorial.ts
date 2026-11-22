// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 rrstudio — rrstudio Tools
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../core/i18n/i18n.service';
import { FAVORITES_SLUG } from '../core/i18n/lang-routing';

/** Tutorial sui comportamenti poco intuitivi del sito, in italiano e in inglese. Non è uno strumento: non sta nel registry. */
@Component({
  selector: 'app-tutorial',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tutorial.html',
  styleUrl: './tutorial.scss',
})
export class Tutorial {
  protected readonly i18n = inject(I18nService);
  protected readonly favoritesSlug = () => FAVORITES_SLUG[this.i18n.lang()];
}
