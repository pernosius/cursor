// Builds a realistic backup in the current format (6 orders covering every case), with dates relative to `now`.
// Order notes state the totals each one must produce (SPEC section 5).
export function sampleBackup(now = new Date()) {
  const iso = d => new Date(now.getTime() - d * 864e5).toISOString();
  const day = d => {
    const t = new Date(now.getTime() - d * 864e5);
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  };
  const items = [
    { id: 'it-bw', name: 'B&W copies', unit: 'page', price: 0.15 },
    { id: 'it-color', name: 'Color copies', unit: 'page', price: 0.65 },
    { id: 'it-banner', name: 'Banner', unit: 'each', price: 45 },
    { id: 'it-inv', name: 'Invitations', unit: 'each', price: 2.5 },
    { id: 'it-bc', name: 'Business cards (250)', unit: 'box', price: 35 },
    { id: 'it-lam', name: 'Lamination', unit: 'sheet', price: 3 },
    { id: 'it-bind', name: 'Binding', unit: 'each', price: 5 },
    { id: 'it-vinyl', name: 'Vinyl banner', unit: 'sq ft', price: 8 },
  ];
  const settings = {
    storeName: 'The UPS Store #1234', taxRate: 0.07, nextNum: 1007,
    storeAddress: '1234 E Main St\nSpartanburg, SC 29307', storePhone: '(864) 555-0100', storeEmail: 'store1234@example.com',
    quoteDays: 30, invoiceTerms: 'Due on receipt', footerNote: 'Thank you for your business!', unclaimedDays: 30,
    locations: ['ABC Folders', 'Back Shelf', 'Production Table', 'Wide Format Roll Box', 'Foamboard/Yard Sign'],
    feeTypes: ['Cutting', 'Folding', 'Hole Punching', 'Padding', 'Rounding Corners', 'Stapling', 'Stuffing/Stamping'],
    papers: ['20# Bond', '24# Bond', '28# Bond', '60# Text', '70# Text', '80# Text', '100# Text', '65# Cover', '80# Cover',
      '100# Cover', '110# Cover', '80# Gloss Text', '100# Gloss Cover', '2prt NCR', '3prt NCR', '4prt NCR', 'Label Stock',
      'Vinyl', 'Coroplast', 'Foamboard'],
    associates: ['ER', 'JT'], items,
  };
  const base = (i, num, customer, lines, stage, age, extra) => Object.assign({
    id: `ord-sample${i}`, num, customer, lines, notes: '', orderDate: day(age), due: '', stage,
    paid: false, invoice: false, taxExempt: false, taxRate: 0.07, archived: false, closedAt: null,
    createdAt: iso(age), updatedAt: iso(0), stageAt: iso(Math.min(age, 2)),
  }, extra);
  const L = (itemId, desc, unit, qty, price, extra) => Object.assign({ itemId, desc, unit, qty, price }, extra);
  const orders = [
    // 1: legacy single-name customer; fees, discounts and postage. Total $232.39
    base(1, 1001, { name: 'Maria de la Cruz', company: 'Gomez Realty', phone: '864-555-0142', email: 'maria@example.com' },
      [L('it-banner', 'Banner', 'each', 2, 45), L('it-bc', 'Business cards (250)', 'box', 3, 35)], 'production', 3,
      { due: day(-2), location: 'Production Table', fees: { rush: 25, design: 0, setup: 0, additional: 10, additionalType: 'Cutting' },
        discountPct: 10, discountAmt: 5, postage: 12.5, notes: 'Example 1 in SPEC section 5: total must be $232.39.' }),
    // 2: detailed specs and a deposit. Total $70.62, amount due $60.62
    base(2, 1002, { first: 'Test', last: 'Customer', name: 'Test Customer', company: 'Harbor Dental', phone: '864-555-0199', email: 'test@example.com' },
      [L('it-bc', '100 ss bw carbon copies', 'box', 1, 26, { spec: { artwork: 'Artwork on File', setOf: true, setQty: 100, size: '8.5x5.5',
        color: '1/0', paper: '2prt NCR', fin: { cutting: true, chipboard: true }, bookletType: 'Padding', numbering: true, numStart: '1001', numEnd: '1100' } }),
      L('it-banner', 'Banner', 'each', 2, 20)], 'new', 0,
      { deposit: 10, associate: 'ER', location: 'Back Shelf',
        notes: 'Example 2: total $70.62, amount due $60.62. Invoice-no-tax variant: balance due $56.00.' }),
    // 3: invoice order, sq ft line, quoting
    base(3, 1003, { first: 'Westside', last: 'Baptist', name: 'Westside Baptist', company: 'Youth Ministry', phone: '', email: '' },
      [L('it-vinyl', 'Vinyl banner (3 × 6 ft, 2 pcs)', 'sq ft', 36, 8, { dims: { w: 3, h: 6, u: 'ft', copies: 2, round: false } })],
      'quoting', 4, { invoice: true, taxExempt: true, due: day(-9) }),
    // 4: done and paid, ready 3 days
    base(4, 1004, { first: 'Tom', last: 'Reyes', name: 'Tom Reyes', company: '', phone: '864-555-0122', email: '' },
      [L('', 'Poster 24 × 36', 'each', 3, 22)], 'complete', 5,
      { paid: true, readyAt: iso(3), stageAt: iso(3), location: 'Wide Format Roll Box' }),
    // 5: unclaimed (ready 41 days), unpaid, contacted once
    base(5, 1005, { first: 'Dana', last: 'Whitfield', name: 'Dana Whitfield', company: 'Whitfield Law', phone: '864-555-0111', email: 'dana@example.com' },
      [L('it-color', 'Color copies', 'page', 400, 0.65), L('it-bind', 'Binding', 'each', 8, 5)], 'followup', 44,
      { readyAt: iso(41), stageAt: iso(41), location: 'ABC Folders', lastContactAt: iso(10), contactCount: 1 }),
    // 6: closed (picked up); same phone as #1001, so it groups with Maria
    base(6, 1006, { first: 'Maria', last: 'de la Cruz', name: 'Maria de la Cruz', company: 'Gomez Realty', phone: '(864) 555-0142', email: 'maria@example.com' },
      [L('it-bc', 'Business cards (250)', 'box', 1, 35)], 'complete', 20,
      { paid: true, archived: true, pickedUp: true, closedAt: iso(15), closeMethod: 'picked', location: 'Picked Up By Customer',
        prevLocation: 'Back Shelf', readyAt: iso(17) }),
  ];
  return { app: 'print-counter', version: 1, exportedAt: iso(0), settings, orders };
}
