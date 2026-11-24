// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 rrstudio — rrstudio tools
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../core/i18n/i18n.service';
import { SettingsTransfer } from '../shared/settings-transfer';
import { APPS_URL, KOFI_URL, PREMIUM_URL, REPO_URL, GITHUB_PROFILE_URL } from '../core/links';

/** Informativa sulla privacy (art. 13 GDPR), in italiano e in inglese. Non è uno strumento: non sta nel registry. */
@Component({
  selector: 'app-privacy',
  imports: [RouterLink, SettingsTransfer],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './privacy.html',
  styleUrl: './privacy.scss',
})
export class Privacy {
  protected readonly i18n = inject(I18nService);
  protected readonly repo = REPO_URL;
  protected readonly kofi = KOFI_URL;
  protected readonly github = GITHUB_PROFILE_URL;
  protected readonly demo = PREMIUM_URL;
  protected readonly apps = APPS_URL;
  protected readonly garante = 'https://www.garanteprivacy.it';
  protected readonly email = 'info@rrstudio.app';
}
