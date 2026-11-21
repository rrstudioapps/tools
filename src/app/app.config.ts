// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 rrstudio — rrstudio tools
import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideClientHydration } from '@angular/platform-browser';
import { routes } from './app.routes';
import { I18nService } from './core/i18n/i18n.service';
import { provideToolsPalette } from './shared/command-palette.config';
import { SeoService } from './core/seo/seo.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideToolsPalette(),
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
    provideClientHydration(),
    // lingua e SEO ascoltano il router fin dalla prima navigazione (anche nel prerender)
    provideAppInitializer(() => {
      inject(I18nService);
      inject(SeoService);
    }),
  ],
};
