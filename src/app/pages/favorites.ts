// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 rrstudio — rrstudio tools
import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, afterNextRender, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import * as L from '../core/favorites/favorites.logic';
import { FavoritesService } from '../core/favorites/favorites.service';
import { PalettePrefsService } from '../core/palette/palette-prefs.service';
import { FAVORITES_SLUG } from '../core/i18n/lang-routing';
import { I18nService } from '../core/i18n/i18n.service';
import { CopyButton } from '../shared/copy-button';
import { saveBytes } from '../shared/download';
import { Icon } from '../shared/icon';
import { TOOLS, ToolDefinition } from '../tools/tools.registry';
import { filterTools } from './tool-filter';

/** Chiave della lista dei preferiti; le altre liste usano l'id del gruppo. */
const FAV = 'fav';
const MAX_RESULTS = 8;

interface Pending {
  state: L.FavState;
  source: 'link' | 'file';
  name: string;
  unknown: number;
  trimmed: number;
}

/**
 * Pagina personale /preferiti (e /en/favorites): gestione di preferiti e menu personalizzati,
 * esportazione/importazione JSON e link di condivisione (dati nell'hash, mai inviati al server).
 */
@Component({
  selector: 'app-favorites-page',
  imports: [RouterLink, NgTemplateOutlet, CopyButton, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './favorites.html',
  styleUrl: './favorites.scss',
})
export class FavoritesPage {
  protected readonly i18n = inject(I18nService);
  protected readonly fav = inject(FavoritesService);
  protected readonly prefs = inject(PalettePrefsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  /** Dati di un link appena letti: il router può rimettere il fragment al termine della navigazione, va tolto di nuovo. */
  private stripHash = false;
  protected readonly FAV = FAV;
  protected readonly maxGroups = L.MAX_GROUPS;
  protected readonly maxName = L.MAX_NAME;

  protected readonly pending = signal<Pending | null>(null);
  protected readonly importMode = signal<'merge' | 'replace'>('merge');
  /** Messaggio visibile dopo un'azione (errore con role=alert, conferma con role=status). */
  protected readonly notice = signal<{ error: boolean; text: string } | null>(null);
  /** Annunci per i lettori di schermo (spostamenti, aggiunte, rimozioni). */
  protected readonly live = signal('');
  protected readonly shareUrl = signal('');
  protected readonly pickerFor = signal<string | null>(null);
  protected readonly pickerQuery = signal('');
  protected readonly renaming = signal<string | null>(null);
  protected readonly confirmDelete = signal<string | null>(null);
  protected readonly confirmClear = signal(false);
  private readonly drag = signal<{ key: string; id: string } | null>(null);
  protected readonly dragId = computed(() => this.drag()?.id ?? null);

  protected readonly atGroupLimit = computed(() => this.fav.state().groups.length >= L.MAX_GROUPS);

  /** Risultati della ricerca per aggiungere strumenti alla lista aperta (esclusi quelli già presenti). */
  protected readonly results = computed<ToolDefinition[]>(() => {
    const key = this.pickerFor();
    if (!key) return [];
    const s = this.fav.state();
    const have = new Set(key === FAV ? s.favorites : (s.groups.find((g) => g.id === key)?.tools ?? []));
    const pool = TOOLS.filter((t) => !have.has(t.id));
    return filterTools(pool, null, this.pickerQuery(), (t) => ({
      title: this.i18n.t(t.titleKey),
      description: this.i18n.t(t.descriptionKey),
    }));
  });
  protected readonly shownResults = computed(() => this.results().slice(0, MAX_RESULTS));

  constructor() {
    this.router.events.pipe(takeUntilDestroyed()).subscribe((e) => {
      if (e instanceof NavigationEnd && this.stripHash) this.removeHash();
    });
    afterNextRender(() => {
      this.readHash();
      const onHash = () => this.readHash();
      addEventListener('hashchange', onHash);
      this.destroyRef.onDestroy(() => removeEventListener('hashchange', onHash));
    });
  }

  protected title(t: ToolDefinition): string {
    return this.i18n.t(t.titleKey);
  }

  protected say(key: string, params?: Record<string, string | number>): void {
    // il testo cambia sempre un po': lo stesso annuncio ripetuto verrebbe ignorato
    this.live.set(this.i18n.t(key, params) + (this.live().endsWith(' ') ? '' : ' '));
  }

  private toolById(id: string): ToolDefinition | undefined {
    return TOOLS.find((t) => t.id === id);
  }

  // ---------- liste (preferiti e gruppi) ----------

  /** Id nell'ordine salvato della lista (anche quelli nascosti in inglese). */
  private ids(key: string): string[] {
    const s = this.fav.state();
    return key === FAV ? s.favorites : (s.groups.find((g) => g.id === key)?.tools ?? []);
  }

  private applyMove(key: string, from: number, to: number): void {
    this.fav.update((s) => (key === FAV ? L.moveFavorite(s, from, to) : L.moveInGroup(s, key, from, to)));
  }

  /** Su/giù con i pulsanti: scambia con il vicino visibile (gli strumenti nascosti restano dove sono). */
  protected move(key: string, visible: readonly ToolDefinition[], index: number, delta: -1 | 1): void {
    const other = visible[index + delta];
    if (!other) return; // già in cima/in fondo (il pulsante resta attivabile da tastiera per il focus)
    const ids = this.ids(key);
    this.applyMove(key, ids.indexOf(visible[index].id), ids.indexOf(other.id));
    this.say('fav.moved', { name: this.title(visible[index]), pos: index + delta + 1, total: visible.length });
  }

  protected removeTool(key: string, t: ToolDefinition): void {
    this.fav.update((s) => (key === FAV ? L.removeFavorite(s, t.id) : L.removeFromGroup(s, key, t.id)));
    this.say('fav.removed', { name: this.title(t) });
  }

  protected addTool(key: string, t: ToolDefinition): void {
    this.fav.update((s, k) => (key === FAV ? L.addFavorite(s, t.id, k) : L.addToGroup(s, key, t.id, k)));
    this.say('fav.added', { name: this.title(t) });
  }

  // trascinamento (HTML5): solo dentro la stessa lista; le frecce restano l'alternativa da tastiera
  protected dragStart(e: DragEvent, key: string, id: string): void {
    this.drag.set({ key, id });
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', id);
    }
  }

  protected dragOver(e: DragEvent, key: string): void {
    if (this.drag()?.key === key) e.preventDefault();
  }

  protected drop(e: DragEvent, key: string, targetId: string): void {
    const d = this.drag();
    this.drag.set(null);
    if (!d || d.key !== key || d.id === targetId) return;
    e.preventDefault();
    const ids = this.ids(key);
    this.applyMove(key, ids.indexOf(d.id), ids.indexOf(targetId));
    const t = this.toolById(d.id);
    if (t) this.say('fav.moved', { name: this.title(t), pos: this.ids(key).indexOf(d.id) + 1, total: ids.length });
  }

  protected dragEnd(): void {
    this.drag.set(null);
  }

  // ---------- ricerca per aggiungere ----------

  protected togglePicker(key: string): void {
    const open = this.pickerFor() === key;
    this.pickerFor.set(open ? null : key);
    this.pickerQuery.set('');
    if (!open) setTimeout(() => document.getElementById('pk-' + key)?.focus());
  }

  protected onPickerInput(e: Event): void {
    this.pickerQuery.set((e.target as HTMLInputElement).value);
  }

  protected onPickerKey(e: KeyboardEvent, key: string): void {
    if (e.key === 'Escape') {
      e.preventDefault();
      this.pickerFor.set(null);
      document.getElementById('pkb-' + key)?.focus();
    }
  }

  // ---------- gruppi ----------

  protected createGroup(input: HTMLInputElement): void {
    const next = L.addGroup(this.fav.state(), input.value);
    if (!next) return;
    this.fav.update(() => next);
    input.value = '';
    input.focus();
  }

  protected startRename(id: string): void {
    this.renaming.set(id);
    this.confirmDelete.set(null);
    setTimeout(() => {
      const el = document.getElementById('rn-' + id) as HTMLInputElement | null;
      el?.focus();
      el?.select();
    });
  }

  protected saveRename(id: string, input: HTMLInputElement): void {
    this.fav.update((s) => L.renameGroup(s, id, input.value));
    this.renaming.set(null);
    setTimeout(() => document.getElementById('rnb-' + id)?.focus());
  }

  protected cancelRename(id: string): void {
    this.renaming.set(null);
    setTimeout(() => document.getElementById('rnb-' + id)?.focus());
  }

  protected moveGroup(index: number, delta: -1 | 1): void {
    if (index + delta < 0 || index + delta >= this.fav.state().groups.length) return;
    this.fav.update((s) => L.moveGroup(s, index, index + delta));
    const g = this.fav.state().groups[index + delta];
    this.live.set(this.i18n.t('fav.moved', { name: g.name, pos: index + delta + 1, total: this.fav.state().groups.length }));
  }

  protected deleteGroup(id: string): void {
    this.fav.update((s) => L.deleteGroup(s, id));
    this.confirmDelete.set(null);
    if (this.pickerFor() === id) this.pickerFor.set(null);
  }

  // ---------- esporta, importa, condividi, cancella ----------

  protected exportJson(): void {
    saveBytes(new Blob([L.exportJson(this.fav.state())], { type: 'application/json' }), 'rrstudio-tools-favorites.json', 'application/json');
  }

  protected async onFile(e: Event): Promise<void> {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // permette di scegliere di nuovo lo stesso file
    if (!file) return;
    this.notice.set(null);
    if (file.size > L.MAX_IMPORT_CHARS * 4) return this.fail('tooBig');
    let text: string;
    try {
      text = await file.text();
    } catch {
      return this.fail('read');
    }
    this.preview(L.parseImport(text, this.fav.known), 'file', file.name);
  }

  private fail(code: string): void {
    this.pending.set(null);
    this.notice.set({ error: true, text: this.i18n.t('fav.err.' + code) });
  }

  private preview(r: L.ImportResult, source: 'link' | 'file', name: string): void {
    if (!r.ok) return this.fail(r.error);
    this.notice.set(null);
    this.importMode.set('merge');
    this.pending.set({ state: r.state, source, name, unknown: r.unknown, trimmed: r.trimmed });
    setTimeout(() => document.getElementById('imp-h')?.focus());
  }

  /** Link di condivisione aperto (#d=…): si mostra l'anteprima e si chiede conferma, mai import automatico. */
  private readHash(): void {
    const data = L.shareFromHash(location.hash);
    if (data === null) return;
    // i dati nell'hash servono una volta sola: si tolgono dall'indirizzo (e dalla cronologia) subito
    this.stripHash = true;
    this.removeHash();
    this.preview(L.decodeShare(data, this.fav.known), 'link', '');
  }

  private removeHash(): void {
    if (L.shareFromHash(location.hash) !== null) history.replaceState(history.state, '', location.pathname + location.search);
  }

  protected confirmImport(): void {
    const p = this.pending();
    if (!p) return;
    if (this.importMode() === 'replace') this.fav.replace(p.state);
    else this.fav.merge(p.state);
    this.pending.set(null);
    this.notice.set({ error: false, text: this.i18n.t('fav.imported') });
  }

  protected cancelImport(): void {
    this.pending.set(null);
  }

  protected makeShare(): void {
    this.notice.set(null);
    if (this.fav.isEmpty()) {
      this.shareUrl.set('');
      this.notice.set({ error: true, text: this.i18n.t('fav.share.empty') });
      return;
    }
    this.shareUrl.set(location.origin + this.i18n.link(FAVORITES_SLUG[this.i18n.lang()]) + '#d=' + L.encodeShare(this.fav.state()));
  }

  protected clearAll(): void {
    this.fav.clear();
    this.confirmClear.set(false);
    this.pending.set(null);
    this.shareUrl.set('');
    this.pickerFor.set(null);
    this.notice.set({ error: false, text: this.i18n.t('fav.cleared') });
  }

  protected previewTitles(ids: readonly string[]): string {
    return ids
      .map((id) => this.toolById(id))
      .filter((t): t is ToolDefinition => !!t)
      .map((t) => this.title(t))
      .join(', ');
  }
}
