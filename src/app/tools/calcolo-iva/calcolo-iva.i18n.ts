// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 rrstudio — rrstudio tools
import type { ToolDictionaries } from '../../core/i18n/i18n.service';

/** Guida "come si usa" e domande frequenti (It): vedi shared/tool-guide.ts. */
const guideIt = {
  'guide.calcolo-iva.step.1': 'In «Che cosa vuoi calcolare» scegli «Aggiungi IVA» se hai l\'imponibile, «Scorpora IVA» se hai il totale con IVA, «Notula / fattura» per una parcella con rivalsa, cassa, ritenuta e bollo, oppure «Dal netto al compenso» se parti dal netto che vuoi incassare.',
  'guide.calcolo-iva.step.2': 'Scrivi l\'importo nel campo (per esempio 1.000,00): l\'etichetta cambia in base alla modalità scelta.',
  'guide.calcolo-iva.step.3': 'Scegli l\'«Aliquota IVA». Con «0% (senza IVA)» indica anche la «Natura dell\'operazione senza IVA».',
  'guide.calcolo-iva.step.4': 'Per una notula, in «Dati della notula» attiva ciò che serve: regime forfettario, rivalsa INPS 4%, cassa previdenziale, ritenuta d\'acconto e bollo da 2 €.',
  'guide.calcolo-iva.step.5': 'Leggi il «Risultato» riga per riga; in «Da riportare in fattura» trovi le diciture che servono nei casi particolari.',
  'guide.calcolo-iva.q.1': 'Che differenza c\'è tra aggiungere e scorporare l\'IVA?',
  'guide.calcolo-iva.a.1':
    'Aggiungendo parti dall\'imponibile e sommi l\'IVA per avere il totale. Scorporando parti dal totale con IVA inclusa e ricavi imponibile e IVA: con l\'aliquota al 22%, per esempio, 122 euro lordi sono 100 euro di imponibile e 22 di IVA.',
  'guide.calcolo-iva.q.2': 'Che cos\'è la rivalsa INPS del 4%?',
  'guide.calcolo-iva.a.2':
    'È una maggiorazione che il professionista può addebitare in fattura al cliente. Nella modalità «Notula / fattura» lo strumento la somma al compenso e ti fa scegliere se la ritenuta d\'acconto si applica anche su di essa.',
  'guide.calcolo-iva.q.3': 'Quando serve il bollo da 2 euro?',
  'guide.calcolo-iva.a.3':
    'Sulle fatture senza IVA di importo superiore a 77,47 euro, come ricorda la dicitura che lo strumento propone. Puoi scegliere se addebitarlo al cliente o tenerlo a tuo carico: nel secondo caso non viene sommato al totale.',
  'guide.calcolo-iva.q.4': 'Come tratta il regime forfettario?',
  'guide.calcolo-iva.a.4':
    'Attivando «Regime forfettario» il calcolo toglie IVA e ritenuta d\'acconto e ti propone le diciture da riportare in fattura con i riferimenti di legge.',
  'guide.calcolo-iva.q.5': 'A che cosa serve «Dal netto al compenso»?',
  'guide.calcolo-iva.a.5':
    'È il calcolo inverso: indichi quanto vuoi incassare e ottieni il compenso da fatturare. Con gli arrotondamenti al centesimo il netto esatto potrebbe non essere raggiungibile: in quel caso lo strumento mostra il valore più vicino e la differenza.',
  'guide.calcolo-iva.q.6': 'Posso usarlo come consulenza fiscale?',
  'guide.calcolo-iva.a.6':
    'No: è un calcolo indicativo, con aliquote e regole aggiornate al 2026. Per il tuo caso concreto, in particolare per natura dell\'operazione, esenzioni e regime fiscale, verifica con il tuo commercialista.',
  'guide.calcolo-iva.privacy':
    'Gli importi restano nel tuo browser e non vengono inviati. Se usi il pulsante di condivisione, i dati inseriti finiscono nell\'indirizzo del link, dopo il simbolo #: quella parte non arriva a nessun server, ma la vede chi riceve il link.',
};

