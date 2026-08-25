import { Router } from 'express';
import Sequelize from 'sequelize';
const { Op, fn, col } = Sequelize;
import { sequelize, Ticket, Booking, ShowDate, Show, Venue } from '../models/index.js';
import { requireAuth, requireAdmin, requireScannerAccess } from '../middleware/auth.js';
import { streamTicketPdf } from '../utils/ticketPdf.js';

const router = Router();

const fullInclude = [{
  model: Booking,
  include: [{ model: ShowDate, as: 'showDate', include: [Show, Venue] }]
}];

// The QR contains the raw opaque code; also accept legacy JSON payloads
// ({ code: … }) and check-in URLs (…/check-in/<code>).
function extractToken(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  try {
    const j = JSON.parse(s);
    if (j && typeof j === 'object') return j.code || j.token || null;
    if (typeof j === 'string') return j;
  } catch { /* not JSON */ }
  const m = /(?:check-in|billets|tickets)\/([A-Za-z0-9_-]+)/.exec(s);
  if (m) return m[1];
  return /^[A-Za-z0-9_-]{8,64}$/.test(s) ? s : null;
}

function ticketPayload(ticket) {
  const b = ticket.booking;
  return {
    id: ticket.id,
    code: ticket.code,
    serial: ticket.serial,
    status: ticket.status,
    holderName: ticket.holderName,
    qrDataUrl: ticket.qrDataUrl,
    scannedAt: ticket.scannedAt,
    checkedInBy: ticket.checkedInBy,
    booking: b && {
      reference: b.reference, type: b.type, quantity: b.quantity,
      totalMad: b.totalMad, paymentStatus: b.paymentStatus,
      customerName: b.customerName
    },
    showDate: b?.showDate && {
      id: b.showDate.id, startsAt: b.showDate.startsAt, endsAt: b.showDate.endsAt
    },
    show: b?.showDate?.show && {
      titleFr: b.showDate.show.titleFr, titleEn: b.showDate.show.titleEn, slug: b.showDate.show.slug
    },
    venue: b?.showDate?.venue && {
      nameFr: b.showDate.venue.nameFr, nameEn: b.showDate.venue.nameEn
    }
  };
}

// ---------- Admin: list all tickets ----------
router.get('/admin/all', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const items = await Ticket.findAll({ include: fullInclude, order: [['id', 'DESC']], limit: 1000 });
    res.json({ items: items.map(ticketPayload) });
  } catch (e) { next(e); }
});

// ---------- Admin: ticket statistics ----------
router.get('/admin/stats', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const byStatus = Object.fromEntries((await Ticket.findAll({
      attributes: ['status', [fn('COUNT', col('id')), 'n']], group: ['status'], raw: true
    })).map((r) => [r.status, Number(r.n)]));
    const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
    const used = byStatus.USED || 0;
    const seats = await ShowDate.findOne({
      attributes: [
        [fn('SUM', col('seats_total')), 'capacity'],
        [fn('SUM', col('seats_booked')), 'booked']
      ],
      where: { status: { [Op.ne]: 'CANCELLED' } }, raw: true
    });
    res.json({
      total,
      valid: byStatus.VALID || 0,
      used,
      cancelled: byStatus.CANCELLED || 0,
      refunded: byStatus.REFUNDED || 0,
      checkInPct: total ? Math.round((used / total) * 100) : 0,
      capacity: Number(seats?.capacity || 0),
      seatsBooked: Number(seats?.booked || 0)
    });
  } catch (e) { next(e); }
});

// ---------- Admin: download one ticket as PDF ----------
// Authenticated counterpart of the public capability URL `GET /:code/pdf`.
// Reuses the SAME generator (utils/ticketPdf.js) — no second PDF pipeline.
// Declared before `/:code` so it is never swallowed by that catch-all route.
//
// Statuses: 400 malformed reference · 401 no token · 403 not an admin
//           404 unknown ticket · 409 booking not payable · 503 pdfkit missing
const TICKET_REF = /^[A-Za-z0-9_-]{4,64}$/;

