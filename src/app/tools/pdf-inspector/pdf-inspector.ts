// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 rrstudio — rrstudio tools
import type { PDFArray, PDFDict, PDFDocument } from 'pdf-lib';

/**
 * Ispettore PDF: raccoglie le caratteristiche di un file senza modificarlo.
 * - Il file non cifrato si legge con pdf-lib (struttura, font, annotazioni, moduli, allegati).
 * - Il file cifrato non si può leggere con pdf-lib: cifratura e permessi si ricavano dal dizionario /Encrypt
 *   nei byte del file, e le pagine con pdf.js (prima senza password, poi con quella data, usata solo per aprire).
 */

export const MM_PER_PT = 25.4 / 72;
/** Scarto massimo (mm) per riconoscere un formato di carta. */
const TOLERANCE_MM = 2;

export const FORMATS: readonly (readonly [string, number, number])[] = [
  ['A0', 841, 1189],
  ['A1', 594, 841],
  ['A2', 420, 594],
  ['A3', 297, 420],
  ['A4', 210, 297],
  ['A5', 148, 210],
  ['A6', 105, 148],
  ['B4', 250, 353],
  ['B5', 176, 250],
  ['Letter', 215.9, 279.4],
  ['Legal', 215.9, 355.6],
  ['Tabloid', 279.4, 431.8],
  ['Executive', 184.2, 266.7],
];

export const PERMISSIONS = {
  print: 3,
  modify: 4,
  copy: 5,
  annotate: 6,
  fillForms: 9,
  accessibility: 10,
  assemble: 11,
  printHq: 12,
} as const;
export type PermissionKey = keyof typeof PERMISSIONS;

export type EncryptionAlgorithm = 'rc4-40' | 'rc4-128' | 'aes-128' | 'aes-256' | 'unknown';

export interface EncryptionInfo {
  version: number | null;
  revision: number | null;
  algorithm: EncryptionAlgorithm;
  keyBits: number | null;
  /** Permessi dichiarati nel file (valgono per chi apre con la password utente), null se il valore /P non si legge. */
  permissions: Record<PermissionKey, boolean> | null;
  metadataEncrypted: boolean;
}

export interface PageGroup {
  from: number;
  to: number;
  widthMm: number;
  heightMm: number;
  /** Formato riconosciuto (A4, Letter…) o null. */
  format: string | null;
  landscape: boolean;
  /** Rotazione della pagina in gradi (0, 90, 180, 270). */
  rotation: number;
}

export interface FontInfo {
  name: string;
  /** Tipo: Type1, TrueType, Type0, Type3, MMType1. */
  type: string;
  embedded: boolean;
  /** Incorporato solo con i glifi usati (prefisso ABCDEF+). */
  subset: boolean;
}

export interface MetaFields {
  title: string;
  author: string;
  subject: string;
  keywords: string;
  creator: string;
  producer: string;
  /** ISO 8601 (UTC), vuoto se assente. */
  created: string;
  modified: string;
}

export interface PdfReport {
  sizeBytes: number;
  /** Versione dall'intestazione (%PDF-1.7), null se manca. */
  headerVersion: string | null;
  /** Versione dichiarata nel catalogo (può essere più recente di quella dell'intestazione). */
  catalogVersion: string | null;
  linearized: boolean;
  pages: number | null;
  groups: PageGroup[];
  /** null se non disponibile (file cifrato). */
  fonts: FontInfo[] | null;
  encryption: EncryptionInfo | null;
  metadata: MetaFields | null;
  hasXmp: boolean | null;
  annotations: { total: number; byType: Record<string, number> } | null;
  form: { fields: number; xfa: boolean } | null;
  attachments: number | null;
  outlines: boolean | null;
  tagged: boolean | null;
  language: string;
  layers: boolean | null;
}

export type InspectResult =
  | { status: 'ok'; report: PdfReport }
  | { status: 'locked'; incorrect: boolean; report: PdfReport }
  | { status: 'invalid' };

/** Codice di pdf.js per «password errata» (1 = richiesta). */
const PASSWORD_INCORRECT = 2;

const round1 = (n: number): number => Math.round(n * 10) / 10;

/** Formato di carta più vicino alle misure (in mm, in qualsiasi orientamento), o null. */
export function recognizeFormat(widthMm: number, heightMm: number): string | null {
  const [a, b] = widthMm <= heightMm ? [widthMm, heightMm] : [heightMm, widthMm];
  let best: { name: string; d: number } | null = null;
  for (const [name, w, h] of FORMATS) {
    const d = Math.max(Math.abs(a - w), Math.abs(b - h));
    if (d <= TOLERANCE_MM && (!best || d < best.d)) best = { name, d };
  }
  return best?.name ?? null;
}

export interface RawPage {
  width: number;
  height: number;
  rotation: number;
}

