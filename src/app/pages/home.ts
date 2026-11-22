// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 rrstudio — rrstudio tools
import { feedbackUrl } from '../shared/tool-feedback-url';
import { Location, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BuildDay } from '../core/build-day';
import { newToolIds } from '../core/changelog.logic';
import { FavoritesService } from '../core/favorites/favorites.service';
import { FAVORITES_SLUG } from '../core/i18n/lang-routing';
import { I18nService } from '../core/i18n/i18n.service';
import { FavoriteButton } from '../shared/favorite-button';
import { SmartIntake } from '../shared/smart-intake';
import { CATEGORIES, TOOLS, ToolCategory, ToolDefinition } from '../tools/tools.registry';
import { FAV_FILTER_SLUG, HomeFilter, filterTools, groupByCategory, homeFilterFromUrl } from './tool-filter';

interface Pill {
  id: HomeFilter;
  label: string;
  count: number;
}

@Component({
  selector: 'app-home',
  imports: [RouterLink, NgTemplateOutlet, FavoriteButton, SmartIntake],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  protected readonly i18n = inject(I18nService);
  protected readonly favs = inject(FavoritesService);
  private readonly location = inject(Location);
  /** Strumenti nuovi (ultimi 30 giorni dalla data di build, fissata dal prerender): badge «Nuovo» sulla card. */
  protected readonly newIds = newToolIds(inject(BuildDay).day);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');
  /** ⌘K su Mac, Ctrl+K altrove: solo per il suggerimento mostrato accanto alla ricerca. */
  protected readonly modKey = signal('Ctrl');

  /** In /en/ niente strumenti italyOnly né la loro categoria: restano in una riga discreta in fondo. */
  protected readonly suggest = computed(() => feedbackUrl('new-tool', { slug: '', lang: this.i18n.lang() }));
  protected readonly english = computed(() => this.i18n.lang() === 'en');
  protected readonly italyTools: readonly ToolDefinition[] = TOOLS.filter((t) => t.italyOnly);
  private readonly shownTools = computed(() => (this.english() ? TOOLS.filter((t) => !t.italyOnly) : TOOLS));
  private readonly shownCategories = computed(() =>
    this.english() ? CATEGORIES.filter((c) => TOOLS.some((t) => !t.italyOnly && t.category === c.id)) : CATEGORIES,
  );

  /** Ordine di visualizzazione = ordine delle categorie: dà anche la numerazione 01, 02… */
  protected readonly ordered = computed(() =>
    groupByCategory(this.shownTools(), this.shownCategories()).flatMap((g) => g.tools),
  );
  protected readonly total = computed(() => this.ordered().length);
  protected readonly numbers = computed(() => new Map(this.ordered().map((t, i) => [t.id, i + 1])));

  /** Il filtro si applica solo nel browser, dopo l'idratazione: il prerender mostra tutto (SEO). */
  private readonly ready = signal(false);
  private readonly urlCategory = signal<HomeFilter>(null);
  protected readonly query = signal('');
  protected readonly category = computed(() => (this.ready() ? this.urlCategory() : null));

  private readonly matches = computed(() => {
    const q = this.ready() ? this.query() : '';
    return filterTools(this.ordered(), null, q, (t) => ({
      title: this.i18n.t(t.titleKey),
      description: this.i18n.t(t.descriptionKey),
    }));
  });

  /** Strumenti dell'utente (preferiti + menu personalizzati) che rispettano la ricerca. */
  private readonly matchIds = computed(() => new Set(this.matches().map((t) => t.id)));
  protected readonly favList = computed(() => this.favs.favoriteTools().filter((t) => this.matchIds().has(t.id)));
  protected readonly favGroups = computed(() =>
    this.favs.groups().map((g) => ({ ...g, tools: g.tools.filter((t) => this.matchIds().has(t.id)) })),
  );
  private readonly favCount = computed(
    () => new Set([...this.favList(), ...this.favGroups().flatMap((g) => g.tools)].map((t) => t.id)).size,
  );
  /** Il filtro "Preferiti" compare se l'utente ha almeno un preferito (o un menu non vuoto), o se è già attivo. */
  private readonly hasFavs = computed(
    () =>
      this.favs.ready() &&
      (this.favs.favoriteTools().length > 0 || this.favs.groups().some((g) => g.tools.length > 0) || this.urlCategory() === 'fav'),
  );

  protected readonly pills = computed<Pill[]>(() => {
    const m = this.matches();
    return [
      { id: null, label: this.i18n.t('home.filter.all'), count: m.length },
      ...(this.hasFavs() ? [{ id: 'fav' as const, label: this.i18n.t('home.filter.fav'), count: this.favCount() }] : []),
      ...this.shownCategories().map((c) => ({
        id: c.id,
        label: this.i18n.t(c.shortKey),
        count: m.filter((t) => t.category === c.id).length,
      })),
    ];
  });

  protected readonly sections = computed(() => {
    const cat = this.category();
    if (cat === 'fav') return [];
    return groupByCategory(
      this.matches().filter((t) => cat === null || t.category === cat),
      this.shownCategories(),
    );
  });

  /** Preferiti e menu personalizzati in cima: solo nel browser (mai nel prerender), senza filtri attivi e se non vuoti. */
  protected readonly showFavs = computed(() => this.favs.ready() && (!this.filtering() || this.category() === 'fav'));
  protected readonly favFilter = computed(() => this.category() === 'fav');
  protected readonly favSlug = computed(() => FAVORITES_SLUG[this.i18n.lang()]);

  protected readonly resultCount = computed(() =>
    this.favFilter() ? this.favCount() : this.sections().reduce((n, g) => n + g.tools.length, 0),
  );
  protected readonly filtering = computed(() => this.category() !== null || this.query().trim() !== '');
  protected readonly resultText = computed(() => {
    if (!this.filtering()) return '';
    const n = this.resultCount();
    return n === 0
      ? this.i18n.t('home.empty')
      : this.i18n.t(n === 1 ? 'home.results.one' : 'home.results', { n });
  });

  constructor() {
    afterNextRender(() => {
      // stato iniziale: dall'URL con cui si è arrivati
      const snap = this.route.snapshot;
      const param = snap.queryParamMap.get('categoria') ?? snap.queryParamMap.get('category');
      const slugUrl = '/?' + (param ? 'categoria=' + param : '') + (snap.fragment ? '#' + snap.fragment : '');
      this.urlCategory.set(homeFilterFromUrl(slugUrl));
      // ?q=testo: ricerca precompilata (è l'indirizzo dichiarato dalla SearchAction dei dati strutturati)
      const q = snap.queryParamMap.get('q');
      if (q) this.query.set(q.slice(0, 100));
      this.ready.set(true);
      if (/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) this.modKey.set('⌘');
      // scorciatoie: "/" e Ctrl/⌘+K portano il focus sulla ricerca (non se si sta già scrivendo in un campo)
      const onKey = (e: KeyboardEvent) => {
        const input = this.searchInput()?.nativeElement;
        if (!input || e.defaultPrevented) return;
        const isK = (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'k';
        const isSlash = e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && !this.isTyping(e.target);
        if (!isK && !isSlash) return;
        e.preventDefault();
        input.focus();
        input.select();
      };
      document.addEventListener('keydown', onKey);
      this.destroyRef.onDestroy(() => document.removeEventListener('keydown', onKey));
    });
    // tasto indietro/avanti: il router non vede gli URL scritti con location.go, ci pensiamo noi
    const sub = this.location.subscribe((e) => this.urlCategory.set(homeFilterFromUrl(e.url ?? '')));
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  protected select(id: HomeFilter): void {
    if (id === this.urlCategory()) return;
    this.urlCategory.set(id);
    // location.go aggiunge una voce alla cronologia senza far scattare la navigazione del router
    // (che riporterebbe la pagina in cima a ogni clic sui filtri)
    const cat = CATEGORIES.find((c) => c.id === id);
    // ?categoria=slug nelle pagine italiane, ?category=slug in quelle inglesi
    const slug = id === 'fav' ? FAV_FILTER_SLUG[this.i18n.lang()] : this.english() ? cat?.slugEn : cat?.slug;
    const query = !slug ? '' : this.english() ? `category=${slug}` : `categoria=${slug}`;
    this.location.go(this.i18n.link(''), query);
  }

  protected onSearch(e: Event): void {
    this.query.set((e.target as HTMLInputElement).value);
  }

  /** Esc nella ricerca la svuota. */
  protected onSearchKey(e: KeyboardEvent): void {
    if (e.key === 'Escape' && this.query() !== '') {
      e.preventDefault();
      this.query.set('');
      (e.target as HTMLInputElement).value = '';
    }
  }

  private isTyping(t: EventTarget | null): boolean {
    const el = t as HTMLElement | null;
    return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
  }

  protected reset(): void {
    this.query.set('');
    this.select(null);
  }

  protected anchor(c: ToolCategory): string {
    return this.english() ? c.slugEn : c.slug;
  }

  protected title(c: ToolCategory): string {
    return this.i18n.t(c.titleKey);
  }
}