const it = {
  ...guideIt,
  'iva.lead':
    'Aggiungi l\'IVA a un imponibile, scorporala da un importo lordo o prepara una notula da professionista con rivalsa INPS, cassa previdenziale, ritenuta d\'acconto e bollo. Arrotondamenti al centesimo.',
  'iva.disclaimer':
    'Strumento di calcolo indicativo, non è consulenza fiscale: verifica sempre il caso concreto con il tuo commercialista. Aliquote e regole aggiornate al 2026.',
  'iva.mode': 'Che cosa vuoi calcolare',
  'iva.mode.add': 'Aggiungi IVA',
  'iva.mode.extract': 'Scorpora IVA',
  'iva.mode.invoice': 'Notula / fattura',
  'iva.mode.reverse': 'Dal netto al compenso',
  'iva.amount.add': 'Imponibile (€)',
  'iva.amount.extract': 'Importo lordo, IVA inclusa (€)',
  'iva.amount.invoice': 'Compenso, imponibile (€)',
  'iva.amount.reverse': 'Netto da incassare desiderato (€)',
  'iva.amount.ph': 'Per esempio 1.000,00',
  'iva.amount.err': 'Scrivi un importo valido, per esempio 1.250,50.',
  'iva.vat': 'Aliquota IVA',
  'iva.vat.rate': '{rate}%',
  'iva.vat.zero': '0% (senza IVA)',
  'iva.nature': 'Natura dell\'operazione senza IVA',
  'iva.nat.N2.2': 'N2.2 · non soggetta, altri casi',
  'iva.nat.N4': 'N4 · esente',
  'iva.nat.N2.1': 'N2.1 · non soggetta (artt. 7-7 septies)',
  'iva.nat.N1': 'N1 · esclusa (art. 15)',
  'iva.nat.N3.1': 'N3.1 · non imponibile, esportazioni',
  'iva.nat.N6.9': 'N6.9 · inversione contabile',
  'iva.opts': 'Dati della notula',
  'iva.forfettario': 'Regime forfettario (niente IVA, niente ritenuta)',
  'iva.rivalsa': 'Rivalsa INPS 4%',
  'iva.cassa': 'Cassa previdenziale',
  'iva.cassa.none': 'Nessuna',
  'iva.cassa.custom': 'Altra percentuale',
  'iva.cassa.pct': 'Percentuale della cassa (%)',
  'iva.cassa.err': 'Scrivi una percentuale valida, per esempio 4 o 2,5.',
  'iva.cassa.vat': 'La cassa è soggetta a IVA',
  'iva.ritenuta': 'Ritenuta d\'acconto 20%',
  'iva.ritenuta.none': 'Nessuna ritenuta',
  'iva.ritenuta.compenso': 'Su compenso e rivalsa INPS',
  'iva.ritenuta.cassa': 'Su compenso, rivalsa INPS e cassa',
  'iva.bollo': 'Addebita il bollo di 2 € al cliente',
  'iva.result': 'Risultato',
  'iva.row.net': 'Imponibile',
  'iva.row.vat': 'IVA {rate}',
  'iva.row.gross': 'Totale (IVA inclusa)',
  'iva.row.compenso': 'Compenso',
  'iva.row.rivalsa': 'Rivalsa INPS 4%',
  'iva.row.cassa': 'Cassa previdenziale {rate}',
  'iva.row.vatBase': 'Imponibile IVA',
  'iva.row.bollo': 'Imposta di bollo',
  'iva.row.total': 'Totale documento',
  'iva.row.ritenuta': 'Ritenuta d\'acconto {rate}',
  'iva.row.netToPay': 'Netto a pagare',
  'iva.row.neededCompenso': 'Compenso da fatturare',
  'iva.reverse.diff': 'Con gli arrotondamenti al centesimo il netto esatto non è raggiungibile: il più vicino è {net} ({diff} rispetto a quello desiderato).',
  'iva.reverse.exact': 'Con questo compenso il netto a pagare è esattamente {net}.',
  'iva.notes': 'Da riportare in fattura',
  'iva.note.forfettario':
    'Operazione effettuata ai sensi dell\'articolo 1, commi da 54 a 89, della legge n. 190/2014 (regime forfettario).',
  'iva.note.ritenutaForfettario':
    'Compenso non soggetto a ritenuta d\'acconto ai sensi dell\'articolo 1, comma 67, della legge n. 190/2014.',
  'iva.note.bollo':
    'Imposta di bollo di 2,00 € assolta ai sensi del DPR n. 642/1972 (operazione senza IVA di importo superiore a 77,47 €).',
  'iva.note.bolloNotCharged': 'Bollo di 2,00 € dovuto ma a carico del professionista: non è sommato al totale.',
  'iva.note.natura': 'Operazione senza IVA, natura {code}: {text}.',
  'iva.natdesc.N2.2': 'non soggetta, altri casi',
  'iva.natdesc.N4': 'esente (art. 10 DPR 633/1972)',
  'iva.natdesc.N2.1': 'non soggetta ad IVA (artt. da 7 a 7-septies DPR 633/1972)',
  'iva.natdesc.N1': 'esclusa (art. 15 DPR 633/1972)',
  'iva.natdesc.N3.1': 'non imponibile, esportazioni',
  'iva.natdesc.N6.9': 'inversione contabile, altri casi',
  'iva.note.cassaFuoriIva': 'Il contributo cassa è esposto fuori campo IVA e non concorre alla base imponibile.',
  'iva.summary': 'Riepilogo',
  'iva.empty': 'Scrivi un importo per vedere il calcolo.',
};

