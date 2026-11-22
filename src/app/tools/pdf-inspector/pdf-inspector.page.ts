// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 rrstudio — rrstudio tools
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { CopyButton } from '../../shared/copy-button';
import { saveBytes, safeFileName } from '../../shared/download';
import { FileDrop } from '../../shared/file-drop';
import { Icon } from '../../shared/icon';
import { PrivacyNote } from '../../shared/privacy-note';
import { formatBytes } from '../../shared/text-stats';
import { ToolHandoff } from '../../shared/tool-handoff';
import { MAX_PDF_BYTES } from '../pdf-common/pdf-file';
import { PERMISSIONS, PageGroup, PdfReport, PermissionKey, inspectPdf } from './pdf-inspector';
import { PIN_DICTIONARIES } from './pdf-inspector.i18n';

interface Row {
  k: string;
  v: string;
}
interface FontRow {
  name: string;
  type: string;
  emb: string;
}

@Component({
  selector: 'app-pdf-inspector',
  imports: [Icon, PrivacyNote, FileDrop, CopyButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pdf-inspector.page.html',
  styleUrl: './pdf-inspector.page.scss',
})
export class PdfInspectorPage implements OnInit {
  protected readonly i18n = inject(I18nService);
  private readonly handoff = inject(ToolHandoff);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  /** PDF in attesa di password (file e byte restano solo in memoria). */
  protected readonly locked = signal<{ incorrect: boolean } | null>(null);
  protected readonly password = signal('');
  private readonly fileName = signal('');
  private bytes: Uint8Array | null = null;
  protected readonly report = signal<PdfReport | null>(null);

  protected readonly general = computed<Row[]>(() => {
    const r = this.report();
    if (!r) return [];
    const t = (k: string, p?: Record<string, string | number>): string => this.i18n.t(k, p);
    const yn = (b: boolean | null): string => (b === null ? t('pin.na') : b ? t('pin.yes') : t('pin.no'));
    const types = r.annotations ? Object.entries(r.annotations.byType).map(([k, n]) => `${k} ${n}`).join(', ') : '';
    return [
      { k: t('pin.k.file'), v: this.fileName() },
      { k: t('pin.k.size'), v: `${formatBytes(r.sizeBytes, this.i18n.locale())} (${r.sizeBytes} B)` },
      { k: t('pin.k.header'), v: r.headerVersion ?? t('pin.na') },
      { k: t('pin.k.catalog'), v: r.catalogVersion ?? t('pin.na') },
      { k: t('pin.k.linear'), v: yn(r.linearized) },
      { k: t('pin.k.pages'), v: r.pages === null ? t('pin.na') : String(r.pages) },
      { k: t('pin.k.tagged'), v: yn(r.tagged) },
      { k: t('pin.k.lang'), v: r.language || t('pin.none') },
      { k: t('pin.k.layers'), v: yn(r.layers) },
      { k: t('pin.k.outlines'), v: yn(r.outlines) },
      { k: t('pin.k.attach'), v: r.attachments === null ? t('pin.na') : String(r.attachments) },
      { k: t('pin.k.form'), v: r.form === null ? t('pin.na') : r.form.fields > 0 || r.form.xfa ? [t('pin.form.value', { n: r.form.fields }), r.form.xfa ? t('pin.xfa') : ''].filter(Boolean).join(' · ') : t('pin.none') },
      { k: t('pin.k.annots'), v: r.annotations === null ? t('pin.na') : r.annotations.total === 0 ? t('pin.none') : `${r.annotations.total} (${types})` },
      { k: t('pin.k.xmp'), v: yn(r.hasXmp) },
    ];
  });

  protected readonly pageRows = computed<Row[]>(() => {
    const r = this.report();
    return (r?.groups ?? []).map((g) => ({ k: this.i18n.t('pin.pages.group', { range: g.from === g.to ? String(g.from) : `${g.from}-${g.to}` }), v: this.describeGroup(g) }));
  });

  protected readonly encryption = computed<Row[]>(() => {
    const e = this.report()?.encryption;
    const t = (k: string, p?: Record<string, string | number>): string => this.i18n.t(k, p);
    if (!this.report()) return [];
    if (!e) return [{ k: t('pin.k.enc'), v: t('pin.no') }];
    return [
      { k: t('pin.k.enc'), v: t('pin.yes') },
      { k: t('pin.k.algo'), v: t('pin.algo.' + e.algorithm, { bits: e.keyBits ?? 128 }) },
      { k: t('pin.k.rev'), v: t('pin.rev', { v: e.version ?? '?', r: e.revision ?? '?' }) },
      { k: t('pin.k.metaEnc'), v: e.metadataEncrypted ? t('pin.yes') : t('pin.no') },
    ];
  });

  protected readonly permissions = computed<{ label: string; allowed: boolean }[]>(() => {
    const p = this.report()?.encryption?.permissions;
    if (!p) return [];
    return (Object.keys(PERMISSIONS) as PermissionKey[]).map((k) => ({ label: this.i18n.t('pin.perm.' + k), allowed: p[k] }));
  });
  protected readonly permsUnknown = computed(() => !!this.report()?.encryption && !this.report()!.encryption!.permissions);

  protected readonly meta = computed<Row[]>(() => {
    const m = this.report()?.metadata;
    if (!m) return [];
    const keys = ['title', 'author', 'subject', 'keywords', 'creator', 'producer', 'created', 'modified'] as const;
    return keys.map((k) => ({ k: this.i18n.t('pin.m.' + k), v: m[k] || this.i18n.t('pin.empty') }));
  });

  protected readonly fonts = computed<FontRow[] | null>(() => {
    const f = this.report()?.fonts;
    if (!f) return null;
    return f.map((x) => ({ name: x.name, type: x.type, emb: this.i18n.t(!x.embedded ? 'pin.fonts.emb.no' : x.subset ? 'pin.fonts.emb.subset' : 'pin.fonts.emb.full') }));
  });

  /** Report in JSON (senza la password, che non entra mai nel report). */
  protected readonly json = computed(() => {
    const r = this.report();
    return r ? JSON.stringify({ file: this.fileName(), ...r }, null, 2) : '';
  });

  constructor() {
    this.i18n.register(PIN_DICTIONARIES);
  }

  ngOnInit(): void {
    const f = this.handoff.take('pdf-inspector')?.files?.find((x) => /\.pdf$/i.test(x.name) || x.type === 'application/pdf');
    if (f) void this.pick(f);
  }

  private describeGroup(g: PageGroup): string {
    const t = (k: string, p?: Record<string, string | number>): string => this.i18n.t(k, p);
    const size = `${g.widthMm.toLocaleString(this.i18n.locale())} × ${g.heightMm.toLocaleString(this.i18n.locale())} mm`;
    return [size, g.format ?? t('pin.pages.other'), g.landscape ? t('pin.pages.land') : t('pin.pages.port'), g.rotation ? t('pin.pages.rot', { deg: g.rotation }) : ''].filter(Boolean).join(' · ');
  }

  protected async pick(file: File): Promise<void> {
    this.error.set('');
    this.report.set(null);
    this.locked.set(null);
    this.password.set('');
    this.bytes = null;
    if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') {
      this.error.set(this.i18n.t('pin.err.type'));
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      this.error.set(this.i18n.t('pin.err.size'));
      return;
    }
    this.loading.set(true);
    try {
      this.bytes = new Uint8Array(await file.arrayBuffer());
      this.fileName.set(file.name);
      await this.run('');
    } catch {
      this.error.set(this.i18n.t('pin.err.invalid'));
    } finally {
      this.loading.set(false);
    }
  }

  protected async unlock(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      await this.run(this.password());
    } catch {
      this.error.set(this.i18n.t('pin.err.invalid'));
    } finally {
      this.loading.set(false);
    }
  }

  private async run(password: string): Promise<void> {
    if (!this.bytes) return;
    const r = await inspectPdf(this.bytes, password);
    if (r.status === 'invalid') {
      this.report.set(null);
      this.locked.set(null);
      this.error.set(this.i18n.t('pin.err.invalid'));
    } else if (r.status === 'locked') {
      this.report.set(r.report);
      this.locked.set({ incorrect: r.incorrect && password !== '' });
    } else {
      this.report.set(r.report);
      this.locked.set(null);
      this.password.set('');
    }
  }

  protected download(): void {
    const j = this.json();
    if (!j) return;
    saveBytes(new TextEncoder().encode(j), `${safeFileName(this.fileName().replace(/\.pdf$/i, ''), 'documento')}-report.json`, 'application/json');
  }
}
