# Print Counter: full product specification

Print Counter is an order-tracking app for the print counter at a UPS Store (an independently owned franchise). It replaces an old in-house Microsoft Access database built by former employees. It tracks print jobs from intake to pickup, prices them (fees, discounts, 7% sales tax, untaxed postage), prints two 4×6 thermal labels per job, and produces quote and invoice PDFs.

This document describes the app exactly as it exists today, plus the decisions behind it. A working implementation is in `reference/print-counter.html`. Where this spec is silent, that file is the source of truth for behavior.

---

## 1. Context and hard constraints

| Topic | Requirement |
|---|---|
| Users | Counter staff at one store. One shared Windows 11 PC at the counter. No logins. |
| Runtime | Microsoft Edge (or Chrome) on Windows 11, opened from a local file (`file://`), usually in app mode (`--app=`). Must work **fully offline**. No network calls of any kind. |
| Delivery | One self-contained file, `Print-Counter.html`: all CSS, JS, fonts, icons and PDF libraries inlined. A build step is fine during development, but the shipped artifact is one HTML file. |
| Storage | Browser `localStorage` on that PC. Keys and data shape must stay compatible with the current version (section 4), so replacing the HTML file in the same folder keeps every existing order. |
| Printers | A standard thermal shipping-label printer (Zebra / Rollo / DYMO 4XL class), 4 × 6 in labels, printed through the browser print dialog. Quotes and invoices are letter-size PDFs. |
| Install | No admin rights assumed. No `.exe`, no Electron (rejected: size, unsigned-app warnings, separate data store). The "app" is a launcher that opens the HTML in Edge app mode (section 15). |
| Font | **Libron** (Regular, Bold, Italic, BoldItalic `.ttf`, supplied by the owner in `/fonts`). Embed as base64 `@font-face` and use it throughout the UI. Also embed it in the PDF library for quotes and invoices. Use it on labels too, but check legibility at 203 dpi; fall back to Arial on labels only if Libron renders poorly there. |
| Brand color | UPS Store teal **#009CBD** ("Pacific Blue"). Not required to look like UPS branding beyond that accent. |

---

## 2. Vocabulary and workflow

- **Order / job:** one customer request, numbered sequentially (`#1001`, `#1002`, …). Contains one or more **items** (line items).
- **Stages** (board columns, in order): `new` New order → `quoting` Quoting → `preprod` Pre-production → `production` Production → `complete` Complete → `followup` Follow up.
- **Done stages:** `complete` and `followup`. Jobs in these are finished and waiting for the customer.
- **Location:** where the finished job physically sits in the store (shelf, folder box, etc.).
- **Picked up / Shipped:** closing an order. Closed orders leave the board and live in the customer's history.
- **Unclaimed:** a done job that has sat for 30+ days (configurable). It leaves the board and goes to its own list.
- **Invoice order:** billed to the customer later instead of paid at pickup (charge accounts, businesses, schools).

Typical day: an employee creates an order, prices it, and prints labels. Label 1 goes on the bag so any employee can ring it up at the register. Label 2 (store copy) is kept in a stack. The job moves across the board as it's worked. When the customer picks it up, the employee writes the pickup date on label 2. Later someone goes through the stubs and marks each order picked up in the app (search the order number, press Enter, it opens).

---

## 3. Screens

Left rail navigation (or a top bar in some designs, see section 13): **Board**, **Customers**, **Unclaimed** (with red count badge), **Price list**, **Settings**. The bottom of the rail holds a light/dark toggle and a storage status indicator.

Top bar on every screen: page title, search box (Board, Customers, Unclaimed only), **Sq ft calculator** button, **New order** button (primary).

Keyboard: `N` opens a new order, `/` focuses search (both ignored while typing in a field or when a dialog or drawer is open). Typing an order number in search and pressing Enter opens that order (active or closed) and clears the search. Rapid digit keystrokes followed by Enter, anywhere outside a field, also open that order number. This supports a USB barcode scanner, though labels no longer carry barcodes.

### 3.1 Board

