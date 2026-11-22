// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 rrstudio — rrstudio tools
import { PDFDocument, PDFName, PDFString, StandardFonts, degrees } from 'pdf-lib';
import { detectEncryption, groupPages, headerVersionOf, inspectPdf, pdfDateToIso, permissionsFromP, recognizeFormat } from './pdf-inspector';

const enc = (s: string): Uint8Array => new TextEncoder().encode(s);

describe('formati e pagine', () => {
  it('riconosce A4, Letter e altri, in entrambi gli orientamenti', () => {
    expect(recognizeFormat(210, 297)).toBe('A4');
    expect(recognizeFormat(297.1, 209.9)).toBe('A4');
    expect(recognizeFormat(215.9, 279.4)).toBe('Letter');
    expect(recognizeFormat(215.9, 355.6)).toBe('Legal');
    expect(recognizeFormat(148, 210)).toBe('A5');
    expect(recognizeFormat(100, 100)).toBeNull();
  });
  it('raggruppa le pagine uguali e scambia le misure con la rotazione', () => {
    const a4 = { width: 595.28, height: 841.89, rotation: 0 };
    const g = groupPages([a4, a4, { ...a4, rotation: 90 }, { width: 612, height: 792, rotation: 0 }]);
    expect(g.map((x) => [x.from, x.to, x.format, x.rotation, x.landscape])).toEqual([
      [1, 2, 'A4', 0, false],
      [3, 3, 'A4', 90, true],
      [4, 4, 'Letter', 0, false],
    ]);
    expect(g[0].widthMm).toBe(210);
    expect(g[0].heightMm).toBe(297);
    expect(groupPages([])).toEqual([]);
  });
});

describe('versione, date, permessi', () => {
  it('legge la versione dall\'intestazione, anche con byte prima', () => {
    expect(headerVersionOf(enc('%PDF-1.7\n...'))).toBe('1.7');
    expect(headerVersionOf(enc('xx\n%PDF-2.0\n'))).toBe('2.0');
    expect(headerVersionOf(enc('niente'))).toBeNull();
  });
  it('converte le date PDF in ISO', () => {
    expect(pdfDateToIso("D:20260102030405+01'00'")).toBe('2026-01-02T02:04:05.000Z');
    expect(pdfDateToIso('D:2026')).toBe('2026-01-01T00:00:00.000Z');
    expect(pdfDateToIso('boh')).toBe('');
    expect(pdfDateToIso(undefined)).toBe('');
  });
  it('permessi dal valore /P', () => {
    expect(permissionsFromP(-4)).toEqual({ print: true, modify: true, copy: true, annotate: true, fillForms: true, accessibility: true, assemble: true, printHq: true });
    const p = permissionsFromP(-8);
    expect(p.print).toBe(false);
    expect(p.printHq).toBe(true);
    expect(permissionsFromP(4 + 16).print && permissionsFromP(4 + 16).copy).toBe(true);
    expect(permissionsFromP(4 + 16).modify).toBe(false);
  });
});

