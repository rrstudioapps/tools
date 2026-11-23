// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 rrstudio — rrstudio tools
import { describe, expect, it } from 'vitest';
import { TOOLS } from '../../tools/tools.registry';
import {
  FavState,
  MAX_GROUPS,
  MAX_GROUP_TOOLS,
  MAX_NAME,
  addGroup,
  addToGroup,
  cleanName,
  decodeShare,
  deleteGroup,
  emptyState,
  encodeShare,
  exportJson,
  mergeStates,
  moveFavorite,
  moveGroup,
  moveInGroup,
  moveInList,
  newGroupId,
  parseImport,
  parseStored,
  removeFromGroup,
  renameGroup,
  sanitize,
  serialize,
  shareFromHash,
  toggleFavorite,
} from './favorites.logic';

const known = new Set(['a', 'b', 'c', 'd', 'e']);
const st = (favorites: string[], groups: FavState['groups'] = []): FavState => ({ v: 1, favorites, groups });

describe('sanitize / migrate', () => {
  it('scarta gli id sconosciuti, i duplicati e i valori non stringa, e li conta', () => {
    const r = sanitize({ v: 1, favorites: ['a', 'zz', 'a', 3, 'b'], groups: [] }, known)!;
    expect(r.state.favorites).toEqual(['a', 'b']);
    expect(r.unknown).toBe(2);
  });
  it('rifiuta ciò che non è riconoscibile', () => {
    expect(sanitize(null, known)).toBeNull();
    expect(sanitize('x', known)).toBeNull();
    expect(sanitize({ foo: 1 }, known)).toBeNull();
    expect(sanitize({ v: 'uno', favorites: [] }, known)).toBeNull();
    expect(sanitize({ v: -1, favorites: [] }, known)).toBeNull();
  });
  it('migra il formato v0 (elenco semplice o oggetto senza versione)', () => {
    expect(sanitize(['a', 'b'], known)!.state).toEqual(st(['a', 'b']));
    expect(sanitize({ favorites: ['c'] }, known)!.state).toEqual(st(['c']));
  });
  it('una versione futura si legge per i campi noti', () => {
    expect(sanitize({ v: 7, favorites: ['a'], groups: [], extra: 1 }, known)!.state).toEqual(st(['a']));
  });
  it('gruppi: nome obbligatorio, id unico, strumenti ripuliti', () => {
    const r = sanitize(
      {
        favorites: [],
        groups: [
          { id: 'x1', name: '  Lavoro  ', tools: ['a', 'q', 'a', 'b'] },
          { id: 'x1', name: 'Doppio id', tools: [] },
          { id: 'x2', name: '   ', tools: ['a'] },
          'non un oggetto',
        ],
      },
      known,
    )!;
    expect(r.state.groups.map((g) => g.name)).toEqual(['Lavoro', 'Doppio id']);
    expect(r.state.groups[0].tools).toEqual(['a', 'b']);
    expect(new Set(r.state.groups.map((g) => g.id)).size).toBe(2);
    expect(r.state.groups[0].id).toBe('x1');
    expect(r.unknown).toBe(1);
  });
  it('limiti: al massimo 20 gruppi, nome di 40 caratteri, 58 strumenti per gruppo', () => {
    const many = Array.from({ length: 25 }, (_, i) => ({ name: 'G' + i, tools: [] }));
    expect(sanitize({ groups: many }, known)!.state.groups).toHaveLength(MAX_GROUPS);
    const long = sanitize({ groups: [{ name: 'x'.repeat(100), tools: [] }] }, known)!;
    expect(Array.from(long.state.groups[0].name)).toHaveLength(MAX_NAME);
    expect(long.trimmed).toBeGreaterThan(0);
    const wide = new Set(Array.from({ length: 80 }, (_, i) => 't' + i));
    const r = sanitize({ groups: [{ name: 'Tutti', tools: [...wide] }] }, wide)!;
    expect(r.state.groups[0].tools).toHaveLength(MAX_GROUP_TOOLS);
  });
  it('cleanName toglie i caratteri di controllo e normalizza gli spazi', () => {
    expect(cleanName(' a\t\n  b\u0000c ')).toBe('a b c');
    expect(cleanName(42)).toBe('');
  });
  it('parseStored: dati assenti, rotti o sconosciuti danno lo stato vuoto', () => {
    expect(parseStored(null, known)).toEqual(emptyState());
    expect(parseStored('{rotto', known)).toEqual(emptyState());
    expect(parseStored('"stringa"', known)).toEqual(emptyState());
    const s = st(['a', 'b'], [{ id: 'g1', name: 'Uno', tools: ['c'] }]);
    expect(parseStored(serialize(s), known)).toEqual(s);
  });
  it('gli id di tutti gli strumenti reali sono accettati', () => {
    const real = new Set(TOOLS.map((t) => t.id));
    const s = st(TOOLS.map((t) => t.id));
    expect(sanitize(s, real)!.state.favorites).toEqual(TOOLS.map((t) => t.id));
  });
});

