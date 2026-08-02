// Karacena 2026 ticket PDF — horizontal layout matching the site identity.
// pdfkit is loaded lazily so the API still boots if it isn't installed yet.
//
// Layout (A4 landscape, 842×595pt):
//   ticket 760×340, main section 570pt (75%), stub 190pt (25%),
//   main QR 150pt in a 170pt framed white box, stub QR 60pt at the stub bottom
//   (it previously sat on the stub title row and painted over "KARACENA 2026").

import { readFileSync } from 'node:fs';

const KARACENA_LOGO = readFileSync(
  new URL('../assets/karacena-logo.png', import.meta.url)
);

const C = {
  nuit: '#1E2D4D',
  terracotta: '#C25B3F',
  moutarde: '#D4A843',
  sable: '#FAF3EB',
  carte: '#FFFFFF'
};

function qrBuffer(qrDataUrl) {
  const m = /^data:image\/png;base64,(.+)$/.exec(qrDataUrl || '');
  return m ? Buffer.from(m[1], 'base64') : null;
}

// Date « murale » : reconstruit une Date à partir des composantes (sans fuseau),
// pour que l'heure imprimée soit exactement celle enregistrée en base.
function parseNaive(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) { const d = new Date(value); return Number.isNaN(d.getTime()) ? null : d; }
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]),
    Number(m[4] || 0), Number(m[5] || 0), Number(m[6] || 0));
}

// Collapse whitespace; never emit undefined/null/NaN on the ticket.
function clean(v, fallback = '—') {
  const s = String(v ?? '').replace(/\s+/g, ' ').trim();
  return s && !['undefined', 'null', 'NaN'].includes(s) ? s : fallback;
}

/**
 * Draws one full ticket page onto an existing pdfkit document.
 * data = { serial, code, status, holderName, qrDataUrl, booking, show, showDate, venue, locale }
 */
