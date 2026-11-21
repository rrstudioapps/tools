// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 rrstudio — rrstudio Tools
import { signal } from '@angular/core';
import { provideCommandPalette, type CommandPaletteLabels } from '@rrstudioapps/ngx-command-palette';
import { RECENT_KEY } from '../core/palette/palette-prefs.service';
import { scorePaletteItem } from './palette-search';

/**
 * Stato che la configurazione della palette legge a ogni uso. La configurazione si crea prima dei servizi, quindi non può
 * iniettarli: li tiene aggiornati il componente `CommandPalette` (vedi `command-palette.ts`).
 */
export const paletteLabels = signal<Partial<CommandPaletteLabels>>({});
/** Falso nella home: lì Ctrl/⌘+K porta già il focus alla ricerca della pagina. */
export const paletteOnHome = signal(false);
export const paletteRecentOn = signal(false);

/** Palette Ctrl/⌘+K degli strumenti: stesse regole di sempre (non nei campi di testo, non con un dialog aperto, non nella home). */
export function provideToolsPalette() {
  return provideCommandPalette({
    shortcut: 'mod+k',
    shortcutInFields: false,
    shortcutEnabled: () => !paletteOnHome() && !document.querySelector('dialog[open]'),
    labels: () => paletteLabels(),
    showCloseHint: false,
    highlightMatches: false,
    showStatus: true,
    recent: { enabled: paletteRecentOn, storageKey: RECENT_KEY, max: 5 },
    // stessa ricerca e stesso ordine della palette di sempre (punteggio più basso = prima; il pacchetto vuole l'opposto)
    filter: (query, command) => {
      const score = scorePaletteItem(
        { id: command.id, title: command.label, description: command.description ?? '', keywords: (command.keywords ?? []).join(' ') },
        query,
      );
      return score === null ? null : { score: 10 - score, indices: [] };
    },
  });
}
