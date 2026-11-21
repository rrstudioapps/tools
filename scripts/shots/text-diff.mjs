// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 rrstudio — rrstudio Tools
// Confronto testi: il contatore «Differenza n di n» sta nella riga dei controlli, in alto a destra.
export default async function ({ shot, must }) {
  await shot('text-diff-position.png', {
    width: 1280,
    dark: false,
    path: '/text-diff/',
    setup: async (page) => {
      await page.fill('#diff-a', 'uno\ndue\ntre');
      await page.fill('#diff-b', 'uno\ndue modificata\ntre');
      await page.getByTestId('diff-next').click();
      await page.getByTestId('diff-position').getByText(/1 di \d+/).waitFor();
      const pos = await page.getByTestId('diff-position').boundingBox();
      const wrap = await page.locator('label.check', { hasText: 'A capo' }).boundingBox();
      must(pos && wrap && Math.abs(pos.y - wrap.y) < 20, 'il contatore non sta sulla riga dei controlli');
    },
  });
}