function drawTicket(doc, data) {
  const fr = data.locale !== 'en';
  const L = fr
    ? { ticket: 'BILLET N°', name: 'NOM', date: 'DATE', time: 'HEURE', venue: 'LIEU', price: 'PRIX', ref: 'RÉF. RÉSERVATION', ticketRef: 'BILLET N°', entry: "Présentez ce QR code à l'entrée. Une seule admission par billet.", pass: 'PASS FESTIVAL — accès à tous les spectacles payants', free: 'GRATUIT' }
    : { ticket: 'TICKET NO', name: 'NAME', date: 'DATE', time: 'TIME', venue: 'VENUE', price: 'PRICE', ref: 'BOOKING REF', ticketRef: 'TICKET NO', entry: 'Show this QR code at the entrance. One admission per ticket.', pass: 'FESTIVAL PASS — access to all paid shows', free: 'FREE' };

  const isPass = data.booking?.type === 'PASS';
  const showTitle = isPass
    ? 'Karacena 2026 — Pass Festival'
    : clean((fr ? data.show?.titleFr : data.show?.titleEn) || data.show?.titleFr);
  const venueName = clean(
    (fr ? data.venue?.nameFr : data.venue?.nameEn) || data.venue?.nameFr,
    isPass ? 'Salé, Maroc' : '—'
  );
  const holder = clean(data.holderName) !== '—' ? clean(data.holderName) : clean(data.booking?.customerName);
  // Heure « murale » : on lit les composantes (sans fuseau) pour afficher
  // exactement l'heure enregistrée, quel que soit le fuseau du serveur.
  const starts = parseNaive(data.showDate?.startsAt);
  const validDate = Boolean(starts);
  const locale = fr ? 'fr-FR' : 'en-GB';
  const dateStr = validDate
    ? starts.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : (isPass ? '21–30/08/2026' : '—');
  const timeStr = validDate
    ? starts.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false })
    : '—';
  const total = Number(data.booking?.totalMad);
  const qty = Number(data.booking?.quantity);
  const unit = Number.isFinite(total) && Number.isFinite(qty) && qty >= 1 ? total / qty : null;
  const priceStr = unit === null ? '—' : unit === 0 ? L.free : `${Math.round(unit)} MAD`;
  const serial = clean(data.serial || data.code?.slice(0, 12));
  const bookingRef = clean(data.booking?.reference);

  // Page background
  doc.rect(0, 0, 842, 595).fill(C.sable);

  // Ticket geometry
  const X = 41, Y = 128, W = 760, H = 340, STUB = 190;
  const sx = X + W - STUB; // perforation / stub left edge
  const HEAD = 66;

  doc.save();
  doc.roundedRect(X, Y, W, H, 16).fill(C.carte);

  // Stub background (slightly tinted, like the web stub)
  doc.save().roundedRect(X, Y, W, H, 16).clip();
  doc.rect(sx, Y, STUB, H).fillOpacity(0.55).fill(C.sable);
  doc.fillOpacity(1);

  // Header band across the full width
  doc.rect(X, Y, W, HEAD).fill(C.nuit);
  // Bottom accent
  doc.rect(X, Y + H - 10, W, 10).fill(C.moutarde);
  doc.restore();

  doc.roundedRect(X, Y, W, H, 16).lineWidth(1.5).stroke(C.nuit);

  // ---- HEADER ----
  // Official Karacena logo. `fit` preserves its proportions and transparent
  // margins while keeping every figure inside the header safe area.
  doc.image(KARACENA_LOGO, X + 12, Y + 7, {
    fit: [46, 52],
    align: 'center',
    valign: 'center'
  });
  doc.font('Helvetica-Bold').fontSize(24).fillColor(C.sable).text('KARACENA 2026', X + 60, Y + 13);
  doc.font('Helvetica-Oblique').fontSize(10).fillColor(C.moutarde)
    .text('« Faire corps » — 10e Biennale des arts du cirque et du voyage', X + 60, Y + 42);
  // Ticket number, right-aligned, never clipped
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(C.sable).opacity(0.7)
    .text(L.ticket, sx - 250, Y + 20, { width: 230, align: 'right' });
  doc.opacity(1);
  doc.font('Courier-Bold').fontSize(13).fillColor(C.moutarde)
    .text(serial, sx - 250, Y + 32, { width: 230, align: 'right' });

  // ---- PERFORATION ----
  doc.moveTo(sx, Y + 8).lineTo(sx, Y + H - 8).dash(4, { space: 5 }).lineWidth(1.2).stroke(C.nuit);
  doc.undash();
  doc.circle(sx, Y, 9).fill(C.sable);
  doc.circle(sx, Y + H, 9).fill(C.sable);
  doc.circle(sx, Y, 9).lineWidth(1.2).stroke(C.nuit);
  doc.circle(sx, Y + H, 9).stroke(C.nuit);

  // ---- MAIN SECTION ----
  const mx = X + 28;                 // left margin of main content
  const colTextW = 330;              // text area width (both columns)
  const col2x = mx + 200;            // second column x

  // Show title — max two lines, ellipsis, never collides with the header
  doc.font('Helvetica-Bold').fontSize(20).fillColor(C.nuit)
    .text(showTitle, mx, Y + 82, { width: colTextW, height: 50, ellipsis: true, lineGap: 2 });

  const field = (label, value, x, y, w, { mono = false, maxH = 28 } = {}) => {
    doc.font('Helvetica-Bold').fontSize(8).fillColor(C.terracotta).text(label, x, y, { width: w, characterSpacing: 0.6 });
    doc.font(mono ? 'Courier-Bold' : 'Helvetica-Bold').fontSize(mono ? 10.5 : 12).fillColor(C.nuit)
      .text(clean(value), x, y + 12, { width: w, height: maxH, ellipsis: true });
  };

  const r1 = Y + 146, r2 = Y + 192, r3 = Y + 238;
  // Column 1 — identity (≈1.4fr)
  field(L.name, holder, mx, r1, 190);
  field(L.date, dateStr, mx, r2, 190);
  field(L.ref, bookingRef, mx, r3, 190, { mono: true });
  // Column 2 — logistics (≈1fr)
  field(L.venue, venueName, col2x, r1, 130);
  field(L.time, timeStr, col2x, r2, 60);
  field(L.price, priceStr, col2x + 70, r2, 60);
  field(L.ticketRef, serial, col2x, r3, 130, { mono: true });

  // Entrance note
  doc.font('Helvetica').fontSize(8.5).fillColor(C.nuit).opacity(0.65)
    .text(isPass ? `${L.pass}. ${L.entry}` : L.entry, mx, Y + 296, { width: sx - mx - 20 });
  doc.opacity(1);

  // Main QR — 150pt image inside a 170pt framed white box (10pt quiet zone),
  // right of the text columns, clear of the perforation.
  const qr = qrBuffer(data.qrDataUrl);
  const qbox = 170, qimg = 150;
  const qbx = sx - qbox - 22, qby = Y + 96;
  doc.roundedRect(qbx, qby, qbox, qbox, 10).fill('#FFFFFF');
  doc.roundedRect(qbx, qby, qbox, qbox, 10).lineWidth(1.5).stroke(C.moutarde);
  if (qr) doc.image(qr, qbx + (qbox - qimg) / 2, qby + (qbox - qimg) / 2, { width: qimg, height: qimg });

  // ---- STUB ----
  const tx = sx + 18, sw = STUB - 36;
  doc.image(KARACENA_LOGO, tx, Y + 74, {
    fit: [27, 34],
    align: 'center',
    valign: 'center'
  });
  doc.font('Helvetica-Bold').fontSize(13).fillColor(C.terracotta)
    .text('KARACENA 2026', tx + 31, Y + 80, { width: sw - 31 });
  doc.font('Helvetica-Oblique').fontSize(8).fillColor(C.nuit).opacity(0.6)
    .text('« Faire corps »', tx, Y + 96, { width: sw });
  doc.opacity(1);
  doc.font('Helvetica-Bold').fontSize(9.5).fillColor(C.nuit)
    .text(showTitle, tx, Y + 110, { width: sw, height: 24, ellipsis: true });

  const stubField = (label, value, y, { mono = false, maxH = 20 } = {}) => {
    doc.font('Helvetica-Bold').fontSize(6.5).fillColor(C.terracotta).text(label, tx, y, { width: sw, characterSpacing: 0.5 });
    doc.font(mono ? 'Courier-Bold' : 'Helvetica-Bold').fontSize(mono ? 9 : 9.5).fillColor(C.nuit)
      .text(clean(value), tx, y + 9, { width: sw, height: maxH, ellipsis: true });
  };
  stubField(L.name, holder, Y + 138, { maxH: 11 });
  stubField(L.date, `${dateStr} — ${timeStr}`, Y + 162, { maxH: 22 });
  stubField(L.venue, venueName, Y + 198, { maxH: 11 });
  stubField(L.ticketRef, serial, Y + 222, { mono: true, maxH: 11 });

  // Stub QR — at the very bottom, centered, in its own white box.
  // Never on the same row as text (this was the overlap bug).
  if (qr) {
    const sqbox = 72, sqimg = 60;
    const sqx = sx + (STUB - sqbox) / 2, sqy = Y + 250;
    doc.roundedRect(sqx, sqy, sqbox, sqbox, 6).fill('#FFFFFF');
    doc.roundedRect(sqx, sqy, sqbox, sqbox, 6).lineWidth(1).stroke(C.nuit);
    doc.image(qr, sqx + (sqbox - sqimg) / 2, sqy + (sqbox - sqimg) / 2, { width: sqimg, height: sqimg });
  }

  doc.restore();
}

/**
 * Streams a one-page A4-landscape PDF ticket into `res`.
 */
export async function streamTicketPdf(res, data) {
  const { default: PDFDocument } = await import('pdfkit');
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0 });
  doc.pipe(res);
  drawTicket(doc, data);
  doc.end();
}

/**
 * Streams ALL tickets of a booking as a single multi-page PDF (one ticket per
 * A4-landscape page) into `res`. `datas` is an array of drawTicket payloads.
 */
export async function streamBookingTicketsPdf(res, datas) {
  const { default: PDFDocument } = await import('pdfkit');
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0 });
  doc.pipe(res);
  datas.forEach((data, i) => {
    if (i > 0) doc.addPage({ size: 'A4', layout: 'landscape', margin: 0 });
    drawTicket(doc, data);
  });
  doc.end();
}
