// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 rrstudio — rrstudio tools
import { DestroyRef, Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { TOOLS } from '../../tools/tools.registry';
import { I18nService } from '../i18n/i18n.service';
import * as C from './chains.logic';

const KNOWN: ReadonlySet<string> = new Set(TOOLS.map((t) => t.id));
const BY_PATH = new Map(TOOLS.map((t) => [t.path, t.id] as const));

/** Catena in corso: solo in memoria, si perde al ricaricamento. */
export interface ActiveChain {
  name: string;
  steps: string[];
  /** Passo corrente (indice in `steps`); `onPath` = lo strumento aperto ora fa parte della catena. */
  index: number;
  onPath: boolean;
}

/**
 * Catene di strumenti salvate dall'utente (localStorage `rrtools.chains`: nome e id degli strumenti, mai i dati)
 * e catena in corso. Il passo corrente segue la navigazione: quando si apre il passo successivo — con «Invia a…»
 * o a mano — la catena avanza. Ogni accesso allo storage è protetto, come per i preferiti.
 */
@Injectable({ providedIn: 'root' })
export class ChainsService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly i18n = inject(I18nService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly known = KNOWN;
  readonly saved = signal<C.Chain[]>([]);
  readonly active = signal<ActiveChain | null>(null);
  /** Il pannello «Catene» è aperto (lo accende il pulsante dell'header). */
  readonly dialogOpen = signal(false);
  /** Lo strumento che deve ricevere il contenuto al passo successivo, se la catena è in corso e sul percorso. */
  readonly nextTool = computed(() => {
    const a = this.active();
    return a && a.onPath ? (a.steps[a.index + 1] ?? null) : null;
  });
  private started = false;

  init(): void {
    if (!this.isBrowser || this.started) return;
    this.started = true;
    this.reload();
    const onStorage = (e: StorageEvent) => {
      if (e.key === C.CHAINS_KEY || e.key === null) this.reload();
    };
    addEventListener('storage', onStorage);
    this.destroyRef.onDestroy(() => removeEventListener('storage', onStorage));
    this.router.events.subscribe((e) => {
      if (e instanceof NavigationEnd) this.follow();
    });
  }

  private reload(): void {
    let text: string | null = null;
    try {
      text = localStorage.getItem(C.CHAINS_KEY);
    } catch {
      /* storage non disponibile: nessuna catena salvata */
    }
    this.saved.set(C.parseStoredChains(text, KNOWN));
  }

  /** Sostituisce l'elenco delle catene salvate (anche da un'importazione) e lo salva. */
  replaceSaved(list: C.Chain[]): void {
    this.saved.set(list);
    try {
      if (list.length) localStorage.setItem(C.CHAINS_KEY, C.serializeChains(list));
      else localStorage.removeItem(C.CHAINS_KEY);
    } catch {
      /* le modifiche restano in memoria */
    }
  }

  /** Salva una nuova catena; false se non valida o troppe. */
  save(name: string, steps: readonly string[]): boolean {
    const next = C.addChain(this.saved(), name, steps, KNOWN);
    if (!next) return false;
    this.replaceSaved(next);
    return true;
  }

  remove(id: string): void {
    this.replaceSaved(C.removeChain(this.saved(), id));
  }

  /** Avvia una catena (salvata o provvisoria) e apre il primo strumento. */
  start(name: string, steps: readonly string[]): void {
    if (steps.length < C.MIN_STEPS) return;
    this.active.set({ name, steps: [...steps], index: 0, onPath: false });
    this.dialogOpen.set(false);
    this.follow(); // già sul primo strumento: nessuna navigazione, il passo si segna subito
    const tool = TOOLS.find((t) => t.id === steps[0]);
    if (tool) void this.router.navigateByUrl(this.i18n.link(tool.path));
  }

  stop(): void {
    this.active.set(null);
  }

  /** Dopo ogni navigazione allinea il passo corrente allo strumento aperto. */
  private follow(): void {
    const a = this.active();
    if (!a) return;
    const id = BY_PATH.get(this.i18n.slug());
    const i = id ? C.stepFor(a.steps, a.index, id) : null;
    this.active.set(i === null ? { ...a, onPath: false } : { ...a, index: i, onPath: true });
  }
}
