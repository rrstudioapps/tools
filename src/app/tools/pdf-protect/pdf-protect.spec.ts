// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 rrstudio — rrstudio tools
import { PDFDocument, PDFName } from 'pdf-lib';
import { ALL_ALLOWED, checkUserPassword, makeEntries, permissionBits, protectPdf } from './pdf-protect';

async function sample(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle('Segreto');
  const font = await doc.embedFont('Helvetica');
  doc.addPage([200, 200]).drawText('riservato', { x: 10, y: 10, font });
  return doc.save();
}

describe('permessi', () => {
  it('tutto consentito: bit riservati a 1 e valore negativo (intero con segno)', () => {
    const p = permissionBits(ALL_ALLOWED);
    expect(p).toBeLessThan(0);
    expect(p & (1 << 2)).toBeTruthy(); // stampa
    expect(p & (1 << 4)).toBeTruthy(); // copia
  });
  it('senza stampa né copia i due bit sono spenti', () => {
    const p = permissionBits({ print: false, copy: false, modify: true, annotate: true });
    expect(p & (1 << 2)).toBe(0);
    expect(p & (1 << 4)).toBe(0);
    expect(p & (1 << 3)).toBeTruthy();
  });
});

describe('voci di cifratura R6', () => {
  it('U ha 48 byte e la password giusta la verifica, quella sbagliata no', async () => {
    const e = await makeEntries({ userPassword: 'segreta', ownerPassword: 'capo', allow: ALL_ALLOWED });
    expect([e.O.length, e.U.length, e.OE.length, e.UE.length, e.Perms.length, e.fileKey.length]).toEqual([48, 48, 32, 32, 16, 32]);
    expect(await checkUserPassword('segreta', e.U)).toBe(true);
    expect(await checkUserPassword('sbagliata', e.U)).toBe(false);
    expect(await checkUserPassword('', e.U)).toBe(false);
  });
  it('senza password per aprire il file si apre con la password vuota', async () => {
    const e = await makeEntries({ userPassword: '', ownerPassword: 'capo', allow: { ...ALL_ALLOWED, copy: false } });
    expect(await checkUserPassword('', e.U)).toBe(true);
  });
});

describe('protectPdf', () => {
  it('rifiuta di non fare nulla (nessuna password e nessun limite)', async () => {
    expect(await protectPdf(await sample(), { userPassword: '', ownerPassword: '', allow: ALL_ALLOWED })).toEqual({ ok: false, error: 'noPassword' });
  });
  it('produce un PDF cifrato: dizionario Encrypt AESV3 e contenuto non in chiaro', async () => {
    const r = await protectPdf(await sample(), { userPassword: 'segreta', ownerPassword: '', allow: ALL_ALLOWED });
    if (!r.ok) throw new Error('no');
    const text = new TextDecoder('latin1').decode(r.bytes);
    expect(text).toContain('/AESV3');
    expect(text).toContain('/Encrypt');
    expect(text).not.toContain('Segreto'); // il titolo (stringa) è cifrato
    // pdf-lib riconosce il file come cifrato
    await expect(PDFDocument.load(r.bytes)).rejects.toThrow(/encrypt/i);
    const doc = await PDFDocument.load(r.bytes, { ignoreEncryption: true });
    expect(doc.getPageCount()).toBe(1);
    expect(doc.context.trailerInfo.Encrypt).toBeTruthy();
    expect(doc.catalog.has(PDFName.of('Pages'))).toBe(true);
  });
});

describe('conformità: pdf.js apre il file con la password giusta', () => {
  it('password giusta apre e legge il testo, password sbagliata no', async () => {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const r = await protectPdf(await sample(), { userPassword: 'segreta', ownerPassword: 'capo', allow: ALL_ALLOWED });
    if (!r.ok) throw new Error('no');
    // ogni caricamento si chiude a fine uso: un tentativo con la password sbagliata lasciato aperto può far
    // uscire un rifiuto non gestito dal worker di pdf.js a test già concluso (intermittente)
    const tasks: { destroy: () => Promise<void> }[] = [];
    const open = (password: string) => {
      const task = pdfjs.getDocument({ data: r.bytes.slice(), password, useWorkerFetch: false, verbosity: 0, disableFontFace: true });
      tasks.push(task);
      return task.promise;
    };
    try {
      const doc = await open('segreta');
      expect(doc.numPages).toBe(1);
      const text = await (await doc.getPage(1)).getTextContent();
      expect(text.items.map((i) => ('str' in i ? i.str : '')).join('')).toBe('riservato');
      await expect(open('sbagliata')).rejects.toMatchObject({ name: 'PasswordException' });
      // anche la password del proprietario apre il file
      expect((await open('capo')).numPages).toBe(1);
    } finally {
      await Promise.allSettled(tasks.map((t) => t.destroy()));
    }
  }, 30000);

  it('i limiti scelti risultano nei permessi letti da pdf.js', async () => {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const r = await protectPdf(await sample(), { userPassword: '', ownerPassword: 'capo', allow: { print: true, copy: false, modify: false, annotate: true } });
    if (!r.ok) throw new Error('no');
    const doc = await pdfjs.getDocument({ data: r.bytes.slice(), password: '', useWorkerFetch: false, verbosity: 0, disableFontFace: true }).promise;
    const perms = (await doc.getPermissions()) ?? [];
    expect(perms).toContain(pdfjs.PermissionFlag.PRINT);
    expect(perms).not.toContain(pdfjs.PermissionFlag.COPY);
    expect(perms).not.toContain(pdfjs.PermissionFlag.MODIFY_CONTENTS);
  }, 30000);
});
