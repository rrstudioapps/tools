// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 rrstudio — rrstudio tools
import type { Dict } from './it';

/** Dizionario inglese: il tipo Dict garantisce le stesse chiavi dell'italiano. */
export const en: Dict = {
  'nav.home': 'Home',
  'nav.main': 'Main navigation',
  'nav.skip': 'Skip to content',
  'nav.lang': 'Language',
  'nav.theme.toLight': 'Switch to light theme',
  'nav.theme.toDark': 'Switch to dark theme',

  'related.title': 'Related tools',
  'guide.how': 'How to use it',
  'guide.faq': 'Frequently asked questions',
  'guide.privacy': 'Privacy',
  'privacy.headline': 'Your data stays on your computer',
  'privacy.short': 'Files are processed in your browser and are never uploaded.',

  'footer.coffee': 'Buy me a coffee',
  'footer.tools': 'Tools',
  'footer.dashboards': 'Demos',
  'footer.apps': 'Apps',
  'footer.github': 'GitHub',
  'footer.license': 'AGPL-3.0 license',
  'footer.source': 'Source code',
  'feedback.title': 'Feedback',
  'feedback.bug': 'Report a problem',
  'feedback.idea': 'Suggest an improvement',
  'feedback.newtool': 'Propose a new tool',
  'feedback.newtab': '(opens in a new tab, on GitHub)',
  'feedback.note': 'A GitHub account is required. Nothing is sent until you submit the form; do not paste personal data.',
  'footer.suggest': 'Suggest a tool',
  'footer.changelog': "What's new",
  'home.new': 'New',
  'changelog.eyebrow': "What's new",
  'changelog.title': "What's new",
  'changelog.lead': 'The tools, features and improvements added to the site, newest first.',
  'changelog.filter.label': 'Filter by type',
  'changelog.filter.all': 'All',
  'changelog.filter.new-tool': 'New tools',
  'changelog.filter.feature': 'Features',
  'changelog.filter.improvement': 'Improvements',
  'changelog.filter.fix': 'Fixes',
  'changelog.kind.new-tool': 'New tool',
  'changelog.kind.feature': 'Feature',
  'changelog.kind.improvement': 'Improvement',
  'changelog.kind.fix': 'Fix',
  'changelog.tools': 'Tools:',
  'changelog.issues': 'Reports:',
  'changelog.feed': 'Atom feed',
  'changelog.empty': 'No updates of this type.',
  'seo.changelog.title': "What's new | rrstudio tools",
  'seo.changelog.desc': 'New tools, features and improvements in rrstudio tools, with a feed to follow the updates.',
  'footer.privacy': 'Privacy',
  'footer.tutorial': 'Tutorial',
  'footer.noads': 'No ads, no cookies, no tracking.',
  'pwa.footer': 'Use offline',
  'pwa.title': 'Use offline',
  'pwa.close': 'Close',
  'pwa.intro':
    'You can save the site in your browser to use it without a connection. Only the site files (pages, scripts, styles and fonts) are kept: the data you enter in the tools is never saved.',
  'pwa.auto': 'When a new version is released, the saved files update by themselves.',
  'pwa.size': 'Estimated download size: about {size}.',
  'pwa.download': 'Download everything for offline use',
  'pwa.downloading': 'Downloading: {done} of {total} files',
  'pwa.progress': 'Download progress',
  'pwa.cancel': 'Cancel',
  'pwa.cancelled': 'Download cancelled. Files already downloaded stay saved.',
  'pwa.error': 'Some files could not be downloaded. Check your connection and try again.',
  'pwa.ready': 'Ready offline',
  'pwa.readyText': 'The whole site is saved in this browser.',
  'pwa.partial': '{cached} of {total} files are already saved: the pages you visited work offline.',
  'pwa.clear': 'Clear the offline cache',
  'pwa.cleared': 'Offline cache cleared.',
  'pwa.unsupported': 'This browser does not support offline use.',
  'pwa.starting': 'Setting up offline use…',
  'pwa.update': 'New version available',
  'pwa.updateAction': 'Update',
  'pwa.offline': 'You are offline',

  'home.eyebrow': 'FREE TOOLS · OPEN SOURCE',
  'home.h1a': 'Simple tools.',
  'home.h1b': 'In your browser.',
  'home.title': 'Simple, free and open source web tools',
  'home.subtitle':
    'Small tools that run right in your browser. No sign-up, no uploads.',
  'home.tools': 'Tools',
  'home.filters.label': 'Filter by category',
  'home.filter.all': 'All',
  'home.filter.fav': 'Favorites',
  'home.search.label': 'Search tools',
  'home.search.ph': 'Search: hash, pdf, iban…',
  'home.results': '{n} tools',
  'home.results.one': '1 tool',
  'home.empty': 'No tool matches your search.',
  'home.reset': 'Clear filters',
  'cat.text.title': 'Text',
  'cat.text.short': 'Text',
  'cat.text.desc': 'Write, compare, sort and clean up text.',
  'cat.data.title': 'Data',
  'cat.data.short': 'Data',
  'cat.data.desc': 'Tables and structured formats: open, format and convert.',
  'cat.media.title': 'Images, PDF & codes',
  'cat.media.short': 'Images & PDF',
  'cat.media.desc': 'Compress images, merge and split PDFs, create and read QR codes and barcodes.',
  'cat.calc.title': 'Calculators',
  'cat.calc.short': 'Calculators',
  'cat.calc.desc': 'Percentages, units, dates, time zones and number bases.',
  'cat.dev.title': 'Developers',
  'cat.dev.short': 'Developers',
  'cat.dev.desc': 'Encode, decode and compute: small workbench tools.',
  'cat.web.title': 'Web & design',
  'cat.web.short': 'Web & design',
  'cat.web.desc': 'Colors, CSS, SVG and icons for your sites.',
  'cat.security.title': 'Security',
  'cat.security.short': 'Security',
  'cat.security.desc': 'Strong passwords, two-factor codes, encrypted files and photo metadata: your privacy, handled in the browser.',
  'cat.italy.title': 'Italy: tax & banking',
  'cat.italy.short': 'Italy',
  'cat.italy.desc': 'Codice fiscale, IBAN, VAT number, VAT calculator, working days and e-invoices: calculate, verify and read.',
  'home.italy.lead': 'Tools for Italy (in Italian):',
  'home.italy.codice-fiscale': 'codice fiscale',
  'home.italy.iban-partita-iva': 'IBAN & partita IVA',
  'home.italy.fattura-elettronica': 'fattura elettronica',
  'home.italy.calcolo-iva': 'VAT & withholding calculator',
  'home.italy.calcolo-giorni-lavorativi': 'working days calculator',
  'home.italy.calcolo-ritenuta-acconto': 'withholding tax calculator',
  'home.italy.calcolo-rata-mutuo': 'mortgage payment calculator',
  'home.italy.numeri-in-lettere': 'numbers in words',
  'home.open': 'Open the tool',
  'home.soon.badge': 'Coming soon',
  'home.soon.title': 'More tools coming soon',
  'home.soon.desc': 'More free and private tools are on the way.',
  'home.why.title': 'Why it is private',
  'home.why.1.title': 'No uploads',
  'home.why.1.desc':
    'Everything is computed in your browser: your files never leave your computer.',
  'home.why.2.title': 'No cookies, no tracking',
  'home.why.2.desc':
    'No analytics scripts, no external fonts or scripts. Only your theme and a few preferences stay in your browser.',
  'home.why.3.title': 'Open source AGPL',
  'home.why.3.desc': 'The code is public: you can inspect it, use it and improve it.',

  'tool.csv.title': 'CSV → Dashboard',
  'tool.csv.desc':
    'Load a CSV or Excel file and get KPIs, charts and a table instantly. Export to HTML, PNG or PDF.',

  'common.input': 'Input',
  'common.output': 'Output',
  'common.copy': 'Copy',
  'common.copied': 'Copied',
  'send.btn': 'Send to…',
  'send.label': 'Send to… another tool',
  'send.menu': 'Tools to send the result to',
  'send.filter.label': 'Filter the tools',
  'send.filter.ph': 'Filter…',
  'send.filter.empty': 'No tool found',
  'send.received': 'Received from {tool}',
  'intake.title': 'Paste or drop here',
  'intake.hint': 'Paste some text with {key}+V (or drop a file on this page): I recognise the content and suggest the right tools.',
  'intake.paste.label': 'Paste some text here',
  'intake.paste.ph': 'JSON, URL, IBAN, curl command, colour, cron…',
  'intake.pick': 'Choose a file',
  'intake.clear': 'Clear',
  'intake.preview': 'Content preview',
  'intake.local': 'The content stays in this tab: it is not sent to any server.',
  'intake.suggest': 'Tools that fit this content',
  'intake.nothing': 'No tool accepts these files together: try one file at a time.',
  'intake.drop.title': 'Drop the file here to pick a tool',
  'intake.found': 'Detected: {type}',
  'intake.found.text': 'Text with no specific format',
  'intake.found.file': 'File: {kind}',
  'intake.found.files': '{n} files: {kind}',
  'intake.err.big': 'The file is too large to be read as text (10 MB at most).',
  'intake.err.read': 'I cannot read the file.',
  'intake.type.json': 'JSON',
  'intake.type.jwt': 'JWT token',
  'intake.type.url': 'URL',
  'intake.type.base64': 'Base64',
  'intake.type.color': 'CSS colour',
  'intake.type.cron': 'Cron expression',
  'intake.type.iban': 'IBAN',
  'intake.type.codice-fiscale': 'Italian tax code',
  'intake.type.partita-iva': 'Italian VAT number',
  'intake.type.svg': 'SVG',
  'intake.type.curl': 'curl command',
  'intake.type.docker-run': 'docker run command',
  'intake.type.csv': 'CSV or TSV',
  'intake.type.yaml': 'YAML',
  'intake.type.xml': 'XML or HTML',
  'intake.type.sql': 'SQL',
  'intake.type.unix-timestamp': 'Unix timestamp',
  'intake.type.uuid': 'UUID',
  'intake.type.hash': 'Hex hash',
  'intake.type.pem': 'PEM certificate or key',
  'intake.type.ip': 'IP address or CIDR',
  'intake.type.roman': 'Roman numeral',
  'intake.type.morse': 'Morse code',
  'intake.type.date': 'Date',
  'intake.type.text': 'Text',
  'intake.file.image': 'image',
  'intake.file.svg': 'SVG',
  'intake.file.pdf': 'PDF',
  'intake.file.csv': 'CSV',
  'intake.file.json': 'JSON',
  'intake.file.yaml': 'YAML',
  'intake.file.xml': 'XML or HTML',
  'intake.file.pem': 'PEM certificate',
  'intake.file.text': 'text',
  'intake.file.other': 'other type',
  'intake.file.mixed': 'mixed types',
  'share.eyebrow': 'Sharing',
  'share.title': 'Content received',
  'share.lead': 'This is where content arrives when you share it with rrstudio tools from another app or open it with the app. Pick the tool to open it with: the content stays in this tab.',
  'share.waiting': 'Receiving the content…',
  'share.received': 'Content received: pick a tool.',
  'share.empty': 'No content arrived. You can paste it or drop a file below.',
  'share.retry': 'I could not receive the content. Try sharing it again, or paste it or drop a file below.',
  'seo.share.title': 'Content received',
  'seo.share.desc': 'Page that receives content shared with rrstudio tools or opened with the app: pick the right tool.',
  'common.clear': 'Clear',
  'common.swap': 'Swap',

  'shortcuts.btn': 'Shortcuts',
  'shortcuts.btn.aria': 'Keyboard shortcuts',
  'shortcuts.title': 'Keyboard shortcuts',
  'shortcuts.close': 'Close',
  'shortcuts.tool': 'In this tool',
  'shortcuts.global': 'Everywhere',
  'shortcuts.none': 'This tool has no keyboard actions.',
  'shortcuts.run': 'Run or generate',
  'shortcuts.copy': 'Copy the result',
  'shortcuts.download': 'Download the result',
  'shortcuts.swap': 'Swap input and output',
  'shortcuts.clear': 'Clear the data (press twice to confirm)',
  'shortcuts.send': 'Send to another tool',
  'print.btn': 'Print or save PDF',
  'print.btn.aria': 'Print or save PDF of the results',
  'print.note': 'Indicative calculation, generated in the browser by tools.rrstudio.app',
  'print.yes': 'Yes',
  'print.no': 'No',
  'shortcuts.print': 'Print or save as PDF',
  'shortcuts.next': 'Next difference or result (also in text fields)',
  'shortcuts.prev': 'Previous difference or result (also in text fields)',
  'shortcuts.toggle-view': 'Switch view (side by side or inline)',
  'shortcuts.toggle-collapse': 'Hide or show unchanged lines',
  'shortcuts.toggle-ws': 'Ignore whitespace, on or off',
  'shortcuts.toggle-inputs': 'Hide or show the texts',
  'shortcuts.help': 'Open this panel (outside text fields)',
  'shortcuts.esc': 'Closes panels and menus, never clears data',
  'shortcuts.search': 'Search for a tool',
  'palette.open': 'Search for a tool (Ctrl+K)',
  'palette.title': 'Search for a tool',
  'palette.label': 'Search the tools',
  'palette.placeholder': 'Search for a tool…',
  'palette.results': 'Tools found',
  'palette.empty': 'No tool found.',
  'palette.count': '{n} tools found. Arrow keys to choose, Enter to open.',
  'palette.count.one': '1 tool found. Press Enter to open it.',
  'palette.pinned': 'Favorites',
  'palette.recent': 'Recent',
  'palette.all': 'Tools',
  'palette.back': 'Back',
  'palette.loading': 'Loading…',
  'chain.open': 'Tool chains',
  'chain.title': 'Tool chains',
  'chain.close': 'Close',
  'chain.intro': 'Link several tools into a path: after using a tool, “Send to…” offers the next step first. Saved chains keep only a name and the tools, never your data.',
  'chain.saved': 'Saved chains',
  'chain.none': 'No saved chains.',
  'chain.start': 'Start',
  'chain.deleteShort': 'Delete',
  'chain.delete': 'Delete the chain {name}',
  'chain.new': 'New chain',
  'chain.name': 'Name',
  'chain.untitled': 'Untitled chain',
  'chain.up': 'Move {tool} up',
  'chain.down': 'Move {tool} down',
  'chain.remove': 'Remove {tool} from the chain',
  'chain.add.label': 'Tool to add',
  'chain.add': 'Add step',
  'chain.save': 'Save',
  'chain.saved.ok': 'Chain saved.',
  'chain.saved.err': 'The chain could not be saved (it needs a name and at least 2 steps, up to 20 chains).',
  'chain.bar.aria': 'Chain in progress: {name}',
  'chain.bar.next': 'Next: “Send to…” → {tool}',
  'chain.bar.last': 'Last step.',
  'chain.bar.off': 'This tool is not in the chain: use the steps beside.',
  'chain.bar.stop': 'Close chain',
  'chain.send': 'Next step: {tool}',
  'settings.export': 'Export settings',
  'settings.import': 'Import settings',
  'settings.exported': 'Settings file downloaded.',
  'settings.imported': 'Settings imported.',
  'settings.import.title': 'Import these settings?',
  'settings.import.from': 'From the file “{name}”.',
  'settings.theme': 'Theme: {v}',
  'settings.theme.light': 'light',
  'settings.theme.dark': 'dark',
  'settings.hint': '“available in English” bar closed',
  'settings.favs': 'Favorites ({f}) and menus ({g})',
  'settings.chains': 'Tool chains ({n})',
  'settings.import.replace': 'The listed sections replace those on this device; the others are left untouched.',
  'settings.import.dropped': '{n} invalid or unknown items were ignored.',
  'settings.import.confirm': 'Import',
  'settings.import.cancel': 'Cancel',
  'settings.err.empty': 'The file is empty.',
  'settings.err.tooBig': 'The file is too large to be a settings file.',
  'settings.err.read': 'The file could not be read.',
  'settings.err.json': 'The file is not valid JSON.',
  'settings.err.shape': 'The file is not an rrstudio tools settings file.',
  'settings.err.nothing': 'The file contains no settings to import.',
  'shortcuts.or': 'or',
  'shortcuts.done.run': 'Done',
  'shortcuts.done.download': 'Downloaded',
  'shortcuts.done.swap': 'Swapped',
  'shortcuts.done.clear': 'Data cleared',
  'shortcuts.done.send': 'Pick the destination tool',
  'shortcuts.done.print': 'Opening print',
  'shortcuts.done.toggle-view': 'View switched',
  'shortcuts.done.toggle-collapse': 'Unchanged lines option switched',
  'shortcuts.done.toggle-ws': 'Whitespace option switched',
  'shortcuts.done.toggle-inputs': 'Texts visibility switched',
  'shortcuts.unavailable': 'Nothing to do right now',
  'shortcuts.confirmClear': 'Press {keys} again to clear the data',
  'shortcuts.key.enter': 'Enter',
  'shortcuts.key.shift': 'Shift',
  'common.chooseFile': 'Choose a file',
  'share.copy': 'Copy link',
  'share.note': 'The content is in the link: whoever gets it can see it. It is not sent to our server.',
  'share.copied': 'Link copied',
  'share.invalid': 'The link is not valid or was cut short: the tool was left as it is.',
  'share.toolarge': 'The content is too large to fit in a link.',
  'common.counter': '{chars} characters · {bytes} bytes',

  'tool.base64.title': 'Base64 Encode/Decode',
  'tool.base64.desc':
    'Encode and decode text and files to Base64, with UTF-8, URL-safe and data URL support. Image preview included.',
  'tool.url.title': 'URL Encode/Decode',
  'tool.url.desc':
    'Encode and decode URLs and query parameters with percent-encoding, and break a URL into its parts.',
  'tool.json.title': 'JSON Formatter and Validator',
  'tool.json.desc':
    'Format, minify, sort and validate JSON, with errors pinpointed by line and column, plus statistics.',

  'seo.home.title': 'rrstudio tools — Free and open source web tools',
  'seo.home.desc':
    'Free, open source and private web tools: PDF, JSON, CSV, images, QR codes and more. Your files stay on your computer. No sign-up, no tracking.',
  'seo.csv.title': 'CSV → Dashboard, free and private online — rrstudio tools',
  'seo.csv.desc':
    'Turn a CSV or Excel file into a dashboard with KPIs and charts, right in your browser. No uploads: your data stays on your computer.',
  'seo.base64.title': 'Base64 Encode and Decode online | rrstudio tools',
  'seo.base64.desc':
    'Encode and decode Base64 online, including files and images: proper UTF-8, URL-safe variant and data URLs. Runs in your browser, nothing is uploaded.',
  'seo.url.title': 'URL Encode and Decode online | rrstudio tools',
  'seo.url.desc':
    'Encode and decode URLs and query parameters (percent-encoding) in component or full-URL mode, with a table of the URL parts. Runs in your browser.',
  'seo.json.title': 'JSON Formatter and Validator online | rrstudio tools',
  'seo.json.desc':
    'Format, minify and validate JSON online: errors with line and column, key sorting and syntax highlighting. Runs in your browser, nothing is uploaded.',
  'tool.jv.title': 'JSON viewer & editor',
  'tool.jv.desc':
    'Explore JSON as a tree, search keys and values, copy the path and edit nodes with undo and redo. Handles files of tens of MB.',
  'seo.jv.title': 'JSON Viewer and Editor, tree view | rrstudio tools',
  'seo.jv.desc':
    'View and edit JSON as an expandable tree: search, JavaScript path and JSON Pointer, edit keys and values, undo and redo. Nothing is uploaded.',

  'tool.ic.title': 'Image compressor & converter',
  'tool.ic.desc':
    'Shrink JPG, PNG and WebP files, convert to WebP or AVIF and resize them, many at once. Before/after comparison and a ZIP download.',
  'seo.ic.title':
    'Image compressor and converter | rrstudio tools',
  'seo.ic.desc':
    'Compress photos and images, convert them to WebP, JPEG, PNG or AVIF and resize them in bulk, with a before/after comparison and ZIP. No upload.',

  'tool.pdf.title': 'PDF tools: merge, split, rotate',
  'tool.pdf.desc':
    'Merge several PDFs, extract or split pages, rotate and reorder them from a grid of thumbnails. Your files never leave your computer.',
  'seo.pdf.title': 'Merge, split and rotate PDF online | rrstudio tools',
  'seo.pdf.desc':
    'Merge PDFs into one, split a PDF, extract, delete, rotate and reorder pages. All in your browser, nothing is uploaded: fine for confidential files.',

  'tool.pw.title': 'Password generator',
  'tool.pw.desc':
    'Random passwords and memorable passphrases, with entropy and an estimated time to guess them. Made in your browser, never stored.',
  'seo.pw.title': 'Secure password generator online | rrstudio tools',
  'seo.pw.desc':
    'Generate random passwords and passphrases with the browser\'s cryptography: length, character sets, entropy in bits and time to guess. Nothing is stored.',

  'tool.hash.title': 'Hash & checksum',
  'tool.hash.desc':
    'Compute MD5, SHA-1, SHA-256, SHA-384 and SHA-512 of a text or a file (up to 2 GB) and compare them with a checksum. All in your browser.',
  'seo.hash.title': 'SHA-256, SHA-1, MD5 hash calculator | rrstudio tools',
  'seo.hash.desc':
    'Compute SHA-256, SHA-512, SHA-1 and MD5 of a text or a file and verify a checksum, with a progress bar for large files. All in your browser, no upload.',

  'tool.cf.title': 'Italian tax code (codice fiscale) calculator',
  'tool.cf.desc':
    'Calculate the Italian codice fiscale from name, surname, sex, date and place of birth, or check and decode a code (including omocodia). No personal data leaves your computer.',
  'seo.cf.title': 'Italian tax code (codice fiscale) tool | rrstudio tools',
  'seo.cf.desc':
    'Calculate the codice fiscale from name, surname, date and place of birth and validate one: check character, omocodia, sex and date. No data is sent or stored.',

  'tool.iban.title': 'IBAN & Italian VAT number validator',
  'tool.iban.desc':
    'Check an IBAN (mod-97, length per country, Italian CIN, ABI and CAB) or an Italian VAT number (partita IVA), also in bulk with CSV export. No data leaves your computer.',
  'seo.iban.title': 'IBAN and Italian VAT number validator | rrstudio tools',
  'seo.iban.desc':
    'Check whether an IBAN is valid (mod-97, length per country, CIN, ABI, CAB) and whether an Italian VAT number is correct, in bulk with CSV export.',

  'tool.fe.title': 'Italian e-invoice viewer (FatturaPA XML/P7M)',
  'tool.fe.desc':
    'Open an Italian electronic invoice in XML, a signed .p7m file or a ZIP of invoices and read it laid out: parties, lines, VAT, totals, payment and attachments. Print or save as PDF.',
  'seo.fe.title': 'Italian e-invoice XML and P7M viewer | rrstudio tools',
  'seo.fe.desc':
    'Read an Italian electronic invoice (FatturaPA XML, signed .p7m, ZIP): supplier, lines, VAT summary, totals, due dates and attachments. Print to PDF, no upload.',

  'tool.i2p.title': 'Images to PDF',
  'tool.i2p.desc':
    'Combine JPG, PNG and WebP images into one PDF: reorder the thumbnails, pick page size, orientation, margins, images per page and quality.',
  'seo.i2p.title': 'Images to PDF online (JPG, PNG, WebP) | rrstudio tools',
  'seo.i2p.desc':
    'Combine several JPG, PNG or WebP images into one PDF: any order, A4, Letter or fit-to-image pages, margins, 1, 2 or 4 images per page. All in your browser.',

  'tool.p2i.title': 'PDF to images',
  'tool.p2i.desc':
    'Turn PDF pages into PNG or JPEG images at 72, 150 or 300 dpi: choose the pages, preview them and download one by one or as a ZIP.',
  'seo.p2i.title': 'PDF to PNG or JPG images online | rrstudio tools',
  'seo.p2i.desc':
    'Convert PDF pages to PNG or JPEG images, all of them or just a range, at 72, 150 or 300 dpi, with previews and a ZIP download. All in your browser, no upload.',

  'tool.p2t.title': 'PDF to text',
  'tool.p2t.desc':
    'Extract the text from one or more PDFs, password-protected ones too: lines and paragraphs rebuilt, columns, line-end hyphens joined, repeated headers and footers removed. Copy or download as .txt and .md.',
  'seo.p2t.title': 'Extract text from a PDF online, no upload | rrstudio tools',
  'seo.p2t.desc':
    'Copy the text of a PDF or save it as TXT or Markdown: rebuilds lines and paragraphs, removes headers and footers. In your browser, no upload.',

  'tool.exif.title': 'EXIF viewer & remover: photo metadata',
  'tool.exif.desc':
    'See what your photos reveal (GPS location, phone model, date, serial number) and remove the metadata without recompressing the image.',
  'seo.exif.title': 'View and remove photo EXIF metadata | rrstudio tools',
  'seo.exif.desc':
    'Read the EXIF, GPS, XMP and IPTC metadata of JPEG, PNG and WebP files and strip it with no recompression, with warnings about sensitive data. No upload.',

  'tool.qr.title': 'QR code generator',
  'tool.qr.desc':
    'Create QR codes for links, text, WiFi, contacts, email, SMS and locations, with colors, a logo and error correction. Download PNG or SVG.',
  'seo.qr.title': 'Free QR code generator with logo and WiFi | rrstudio tools',
  'seo.qr.desc':
    'Create QR codes for links, text, WiFi, vCard, email, SMS and locations: colors, margin, centre logo, PNG and SVG. In your browser, no account, never expires.',

  'tool.iva.title': 'Italian VAT, VAT extraction and withholding tax calculator',
  'tool.iva.desc':
    'Add or extract Italian VAT and prepare a freelancer invoice: INPS surcharge, pension fund, withholding tax, stamp duty and flat-rate regime. Also from net to fee.',
  'seo.iva.title': 'Italian VAT and withholding calculator | rrstudio tools',
  'seo.iva.desc':
    'Calculate Italian VAT, extract VAT from a gross amount and prepare an invoice with INPS surcharge, 20% withholding tax, stamp duty and flat-rate regime.',

  'tool.diff.title': 'Text compare (diff)',
  'tool.diff.desc':
    'Compare two texts or files line by line, with changed words highlighted, side-by-side or inline view, and export as a patch.',
  'seo.diff.title': 'Online text compare (diff) | rrstudio tools',
  'seo.diff.desc':
    'Compare two texts or files and see the differences: lines, words and characters changed, side-by-side or inline view, ignore whitespace and case, export .patch.',
  'tool.jd.title': 'JSON diff (structural compare)',
  'tool.jd.desc':
    'Compare two JSON (or YAML) documents by structure: differences with path, old and new value, arrays by index, as sets or by key, merged tree view and JSON Patch export.',
  'seo.jd.title': 'Online JSON diff (structural compare) | rrstudio tools',
  'seo.jd.desc':
    'Compare two JSON documents: additions, removals and changes with the exact path, key order ignored, export as JSON Patch. In your browser, no upload.',

  'tool.md.title': 'Markdown editor',
  'tool.md.desc':
    'Write Markdown and see the preview side by side, with a formatting toolbar. Export as .md, as a standalone HTML file or as a PDF through the browser print dialog.',
  'seo.md.title': 'Markdown editor with live preview | rrstudio tools',
  'seo.md.desc':
    'Markdown editor with a real-time preview: headings, lists, tables, code and links. Safe preview, export .md, HTML or PDF. The draft stays in your browser only.',

  'tool.wc.title': 'Word & character counter',
  'tool.wc.desc':
    'Count words, characters, sentences and paragraphs, estimate reading and speaking time, find the most frequent words and check length limits (SMS, X, meta description). With case conversions.',
  'seo.wc.title': 'Online word and character counter | rrstudio tools',
  'seo.wc.desc':
    'Count words, characters (with and without spaces), sentences and paragraphs; reading and speaking time, frequent words and limits for SMS, X and meta tags.',

  'tool.rx.title': 'Regex tester',
  'tool.rx.desc':
    'Try a JavaScript regular expression with flags, highlighted matches, groups, replacement and a plain-words explanation of the pattern. Protected against catastrophic backtracking.',
  'seo.rx.title': 'Online regex tester (regular expressions) | rrstudio tools',
  'seo.rx.desc':
    'Test JavaScript regular expressions: flags, highlighted matches, named groups, replacement preview, token explanation and examples. A timeout stops slow ones.',

  'tool.wd.title': 'Working days calculator (Italy)',
  'tool.wd.desc':
    'Count working days between two dates, or add and subtract working days from a date, with Italian public holidays, a patron saint day and Easter (in Italian).',
  'seo.wd.title': 'Italian working days calculator | rrstudio tools',
  'seo.wd.desc':
    'Calculate working days between two dates or a deadline by adding working days: weekends, Italian national holidays, Easter and patron saint day. In Italian.',

  'tool.cj.title': 'CSV, JSON & Excel converter',
  'tool.cj.desc':
    'Convert tables between CSV, JSON and Excel in any direction: delimiters, headers, nested objects, sheet choice and a preview.',
  'seo.cj.title': 'CSV, JSON & Excel converter online | rrstudio tools',
  'seo.cj.desc':
    'Convert CSV, JSON and Excel into each other: automatic delimiter, header row, nested objects, sheet picker, formula-safe export. In your browser, no upload.',

  'tool.jwt.title': 'JWT decoder',
  'tool.jwt.desc':
    'Paste a JSON Web Token and read its header, payload, algorithm and expiry dates, in your time zone and in UTC. The signature is not verified.',
  'seo.jwt.title': 'JWT decoder online (JSON Web Token) | rrstudio tools',
  'seo.jwt.desc':
    'Decode a JWT and read the header, payload, algorithm and the exp, iat and nbf dates, with the time left until expiry. The signature is not verified.',

  'tool.uuid.title': 'UUID generator',
  'tool.uuid.desc':
    'Generate UUID v4, UUID v7 (sortable by date) and ULID, up to 1000 at a time, and check the version, variant and date of an identifier.',
  'seo.uuid.title': 'UUID v4, v7 and ULID generator | rrstudio tools',
  'seo.uuid.desc':
    'Generate UUID v4, UUID v7 with timestamp and ULID, from 1 to 1000, in upper or lower case, and validate a UUID to read its version and date. In your browser.',

  'tool.sign.title': 'Sign a PDF online',
  'tool.sign.desc':
    'Sign a PDF in your browser: draw, type or upload your signature, place it on the pages with a date and download the signed PDF. A graphic signature, nothing uploaded.',
  'seo.sign.title': 'Sign a PDF online for free, without uploading it | rrstudio tools',
  'seo.sign.desc':
    'Sign a PDF online: draw, type or upload your signature and place it on several pages with the date. The file stays in your browser. Graphic signature.',
  'tool.pm.title': 'PDF metadata: view, edit, remove',
  'tool.pm.desc':
    'View and edit a PDF\'s title, author and dates or remove all metadata (XMP too) before sharing it.',
  'seo.pm.title': 'Edit or remove PDF metadata online | rrstudio tools',
  'seo.pm.desc':
    'View, edit and remove a PDF\'s metadata online: title, author, keywords, creating program, dates and XMP. The file is not uploaded.',
  'tool.pt.title': 'PDF page numbers, headers and footers',
  'tool.pt.desc':
    'Add page numbers, a header and a footer to a PDF, with preview, page selection and rotated pages.',
  'seo.pt.title': 'Add page numbers and headers to a PDF online | rrstudio tools',
  'seo.pt.desc':
    'Add page numbers, a header and a footer to a PDF online: left, centre, right, placeholders, preview. The file is not uploaded.',
  'tool.pcz.title': 'Compress PDF: make it lighter',
  'tool.pcz.desc':
    'Make a PDF lighter by recompressing its images or turning pages into images, with the saving shown before you download.',
  'seo.pcz.title': 'Compress PDF online, without uploading it | rrstudio tools',
  'seo.pcz.desc':
    'Compress a PDF online in your browser: recompress images with the quality and size of your choice or turn pages into images. The file is not uploaded.',
  'tool.pcr.title': 'Crop and resize PDF',
  'tool.pcr.desc':
    'Crop a PDF\'s margins with a preview, change the page scale or fit pages to A4, A5, A3, Letter, Legal.',
  'seo.pcr.title': 'Crop margins and resize a PDF online | rrstudio tools',
  'seo.pcr.desc':
    'Crop a PDF\'s margins, change the scale or fit pages to A4, A5, Letter online, with a preview. The file is not uploaded.',
  'tool.pim.title': 'Extract images from PDF',
  'tool.pim.desc':
    'Extract the images embedded in a PDF at original quality (JPEG or PNG), one by one or all in a ZIP.',
  'seo.pim.title': 'Extract images from a PDF online | rrstudio tools',
  'seo.pim.desc':
    'Extract images from a PDF online: JPEGs identical to the original and PNGs with transparency too, with preview and ZIP. The file is not uploaded.',
  'tool.pfm.title': 'Fill in and flatten PDF forms',
  'tool.pfm.desc':
    'Fill in a PDF form\'s fields and download the filled or flattened file, with the values fixed on the page.',
  'seo.pfm.title': 'Fill in PDF forms online and flatten them | rrstudio tools',
  'seo.pfm.desc':
    'Fill in a PDF form online: text, checkboxes, choices and menus; download the filled or flattened PDF. The file is not uploaded.',
  'tool.prd.title': 'Black out parts of a PDF',
  'tool.prd.desc':
    'Black out names, codes and signatures in a PDF by drawing rectangles or searching for a text: redacted pages become images and the text underneath no longer exists.',
  'seo.prd.title': 'Redact text and areas in a PDF online | rrstudio tools',
  'seo.prd.desc':
    'Redact parts of a PDF online for real: black rectangles or a text search; pages become images and the text underneath is gone. The file is not uploaded.',
  'tool.ppw.title': 'Protect a PDF with a password',
  'tool.ppw.desc':
    'Protect a PDF with a password to open it (256-bit AES) and restrict printing, copying and editing, all in your browser.',
  'seo.ppw.title': 'Password-protect a PDF online | rrstudio tools',
  'seo.ppw.desc':
    'Password-protect a PDF online: 256-bit AES encryption, print, copy and edit restrictions. The file and the password never leave your browser.',
  'tool.crop.title': 'Crop and rotate images',
  'tool.crop.desc':
    'Crop a photo with fixed aspect ratios (including 35×45 ID photo), rotate, flip, resize and export as PNG, JPEG or WebP, without uploading anything.',
  'seo.crop.title': 'Crop, rotate and resize images online | rrstudio tools',
  'seo.crop.desc':
    'Crop photos online to 1:1, 4:3, 16:9 or ID photo ratios, rotate, flip, resize and export as PNG, JPEG or WebP. In your browser, metadata stripped.',
  'tool.meta.title': 'Meta tag and Open Graph preview',
  'tool.meta.desc':
    'Paste a page\'s HTML and preview it on Google, Facebook, LinkedIn, X and WhatsApp, with checks on title, description, Open Graph and Twitter Card.',
  'seo.meta.title': 'Meta tag, Open Graph and Twitter Card preview | rrstudio tools',
  'seo.meta.desc':
    'Check title, description, canonical, Open Graph and Twitter Card: Google, Facebook, LinkedIn, X and WhatsApp previews and an HTML snippet. No network requests.',

  'tool.fake.title': 'Fake data generator',
  'tool.fake.desc':
    'Fake but realistic test data: names, emails, addresses, formally valid Italian tax codes, VAT numbers and IBANs. 1 to 10,000 rows, with a repeatable seed, as CSV, JSON or SQL.',
  'seo.fake.title': 'Online fake data generator: CSV, JSON and SQL | rrstudio tools',
  'seo.fake.desc':
    'Generate fake Italian test data: names, test emails, phone, address, and format-valid tax code, VAT number and IBAN. Up to 10,000 rows, all in your browser.',

  'tool.jq.title': 'JSONPath, JSON to TypeScript and JSON Schema',
  'tool.jq.desc':
    'Query a JSON with JSONPath expressions (filters, slices, recursive search) and derive TypeScript interfaces and a JSON Schema from it.',
  'seo.jq.title': 'JSONPath, JSON to TypeScript and JSON Schema | rrstudio tools',
  'seo.jq.desc':
    'Try JSONPath expressions on a JSON with filters, slices and result paths, and generate TypeScript interfaces or a JSON Schema (draft 2020-12). All in your browser.',

  'tool.wm.title': 'Watermark images and PDFs',
  'tool.wm.desc':
    'Add a text or logo watermark to several images and PDFs at once: position, tiling, rotation and opacity, with a live preview and nothing uploaded.',
  'seo.wm.title': 'Watermark images and PDFs without uploading | rrstudio tools',
  'seo.wm.desc':
    'Put a text or logo watermark on photos and PDFs: position, rotation, opacity and colour, all pages or just some. Several files as a ZIP, in your browser.',
  'tool.cpk.title': 'Image color picker and palette',
  'tool.cpk.desc':
    'Read a pixel\'s colour with a click, a tap or the keyboard (HEX, RGB, HSL, OKLCH) with a magnifier, and extract the dominant colour palette from an image.',
  'seo.cpk.title': 'Image colour picker and palette extractor online | rrstudio tools',
  'seo.cpk.desc':
    'Load a photo and pick any pixel\'s colour as HEX, RGB, HSL and OKLCH, with a magnifier and history. Get the dominant palette and export it as CSS or JSON.',
  'tool.s2p.title': 'SVG to PNG',
  'tool.s2p.desc':
    'Convert an SVG to PNG, JPG or WebP: 1x to 8x scale or an exact size, transparent or coloured background, even when the SVG has no width and height. In your browser.',
  'seo.s2p.title': 'Convert SVG to PNG, JPG or WebP, no upload | rrstudio tools',
  'seo.s2p.desc':
    'Turn an SVG into a PNG, JPG or WebP at the resolution you want (1x-8x), with a transparent or coloured background. Warns about external resources. In your browser.',
  'tool.icv.title': 'Image format converter',
  'tool.icv.desc':
    'Convert images to PNG, JPG, WebP or AVIF in your browser, with quality and resizing of your choice. Several files at once, single or ZIP download.',
  'seo.icv.title': 'Online image converter: PNG, JPG, WebP, AVIF | rrstudio tools',
  'seo.icv.desc':
    'Convert several images to PNG, JPG, WebP or AVIF, adjust quality, resize and download everything as a ZIP. In your browser, nothing uploaded, no EXIF.',
  'tool.colc.title': 'Color converter',
  'tool.colc.desc':
    'Convert a color between HEX, RGB, HSL, HWB, OKLCH, OKLAB and CMYK, generate the 50-950 shade scale and harmonies, and export CSS variables and JSON.',
  'seo.colc.title': 'Color converter: HEX, RGB, HSL, OKLCH, palettes | rrstudio tools',
  'seo.colc.desc':
    'Convert colors between HEX, RGB, HSL, HWB, OKLCH, OKLAB and CMYK. 50-950 shade scale, complementary and triadic colors, exportable as CSS variables or JSON.',

  'tool.yj.title': 'YAML, JSON and TOML converter',
  'tool.yj.desc':
    'Convert between YAML, JSON and TOML in every direction, with multiple YAML documents, a choice of indentation and errors with line and column.',
  'seo.yj.title': 'YAML JSON TOML converter online | rrstudio tools',
  'seo.yj.desc':
    'Convert YAML to JSON, JSON to YAML and TOML in every direction: multiple documents, indentation, errors with line and column. In your browser, nothing is sent.',

  'tool.xd.title': 'XML compare',
  'tool.xd.desc':
    'Compare two XML documents by structure: added and removed elements, changed attributes and text, with the XPath of each difference and without the noise of indentation and attribute order.',
  'seo.xd.title': 'Online XML compare: structural differences | rrstudio tools',
  'seo.xd.desc':
    'Compare two XML files and see the differences in elements, attributes and text with the XPath. Ignores indentation and attribute order. All in your browser.',
  'tool.x2c.title': 'XML to table and CSV',
  'tool.x2c.desc':
    'Turn an XML into a table: pick the repeating element, flatten attributes and children into columns, preview it and download the CSV.',
  'seo.x2c.title': 'Convert XML to CSV and table online | rrstudio tools',
  'seo.x2c.desc':
    'Convert an XML to a table and CSV: pick the repeating record, flatten attributes and children into columns, choose the delimiter and download. All in your browser.',
  'tool.xj.title': 'XML ↔ JSON',
  'tool.xj.desc':
    'Convert XML to JSON and JSON to XML with attributes, text and repeated elements: prefix, arrays and types of your choice, in the browser.',
  'seo.xj.title': 'XML JSON converter online, both ways | rrstudio tools',
  'seo.xj.desc':
    'Convert XML to JSON and JSON to XML online: configurable attributes, arrays and types, errors with line and column, no data sent to a server.',
  'tool.hd.title': 'HTML and DOM viewer',
  'tool.hd.desc':
    'See an HTML page as a DOM tree, search with CSS selectors or XPath and copy the path of each element, in the browser.',
  'seo.hd.title': 'HTML and DOM viewer with CSS and XPath queries | rrstudio tools',
  'seo.hd.desc':
    'View an HTML document as a DOM tree online: CSS selector and XPath queries, path of each node, no script run and no data sent.',
  'tool.yv.title': 'YAML and TOML viewer and editor',
  'tool.yv.desc':
    'Explore and edit a YAML or TOML file as a tree: search keys and values, copy the path, undo and redo, convert between the two formats.',
  'seo.yv.title': 'YAML and TOML tree viewer and editor | rrstudio tools',
  'seo.yv.desc':
    'View and edit YAML and TOML as a tree online: search, path of each node, edit keys and values, undo and redo, convert between the formats. Nothing is uploaded.',
  'tool.yc.title': 'YAML and CSV compare',
  'tool.yc.desc':
    'Compare two YAML or two CSV files: differences with their path, lists matched by key, CSV rows matched by the columns you choose.',
  'seo.yc.title': 'Compare two YAML or CSV files online | rrstudio tools',
  'seo.yc.desc':
    'Compare two YAML or CSV files online: structural differences with path, lists matched by key, CSV rows matched by key column. Nothing is uploaded.',
  'tool.sx.title': 'JSON Schema ↔ XSD converter',
  'tool.sx.desc':
    'Convert a JSON Schema to XSD and an XSD to JSON Schema; anything with no equivalent is listed as a warning.',
  'seo.sx.title': 'JSON Schema to XSD and XSD to JSON Schema | rrstudio tools',
  'seo.sx.desc':
    'Convert JSON Schema to XSD and XSD to JSON Schema: elements, attributes, types and restrictions, with a list of what cannot be converted. Nothing is uploaded.',
  'tool.st.title': 'Test data generator from a schema',
  'tool.st.desc':
    'Generate test data from a JSON Schema or an XSD: repeatable seed, number of records, export as JSON, XML or CSV.',
  'seo.st.title': 'Test data generator from JSON Schema or XSD | rrstudio tools',
  'seo.st.desc':
    'Generate test data from JSON Schema or XSD online: repeatable seed, any number of records, export as JSON, XML or CSV. Nothing is uploaded.',
  'tool.xsd.title': 'XSD validator',
  'tool.xsd.desc':
    'Check an XML against an XSD schema: types, facets, element order and count, required attributes and IDs, with the XPath of every problem.',
  'seo.xsd.title': 'Online XSD validator for XML | rrstudio tools',
  'seo.xsd.desc':
    'Validate an XML document against an XSD schema and get the list of problems with the XPath. Supports the most used parts of XSD 1.0. All in your browser.',
  'tool.xv.title': 'XML editor and viewer',
  'tool.xv.desc':
    'Open an XML as a tree: search tags, attributes and text, copy the XPath of nodes and edit them with undo and redo, without the file leaving your browser.',
  'seo.xv.title': 'Online XML tree editor and viewer | rrstudio tools',
  'seo.xv.desc':
    'View and edit XML as a tree: search tags, attributes and text, copy the XPath, add, move and delete nodes with undo and redo. All in your browser.',
  'tool.xml.title': 'XML formatter and minifier',
  'tool.xml.desc':
    'Format or minify XML with the indentation you want, check it is well-formed and, if needed, convert it to JSON. Comments and CDATA are kept.',
  'seo.xml.title': 'Format, minify and validate XML online | rrstudio tools',
  'seo.xml.desc':
    'Format and minify XML, check well-formedness with errors by line and column, keep comments and CDATA and convert to JSON. Everything runs in your browser.',

  'tool.sql.title': 'SQL formatter',
  'tool.sql.desc':
    'Format or minify an SQL query, choosing the dialect (PostgreSQL, MySQL, SQLite, SQL Server, BigQuery…), keyword case and indentation.',
  'seo.sql.title': 'SQL formatter online (PostgreSQL, MySQL, SQLite) | rrstudio tools',
  'seo.sql.desc':
    'Format and minify SQL for PostgreSQL, MySQL, MariaDB, SQLite, SQL Server, BigQuery and other dialects, with your choice of keyword case and indentation. In your browser.',

  'tool.ent.title': 'HTML entities and escaping',
  'tool.ent.desc':
    'Encode and decode HTML entities (named, decimal, hexadecimal) and escape text for JavaScript strings, JSON and URL components.',
  'seo.ent.title': 'HTML entities encoder and decoder online | rrstudio tools',
  'seo.ent.desc':
    'Encode and decode HTML entities, escape and unescape JavaScript, JSON and URL strings. Decoding never interprets markup. Everything runs in your browser.',

  'tool.case.title': 'Text case converter',
  'tool.case.desc':
    'Convert text to camelCase, snake_case, kebab-case, Title Case (English and Italian), uppercase, lowercase and more, line by line if you like.',
  'seo.case.title': 'camelCase, snake_case and Title Case converter | rrstudio tools',
  'seo.case.desc':
    'Convert text to camelCase, PascalCase, snake_case, kebab-case, Title Case with English and Italian rules, uppercase and lowercase, line by line. In your browser.',

  'tool.slug.title': 'Slug generator',
  'tool.slug.desc':
    'Turn titles into URL slugs: transliterated accents, a separator of your choice, a maximum length that never splits words, and stop words.',
  'seo.slug.title': 'URL slug generator online | rrstudio tools',
  'seo.slug.desc':
    'Generate URL slugs from titles and sentences: transliterated accents, separator and length of your choice, Italian and English stop words, in bulk too. In your browser.',

  'tool.lorem.title': 'Lorem ipsum generator',
  'tool.lorem.desc':
    'Generate Lorem ipsum placeholder text as paragraphs, sentences or words, as text or HTML, with an optional seed for repeatable results.',
  'seo.lorem.title': 'Lorem ipsum generator online | rrstudio tools',
  'seo.lorem.desc':
    'Generate Lorem ipsum as paragraphs, sentences or words, as text or HTML with p tags, with an optional seed to always get the same text. Everything runs in your browser.',

  'tool.cron.title': 'Cron expressions',
  'tool.cron.desc':
    'Explain a cron expression in plain words (Italian and English), validate it and compute the next runs in your time zone or in UTC.',
  'seo.cron.title': 'Cron expression explainer and next runs online | rrstudio tools',
  'seo.cron.desc':
    'Read a cron expression in English or Italian, validate the syntax with clear errors and see the next runs in local time or UTC, with seconds and aliases.',

  'tool.ts.title': 'Unix timestamp converter',
  'tool.ts.desc':
    'Convert Unix timestamps to dates and back: seconds, milliseconds, microseconds and nanoseconds, time zones, ISO 8601, RFC 2822 and relative time.',
  'seo.ts.title': 'Unix timestamp converter online | rrstudio tools',
  'seo.ts.desc':
    'Convert a Unix timestamp to a readable date and back: seconds, milliseconds, microseconds and nanoseconds, time zones, ISO 8601, RFC 2822 and many lines.',

  'tool.cc.title': 'Color contrast checker',
  'tool.cc.desc':
    'Check the contrast between two colors according to WCAG: AA and AAA results, preview, HEX, RGB, HSL and OKLCH conversions and an alternative color that passes.',
  'seo.cc.title': 'WCAG color contrast checker (AA, AAA) | rrstudio tools',
  'seo.cc.desc':
    'Calculate the contrast ratio between text and background and check AA and AAA for normal and large text and graphics. Accepts HEX, rgb, hsl and suggests a fix.',

  'tool.rit.title': 'Withholding tax calculator (Italy)',
  'tool.rit.desc':
    'Gross to net and net to gross for Italian occasional services and freelancer fees: withholding tax, INPS surcharge, pension fund, VAT and stamp duty, with a copyable statement.',
  'seo.rit.title': 'Italian withholding tax calculator | rrstudio tools',
  'seo.rit.desc':
    'Calculate the 20% Italian withholding tax (ritenuta d\'acconto) on a fee: gross to net and back, with INPS surcharge, pension fund, VAT and 2 euro stamp duty.',

  'tool.mutuo.title': 'Mortgage payment calculator (Italy)',
  'tool.mutuo.desc':
    'Payment, total interest and a French amortization schedule from principal, nominal rate (TAN) and term. Monthly, quarterly or half-yearly payments, with CSV export.',
  'seo.mutuo.title': 'Mortgage payment and amortization schedule | rrstudio tools',
  'seo.mutuo.desc':
    'Calculate the payment of a mortgage with French amortization from principal, nominal rate and term, the total interest and the full schedule, downloadable as CSV.',

  'tool.nl.title': 'Numbers in words (Italian)',
  'tool.nl.desc':
    'Write a number out in correct Italian, with decimals and negatives, up to billions. Cheque mode with the cents as digits.',
  'seo.nl.title': 'Numbers in Italian words, cheque amounts | rrstudio tools',
  'seo.nl.desc':
    'Convert a number to correct Italian words (ventuno, centottanta, ventitré, milleuno), with decimals, negatives and cheque amounts such as "cento/50".',

  'tool.pct.title': 'Percentage calculator',
  'tool.pct.desc':
    'X% of Y, what percentage it is, percentage change between two values, discount or markup and reverse percentage: five calculations on one page.',
  'seo.pct.title': 'Online percentage calculator | rrstudio tools',
  'seo.pct.desc':
    'Calculate the percentage of a number, the percentage change between two values, a discount or markup and the value before a discount. Instant results, in your browser.',

  'tool.uc.title': 'Unit converter',
  'tool.uc.desc':
    'Length, mass, temperature, area, volume, speed, time, digital data, pressure and energy, with unit search and a table of all conversions.',
  'seo.uc.title': 'Online unit converter | rrstudio tools',
  'seo.uc.desc':
    'Convert lengths, weights, temperatures, areas, volumes, speeds, times, bytes (KB and KiB), pressures and energies. Search for a unit and see every conversion together.',

  'tool.dc.title': 'Date and age calculator',
  'tool.dc.desc':
    'Difference between two dates in years, months and days, add or subtract days, weeks, months and years, work out an exact age and the days to the next birthday.',
  'seo.dc.title': 'Date difference, age and days calculator | rrstudio tools',
  'seo.dc.desc':
    'Calculate the difference between two dates, add or subtract days, months and years, and find an exact age and days to a birthday. Handles month ends and leap years.',

  'tool.tz.title': 'Time zone converter',
  'tool.tz.desc':
    'Convert a time between IANA time zones worldwide and compare several at once, with daylight saving and search by city. Uses only your browser.',
  'seo.tz.title': 'Time zone and daylight saving converter | rrstudio tools',
  'seo.tz.desc':
    'Convert a time between time zones (Rome, New York, Tokyo and all the others) and compare several cities at once, with daylight saving handled. Nothing is sent anywhere.',

  'tool.nb.title': 'Number base converter',
  'tool.nb.desc':
    'Binary, octal, decimal, hexadecimal and bases 2 to 36 with BigInt, two\'s complement, bit view and IEEE-754 float32 and float64 encoding.',
  'seo.nb.title': 'Binary, hex and IEEE-754 converter | rrstudio tools',
  'seo.nb.desc':
    'Convert numbers between binary, octal, decimal, hexadecimal and bases 2-36, see the two\'s complement at 8, 16, 32 and 64 bits and decode or encode float32 and float64.',

  'tool.pws.title': 'Password strength checker',
  'tool.pws.desc':
    'See how strong a password is: score, time to guess it, entropy and suggestions. No online check.',
  'seo.pws.title': 'Online password strength checker | rrstudio tools',
  'seo.pws.desc':
    'Rate a password with zxcvbn: a 0 to 4 score, time to crack in several scenarios, entropy and advice. Everything in the browser, with no online lookups.',

  'tool.totp.title': 'TOTP generator (2FA)',
  'tool.totp.desc':
    'Generate the time-based two-factor codes from a Base32 secret or an otpauth URI, verify them and create the QR.',
  'seo.totp.title': 'Online TOTP 2FA code generator | rrstudio tools',
  'seo.totp.desc':
    'Generate and verify TOTP codes (RFC 6238) with SHA-1, SHA-256 or SHA-512, a countdown and an otpauth QR. Everything in the browser.',

  'tool.hmac.title': 'HMAC generator',
  'tool.hmac.desc':
    'Compute the HMAC of a text or file with a key (SHA-1, SHA-256, SHA-384, SHA-512) and verify an expected signature in constant time.',
  'seo.hmac.title': 'Online HMAC generator (SHA-256, SHA-512) | rrstudio tools',
  'seo.hmac.desc':
    'Compute and verify HMACs with SHA-1, SHA-256, SHA-384 or SHA-512 from text or a file, with a text, hex or Base64 key. All in the browser, nothing is sent.',

  'tool.ssh.title': 'SSH key generator',
  'tool.ssh.desc':
    'Generate Ed25519 or RSA SSH key pairs in the browser: public key for authorized_keys, private key in OpenSSH or PKCS#8 format and SHA256 fingerprint.',
  'seo.ssh.title': 'Online SSH key generator (Ed25519, RSA) | rrstudio tools',
  'seo.ssh.desc':
    'Create Ed25519 or RSA 2048, 3072, 4096 SSH keys with WebCrypto: OpenSSH format, PKCS#8 and ssh-keygen style fingerprint. Keys never leave the browser.',

  'tool.csr.title': 'CSR generator',
  'tool.csr.desc':
    'Create a certificate signing request (CSR) with subject and SANs, with a new RSA or ECDSA key or an existing one, and check it.',
  'seo.csr.title': 'CSR generator (certificate signing request) | rrstudio tools',
  'seo.csr.desc':
    'Generate a PKCS#10 CSR with common name, organization and SANs (DNS and IP), RSA or ECDSA key and PEM private key. All in the browser, with a check of the request.',

  'tool.sss.title': 'Shamir secret sharing',
  'tool.sss.desc':
    'Split a secret into N shares with threshold K (Shamir over GF(256)) and rebuild it by pasting K shares. Hex or Base64 shares, to download or print.',
  'seo.sss.title': 'Split a secret with Shamir online | rrstudio tools',
  'seo.sss.desc':
    'Shamir secret sharing: split a password or recovery phrase into N shares, any K rebuild it. All in the browser.',

  'tool.fenc.title': 'Encrypt and decrypt files',
  'tool.fenc.desc':
    'Encrypt files and text with a passphrase (AES-256-GCM, PBKDF2) and decrypt them when needed. Everything in the browser.',
  'seo.fenc.title': 'Encrypt and decrypt files with a password online | rrstudio tools',
  'seo.fenc.desc':
    'Protect files and text with AES-256-GCM and a passphrase (PBKDF2-SHA256, 600,000 iterations). Documented format, everything in the browser, no upload.',

  'tool.bc.title': 'Barcode generator',
  'tool.bc.desc':
    'EAN-13, EAN-8, UPC-A, Code 128, Code 39, ITF-14 and more, with check digit; download SVG or PNG, or create many codes in a ZIP.',
  'seo.bc.title': 'EAN, UPC and Code 128 barcode generator | rrstudio tools',
  'seo.bc.desc':
    'Create EAN-13, EAN-8, UPC-A, Code 128, Code 39 and ITF-14 barcodes with the check digit computed, download SVG or PNG and generate a ZIP in bulk.',

  'tool.qrr.title': 'QR code reader',
  'tool.qrr.desc':
    'Read a QR from an image or with the camera and see what it contains (link, Wi-Fi, contact…) without opening anything.',
  'seo.qrr.title': 'Online QR code reader from image and camera | rrstudio tools',
  'seo.qrr.desc':
    'Read a QR code from an image or the camera: it recognises addresses, Wi-Fi, vCards and text and shows them safely, with warnings about suspicious links.',

  'tool.sl.title': 'Sort lines',
  'tool.sl.desc':
    'Sort a list alphabetically, naturally or by length; remove duplicates and blank lines, count occurrences and number lines.',
  'seo.sl.title': 'Sort text lines and remove duplicates online | rrstudio tools',
  'seo.sl.desc':
    'Sort lines alphabetically (Italian and English), naturally, by length or randomly; remove duplicates and blank lines, count occurrences, add a prefix and numbering.',

  'tool.fr.title': 'Find and replace',
  'tool.fr.desc':
    'Search and replace in text with plain text or regex, several rules in sequence and a preview of the matches.',
  'seo.fr.title': 'Online find and replace with regex | rrstudio tools',
  'seo.fr.desc':
    'Find and replace in a text, in plain mode or with regex (flags and groups), with several rules in sequence, a highlighted preview and protection from slow regexes.',

  'tool.tts.title': 'Text to speech',
  'tool.tts.desc':
    'Have a text read aloud with the voices installed on your device: choose voice, speed and pitch. Local voices only.',
  'seo.tts.title': 'Online text to speech: read a text aloud | rrstudio tools',
  'seo.tts.desc':
    'Read a text aloud with the browser speech synthesis: voice, language, speed, pitch and volume. Local voices only: no text goes to external servers.',

  'tool.chmod.title': 'chmod calculator',
  'tool.chmod.desc':
    'Tick Unix permissions and get octal, symbolic form and the chmod command; apply expressions like u+x,go-w and pick from the most common permissions.',
  'seo.chmod.title': 'chmod calculator online: octal and symbolic | rrstudio tools',
  'seo.chmod.desc':
    'Work out chmod permissions with r/w/x checkboxes for owner, group and others, plus setuid, setgid and sticky. Convert octal and symbolic and copy the command.',

  'tool.cssu.title': 'CSS unit converter',
  'tool.cssu.desc':
    'Convert px, rem, em, pt, %, vw, vh, cm, mm and inches with your own root font size and viewport; paste CSS to turn every px into rem.',
  'seo.cssu.title': 'px to rem and em converter for CSS | rrstudio tools',
  'seo.cssu.desc':
    'Convert px to rem, em, pt, vw and other CSS units, with a quick px-to-rem table and bulk conversion of a whole stylesheet. Everything in your browser.',

  'tool.cssg.title': 'CSS generator: gradients and shadows',
  'tool.cssg.desc':
    'Build linear, radial and conic gradients or multi-layer box-shadows, with a live preview and ready-to-copy CSS code.',
  'seo.cssg.title': 'CSS gradient and box-shadow generator online | rrstudio tools',
  'seo.cssg.desc':
    'Create linear-gradient, radial-gradient, conic-gradient and box-shadow with live preview, draggable stops, opacity and multiple shadows. Copy the CSS.',

  'tool.svgo.title': 'SVG optimizer',
  'tool.svgo.desc':
    'Shrink SVG files with SVGO: choose precision, metadata and comments, compare before and after, side-by-side preview and a ZIP for many files.',
  'seo.svgo.title': 'Online SVG optimizer with SVGO | rrstudio tools',
  'seo.svgo.desc':
    'Compress and optimize SVG files in your browser with SVGO: several files at once, size comparison, safe preview and ZIP download. Nothing is uploaded.',

  'tool.fav.title': 'Favicon generator',
  'tool.fav.desc':
    'From an image or from a letter or emoji, get favicon.ico, PNGs at 16, 32, 180, 192 and 512, site.webmanifest and the HTML lines, in a single ZIP.',
  'seo.fav.title': 'Online favicon generator: ICO, PNG and manifest | rrstudio tools',
  'seo.fav.desc':
    'Create favicon.ico, apple-touch-icon, Android icons and site.webmanifest from a PNG, JPG or SVG image, or from text and emoji. All in your browser, download a ZIP.',

  'tool.ht.title': '.htpasswd generator',
  'tool.ht.desc':
    'Generate .htpasswd lines with bcrypt, APR1-MD5 or SHA1 for several users, and check whether an existing line matches a password.',
  'seo.ht.title': 'Online .htpasswd generator: bcrypt, APR1, SHA1 | rrstudio tools',
  'seo.ht.desc':
    'Create the .htpasswd file for Apache and Nginx with bcrypt ($2y$), APR1-MD5 or SHA1 and check an existing line. The calculation runs in your browser, passwords stay here.',

  'tool.cert.title': 'Certificate decoder',
  'tool.cert.desc':
    'Read X.509 certificates and CSRs in PEM or DER: subject, issuer, expiry, SANs, key usages, SHA-1 and SHA-256 fingerprints, chains included.',
  'seo.cert.title': 'Online SSL/TLS certificate and CSR decoder | rrstudio tools',
  'seo.cert.desc':
    'Paste a PEM certificate or a CSR and read subject, issuer, days to expiry, SANs, algorithm, key size and fingerprints. All in your browser.',

  'seo.privacy.title': 'Privacy notice | rrstudio tools',
  'seo.privacy.desc':
    'How rrstudio tools handles data: the tools run in your browser, no cookies or tracking, hosted on Cloudflare.',
  'seo.tutorial.title': 'Tutorial: things worth knowing | rrstudio tools',
  'seo.tutorial.desc':
    'What to know before using the site: data that can\'t be recovered, Ctrl+K search, favorites, tool chains, offline use and special cases in the PDF tools.',
  // preferiti e menu personalizzati
  'fav.menu': 'Favorites',
  'fav.menu.label': 'Favorites menu',
  'fav.add': 'Add to favorites',
  'fav.menu.empty': 'You have no favorites yet. Tap the star next to a tool to add it.',
  'fav.menu.favs': 'Your favorites',
  'fav.menu.manage': 'Manage favorites and menus',
  'fav.home.title': 'Your favorites',
  'fav.home.manage': 'Manage',
  'fav.home.desc': 'Saved on this device only.',
  'fav.home.group': 'Your custom menu.',
  'fav.page.title': 'Favorites and custom menus',
  'fav.page.lead': 'Save the tools you use most and group them into your own menus. The data stays in this browser and is never sent to anyone.',
  'fav.nostorage': 'This browser does not allow saving data: changes last only while the page stays open.',
  'fav.hidden': 'Some Italian-only tools ({n}) are hidden in this version, but they stay saved.',
  'fav.loading': 'Loading…',
  'fav.list.title': 'Favorites',
  'fav.list.empty': 'No favorites. Use the star on a tool or add one below.',
  'fav.groups.title': 'Custom menus',
  'fav.groups.empty': 'No custom menus. Create one to group your tools.',
  'fav.group.new.label': 'Name of the new menu',
  'fav.group.new.ph': 'E.g. Work, Development…',
  'fav.group.create': 'Create menu',
  'fav.group.limit': 'You have reached the maximum of {max} menus.',
  'fav.group.rename': 'Rename',
  'fav.group.rename.label': 'New name for the menu «{name}»',
  'fav.group.save': 'Save',
  'fav.cancel': 'Cancel',
  'fav.group.delete': 'Delete menu',
  'fav.confirm.delete': 'Delete the menu «{name}»?',
  'fav.delete': 'Delete',
  'fav.group.up': 'Move the menu «{name}» up',
  'fav.group.down': 'Move the menu «{name}» down',
  'fav.item.up': 'Move «{name}» up',
  'fav.item.down': 'Move «{name}» down',
  'fav.item.remove': 'Remove «{name}»',
  'fav.drag': 'Drag to reorder',
  'fav.empty.group': 'No tools in this menu.',
  'fav.add.tools': 'Add tools',
  'fav.add.close': 'Close search',
  'fav.add.search': 'Search for a tool to add',
  'fav.add.ph': 'Search…',
  'fav.add.btn': 'Add',
  'fav.add.aria': 'Add «{name}»',
  'fav.add.none': 'No tools found.',
  'fav.add.more': 'Showing the first {n} results: refine your search.',
  'fav.added': '«{name}» added.',
  'fav.removed': '«{name}» removed.',
  'fav.moved': '«{name}»: position {pos} of {total}.',
  'fav.data.title': 'Export, import and share',
  'fav.export': 'Export JSON',
  'fav.import': 'Import JSON',
  'fav.share': 'Create share link',
  'fav.share.label': 'Share link',
  'fav.share.note': 'The data is inside the link, after the # symbol: it stays in the browser and is never sent to the server. Whoever opens the link must confirm before anything is imported.',
  'fav.recent.label': 'Remember the last tools opened from search (Ctrl/⌘+K)',
  'fav.recent.note': 'When off, search saves nothing. When on, it saves in the browser only the internal names of the last 5 tools opened from search; turning it off deletes them.',
  'fav.share.empty': 'There is nothing to share.',
  'fav.import.title': 'Import this data?',
  'fav.import.from.link': 'You opened a share link.',
  'fav.import.from.file': 'From the file «{name}».',
  'fav.import.favs': 'Favorites ({n})',
  'fav.import.groups': 'Menus ({n})',
  'fav.import.none': 'none',
  'fav.import.dropped': '{n} invalid or unknown items were ignored.',
  'fav.import.trimmed': 'Some data was trimmed to respect the limits.',
  'fav.import.mode': 'How to import',
  'fav.import.merge': 'Merge with the existing ones',
  'fav.import.replace': 'Replace the existing ones',
  'fav.import.go': 'Import',
  'fav.imported': 'Import completed.',
  'fav.err.empty': 'The file or link is empty.',
  'fav.err.tooBig': 'The data is too large to import.',
  'fav.err.encoding': 'The link is not valid: the data is incomplete or damaged.',
  'fav.err.json': 'The content is not valid JSON.',
  'fav.err.shape': 'Unrecognised format: it does not look like an rrstudio tools export.',
  'fav.err.nothing': 'There are no valid favorites or menus to import.',
  'fav.err.read': 'The file could not be read.',
  'fav.clear': 'Delete favorites and menus',
  'fav.clear.confirm': 'Delete all favorites and custom menus from this browser? This cannot be undone.',
  'fav.clear.yes': 'Yes, delete everything',
  'fav.cleared': 'Favorites and menus deleted.',
  'seo.favorites.title': 'Favorites and custom menus | rrstudio tools',
  'seo.favorites.desc': 'Your favorite tools and custom menus, saved in this browser only.',

  'tool.curl.title': 'cURL converter',
  'tool.curl.desc': 'Turn a curl command, including one copied from Chrome or Firefox, into JavaScript, Python, PHP or Go code, with warnings about what does not translate.',
  'seo.curl.title': 'Convert cURL to fetch, axios, Python, PHP, Go | rrstudio tools',
  'seo.curl.desc': 'Paste a curl command (including Chrome and Firefox "Copy as cURL") and get code for fetch, axios, Python, PHP and Go. All in the browser, nothing is run.',
  'tool.urlp.title': 'URL parser',
  'tool.urlp.desc': 'Split a URL into protocol, host, domain, port, path, parameters and fragment; edit the parameters and strip tracking ones.',
  'seo.urlp.title': 'URL parser: parameters, domain and tracking | rrstudio tools',
  'seo.urlp.desc': 'Parse a URL: protocol, host, port, path, query and fragment, with percent-encoding and punycode decoded. Remove utm_*, fbclid and gclid from the parameters.',
  'tool.ci.title': 'Compound interest calculator',
  'tool.ci.desc': 'Work out the balance of a sum with compound interest and regular deposits: interest, real value after inflation, a year-by-year table and a chart.',
  'seo.ci.title': 'Compound interest calculator with deposits | rrstudio tools',
  'seo.ci.desc': 'Calculate compound interest: initial amount, monthly or yearly deposits, rate and term. Final balance, interest, real value after inflation, table and chart.',
  'tool.stat.title': 'Statistics calculator',
  'tool.stat.desc': 'Paste numbers or a CSV column: mean, median, mode, variance, standard deviation, quartiles, percentiles, outliers and a histogram.',
  'seo.stat.title': 'Statistics calculator: mean, median, deviation | rrstudio tools',
  'seo.stat.desc': 'Work out mean, median, mode, variance and standard deviation, quartiles, percentiles, outliers and a histogram from pasted numbers or a CSV column.',

  'tool.ar.title': 'Aspect ratio calculator',
  'tool.ar.desc': 'Find the ratio from width and height, work out the missing side, resize proportionally and copy the CSS aspect-ratio.',
  'seo.ar.title': 'Aspect ratio calculator: 16:9, 4:3, resize | rrstudio tools',
  'seo.ar.desc': 'Calculate the aspect ratio (16:9, 4:3, 21:9, A4…) from width and height, find the missing side, resize proportionally and copy the CSS aspect-ratio.',

  'tool.rom.title': 'Roman numerals converter',
  'tool.rom.desc': 'Convert numbers to Roman numerals and back, from 1 to 3,999 (or up to 3,999,999 with the overline), with a check of the canonical form.',
  'seo.rom.title': 'Roman numerals converter, both directions | rrstudio tools',
  'seo.rom.desc': 'Convert a number to Roman numerals and back. It checks the canonical form and explains mistakes (IIII, VX, IC), with quick years and the vinculum up to 3,999,999.',
  'tool.tm.title': 'Timer and stopwatch',
  'tool.tm.desc': 'Countdown timer, stopwatch with laps and Pomodoro with a sound alert. Time stays exact even with the tab in the background.',
  'seo.tm.title': 'Online timer, stopwatch and Pomodoro | rrstudio tools',
  'seo.tm.desc': 'Free countdown timer, stopwatch with laps and Pomodoro timer with a sound alert. They run in your browser and time stays exact even in the background.',
  'tool.sci.title': 'Scientific calculator',
  'tool.sci.desc': 'Expressions with brackets, powers, percentages, factorial, logarithms and trigonometry in degrees or radians, with history and a result as you type.',
  'seo.sci.title': 'Online scientific calculator with trigonometry | rrstudio tools',
  'seo.sci.desc': 'Free scientific calculator: brackets, powers, roots, logarithms, factorial, percentages and trigonometry in degrees or radians, with history and a live result.',
  'tool.rnd.title': 'Random numbers, dice and draws',
  'tool.rnd.desc': 'Random numbers in a range, dice with 2d6+3 notation, draws from a list of names, teams and heads or tails, using the browser\'s secure generator.',
  'seo.rnd.title': 'Random number generator, dice and name picker | rrstudio tools',
  'seo.rnd.desc': 'Generate random numbers, roll dice (2d6+3), draw names from a list, make balanced teams and flip a coin. Secure browser randomness, all on your device.',
  'tool.pbl.title': 'Remove blank pages',
  'tool.pbl.desc': 'Find the blank pages of a PDF, scans included, check them as thumbnails and download the file without them.',
  'seo.pbl.title': 'Remove blank pages from a PDF online | rrstudio tools',
  'seo.pbl.desc': 'Detect and delete blank pages from a PDF or scan: adjustable threshold, margin and noise filter, thumbnails to confirm. Runs in your browser, no upload.',
  'tool.pin.title': 'PDF inspector',
  'tool.pin.desc': 'Look inside a PDF: version, pages and sizes, fonts, encryption and permissions, metadata, annotations, forms and attachments. JSON report.',
  'seo.pin.title': 'PDF inspector: fonts, encryption, metadata | rrstudio tools',
  'seo.pin.desc': 'Inspect a PDF in your browser: version, page sizes, embedded fonts, encryption and permissions, metadata, annotations and attachments. JSON report.',
  'tool.pnu.title': 'PDF pages per sheet and booklet',
  'tool.pnu.desc': 'Put 2, 4, 6 or 9 pages of a PDF on each A4 or Letter sheet, or prepare a booklet to print double-sided and fold in half.',
  'seo.pnu.title': 'PDF N-up and booklet: pages per sheet | rrstudio tools',
  'seo.pnu.desc': 'Print a PDF with 2, 4, 6 or 9 pages per A4 or Letter sheet, or make a double-sided booklet to fold in half. With preview, in your browser and free.',
  'tool.psp.title': 'Split double pages',
  'tool.psp.desc': 'Splits each double page of a PDF into two single pages, in half or with an adjustable cut line, left to right or reversed.',
  'seo.psp.title': 'Split double-page PDF spreads | rrstudio tools',
  'seo.psp.desc': 'Split the double pages of a PDF into two single pages: in half or with an adjustable cut line, even right to left. Preview included, in your browser, no upload.',
  'tool.pil.title': 'Merge front and back scans',
  'tool.pil.desc': 'Merges the fronts PDF and the backs PDF into one with alternating pages, even with the backs in reverse order.',
  'seo.pil.title': 'Merge front and back scans into one PDF | rrstudio tools',
  'seo.pil.desc': 'Merge the fronts PDF and the backs PDF into one PDF with alternating pages, even with reversed backs. Preview included, in your browser, no upload.',
  'tool.utm.title': 'UTM link builder',
  'tool.utm.desc': 'Build links with UTM parameters for Google Analytics: one source at a time or many at once, with warnings about case and spaces and a .csv file.',
  'seo.utm.title': 'UTM Link Builder for Google Analytics | rrstudio tools',
  'seo.utm.desc': 'Build UTM links for campaigns and newsletters: properly encoded parameters, warnings on case and spaces, many sources at once and .csv download. Free, in your browser.',
  'tool.trip.title': 'Trip cost calculator',
  'tool.trip.desc': 'Work out what a car trip costs, your average fuel consumption from a fill-up and how far a budget will take you. Km or miles, l/100 km, km/l or mpg.',
  'seo.trip.title': 'Trip Cost and Fuel Consumption Calculator | rrstudio tools',
  'seo.trip.desc': 'Calculate car trip cost, average consumption (l/100 km, km/l, mpg), CO2 emissions and range for a budget. Free, in your browser, no data sent.',
  'tool.lco.title': 'List ↔ line',
  'tool.lco.desc': 'Turn a list into a single line with separators and quotes (SQL IN, JSON array, CSV, URL, shell) and a line back into a list, with correct escaping.',
  'seo.lco.title': 'List to line and line to list: SQL IN, JSON, CSV | rrstudio tools',
  'seo.lco.desc': 'Convert a list (one item per line) into one line with separator, quotes and prefix: SQL values for IN, JSON or JavaScript arrays, CSV, URL. And back again.',
  'tool.ext.title': 'Text extractor',
  'tool.ext.desc': 'Paste a text and get the list of emails, links, IPs, dates, phone numbers, IBANs, hashtags and more, with counts, without duplicates and ready to copy.',
  'seo.ext.title': 'Extract emails, links, IPs and IBANs from text | rrstudio tools',
  'seo.ext.desc': 'Extract emails, URLs, IP addresses, dates, phone numbers, IBANs, hashtags and euro amounts from text: deduplicated, sorted, copy or download as .txt or .csv.',
  'tool.tbin.title': 'Text ↔ hex, binary, decimal',
  'tool.tbin.desc': 'Converts text to its bytes (UTF-8, UTF-16, Latin-1, Windows-1252, ASCII) as hex, binary, decimal, octal or Base64, and back, with precise decoding errors.',
  'seo.tbin.title': 'Text to hex, binary and decimal (UTF-8, UTF-16) | rrstudio tools',
  'seo.tbin.desc': 'Convert text to bytes (hex, binary, decimal, octal, Base64) and back with UTF-8, UTF-16, Latin-1, Windows-1252. Hex dump, all in your browser.',
  'tool.esc.title': 'String escape and unescape',
  'tool.esc.desc': 'Protect the special characters of a text for JSON, JavaScript, Python, regex, shell, SQL, CSV, Java and PHP, or turn a string back to plain text with precise errors.',
  'seo.esc.title': 'String escape and unescape: JSON, JS, Python | rrstudio tools',
  'seo.esc.desc': 'Online string escape and unescape for JSON, JavaScript, Python, regex, shell, SQL, CSV, Java and PHP: emoji, \\u sequences, exact errors. In your browser.',
  'tool.zip.title': 'ZIP: create and extract',
  'tool.zip.desc': 'Compress several files or a folder into a ZIP, or open a ZIP and download only the files you need. In your browser, with zip bomb protection.',
  'seo.zip.title': 'Create and extract ZIP files online | rrstudio tools',
  'seo.zip.desc': 'Create a ZIP archive from files and folders or open a ZIP and download single files. Free, in your browser, nothing uploaded, with safety checks.',
  'tool.red.title': 'Redact parts of an image',
  'tool.red.desc': 'Cover faces, plates and data in screenshots with a solid box, pixelation or blur. All in your browser, no metadata kept.',
  'seo.red.title': 'Redact faces and data in an image online | rrstudio tools',
  'seo.red.desc': 'Hide faces, number plates and sensitive data in photos and screenshots with a solid box, pixelation or blur. Free, in your browser, nothing uploaded.',
  'tool.bill.title': 'Split the bill',
  'tool.bill.desc': 'Split the bill equally with tip and rounding, or by consumption with shared costs and a proportional tip. The shares always add up to the cent.',
  'seo.bill.title': 'Split the bill: equally or by consumption | rrstudio tools',
  'seo.bill.desc': 'Split a restaurant bill equally or by what each person ordered: tip, cover charge, share rounding. The shares always add up to the exact total.',
  'tool.cdt.title': 'Countdown to a date',
  'tool.cdt.desc': 'How long until a date: live days, hours, minutes and seconds, with weeks, working days, time zones and shortcuts for Christmas, Easter and other holidays.',
  'seo.cdt.title': 'Countdown to a date: days left | rrstudio tools',
  'seo.cdt.desc': 'Online countdown to a date: days, hours, minutes and seconds, weeks and working days, time zones, Easter and Christmas. Download the event as .ics.',
  'tool.lcmp.title': 'List compare',
  'tool.lcmp.desc': 'Compare two lists, one item per line: union, items in common, only in one or the other, and duplicates, with counts.',
  'seo.lcmp.title': 'Compare two lists: in common, differences | rrstudio tools',
  'seo.lcmp.desc': 'Compare two text lists, one item per line: union, intersection, only in A, only in B and duplicates, ignoring case and spaces if you like. Runs in your browser.',
  'tool.tcl.title': 'Text cleaner',
  'tool.tcl.desc': 'Tidy text copied from PDFs, emails or Word: broken lines, double spaces, smart quotes, invisible characters and HTML tags.',
  'seo.tcl.title': 'Text cleaner: line breaks, spaces, invisibles | rrstudio tools',
  'seo.tcl.desc': 'Clean text copied from PDFs, emails or Word: join broken lines, remove double spaces, smart quotes, invisible characters and HTML tags. Runs in your browser.',

  'tool.uni.title': 'Unicode inspector',
  'tool.uni.desc': 'See every character with code point, category, UTF-8 and UTF-16 bytes, HTML entity and escapes; find invisibles, homoglyphs and mixed scripts.',
  'seo.uni.title': 'Unicode inspector: invisibles, homoglyphs, UTF-8 | rrstudio tools',
  'seo.uni.desc': 'Analyse a text character by character: code point, category, UTF-8/UTF-16, HTML entity and escapes. Removes invisible characters, flags homoglyphs and normalises.',

  'tool.morse.title': 'Morse code translator',
  'tool.morse.desc': 'Translate text to Morse code and back, hear it with Web Audio or watch it flash, with adjustable speed and pitch.',
  'seo.morse.title': 'Morse code translator: text, audio and flash | rrstudio tools',
  'seo.morse.desc': 'Translate text to Morse code and back, with numbers, punctuation and accented letters. Play the audio (adjustable speed and pitch) and choose the symbols.',

  'tool.cph.title': 'Classic ciphers',
  'tool.cph.desc': 'ROT13, ROT47, Caesar, Atbash and Vigenère to encrypt and decrypt, with Caesar brute force. For fun and study, not secure.',
  'seo.cph.title': 'Classic ciphers: ROT13, Caesar, Atbash, Vigenère | rrstudio tools',
  'seo.cph.desc': 'Encrypt and decrypt with ROT13, ROT47, Caesar (all 25 shifts by brute force), Atbash and Vigenère. Historical ciphers that are not secure, for fun and learning.',

  'tool.lire.title': 'Convertitore lire euro',
  'tool.lire.desc': 'Converti lire in euro e euro in lire con il cambio fisso 1 € = 1936,27 lire, con arrotondamento e tabella dei tagli storici.',
  'seo.lire.title': 'Convertitore lire euro: cambio 1936,27 | rrstudio tools',
  'seo.lire.desc': 'Converti lire in euro e euro in lire con il cambio irrevocabile 1 euro = 1936,27 lire (Reg. CE 2866/98), con la tabella dei tagli storici di banconote e monete.',

  'tool.subnet.title': 'IP subnet calculator (CIDR)',
  'tool.subnet.desc': 'Work out network, broadcast, hosts, mask and wildcard for IPv4 and IPv6, split into subnets with VLSM and check whether an address belongs to a network.',
  'seo.subnet.title': 'IP subnet calculator (CIDR): IPv4, IPv6, VLSM | rrstudio tools',
  'seo.subnet.desc': 'IPv4 and IPv6 subnet calculator with CIDR notation: network, broadcast, first and last host, mask, wildcard, subnets (VLSM) and membership check. In your browser.',

  'tool.docker.title': 'docker run to docker-compose',
  'tool.docker.desc': 'Paste one or more docker run commands and get a docker-compose.yml with services, volumes and networks, with warnings for options that cannot be translated.',
  'seo.docker.title': 'docker run to docker-compose converter online | rrstudio tools',
  'seo.docker.desc': 'Convert docker run commands into a docker-compose.yml: ports, volumes, networks, healthchecks and limits. Several commands become several services. In your browser.',

  'tool.clamp.title': 'CSS clamp() fluid typography generator',
  'tool.clamp.desc': 'Generate the CSS clamp() for text that scales fluidly between two viewports, with a preview, a type scale as CSS variables and a WCAG 1.4.4 check.',
  'seo.clamp.title': 'CSS clamp() fluid typography generator | rrstudio tools',
  'seo.clamp.desc': 'Compute the CSS clamp() for fluid typography in rem between two viewports, with a type scale as CSS variables, a slider preview and a WCAG 1.4.4 warning.',

  'tool.time.title': 'Time calculator (hours and minutes)',
  'tool.time.desc': 'Add and subtract durations (1:30, 1h 30m, 90m), fill in a timesheet with breaks and overtime, convert decimal hours and hours:minutes and work out the amount from an hourly rate.',
  'seo.time.title': 'Time calculator: add durations and timesheet | rrstudio tools',
  'seo.time.desc': 'Hours and minutes calculator: add and subtract durations, timesheet with breaks, night shifts and overtime, decimal hours and amount from an hourly rate.',

  'tool.scad.title': 'Calcolo scadenze fatture',
  'tool.scad.desc': 'Calcola le scadenze di pagamento: 30, 60, 90 o 120 giorni, data fattura o fine mese (D.F.F.M.), rate multiple, spostamento al giorno lavorativo ed esportazione CSV e .ics.',
  'seo.scad.title': 'Scadenze fatture: D.F.F.M. e giorni lavorativi | rrstudio tools',
  'seo.scad.desc': 'Calcola le scadenze di pagamento di una fattura: 30, 60, 90, 120 giorni o personalizzati, D.F.F.M., rate, primo giorno lavorativo ed esportazione in CSV e .ics.',
  'tool.gcf.title': 'Generatore codice fiscale e partita IVA',
  'tool.gcf.desc': 'Genera codici fiscali e partite IVA di prova, validi ma inventati: filtri per sesso, data e comune di nascita, omocodia, ufficio provinciale, seme ripetibile, copia singola, CSV e JSON.',
  'seo.gcf.title': 'Codice fiscale e partita IVA casuali di prova | rrstudio tools',
  'seo.gcf.desc': 'Genera codici fiscali casuali e partite IVA di prova, formalmente validi ma finti: sesso, data e comune di nascita, omocodia. Esporta in CSV e JSON. Solo per test.',
};