/** Guida "come si usa" e domande frequenti (En): vedi shared/tool-guide.ts. */
const guideEn = {
  'guide.calcolo-iva.step.1': 'Under “What do you want to calculate” choose “Add VAT” if you have the net amount, “Extract VAT” if you have the total including VAT, “Fee note / invoice” for a professional fee with INPS surcharge, pension fund, withholding and stamp duty, or “Net to fee” if you start from the net amount you want to receive.',
  'guide.calcolo-iva.step.2': 'Enter the amount in the field (for example 1,000.00): the label changes with the chosen mode.',
  'guide.calcolo-iva.step.3': 'Choose the “VAT rate”. With “0% (no VAT)” also pick the “Nature of the transaction without VAT”.',
  'guide.calcolo-iva.step.4': 'For a fee note, under “Fee note details” turn on what you need: flat-rate scheme (regime forfettario), 4% INPS surcharge, pension fund, withholding tax and €2 stamp duty.',
  'guide.calcolo-iva.step.5': 'Read the “Result” line by line; under “To state on the invoice” you will find the wordings required in special cases.',
  'guide.calcolo-iva.q.1': 'What is the difference between adding and extracting VAT?',
  'guide.calcolo-iva.a.1':
    'When adding, you start from the net amount and add VAT to get the total. When extracting, you start from the total including VAT and work out the net amount and the VAT: at a 22% rate, for example, 122 euro gross is 100 euro net plus 22 of VAT.',
  'guide.calcolo-iva.q.2': 'What is the 4% INPS surcharge (rivalsa INPS)?',
  'guide.calcolo-iva.a.2':
    'It is a surcharge that a professional can add to the invoice for the client. In “Fee note / invoice” mode the tool adds it to the fee and lets you choose whether withholding tax also applies to it.',
  'guide.calcolo-iva.q.3': 'When is the €2 stamp duty (marca da bollo) needed?',
  'guide.calcolo-iva.a.3':
    'On invoices without VAT for more than 77.47 euro, as the wording the tool proposes reminds you. You can choose whether to charge it to the client or bear it yourself: in the latter case it is not added to the total.',
  'guide.calcolo-iva.q.4': 'How does it handle the flat-rate scheme (regime forfettario)?',
  'guide.calcolo-iva.a.4':
    'With “Flat-rate scheme” on, the calculation removes VAT and withholding tax and proposes the wordings to state on the invoice, with the legal references.',
  'guide.calcolo-iva.q.5': 'What is “Net to fee” for?',
  'guide.calcolo-iva.a.5':
    'It is the reverse calculation: you enter how much you want to receive and get the fee to invoice. Because of rounding to the cent the exact net amount may not be reachable: in that case the tool shows the closest value and the difference.',
  'guide.calcolo-iva.q.6': 'Can I use it as tax advice?',
  'guide.calcolo-iva.a.6':
    'No: it is an indicative calculation, with rates and rules up to date for 2026. For your specific case, in particular for the nature of the transaction, exemptions and tax regime, check with your accountant (commercialista).',
  'guide.calcolo-iva.privacy':
    'Amounts stay in your browser and are not sent anywhere. If you use the share button, the data you entered ends up in the link address, after the # symbol: that part never reaches any server, but whoever receives the link can see it.',
};

