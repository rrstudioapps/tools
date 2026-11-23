// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 rrstudio — rrstudio tools
import { ChangeDetectionStrategy, Component, Injectable, afterNextRender, computed, effect, inject } from '@angular/core';
import { FavoritesService } from '../core/favorites/favorites.service';
import { I18nService } from '../core/i18n/i18n.service';
import { TOOLS } from '../tools/tools.registry';
import { CommandPaletteComponent, CommandPaletteService, injectCommands, type Command } from '@rrstudioapps/ngx-command-palette';
import { PalettePrefsService } from '../core/palette/palette-prefs.service';
import { ThemeService } from '../core/theme/theme.service';
import { paletteLabels, paletteOnHome, paletteRecentOn } from './command-palette.config';

/** Apre la palette (il pulsante dell'header): la finestra e la scorciatoia Ctrl/⌘+K le gestisce il pacchetto. */
@Injectable({ providedIn: 'root' })
export class PaletteService {
  private readonly lib = inject(CommandPaletteService);
  open(): void {
    this.lib.open();
  }
}

/**
 * Palette di ricerca globale (Ctrl/⌘+K), fatta con `@rrstudioapps/ngx-command-palette`: finestra modale con campo di ricerca e
 * elenco degli strumenti (combobox + listbox, frecce, Invio, Esc). Le regole della scorciatoia stanno in `command-palette.config.ts`.
 * Qui si registrano gli strumenti nella lingua corrente e si tengono aggiornati lingua, pagina e interruttore dei recenti.
 * Tutto locale, niente richieste.
 */
@Component({
  selector: 'app-command-palette',
  imports: [CommandPaletteComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<rr-command-palette [theme]="theme.isDark() ? 'dark' : 'light'" />`,
})
export class CommandPalette {
  protected readonly theme = inject(ThemeService);
  private readonly i18n = inject(I18nService);
  private readonly favorites = inject(FavoritesService);
  private readonly prefs = inject(PalettePrefsService);

  constructor() {
    // lingua, pagina e interruttore dei recenti per la configurazione
    effect(() => {
      const t = (key: string, p?: Record<string, string>) => this.i18n.t(key, p);
      paletteLabels.set({
        placeholder: t('palette.placeholder'),
        dialog: t('palette.title'),
        listbox: t('palette.results'),
        empty: t('palette.empty'),
        loading: t('palette.loading'),
        back: t('palette.back'),
        pinned: t('palette.pinned'),
        recent: t('palette.recent'),
        defaultGroup: t('palette.all'),
        results: t('palette.count', { n: '{count}' }),
        resultsOne: t('palette.count.one'),
      });
    });
    effect(() => paletteOnHome.set(this.i18n.slug() === ''));
    effect(() => paletteRecentOn.set(this.prefs.recentEnabled()));
    afterNextRender(() => this.prefs.init());

    injectCommands(
      computed<Command[]>(() => {
        const fav = this.favorites.favoriteSet();
        return TOOLS.map((tool) => ({
          id: tool.id,
          label: this.i18n.t(tool.titleKey),
          description: this.i18n.t(tool.descriptionKey),
          keywords: [tool.keywords?.it ?? '', tool.keywords?.en ?? ''],
          pinned: fav.has(tool.id),
          route: this.i18n.link(tool.path),
        }));
      }),
    );
  }
}