describe('operazioni', () => {
  it('toggleFavorite aggiunge, toglie e ignora gli id sconosciuti', () => {
    let s = toggleFavorite(emptyState(), 'a', known);
    s = toggleFavorite(s, 'b', known);
    expect(s.favorites).toEqual(['a', 'b']);
    expect(toggleFavorite(s, 'a', known).favorites).toEqual(['b']);
    expect(toggleFavorite(s, 'zz', known)).toBe(s);
  });
  it('moveInList sposta e ignora le posizioni fuori intervallo', () => {
    expect(moveInList(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
    expect(moveInList(['a', 'b', 'c'], 2, 1)).toEqual(['a', 'c', 'b']);
    expect(moveInList(['a', 'b'], 0, 5)).toEqual(['a', 'b']);
    expect(moveInList(['a', 'b'], -1, 0)).toEqual(['a', 'b']);
    expect(moveFavorite(st(['a', 'b']), 1, 0).favorites).toEqual(['b', 'a']);
  });
  it('gruppi: crea, rinomina, sposta, elimina', () => {
    let s = addGroup(emptyState(), '  Lavoro ', 'g1')!;
    s = addGroup(s, 'Casa', 'g2')!;
    expect(addGroup(s, '   ')).toBeNull();
    s = renameGroup(s, 'g1', 'Ufficio');
    expect(s.groups.map((g) => g.name)).toEqual(['Ufficio', 'Casa']);
    expect(renameGroup(s, 'g1', '  ')).toBe(s);
    s = moveGroup(s, 0, 1);
    expect(s.groups.map((g) => g.id)).toEqual(['g2', 'g1']);
    expect(deleteGroup(s, 'g2').groups.map((g) => g.id)).toEqual(['g1']);
  });
  it('addGroup rispetta il limite di 20 gruppi', () => {
    let s = emptyState();
    for (let i = 0; i < MAX_GROUPS; i++) s = addGroup(s, 'G' + i)!;
    expect(addGroup(s, 'Uno di troppo')).toBeNull();
  });
  it('strumenti nei gruppi: niente duplicati né sconosciuti, ordine modificabile', () => {
    let s = addGroup(emptyState(), 'G', 'g1')!;
    s = addToGroup(s, 'g1', 'a', known);
    s = addToGroup(s, 'g1', 'a', known);
    s = addToGroup(s, 'g1', 'zz', known);
    s = addToGroup(s, 'g1', 'b', known);
    s = addToGroup(s, 'nessuno', 'c', known);
    expect(s.groups[0].tools).toEqual(['a', 'b']);
    s = moveInGroup(s, 'g1', 1, 0);
    expect(s.groups[0].tools).toEqual(['b', 'a']);
    expect(removeFromGroup(s, 'g1', 'b').groups[0].tools).toEqual(['a']);
  });
  it('newGroupId evita gli id già usati', () => {
    const seq = [0.1, 0.1, 0.2];
    const id = newGroupId(['g' + Math.floor(0.1 * 36 ** 6).toString(36).padStart(6, '0')], () => seq.shift()!);
    expect(id).toBe('g' + Math.floor(0.2 * 36 ** 6).toString(36).padStart(6, '0'));
  });
});

describe('mergeStates', () => {
  it('unisce preferiti e gruppi con lo stesso nome (senza maiuscole)', () => {
    const base = st(['a', 'b'], [{ id: 'g1', name: 'Lavoro', tools: ['a'] }]);
    const inc = st(['b', 'c'], [
      { id: 'zz', name: 'lavoro', tools: ['a', 'd'] },
      { id: 'zz', name: 'Casa', tools: ['e'] },
    ]);
    const m = mergeStates(base, inc);
    expect(m.favorites).toEqual(['a', 'b', 'c']);
    expect(m.groups.map((g) => [g.name, g.tools])).toEqual([
      ['Lavoro', ['a', 'd']],
      ['Casa', ['e']],
    ]);
    expect(new Set(m.groups.map((g) => g.id)).size).toBe(2);
  });
  it('non supera il limite di gruppi', () => {
    let base = emptyState();
    for (let i = 0; i < MAX_GROUPS; i++) base = addGroup(base, 'G' + i)!;
    const m = mergeStates(base, st([], [{ id: 'x', name: 'Nuovo', tools: [] }]));
    expect(m.groups).toHaveLength(MAX_GROUPS);
  });
  it('non modifica gli stati di partenza', () => {
    const base = st(['a'], [{ id: 'g1', name: 'L', tools: ['a'] }]);
    mergeStates(base, st(['b'], [{ id: 'x', name: 'L', tools: ['b'] }]));
    expect(base.groups[0].tools).toEqual(['a']);
  });
});

describe('esportazione, importazione, condivisione', () => {
  const s = st(['a', 'c'], [{ id: 'g1', name: 'Città: àèì 🚀', tools: ['b', 'd'] }]);
  it('export → import ridà lo stesso stato', () => {
    const r = parseImport(exportJson(s), known);
    expect(r.ok && r.state).toEqual(s);
  });
  it('encodeShare / decodeShare: round trip con unicode, senza caratteri non URL-safe', () => {
    const enc = encodeShare(s);
    expect(enc).toMatch(/^[A-Za-z0-9_-]+$/);
    const r = decodeShare(enc, known);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.state.favorites).toEqual(['a', 'c']);
      expect(r.state.groups[0].name).toBe('Città: àèì 🚀');
      expect(r.state.groups[0].tools).toEqual(['b', 'd']);
    }
  });
  it('decodeShare scarta gli id sconosciuti e lo segnala', () => {
    const r = decodeShare(encodeShare(st(['a', 'zz'])), known);
    expect(r.ok && r.unknown).toBe(1);
  });
  it('errori chiari', () => {
    expect(parseImport('', known)).toEqual({ ok: false, error: 'empty' });
    expect(parseImport('{no', known)).toEqual({ ok: false, error: 'json' });
    expect(parseImport('{"x":1}', known)).toEqual({ ok: false, error: 'shape' });
    expect(parseImport('{"favorites":["zz"]}', known)).toEqual({ ok: false, error: 'nothing' });
    expect(parseImport(' '.repeat(5) + 'x'.repeat(300_000), known)).toEqual({ ok: false, error: 'tooBig' });
    expect(decodeShare('', known)).toEqual({ ok: false, error: 'empty' });
    expect(decodeShare('a$b', known)).toEqual({ ok: false, error: 'encoding' });
    expect(decodeShare('abcde', known)).toEqual({ ok: false, error: 'encoding' });
    expect(decodeShare('AAAA', known).ok).toBe(false);
    expect(decodeShare('x'.repeat(30_000), known)).toEqual({ ok: false, error: 'tooBig' });
  });
  it('shareFromHash legge d= nel fragment', () => {
    expect(shareFromHash('#d=abc_-9')).toBe('abc_-9');
    expect(shareFromHash('#x=1&d=zz')).toBe('zz');
    expect(shareFromHash('#altro')).toBeNull();
    expect(shareFromHash('')).toBeNull();
  });
});