const en: typeof it = {
  ...guideEn,
  'iva.lead':
    'Add VAT to a net amount, extract it from a gross amount or prepare a professional fee note with INPS surcharge (rivalsa), pension fund contribution, withholding tax and stamp duty. Rounded to the cent.',
  'iva.disclaimer':
    'Indicative calculation tool, not tax advice: always check your specific case with your accountant (commercialista). Rates and rules up to date for 2026.',
  'iva.mode': 'What do you want to calculate',
  'iva.mode.add': 'Add VAT',
  'iva.mode.extract': 'Extract VAT',
  'iva.mode.invoice': 'Fee note / invoice',
  'iva.mode.reverse': 'Net to fee',
  'iva.amount.add': 'Net amount (€)',
  'iva.amount.extract': 'Gross amount, VAT included (€)',
  'iva.amount.invoice': 'Fee, net amount (€)',
  'iva.amount.reverse': 'Desired net amount to receive (€)',
  'iva.amount.ph': 'For example 1,000.00',
  'iva.amount.err': 'Enter a valid amount, for example 1,250.50.',
  'iva.vat': 'VAT rate',
  'iva.vat.rate': '{rate}%',
  'iva.vat.zero': '0% (no VAT)',
  'iva.nature': 'Nature of the transaction without VAT',
  'iva.nat.N2.2': 'N2.2 · not subject, other cases',
  'iva.nat.N4': 'N4 · exempt',
  'iva.nat.N2.1': 'N2.1 · not subject (arts. 7-7 septies)',
  'iva.nat.N1': 'N1 · excluded (art. 15)',
  'iva.nat.N3.1': 'N3.1 · non-taxable, exports',
  'iva.nat.N6.9': 'N6.9 · reverse charge',
  'iva.opts': 'Fee note details',
  'iva.forfettario': 'Flat-rate scheme (no VAT, no withholding)',
  'iva.rivalsa': 'INPS surcharge 4%',
  'iva.cassa': 'Pension fund contribution',
  'iva.cassa.none': 'None',
  'iva.cassa.custom': 'Other percentage',
  'iva.cassa.pct': 'Pension fund percentage (%)',
  'iva.cassa.err': 'Enter a valid percentage, for example 4 or 2,5.',
  'iva.cassa.vat': 'The pension fund contribution is subject to VAT',
  'iva.ritenuta': 'Withholding tax 20%',
  'iva.ritenuta.none': 'No withholding',
  'iva.ritenuta.compenso': 'On fee and INPS surcharge',
  'iva.ritenuta.cassa': 'On fee, INPS surcharge and pension fund',
  'iva.bollo': 'Charge the €2 stamp duty to the client',
  'iva.result': 'Result',
  'iva.row.net': 'Net amount',
  'iva.row.vat': 'VAT {rate}',
  'iva.row.gross': 'Total (VAT included)',
  'iva.row.compenso': 'Fee',
  'iva.row.rivalsa': 'INPS surcharge 4%',
  'iva.row.cassa': 'Pension fund contribution {rate}',
  'iva.row.vatBase': 'VAT base',
  'iva.row.bollo': 'Stamp duty (marca da bollo)',
  'iva.row.total': 'Document total',
  'iva.row.ritenuta': 'Withholding tax {rate}',
  'iva.row.netToPay': 'Net payable',
  'iva.row.neededCompenso': 'Fee to invoice',
  'iva.reverse.diff': 'Because of rounding to the cent the exact net amount cannot be reached: the closest is {net} ({diff} from the desired amount).',
  'iva.reverse.exact': 'With this fee the net payable is exactly {net}.',
  'iva.notes': 'To state on the invoice (wording in Italian)',
  // Diciture di legge: restano in italiano perché vanno riportate così nella fattura italiana.
  'iva.note.forfettario':
    'Operazione effettuata ai sensi dell\'articolo 1, commi da 54 a 89, della legge n. 190/2014 (regime forfettario).',
  'iva.note.ritenutaForfettario':
    'Compenso non soggetto a ritenuta d\'acconto ai sensi dell\'articolo 1, comma 67, della legge n. 190/2014.',
  'iva.note.bollo':
    'Imposta di bollo di 2,00 € assolta ai sensi del DPR n. 642/1972 (operazione senza IVA di importo superiore a 77,47 €).',
  'iva.note.bolloNotCharged': '€2.00 stamp duty is due but borne by the professional: it is not added to the total.',
  'iva.note.natura': 'Transaction without VAT, nature {code}: {text}.',
  'iva.natdesc.N2.2': 'not subject, other cases',
  'iva.natdesc.N4': 'exempt (art. 10 DPR 633/1972)',
  'iva.natdesc.N2.1': 'not subject to VAT (arts. 7 to 7-septies DPR 633/1972)',
  'iva.natdesc.N1': 'excluded (art. 15 DPR 633/1972)',
  'iva.natdesc.N3.1': 'non-taxable, exports',
  'iva.natdesc.N6.9': 'reverse charge, other cases',
  'iva.note.cassaFuoriIva': 'The pension fund contribution is shown outside the scope of VAT and does not form part of the taxable base.',
  'iva.summary': 'Summary',
  'iva.empty': 'Enter an amount to see the calculation.',
};

export const IVA_DICTIONARIES: ToolDictionaries = { it, en };
