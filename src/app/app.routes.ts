// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 rrstudio — rrstudio tools
import { Route, Routes } from '@angular/router';
import { CHANGELOG_SLUG, FAVORITES_SLUG, SHARE_SLUG } from './core/i18n/lang-routing';
import { ToolFrame } from './shared/tool-frame';
import { TOOLS, ToolDefinition } from './tools/tools.registry';

function toRoute(tool: ToolDefinition): Route {
  const seo = { titleKey: tool.seo.titleKey, descriptionKey: tool.seo.descriptionKey };
  // Route padre con la cornice comune (stella dei preferiti); la pagina vera è il figlio con path vuoto,
  // che eredita i dati (seo, toolId, routeData) dal padre.
  return {
    path: tool.path,
    component: ToolFrame,
    data: { seo, toolId: tool.id, ...tool.routeData },
    children: [
      tool.loadChildren
        ? { path: '', loadChildren: tool.loadChildren }
        : { path: '', loadComponent: tool.loadComponent },
    ],
  };
}

const HOME: Route = {
  path: '',
  pathMatch: 'full',
  loadComponent: () => import('./pages/home').then((m) => m.Home),
  data: { seo: { titleKey: 'seo.home.title', descriptionKey: 'seo.home.desc' } },
};

const PRIVACY: Route = {
  path: 'privacy',
  loadComponent: () => import('./pages/privacy').then((m) => m.Privacy),
  data: { seo: { titleKey: 'seo.privacy.title', descriptionKey: 'seo.privacy.desc' } },
};

const TUTORIAL: Route = {
  path: 'tutorial',
  loadComponent: () => import('./pages/tutorial').then((m) => m.Tutorial),
  data: { seo: { titleKey: 'seo.tutorial.title', descriptionKey: 'seo.tutorial.desc' } },
};

/** Pagina personale dei preferiti: /preferiti e /en/favorites (noindex, fuori dalla sitemap). */
const favoritesRoute = (lang: 'it' | 'en'): Route => ({
  path: FAVORITES_SLUG[lang],
  loadComponent: () => import('./pages/favorites').then((m) => m.FavoritesPage),
  data: { seo: { titleKey: 'seo.favorites.title', descriptionKey: 'seo.favorites.desc', noindex: true } },
});

/** Novità del sito: /novita e /en/changelog (indicizzata, in sitemap con hreflang). */
const changelogRoute = (lang: 'it' | 'en'): Route => ({
  path: CHANGELOG_SLUG[lang],
  loadComponent: () => import('./pages/changelog').then((m) => m.ChangelogPage),
  data: { seo: { titleKey: 'seo.changelog.title', descriptionKey: 'seo.changelog.desc' } },
});

/** Ricezione dei contenuti condivisi dal sistema e dei file aperti con l'app: /condividi e /en/share (noindex, fuori dalla sitemap). */
const shareRoute = (lang: 'it' | 'en'): Route => ({
  path: SHARE_SLUG[lang],
  loadComponent: () => import('./pages/share').then((m) => m.SharePage),
  data: { seo: { titleKey: 'seo.share.title', descriptionKey: 'seo.share.desc', noindex: true } },
});

/**
 * Route generate dal registry dei tool, più la home. La radice è italiana; la versione inglese
 * sta sotto /en/ con gli stessi slug (anche gli strumenti per l'Italia, che hanno slug italiani).
 */
export const routes: Routes = [
  HOME,
  ...TOOLS.map(toRoute),
  PRIVACY,
  TUTORIAL,
  favoritesRoute('it'),
  changelogRoute('it'),
  shareRoute('it'),
  {
    path: 'en',
    children: [
      HOME,
      ...TOOLS.map(toRoute),
      PRIVACY,
  TUTORIAL,
      favoritesRoute('en'),
      changelogRoute('en'),
      shareRoute('en'),
      // /en/<sconosciuto> → home inglese
      { path: '**', redirectTo: '/en' },
    ],
  },
  { path: '**', redirectTo: '' },
];
