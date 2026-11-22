// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 rrstudio — rrstudio tools
import { CHANGELOG, ChangeKind, ChangelogVersion } from './changelog';
import { CHANGELOG_SLUG, Lang, publicUrl } from './i18n/lang-routing';
import { SITE_NAME, SITE_URL } from './links';
import { TOOLS } from '../tools/tools.registry';

/** Per quanti giorni uno strumento nuovo mostra il badge «Nuovo». */
export const NEW_TOOL_DAYS = 30;
/** Tetto ai badge «Nuovo»: se in un giorno escono più strumenti, lo portano i più recenti (le voci stanno dalla più recente). */
export const MAX_NEW_BADGES = 12;
/** Numero di versioni nel feed. */
export const FEED_VERSIONS = 20;

/** Percorso (sotto la radice del sito) del feed Atom di ogni lingua. */
export const FEED_PATH: Record<Lang, string> = { it: 'changelog.xml', en: 'changelog.en.xml' };

const DAY_MS = 86_400_000;

/** Giorni interi tra due date AAAA-MM-GG (calcolo in UTC: nessun fuso, nessun orario). */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) / DAY_MS);
}

/** Giorno corrente AAAA-MM-GG (UTC) di un istante. */
export function isoDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * Id degli strumenti aggiunti negli ultimi `days` giorni, in base al campo `added` (AAAA-MM-GG) del registry.
 * Una data futura rispetto a `today` non conta. Al massimo `max` id: i più recenti, a parità di data nell'ordine del registry.
 */
export function newToolIds(
  today: string,
  days = NEW_TOOL_DAYS,
  tools: readonly { id: string; added: string }[] = TOOLS,
  max = MAX_NEW_BADGES,
): Set<string> {
  const recent = tools
    .map((t) => ({ id: t.id, age: daysBetween(t.added, today) }))
    .filter((t) => t.age >= 0 && t.age < days)
    .sort((a, b) => a.age - b.age); // sort stabile: a parità di giorno resta l'ordine del registry
  return new Set(recent.slice(0, max).map((t) => t.id));
}

/** Data più recente del changelog (riferimento quando non c'è altra data di build). */
export const latestChangelogDay = (log: readonly ChangelogVersion[] = CHANGELOG): string => log[0].date;

/** Data lunga nella lingua, da AAAA-MM-GG: "18 novembre 2026" / "18 November 2026". */
export function formatDay(day: string, lang: Lang): string {
  return new Intl.DateTimeFormat(lang === 'it' ? 'it-IT' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(day + 'T00:00:00Z'));
}

export const KIND_ORDER: readonly ChangeKind[] = ['new-tool', 'feature', 'improvement', 'fix'];

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Feed Atom di una lingua: ultime 20 versioni, testo semplice, nessun tracciamento. `kindLabel` dà l'etichetta del tipo. */
export function buildFeed(lang: Lang, kindLabel: (k: ChangeKind) => string, log: readonly ChangelogVersion[] = CHANGELOG): string {
  const page = publicUrl(CHANGELOG_SLUG[lang], lang);
  const self = `${SITE_URL}/${FEED_PATH[lang]}`;
  const versions = log.slice(0, FEED_VERSIONS);
  const items = versions.map((v) => {
    const list = v.entries.map((e) => `<li><strong>${esc(kindLabel(e.kind))}</strong>: ${esc(e[lang])}</li>`).join('');
    return (
      '  <entry>\n' +
      `    <id>${page}#${v.date}</id>\n` +
      `    <title>${esc(v.title[lang])}</title>\n` +
      `    <updated>${v.date}T00:00:00Z</updated>\n` +
      `    <link rel="alternate" type="text/html" href="${page}#v-${v.date}"/>\n` +
      `    <content type="html">${esc(`<ul>${list}</ul>`)}</content>\n` +
      '  </entry>'
    );
  });
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<!-- SPDX-License-Identifier: AGPL-3.0-or-later · © 2026 rrstudio — rrstudio tools -->\n' +
    `<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="${lang}">\n` +
    `  <id>${page}</id>\n` +
    `  <title>${SITE_NAME}: ${lang === 'it' ? 'Novità' : "What's new"}</title>\n` +
    `  <updated>${versions[0].date}T00:00:00Z</updated>\n` +
    `  <link rel="self" type="application/atom+xml" href="${self}"/>\n` +
    `  <link rel="alternate" type="text/html" href="${page}"/>\n` +
    '  <author><name>rrstudio</name></author>\n' +
    items.join('\n') +
    '\n</feed>\n'
  );
}
