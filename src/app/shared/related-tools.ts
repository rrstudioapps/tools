// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 rrstudio — rrstudio tools
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../core/i18n/i18n.service';
import { relatedTools } from '../core/related-tools';
import { TOOLS } from '../tools/tools.registry';

/**
 * «Strumenti correlati» in fondo a ogni strumento: collegamenti veri (utili a chi legge e a chi indicizza il sito)
 * verso gli strumenti affini della stessa categoria. Sceglie `relatedTools`, quindi l'elenco è sempre lo stesso.
 */
@Component({
  selector: 'app-related-tools',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (items().length > 0) {
      <nav class="container related" [attr.aria-label]="i18n.t('related.title')">
        <h2 class="eyebrow">{{ i18n.t('related.title') }}</h2>
        <ul>
          @for (t of items(); track t.id) {
            <li>
              <a [routerLink]="i18n.link(t.path)">{{ i18n.t(t.titleKey) }}</a>
            </li>
          }
        </ul>
      </nav>
    }
  `,
  styles: `
    .related {
      margin-block: var(--space-6);
    }
    ul {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      margin: var(--space-3) 0 0;
      padding: 0;
      list-style: none;
    }
    a {
      display: inline-block;
      padding: 6px var(--space-4);
      border: 1px solid var(--line);
      border-radius: var(--radius-pill);
      color: var(--ink);
      font-size: var(--fs-sm);
      text-decoration: none;
      &:hover {
        border-color: var(--ink);
      }
    }
    @media print {
      .related {
        display: none;
      }
    }
  `,
})
export class RelatedTools {
  protected readonly i18n = inject(I18nService);
  readonly toolId = input.required<string>();
  protected readonly items = computed(() => {
    const current = TOOLS.find((t) => t.id === this.toolId());
    return current ? relatedTools(current, TOOLS) : [];
  });
}
