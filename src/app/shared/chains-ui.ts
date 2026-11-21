// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 rrstudio — rrstudio tools
import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MAX_CHAIN_NAME, MAX_STEPS, MIN_STEPS, moveStep } from '../core/chains/chains.logic';
import { ChainsService } from '../core/chains/chains.service';
import { I18nService } from '../core/i18n/i18n.service';
import { TOOLS, ToolDefinition } from '../tools/tools.registry';
import { HANDOFF_ACCEPTS } from './handoff-targets';
import { Icon } from './icon';

const BY_ID = new Map(TOOLS.map((t) => [t.id, t] as const));

/**
 * Barra della catena in corso, sotto l'header: i passi in ordine (quello corrente evidenziato, gli altri
 * link) e «Chiudi catena». Per passare il risultato al passo successivo si usa «Invia a…», che lo propone per primo.
 */
@Component({
  selector: 'app-chain-bar',
  imports: [RouterLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (chains.active(); as a) {
      <nav class="bar" [attr.aria-label]="i18n.t('chain.bar.aria', { name: a.name })">
        <app-icon name="link" />
        <strong class="name">{{ a.name }}</strong>
        <ol>
          @for (id of a.steps; track $index; let i = $index) {
            <li [attr.aria-current]="a.onPath && i === a.index ? 'step' : null" [class.cur]="a.onPath && i === a.index" [class.done]="a.onPath && i < a.index">
              <a [routerLink]="path(id)">{{ i + 1 }}. {{ title(id) }}</a>
            </li>
          }
        </ol>
        <span class="hint">{{ a.onPath && chains.nextTool() ? i18n.t('chain.bar.next', { tool: title(chains.nextTool()!) }) : a.onPath ? i18n.t('chain.bar.last') : i18n.t('chain.bar.off') }}</span>
        <button type="button" class="btn small" (click)="chains.stop()">{{ i18n.t('chain.bar.stop') }}</button>
      </nav>
    }
  `,
  styles: `
    .bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2) var(--space-3);
      max-width: var(--container-max);
      margin: var(--space-3) auto 0;
      padding: var(--space-2) var(--space-3);
      border: 1px solid var(--line);
      border-radius: var(--radius-sm);
      background: var(--surface);
      font-size: var(--fs-sm);
    }
    ol {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-1) var(--space-2);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    li a {
      display: inline-block;
      padding: 2px var(--space-2);
      border-radius: var(--radius-pill);
      color: var(--ink-2);
      text-decoration: none;
    }
    li.cur a {
      background: var(--ink);
      color: var(--bg);
      font-weight: 600;
    }
    li.done a {
      text-decoration: line-through;
    }
    .hint {
      flex: 1;
      color: var(--ink-2);
    }
    @media print {
      :host {
        display: none;
      }
    }
  `,
})
export class ChainBar {
  protected readonly i18n = inject(I18nService);
  protected readonly chains = inject(ChainsService);
  protected title(id: string): string {
    const t = BY_ID.get(id);
    return t ? this.i18n.t(t.titleKey) : id;
  }
  protected path(id: string): string {
    const t = BY_ID.get(id);
    return !t ? '/' : t.italyOnly ? '/' + t.path : this.i18n.link(t.path);
  }
}

/** Pannello «Catene»: catene salvate (avvia, elimina) e creazione di una nuova (nome, passi in ordine). */
@Component({
  selector: 'app-chains-dialog',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog #dlg aria-labelledby="chains-title" (close)="onClose()" (click)="onBackdrop($event)">
      <div class="head">
        <h2 id="chains-title">{{ i18n.t('chain.title') }}</h2>
        <button type="button" class="close" [attr.aria-label]="i18n.t('chain.close')" (click)="dlg.close()">×</button>
      </div>
      <p class="muted">{{ i18n.t('chain.intro') }}</p>

      <h3>{{ i18n.t('chain.saved') }}</h3>
      @if (chains.saved().length) {
        <ul class="saved">
          @for (c of chains.saved(); track c.id) {
            <li>
              <div class="grow">
                <strong>{{ c.name }}</strong>
                <span class="muted">{{ c.steps.map(title).join(' → ') }}</span>
              </div>
              <button type="button" class="btn small" (click)="chains.start(c.name, c.steps)">{{ i18n.t('chain.start') }}</button>
              <button type="button" class="btn small" [attr.aria-label]="i18n.t('chain.delete', { name: c.name })" (click)="chains.remove(c.id)">{{ i18n.t('chain.deleteShort') }}</button>
            </li>
          }
        </ul>
      } @else {
        <p class="muted">{{ i18n.t('chain.none') }}</p>
      }

      <h3>{{ i18n.t('chain.new') }}</h3>
      <label class="field">
        <span>{{ i18n.t('chain.name') }}</span>
        <input type="text" [maxLength]="maxName" autocomplete="off" [value]="name()" (input)="name.set($any($event.target).value)" />
      </label>
      <ol class="steps">
        @for (id of steps(); track $index; let i = $index) {
          <li>
            <span class="grow">{{ i + 1 }}. {{ title(id) }}</span>
            <button type="button" class="btn small" [disabled]="i === 0" [attr.aria-label]="i18n.t('chain.up', { tool: title(id) })" (click)="move(i, i - 1)"><app-icon name="up" /></button>
            <button type="button" class="btn small" [disabled]="i === steps().length - 1" [attr.aria-label]="i18n.t('chain.down', { tool: title(id) })" (click)="move(i, i + 1)"><app-icon name="down" /></button>
            <button type="button" class="btn small" [attr.aria-label]="i18n.t('chain.remove', { tool: title(id) })" (click)="remove(i)"><app-icon name="close" /></button>
          </li>
        }
      </ol>
      @if (steps().length < maxSteps) {
        <div class="add">
          <label class="field grow">
            <span>{{ i18n.t('chain.add.label') }}</span>
            <select #pick>
              @for (t of options(); track t.id) {
                <option [value]="t.id">{{ i18n.t(t.titleKey) }}</option>
              }
            </select>
          </label>
          <button type="button" class="btn small" (click)="add(pick.value)">{{ i18n.t('chain.add') }}</button>
        </div>
      }
      <p class="muted" role="status" aria-live="polite">{{ status() }}</p>
      <div class="actions">
        <button type="button" class="btn" [disabled]="steps().length < minSteps" (click)="chains.start(name().trim() || i18n.t('chain.untitled'), steps())">{{ i18n.t('chain.start') }}</button>
        <button type="button" class="btn" [disabled]="!canSave()" (click)="save()">{{ i18n.t('chain.save') }}</button>
      </div>
    </dialog>
  `,
  styles: `
    dialog {
      width: min(36rem, calc(100vw - 2 * var(--space-4)));
      max-height: 85vh;
      padding: var(--space-5);
      background: var(--surface);
      color: var(--ink);
      border: 1px solid var(--line);
      border-radius: var(--radius-sm);
      font-size: var(--fs-sm);
    }
    dialog::backdrop {
      background: rgb(0 0 0 / 45%);
    }
    .head,
    li,
    .add,
    .actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-2);
    }
    .actions {
      justify-content: flex-start;
      margin-top: var(--space-3);
    }
    .add {
      align-items: flex-end;
    }
    .grow {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
    }
    h2 {
      margin: 0;
      font-size: 1.15rem;
    }
    h3 {
      margin: var(--space-4) 0 var(--space-2);
      font-size: var(--fs-sm);
      color: var(--ink-2);
    }
    ul,
    ol {
      margin: 0;
      padding: 0;
      list-style: none;
    }
    li {
      padding: 6px 0;
      border-top: 1px solid var(--line-soft);
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: 2px;
      margin-bottom: var(--space-2);
    }
    input,
    select {
      padding: 6px var(--space-3);
      border: 1px solid var(--line);
      border-radius: var(--radius-sm);
      background: var(--surface);
      color: var(--ink);
      font: inherit;
    }
    .muted {
      color: var(--ink-2);
    }
    .close {
      border: 0;
      background: transparent;
      color: var(--muted);
      font-size: 1.5rem;
      line-height: 1;
      cursor: pointer;
    }
    @media print {
      :host {
        display: none;
      }
    }
  `,
})
export class ChainsDialog {
  protected readonly i18n = inject(I18nService);
  protected readonly chains = inject(ChainsService);
  private readonly dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');
  protected readonly maxName = MAX_CHAIN_NAME;
  protected readonly maxSteps = MAX_STEPS;
  protected readonly minSteps = MIN_STEPS;
  protected readonly name = signal('');
  protected readonly steps = signal<string[]>([]);
  protected readonly status = signal('');
  private restore: HTMLElement | null = null;

