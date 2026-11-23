// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 rrstudio — rrstudio tools
import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CHANGELOG, ChangeEntry, ChangeKind } from '../core/changelog';
import { FEED_PATH, KIND_ORDER, formatDay } from '../core/changelog.logic';
import { I18nService } from '../core/i18n/i18n.service';
import { REPO_URL, SITE_URL } from '../core/links';
import { SegmentOption, Segmented } from '../shared/segmented';
import { feedbackUrl } from '../shared/tool-feedback-url';
import { TOOLS, ToolDefinition } from '../tools/tools.registry';

type Filter = 'all' | ChangeKind;

interface EntryView {
  kind: ChangeKind;
  text: string;
  tools: { id: string; name: string; path: string | null }[];
  issues: { n: number; url: string }[];
}

/** Pagina Novità (/novita, /en/changelog): versioni del sito con filtro per tipo e feed Atom. */
@Component({
  selector: 'app-changelog',
  imports: [RouterLink, Segmented],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './changelog.html',
  styleUrl: './changelog.scss',
})
export class ChangelogPage {
  protected readonly i18n = inject(I18nService);
  private readonly doc = inject(DOCUMENT);

  protected readonly filter = signal<Filter>('all');
  protected readonly filters = computed<SegmentOption<Filter>[]>(() => [
    { value: 'all', label: this.i18n.t('changelog.filter.all') },
    ...KIND_ORDER.map((k) => ({ value: k as Filter, label: this.i18n.t('changelog.filter.' + k) })),
  ]);

  protected readonly versions = computed(() => {
    const lang = this.i18n.lang();
    const f = this.filter();
    return CHANGELOG.map((v) => ({
      date: v.date,
      label: formatDay(v.date, lang),
      title: v.title[lang],
      entries: v.entries.filter((e) => f === 'all' || e.kind === f).map((e) => this.view(e)),
    })).filter((v) => v.entries.length > 0);
  });

  protected readonly feedUrl = computed(() => '/' + FEED_PATH[this.i18n.lang()]);
  protected readonly bugUrl = computed(() => feedbackUrl('bug', { slug: this.i18n.slug(), lang: this.i18n.lang() }));
  protected readonly ideaUrl = computed(() => feedbackUrl('enhancement', { slug: this.i18n.slug(), lang: this.i18n.lang() }));

  constructor() {
    // <link rel="alternate" type="application/atom+xml"> nella head, nella lingua della pagina (anche nel prerender)
    effect(() => {
      this.removeFeedLink();
      const link = this.doc.createElement('link');
      link.setAttribute('rel', 'alternate');
      link.setAttribute('type', 'application/atom+xml');
      link.setAttribute('title', this.i18n.t('changelog.feed'));
      link.setAttribute('href', SITE_URL + this.feedUrl());
      link.setAttribute('data-changelog-feed', '');
      this.doc.head.appendChild(link);
    });
    inject(DestroyRef).onDestroy(() => this.removeFeedLink());
  }

  private removeFeedLink(): void {
    this.doc.head.querySelectorAll('link[data-changelog-feed]').forEach((l) => l.remove());
  }

  private view(e: ChangeEntry): EntryView {
    const lang = this.i18n.lang();
    return {
      kind: e.kind,
      text: e[lang],
      tools: (e.toolIds ?? [])
        .map((id) => TOOLS.find((t) => t.id === id))
        .filter((t): t is ToolDefinition => !!t)
        .map((t) => ({
          id: t.id,
          name: this.i18n.t(t.titleKey),
          // gli strumenti solo italiani non hanno la pagina inglese: niente link
          path: this.i18n.link(t.path),
        })),
      issues: (e.issues ?? []).map((n) => ({ n, url: `${REPO_URL}/issues/${n}` })),
    };
  }
}
