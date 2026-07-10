// Karacena 2026 ticket PDF — horizontal layout matching the site identity.
// pdfkit is loaded lazily so the API still boots if it isn't installed yet.

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

/**
 * Streams a one-page A4-landscape PDF ticket into `res`.
 * data = { serial, code, status, holderName, qrDataUrl, booking, show, showDate, venue, locale }
 */
export async function streamTicketPdf(res, data) {
  const { default: PDFDocument } = await import('pdfkit');
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0 });
  doc.pipe(res);

  const fr = data.locale !== 'en';
  const L = fr
    ? { ticket: 'BILLET', name: 'NOM', date: 'DATE', time: 'HEURE', venue: 'LIEU', price: 'PRIX', ref: 'RÉF. RÉSERVATION', ticketRef: 'BILLET N°', entry: "Présentez ce QR code à l'entrée. Une seule admission par billet.", pass: 'PASS FESTIVAL — accès à tous les spectacles payants', free: 'GRATUIT' }
    : { ticket: 'TICKET', name: 'NAME', date: 'DATE', time: 'TIME', venue: 'VENUE', price: 'PRICE', ref: 'BOOKING REF', ticketRef: 'TICKET NO', entry: 'Show this QR code at the entrance. One admission per ticket.', pass: 'FESTIVAL PASS — access to all paid shows', free: 'FREE' };

  const showTitle = data.booking.type === 'PASS'
    ? 'Karacena 2026 — Pass Festival'
    : (fr ? data.show?.titleFr : data.show?.titleEn) || data.show?.titleFr || '—';
  const venueName = (fr ? data.venue?.nameFr : data.venue?.nameEn) || data.venue?.nameFr || (data.booking.type === 'PASS' ? 'Salé, Maroc' : '—');
  const starts = data.showDate ? new Date(data.showDate.startsAt) : null;
  const dateStr = starts ? starts.toLocaleDateString(fr ? 'fr-FR' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '21–30/08/2026';
  const timeStr = starts ? starts.toLocaleTimeString(fr ? 'fr-FR' : 'en-GB', { hour: '2-digit', minute: '2-digit' }) : '—';
  const price = Number(data.booking.totalMad) / data.booking.quantity;
  const priceStr = price === 0 ? L.free : `${price.toFixed(0)} MAD`;

  // Page background
  doc.rect(0, 0, 842, 595).fill(C.sable);

  // Ticket body (rounded, 760×300, centered)
  const X = 41, Y = 148, W = 760, H = 300, STUB = 210;
  doc.save();
  doc.roundedRect(X, Y, W, H, 16).fill(C.carte);
  doc.roundedRect(X, Y, W, H, 16).lineWidth(1.5).stroke(C.nuit);

  // Header band
  doc.save().roundedRect(X, Y, W, H, 16).clip();
  doc.rect(X, Y, W, 64).fill(C.nuit);
  doc.restore();

  // Header text
  doc.font('Helvetica-Bold').fontSize(22).fillColor(C.sable).text('KARACENA 2026', X + 28, Y + 16);
  doc.font('Helvetica-Oblique').fontSize(11).fillColor(C.moutarde).text('« Faire corps » — 10e Biennale des arts du cirque et du voyage', X + 28, Y + 42);
  doc.font('Helvetica-Bold').fontSize(11).fillColor(C.sable)
    .text(`${L.ticket}  ${data.serial || data.code.slice(0, 12)}`, X + W - STUB - 240, Y + 26, { width: 220, align: 'right' });

  // Perforation between main & stub
  const sx = X + W - STUB;
  doc.moveTo(sx, Y + 8).lineTo(sx, Y + H - 8).dash(4, { space: 5 }).lineWidth(1.2).stroke(C.nuit);
  doc.undash();
  // Semicircular cutouts
  doc.circle(sx, Y, 9).fill(C.sable);
  doc.circle(sx, Y + H, 9).fill(C.sable);
  doc.circle(sx, Y, 9).lineWidth(1.2).stroke(C.nuit);
  doc.circle(sx, Y + H, 9).stroke(C.nuit);

  // ---- MAIN SECTION ----
  const mx = X + 28;
  let my = Y + 84;
  doc.font('Helvetica-Bold').fontSize(20).fillColor(C.nuit).text(showTitle, mx, my, { width: W - STUB - 200 });
  my = doc.y + 10;

  const field = (label, value, x, y, w = 150) => {
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(C.terracotta).text(label, x, y, { width: w });
    doc.font('Helvetica-Bold').fontSize(11.5).fillColor(C.nuit).text(String(value ?? '—'), x, y + 11, { width: w });
  };
  field(L.name, data.holderName || data.booking.customerName, mx, my, 220);
  field(L.venue, venueName, mx + 240, my, 200);
  my += 42;
  field(L.date, dateStr, mx, my, 220);
  field(L.time, timeStr, mx + 240, my, 90);
  field(L.price, priceStr, mx + 340, my, 100);
  my += 42;
  field(L.ref, data.booking.reference, mx, my, 220);
  field(L.ticketRef, data.serial || '—', mx + 240, my, 200);

  // Entrance note
  doc.font('Helvetica').fontSize(8).fillColor(C.nuit).opacity(0.65)
    .text(data.booking.type === 'PASS' ? `${L.pass}. ${L.entry}` : L.entry, mx, Y + H - 34, { width: W - STUB - 190 });
  doc.opacity(1);

  // QR (main) — solid light background, generous quiet zone
  const qr = qrBuffer(data.qrDataUrl);
  const qx = sx - 138, qy = Y + 86;
  doc.roundedRect(qx - 8, qy - 8, 136, 136, 8).fill('#FFFFFF');
  doc.roundedRect(qx - 8, qy - 8, 136, 136, 8).lineWidth(1).stroke(C.moutarde);
  if (qr) doc.image(qr, qx, qy, { width: 120, height: 120 });

  // ---- STUB ----
  const tx = sx + 20;
  let ty = Y + 78;
  doc.font('Helvetica-Bold').fontSize(13).fillColor(C.terracotta).text('KARACENA 2026', tx, ty, { width: STUB - 40 });
  ty += 20;
  doc.font('Helvetica').fontSize(9.5).fillColor(C.nuit).text(showTitle, tx, ty, { width: STUB - 40, height: 26, ellipsis: true });
  ty += 30;
  const stubField = (label, value) => {
    doc.font('Helvetica-Bold').fontSize(7).fillColor(C.terracotta).text(label, tx, ty, { width: STUB - 40 });
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(C.nuit).text(String(value ?? '—'), tx, ty + 9, { width: STUB - 40 });
    ty += 30;
  };
  stubField(L.name, data.holderName || data.booking.customerName);
  stubField(L.date, `${dateStr} — ${timeStr}`);
  stubField(L.venue, venueName);
  stubField(L.ticketRef, data.serial || data.code.slice(0, 12));

  // Small QR on stub
  if (qr) {
    doc.rect(tx + STUB - 110, Y + 74, 66, 66).fill('#FFFFFF');
    doc.image(qr, tx + STUB - 107, Y + 77, { width: 60, height: 60 });
  }

  // Bottom accent
  doc.save().roundedRect(X, Y, W, H, 16).clip();
  doc.rect(X, Y + H - 10, W, 10).fill(C.moutarde);
  doc.restore();

  doc.restore();
  doc.end();
}
