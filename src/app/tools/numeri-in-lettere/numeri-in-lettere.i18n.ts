// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 rrstudio — rrstudio tools
import type { ToolDictionaries } from '../../core/i18n/i18n.service';

const it = {
  'nl.lead':
    'Scrivi un numero (anche con decimali o negativo, fino a 999 miliardi) e ottieni la scrittura in lettere in italiano corretto: ventuno, centottanta, ventitré, milleuno. Con la modalità assegno ottieni l\'importo con i centesimi in cifre, per esempio «milleduecentotrentaquattro/56».',
  'nl.mode': 'Modalità',
  'nl.mode.text': 'Testo normale',
  'nl.mode.cheque': 'Assegno / importo',
  'nl.input': 'Numero',
  'nl.input.ph': 'Per esempio 1.234,56',
  'nl.euro': 'Aggiungi «euro» davanti',
  'nl.joined': 'Milioni e miliardi attaccati (unmilione)',
  'nl.case': 'Maiuscole e minuscole',
  'nl.case.lower': 'minuscolo',
  'nl.case.capitalize': 'Iniziale maiuscola',
  'nl.case.upper': 'MAIUSCOLO',
  'nl.result': 'In lettere',
  'nl.empty': 'Scrivi un numero per vedere come si scrive in lettere.',
  'nl.err.invalid': 'Non è un numero valido. Usa cifre, la virgola per i decimali e il meno per i negativi, per esempio -1.234,56.',
  'nl.err.range': 'Numero troppo grande: lo strumento arriva fino a 999.999.999.999 (novecentonovantanove miliardi…).',
  'nl.err.negativeCheque': 'Un importo da assegno non può essere negativo: usa la modalità «Testo normale».',
  'nl.note.cheque': 'Oltre i due decimali l\'importo è arrotondato al centesimo.',
  'nl.rules.title': 'Regole applicate',
  'nl.rules.1': 'Le decine perdono la vocale davanti a «uno» e «otto»: ventuno, trentotto.',
  'nl.rules.2': '«Cento» perde la «o» davanti a «otto» e «ottanta»: centotto, centottanta.',
  'nl.rules.3': 'L\'accento su «tré» solo in fondo al numero: ventitré, ma ventitremila.',
  'nl.rules.4': 'Mille diventa «mila» (duemila) e milione e miliardo sono parole separate: un milione, due miliardi.',
};

const en: typeof it = {
  'nl.lead':
    'Type a number in Italian format (comma for decimals, dot for thousands; negative values too, up to 999 billion) and get it written out in words in correct Italian: ventuno, centottanta, ventitré, milleuno. The result is always in Italian. In cheque mode you get the amount with the cents in figures, for example “milleduecentotrentaquattro/56”.',
  'nl.mode': 'Mode',
  'nl.mode.text': 'Plain text',
  'nl.mode.cheque': 'Cheque / amount',
  'nl.input': 'Number',
  'nl.input.ph': 'For example 1.234,56 (Italian format)',
  'nl.euro': 'Add “euro” in front',
  'nl.joined': 'Join millions and billions (unmilione)',
  'nl.case': 'Letter case',
  'nl.case.lower': 'lowercase',
  'nl.case.capitalize': 'Capitalised',
  'nl.case.upper': 'UPPERCASE',
  'nl.result': 'In words (Italian)',
  'nl.empty': 'Type a number to see how it is written in Italian words.',
  'nl.err.invalid': 'Not a valid number. Use digits, a comma for decimals and a minus sign for negatives, for example -1.234,56.',
  'nl.err.range': 'Number too large: the tool goes up to 999.999.999.999 (novecentonovantanove miliardi…).',
  'nl.err.negativeCheque': 'A cheque amount cannot be negative: use “Plain text” mode.',
  'nl.note.cheque': 'Beyond two decimals the amount is rounded to the cent.',
  'nl.rules.title': 'Rules applied',
  'nl.rules.1': 'Tens drop their final vowel before “uno” and “otto”: ventuno, trentotto.',
  'nl.rules.2': '“Cento” drops the “o” before “otto” and “ottanta”: centotto, centottanta.',
  'nl.rules.3': 'The accent on “tré” only at the end of the number: ventitré, but ventitremila.',
  'nl.rules.4': 'Mille becomes “mila” (duemila), while milione and miliardo are separate words: un milione, due miliardi.',
};

export const NL_DICTIONARIES: ToolDictionaries = { it, en };
