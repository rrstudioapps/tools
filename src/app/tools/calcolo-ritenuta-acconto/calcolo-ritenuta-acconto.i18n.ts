// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 rrstudio — rrstudio tools
import type { ToolDictionaries } from '../../core/i18n/i18n.service';

/** Guida "come si usa" e domande frequenti (It): vedi shared/tool-guide.ts. */
const guideIt = {
  'guide.calcolo-ritenuta-acconto.step.1': 'In «Tipo di prestazione» scegli «Prestazione occasionale» oppure «Professionista».',
  'guide.calcolo-ritenuta-acconto.step.2': 'In «Che cosa conosci» scegli «Dal lordo al netto» se hai il compenso lordo, «Dal netto al lordo» se parti da quanto vuoi incassare.',
  'guide.calcolo-ritenuta-acconto.step.3': 'Scrivi l\'importo (per esempio 1.000,00) e controlla la «Ritenuta d\'acconto (%)», che si può modificare.',
  'guide.calcolo-ritenuta-acconto.step.4': 'In «Dati del documento» aggiungi se serve la rivalsa INPS 4%, la cassa previdenziale, l\'aliquota IVA e il bollo da 2 €.',
  'guide.calcolo-ritenuta-acconto.step.5': 'Nel «Prospetto» trovi ogni riga, dal compenso lordo al «Netto a pagare»; in «Da sapere» ci sono le note sul calcolo.',
  'guide.calcolo-ritenuta-acconto.q.1': 'Che cos\'è la ritenuta d\'acconto?',
  'guide.calcolo-ritenuta-acconto.a.1':
    'È una quota del compenso che chi paga (il sostituto d\'imposta) trattiene e versa al fisco per conto di chi riceve. Chi incassa riceve quindi il compenso lordo meno la ritenuta; lo strumento propone il 20%, ma la percentuale si può cambiare.',
  'guide.calcolo-ritenuta-acconto.q.2': 'Come si calcola il netto di una prestazione occasionale?',
  'guide.calcolo-ritenuta-acconto.a.2':
    'Il netto è il compenso lordo meno la ritenuta. Con un compenso di 1.000 euro e ritenuta al 20% la ritenuta è di 200 euro e il netto a pagare è di 800 euro.',
  'guide.calcolo-ritenuta-acconto.q.3': 'La ritenuta si calcola anche su rivalsa INPS e cassa previdenziale?',
  'guide.calcolo-ritenuta-acconto.a.3':
    'Sulla rivalsa INPS dipende dal caso: lo strumento ti lascia scegliere con «La ritenuta si applica anche alla rivalsa INPS». Sul contributo della cassa previdenziale la ritenuta non si calcola.',
  'guide.calcolo-ritenuta-acconto.q.4': 'Quando e come si versa la ritenuta?',
  'guide.calcolo-ritenuta-acconto.a.4':
    'Con il modello F24, entro il 16 del mese successivo a quello del pagamento: codice tributo 1040 per i professionisti e 1038 per le prestazioni occasionali. Va poi certificata con la Certificazione Unica.',
  'guide.calcolo-ritenuta-acconto.q.5': 'Che cosa fa «Dal netto al lordo»?',
  'guide.calcolo-ritenuta-acconto.a.5':
    'Parte dal netto che vuoi incassare e ricava il compenso lordo da indicare. Con gli arrotondamenti al centesimo il netto esatto potrebbe non essere raggiungibile: lo strumento mostra il più vicino e la differenza.',
  'guide.calcolo-ritenuta-acconto.q.6': 'È un calcolo che posso considerare definitivo?',
  'guide.calcolo-ritenuta-acconto.a.6':
    'No, è un calcolo indicativo e non sostituisce la consulenza fiscale: se hai dubbi su ritenuta, cassa o regime, verifica con il tuo commercialista.',
  'guide.calcolo-ritenuta-acconto.privacy':
    'Gli importi restano nel tuo browser e non vengono inviati. Se usi il pulsante di condivisione, i dati inseriti finiscono nell\'indirizzo del link, dopo il simbolo #: quella parte non arriva a nessun server, ma la vede chi riceve il link.',
};

