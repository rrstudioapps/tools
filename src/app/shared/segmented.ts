// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 rrstudio — rrstudio tools
import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

/** Selettore a pillola a segmenti (stesso stile del selettore di lingua dell'header). */
@Component({
  selector: 'app-segmented',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="seg" role="group" [attr.aria-label]="label()">
      @for (o of options(); track o.value) {
        <button
          type="button"
          class="seg-btn"
          [class.on]="value() === o.value"
          [attr.aria-pressed]="value() === o.value"
          [attr.data-shortcut]="toggleShortcut() && value() !== o.value ? toggleShortcut() : null"
          (click)="value.set(o.value)"
        >
          {{ o.label }}
        </button>
      }
    </div>
  `,
  styles: `
    :host {
      display: inline-flex;
      max-width: 100%;
    }
    .seg {
      display: inline-flex;
      flex-wrap: wrap;
      max-width: 100%;
      border: 1px solid var(--line);
      border-radius: 20px; /* come una capsula su una riga, angoli contenuti quando va a capo su due */
      padding: 2px;
    }
    .seg-btn {
      border: 0;
      border-radius: var(--radius-pill);
      background: transparent;
      color: var(--muted);
      padding: 6px 14px;
      font-family: var(--mono);
      font-size: var(--fs-xs);
      cursor: pointer;
      transition:
        background-color var(--dur) var(--ease),
        color var(--dur) var(--ease);
      &.on {
        background: var(--ink);
        color: var(--bg);
      }
      &:not(.on):hover {
        color: var(--ink);
      }
    }
  `,
})
export class Segmented<T extends string = string> {
  readonly label = input.required<string>();
  readonly options = input.required<readonly SegmentOption<T>[]>();
  readonly value = model.required<T>();
  /** Azione di scorciatoia (es. `toggle-view`) che passa all'altra opzione: ha senso con due opzioni; il pulsante marcato è quello non attivo. */
  readonly toggleShortcut = input<string | null>(null);
}
