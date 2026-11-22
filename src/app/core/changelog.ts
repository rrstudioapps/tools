// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 rrstudio — rrstudio tools

/** Tipo di una voce: determina il badge e il filtro della pagina Novità. */
export type ChangeKind = 'new-tool' | 'feature' | 'improvement' | 'fix';

export interface ChangeEntry {
  kind: ChangeKind;
  it: string;
  en: string;
  /** Strumenti coinvolti: diventano link, con il nome preso dal registry. Per `new-tool` sono gli strumenti nuovi. */
  toolIds?: readonly string[];
  /** Numeri delle issue GitHub collegate. */
  issues?: readonly number[];
}

export interface ChangelogVersion {
  /** Solo il giorno, AAAA-MM-GG (mai l'ora). */
  date: string;
  title: { it: string; en: string };
  entries: readonly ChangeEntry[];
}

/** Novità del sito, dalla più recente. Testi per gli utenti, non per gli sviluppatori. */
export const CHANGELOG: readonly ChangelogVersion[] = [
  {
    date: '2026-11-22',
    title: { it: 'Nuovi strumenti PDF', en: 'New PDF tools' },
    entries: [
      {
        kind: 'new-tool',
        it: 'Nuovo strumento: ispettore PDF, per vedere versione, misure delle pagine, font, cifratura, permessi e metadati di un file e scaricare il report in JSON.',
        en: 'New tool: PDF inspector, to see a file\'s version, page sizes, fonts, encryption, permissions and metadata and download the report as JSON.',
        toolIds: ['pdf-inspector'],
      },
      {
        kind: 'new-tool',
        it: 'Nuovo strumento: più pagine per foglio e libretto PDF, con anteprima, per stampare 2, 4, 6 o 9 pagine su un foglio o fare un libretto da piegare a metà.',
        en: 'New tool: PDF pages per sheet and booklet, with preview, to print 2, 4, 6 or 9 pages on one sheet or make a booklet to fold in half.',
        toolIds: ['pdf-nup'],
      },
      {
        kind: 'new-tool',
        it: 'Nuovo strumento: dividi le pagine doppie di un PDF in due pagine singole, con linea di taglio regolabile, ordine anche da destra a sinistra e pagine da escludere.',
        en: 'New tool: split the double pages of a PDF into two single pages, with an adjustable cut line, right-to-left order and pages to exclude.',
        toolIds: ['pdf-split-spreads'],
      },
      {
        kind: 'new-tool',
        it: 'Nuovo strumento: unisci i PDF di fronti e retri scansionati separatamente in un solo PDF con le pagine alternate, con anteprima dell\'ordine.',
        en: 'New tool: merge separately scanned fronts and backs PDFs into one PDF with alternating pages, with a preview of the order.',
        toolIds: ['pdf-interleave'],
      },
    ],
  },
  {
    date: '2026-11-19',
    title: { it: 'Strumenti XML, ricerca Ctrl+K, catene e impostazioni', en: 'XML tools, Ctrl+K search, chains and settings' },
    entries: [
      {
        kind: 'new-tool',
        it: 'Nuovo strumento «Editor e visualizzatore YAML e TOML»: il file come albero con ricerca, percorso di ogni nodo, modifica di chiavi, valori e tipi, annulla e ripeti e conversione tra YAML e TOML.',
        en: 'New tool "YAML and TOML viewer and editor": the file as a tree with search, the path of each node, editing of keys, values and types, undo and redo, and conversion between YAML and TOML.',
        toolIds: ['yaml-viewer'],
      },
      {
        kind: 'new-tool',
        it: 'Nuovo strumento «Confronto YAML e CSV»: le differenze tra due YAML (con percorso, liste abbinate per chiave) o tra due CSV, con le righe abbinate per le colonne chiave che scegli.',
        en: 'New tool "YAML and CSV compare": the differences between two YAML files (with path, lists matched by key) or two CSV files, with rows matched by the key columns you choose.',
        toolIds: ['yaml-csv-diff'],
      },
      {
        kind: 'new-tool',
        it: 'Nuovo strumento «Convertitore JSON Schema ↔ XSD»: converte nei due sensi elementi, attributi, tipi, restrizioni e occorrenze; ciò che non ha un equivalente è elencato negli avvisi con la sua posizione.',
        en: 'New tool "JSON Schema ↔ XSD converter": converts elements, attributes, types, restrictions and occurrences both ways; anything with no equivalent is listed in the warnings with its location.',
        toolIds: ['json-schema-xsd'],
      },
      {
        kind: 'new-tool',
        it: 'Nuovo strumento «Generatore di dati di prova da schema»: da un JSON Schema o da un XSD genera record che li rispettano, con seme ripetibile, numero a scelta ed esportazione in JSON, XML o CSV.',
        en: 'New tool "Test data generator from a schema": from a JSON Schema or an XSD it generates records that conform to it, with a repeatable seed, any number of records and export as JSON, XML or CSV.',
        toolIds: ['schema-test-data'],
      },
      {
        kind: 'new-tool',
        it: 'Nuovo strumento «Metadati PDF»: guarda e modifica titolo, autore e date di un PDF, oppure togli tutti i metadati (anche XMP e chiavi personalizzate) prima di condividerlo.',
        en: 'New tool "PDF metadata": view and edit a PDF\'s title, author and dates, or remove all metadata (XMP and custom keys too) before sharing it.',
        toolIds: ['pdf-metadata'],
      },
      {
        kind: 'new-tool',
        it: 'Nuovo strumento «Numeri di pagina e intestazioni PDF»: scrivi numero, totale, data o testo in alto e in basso su ogni pagina, con anteprima, scelta delle pagine, copertina saltata e pagine ruotate.',
        en: 'New tool "PDF page numbers, headers and footers": write the number, total, date or text at the top and bottom of every page, with preview, page selection, a skipped cover and rotated pages.',
        toolIds: ['pdf-page-text'],
      },
      {
        kind: 'new-tool',
        it: 'Nuovo strumento «Comprimi PDF»: ricomprime le immagini del PDF (qualità e dimensione a scelta), ottimizza il file o trasforma le pagine in immagini, e mostra il risparmio prima del download.',
        en: 'New tool "Compress PDF": recompresses the PDF\'s images (quality and size of your choice), optimises the file or turns pages into images, and shows the saving before the download.',
        toolIds: ['pdf-compress'],
      },
      {
        kind: 'new-tool',
        it: 'Nuovo strumento «Ritaglia e ridimensiona PDF»: togli i margini in millimetri con anteprima, cambia la scala delle pagine o adattale ad A4, A5, A3, Letter e Legal.',
        en: 'New tool "Crop and resize PDF": remove margins in millimetres with a preview, change the page scale or fit pages to A4, A5, A3, Letter and Legal.',
        toolIds: ['pdf-crop'],
      },
      {
        kind: 'new-tool',
        it: 'Nuovo strumento «Estrai immagini da PDF»: le immagini incorporate in qualità originale (JPEG identici, le altre in PNG anche con trasparenza), con anteprima, scelta e download in ZIP.',
        en: 'New tool "Extract images from PDF": the embedded images at original quality (identical JPEGs, the others as PNG with transparency too), with preview, selection and ZIP download.',
        toolIds: ['pdf-images'],
      },
      {
        kind: 'new-tool',
        it: 'Nuovo strumento «Compila e appiattisci moduli PDF»: compila testo, caselle, scelte e menu di un modulo e scarica il PDF compilato oppure appiattito, con i valori fissati nella pagina.',
        en: 'New tool "Fill in and flatten PDF forms": fill in a form\'s text, checkboxes, choices and menus and download the filled or flattened PDF, with the values fixed on the page.',
        toolIds: ['pdf-form'],
      },
      {
        kind: 'new-tool',
        it: 'Nuovo strumento «Oscura aree di un PDF»: rettangoli neri disegnati sulle pagine o ricerca di un testo da coprire ovunque; le pagine oscurate diventano immagini, quindi il testo sotto non esiste più nel file.',
        en: 'New tool "Black out parts of a PDF": black rectangles drawn on the pages or a text search to cover everywhere; redacted pages become images, so the text underneath no longer exists in the file.',
        toolIds: ['pdf-redact'],
      },
      {
        kind: 'new-tool',
        it: 'Nuovo strumento «Proteggi PDF con password»: password per aprire il file con cifratura AES a 256 bit e limiti facoltativi di stampa, copia e modifica, tutto nel browser.',
        en: 'New tool "Protect a PDF with a password": a password to open the file with 256-bit AES encryption and optional print, copy and edit restrictions, all in your browser.',
        toolIds: ['pdf-protect'],
      },
      {
        kind: 'new-tool',
        it: 'Nuovo strumento: editor e visualizzatore XML ad albero, con ricerca tra tag, attributi e testo, query XPath, namespace, modifica di tag, attributi e contenuto, aggiunta, spostamento ed eliminazione di nodi, annulla e ripeti.',
        en: 'New tool: tree-based XML editor and viewer, with search across tags, attributes and text, XPath queries, namespaces, editing of tags, attributes and content, adding, moving and deleting nodes, undo and redo.',
        toolIds: ['xml-viewer'],
      },
      {
        kind: 'new-tool',
        it: 'Nuovo strumento «Confronto XML»: le differenze di struttura tra due documenti (elementi aggiunti e tolti, attributi e testo cambiati) con il percorso XPath, senza il rumore di rientri e ordine degli attributi.',
        en: 'New tool "XML compare": the structural differences between two documents (added and removed elements, changed attributes and text) with the XPath, without the noise of indentation and attribute order.',
        toolIds: ['xml-diff'],
      },
      {
        kind: 'new-tool',
        it: 'Nuovo strumento «Da XML a tabella e CSV»: scegli l\'elemento che si ripete, appiattisci attributi e figli in colonne, guarda l\'anteprima e scarica il CSV o inviala agli altri strumenti.',
        en: 'New tool "XML to table and CSV": pick the repeating element, flatten attributes and children into columns, preview it and download the CSV or send it to the other tools.',
        toolIds: ['xml-to-csv'],
      },
      {
        kind: 'new-tool',
        it: 'Nuovo strumento «Validatore XSD»: controlla un XML con uno schema XSD (tipi, faccette, ordine e numero degli elementi, attributi obbligatori, ID) e mostra ogni problema con il suo percorso XPath.',
        en: 'New tool "XSD validator": check an XML against an XSD schema (types, facets, element order and count, required attributes, IDs) and see each problem with its XPath.',
        toolIds: ['xsd-validator'],
      },
      {
        kind: 'new-tool',
        it: 'Nuovo strumento «XML ↔ JSON»: converte XML in JSON e JSON in XML nei due sensi, con attributi, testo ed elementi ripetuti; prefisso, array e tipi (numeri e booleani) a scelta, errori con riga e colonna.',
        en: 'New tool "XML ↔ JSON": converts XML to JSON and JSON to XML both ways, with attributes, text and repeated elements; prefix, arrays and types (numbers and booleans) of your choice, errors with line and column.',
        toolIds: ['xml-json-converter'],
      },
      {
        kind: 'new-tool',
        it: 'Nuovo strumento «Visualizzatore HTML e DOM»: la pagina come albero DOM, query con selettori CSS e XPath, percorso XPath e CSS di ogni nodo; nessuno script viene eseguito.',
        en: 'New tool "HTML and DOM viewer": the page as a DOM tree, queries with CSS selectors and XPath, XPath and CSS path of each node; no script is run.',
        toolIds: ['html-dom-viewer'],
      },
      {
        kind: 'improvement',
        it: 'Il menu «Invia a…» ha un campo per filtrare gli strumenti quando l\'elenco è lungo: scrivi una parte del nome e premi Invio per inviare al primo risultato.',
        en: 'The "Send to…" menu has a field to filter tools when the list is long: type part of the name and press Enter to send to the first result.',
      },
      {
        kind: 'improvement',
        it: 'Ricerca rapida con Ctrl+K (⌘+K su Mac) da qualunque pagina: scrivi il nome di uno strumento, scegli con le frecce e premi Invio. C\'è anche il pulsante con la lente nell\'intestazione.',
        en: 'Quick search with Ctrl+K (⌘+K on Mac) from any page: type a tool name, pick with the arrow keys and press Enter. There is also a magnifier button in the header.',
      },
      {
        kind: 'improvement',
        it: 'Catene di strumenti: collega più strumenti in un percorso (ad esempio JSON Formatter → JSON Viewer), salvalo e, dopo ogni passo, «Invia a…» propone per primo il successivo. Nelle catene salvate restano solo nome e strumenti, mai i dati.',
        en: 'Tool chains: link several tools in a path (for example JSON Formatter → JSON Viewer), save it and, after each step, "Send to…" offers the next one first. Saved chains keep only a name and the tools, never your data.',
      },
      {
        kind: 'improvement',
        it: 'Esporta e importa tutte le impostazioni (tema, preferiti e menu, catene) in un solo file JSON dalla pagina Privacy, per portarle su un altro dispositivo.',
        en: 'Export and import all your settings (theme, favorites and menus, chains) in a single JSON file from the Privacy page, to move them to another device.',
      },
    ],
  },
  {
    date: '2026-11-18',
    title: { it: 'Codice fiscale, confronto testi e stampa', en: 'Tax code, text comparison and printing' },
    entries: [
      {
        kind: 'new-tool',
        it: 'Nuovo strumento: costruttore di link UTM per campagne, con canali predefiniti, avvisi su maiuscole e spazi, più sorgenti insieme e download in .csv.',
        en: 'New tool: UTM link builder for campaigns, with channel presets, warnings about case and spaces, several sources at once and .csv download.',
        toolIds: ['utm-link-builder'],
      },
      {
        kind: 'new-tool',
        it: 'Nuovo strumento: costo del viaggio e consumo carburante, con conversione tra l/100 km, km/l e mpg, stima della CO2 e calcolo dei chilometri con un budget.',
        en: 'New tool: trip cost and fuel consumption, with conversion between l/100 km, km/l and mpg, a CO2 estimate and a range calculation for a budget.',
        toolIds: ['trip-cost-calculator'],
      },
      {
        kind: 'new-tool',
        it: 'Nuovo strumento «Elenco ↔ riga»: trasforma un elenco in una sola riga con separatori e apici (preset per SQL, JSON, JavaScript, CSV, URL e riga di comando, con gli escape giusti) e una riga in un elenco, rispettando le voci tra apici.',
        en: 'New tool "List ↔ line": turn a list into a single line with separators and quotes (presets for SQL, JSON, JavaScript, CSV, URL and command line, with the right escaping) and a line back into a list, respecting quoted items.',
        toolIds: ['list-converter'],
      },
      {
        kind: 'new-tool',
        it: 'Nuovo strumento «Estrai dal testo»: incolla un testo e ottieni l\'elenco di email, link, IP, date, telefoni, IBAN, hashtag e altro, con conteggio per tipo, doppioni tolti, ordine a scelta, copia e download in .txt o .csv.',
        en: 'New tool "Text extractor": paste a text and get the list of emails, links, IPs, dates, phone numbers, IBANs, hashtags and more, with a count per kind, duplicates removed, your choice of order, copy and download as .txt or .csv.',
        toolIds: ['text-extractor'],
      },
      {
        kind: 'new-tool',
        it: 'Nuovo strumento: converte testo in byte (esadecimale, binario, decimale, ottale, Base64) e viceversa, con più codifiche, tabella dei caratteri e anteprima hex dump di un file.',
        en: 'New tool: converts text to bytes (hex, binary, decimal, octal, Base64) and back, with several encodings, a character table and a hex dump preview of a file.',
        toolIds: ['text-binary-converter'],
      },
      {
        kind: 'new-tool',
        it: 'Nuovo strumento: escape e unescape di stringhe per JSON, JavaScript, Python, regex, shell, SQL, CSV, Java e PHP, con errori precisi e supporto alle emoji.',
        en: 'New tool: string escape and unescape for JSON, JavaScript, Python, regex, shell, SQL, CSV, Java and PHP, with precise errors and emoji support.',
        toolIds: ['string-escape'],
      },
      {
        kind: 'new-tool',
        it: 'Nuovo strumento: crea archivi ZIP da file e cartelle, oppure apri uno ZIP, cerca nell\'elenco e scarica solo ciò che serve, con controlli contro archivi pericolosi.',
        en: 'New tool: create ZIP archives from files and folders, or open a ZIP, search the list and download only what you need, with checks against dangerous archives.',
        toolIds: ['zip-tool'],
      },
      {
        kind: 'new-tool',
        it: 'Nuovo strumento: oscura parti di un\'immagine con riquadro pieno, pixelatura o sfocatura, con annulla e ripristina e senza metadati nel file.',
        en: 'New tool: redact parts of an image with a solid box, pixelation or blur, with undo and redo and no metadata in the output file.',
        toolIds: ['image-redact'],
      },
      {
        kind: 'new-tool',
        it: 'Nuovo strumento: dividi il conto alla romana o per consumo, con mancia, costi comuni e arrotondamento della quota.',
        en: 'New tool: split the bill equally or by consumption, with tip, shared costs and share rounding.',
        toolIds: ['split-bill'],
      },
      {
        kind: 'new-tool',
        it: 'Nuovo strumento: conto alla rovescia a una data, con giorni lavorativi, fusi orari, feste e file calendario .ics.',
        en: 'New tool: countdown to a date, with working days, time zones, holidays and an .ics calendar file.',
        toolIds: ['countdown'],
      },
      {
        kind: 'new-tool',
        it: 'Nuovo strumento «Confronta elenchi»: incolla due elenchi e vedi unione, voci in comune, solo in A, solo in B e doppioni, con conteggi, copia e download di ogni scheda.',
        en: 'New tool "List compare": paste two lists and see the union, items in common, only in A, only in B and duplicates, with counts, copy and download for each tab.',
        toolIds: ['list-compare'],
      },
      {
        kind: 'new-tool',
        it: 'Nuovo strumento «Pulisci testo»: incolla un testo da PDF, email o Word e ottieni la versione pulita, con righe riunite, spazi doppi tolti, virgolette semplici, caratteri invisibili e tag HTML rimossi.',
        en: 'New tool "Text cleaner": paste text from a PDF, email or Word and get a clean version, with lines joined, double spaces removed, straight quotes, and invisible characters and HTML tags stripped.',
        toolIds: ['text-cleaner'],
      },
      {
        kind: 'improvement',
        it: 'In fondo a ogni strumento trovi i collegamenti agli strumenti affini, per passare da uno all\'altro senza tornare alla home.',
        en: 'At the bottom of every tool you now find links to related tools, to move from one to another without going back to the home page.',
      },
      {
        kind: 'new-tool',
        it: 'Timer con conto alla rovescia, cronometro con giri e pomodoro; calcolatrice scientifica con cronologia; generatore di numeri casuali, dadi, estrazioni da un elenco e squadre.',
        en: 'Timer with countdown, stopwatch with laps and Pomodoro; scientific calculator with history; generator of random numbers, dice, draws from a list and teams.',
        toolIds: ['timer', 'scientific-calculator', 'random-number-generator'],
      },
      {
        kind: 'new-tool',
        it: 'Estrazione del testo dai PDF, anche protetti da password: righe, paragrafi e colonne ricostruiti, scarico in TXT o Markdown.',
        en: 'Text extraction from PDFs, password-protected ones too: lines, paragraphs and columns rebuilt, download as TXT or Markdown.',
        toolIds: ['pdf-to-text'],
      },
      {
        kind: 'new-tool',
        it: 'Generatore di codice fiscale e di partita IVA con dati di prova, utile per testare moduli e gestionali.',
        en: 'Generator of Italian tax codes and VAT numbers with test data, handy for testing forms and software.',
        toolIds: ['generatore-codice-fiscale'],
      },
      {
        kind: 'new-tool',
        it: 'Calcolo di sottoreti IP, conversione da docker run a Docker Compose, generatore di CSS clamp(), calcolatrice di orari e scadenze delle fatture.',
        en: 'IP subnet calculator, docker run to Docker Compose converter, CSS clamp() generator, time calculator and invoice due dates.',
        toolIds: ['subnet-calculator', 'docker-run-to-compose', 'css-clamp-calculator', 'time-calculator', 'scadenze-fatture'],
      },
      {
        kind: 'new-tool',
        it: 'Confronto JSON strutturale: differenze per percorso con valore vecchio e nuovo, array per indice, come insiemi o per chiave, albero unito ed esportazione come JSON Patch.',
        en: 'Structural JSON diff: differences by path with old and new value, arrays by index, as sets or by key, merged tree view and JSON Patch export.',
        toolIds: ['json-diff'],
      },
      {
        kind: 'feature',
        it: 'Scorciatoie da tastiera in tutti gli strumenti: premi ? per vedere l\'elenco.',
        en: 'Keyboard shortcuts in every tool: press ? to see the list.',
      },
      {
        kind: 'feature',
        it: 'Nella home puoi incollare un testo o trascinare un file: il sito propone gli strumenti adatti.',
        en: 'On the home page you can paste some text or drop a file, and the site suggests the right tools.',
      },
      {
        kind: 'feature',
        it: 'Dalla versione installata come app puoi condividere testi e file verso rrstudio tools e aprirli con gli strumenti giusti.',
        en: 'With the installed app you can share text and files to rrstudio tools and open them with the right tools.',
      },
      {
        kind: 'feature',
        it: 'Stampa dei risultati negli strumenti di calcolo, con un impaginato pulito.',
        en: 'Print the results of the calculation tools, with a clean layout.',
      },
      {
        kind: 'feature',
        it: 'Da ogni strumento puoi segnalare un problema o suggerire un miglioramento: si apre un modulo GitHub già compilato.',
        en: 'From every tool you can report a problem or suggest an improvement: a pre-filled GitHub form opens.',
      },
      {
        kind: 'feature',
        it: 'Questa pagina Novità, con un feed per seguire gli aggiornamenti, e il badge «Nuovo» sugli strumenti appena arrivati.',
        en: 'This What\'s new page, with a feed to follow updates, and a "New" badge on newly added tools.',
      },
      {
        kind: 'improvement',
        it: 'Confronto testi più comodo: i risultati scorrono in una propria area, la barra dei comandi resta sempre in vista, puoi nascondere i testi, andare a capo e saltare a una riga, e spostarti tra le differenze con F7.',
        en: 'Easier text comparison: results scroll in their own area, the toolbar stays in view, you can hide the texts, wrap lines and jump to a line, and move between differences with F7.',
        toolIds: ['text-diff'],
      },
    ],
  },
  {
    date: '2026-11-17',
    title: { it: 'App installabile, preferiti e molti nuovi strumenti', en: 'Installable app, favorites and many new tools' },
    entries: [
      {
        kind: 'new-tool',
        it: 'Filigrana per immagini e PDF, selettore di colori e palette da un\'immagine, da SVG a PNG, convertitore di formato per le immagini.',
        en: 'Watermark for images and PDFs, color picker and palette from an image, SVG to PNG, image format converter.',
        toolIds: ['image-watermark', 'image-color-picker', 'svg-to-png', 'image-converter'],
      },
      {
        kind: 'new-tool',
        it: 'Generatori HMAC, chiavi SSH e CSR, condivisione di un segreto con Shamir.',
        en: 'HMAC, SSH key and CSR generators, secret sharing with Shamir.',
        toolIds: ['hmac-generator', 'ssh-key-generator', 'csr-generator', 'shamir-secret-sharing'],
      },
      {
        kind: 'new-tool',
        it: 'Convertitori di colori e cURL, analisi degli URL, interesse composto.',
        en: 'Color and cURL converters, URL parser, compound interest.',
        toolIds: ['color-converter', 'curl-converter', 'url-parser', 'compound-interest'],
      },
      {
        kind: 'new-tool',
        it: 'Statistica, proporzioni, ispettore Unicode, numeri romani, codice Morse, cifrari classici, lire in euro.',
        en: 'Statistics, aspect ratio, Unicode inspector, Roman numerals, Morse code, classic ciphers, lire to euro.',
        toolIds: ['statistics-calculator', 'aspect-ratio-calculator', 'unicode-inspector', 'roman-numerals', 'morse-code', 'classic-ciphers', 'convertitore-lire-euro'],
      },
      {
        kind: 'new-tool',
        it: 'Dati finti, interrogazioni JSONPath, firma dei PDF, ritaglio e rotazione immagini, anteprima dei meta tag.',
        en: 'Fake data, JSONPath queries, PDF signing, image crop and rotate, meta tag preview.',
        toolIds: ['fake-data-generator', 'json-query', 'pdf-sign', 'image-crop', 'meta-tag-preview'],
      },
      {
        kind: 'new-tool',
        it: 'Trentuno strumenti in una volta: ritenuta d\'acconto, rata del mutuo, numeri in lettere, formattatori YAML, XML e SQL, TOTP, cifratura dei file, lettore di QR code e molti altri.',
        en: 'Thirty-one tools at once: Italian withholding tax, mortgage payments, numbers in words, YAML, XML and SQL formatters, TOTP, file encryption, QR code reader and many more.',
        toolIds: ['calcolo-ritenuta-acconto', 'calcolo-rata-mutuo', 'numeri-in-lettere', 'totp-generator', 'file-encrypt', 'qr-code-reader'],
      },
      {
        kind: 'feature',
        it: 'Il sito si può installare come app e funziona anche senza connessione.',
        en: 'The site can be installed as an app and also works offline.',
      },
      {
        kind: 'feature',
        it: 'Preferiti e menu personalizzati, con esportazione e importazione in un file e link per passarli a un altro dispositivo. Restano nel tuo browser.',
        en: 'Favorites and custom menus, with export and import to a file and a link to move them to another device. They stay in your browser.',
      },
      {
        kind: 'feature',
        it: 'Link condivisibili in 36 strumenti: l\'impostazione che hai scelto si rimette uguale a chi apre il link. Nel link non finiscono mai i tuoi file.',
        en: 'Shareable links in 36 tools: the settings you chose are restored for whoever opens the link. Your files never end up in the link.',
      },
      {
        kind: 'feature',
        it: 'Funzione «Invia a…»: passi il risultato di uno strumento a un altro senza copiare e incollare.',
        en: '"Send to…": pass the result of one tool to another without copy and paste.',
      },
      {
        kind: 'improvement',
        it: 'Guide «come si fa» e domande frequenti negli strumenti, home con 8 categorie, filtro Preferiti e schede più compatte su telefono.',
        en: '"How to" guides and FAQs in the tools, a home page with 8 categories, a Favorites filter and more compact cards on phones.',
      },
      {
        kind: 'improvement',
        it: 'Pagine più veloci a comparire e più reattive.',
        en: 'Pages appear faster and respond more quickly.',
      },
    ],
  },
  {
    date: '2026-11-16',
    title: { it: 'Versione inglese e nuovi strumenti', en: 'English version and new tools' },
    entries: [
      {
        kind: 'new-tool',
        it: 'Codice QR, calcolo dell\'IVA, confronto testi, convertitore CSV/JSON/Excel, JWT, UUID, timestamp, contrasto dei colori, editor Markdown, contaparole, prova delle espressioni regolari, giorni lavorativi.',
        en: 'QR code, VAT calculator, text diff, CSV/JSON/Excel converter, JWT, UUID, timestamp, color contrast, Markdown editor, word counter, regex tester, working days.',
        toolIds: ['qr-code-generator', 'calcolo-iva', 'text-diff', 'csv-json-converter', 'jwt-decoder', 'uuid-generator', 'timestamp-converter', 'color-contrast-checker', 'markdown-editor', 'word-counter', 'regex-tester', 'calcolo-giorni-lavorativi'],
      },
      {
        kind: 'new-tool',
        it: 'Visualizzatore di fatture elettroniche, da immagini a PDF e da PDF a immagini, lettore dei dati EXIF.',
        en: 'E-invoice viewer, images to PDF and PDF to images, EXIF viewer.',
        toolIds: ['fattura-elettronica', 'images-to-pdf', 'pdf-to-images', 'exif-viewer'],
      },
      {
        kind: 'new-tool',
        it: 'Visualizzatore e editor JSON.',
        en: 'JSON viewer and editor.',
        toolIds: ['json-viewer'],
      },
      {
        kind: 'improvement',
        it: 'Il calcolo del codice fiscale ora gestisce anche i comuni soppressi e gli stati esteri.',
        en: 'The tax code tool now also handles suppressed municipalities and foreign states.',
        toolIds: ['codice-fiscale'],
      },
      {
        kind: 'new-tool',
        it: 'Verifica del codice fiscale e di IBAN e partita IVA.',
        en: 'Validation of Italian tax codes, IBANs and VAT numbers.',
        toolIds: ['codice-fiscale', 'iban-partita-iva'],
      },
      {
        kind: 'feature',
        it: 'Il sito è disponibile in inglese: aggiungi /en/ all\'indirizzo oppure usa il selettore di lingua.',
        en: 'The site is available in English: add /en/ to the address or use the language switch.',
      },
      {
        kind: 'feature',
        it: 'Strumenti divisi per categoria nella home e informativa sulla privacy.',
        en: 'Tools grouped by category on the home page, and a privacy notice.',
      },
      {
        kind: 'improvement',
        it: 'Più accessibilità, anteprime più curate quando si condivide un indirizzo del sito.',
        en: 'Better accessibility and nicer previews when a page of the site is shared.',
      },
    ],
  },
  {
    date: '2026-11-15',
    title: { it: 'Prima uscita', en: 'First release' },
    entries: [
      {
        kind: 'new-tool',
        it: 'Dalla prima uscita: CSV in dashboard, generatore di password, calcolo di hash, strumenti per i PDF (unisci, dividi, ruota, riordina), compressione immagini, Base64, codifica degli URL e formattatore JSON.',
        en: 'From day one: CSV to dashboard, password generator, hash calculator, PDF tools (merge, split, rotate, reorder), image compressor, Base64, URL encoding and JSON formatter.',
        toolIds: ['csv-dashboard', 'password-generator', 'hash-generator', 'pdf-tools', 'image-compressor', 'base64', 'url-encode', 'json-formatter'],
      },
      {
        kind: 'fix',
        it: 'Esportazione in PNG e PDF: margini corretti e file PDF molto più piccoli.',
        en: 'PNG and PDF export: correct margins and much smaller PDF files.',
        toolIds: ['csv-dashboard'],
      },
    ],
  },
];