const it = {
  ...guideIt,
  'rit.lead':
    'Dal lordo al netto (e dal netto al lordo) di una prestazione occasionale o di una parcella: ritenuta d\'acconto, rivalsa INPS, cassa previdenziale, IVA e bollo da 2 €, con il prospetto riga per riga da copiare.',
  'rit.disclaimer':
    'Strumento di calcolo indicativo, non è consulenza fiscale: verifica sempre il caso concreto con il tuo commercialista. Arrotondamenti al centesimo, riga per riga.',
  'rit.kind': 'Tipo di prestazione',
  'rit.kind.occasionale': 'Prestazione occasionale',
  'rit.kind.professionista': 'Professionista',
  'rit.dir': 'Che cosa conosci',
  'rit.dir.gross': 'Dal lordo al netto',
  'rit.dir.net': 'Dal netto al lordo',
  'rit.amount.gross': 'Compenso lordo (€)',
  'rit.amount.net': 'Netto che vuoi incassare (€)',
  'rit.amount.ph': 'Per esempio 1.000,00',
  'rit.amount.err': 'Scrivi un importo valido, per esempio 1.250,50.',
  'rit.ritenuta': 'Ritenuta d\'acconto (%)',
  'rit.ritenuta.err': 'Scrivi una percentuale valida, per esempio 20 o 11,5.',
  'rit.rivalsa': 'Rivalsa INPS 4%',
  'rit.rivalsaBase': 'La ritenuta si applica anche alla rivalsa INPS',
  'rit.cassa': 'Cassa previdenziale (%)',
  'rit.cassa.ph': '0 = nessuna',
  'rit.cassa.err': 'Scrivi una percentuale valida, per esempio 4 o 2,5.',
  'rit.vat': 'Aliquota IVA (%)',
  'rit.vat.hint': '0 per forfettari e prestazioni occasionali',
  'rit.vat.err': 'Scrivi una percentuale valida, per esempio 22.',
  'rit.bollo': 'Addebita il bollo di 2 € al cliente',
  'rit.opts': 'Dati del documento',
  'rit.result': 'Risultato',
  'rit.summary': 'Prospetto',
  'rit.row.compenso': 'Compenso lordo',
  'rit.row.rivalsa': 'Rivalsa INPS 4%',
  'rit.row.cassa': 'Cassa previdenziale {rate}',
  'rit.row.imponibile': 'Imponibile',
  'rit.row.vat': 'IVA {rate}',
  'rit.row.bollo': 'Imposta di bollo',
  'rit.row.total': 'Totale documento',
  'rit.row.ritenuta': 'Ritenuta d\'acconto {rate} su {base}',
  'rit.row.netto': 'Netto a pagare',
  'rit.headline.gross': 'Compenso lordo da indicare',
  'rit.reverse.exact': 'Con questo compenso il netto è esattamente {net}.',
  'rit.reverse.diff': 'Con gli arrotondamenti al centesimo il netto esatto non è raggiungibile: il più vicino è {net} ({diff} rispetto a quello desiderato).',
  'rit.notes': 'Da sapere',
  'rit.note.bollo': 'Imposta di bollo di 2,00 € addebitata al cliente: l\'importo senza IVA supera 77,47 €.',
  'rit.note.bolloNot': 'Bollo di 2,00 € dovuto ma a carico di chi emette: non è sommato al totale.',
  'rit.note.cassa': 'La ritenuta non si calcola sul contributo della cassa previdenziale.',
  'rit.note.cu': 'La ritenuta va versata con F24 entro il 16 del mese successivo (codice tributo 1040 per i professionisti, 1038 per le prestazioni occasionali) e certificata con la Certificazione Unica.',
  'rit.empty': 'Scrivi un importo per vedere il prospetto.',
};

/** Guida "come si usa" e domande frequenti (En): vedi shared/tool-guide.ts. */
const guideEn = {
  'guide.calcolo-ritenuta-acconto.step.1': 'Under “Type of service” choose “Occasional service” or “Professional”.',
  'guide.calcolo-ritenuta-acconto.step.2': 'Under “What you know” choose “Gross to net” if you have the gross fee, “Net to gross” if you start from what you want to receive.',
  'guide.calcolo-ritenuta-acconto.step.3': 'Enter the amount (for example 1,000.00) and check the “Withholding tax (%)”, which can be changed.',
  'guide.calcolo-ritenuta-acconto.step.4': 'Under “Document details” add, if needed, the 4% INPS surcharge, the pension fund contribution, the VAT rate and the €2 stamp duty.',
  'guide.calcolo-ritenuta-acconto.step.5': 'The “Breakdown” shows every line, from the gross fee to the “Net payable”; “Good to know” has notes on the calculation.',
  'guide.calcolo-ritenuta-acconto.q.1': 'What is withholding tax (ritenuta d\'acconto)?',
  'guide.calcolo-ritenuta-acconto.a.1':
    'It is a share of the fee that the payer (the withholding agent, or sostituto d\'imposta) keeps and pays to the tax authorities on behalf of the recipient. The recipient therefore receives the gross fee minus the withholding; the tool proposes 20%, but the percentage can be changed.',
  'guide.calcolo-ritenuta-acconto.q.2': 'How do I calculate the net amount of an occasional service?',
  'guide.calcolo-ritenuta-acconto.a.2':
    'The net amount is the gross fee minus the withholding. With a fee of 1,000 euro and 20% withholding, the withholding is 200 euro and the net payable is 800 euro.',
  'guide.calcolo-ritenuta-acconto.q.3': 'Is withholding also calculated on the INPS surcharge and the pension fund contribution?',
  'guide.calcolo-ritenuta-acconto.a.3':
    'For the INPS surcharge (rivalsa) it depends on the case: the tool lets you choose with “Withholding also applies to the INPS surcharge”. The pension fund contribution is not subject to withholding.',
  'guide.calcolo-ritenuta-acconto.q.4': 'When and how is the withholding paid?',
  'guide.calcolo-ritenuta-acconto.a.4':
    'With form F24, by the 16th of the month after the payment: tax code 1040 for professionals and 1038 for occasional services. It must then be certified with the Certificazione Unica (CU).',
  'guide.calcolo-ritenuta-acconto.q.5': 'What does “Net to gross” do?',
  'guide.calcolo-ritenuta-acconto.a.5':
    'It starts from the net amount you want to receive and works out the gross fee to invoice. Because of rounding to the cent the exact net amount may not be reachable: the tool shows the closest one and the difference.',
  'guide.calcolo-ritenuta-acconto.q.6': 'Can I treat this calculation as final?',
  'guide.calcolo-ritenuta-acconto.a.6':
    'No, it is an indicative calculation and does not replace tax advice: if you have doubts about withholding, pension fund or tax regime, check with your accountant (commercialista).',
  'guide.calcolo-ritenuta-acconto.privacy':
    'Amounts stay in your browser and are not sent anywhere. If you use the share button, the data you entered ends up in the link address, after the # symbol: that part never reaches any server, but whoever receives the link can see it.',
};