router.get('/admin/:reference/pdf', requireAuth, requireAdmin, async (req, res, next) => {
  const { reference } = req.params;
  if (!TICKET_REF.test(reference || '')) {
    return res.status(400).json({ error: 'Référence de billet invalide.' });
  }
  try {
    // The admin table exposes both identifiers, so accept either the opaque QR
    // code or the human-readable serial (KRC-XXXX-01) — both are unique.
    const ticket = await Ticket.findOne({
      where: { [Op.or]: [{ code: reference }, { serial: reference }] },
      include: fullInclude
    });
    if (!ticket) return res.status(404).json({ error: 'Billet introuvable.' });
    if (ticket.booking?.paymentStatus !== 'PAID') {
      return res.status(409).json({ error: 'Réservation non payée — aucun billet à émettre.' });
    }

    const filenameRef = ticket.serial || ticket.code.slice(0, 12);
    const inline = req.query.disposition === 'inline';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `${inline ? 'inline' : 'attachment'}; filename="ticket-${filenameRef}.pdf"`
    );
    res.setHeader('Cache-Control', 'no-store');
    await streamTicketPdf(res, {
      serial: ticket.serial,
      code: ticket.code,
      status: ticket.status,
      holderName: ticket.holderName,
      qrDataUrl: ticket.qrDataUrl,
      booking: ticket.booking,
      show: ticket.booking?.showDate?.show,
      showDate: ticket.booking?.showDate,
      venue: ticket.booking?.showDate?.venue,
      locale: req.query.lang === 'en' ? 'en' : 'fr'
    });
  } catch (e) {
    if (e.code === 'ERR_MODULE_NOT_FOUND') {
      return res.status(503).json({ error: 'PDF module not installed — run: npm install (server)' });
    }
    // Headers are already flushed once pdfkit starts piping: nothing left to
    // negotiate, just log and drop the socket instead of leaking a stack trace.
    if (res.headersSent) {
      console.error('[tickets] admin PDF stream failed', e);
      return res.destroy();
    }
    next(e);
  }
});

// ---------- Admin: atomic entrance check-in ----------
// Backend is the sole authority. Conditional UPDATE guarantees a ticket can
// only be checked in once, even with two simultaneous scanners.
router.post('/check-in', requireAuth, requireScannerAccess, async (req, res, next) => {
  try {
    const token = extractToken(req.body?.token);
    if (!token) return res.status(400).json({ result: 'INVALID', error: 'Malformed token' });

    const ticket = await Ticket.findOne({ where: { code: token }, include: fullInclude });
    if (!ticket) return res.status(404).json({ result: 'INVALID', error: 'Ticket not recognized' });

    const info = ticketPayload(ticket);
    if (ticket.booking?.paymentStatus !== 'PAID') {
      return res.status(409).json({ result: 'NOT_PAID', ticket: info });
    }
    if (ticket.status === 'CANCELLED' || ticket.status === 'REFUNDED') {
      return res.status(409).json({ result: ticket.status, ticket: info });
    }
    if (ticket.status === 'USED') {
      return res.status(409).json({ result: 'ALREADY_USED', ticket: info });
    }

    // Session-gate (optional): scanner may pin a show date.
    if (req.body?.showDateId && ticket.booking?.showDate && Number(req.body.showDateId) !== ticket.booking.showDate.id) {
      return res.status(409).json({ result: 'WRONG_SESSION', ticket: info });
    }

    // Atomic: only one concurrent scanner wins this UPDATE.
    const [updated] = await Ticket.update(
      { status: 'USED', scannedAt: new Date(), checkedInBy: req.user?.email || req.user?.name || 'staff' },
      { where: { id: ticket.id, status: 'VALID' } }
    );
    if (updated !== 1) {
      const fresh = await Ticket.findByPk(ticket.id, { include: fullInclude });
      return res.status(409).json({ result: 'ALREADY_USED', ticket: ticketPayload(fresh) });
    }
    const fresh = await Ticket.findByPk(ticket.id, { include: fullInclude });
    res.json({ result: 'OK', ticket: ticketPayload(fresh) });
  } catch (e) { next(e); }
});

// ---------- Admin: invalidate a ticket ----------
router.post('/:code/invalidate', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const [updated] = await Ticket.update(
      { status: 'CANCELLED' },
      { where: { code: req.params.code, status: 'VALID' } }
    );
    if (updated !== 1) return res.status(409).json({ error: 'Ticket not found or not in VALID state' });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ---------- Public: ticket view (capability URL — the opaque code IS the authorization) ----------
router.get('/:code', async (req, res, next) => {
  try {
    const ticket = await Ticket.findOne({ where: { code: req.params.code }, include: fullInclude });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    if (ticket.booking?.paymentStatus !== 'PAID') return res.status(403).json({ error: 'Booking not paid' });
    res.json(ticketPayload(ticket));
  } catch (e) { next(e); }
});

// ---------- Public: PDF download ----------
router.get('/:code/pdf', async (req, res, next) => {
  try {
    const ticket = await Ticket.findOne({ where: { code: req.params.code }, include: fullInclude });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    if (ticket.booking?.paymentStatus !== 'PAID') return res.status(403).json({ error: 'Booking not paid' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="KARACENA-2026-${ticket.serial || ticket.code.slice(0, 12)}.pdf"`);
    await streamTicketPdf(res, {
      serial: ticket.serial,
      code: ticket.code,
      status: ticket.status,
      holderName: ticket.holderName,
      qrDataUrl: ticket.qrDataUrl,
      booking: ticket.booking,
      show: ticket.booking?.showDate?.show,
      showDate: ticket.booking?.showDate,
      venue: ticket.booking?.showDate?.venue,
      locale: req.query.lang === 'en' ? 'en' : 'fr'
    });
  } catch (e) {
    if (e.code === 'ERR_MODULE_NOT_FOUND') {
      return res.status(503).json({ error: 'PDF module not installed — run: npm install (server)' });
    }
    next(e);
  }
});

export default router;
