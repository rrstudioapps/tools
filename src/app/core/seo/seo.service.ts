// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 rrstudio — rrstudio tools
import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject, signal } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { I18nService, Lang } from '../i18n/i18n.service';
import { Alternate, hasOgImage, hreflangLinks, publicUrl } from '../i18n/lang-routing';
import { SITE_URL } from '../links';
import { CATEGORIES, TOOLS } from '../../tools/tools.registry';

/** Dati SEO di una route (chiavi i18n), da mettere in `data.seo`. */
export interface SeoData {
  titleKey: string;
  descriptionKey: string;
  /** Pagina personale: meta robots noindex, senza canonical né hreflang. */
  noindex?: boolean;
}

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly doc = inject(DOCUMENT);
  private readonly i18n = inject(I18nService);

  private readonly current = signal<{ seo: SeoData; toolId: string | null } | null>(null);

  constructor() {
    this.router.events.subscribe((e) => {
      if (e instanceof NavigationEnd) {
        const root = this.router.routerState.snapshot.root;
        const seo = this.findSeo(root);
        if (seo) this.current.set({ seo, toolId: this.findToolId(root) });
      }
    });
    // Si riapplica anche al cambio lingua
    effect(() => {
      const c = this.current();
      if (!c) return;
      this.apply(c.seo, this.i18n.slug(), this.i18n.lang());
      this.applyAppData(c.toolId, c.seo, this.i18n.slug(), this.i18n.lang());
    });
  }

  private findSeo(snap: ActivatedRouteSnapshot): SeoData | null {
    let found: SeoData | null = (snap.data['seo'] as SeoData | undefined) ?? null;
    for (const child of snap.children) found = this.findSeo(child) ?? found;
    return found;
  }

  private findToolId(snap: ActivatedRouteSnapshot): string | null {
    let found = (snap.data['toolId'] as string | undefined) ?? null;
    for (const child of snap.children) found = this.findToolId(child) ?? found;
    return found;
  }

  /**
   * JSON-LD per tipo di pagina: WebApplication e BreadcrumbList (Home › categoria › strumento) nelle pagine strumento,
   * WebSite nella home. Quelli che non servono alla pagina corrente vengono tolti.
   */
  private applyAppData(toolId: string | null, seo: SeoData, slug: string, lang: Lang): void {
    const tool = toolId ? TOOLS.find((t) => t.id === toolId) : undefined;
    this.setJsonLd('site', slug === '' && !seo.noindex ? this.siteData(lang) : null);
    if (!tool) {
      this.setJsonLd('webapp', null);
      this.setJsonLd('crumbs', null);
      return;
    }
    const category = tool.category === 'dev' ? 'DeveloperApplication' : tool.category === 'media' ? 'MultimediaApplication' : 'UtilitiesApplication';
    this.setJsonLd('webapp', {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: this.i18n.t(tool.titleKey),
      description: this.i18n.t(seo.descriptionKey),
      url: publicUrl(slug, lang),
      applicationCategory: category,
      operatingSystem: 'Any',
      browserRequirements: 'Requires JavaScript',
      isAccessibleForFree: true,
      inLanguage: lang,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
    });
    const cat = CATEGORIES.find((c) => c.id === tool.category);
    const home = publicUrl('', lang);
    const crumbs = [
      { name: this.i18n.t('nav.home'), url: home },
      ...(cat ? [{ name: this.i18n.t(cat.titleKey), url: `${home}#${lang === 'it' ? cat.slug : cat.slugEn}` }] : []),
      { name: this.i18n.t(tool.titleKey), url: publicUrl(slug, lang) },
    ];
    this.setJsonLd('crumbs', {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.url })),
    });
  }

  /** JSON-LD WebSite della home: nome, indirizzo, lingua, editore e ricerca (SearchAction). */
  private siteData(lang: Lang): object {
    return {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'rrstudio tools',
      url: publicUrl('', lang),
      inLanguage: lang,
      publisher: { '@type': 'Organization', name: 'rrstudio', url: SITE_URL },
      // la home legge ?q= e filtra gli strumenti (nel browser, senza richieste di rete)
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: `${publicUrl('', lang)}?q={search_term_string}` },
        'query-input': 'required name=search_term_string',
      },
    };
  }

  /**
   * Inserisce (o sostituisce) uno script JSON-LD identificato da `id`; con `null` lo toglie.
   * Un solo script per id: niente duplicati navigando tra le pagine né ripetendo l'applicazione.
   */
  setJsonLd(id: string, data: object | null): void {
    const domId = `ld-${id}`;
    const head = this.doc.head;
    const existing = head.querySelector<HTMLScriptElement>(`script[type="application/ld+json"]#${domId}`);
    if (!data) {
      existing?.remove();
      return;
    }
    const script = existing ?? this.doc.createElement('script');
    if (!existing) {
      script.setAttribute('type', 'application/ld+json');
      script.setAttribute('id', domId);
      head.appendChild(script);
    }
    // "<" in forma di escape: il testo non può chiudere lo script
    script.textContent = JSON.stringify(data).replace(/</g, '\\u003c');
  }

  private apply(seo: SeoData, slug: string, lang: Lang): void {
    const title = this.i18n.t(seo.titleKey);
    const description = this.i18n.t(seo.descriptionKey);
    const url = publicUrl(slug, lang);
    // Immagine social della pagina corrente (scripts/og-images.mjs); la home e le pagine senza immagine usano quella generica
    const image = hasOgImage(slug, lang) ? `${SITE_URL}/og/${lang}/${slug}.png` : `${SITE_URL}/og-image.png`;
    this.title.setTitle(title);
    const tags: [string, string, 'name' | 'property'][] = [
      ['description', description, 'name'],
      ['og:title', title, 'property'],
      ['og:description', description, 'property'],
      ['og:type', 'website', 'property'],
      ['og:url', url, 'property'],
      ['og:image', image, 'property'],
      ['og:image:width', '1200', 'property'],
      ['og:image:height', '630', 'property'],
      ['og:image:alt', title, 'property'],
      ['og:locale', lang === 'it' ? 'it_IT' : 'en_US', 'property'],
      ['twitter:card', 'summary_large_image', 'name'],
      ['twitter:title', title, 'name'],
      ['twitter:description', description, 'name'],
      ['twitter:image', image, 'name'],
      ['twitter:image:alt', title, 'name'],
    ];
    for (const [key, content, attr] of tags) {
      this.meta.updateTag({ [attr]: key, content }, `${attr}='${key}'`);
    }
    this.setRobots(seo.noindex === true);
    if (seo.noindex) {
      this.doc.head.querySelector('link[rel="canonical"]')?.remove();
      this.setAlternates([]);
      return;
    }
    this.setCanonical(url);
    this.setAlternates(hreflangLinks(slug));
  }

  /** noindex solo per le pagine personali; le altre pagine non hanno il tag. */
  private setRobots(noindex: boolean): void {
    if (noindex) this.meta.updateTag({ name: 'robots', content: 'noindex, follow' }, "name='robots'");
    else this.meta.removeTag("name='robots'");
  }

  private setCanonical(url: string): void {
    let link = this.doc.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.doc.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.doc.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  /** Sostituisce i link hreflang con quelli della pagina corrente. */
  private setAlternates(alts: Alternate[]): void {
    this.doc.head.querySelectorAll('link[rel="alternate"][hreflang]').forEach((l) => l.remove());
    for (const a of alts) {
      const link = this.doc.createElement('link');
      link.setAttribute('rel', 'alternate');
      link.setAttribute('hreflang', a.hreflang);
      link.setAttribute('href', a.href);
      this.doc.head.appendChild(link);
    }
  }
}
