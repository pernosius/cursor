# Print Counter

An offline order tracker for a UPS Store print counter. It replaces the store's old Microsoft Access database: jobs move
across a six-stage board, orders are priced with fees, discounts, 7% sales tax and untaxed postage, each job prints two
4×6 thermal labels, and quotes and invoices download as PDFs.

The app builds to **one self-contained HTML file** that runs from `file://` in Edge or Chrome with no internet, account
or install. Data lives in the browser's `localStorage` on that PC, with Back up / Restore to a `.json` file.

This is a rebuild of the version made in a Claude chat ("Print production tracking system for UPS Store"). It keeps that
version's behavior and its storage format, so orders already entered there survive when this file replaces it in the
same folder.

## Features

- **Board:** New order → Quoting → Pre-production → Production → Complete → Follow up. Drag and drop with Undo, dollar
  totals per column (and unpaid amounts in the done columns), filters (Due today, Overdue, Done not paid), search, and
  "waiting N days" notes.
- **Orders:** first and last name, company, phone, email, order date, due date, location, Paid / Tax exempt / Invoice
  order, multiple items from the price list or custom, rush / design / set up / additional fees, % and $ discounts,
  untaxed postage, notes. Returning customers autofill.
- **Detailed mode:** a full-width form laid out like the old Access order form (associate, ship-to, send out, artwork,
  production specs, finishing, numbering, deposit, sq ft / margin / price-lookup calculators).
- **Labels:** two separate 4×6 labels per print: the order label for the bag (PAID / NOT PAID / INVOICE, items,
  totals) and the store copy with "Picked up ___/___/___  By ___" lines. Text auto-fits large orders.
- **Quote and invoice PDFs**, including "no tax" variants, generated offline with an embedded font.
- **Picked up / shipped** closes an order (asks about payment when needed) and files it under the customer.
- **Unclaimed:** jobs ready 30+ days leave the board and get their own list with contact logging.
- **Customers:** order history grouped by phone number, with reorder.
- **Price list, settings, dropdown lists**, CSV export, backup / restore with a weekly reminder.
- **Four designs** (Fluent, Counter, Ticket, Press), each in light and dark mode.

## Build and test

```bash
cd print-counter
npm install
npm run build   # → dist/Print-Counter.html, dist/Print Counter/, dist/Print-Counter-App.zip
npm test        # builds, then runs the acceptance checks in headless Chromium
```

The tests need Playwright with Chromium (`npm i -D playwright && npx playwright install chromium` if you don't already
have it) and `pdfinfo` / `pdftotext` from poppler. They cover the money math examples, legacy data, labels (exactly two
288 × 432 pt pages), PDFs, closing flows, unclaimed jobs, customers, backup round trips, all eight design/mode
combinations and the launcher zip, with every network request blocked. Screenshots and sample PDFs land in
`tests/output/`.

## Install on the store PC

Unzip `dist/Print-Counter-App.zip`, move the `Print Counter` folder somewhere permanent (like Documents), and
double-click **Set Up Print Counter.bat**. It creates Desktop and Start menu shortcuts that open the app in Edge's app
mode (its own window). `READ ME.txt` in that folder has the full steps, backup advice and label printer settings.

**To update:** Settings → Back up now, then replace `Print-Counter.html` in that folder with the new build.

## Layout

| Path | What it is |
|---|---|
| `src/index.html` | Page markup with build placeholders |
| `src/styles.css` | All styles: four designs × light/dark, labels, print rules |
| `src/app.js` | The app (vanilla JS, no framework) |
| `fonts/` | Libron subsets: `ui/*.woff2` for the page, `pdf/*.ttf` for PDFs (`scripts/subset-fonts.py` regenerates them) |
| `launcher/` | Windows setup script, `.bat`, icon and READ ME shipped next to the app |
| `scripts/build.mjs` | Inlines everything (including jsPDF 2.5.1 and jsPDF-AutoTable 3.8.2) into one file and zips the folder |
| `scripts/make-icon.mjs` | Renders the app icon and `.ico` |
| `tests/` | Acceptance checks and the sample backup generator |
| `reference/SPEC.md` | The full product spec written at the end of the original chat (its `reference/print-counter.html` is `reference/original-print-counter.html` here) |
| `reference/original-print-counter.html` | The original chat version, for comparison |
| `reference/sample-backup.json` | Six realistic orders; restore it from Settings to try the app |

## Differences from the original chat version

- Runs fully offline: jsPDF is inlined instead of loaded from a CDN, and the "save to your Claude account" sync was
  removed. Data is saved in this browser only, exactly like the downloadable version from the chat.
- Uses the Libron typeface (embedded) in the app, labels and PDFs, as the spec asks. Label money columns were
  widened to suit it.
- If the browser's storage is full, saving now shows "Storage is full" instead of failing silently.

## Open question

Should rush, design, set up and additional fees be taxed? They are now, as in the original; this was asked in the
chat and never answered (SPEC section 17).

## Credits

Libron by Nico Verbruggen, SIL Open Font License 1.1 (`fonts/OFL.txt`). jsPDF and jsPDF-AutoTable are MIT licensed.
