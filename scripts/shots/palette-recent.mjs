// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 rrstudio — rrstudio Tools
// Palette Ctrl/⌘+K: i recenti sono spenti di default, si accendono dall'interruttore nella pagina Preferiti e spegnendoli si cancellano.
export default async function ({ handoffCase, must, base }) {
  await handoffCase('palette: recenti con interruttore', '/preferiti/', async (page) => {
    const keys = () => page.evaluate(() => [localStorage.getItem('rrtools.recentOn'), localStorage.getItem('rrtools.recent')]);
    const openPalette = async () => {
      await page.locator('#main').focus();
      await page.keyboard.press('Control+k');
      await page.getByRole('dialog', { name: 'Cerca uno strumento' }).waitFor();
    };
    const toggle = page.getByTestId('recent-toggle');
    await toggle.waitFor();
    must(!(await toggle.isChecked()), 'i recenti dovrebbero essere spenti di default');
    // spenti: aprire uno strumento dalla ricerca non salva niente
    await openPalette();
    await page.getByRole('combobox', { name: /Cerca uno strumento/ }).fill('uuid');
    await page.keyboard.press('Enter');
    await page.waitForURL('**/uuid-generator');
    const off = await keys();
    must(off[0] === null && off[1] === null, 'con i recenti spenti non deve restare niente nello storage');
    // accesi: il nome interno dello strumento aperto finisce nello storage e compare tra i «Recenti»
    await page.goto(base + '/preferiti/');
    await page.getByTestId('recent-toggle').check();
    await openPalette();
    await page.getByRole('combobox', { name: /Cerca uno strumento/ }).fill('hash');
    await page.keyboard.press('Enter');
    await page.waitForURL('**/hash-generator');
    const on = await keys();
    must(on[0] === '1' && !!on[1] && on[1].includes('hash'), 'con i recenti accesi lo strumento aperto deve essere salvato');
    await page.locator('#main').focus();
    await page.keyboard.press('Control+k');
    const dlg = page.getByRole('dialog', { name: 'Cerca uno strumento' });
    await dlg.waitFor();
    await dlg.getByText('Recenti', { exact: true }).waitFor();
    await page.keyboard.press('Escape');
    // spegnendoli si cancellano
    await page.goto(base + '/preferiti/');
    await page.getByTestId('recent-toggle').uncheck();
    const gone = await keys();
    must(gone[0] === null && gone[1] === null, 'spegnere l\'interruttore deve cancellare i recenti');
  });
}
