import { Router } from 'express';
import { body } from 'express-validator';
import { sequelize, Booking, Ticket, ShowDate, Show, Venue } from '../models/index.js';
import { validate } from '../middleware/validate.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { generateReference } from '../utils/tickets.js';
import { buildPaymentForm, verifyCmiHash, cmiConfigured, clientBaseUrl } from '../utils/cmi.js';
import { confirmBookingPayment, markBookingClosed } from '../utils/bookingService.js';

const router = Router();
const PASS_PRICE_MAD = 350;

// Create booking (public) — creates a PENDING booking only.
// Seats are NOT incremented and tickets are NOT created here; that happens
// exclusively in confirmBookingPayment() after payment is verified.
router.post('/',
  body('customerName').trim().isLength({ min: 2, max: 180 }),
  body('customerEmail').isEmail().normalizeEmail(),
  body('quantity').isInt({ min: 1, max: 10 }),
  body('type').isIn(['SINGLE', 'PASS']),
  body('paymentMethod').isIn(['CMI', 'ONSITE']),
  validate,
  async (req, res, next) => {
    const t = await sequelize.transaction();
    let booking;
    try {
      const { type, showDateId, quantity, customerName, customerEmail, customerPhone, paymentMethod } = req.body;
      let unitPrice = PASS_PRICE_MAD;

      if (type === 'SINGLE') {
        const showDate = await ShowDate.findByPk(showDateId, {
          include: [Show], lock: t.LOCK.UPDATE, transaction: t
        });
        if (!showDate) { await t.rollback(); return res.status(404).json({ error: 'Show date not found' }); }
        // Availability pre-check (real enforcement happens again, under lock,
        // at payment confirmation). available = seatsTotal - seatsBooked (paid only).
        if (showDate.status !== 'SCHEDULED' || showDate.seatsBooked + quantity > showDate.seatsTotal) {
          await t.rollback(); return res.status(409).json({ error: 'Not enough seats available' });
        }
        unitPrice = showDate.show.isFree ? 0 : Number(showDate.show.priceMad);
      }

      booking = await Booking.create({
        reference: generateReference(),
        customerName, customerEmail, customerPhone,
        type, quantity,
        showDateId: type === 'SINGLE' ? showDateId : null,
        totalMad: unitPrice * quantity,
        paymentMethod,
        paymentStatus: 'PENDING'
      }, { transaction: t });

      await t.commit();
    } catch (e) { await t.rollback(); return next(e); }

    try {
      // Free bookings need no payment: confirm immediately (allocates seats + tickets).
      if (Number(booking.totalMad) === 0) {
        const result = await confirmBookingPayment(booking.reference, { paymentRef: 'FREE' });
        if (!result.ok) return res.status(409).json({ error: 'Not enough seats available' });
      }
      const full = await Booking.findByPk(booking.id, { include: [Ticket] });
      res.status(201).json({ booking: full, tickets: full.tickets || [] });
    } catch (e) { next(e); }
  });

// CMI: server-to-server callback (called by CMI after 3-D Secure).
// This verified handler is the authoritative place where payment is confirmed.
router.post('/cmi/callback', async (req, res) => {
  const p = req.body || {};
  if (!p.oid) return res.status(400).send('FAILURE');
  if (!verifyCmiHash(p)) return res.status(400).send('FAILURE');

  if (p.ProcReturnCode === '00') {
    const result = await confirmBookingPayment(p.oid, { paymentRef: p.TransId || p.oid });
    if (result.ok) return res.send('ACTION=POSTAUTH'); // capture the pre-authorization
    // OVERSOLD (or missing booking): do not capture → pre-auth is released.
    return res.send('FAILURE');
  }
  await markBookingClosed(p.oid, 'FAILED');
  res.send('FAILURE');
});

// CMI: browser return (okUrl / failUrl) — hash-verified, then same confirm path.
// Never trusts the redirect alone: the hash proves the params came from CMI.
router.post('/cmi/return', async (req, res) => {
  const p = req.body || {};
  const base = clientBaseUrl();
  if (!p.oid) return res.redirect(`${base}/billetterie`);
  if (verifyCmiHash(p)) {
    if (p.ProcReturnCode === '00') {
      await confirmBookingPayment(p.oid, { paymentRef: p.TransId || p.oid });
    } else {
      await markBookingClosed(p.oid, 'FAILED');
    }
  }
  res.redirect(`${base}/billetterie/confirmation/${encodeURIComponent(p.oid)}`);
});

// CMI: initiate payment — returns gateway URL + signed form fields to auto-submit.
// Read-only with respect to seats.
router.post('/:reference/pay', async (req, res, next) => {
  try {
    const booking = await Booking.findOne({ where: { reference: req.params.reference } });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.paymentStatus === 'PAID') return res.status(409).json({ error: 'Booking already paid' });
    if (['CANCELLED', 'EXPIRED'].includes(booking.paymentStatus)) return res.status(409).json({ error: 'Booking is closed' });
    if (Number(booking.totalMad) <= 0) return res.status(400).json({ error: 'Nothing to pay' });
    if (!cmiConfigured()) return res.status(503).json({ error: 'Payment gateway not configured' });
    res.json(buildPaymentForm(booking, { lang: req.body?.lang }));
  } catch (e) { next(e); }
});

// Admin: confirm an on-site (cash) payment — same locked, idempotent path.
router.post('/:reference/mark-paid', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const result = await confirmBookingPayment(req.params.reference, { paymentRef: 'ONSITE-' + Date.now() });
    if (!result.ok) {
      return res.status(result.code === 'NOT_FOUND' ? 404 : 409).json({ error: result.code });
    }
    res.json({ ok: true, booking: result.booking });
  } catch (e) { next(e); }
});

// Retrieve booking + e-tickets by reference (confirmation page)
router.get('/:reference', async (req, res, next) => {
  try {
    const booking = await Booking.findOne({
      where: { reference: req.params.reference },
      include: [Ticket, { model: ShowDate, as: 'showDate', include: [Show, Venue] }]
    });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json(booking);
  } catch (e) { next(e); }
});

// Admin: list all bookings
router.get('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const items = await Booking.findAll({
      include: [Ticket, { model: ShowDate, as: 'showDate', include: [Show, Venue] }],
      order: [['id', 'DESC']], limit: 500
    });
    res.json({ items });
  } catch (e) { next(e); }
});

export default router;