/** Raggruppa le pagine consecutive con stessa misura (visibile, in punti) e stessa rotazione. */
export function groupPages(pages: RawPage[]): PageGroup[] {
  const out: PageGroup[] = [];
  pages.forEach((p, i) => {
    const rot = ((Math.round(p.rotation / 90) * 90) % 360 + 360) % 360;
    const swap = rot === 90 || rot === 270;
    const widthMm = round1((swap ? p.height : p.width) * MM_PER_PT);
    const heightMm = round1((swap ? p.width : p.height) * MM_PER_PT);
    const last = out[out.length - 1];
    if (last && last.widthMm === widthMm && last.heightMm === heightMm && last.rotation === rot) {
      last.to = i + 1;
      return;
    }
    out.push({ from: i + 1, to: i + 1, widthMm, heightMm, format: recognizeFormat(widthMm, heightMm), landscape: widthMm > heightMm, rotation: rot });
  });
  return out;
}

/** Versione dall'intestazione, cercata nei primi 1024 byte (alcuni file hanno byte prima di %PDF-). */
export function headerVersionOf(bytes: Uint8Array): string | null {
  const head = latin1(bytes.subarray(0, 1024));
  return /%PDF-(\d\.\d)/.exec(head)?.[1] ?? null;
}

const latin1 = (b: Uint8Array): string => new TextDecoder('latin1').decode(b);

/** Permessi dal valore /P (intero a 32 bit con segno): un bit a 1 vuol dire consentito. */
export function permissionsFromP(p: number): Record<PermissionKey, boolean> {
  const out = {} as Record<PermissionKey, boolean>;
  for (const k of Object.keys(PERMISSIONS) as PermissionKey[]) out[k] = (p & (1 << (PERMISSIONS[k] - 1))) !== 0;
  return out;
}

/**
 * Cerca il dizionario /Encrypt nei byte del file (trailer o flusso di riferimenti, di solito in fondo)
 * e ne ricava versione, algoritmo e permessi. Null se il file non è cifrato.
 */
export function detectEncryption(bytes: Uint8Array): EncryptionInfo | null {
  const tail = latin1(bytes.subarray(Math.max(0, bytes.length - 65536)));
  const head = bytes.length > 65536 ? latin1(bytes.subarray(0, 4096)) : '';
  const hit = /\/Encrypt\b/.exec(tail) ?? /\/Encrypt\b/.exec(head);
  if (!hit) return null;
  const scope = hit.input;
  const after = scope.slice(hit.index + 8, hit.index + 8 + 40);
  let dict = '';
  const ref = /^\s*(\d+)\s+(\d+)\s+R/.exec(after);
  if (ref) {
    const whole = latin1(bytes);
    const m = new RegExp(`(?:^|[\\r\\n\\s])${ref[1]}\\s+${ref[2]}\\s+obj\\b`).exec(whole);
    if (m) dict = whole.slice(m.index, m.index + 2000);
  } else if (/^\s*<</.test(after)) {
    dict = scope.slice(hit.index + 8, hit.index + 2008);
  }
  const end = dict.search(/endobj|startxref|stream\b/);
  if (end >= 0) dict = dict.slice(0, end);
  if (!/\/Filter\s*\/\w+/.test(dict) && !/\/V\s+\d/.test(dict)) return null;
  const num = (re: RegExp): number | null => {
    const m = re.exec(dict);
    return m ? Number(m[1]) : null;
  };
  const version = num(/\/V\s+(\d+)/);
  const revision = num(/\/R\s+(\d+)/);
  const length = num(/\/Length\s+(\d+)/);
  const p = num(/\/P\s+(-?\d+)/);
  const cfm = /\/CFM\s*\/(\w+)/.exec(dict)?.[1];
  let algorithm: EncryptionAlgorithm = 'unknown';
  let keyBits: number | null = null;
  if (version === 1) [algorithm, keyBits] = ['rc4-40', 40];
  else if (version === 2 || (version === 4 && cfm === 'V2')) [algorithm, keyBits] = ['rc4-128', length && length >= 40 && length <= 128 ? length : 128];
  else if (version === 4 && cfm === 'AESV2') [algorithm, keyBits] = ['aes-128', 128];
  else if (version === 5) [algorithm, keyBits] = ['aes-256', 256];
  return {
    version,
    revision,
    algorithm,
    keyBits,
    permissions: p === null ? null : permissionsFromP(p),
    metadataEncrypted: !/\/EncryptMetadata\s+false/.test(dict),
  };
}

const isoOf = (d: Date | undefined): string => (d && !Number.isNaN(d.getTime()) ? d.toISOString() : '');