describe('cifratura', () => {
  it('file normale: nessuna cifratura', async () => {
    const doc = await PDFDocument.create();
    doc.addPage();
    expect(detectEncryption(await doc.save())).toBeNull();
  });
  it('trailer con /Encrypt indiretto AES-256 e permessi', () => {
    const txt = '%PDF-1.7\n5 0 obj\n<< /Filter /Standard /V 5 /R 6 /Length 256 /P -8 /CF << /StdCF << /CFM /AESV3 >> >> >>\nendobj\ntrailer\n<< /Size 6 /Encrypt 5 0 R /Root 1 0 R >>\nstartxref\n0\n%%EOF';
    const e = detectEncryption(enc(txt))!;
    expect([e.version, e.revision, e.algorithm, e.keyBits]).toEqual([5, 6, 'aes-256', 256]);
    expect(e.permissions!.print).toBe(false); // -8 = ...1111 1000: bit 3 (stampa) spento, bit 4 (modifica) acceso
    expect(e.permissions!.modify).toBe(true);
    expect(e.metadataEncrypted).toBe(true);
  });
  it('dizionario diretto RC4 a 128 bit senza metadati cifrati; /Encrypt citato altrove non basta', () => {
    const e = detectEncryption(enc('%PDF-1.4\ntrailer\n<< /Encrypt << /Filter /Standard /V 2 /R 3 /Length 128 /P -4 /EncryptMetadata false >> /Root 1 0 R >>\nstartxref\n0\n%%EOF'))!;
    expect([e.algorithm, e.keyBits, e.metadataEncrypted]).toEqual(['rc4-128', 128, false]);
    expect(detectEncryption(enc('%PDF-1.4\n(testo con /Encrypt e basta)\n%%EOF'))).toBeNull();
  });
  it('AES-128 (V4 con CFM AESV2) e RC4 40 bit', () => {
    expect(detectEncryption(enc('x\n7 0 obj\n<< /Filter /Standard /V 4 /R 4 /P -4 /CF << /StdCF << /CFM /AESV2 >> >> >>\nendobj\n<< /Encrypt 7 0 R >>'))!.algorithm).toBe('aes-128');
    expect(detectEncryption(enc('x\n<< /Encrypt << /Filter /Standard /V 1 /R 2 /P -4 >> >>'))!.algorithm).toBe('rc4-40');
  });
});

describe('ispezione di un PDF', () => {
  it('struttura, pagine, font, metadati, annotazioni', async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const p1 = doc.addPage([595.28, 841.89]);
    p1.drawText('ciao', { x: 10, y: 10, font });
    const p2 = doc.addPage([612, 792]);
    p2.setRotation(degrees(90));
    doc.setTitle('Titolo di prova');
    doc.setAuthor('Autrice');
    const link = doc.context.obj({ Type: 'Annot', Subtype: 'Link', Rect: [0, 0, 10, 10] });
    p1.node.set(PDFName.of('Annots'), doc.context.obj([doc.context.register(link)]));
    doc.catalog.set(PDFName.of('Lang'), PDFString.of('it-IT'));
    const r = await inspectPdf(await doc.save());
    if (r.status !== 'ok') throw new Error('no');
    const rep = r.report;
    expect(rep.pages).toBe(2);
    expect(rep.groups.map((g) => g.format)).toEqual(['A4', 'Letter']);
    expect(rep.groups[1].rotation).toBe(90);
    expect(rep.groups[1].landscape).toBe(true);
    expect(rep.fonts).toEqual([{ name: 'Helvetica', type: 'Type1', embedded: false, subset: false }]);
    expect(rep.metadata?.title).toBe('Titolo di prova');
    expect(rep.metadata?.author).toBe('Autrice');
    expect(rep.annotations).toEqual({ total: 1, byType: { Link: 1 } });
    expect(rep.attachments).toBe(0);
    expect(rep.form).toEqual({ fields: 0, xfa: false });
    expect(rep.outlines).toBe(false);
    expect(rep.encryption).toBeNull();
    expect(rep.language).toBe('it-IT');
    expect(rep.headerVersion).toMatch(/^1\.\d$/);
    expect(rep.sizeBytes).toBeGreaterThan(100);
  });
  it('conta i campi del modulo', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage();
    const form = doc.getForm();
    form.createTextField('nome').addToPage(page, { x: 10, y: 10, width: 100, height: 20 });
    form.createCheckBox('ok').addToPage(page, { x: 10, y: 50, width: 20, height: 20 });
    const r = await inspectPdf(await doc.save());
    if (r.status !== 'ok') throw new Error('no');
    expect(r.report.form).toEqual({ fields: 2, xfa: false });
    expect(r.report.annotations?.byType).toEqual({ Widget: 2 });
  });
  it('file non PDF: non valido', async () => {
    expect(await inspectPdf(enc('questo non è un pdf'))).toEqual({ status: 'invalid' });
    expect(await inspectPdf(new Uint8Array())).toEqual({ status: 'invalid' });
  });
});
