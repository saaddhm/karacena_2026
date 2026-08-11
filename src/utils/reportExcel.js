import ExcelJS from 'exceljs';

const NUIT = 'FF1E2D4D';

function headerRow(ws, cells) {
  const r = ws.addRow(cells);
  r.eachCell((c) => {
    c.font = { bold: true, color: { argb: 'FFFAF3EB' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NUIT } };
  });
  return r;
}

/** Rapport Excel du tableau de bord pour une période donnée. */
export function buildReportWorkbook(d) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Karacena 2026';
  wb.created = new Date();
  const ws = wb.addWorksheet('Rapport');
  ws.getColumn(1).width = 34;
  ws.getColumn(2).width = 18;
  ws.getColumn(3).width = 12;

  const title = (text, { bold = false, size = 11, color } = {}) => {
    const r = ws.addRow([text]);
    r.getCell(1).font = { bold, size, color: color ? { argb: color } : undefined };
    return r;
  };

  title('KARACENA — Rapport', { bold: true, size: 16, color: NUIT });
  title(`Période : ${d.range.from} → ${d.range.to}`, { bold: true });
  ws.addRow([]);

  title('Indicateurs', { bold: true, size: 12, color: NUIT });
  [
    ['Spectacles', d.cards.shows.value],
    ['Artistes', d.cards.artists.value],
    ['Abonnés newsletter', d.cards.subscribers.value],
    ['Billets émis', d.cards.tickets.value],
    ['Accréditations en attente', d.cards.pressPending.value],
    ['Inscrits AL Liqâat', d.cards.atabadoul.value],
    ['Nouveaux messages', d.cards.newMessages.value],
    ['Réservations (période)', d.totalBookings],
  ].forEach((r) => ws.addRow(r));
  ws.addRow([]);

  title('Top spectacles (par réservations)', { bold: true, size: 12, color: NUIT });
  headerRow(ws, ['Spectacle', 'Réservations', 'Part']);
  d.topShows.forEach((s) => ws.addRow([s.title, s.count, `${s.pct}%`]));
  ws.addRow([]);

  const stLabel = { confirmed: 'Confirmées', pending: 'En attente', cancelled: 'Annulées', refunded: 'Remboursées' };
  title('Réservations par statut', { bold: true, size: 12, color: NUIT });
  headerRow(ws, ['Statut', 'Nombre', 'Part']);
  d.statuses.forEach((s) => ws.addRow([stLabel[s.key] || s.key, s.value, `${s.pct}%`]));
  ws.addRow([]);

  const chLabel = { web: 'Site web', onsite: 'Guichet' };
  title('Ventes par canal', { bold: true, size: 12, color: NUIT });
  headerRow(ws, ['Canal', 'Nombre', 'Part']);
  d.channels.forEach((c) => ws.addRow([chLabel[c.key] || c.key, c.value, `${c.pct}%`]));
  ws.addRow([]);

  title('Détail quotidien', { bold: true, size: 12, color: NUIT });
  headerRow(ws, ['Date', 'Réservations', 'Billets émis']);
  d.series.forEach((s) => ws.addRow([s.label, s.reservations, s.tickets]));

  return wb;
}
