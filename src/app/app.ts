// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 rrstudio — rrstudio tools
import { ApplicationRef, ChangeDetectionStrategy, Component, afterNextRender, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BuildDay } from './core/build-day';
import { ChainsService } from './core/chains/chains.service';
import { FavoritesService } from './core/favorites/favorites.service';
import { I18nService } from './core/i18n/i18n.service';
import { PwaService } from './core/pwa/pwa.service';
import { SeoService } from './core/seo/seo.service';
import { ThemeService } from './core/theme/theme.service';
import { ChainBar, ChainsDialog } from './shared/chains-ui';
import { CommandPalette } from './shared/command-palette';
import { Footer } from './shared/footer';
import { HandoffNotice } from './shared/handoff-notice';
import { Header } from './shared/header';
import { LangHint } from './shared/lang-hint';
import { PwaStatus } from './shared/pwa-status';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Footer, HandoffNotice, LangHint, PwaStatus, CommandPalette, ChainBar, ChainsDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="skip" href="#main">{{ i18n.t('nav.skip') }}</a>
    <app-lang-hint />
    <app-header />
    <app-chain-bar />
    <main id="main" tabindex="-1">
      <app-handoff-notice />
      <router-outlet />
    </main>
    <app-footer />
    <app-pwa-status />
    <app-command-palette />
    <app-chains-dialog />
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100dvh;
    }
    main {
      flex: 1;
      outline: none;
    }
    .skip {
      position: absolute;
      left: -999px;
      top: 0.5rem;
      z-index: 50;
      background: var(--ink);
      color: var(--bg);
      padding: 0.5rem 1rem;
      border-radius: var(--radius-sm);
      &:focus {
        left: 0.5rem;
      }
    }
  `,
})
export class App {
  protected readonly i18n = inject(I18nService);
  private readonly theme = inject(ThemeService);
  private readonly pwa = inject(PwaService);
  private readonly favorites = inject(FavoritesService);
  private readonly chains = inject(ChainsService);
  private readonly appRef = inject(ApplicationRef);

  constructor() {
    inject(BuildDay); // fissa il giorno della build nel prerender (badge «Nuovo» senza differenze in idratazione)
    inject(SeoService); // avvia l'ascolto della navigazione per title/meta
    // Il tema salvato si legge solo nel browser, dopo l'idratazione (la lingua la decide l'URL)
    afterNextRender(() => {
      this.theme.initFromBrowser();
      this.favorites.init(); // preferiti dell'utente: solo nel browser, dopo l'idratazione
      this.chains.init(); // catene salvate dall'utente: solo nel browser
      this.pwa.init(); // service worker: solo nel browser, dopo che l'app è stabile
      // Marcatore «idratazione finita»: la pagina statica è visibile prima, ma input ed eventi funzionano solo da qui in poi (lo usa l'e2e)
      void this.appRef.whenStable().then(() => document.documentElement.setAttribute('data-hydrated', ''));
    });
  }
}