/** Data PDF «D:20260102030405+01'00'» in ISO UTC; vuoto se non si legge. */
export function pdfDateToIso(s: string | undefined | null): string {
  const m = /^D:(\d{4})(\d{2})?(\d{2})?(\d{2})?(\d{2})?(\d{2})?(Z|[+-]\d{2}(?:'?\d{2}'?)?)?/.exec(s ?? '');
  if (!m) return '';
  const [, y, mo = '01', d = '01', h = '00', mi = '00', se = '00', tz = 'Z'] = m;
  let off = 0;
  if (tz !== 'Z') {
    const t = /([+-])(\d{2})'?(\d{2})?/.exec(tz);
    if (t) off = (t[1] === '-' ? -1 : 1) * (Number(t[2]) * 60 + Number(t[3] ?? 0));
  }
  const ms = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(se)) - off * 60000;
  const date = new Date(ms);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

function emptyReport(bytes: Uint8Array): PdfReport {
  return {
    sizeBytes: bytes.length,
    headerVersion: headerVersionOf(bytes),
    catalogVersion: null,
    linearized: /\/Linearized\b/.test(latin1(bytes.subarray(0, 1024))),
    pages: null,
    groups: [],
    fonts: null,
    encryption: null,
    metadata: null,
    hasXmp: null,
    annotations: null,
    form: null,
    attachments: null,
    outlines: null,
    tagged: null,
    language: '',
    layers: null,
  };
}

/** Ispeziona un PDF. Con file cifrato usa pdf.js; `password` serve solo ad aprirlo. */
export async function inspectPdf(bytes: Uint8Array, password = ''): Promise<InspectResult> {
  const enc = detectEncryption(bytes);
  if (enc) return inspectEncrypted(bytes, enc, password);
  try {
    return { status: 'ok', report: await inspectWithPdfLib(bytes) };
  } catch {
    return { status: 'invalid' };
  }
}

async function inspectWithPdfLib(bytes: Uint8Array): Promise<PdfReport> {
  const { PDFArray, PDFBool, PDFDict, PDFDocument, PDFName, PDFString, PDFHexString, PDFStream, PDFRef } = await import('pdf-lib');
  const doc: PDFDocument = await PDFDocument.load(bytes, { updateMetadata: false, throwOnInvalidObject: false });
  const report = emptyReport(bytes);
  const name = (n: string) => PDFName.of(n);
  const textOf = (o: unknown): string => (o instanceof PDFString || o instanceof PDFHexString ? o.decodeText() : o instanceof PDFName ? o.decodeText() : '');
  const dictOf = (d: PDFDict, key: string): PDFDict | undefined => d.lookupMaybe(name(key), PDFDict);
  const arrayOf = (d: PDFDict, key: string): PDFArray | undefined => d.lookupMaybe(name(key), PDFArray);
  const catalog = doc.catalog;

  report.catalogVersion = textOf(catalog.lookup(name('Version'))) || null;
  report.pages = doc.getPageCount();
  report.groups = groupPages(
    doc.getPages().map((p) => {
      const b = p.getCropBox();
      return { width: b.width, height: b.height, rotation: p.getRotation().angle };
    }),
  );
  report.metadata = {
    title: doc.getTitle() ?? '',
    author: doc.getAuthor() ?? '',
    subject: doc.getSubject() ?? '',
    keywords: doc.getKeywords() ?? '',
    creator: doc.getCreator() ?? '',
    producer: doc.getProducer() ?? '',
    created: isoOf(doc.getCreationDate()),
    modified: isoOf(doc.getModificationDate()),
  };
  report.hasXmp = catalog.has(name('Metadata'));
  report.outlines = !!dictOf(catalog, 'Outlines')?.has(name('First'));
  const marked = dictOf(catalog, 'MarkInfo')?.lookup(name('Marked'));
  report.tagged = marked instanceof PDFBool && marked.asBoolean();
  report.language = textOf(catalog.lookup(name('Lang')));
  report.layers = catalog.has(name('OCProperties'));

  // modulo
  const acro = dictOf(catalog, 'AcroForm');
  report.form = { fields: 0, xfa: !!acro?.has(name('XFA')) };
  if (acro) {
    try {
      report.form.fields = doc.getForm().getFields().length;
    } catch {
      report.form.fields = arrayOf(acro, 'Fields')?.size() ?? 0;
    }
  }

  // annotazioni (per tipo) e allegati
  const byType: Record<string, number> = {};
  let total = 0;
  for (const page of doc.getPages()) {
    const annots = page.node.Annots();
    if (!annots) continue;
    for (let i = 0; i < annots.size(); i++) {
      const a = annots.lookupMaybe(i, PDFDict);
      if (!a) continue;
      const t = textOf(a.lookup(name('Subtype'))) || 'Unknown';
      byType[t] = (byType[t] ?? 0) + 1;
      total++;
    }
  }
  report.annotations = { total, byType };
  let files = byType['FileAttachment'] ?? 0;
  const countTree = (node: PDFDict | undefined, depth: number): number => {
    if (!node || depth > 20) return 0;
    const names = arrayOf(node, 'Names');
    const kids = arrayOf(node, 'Kids');
    let n = names ? Math.floor(names.size() / 2) : 0;
    for (let i = 0; kids && i < kids.size(); i++) n += countTree(kids.lookupMaybe(i, PDFDict), depth + 1);
    return n;
  };
  files += countTree(dictOf(dictOf(catalog, 'Names') ?? catalog, 'EmbeddedFiles'), 0);
  report.attachments = files;

  // font: tutti i dizionari /Type /Font del file
  const fonts = new Map<string, FontInfo>();
  const hasFile = (desc: PDFDict | undefined): boolean => !!desc && (desc.has(name('FontFile')) || desc.has(name('FontFile2')) || desc.has(name('FontFile3')));
  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    if (obj instanceof PDFStream || obj instanceof PDFRef || !(obj instanceof PDFDict)) continue;
    if (textOf(obj.get(name('Type'))) !== 'Font') continue;
    const type = textOf(obj.lookup(name('Subtype')));
    if (!type || type.startsWith('CIDFont')) continue;
    let base = textOf(obj.lookup(name('BaseFont')));
    let embedded = false;
    if (type === 'Type0') {
      const desc = arrayOf(obj, 'DescendantFonts')?.lookupMaybe(0, PDFDict);
      embedded = hasFile(desc && dictOf(desc, 'FontDescriptor'));
    } else if (type === 'Type3') {
      embedded = true;
      base ||= textOf(obj.lookup(name('Name'))) || 'Type3';
    } else {
      embedded = hasFile(dictOf(obj, 'FontDescriptor'));
    }
    if (!base) continue;
    const info: FontInfo = { name: base.replace(/^[A-Z]{6}\+/, ''), type, embedded, subset: /^[A-Z]{6}\+/.test(base) };
    fonts.set(`${info.name}|${type}|${embedded}|${info.subset}`, info);
  }
  report.fonts = [...fonts.values()].sort((a, b) => a.name.localeCompare(b.name));
  return report;
}

