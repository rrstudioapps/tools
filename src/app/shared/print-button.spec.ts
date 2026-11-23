// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 rrstudio — rrstudio tools
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, describe, expect, it } from 'vitest';
import { I18nService } from '../core/i18n/i18n.service';
import { PrintButton, printAddress, printDate } from './print-button';

describe('stampa: intestazione', () => {
  it("l'indirizzo è canonico, senza hash né query", () => {
    expect(printAddress('compound-interest', 'it')).toBe('https://tools.rrstudio.app/compound-interest');
    expect(printAddress('compound-interest', 'en')).toBe('https://tools.rrstudio.app/en/compound-interest');
    expect(printAddress('/compound-interest/?a=1#s=dati', 'it')).toBe('https://tools.rrstudio.app/compound-interest');
  });

  it('la data è solo la data, nella lingua', () => {
    const d = new Date(2026, 10, 18, 15, 30);
    expect(printDate(d, 'it')).toBe('18 novembre 2026');
    expect(printDate(d, 'en')).toBe('18 November 2026');
  });
});

describe('PrintButton', () => {
  const url = window.location.pathname + window.location.search;
  afterEach(() => history.replaceState(null, '', url));

  it("l'indirizzo mostrato non contiene # né ? anche se la pagina ha hash e query", async () => {
    history.replaceState(null, '', url + '?x=1#s=segreto');
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    TestBed.inject(I18nService).slug.set('compound-interest');
    const fixture = TestBed.createComponent(PrintButton);
    fixture.componentRef.setInput('title', 'Interesse composto');
    fixture.componentRef.setInput('params', [{ label: 'Capitale', value: '10.000 €' }]);
    fixture.detectChanges();
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    const shown = el.querySelector('[data-testid="print-url"]')!.textContent!;
    expect(shown).toBe('https://tools.rrstudio.app/compound-interest');
    expect(shown).not.toMatch(/[#?]/);
    expect(el.textContent).not.toContain('segreto');
    expect(el.querySelector('[data-testid="print-summary"]')!.textContent).toContain('10.000 €');
    expect(el.querySelector('button')!.getAttribute('data-shortcut')).toBe('print');
  });
});
