// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 rrstudio — rrstudio Tools
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PalettePrefsService, RECENT_KEY, RECENT_ON_KEY } from './palette-prefs.service';

describe('PalettePrefsService', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('parte spento e init legge la scelta salvata', () => {
    localStorage.setItem(RECENT_ON_KEY, '1');
    const prefs = TestBed.inject(PalettePrefsService);
    expect(prefs.recentEnabled()).toBe(false);
    prefs.init();
    expect(prefs.recentEnabled()).toBe(true);
  });

  it('accendere salva la scelta, spegnere cancella la scelta e i recenti', () => {
    const prefs = TestBed.inject(PalettePrefsService);
    prefs.setRecent(true);
    expect(localStorage.getItem(RECENT_ON_KEY)).toBe('1');
    localStorage.setItem(RECENT_KEY, '[{"id":"hash-generator"}]');
    prefs.setRecent(false);
    expect(prefs.recentEnabled()).toBe(false);
    expect(localStorage.getItem(RECENT_ON_KEY)).toBeNull();
    expect(localStorage.getItem(RECENT_KEY)).toBeNull();
  });

  it('se lo storage lancia errori la scelta vale per la sessione e non si rompe niente', () => {
    const prefs = TestBed.inject(PalettePrefsService);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloccato');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('pieno');
    });
    expect(() => prefs.init()).not.toThrow();
    expect(prefs.recentEnabled()).toBe(false);
    expect(() => prefs.setRecent(true)).not.toThrow();
    expect(prefs.recentEnabled()).toBe(true);
  });
});
