// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 rrstudio — rrstudio tools
import { DestroyRef, Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TOOLS, ToolDefinition } from '../../tools/tools.registry';
import { I18nService } from '../i18n/i18n.service';
import * as L from './favorites.logic';

const KNOWN: L.Known = new Set(TOOLS.map((t) => t.id));
const BY_ID = new Map(TOOLS.map((t) => [t.id, t] as const));

/** Gruppo pronto da mostrare: strumenti risolti e, in inglese, senza quelli solo italiani. */
export interface GroupView {
  id: string;
  name: string;
  tools: ToolDefinition[];
}

/**
 * Preferiti e menu personalizzati dell'utente, solo nel browser (localStorage, chiave `rrtools.favorites`).
 * Lo stato parte vuoto e si legge dopo l'idratazione (`init`): il prerender non mostra mai dati dell'utente.
 * Ogni accesso allo storage è protetto: se non c'è, è pieno o è bloccato l'app funziona lo stesso
 * (le modifiche restano in memoria e `persisted` diventa false).
 */
@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);
  private started = false;

  readonly state = signal<L.FavState>(L.emptyState());
  /** Lo stato è stato letto dal browser: prima di allora la UI non mostra nulla. */
  readonly ready = signal(false);
  /** Le ultime modifiche sono state scritte nello storage (false: storage assente, pieno o bloccato). */
  readonly persisted = signal(true);

  readonly known = KNOWN;
  readonly english = computed(() => this.i18n.lang() === 'en');
  private readonly visible = (t: ToolDefinition | undefined): t is ToolDefinition => !!t;

  /** Preferiti come definizioni degli strumenti (gli id non più nel registry si scartano). */
  readonly favoriteTools = computed<ToolDefinition[]>(() =>
    this.state().favorites.map((id) => BY_ID.get(id)).filter(this.visible),
  );
  readonly groups = computed<GroupView[]>(() =>
    this.state().groups.map((g) => ({ id: g.id, name: g.name, tools: g.tools.map((id) => BY_ID.get(id)).filter(this.visible) })),
  );
  readonly favoriteSet = computed(() => new Set(this.state().favorites));
  readonly isEmpty = computed(() => L.isEmpty(this.state()));

  /** Solo nel browser, dopo l'idratazione: legge lo storage e ascolta le altre schede. */
  init(): void {
    if (!this.isBrowser || this.started) return;
    this.started = true;
    this.reload();
    this.ready.set(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === L.STORAGE_KEY || e.key === null) this.reload();
    };
    addEventListener('storage', onStorage);
    this.destroyRef.onDestroy(() => removeEventListener('storage', onStorage));
  }

  private reload(): void {
    let text: string | null = null;
    try {
      text = localStorage.getItem(L.STORAGE_KEY);
    } catch {
      /* storage non disponibile: si parte da zero */
    }
    this.state.set(L.parseStored(text, KNOWN));
  }

  private commit(next: L.FavState): void {
    if (next === this.state()) return;
    this.state.set(next);
    try {
      if (L.isEmpty(next)) localStorage.removeItem(L.STORAGE_KEY);
      else localStorage.setItem(L.STORAGE_KEY, L.serialize(next));
      this.persisted.set(true);
    } catch {
      this.persisted.set(false);
    }
  }

  /** Applica una modifica pura allo stato corrente e la salva (null = operazione rifiutata, nessun cambiamento). */
  update(fn: (s: L.FavState, known: L.Known) => L.FavState | null): void {
    const next = fn(this.state(), KNOWN);
    if (next) this.commit(next);
  }

  isFavorite(id: string): boolean {
    return this.favoriteSet().has(id);
  }

  toggle(id: string): void {
    this.update((s, k) => L.toggleFavorite(s, id, k));
  }

  /** Sostituisce tutto (importazione "sostituisci"). */
  replace(next: L.FavState): void {
    this.commit(next);
  }

  /** Unisce dati importati a quelli esistenti. */
  merge(incoming: L.FavState): void {
    this.commit(L.mergeStates(this.state(), incoming));
  }

  /** Cancella tutto, compresa la chiave nello storage. */
  clear(): void {
    this.state.set(L.emptyState());
    try {
      localStorage.removeItem(L.STORAGE_KEY);
      this.persisted.set(true);
    } catch {
      this.persisted.set(false);
    }
  }
}