  /** Il primo passo può essere uno strumento qualunque, i successivi solo strumenti che ricevono contenuti. */
  protected readonly options = computed<ToolDefinition[]>(() => {
    const en = this.i18n.lang() === 'en';
    const first = this.steps().length === 0;
    return TOOLS.filter((t) => !(en && t.italyOnly) && (first || t.id in HANDOFF_ACCEPTS));
  });
  protected readonly canSave = computed(() => this.name().trim().length > 0 && this.steps().length >= MIN_STEPS);

  constructor() {
    effect(() => {
      const open = this.chains.dialogOpen();
      const d = this.dlg().nativeElement;
      if (open && !d.open) {
        this.restore = document.activeElement as HTMLElement | null;
        this.status.set('');
        d.showModal();
      } else if (!open && d.open) d.close();
    });
  }

  protected readonly title = (id: string): string => {
    const t = BY_ID.get(id);
    return t ? this.i18n.t(t.titleKey) : id;
  };

  protected add(id: string): void {
    if (id && this.steps().length < MAX_STEPS) this.steps.update((s) => [...s, id]);
  }
  protected remove(i: number): void {
    this.steps.update((s) => s.filter((_, j) => j !== i));
  }
  protected move(from: number, to: number): void {
    this.steps.update((s) => moveStep(s, from, to));
  }
  protected save(): void {
    const ok = this.chains.save(this.name(), this.steps());
    this.status.set(this.i18n.t(ok ? 'chain.saved.ok' : 'chain.saved.err'));
    if (ok) {
      this.name.set('');
      this.steps.set([]);
    }
  }
  protected onClose(): void {
    this.chains.dialogOpen.set(false);
    this.restore?.focus();
    this.restore = null;
  }
  protected onBackdrop(e: MouseEvent): void {
    if (e.target === this.dlg().nativeElement) this.dlg().nativeElement.close();
  }
}
