// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 rrstudio — rrstudio tools
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { I18nService, ToolDictionaries } from '../core/i18n/i18n.service';
import { SeoService } from '../core/seo/seo.service';
import { CF_DICTIONARIES } from '../tools/codice-fiscale/codice-fiscale.i18n';
import { IVA_DICTIONARIES } from '../tools/calcolo-iva/calcolo-iva.i18n';
import { RITENUTA_DICTIONARIES } from '../tools/calcolo-ritenuta-acconto/calcolo-ritenuta-acconto.i18n';
import { IMAGE_COMPRESSOR_DICTIONARIES } from '../tools/image-compressor/image-compressor.i18n';
import { IMAGES_PDF_DICTIONARIES } from '../tools/images-pdf/images-pdf.i18n';
import { JSON_FORMATTER_DICTIONARIES } from '../tools/json-formatter/json-formatter.i18n';
import { PASSWORD_DICTIONARIES } from '../tools/password-generator/password-generator.i18n';
import { PDF_TOOLS_DICTIONARIES } from '../tools/pdf-tools/pdf-tools.i18n';
import { QR_DICTIONARIES } from '../tools/qr-code/qr-code.i18n';
import { WC_DICTIONARIES } from '../tools/word-counter/word-counter.i18n';
import { TOOLS } from '../tools/tools.registry';
import { ToolGuide } from './tool-guide';

const DEMO: ToolDictionaries = {
  it: {
    'guide.demo.step.1': 'Primo passo',
    'guide.demo.step.2': 'Secondo passo',
    'guide.demo.q.1': 'Domanda uno?',
    'guide.demo.a.1': 'Risposta <uno> & "due".',
    'guide.demo.q.2': 'Domanda due?',
    'guide.demo.a.2': 'Risposta due.',
    'guide.demo.privacy': 'Niente esce dal browser.',
  },
  en: {},
};

const ldScripts = (): HTMLScriptElement[] =>
  Array.from(document.head.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]'));

describe('ToolGuide', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });
  afterEach(() => {
    ldScripts().forEach((s) => s.remove());
  });

  function create(toolId: string) {
    const i18n = TestBed.inject(I18nService);
    i18n.register(DEMO);
    const fixture = TestBed.createComponent(ToolGuide);
    fixture.componentRef.setInput('toolId', toolId);
    fixture.detectChanges();
    return fixture;
  }

  it('rende passi, domande e privacy con la semantica giusta', () => {
    const el = create('demo').nativeElement as HTMLElement;
    expect(el.querySelectorAll('h2').length).toBe(3);
    expect(Array.from(el.querySelectorAll('ol > li')).map((l) => l.textContent?.trim())).toEqual(['Primo passo', 'Secondo passo']);
    const details = el.querySelectorAll('details');
    expect(details.length).toBe(2);
    expect(details[0].querySelector('summary')?.textContent?.trim()).toBe('Domanda uno?');
    expect(details[0].querySelector('p')?.textContent?.trim()).toBe('Risposta <uno> & "due".');
    expect(el.textContent).toContain('Niente esce dal browser.');
  });

  it('emette un solo JSON-LD FAQPage coerente col testo visibile', () => {
    const fixture = create('demo');
    const scripts = ldScripts();
    expect(scripts.length).toBe(1);
    expect(scripts[0].textContent).not.toContain('<');
    const data = JSON.parse(scripts[0].textContent ?? '');
    expect(data['@type']).toBe('FAQPage');
    const visible = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('details')).map((d) => [
      d.querySelector('summary')?.textContent?.trim(),
      d.querySelector('p')?.textContent?.trim(),
    ]);
    const ld = data.mainEntity.map((q: { name: string; acceptedAnswer: { text: string } }) => [q.name, q.acceptedAnswer.text]);
    expect(ld).toEqual(visible);
    // un secondo ciclo di rilevazione non duplica lo script
    fixture.detectChanges();
    expect(ldScripts().length).toBe(1);
  });

  it('toglie il JSON-LD quando il componente viene distrutto', () => {
    const fixture = create('demo');
    expect(ldScripts().length).toBe(1);
    fixture.destroy();
    expect(ldScripts().length).toBe(0);
  });

  it('senza guida non rende nulla e non emette JSON-LD', () => {
    const fixture = create('nessuna-guida');
    expect((fixture.nativeElement as HTMLElement).querySelector('section')).toBeNull();
    expect(ldScripts().length).toBe(0);
  });
});

describe('SeoService.setJsonLd', () => {
  afterEach(() => {
    ldScripts().forEach((s) => s.remove());
  });

  it('sostituisce lo script con lo stesso id e lo toglie con null', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const seo = TestBed.inject(SeoService);
    seo.setJsonLd('x', { a: 1 });
    seo.setJsonLd('x', { a: 2, t: '</script>' });
    const scripts = ldScripts();
    expect(scripts.length).toBe(1);
    expect(scripts[0].textContent).not.toContain('</script>');
    expect(JSON.parse(scripts[0].textContent ?? '')).toEqual({ a: 2, t: '</script>' });
    seo.setJsonLd('x', null);
    expect(ldScripts().length).toBe(0);
  });
});

describe('contenuti delle guide', () => {
  const GUIDES: Record<string, ToolDictionaries> = {
    'codice-fiscale': CF_DICTIONARIES,
    'calcolo-iva': IVA_DICTIONARIES,
    'calcolo-ritenuta-acconto': RITENUTA_DICTIONARIES,
    'qr-code-generator': QR_DICTIONARIES,
    'image-compressor': IMAGE_COMPRESSOR_DICTIONARIES,
    'pdf-tools': PDF_TOOLS_DICTIONARIES,
    'images-to-pdf': IMAGES_PDF_DICTIONARIES,
    'password-generator': PASSWORD_DICTIONARIES,
    'json-formatter': JSON_FORMATTER_DICTIONARIES,
    'word-counter': WC_DICTIONARIES,
  };

  for (const [id, dicts] of Object.entries(GUIDES)) {
    const tool = TOOLS.find((t) => t.id === id);
    it(`${id}: passi e domande complete (italiano e inglese)`, () => {
      expect(tool).toBeDefined();
      for (const lang of (['it', 'en'] as const)) {
        const d = dicts[lang];
        const steps = Object.keys(d).filter((k) => k.startsWith(`guide.${id}.step.`));
        const questions = Object.keys(d).filter((k) => k.startsWith(`guide.${id}.q.`));
        expect(steps.length, `${id} ${lang} passi`).toBeGreaterThanOrEqual(3);
        expect(steps.length).toBeLessThanOrEqual(6);
        expect(questions.length, `${id} ${lang} domande`).toBeGreaterThanOrEqual(4);
        expect(questions.length).toBeLessThanOrEqual(6);
        questions.forEach((_, i) => {
          expect(d[`guide.${id}.q.${i + 1}`]).toMatch(/\S/);
          expect(d[`guide.${id}.a.${i + 1}`]).toMatch(/\S/);
        });
      }
    });
  }
});
