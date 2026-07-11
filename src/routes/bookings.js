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
  if (!p.oid) { console.warn('[payment] callback without oid'); return res.status(400).send('FAILURE'); }
  if (!verifyCmiHash(p)) {
    console.warn(`[payment] callback oid=${p.oid} INVALID HASH — ignored`);
    return res.status(400).send('FAILURE');
  }

  if (p.ProcReturnCode === '00') {
    const result = await confirmBookingPayment(p.oid, { paymentRef: p.TransId || p.oid });
    if (result.ok) {
      console.log(`[payment] callback oid=${p.oid} ${result.alreadyPaid ? 'duplicate ignored (already PAID)' : 'CONFIRMED → PAID'} tx=${p.TransId || '-'}`);
      return res.send('ACTION=POSTAUTH'); // capture the pre-authorization
    }
    // OVERSOLD (or missing booking): do not capture → pre-auth is released.
    console.warn(`[payment] callback oid=${p.oid} NOT captured (${result.code})`);
    return res.send('FAILURE');
  }
  await markBookingClosed(p.oid, 'FAILED');
  console.log(`[payment] callback oid=${p.oid} declined ProcReturnCode=${p.ProcReturnCode}`);
  res.send('FAILURE');
});

// CMI: browser return (okUrl / failUrl). CMI normally POSTs the result here,
// but the browser can also arrive via GET (3-D Secure redirect chains, page
// refresh, back button, manual open) — both must redirect to the React site.
// Reaching this URL NEVER marks a booking paid by itself: only hash-verified
// CMI data may finalize, and the redirect decision reads the DATABASE state
// (the server-to-server callback may have already settled it either way).
async function handleCmiReturn(req, res) {
  const p = { ...(req.query || {}), ...(req.body || {}) };
  const base = clientBaseUrl();
  const oid = typeof p.oid === 'string' ? p.oid : '';
  const to = (page, ref) =>
    res.redirect(`${base}/paiement/${page}${ref ? `?reference=${encodeURIComponent(ref)}` : ''}`);

  try {
    if (!oid) {
      console.warn('[payment] return without oid → echec');
      return to('echec');
    }

    // Same authenticity rule as the callback: only a valid HASH can finalize.
    if (p.HASH && verifyCmiHash(p)) {
      if (p.ProcReturnCode === '00') {
        const result = await confirmBookingPayment(oid, { paymentRef: p.TransId || oid });
        console.log(`[payment] return oid=${oid} verified ok → ${result.ok ? (result.alreadyPaid ? 'already PAID' : 'PAID') : result.code}`);
      } else {
        await markBookingClosed(oid, 'FAILED');
        console.log(`[payment] return oid=${oid} declined ProcReturnCode=${p.ProcReturnCode}`);
      }
    } else {
      console.log(`[payment] return oid=${oid} unverified (${p.HASH ? 'bad hash' : 'no hash'}) → deciding from DB`);
    }

    // Source of truth: current booking status in the database.
    const booking = await Booking.findOne({ where: { reference: oid } });
    if (!booking) return to('echec');
    if (booking.paymentStatus === 'PAID') {
      console.log(`[payment] return oid=${oid} redirect → succes`);
      return to('succes', oid);
    }
    if (['FAILED', 'CANCELLED', 'EXPIRED', 'REFUNDED'].includes(booking.paymentStatus)) {
      console.log(`[payment] return oid=${oid} redirect → echec`);
      return to('echec', oid);
    }
    console.log(`[payment] return oid=${oid} redirect → en-attente`);
    return to('en-attente', oid);
  } catch (e) {
    console.error('[payment] return handler error:', e.message);
    return to(oid ? 'en-attente' : 'echec', oid || undefined);
  }
}
router.post('/cmi/return', handleCmiReturn);
router.get('/cmi/return', handleCmiReturn);

// Public: safe status for the pending-page polling. Exposes ONLY the state.
// Booking references are unguessable (crypto-random), which prevents enumeration.
router.get('/:reference/payment-status', async (req, res, next) => {
  try {
    const booking = await Booking.findOne({
      where: { reference: req.params.reference }, attributes: ['paymentStatus']
    });
    if (!booking) return res.status(404).json({ status: 'unknown' });
    const st = booking.paymentStatus === 'PAID' ? 'paid'
      : booking.paymentStatus === 'PENDING' ? 'pending' : 'failed';
    res.json({ status: st });
  } catch (e) { next(e); }
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
