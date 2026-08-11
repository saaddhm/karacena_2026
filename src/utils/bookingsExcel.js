import ExcelJS from 'exceljs';

const NUIT = 'FF1E2D4D';
const SABLE = 'FFFAF3EB';

// Les colonnes DATE reviennent en chaîne « YYYY-MM-DD HH:mm:ss » (dialectOptions
// dateStrings:true) : on formate en heure murale, sans objet Date, pour éviter
// tout décalage de fuseau horaire.
function naiveParts(value) {
  if (!value) return null;
  const s = typeof value === 'string'
    ? value
    : (value instanceof Date ? value.toISOString().slice(0, 19).replace('T', ' ') : String(value));
  const m = s.match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  if (!m) return null;
  const [, Y, Mo, D, H, Mi] = m;
  return { date: `${D}/${Mo}/${Y}`, time: `${H}:${Mi}`, datetime: `${D}/${Mo}/${Y} ${H}:${Mi}` };
}

// --- Content-Disposition sûr pour un téléchargement ---
// Node refuse toute valeur d'en-tête contenant un caractère hors latin-1
// (ERR_INVALID_CHAR) : apostrophe typographique ’, arabe, autres Unicode…
// On fournit donc un nom ASCII de repli (filename=) ET la version UTF-8
// encodée RFC 5987 (filename*=), toutes deux 100 % ASCII → jamais de crash.

function asciiFileName(name) {
  const ascii = String(name || '')
    .replace(/\.xlsx$/i, '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')      // enlève les accents
    .replace(/[^A-Za-z0-9._-]+/g, '-')    // tout le reste -> tiret (retire aussi \r \n / \ , ; : ? " etc.)
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '');
  return `${ascii || 'reservations'}.xlsx`;
}

function rfc5987(name) {
  return encodeURIComponent(String(name || ''))
    .replace(/['()*!~]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

/**
 * Construit un en-tête Content-Disposition valide et robuste.
 * @param {string} asciiSource  nom source pour le repli ASCII (ex. slug)
 * @param {string} readableName nom lisible complet (peut contenir de l'Unicode)
 */
export function attachmentDisposition(asciiSource, readableName = asciiSource) {
  const ascii = asciiFileName(asciiSource);
  const utf8 = rfc5987(readableName.endsWith('.xlsx') ? readableName : `${readableName}.xlsx`);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${utf8}`;
}

const COLUMNS = [
  { h: 'N°', w: 6, align: 'center' },
  { h: 'Référence', w: 16 },
  { h: 'Nom du client', w: 26 },
  { h: 'Email', w: 30 },
  { h: 'Téléphone', w: 16 },
  { h: 'Spectacle', w: 34 },
  { h: 'Date', w: 12, align: 'center' },
  { h: 'Heure', w: 8, align: 'center' },
  { h: 'Quantité de billets', w: 12, align: 'center' },
  { h: 'Montant total (MAD)', w: 16, align: 'right', numFmt: '#,##0' },
  { h: 'Statut du paiement', w: 16, align: 'center' },
  { h: 'Tickets générés', w: 12, align: 'center' },
  { h: 'Date de réservation', w: 20, align: 'center' },
];

const THIN = { style: 'thin', color: { argb: 'FFD9D2C7' } };
const BORDER = { top: THIN, left: THIN, bottom: THIN, right: THIN };

/**
 * Construit le classeur Excel des réservations d'UNE séance précise.
 * @param {object} p
 * @param {object} p.show      instance Show (titleFr, slug…)
 * @param {object} p.showDate  instance ShowDate (startsAt, venue…)
 * @param {object[]} p.bookings  réservations de cette séance (avec .tickets)
 * @returns {ExcelJS.Workbook}
 */
export function buildBookingsWorkbook({ show, showDate, bookings }) {
  const N = COLUMNS.length;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Karacena 2026';
  wb.created = new Date();
  const ws = wb.addWorksheet('Réservations');

  COLUMNS.forEach((c, i) => { ws.getColumn(i + 1).width = c.w; });

  const seance = naiveParts(showDate?.startsAt);
  const venueName = showDate?.venue?.nameFr || showDate?.venue?.nameEn || '';
  const totalTickets = bookings.reduce((s, b) => s + (Number(b.quantity) || 0), 0);

  const addTitle = (text, { bold = false, size = 11, color } = {}) => {
    const r = ws.addRow([text]);
    ws.mergeCells(r.number, 1, r.number, N);
    const cell = r.getCell(1);
    cell.font = { bold, size, color: color ? { argb: color } : undefined };
    cell.alignment = { vertical: 'middle' };
    return r;
  };

  addTitle('KARACENA', { bold: true, size: 16, color: NUIT });
  addTitle('Liste des réservations', { bold: true, size: 12 });
  addTitle(`Spectacle : ${show?.titleFr || ''}`);
  addTitle(`Séance : ${seance ? `${seance.date} — ${seance.time}` : ''}${venueName ? `  ·  ${venueName}` : ''}`);
  addTitle(`Nombre de réservations : ${bookings.length}`);
  addTitle(`Nombre total de billets : ${totalTickets}`);
  ws.addRow([]);

  // Ligne d'en-tête des colonnes
  const header = ws.addRow(COLUMNS.map((c) => c.h));
  const headerRowNumber = header.number;
  header.height = 20;
  header.eachCell((cell, col) => {
    cell.font = { bold: true, color: { argb: SABLE } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NUIT } };
    cell.alignment = { vertical: 'middle', horizontal: COLUMNS[col - 1].align === 'right' ? 'right' : 'center' };
    cell.border = BORDER;
  });

  // Lignes de données
  bookings.forEach((b, i) => {
    const created = naiveParts(b.createdAt);
    const row = ws.addRow([
      i + 1,
      b.reference || '',
      b.customerName || '',
      b.customerEmail || '',
      b.customerPhone || '',
      show?.titleFr || (b.type === 'PASS' ? 'Festival Pass' : ''),
      seance ? seance.date : '',
      seance ? seance.time : '',
      Number(b.quantity) || 0,
      Number(b.totalMad) || 0,
      b.paymentStatus || '',
      Array.isArray(b.tickets) ? b.tickets.length : 0,
      created ? created.datetime : '',
    ]);
    row.eachCell((cell, col) => {
      const c = COLUMNS[col - 1];
      cell.border = BORDER;
      cell.alignment = { vertical: 'middle', horizontal: c.align || 'left' };
      if (c.numFmt) cell.numFmt = c.numFmt;
    });
  });

  // En-tête figé + filtres Excel sur les colonnes.
  ws.views = [{ state: 'frozen', ySplit: headerRowNumber }];
  ws.autoFilter = {
    from: { row: headerRowNumber, column: 1 },
    to: { row: headerRowNumber, column: N },
  };

  return wb;
}
