// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 rrstudio — rrstudio tools
import { REPO_URL } from '../core/links';
import { feedbackUrl } from './tool-feedback-url';

const params = (u: string) => new URL(u).searchParams;

describe('feedbackUrl', () => {
  it('bug: modulo, etichetta, titolo, strumento, pagina e lingua, con encoding corretto', () => {
    const u = feedbackUrl('bug', { toolId: 'json-formatter', slug: 'json-formatter', lang: 'it' });
    expect(u.startsWith(`${REPO_URL}/issues/new?`)).toBe(true);
    expect(u).toContain('title=%5Bjson-formatter%5D%20');
    expect(u).not.toContain('+');
    const p = params(u);
    expect(p.get('template')).toBe('bug.yml');
    expect(p.get('labels')).toBe('bug');
    expect(p.get('title')).toBe('[json-formatter] ');
    expect(p.get('tool')).toBe('json-formatter');
    expect(p.get('page')).toBe('https://tools.rrstudio.app/json-formatter');
    expect(p.get('lang')).toBe('it');
  });

  it('enhancement: stessi parametri con modulo ed etichetta propri', () => {
    const p = params(feedbackUrl('enhancement', { toolId: 'base64', slug: 'base64', lang: 'it' }));
    expect(p.get('template')).toBe('enhancement.yml');
    expect(p.get('labels')).toBe('enhancement');
    expect(p.get('tool')).toBe('base64');
  });

  it('new-tool: niente parametro tool', () => {
    const p = params(feedbackUrl('new-tool', { toolId: 'base64', slug: 'base64', lang: 'it' }));
    expect(p.get('template')).toBe('new-tool.yml');
    expect(p.get('labels')).toBe('tool');
    expect(p.has('tool')).toBe(false);
    expect(p.get('title')).not.toContain('base64');
  });

  it('non include mai hash né query della pagina, anche se lo slug li contiene', () => {
    const u = feedbackUrl('bug', { toolId: 'json-formatter', slug: 'json-formatter?x=1#s=SEGRETO', lang: 'it' });
    expect(u).not.toContain('SEGRETO');
    expect(u).not.toContain('%23');
    expect(u).not.toContain('x%3D1');
    expect(params(u).get('page')).toBe('https://tools.rrstudio.app/json-formatter');
  });

  it('slug inglese: indirizzo sotto /en/', () => {
    const p = params(feedbackUrl('bug', { toolId: 'base64', slug: 'base64', lang: 'en' }));
    expect(p.get('page')).toBe('https://tools.rrstudio.app/en/base64');
    expect(p.get('lang')).toBe('en');
  });

  it('strumento solo italiano: pagina italiana senza /en/', () => {
    const p = params(feedbackUrl('bug', { toolId: 'codice-fiscale', slug: 'codice-fiscale', lang: 'it' }));
    expect(p.get('page')).toBe('https://tools.rrstudio.app/codice-fiscale');
  });

  it('home: pagina radice', () => {
    expect(params(feedbackUrl('new-tool', { slug: '', lang: 'en' })).get('page')).toBe('https://tools.rrstudio.app/en/');
  });
});
