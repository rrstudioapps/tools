// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 rrstudio — rrstudio Tools
import type { Schema } from '../../shared/share-state';

/** Impostazioni nel link di condivisione (mai il file). */
export const SHARE_SCHEMA: Schema = {
  threshold: { type: 'number', min: 0, max: 5 },
  margin: { type: 'number', min: 0, max: 25, int: true },
  noise: { type: 'number', min: 0, max: 3, int: true },
};