- Six columns, one per stage, in a horizontally scrolling row (min 248px each).
- **Column header:** colored dot, stage name, card count, and the **dollar total** of the orders in that column (`totals(o).total` summed). Hide the total when the column is empty. In Complete and Follow up, also show `($X unpaid)` in red, where X is the sum of `amountDue` for orders not paid. The New order column header has a `+` button.
- Totals and counts respect the active search and filter.
- **Filter pills** above the board, each with a count: **Active** (all), **Due today**, **Overdue** (red count when > 0), **Done, not paid** (in a done stage and not paid).
- **Unclaimed banner:** yellow bar above the board when any job is unclaimed: "N jobs have been ready 30+ days without pickup, $X unpaid." Includes a **View unclaimed** button.
- **Cards** are sorted by due date ascending (no due date last), then by created time. Each card shows:
  - top row: `#num`, **Paid** badge, **Invoice** badge, **Tax exempt** badge, and action icons (Print label; Mark picked up if in a done stage; Advance to next stage if there is one)
  - customer full name, then company under it (smaller)
  - item summary (2-line clamp): `qty × desc` joined with ", " (qty omitted when 1; sq-ft lines show the description only)
  - location tag (teal pill with pin icon) if the location is set and not a closing location
  - waiting note when the job has been in its current stage 2+ days: "Waiting on approval for N days" (quoting), "Ready for N days" (complete/follow up), otherwise "In <Stage> for N days". Yellow highlight at 5+ days.
  - footer: due chip and total. Due chip shows "Due today" (yellow), "Due tomorrow", "Due Fri, Oct 2", or "Overdue (Sep 24)" (red, only if not in a done stage), or "No due date".
- Clicking a card (or Enter when focused) opens the order drawer.
- **Drag and drop** cards between columns. Moving shows a toast "#1001 moved to Quoting" with **Undo**.
- Due chips refresh every minute.

### 3.2 Order drawer (create / edit)

Slides in from the right over a scrim. Header: "New order" or "Order #1001", subtitle "Created Sep 25, 2026" (plus ", picked up …" or ", waiting N days for pickup, last contacted …" when relevant), a **Simple | Detailed** segmented switch, a **Reorder** button (saved orders), and a close X. Esc closes. Closing with unsaved changes asks "Discard changes?".

The Simple/Detailed choice is remembered per PC (`pc_order_mode`). Switching never loses data; Simple just hides the extra fields.

#### Simple mode (narrow drawer, ~620px)
1. **Customer:** First name, Last name (side by side), Company (optional), Phone, Email. The first-name field has a datalist of known customers' full names. Choosing a suggestion splits it into first and last. When the full name matches a known customer, blank company, phone and email are filled from that customer's most recent order.
2. **Stage:** pill radio group of the six stages, each with its color dot.
3. **Order date** (defaults to today), **Due date** (date only, no time), **Location** dropdown. Then switches: **Paid**, **Tax exempt**, **Invoice order**.
4. **Items:** rows with: price-list dropdown + description text field | Qty (unit shown under it, plus a **Sq ft** link that opens the calculator for that row) | Unit price | line total | remove X. **+ Add item** adds a row. Picking a price-list item fills description, unit and price, then focuses qty.
5. **Fees, discounts & postage:** Rush fee, Design fee, Set up fee; Additional fee (type dropdown) + Amount; Discount (%), Discount ($), Postage (no tax). Hint: "Discounts come off the item subtotal. Fees are taxed; postage is not."
6. **Notes** (also print on labels, quotes and invoices).
7. **Quote & invoice:** **Quote PDF**, **Invoice PDF**, plus a line showing when each was last generated.
8. **Sticky footer:** live breakdown (section 5), then Delete (saved orders), Mark picked up (done stage) or Put back on board (closed orders), **Print label** (new order: **Save & print label**), and the primary button (**Create order** / **Save changes**).

#### Detailed mode (wide drawer, up to 1500px; mirrors the old Access form)
See `reference/screenshots/detailed-mode.png` and `reference/access-original/03-full-order-form.jpeg`. Three columns (collapse to one below ~1150px). Each section is a bordered box with a dark header bar.

