// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 rrstudio — rrstudio tools
import { ChangeDetectionStrategy, Component, DestroyRef, afterNextRender, computed, effect, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { I18nService } from '../core/i18n/i18n.service';
import { TOOLS } from '../tools/tools.registry';
import { HandoffPayload } from './handoff-targets';
import { Icon } from './icon';
import type { Suggestion } from './smart-targets';
import { ToolHandoff } from './tool-handoff';

/** Contenuto in ingresso: un testo (incolla, condivisione) o uno o più file (trascinamento, scelta, condivisione, apertura). */
export type Intake = { kind: 'text'; text: string } | { kind: 'files'; files: File[] };

/** Oltre questa dimensione un file non si legge come testo (resta valido per gli strumenti che lo prendono come file). */
const MAX_TEXT_FILE = 10 * 1024 * 1024;
/** Rilevazione caricata al primo contenuto (incolla, trascina, file): tiene fuori dal bundle iniziale della home le tabelle IBAN e codice fiscale. */
type Lib = { targets: typeof import('./smart-targets'); detect: typeof import('./content-detect') };
let libPromise: Promise<Lib> | undefined;
const loadLib = (): Promise<Lib> =>
  (libPromise ??= Promise.all([import('./smart-targets'), import('./content-detect')]).then(([targets, detect]) => ({ targets, detect })));

const KNOWN = new Set(TOOLS.map((t) => t.id));

/**
 * "Incolla, trascina o scegli": riconosce il contenuto e propone gli strumenti adatti. Tutto in memoria, nulla
 * lascia la scheda: il contenuto passa allo strumento scelto col servizio `ToolHandoff` (take-and-clear).
 * Ascolta a livello di documento: Ctrl/⌘+V fuori dai campi di testo e il trascinamento di file su tutta la pagina.
 * Nel campo "Incolla qui" e in ogni altro campo l'incolla resta quella normale del browser.
 */
@Component({
  selector: 'app-smart-intake',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="box" aria-labelledby="intake-h">
      <h2 id="intake-h" class="eyebrow">{{ i18n.t('intake.title') }}</h2>
      <p class="hint">{{ i18n.t('intake.hint', { key: modKey() }) }}</p>
      <div class="row">
        <div class="paste">
          <label for="intake-paste" class="lbl">{{ i18n.t('intake.paste.label') }}</label>
          <textarea
            id="intake-paste"
            rows="2"
            spellcheck="false"
            autocomplete="off"
            data-intake-field
            [placeholder]="i18n.t('intake.paste.ph')"
            [value]="text()"
            (input)="onTyped($event)"
          ></textarea>
        </div>
        <div class="pick">
          <button type="button" class="btn" (click)="fileInput.click()">
            <app-icon name="upload" /> {{ i18n.t('intake.pick') }}
          </button>
          <input #fileInput type="file" multiple class="visually-hidden" tabindex="-1" aria-hidden="true" (change)="onPicked($event)" />
        </div>
      </div>

      <div class="result" role="status" aria-live="polite">
        @if (hasContent()) {
          <p class="found">
            <strong>{{ foundLabel() }}</strong>
            <button type="button" class="link clear" (click)="clear()">{{ i18n.t('intake.clear') }}</button>
          </p>
          <pre class="preview" role="region" tabindex="0" [attr.aria-label]="i18n.t('intake.preview')">{{ preview() }}</pre>
          <p class="local">{{ i18n.t('intake.local') }}</p>
          @if (error()) {
            <p class="err" role="alert">{{ error() }}</p>
          }
          @if (suggestions().length) {
            <ul class="tools" [attr.aria-label]="i18n.t('intake.suggest')">
              @for (s of suggestions(); track s.toolId) {
                <li>
                  <button type="button" class="item" (click)="choose(s)">
                    <app-icon [name]="s.icon" /> <span>{{ s.title }}</span>
                  </button>
                </li>
              }
            </ul>
          } @else {
            <p class="none">{{ i18n.t('intake.nothing') }}</p>
          }
        }
      </div>
    </section>

    @if (dragging()) {
      <div class="overlay" aria-hidden="true">
        <p>{{ i18n.t('intake.drop.title') }}</p>
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .box {
      margin-bottom: var(--space-5);
      padding: var(--space-4) var(--space-5);
      border: 1px dashed var(--line);
      border-radius: var(--radius);
      background: var(--surface);
    }
    .eyebrow {
      margin: 0;
    }
    .hint,
    .local {
      margin: var(--space-1) 0 var(--space-3);
      color: var(--muted);
      font-size: var(--fs-sm);
    }
    .row {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-4);
      align-items: flex-end;
    }
    .paste {
      flex: 1 1 320px;
      min-width: 0;
    }
    .lbl {
      display: block;
      margin-bottom: var(--space-1);
      font-size: var(--fs-sm);
      color: var(--ink-2);
    }
    textarea {
      width: 100%;
      box-sizing: border-box;
      resize: vertical;
      min-height: 64px;
      padding: var(--space-3);
      border: 1px solid var(--line);
      border-radius: var(--radius-sm);
      background: var(--bg, transparent);
      color: var(--ink);
      font: inherit;
      font-family: var(--font-mono, ui-monospace, monospace);
      font-size: var(--fs-sm);
    }
    /* su telefono il riquadro resta compatto: niente suggerimento da tastiera, etichetta solo per gli screen reader */
    @media (max-width: 600px) {
      .box {
        padding: var(--space-3) var(--space-4);
      }
      .hint {
        display: none;
      }
      .eyebrow {
        margin-bottom: var(--space-2);
      }
      .lbl {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip-path: inset(50%);
        white-space: nowrap;
      }
      .row {
        gap: var(--space-2);
      }
      textarea {
        min-height: 44px;
        padding: var(--space-2) var(--space-3);
      }
      .pick .btn {
        width: 100%;
        justify-content: center;
      }
    }
    .result {
      margin-top: var(--space-3);
    }
    .found {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      margin: 0 0 var(--space-2);
    }
    .clear {
      border: 0;
      background: none;
      color: var(--muted);
      font: inherit;
      font-size: var(--fs-sm);
      text-decoration: underline;
      cursor: pointer;
      padding: 0;
    }
    .preview {
      margin: 0 0 var(--space-2);
      padding: var(--space-3);
      max-height: 9em;
      overflow: auto;
      border-radius: var(--radius-sm);
      background: var(--surface-2, rgb(127 127 127 / 10%));
      font-family: var(--font-mono, ui-monospace, monospace);
      font-size: var(--fs-sm);
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
    .err {
      color: var(--danger, #b3261e);
      margin: 0 0 var(--space-2);
      font-size: var(--fs-sm);
    }
    .tools {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      margin: var(--space-3) 0 0;
      padding: 0;
      list-style: none;
    }
    .item {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      padding: 7px var(--space-4);
      border: 1px solid var(--line);
      border-radius: var(--radius-pill);
      background: transparent;
      color: var(--ink);
      font: inherit;
      font-size: var(--fs-sm);
      cursor: pointer;
      &:hover,
      &:focus-visible {
        background: var(--surface-2, rgb(127 127 127 / 12%));
      }
    }
    .none {
      margin: 0;
      color: var(--muted);
    }
    .overlay {
      position: fixed;
      inset: 0;
      z-index: 200;
      display: grid;
      place-items: center;
      pointer-events: none;
      background: color-mix(in srgb, var(--bg, #fff) 82%, transparent);
      outline: 3px dashed var(--ink);
      outline-offset: -16px;
      p {
        margin: 0;
        padding: var(--space-4) var(--space-5);
        border-radius: var(--radius);
        background: var(--surface);
        font-size: var(--fs-lg);
        font-weight: var(--fw-medium);
      }
    }
  `,
})
export class SmartIntake {
  protected readonly i18n = inject(I18nService);
  private readonly router = inject(Router);
  private readonly handoff = inject(ToolHandoff);
  private readonly destroyRef = inject(DestroyRef);

  /** Contenuto già in mano (pagina di ricezione: condivisione dal sistema, apertura di un file). */
  readonly incoming = input<Intake | null>(null);

  protected readonly text = signal('');
  private readonly files = signal<File[]>([]);
  protected readonly dragging = signal(false);
  protected readonly error = signal('');
  protected readonly modKey = signal('Ctrl');
  private typing: ReturnType<typeof setTimeout> | undefined;
  /** Testo "analizzato": segue `text` con un breve ritardo (digitando) o subito (incolla). */
  private readonly analyzed = signal('');

  private readonly lib = signal<Lib | null>(null);

  protected readonly hasContent = computed(() => this.files().length > 0 || this.analyzed().trim() !== '');

  private readonly analysis = computed(() => {
    const files = this.files();
    const lib = this.lib();
    if (!lib) return { detected: null, suggestions: [] as Suggestion[] };
    if (files.length) {
      return { detected: null, suggestions: lib.targets.suggestForFiles(files, KNOWN) };
    }
    const t = this.analyzed();
    if (!t.trim()) return { detected: null, suggestions: [] as Suggestion[] };
    const r = lib.targets.suggestForText(t, KNOWN);
    return { detected: r.detections[0]?.type ?? 'text', suggestions: r.suggestions };
  });

  protected readonly suggestions = computed(() =>
    this.analysis()
      .suggestions.map((s) => ({ ...s, tool: TOOLS.find((t) => t.id === s.toolId)! }))
      .map((s) => ({ ...s, icon: s.tool.icon, title: this.i18n.t(s.tool.titleKey) })),
  );

  protected readonly foundLabel = computed(() => {
    const files = this.files();
    const lib = this.lib();
    if (files.length && lib) {
      const classes = [...new Set(files.map((f) => lib.targets.classifyFile(f.name, f.type)))];
      const kind = classes.length === 1 ? this.i18n.t('intake.file.' + classes[0]) : this.i18n.t('intake.file.mixed');
      return files.length === 1 ? this.i18n.t('intake.found.file', { kind }) : this.i18n.t('intake.found.files', { n: files.length, kind });
    }
    const d = this.analysis().detected;
    return this.i18n.t(d === 'text' || !d ? 'intake.found.text' : 'intake.found', { type: this.i18n.t('intake.type.' + d) });
  });

  protected readonly preview = computed(() => {
    const files = this.files();
    if (files.length) {
      const names = files.slice(0, 4).map((f) => `${f.name} (${formatSize(f.size)})`);
      return names.join('\n') + (files.length > 4 ? `\n… +${files.length - 4}` : '');
    }
    const lib = this.lib();
    return lib ? lib.detect.previewText(this.analyzed()) : this.analyzed().slice(0, 300);
  });

  constructor() {
    // contenuto dato dall'esterno (pagina di ricezione)
    effect(() => {
      const inc = this.incoming();
      if (!inc) return;
      if (inc.kind === 'text') this.setText(inc.text, true);
      else this.setFiles(inc.files);
    });

    afterNextRender(() => {
      if (/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) this.modKey.set('⌘');
      let depth = 0;
      const hasFiles = (e: DragEvent) => !!e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files');
      const onEnter = (e: DragEvent) => {
        if (!hasFiles(e)) return;
        depth++;
        this.dragging.set(true);
      };
      const onOver = (e: DragEvent) => {
        if (!hasFiles(e)) return;
        e.preventDefault(); // senza questo il browser non permette il rilascio (e aprirebbe il file)
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
      };
      const onLeave = (e: DragEvent) => {
        if (!hasFiles(e)) return;
        depth = Math.max(0, depth - 1);
        if (depth === 0) this.dragging.set(false);
      };
      const onDrop = (e: DragEvent) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        depth = 0;
        this.dragging.set(false);
        const list = Array.from(e.dataTransfer?.files ?? []);
        if (list.length) this.setFiles(list);
      };
      const onEnd = () => {
        depth = 0;
        this.dragging.set(false);
      };
      const onPaste = (e: ClipboardEvent) => this.onDocumentPaste(e);
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && this.dragging()) onEnd();
      };
      document.addEventListener('dragenter', onEnter);
      document.addEventListener('dragover', onOver);
      document.addEventListener('dragleave', onLeave);
      document.addEventListener('drop', onDrop);
      document.addEventListener('dragend', onEnd);
      document.addEventListener('paste', onPaste);
      document.addEventListener('keydown', onKey);
      this.destroyRef.onDestroy(() => {
        document.removeEventListener('dragenter', onEnter);
        document.removeEventListener('dragover', onOver);
        document.removeEventListener('dragleave', onLeave);
        document.removeEventListener('drop', onDrop);
        document.removeEventListener('dragend', onEnd);
        document.removeEventListener('paste', onPaste);
        document.removeEventListener('keydown', onKey);
        clearTimeout(this.typing);
      });
    });
  }

  private isField(t: EventTarget | null): boolean {
    const el = t as HTMLElement | null;
    return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
  }

  /** Ctrl/⌘+V fuori dai campi: testo o file dagli appunti. Nei campi (anche nella ricerca) l'incolla resta quella normale. */
  private onDocumentPaste(e: ClipboardEvent): void {
    const target = e.target as HTMLElement | null;
    const own = !!target?.closest?.('[data-intake-field]');
    const files = Array.from(e.clipboardData?.files ?? []);
    if (this.isField(target) && !(own && files.length)) return;
    if (files.length) {
      e.preventDefault();
      this.setFiles(files);
      return;
    }
    const text = e.clipboardData?.getData('text/plain') ?? '';
    if (!text.trim()) return;
    e.preventDefault();
    this.setText(text, true);
  }

  protected onTyped(e: Event): void {
    const v = (e.target as HTMLTextAreaElement).value;
    this.text.set(v);
    this.files.set([]);
    this.error.set('');
    clearTimeout(this.typing);
    this.typing = setTimeout(() => this.analyzed.set(v), 200);
    this.ensureLib();
  }

  protected onPicked(e: Event): void {
    const input = e.target as HTMLInputElement;
    const list = Array.from(input.files ?? []);
    input.value = ''; // permette di scegliere di nuovo lo stesso file
    if (list.length) this.setFiles(list);
  }

  private setText(t: string, now: boolean): void {
    clearTimeout(this.typing);
    this.files.set([]);
    this.error.set('');
    this.text.set(t);
    if (now) this.analyzed.set(t);
    this.ensureLib();
  }

  private setFiles(list: File[]): void {
    clearTimeout(this.typing);
    this.text.set('');
    this.analyzed.set('');
    this.error.set('');
    this.files.set(list);
    this.ensureLib();
  }

  private ensureLib(): void {
    if (this.lib()) return;
    void loadLib().then((l) => this.lib.set(l));
  }

  protected clear(): void {
    clearTimeout(this.typing);
    this.text.set('');
    this.analyzed.set('');
    this.files.set([]);
    this.error.set('');
  }

  /** Passa il contenuto allo strumento scelto (solo in memoria) e ci porta lì. */
  protected async choose(s: Suggestion): Promise<void> {
    const tool = TOOLS.find((t) => t.id === s.toolId);
    if (!tool) return;
    this.error.set('');
    const files = this.files();
    let payload: HandoffPayload;
    if (files.length && s.via === 'files') {
      payload = { kind: s.kind, files, from: 'home' };
    } else if (files.length) {
      const f = files[0];
      if (f.size > MAX_TEXT_FILE) {
        this.error.set(this.i18n.t('intake.err.big'));
        return;
      }
      try {
        payload = { kind: s.kind, text: await f.text(), from: 'home' };
      } catch {
        this.error.set(this.i18n.t('intake.err.read'));
        return;
      }
    } else {
      payload = { kind: s.kind, text: this.analyzed(), from: 'home' };
    }
    if (this.handoff.offer(payload, s.toolId)) await this.router.navigateByUrl(this.i18n.link(tool.path));
  }
}

function formatSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
