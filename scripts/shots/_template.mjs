// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 rrstudio — rrstudio Tools
// Modello per lo scenario di uno strumento: copialo in scripts/shots/<id>.mjs (senza «_»).
// `screenshots.mjs` lo carica da solo; `ONLY=<id>.png node scripts/screenshots.mjs` esegue solo questa schermata.
// Helper ricevuti: shot(nome, { width, dark, path, setup }), handoffCase(nome, path, run), expectValue(page, selettore, atteso),
// must(condizione, messaggio), base (indirizzo del server di prova).
export default async function ({ shot, expectValue }) {
  await shot('<id>.png', {
    width: 1280,
    dark: false,
    path: '/<id>/',
    setup: async (page) => {
      await page.fill('#<id>-in', 'testo di esempio');
      await expectValue(page, '#<id>-in', 'testo di esempio');
      // interazioni di controllo: lasciano passare ~150 ms dopo un clic prima di leggere il testo (o usa waitForFunction)
    },
  });
}
