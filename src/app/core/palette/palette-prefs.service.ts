// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 rrstudio — rrstudio Tools
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/** Interruttore (spento di default) dei «recenti» della palette Ctrl/⌘+K. Chiave `rrtools.recentOn`: "1" se acceso. */
export const RECENT_ON_KEY = 'rrtools.recentOn';
/** Chiave in cui la palette salva gli ultimi strumenti aperti (solo gli id degli strumenti). */
export const RECENT_KEY = 'rrtools.recent';

/**
 * Preferenza «ricorda gli ultimi strumenti aperti dalla ricerca». Lo stato parte spento e si legge dopo l'idratazione (`init`):
 * il prerender non mostra mai dati dell'utente. Quando si spegne, i recenti già salvati vengono cancellati (chi li cancella è
 * la palette, vedi `command-palette.ts`). Ogni accesso allo storage è protetto: se è assente o bloccato l'app funziona lo stesso.
 */
@Injectable({ providedIn: 'root' })
export class PalettePrefsService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly recentEnabled = signal(false);

  /** Solo nel browser, dopo l'idratazione. */
  init(): void {
    if (!this.isBrowser) return;
    try {
      this.recentEnabled.set(localStorage.getItem(RECENT_ON_KEY) === '1');
    } catch {
      /* storage bloccato: resta spento */
    }
  }

  setRecent(on: boolean): void {
    this.recentEnabled.set(on);
    if (!this.isBrowser) return;
    try {
      if (on) localStorage.setItem(RECENT_ON_KEY, '1');
      else {
        localStorage.removeItem(RECENT_ON_KEY);
        localStorage.removeItem(RECENT_KEY);
      }
    } catch {
      /* storage pieno o bloccato: la scelta vale solo per questa sessione */
    }
  }
}