const en: typeof it = {
  ...guideEn,
  'rit.lead':
    'From gross to net (and from net to gross) for an occasional service or a professional fee: withholding tax (ritenuta d\'acconto), INPS surcharge (rivalsa), pension fund contribution, VAT and €2 stamp duty, with a line-by-line breakdown you can copy.',
  'rit.disclaimer':
    'Indicative calculation tool, not tax advice: always check your specific case with your accountant (commercialista). Rounded to the cent, line by line.',
  'rit.kind': 'Type of service',
  'rit.kind.occasionale': 'Occasional service',
  'rit.kind.professionista': 'Professional',
  'rit.dir': 'What you know',
  'rit.dir.gross': 'Gross to net',
  'rit.dir.net': 'Net to gross',
  'rit.amount.gross': 'Gross fee (€)',
  'rit.amount.net': 'Net amount you want to receive (€)',
  'rit.amount.ph': 'For example 1,000.00',
  'rit.amount.err': 'Enter a valid amount, for example 1,250.50.',
  'rit.ritenuta': 'Withholding tax (%)',
  'rit.ritenuta.err': 'Enter a valid percentage, for example 20 or 11,5.',
  'rit.rivalsa': 'INPS surcharge 4%',
  'rit.rivalsaBase': 'Withholding also applies to the INPS surcharge',
  'rit.cassa': 'Pension fund contribution (%)',
  'rit.cassa.ph': '0 = none',
  'rit.cassa.err': 'Enter a valid percentage, for example 4 or 2,5.',
  'rit.vat': 'VAT rate (%)',
  'rit.vat.hint': '0 for flat-rate scheme (forfettari) and occasional services',
  'rit.vat.err': 'Enter a valid percentage, for example 22.',
  'rit.bollo': 'Charge the €2 stamp duty to the client',
  'rit.opts': 'Document details',
  'rit.result': 'Result',
  'rit.summary': 'Breakdown',
  'rit.row.compenso': 'Gross fee',
  'rit.row.rivalsa': 'INPS surcharge 4%',
  'rit.row.cassa': 'Pension fund contribution {rate}',
  'rit.row.imponibile': 'Taxable amount',
  'rit.row.vat': 'VAT {rate}',
  'rit.row.bollo': 'Stamp duty (marca da bollo)',
  'rit.row.total': 'Document total',
  'rit.row.ritenuta': 'Withholding tax {rate} on {base}',
  'rit.row.netto': 'Net payable',
  'rit.headline.gross': 'Gross fee to invoice',
  'rit.reverse.exact': 'With this fee the net amount is exactly {net}.',
  'rit.reverse.diff': 'Because of rounding to the cent the exact net amount cannot be reached: the closest is {net} ({diff} from the desired amount).',
  'rit.notes': 'Good to know',
  'rit.note.bollo': '€2.00 stamp duty charged to the client: the amount excluding VAT exceeds €77.47.',
  'rit.note.bolloNot': '€2.00 stamp duty is due but borne by the issuer: it is not added to the total.',
  'rit.note.cassa': 'Withholding is not calculated on the pension fund contribution.',
  'rit.note.cu': 'The withholding must be paid with form F24 by the 16th of the following month (tax code 1040 for professionals, 1038 for occasional services) and certified with the Certificazione Unica.',
  'rit.empty': 'Enter an amount to see the breakdown.',
};

export const RITENUTA_DICTIONARIES: ToolDictionaries = { it, en };