async function inspectEncrypted(bytes: Uint8Array, enc: EncryptionInfo, password: string): Promise<InspectResult> {
  const report = emptyReport(bytes);
  report.encryption = enc;
  let doc: import('pdfjs-dist').PDFDocumentProxy;
  try {
    const { loadPdfjs } = await import('../pdf-tools/pdf-thumbs');
    const pdfjs = await loadPdfjs();
    const task = pdfjs.getDocument({
      data: bytes.slice(),
      password,
      useWasm: false,
      enableXfa: false,
      verbosity: 0,
      standardFontDataUrl: new URL('pdfjs/standard_fonts/', document.baseURI).href,
    });
    try {
      doc = await task.promise;
    } catch (e) {
      void task.destroy();
      throw e;
    }
  } catch (e) {
    const err = e as { name?: string; code?: number };
    if (err?.name === 'PasswordException') return { status: 'locked', incorrect: err.code === PASSWORD_INCORRECT, report };
    return { status: 'invalid' };
  }
  try {
    report.pages = doc.numPages;
    const raw: RawPage[] = [];
    const byType: Record<string, number> = {};
    let total = 0;
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const [x0, y0, x1, y1] = page.view;
      raw.push({ width: Math.abs(x1 - x0), height: Math.abs(y1 - y0), rotation: page.rotate });
      for (const a of (await page.getAnnotations()) as { subtype?: string }[]) {
        byType[a.subtype ?? 'Unknown'] = (byType[a.subtype ?? 'Unknown'] ?? 0) + 1;
        total++;
      }
      page.cleanup();
    }
    report.groups = groupPages(raw);
    report.annotations = { total, byType };
    const md = await doc.getMetadata();
    const info = (md.info ?? {}) as Record<string, unknown>;
    const s = (k: string): string => (typeof info[k] === 'string' ? (info[k] as string) : '');
    report.metadata = {
      title: s('Title'),
      author: s('Author'),
      subject: s('Subject'),
      keywords: s('Keywords'),
      creator: s('Creator'),
      producer: s('Producer'),
      created: pdfDateToIso(s('CreationDate')),
      modified: pdfDateToIso(s('ModDate')),
    };
    report.hasXmp = !!md.metadata;
    report.catalogVersion = null;
    report.attachments = Object.keys((await doc.getAttachments()) ?? {}).length;
    report.outlines = ((await doc.getOutline()) ?? []).length > 0;
    report.form = { fields: Object.keys((await doc.getFieldObjects()) ?? {}).length, xfa: info['IsXFAPresent'] === true };
    return { status: 'ok', report };
  } catch {
    return { status: 'invalid' };
  } finally {
    void doc.loadingTask.destroy();
  }
}