**Left column**
- *Customer information:* Business, First name *, Last name, Number, Email.
- *Order information* (header shows "Order ID: #1001" or "New"): Order date, Due, Associate (initials; datalist from Settings plus initials used before), checkboxes **Ship to customer** (reveals Ship-to address textarea and Tracking #) and **Invoice order**, Order status (stage select), Location (select, tooltip "Where the order is located in the store"), read-only **Completed** (date it entered a done stage) and **Picked up** (close date, "(shipped)" if shipped).
- *Send out* (outsourced work): Vendor, Our cost, Shipping, Sent out on (date), Notes.
- *Notes* with a **Followed up** checkbox in the header.

**Middle column**
- *Product details* (applies to the current item). Header has an item navigator: ‹ "Item 1 of 2" › **+ Add item**, **Remove**. Fields: Product * (price-list select), Other (product not on the list), Description *, **Artwork** radios (Artwork on File / Modified Artwork on File / Designed Artwork / Customer Provided), **Promotion** checkbox + text (order level).
- *Production details:* Qty *, **Set of** checkbox + pieces per set, Finished size (datalist: 8.5x11, 8.5x14, 11x17, 5.5x8.5, 8.5x5.5, 4x6, 5x7, 4.25x5.5, 3.5x2, 12x18, 18x24, 24x36), Bleed checkbox, Color (datalist: 1/0, 1/1, 4/0, 4/1, 4/4), Paper (datalist from Settings → Paper types). Shows sq-ft math if the item came from the calculator.
- *Finishing*, four columns:
  - Standard: Cutting, Folding, Perforating, Hole Punch, Stapling, Scoring, Laminating, Round Corners
  - Wide format: Mounting, Grommets, H Stakes
  - Booklets / pads: binding select (None, Coil Binding, Comb Binding, Saddle Stitch, Tape Binding, Wire-O, Perfect Bound, Padding), Clear Front, Black Back, Blue Back, Chipboard, Other text
  - Numbering: Numbering checkbox, Start at, End at
  - Then an **Other finishing** text field.
- *Price calculators:* **Sq ft calc**, **Margin calc**, **Price lookup** (section 9).

**Right column**
- *Pricing details:* Price per piece (input) beside the read-only line amount; "All items" subtotal (only when 2+ items); Discount $; Discount %; Discounted total (read-only, green); dashed rule; Rush fee; Design fee; Set up fee; Additional fee + type select; dashed rule; Total (taxable, green); **Non taxed** checkbox beside "Tax 7%" and the tax amount; Postage (no tax); Order total (green); **Paid in full** checkbox beside **Deposit** input; **Amount due** (red tint, larger); **Charge copy acct** checkbox.
- *Order summary:* Quote, **Quote no tax**, Invoice, **Invoice no tax**, Order label, Shipping info (turns on Ship to customer and focuses the address).
- *Close order:* Duplicate (= Reorder), Reset order (revert to last saved, with confirm), New order, Close, Mark picked up / Put back on board, **Save and close** (primary, full width), Delete order (danger).

All read-only figures update live as you type.

#### Saving
Validation: a first or last name is required (error under the name field). At least one item is required. Every item needs a description, and quantity must be > 0. Blank rows (no description and no price) are dropped. A new order gets `num = max(settings.nextNum, highest existing num + 1)`, and `nextNum` advances. If the location is set to a closing location, run the close flow (section 3.4) as part of saving.

### 3.3 Reorder / Duplicate
Copies customer, items (including specs and sq-ft dims), notes, tax-exempt, invoice flag, fees and discounts into a **new unsaved** order dated today. Toast: "Copied order #1002. Check prices and the due date, then create it."

### 3.4 Closing an order (picked up / shipped)
Triggers: the card's pickup icon (done stages only), **Mark picked up** in the drawer, **Picked up** on the Unclaimed page, or saving with Location = "Picked Up By Customer" / "Shipped to Customer".
- If the order is not paid and not an invoice order, show a 3-button dialog: "#1001 isn't marked paid. $X is still showing as due. Did they pay?" with **Cancel** / **Picked up, not paid** / **Paid & picked up** (wording uses "shipped" for shipping).
- Then set `archived=true`, `pickedUp=true`, `closedAt=now`, `closeMethod='picked'|'shipped'`, remember `prevLocation`, and set `location` to the closing location.
- Toast "#1001 picked up" with **Undo**.
- **Put back on board** reverses this and restores `prevLocation`.
- The drawer refuses to mark picked up or put back while there are unsaved edits ("Save your changes first…").

### 3.5 Unclaimed
- A job is unclaimed when it isn't archived, is in a done stage, and `daysReady >= settings.unclaimedDays` (default 30). `daysReady` counts from `readyAt`, the moment it **first** entered a done stage. Moving between Complete and Follow up does not reset it. Moving back to an earlier stage clears `readyAt`, `lastContactAt` and `contactCount`.
- Unclaimed jobs are **removed from the board** and from board filter counts.
- Page: header "Ready 30+ days, not picked up" plus an explanation. Summary strip: Jobs waiting, Total value, Unpaid (red if > 0), Longest wait. Table sorted by longest wait: Waiting (yellow "41 days" pill, red at 2× the limit, "since Aug 16"), Order, Location, Customer (name, company, phone, email), Items, Total (Paid / red Unpaid), Last contact (date and "N times", or "Not yet"), actions **Log contact** (stamps date, increments count, Undo) and **Picked up**. Clicking a row opens the order.
- The nav badge shows the count (99+ cap).

### 3.6 Customers
- No separate customer table. Customers are **derived from orders** (active and archived). Grouping key: if the phone has 7+ digits, `'p' + last 10 digits`. Otherwise `'n' + lower(name) + '|' + lower(company)`. Display info comes from the most recent order, with blanks filled from older ones.
- Left list (alphabetical): name, company, "phone, N orders". Right detail: name, company, phone, email; **New order** (prefilled); stats: Orders, Total ordered, On the board, Unpaid (red, only if > 0).
- Order table, newest first: Order, Date (order date), Items, Total (+ red "Unpaid"), Status (stage dot + name, or "Picked up Sep 29" / "Shipped Sep 29"), actions: Reorder (all), Put back on board + Delete (closed only, Delete confirms). Clicking a row opens the order.
- Search filters customers whose orders match.

### 3.7 Price list
Editable table (Item, Unit, Price, remove) with inline editing saved on change, plus an add row (Item name, Unit e.g. each / sq ft / page, Price, **Add item**; Enter adds). Removing has Undo. Changes affect new picks only. Default items: B&W copies $0.15/page, Color copies $0.65/page, Banner $45/each, Invitations $2.50/each, Business cards (250) $35/box, Lamination $3/sheet, Binding $5/each.

### 3.8 Settings
1. **Appearance:** Theme (Match Windows / Light / Dark) and Design (four cards with mini previews: Fluent, Counter, Ticket, Press). Saved per PC in `pc_appearance`.
2. **Store:** Store name on labels (default "The UPS Store"), Sales tax rate % (default 7; applies to new orders only, since each order snapshots its rate), Next order number (so numbering can continue from the old Access system), Move to Unclaimed after (days, default 30).
3. **Dropdown lists:** chip editors (add via field + Enter/Add, remove via ×, with Undo) for:
   - Locations: ABC Folders, Back Shelf, Production Table, Wide Format Roll Box, Foamboard/Yard Sign
   - Additional fee types: Cutting, Folding, Hole Punching, Padding, Rounding Corners, Stapling, Stuffing/Stamping
   - Paper types: 20# Bond, 24# Bond, 28# Bond, 60# Text, 70# Text, 80# Text, 100# Text, 65# Cover, 80# Cover, 100# Cover, 110# Cover, 80# Gloss Text, 100# Gloss Cover, 2prt NCR, 3prt NCR, 4prt NCR, Label Stock, Vinyl, Coroplast, Foamboard
   - Associates (initials): empty by default
   
   Removing an entry never changes existing orders. The location dropdown always shows an order's current value even if it was removed from the list.
4. **Quotes & invoices:** Store address (multiline), Store phone, Store email, Quotes valid for (days, default 30), Invoice payment terms (default "Due on receipt"), Closing note (default "Thank you for your business!").
5. **Where your data is saved:** explanation, last backup date, **Back up now**, **Restore from backup**, **Export all orders (CSV)** (section 12).

### 3.9 Location dropdown values
`Not complete` (value `""`), then the Settings locations, then an optgroup **"Closes the order"** containing `Picked Up By Customer` and `Shipped to Customer`.

---

## 4. Data model and storage (keep compatible)

### 4.1 localStorage keys
| Key | Contents |
|---|---|
| `pc_state_v2` | `{ settings, orders }`: everything |
| `pc_appearance` | `{ theme: 'system'|'light'|'dark', look: 'fluent'|'counter'|'ticket'|'press' }` |
| `pc_order_mode` | `"simple"` or `"detailed"` (JSON string) |
| `pc_last_backup` | ISO timestamp of the last backup |
| `pc_items_v1` | legacy v1 price list. Migrate into settings.items on first run if `pc_state_v2` is absent |

Wrap every storage access in try/catch. On startup call `navigator.storage.persist()` when available.

### 4.2 Settings
```
storeName, taxRate (0.07), nextNum (1001), storeAddress, storePhone, storeEmail,
quoteDays (30), invoiceTerms, footerNote, unclaimedDays (30),
locations[], feeTypes[], papers[], associates[],
items[{ id, name, unit, price }]
```
Normalize on load: fill defaults, drop invalid entries, round prices to cents.

### 4.3 Order
```
id: 'ord-<random>'           num: 1001
customer: { first, last, name, company, phone, email }   // name = "first last" (kept for compatibility/search)
lines: [Line]
notes, orderDate 'YYYY-MM-DD', due 'YYYY-MM-DD' | ''
stage: 'new'|'quoting'|'preprod'|'production'|'complete'|'followup'
stageAt, readyAt, createdAt, updatedAt   (ISO)
location: string | ''        prevLocation
paid, invoice, taxExempt: bool
taxRate: number              // snapshot at creation
fees: { rush, design, setup, additional, additionalType }
discountPct, discountAmt, postage, deposit: number
associate, followedUp, chargeCopyAcct
ship: { on, address, tracking }
sendOut: { vendor, cost, shipping, sentOn, notes }
promo: { on, text }
quotedAt, invoicedAt, lastContactAt (ISO), contactCount
archived, pickedUp: bool     closedAt (ISO)     closeMethod: 'picked'|'shipped'
```
**Line:** `{ itemId, desc, unit, qty, price, dims?, spec? }`
- `dims` (from sq-ft calc): `{ w, h, u:'in'|'ft', copies, round }`
- `spec` (detailed mode): `{ other, artwork, setOf, setQty, size, bleed, color, paper, fin:{cutting,folding,perforating,holePunch,stapling,scoring,laminating,roundCorners,mounting,grommets,hStakes,clearFront,blackBack,blueBack,chipboard}, bookletType, bookletOther, numbering, numStart, numEnd, otherFinishing }`

**Legacy compatibility:**
- Orders with only `customer.name` are split on the first space when opened ("Maria de la Cruz" → "Maria" / "de la Cruz").
- Orders with a datetime `due` use just the date part.
- Missing `orderDate` falls back to the local date of `createdAt`.
- Missing `readyAt` on a done order falls back to `stageAt`, then `updatedAt`, then `createdAt`.

Every save writes the whole `pc_state_v2` object. Updates are optimistic: render first, then persist. Show a toast if saving fails ("Storage is full…" on quota errors).

---

## 5. Money math (must match exactly)

`r2(n)` rounds half-up to cents using `Math.round(Number(n + 'e2')) / 100` (avoids float errors like 1.005).
`num0(v)` = the number if finite and > 0, else 0.

```
sub         = r2( Σ qty × price )
discPct     = min(100, num0(discountPct))
discPctAmt  = r2(sub × discPct / 100)
discAmt     = r2( min(num0(discountAmt), max(0, sub − discPctAmt)) )
discount    = discPctAmt + discAmt
feeRows     = Rush fee, Design fee, Set up fee, "Additional fee (<type>)"   // only those > 0
fees        = Σ feeRows
taxable     = sub − discount + fees
rate        = taxExempt ? 0 : order.taxRate (fallback settings.taxRate)
tax         = r2(taxable × rate)
postage     = r2(num0(postage))                       // never taxed
total       = taxable + tax + postage
amountDue   = paid ? 0 : max(0, total − num0(deposit))
```
Fees are taxed. The owner confirmed this; don't add a per-fee taxable option.

**Breakdown rows** (drawer footer, label 1, PDFs), only non-zero optional rows:
`Subtotal`, `Discount (10%)` (negative, shown green in UI), `Discount` (negative), each fee row, `Tax (7%)` or `Tax (exempt)`, `Postage (no tax)`, then **Total**. Labels and invoices add **Deposit paid** and **Amount due** when a deposit exists and the order is unpaid.

**Worked examples (use as tests):**
1. Items: 2 × $45 + 3 × $35 = $195.00. 10% off (−$19.50) and $5 off. Rush $25, Cutting $10. Taxable $205.50, tax $14.39, postage $12.50. **Total $232.39.**
2. Items: 1 × $26 + 2 × $20 = $66.00. Tax $4.62, **total $70.62**. Deposit $10, **amount due $60.62**.
3. Same as #2 but "Invoice no tax": tax $0.00, total $66.00, deposit paid $10.00, **balance due $56.00**.

Money display: `Intl` en-US currency (`$1,292.29`, negatives `-$19.50`). Quantities: integers as-is, otherwise up to 3 decimals.

---

## 6. Labels (4 × 6 in thermal, two separate labels)

See `reference/screenshots/label-example.png`.

**Print label** prints **two separate 4 × 6 pages back to back** (`@page { size: 4in 6in; margin: 0 }`, page break between). They are physically separate labels, **not** one label with a tear line. The print dialog should show 2 pages. All black on white; the NOT PAID box uses `print-color-adjust: exact`.

**Label 1: order details (stuck on the bag; a regular employee rings it up from this)**
- Header: store name (left), "Ordered Sep 29, 2026" (right, the order date)
- Big `#1001` (left). Right side: status box(es):
  - Invoice orders: an outlined **INVOICE** box only (no paid/not paid)
  - Otherwise: **NOT PAID** (solid black, white text) or **PAID** (outlined)
- Customer full name (large), then "Company, phone", then "Due Fri, Oct 2 | Location: Back Shelf" (each part only if present)
- Rule, then an items table: Qty | Item | Each | Amount (money columns never wrap). Sq-ft quantities show "36 sf". Under each item's description, a small spec summary line (section 10).
- Totals pinned to the bottom: breakdown rows, a heavy rule, **TOTAL**, then Deposit paid / AMOUNT DUE if applicable.
- Notes at the very bottom (2-line clamp), prefixed "Note:".
- **Auto-fit:** try text scales 1.3, 1.2, 1.1, 1.0, 0.93, 0.86, 0.80, 0.75 and take the largest that fits. If even 0.75 overflows, drop items from the end one at a time and add "+ N more items. Open order #1002 for the full list." (A 14-item order fits at a small scale.)

**Label 2: store copy (kept; the pickup date gets handwritten on it)**
- Header: "STORE COPY" (left), "Ordered …" (right)
- Very large `#1001`, customer full name (large), company, phone
- Rule, then "Total $248.78" and, **only for invoice orders**, an outlined **INVOICE** box. **No paid/not-paid indicator on this label** (it confused whoever updates the system).
- Short item summary (4-line clamp), "Due Fri, Oct 2", bold "Location: Back Shelf"
- Pinned to the bottom: **Picked up \_\_\_ / \_\_\_ / \_\_\_\_\_** and **By \_\_\_\_\_\_\_\_\_\_\_\_** with tall writing lines

Label print flow: render both labels into a hidden print area, run auto-fit, then call `window.print()`. Print setup (tell the user once): printer = label printer, paper 4 × 6 in, margins None, scale 100%, headers/footers off.

---

## 7. Quote and invoice PDFs (letter size)

Generated client-side (current build: jsPDF 2.5.1 + jsPDF-AutoTable 3.8.2, MIT, inlined) and downloaded as `Quote Q-1001 Gomez Realty.pdf` / `Invoice 1001 Gomez Realty.pdf` (company, else customer name; strip `\/:*?"<>|`). Generating from the drawer saves the order first if it's new or has unsaved edits, then stamps `quotedAt` / `invoicedAt`. The **no tax** variants render the order as tax-exempt for that document only and don't modify the order.

Layout (margins 50pt):
- Top left: store name in teal (18pt bold), then address lines, phone and email in gray.
- Top right: **QUOTE** or **INVOICE** (24pt bold), then a key/value block:
  - Quote: Quote # `Q-1001`, Date (today), Order date, Valid until (today + quoteDays), Needed by (due date, if any and not closed)
  - Invoice: Invoice # `1001`, Date, Order date, Terms (`Paid` or settings.invoiceTerms), Needed by
- Teal 1.5pt rule.
- "Prepared for" / "Bill to": name (12.5pt bold), company, phone, email; then "Ship to" + address if shipping is on.
- Invoice only, top right of that block: a teal rounded box "Balance due $X" (X = amountDue), or a green outlined **PAID** stamp.
- Line items table, full content width: teal header row; columns Description (auto width, wraps) | Qty (e.g. "250 page", "36 sq ft") | Unit price | Amount (bold); zebra rows; 9pt top/bottom cell padding. The description includes the spec summary on a second line.
- Totals block right-aligned: breakdown rows, rule, **Quote total** / **Total** (13pt bold). Invoice adds "Amount paid" (if paid) or "Deposit paid", and **Balance due**.
- Notes section (if any). Quote adds a Terms paragraph: "This quote is valid until Oct 26, 2026. Prices include sales tax at 7%[; postage is not taxed]. Work begins once the quote is approved." Unpaid invoice adds a Payment paragraph: "Due on receipt. Please reference invoice #1001 with your payment."
- Footer on every page: rule, closing note (left), "Page 1 of 1" (right).
- Owner's PDF formatting rules: text in every table cell must wrap (never overflow or overlap), columns wide and well proportioned, generous top/bottom row padding, and tables use the full available page width.

---

## 8. Search
Case-insensitive substring match over: order number (with or without `#`), full name, company, phone (raw and digits only), email, location, item descriptions.

## 9. Calculators

**Square footage** (dialog; from the top bar, a line's **Sq ft** link, or Detailed → Sq ft calc):
- Width × Height, an in/ft toggle, preset chips (11×17 in, 18×24 in, 24×36 in, 2×4 ft, 3×6 ft, 4×8 ft), Pieces, Price per sq ft (prefilled from the line if its unit contains "sq", else from the first price-list item whose unit contains "sq"), and "Round each piece up to a whole sq ft".
- Result panel: "36 sq ft", "18 sq ft each, 2 pieces", and the price "$288.00 at $8.00/sq ft, before tax". Inches: `w*h/144`.
- Apply to a line: qty = total sq ft, unit = "sq ft", price = rate, desc = "<base> (3 × 6 ft, 2 pcs)", replacing any previous size suffix; store `dims`. From the top bar, the button reads **Start an order with this** and opens a new order with that line. Enter applies; Esc closes.

**Margin calc:** cost per piece (prefilled with sendOut.cost ÷ qty when set) and margin % (default 50, must be < 100) → price = cost / (1 − m), shown with profit per piece and markup %. **Use as price per piece** applies it to the current item.

**Price lookup:** searchable list of price-list items (name, "$X / unit"). Click or Enter applies the item to the current line.

## 10. Spec summary string
Built from `line.spec`, joined with ", ", in this order: other, size, color, paper, "bleed", "sets of N", checked Standard and Wide-format finishing names, `[bindingType, …checked booklet options].join(' / ')`, bookletOther, "numbered 1001-1100", otherFinishing.
Example: `8.5x5.5, 1/0, 2prt NCR, sets of 100, Cutting, Padding / Chipboard, numbered 1001-1100`.

## 11. Toasts, dialogs, undo
- Toasts: bottom center, dark, max 3 visible, 3.2s (6s when they have an action button).
- Undo is offered for stage moves, pickups, contact logs, price-list removals and list-chip removals.
- The confirm dialog supports an optional third (alt) button. Esc cancels.

## 12. Backup, restore, export
- **Back up now** downloads `print-counter-backup-YYYY-MM-DD.json` = `{ app:'print-counter', version:1, exportedAt, settings, orders }` (all orders, including closed) and records `pc_last_backup`.
- If 7+ days have passed since the last backup and there are orders, the rail's storage indicator becomes a yellow **Back up now** button that opens Settings.
- **Restore** takes a file picker (.json), validates `app === 'print-counter'` and the arrays, then confirms with "Replace everything on this PC? The backup from <date> has N orders…" and replaces settings and orders.
- **CSV export** `print-orders-YYYY-MM-DD.csv`, all orders sorted by number, columns: Order, Order date, Customer, First name, Last name, Company, Phone, Email, Items, Subtotal, Discount, Fees, Tax, Postage, Total, Paid, Invoice order, Tax exempt, Location, Status (stage label / "Picked up" / "Shipped"), Picked up (date), Due, Notes. CRLF line endings; quote fields containing `,` `"` or newlines.
- Downloads use a Blob plus `<a download>`.
- `reference/sample-backup.json` is a backup in the current format. Restoring it must work.

## 13. Visual design

Four selectable designs ("looks") × light/dark. Applied via attributes on `<html>`: `data-look` (absent = fluent), `data-mode="light|dark"` (resolved from theme + OS preference, live-updating), `data-theme` when forced, `data-nav="top"` for Counter and Ticket. A tiny inline script in `<head>` applies these before first paint (no flash). A one-click **Light mode / Dark mode** button sits in the rail. See `reference/screenshots/design-options.png`.

Stage colors (light): New #009CBD, Quoting #8764B8, Pre-production #B78F00, Production #0063B1, Complete #107C10, Follow up #69797E.

- **Fluent** (default): Windows 11 feel. Left icon rail (84px) with labeled icons, active item tinted teal with a left accent bar. Rounded 8–12px cards, soft shadows, columns on a light gray track.
- **Counter:** teal top menu bar (#0092B2 light / #0F4450 dark) with white active pill. Columns are white with a 4px stage-colored top border and squared 4–6px corners. Bold condensed numbers (Bahnschrift in the original; use Libron Bold). The drawer header is the teal bar color.
- **Ticket:** a print-shop order rail. Dark top bar. Column headers are dark bars with a "rail" line under them. Cards are cream paper tickets (#FFFDF5) with a stage-colored strip and punched/scalloped edge along the top, dashed tear-line dividers, typewriter-style monospace numbers, and uppercase mono headings. Warm paper background with faint ruled lines (light).
- **Press:** CMYK theme. Black side rail with a yellow active item and an ink-wheel logo (conic cyan/magenta/yellow/white). CMYK stripe across the top of the page. Columns have solid ink-colored headers (cyan, magenta, yellow, black, green, gray), 2px black outlines and hard 4px offset shadows. Zero radius, poster-bold uppercase headings, yellow "due today", magenta "overdue". Dark mode uses white outlines and cyan offset shadows.

**Light mode must be well defined** (owner's request): near-black (#172024) outlines on columns, cards, panels, drawer sections and dialogs; a darker gray page background (#E2E7E9) so white cards pop; light-gray header bands on columns, panels and tables; zebra table rows; a subtle dot grid behind the board; dashed dividers on cards; striped empty-column placeholders; section titles in the drawer as gray bands with a teal left edge.

Detailed-mode section headers: dark bar (#2A3236 light / #0E1315 dark; the teal bar in Counter; black in Press).

Phone width (≤760px) still works: the rail becomes a bottom tab bar, and grids collapse. The real target is a desktop at the counter.

Respect `prefers-reduced-motion`. Use visible focus rings. Icons are inline SVG line icons.

## 14. Empty states and copy
Write in plain language. Examples:
- empty New order column: "No new orders yet. Start one with New order."
- other columns: "Drag an order here"
- filtered: "No matches"
- Unclaimed empty: "Nothing has been waiting 30+ days for pickup."
- Customers empty: "No customers yet. They show up here as soon as you create an order."

## 15. Desktop "app" launcher (`reference/launcher/`)
The folder shipped to the store contains `Print-Counter.html`, `Print Counter.ico` (teal rounded tile with a white printer), `setup.ps1`, `Set Up Print Counter.bat`, and `READ ME.txt`.
- The `.bat` runs `powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup.ps1"`.
- `setup.ps1` finds `msedge.exe` (then `chrome.exe`) via the App Paths registry keys (HKLM/HKCU), falling back to the Program Files Edge paths. It creates **Desktop** and **Start menu** shortcuts named "Print Counter" whose target is the browser with `--app="file:///…/Print-Counter.html"`, working dir = the folder, and the icon. Then it launches the app. CRLF line endings. Don't name a variable `$args` (reserved).
- The HTML also embeds a PNG favicon of the icon and `<meta name="theme-color" content="#009CBD">`.
- **Updating = replacing `Print-Counter.html` in the same folder.** Same `file://` origin, so data persists. This is why the storage keys must not change.
- Not yet verified on real Windows hardware.

## 15a. Sync between computers (added after the rebuild)
Optional live sync through Supabase (`supabase/schema.sql`, `sync.config.json`); the owner chose Supabase with one shared
store login. Each computer stays offline-first: `pc_state_v2` remains the working copy, changes queue in `pc_sync_outbox`
and are pushed as rows (`orders`: one JSON document per order, soft deletes; `store_settings`), other computers' changes
arrive through Realtime and "changed since" pulls (`pc_sync` holds the cursor). Last edit wins by the order's
`updatedAt`. New order numbers come from `take_order_num()`. The first account to call `claim_store()` is the store's
only member; row-level security refuses everyone else. Nothing touches the network until someone signs in.

## 16. Decisions already made (don't regress)
- Labels are **two separate 4×6 labels**, not one label with a tear line. No "Tear here" text, no barcode, no scissors.
- The store copy shows **no** paid/not-paid. It shows INVOICE only for invoice orders.
- Label 1 for invoice orders shows **INVOICE only** (no paid/not paid).
- Due is **date only** (no time).
- The **order date** is separate from created time and editable.
- **First name + Last name** fields everywhere (both drawer modes). Display uses the full name.
- A "History" tab was replaced by **Customers** (records grouped per customer).
- Closed orders keep their full record and can be put back.
- Unclaimed jobs leave the board.
- **Order Image** from the Access form was intentionally left out (browser storage limits).
- No `.exe`/Electron. Use the app-mode launcher.
- Charge copy acct, Promotion, Followed up and Associate are stored but have no extra behavior yet.
- Rush, design, set up and additional fees **are taxed** (confirmed by the owner). Only postage is untaxed.

## 17. Open items / not yet done
1. ~~Are rush / design / set up / additional fees taxable?~~ Answered: yes, all fees are taxed (current behavior).
2. The label print layout hasn't been verified on the store's actual thermal printer.
3. The launcher hasn't been run on a real Windows 11 PC.
4. ~~Two PCs don't share data.~~ Done: optional Supabase sync (section 15a).
5. Order Image attachment (deferred).

## 18. Acceptance checklist
- [ ] Opens from `file://` with zero network requests (verify with all `http*` requests blocked).
- [ ] Existing `pc_state_v2` data (and `reference/sample-backup.json` via Restore) loads with no loss, including legacy single-name customers.
- [ ] The three worked money examples in section 5 produce exactly those numbers in the drawer, on label 1 and in the PDFs.
- [ ] Print label → exactly **2 pages** at 288 × 432 pt. A 14-item order still fits on label 1.
- [ ] Quote/Invoice (and no-tax variants) download valid PDFs with wrapped descriptions and correct totals.
- [ ] Closing via card, drawer, Unclaimed and Location all ask about payment correctly (skipped for invoice/paid orders) and are undoable.
- [ ] A job ready 41 days appears on Unclaimed, not the board. The badge count is correct.
- [ ] Customers group by phone. Reorder copies items, specs, fees and discounts.
- [ ] Backup → clear storage → Restore round-trips everything.
- [ ] All 4 designs × light/dark render without errors. Light mode has dark outlines.
- [ ] Simple ↔ Detailed switching preserves every field.
- [ ] Libron font is embedded and used.
- [ ] The packaged launcher folder zips cleanly with CRLF scripts.
