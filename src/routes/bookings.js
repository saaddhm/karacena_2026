import { Router } from 'express';
import { body } from 'express-validator';
import { sequelize, Booking, Ticket, ShowDate, Show, Venue } from '../models/index.js';
import { validate } from '../middleware/validate.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { generateReference } from '../utils/tickets.js';
import { buildPaymentForm, verifyCmiHashDetailed, cmiConfigured, clientBaseUrl } from '../utils/cmi.js';
import { confirmBookingPayment, markBookingClosed } from '../utils/bookingService.js';
import { streamBookingTicketsPdf } from '../utils/ticketPdf.js';
import { getBoolSetting } from '../utils/settings.js';

const router = Router();
const PASS_PRICE_MAD = 350;

// Create booking (public) — creates a PENDING booking only.
// Seats are NOT incremented and tickets are NOT created here; that happens
// exclusively in confirmBookingPayment() after payment is verified.
router.post('/',
  body('customerName').trim().isLength({ min: 2, max: 180 }),
  body('customerEmail').isEmail().normalizeEmail(),
  // `quantity` = nombre d'adultes (rétrocompatible), `quantityChild` = enfants.
  body('quantity').isInt({ min: 0, max: 10 }),
  body('quantityChild').optional().isInt({ min: 0, max: 10 }),
  body('type').isIn(['SINGLE', 'PASS']),
  body('paymentMethod').isIn(['CMI', 'ONSITE']),
  validate,
  async (req, res, next) => {
    // Garde globale : les réservations peuvent être bloquées depuis l'admin.
    if (!(await getBoolSetting('reservations_enabled'))) {
      return res.status(503).json({ error: 'RESERVATIONS_DISABLED' });
    }
    const t = await sequelize.transaction();
    let booking;
    try {
      const { type, showDateId, customerName, customerEmail, customerPhone, paymentMethod } = req.body;
      const adults = Number(req.body.quantity) || 0;
      const children = Number(req.body.quantityChild) || 0;
      const totalSeats = adults + children;
      if (totalSeats < 1 || totalSeats > 10) {
        await t.rollback(); return res.status(400).json({ error: 'Invalid quantity' });
      }

      let adultUnit = PASS_PRICE_MAD;
      let childUnit = PASS_PRICE_MAD; // le pass n'a pas de tarif enfant distinct

      if (type === 'SINGLE') {
        const showDate = await ShowDate.findByPk(showDateId, {
          include: [Show], lock: t.LOCK.UPDATE, transaction: t
        });
        if (!showDate) { await t.rollback(); return res.status(404).json({ error: 'Show date not found' }); }
        // Availability pre-check (real enforcement happens again, under lock,
        // at payment confirmation). available = seatsTotal - seatsBooked (paid only).
        if (showDate.status !== 'SCHEDULED' || showDate.seatsBooked + totalSeats > showDate.seatsTotal) {
          await t.rollback(); return res.status(409).json({ error: 'Not enough seats available' });
        }
        const show = showDate.show;
        adultUnit = show.isFree ? 0 : Number(show.priceMad);
        // Tarif enfant : celui du spectacle s'il existe, sinon = tarif adulte.
        childUnit = show.isFree ? 0
          : (show.priceChildMad != null ? Number(show.priceChildMad) : adultUnit);
      }

      const totalMad = adults * adultUnit + children * childUnit;

      booking = await Booking.create({
        reference: generateReference(),
        customerName, customerEmail, customerPhone,
        type,
        quantity: totalSeats,   // total places → seats & billets inchangés
        quantityChild: children,
        showDateId: type === 'SINGLE' ? showDateId : null,
        totalMad,
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
// Fully wrapped: a thrown exception here must NEVER become an HTTP 500 or an
// unhandled rejection (Express 4 does not catch async errors → PM2 crash loop).
// CMI expects a plain-text answer: ACTION=POSTAUTH captures the pre-auth,
// FAILURE releases it (the customer is never debited without tickets).
router.post('/cmi/callback', async (req, res) => {
  const p = req.body || {};
  // Safe diagnostic log: field NAMES + result codes only, never card data or hash.
  console.log(`[payment][cb] ${req.method} oid=${p.oid || '-'} ProcReturnCode=${p.ProcReturnCode || '-'} tx=${p.TransId || '-'} fields=[${Object.keys(p).join(',')}]`);
  try {
    if (!p.oid) { console.warn('[payment] callback without oid'); return res.status(400).send('FAILURE'); }

    const check = verifyCmiHashDetailed(p);
    if (!check.valid) {
      // Full diagnostics (store key is masked inside plainMasked).
      console.warn(
        `[payment] callback oid=${p.oid} INVALID HASH — ignored\n` +
        `  Expected hash (PHP-decoded variant): ${check.expected}\n` +
        `  Expected hash (raw variant):         ${check.expectedRawVariant}\n` +
        `  Received hash:                       ${check.received || '(none)'}\n` +
        `  Field count:    ${check.fieldCount}\n` +
        `  Fields used:    ${check.fieldsUsed.join(',')}\n` +
        `  Excluded fields:${check.excludedFields.join(',') || '(none posted)'}\n` +
        `  Plain string before SHA512: ${check.plainMasked}`
      );
      return res.status(400).send('FAILURE');
    }

    // Merchant validation: the callback must belong to OUR clientid.
    if (p.clientid && String(p.clientid) !== String(process.env.CMI_MERCHANT_ID)) {
      console.warn(`[payment] callback oid=${p.oid} clientid mismatch (${p.clientid}) — ignored`);
      return res.status(400).send('FAILURE');
    }

    if (p.ProcReturnCode === '00') {
      // Booking + amount validation BEFORE capture.
      const booking = await Booking.findOne({ where: { reference: p.oid } });
      if (!booking) {
        console.warn(`[payment] callback oid=${p.oid} unknown booking — NOT captured`);
        return res.send('FAILURE');
      }
      if (p.amount !== undefined && Math.abs(Number(p.amount) - Number(booking.totalMad)) > 0.009) {
        console.warn(`[payment] callback oid=${p.oid} AMOUNT MISMATCH gateway=${p.amount} booking=${booking.totalMad} — NOT captured`);
        return res.send('FAILURE');
      }

      const result = await confirmBookingPayment(p.oid, { paymentRef: p.TransId || p.oid });
      if (result.ok) {
        console.log(`[payment] callback oid=${p.oid} ${result.alreadyPaid ? 'duplicate ignored (already PAID)' : 'CONFIRMED → PAID'} tx=${p.TransId || '-'}`);
        return res.send('ACTION=POSTAUTH'); // capture the pre-authorization
      }
      // OVERSOLD (or missing booking): do not capture → the pre-auth is released,
      // the customer is never debited without tickets.
      console.warn(`[payment] callback oid=${p.oid} NOT captured (${result.code})`);
      return res.send('FAILURE');
    }
    await markBookingClosed(p.oid, 'FAILED');
    console.log(`[payment] callback oid=${p.oid} declined ProcReturnCode=${p.ProcReturnCode}`);
    return res.send('FAILURE');
  } catch (e) {
    // The stack identifies the exact faulty line in pm2 logs.
    console.error(`[payment] callback oid=${p.oid || '-'} EXCEPTION:`, e.stack || e.message);
    return res.status(200).send('FAILURE');
  }
});

// CMI: browser return (okUrl / failUrl). CMI normally POSTs the result here,
// but the browser can also arrive via GET (3-D Secure redirect chains, page
// refresh, back button, manual open) — both must redirect to the React site.
// This route NEVER finalizes a payment. Finalization happens EXCLUSIVELY in
// the hash-verified server-to-server callback above. Here we only READ the
// booking status from the database and redirect the customer accordingly.
async function handleCmiReturn(req, res) {
  const p = { ...(req.query || {}), ...(req.body || {}) };
  const base = clientBaseUrl();
  const oid = typeof p.oid === 'string' ? p.oid : '';
  const to = (page, ref) =>
    res.redirect(`${base}/paiement/${page}${ref ? `?reference=${encodeURIComponent(ref)}` : ''}`);

  try {
    console.log(`[payment][return] ${req.method} oid=${oid || '-'} ProcReturnCode=${p.ProcReturnCode || '-'} fields=[${Object.keys(p).join(',')}]`);
    if (!oid) {
      console.warn('[payment] return without oid → echec');
      return to('echec');
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
    // Never a 500 for the customer: log the stack, redirect to the site.
    console.error(`[payment] return oid=${oid || '-'} EXCEPTION:`, e.stack || e.message);
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
    // Garde globale : le paiement en ligne peut être désactivé depuis l'admin.
    if (!(await getBoolSetting('online_payment_enabled'))) {
      return res.status(503).json({ error: 'ONLINE_PAYMENT_DISABLED' });
    }
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

// Public: ALL tickets of a booking as one multi-page PDF (capability URL —
// the unguessable crypto-random reference IS the authorization, same rule as
// the single-ticket endpoint).
router.get('/:reference/tickets.pdf', async (req, res, next) => {
  try {
    const booking = await Booking.findOne({
      where: { reference: req.params.reference },
      include: [Ticket, { model: ShowDate, as: 'showDate', include: [Show, Venue] }]
    });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.paymentStatus !== 'PAID') return res.status(403).json({ error: 'Booking not paid' });
    const tickets = booking.tickets || [];
    if (!tickets.length) return res.status(404).json({ error: 'No tickets for this booking' });

    const locale = req.query.lang === 'en' ? 'en' : 'fr';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="KARACENA-2026-${booking.reference}.pdf"`);
    await streamBookingTicketsPdf(res, tickets.map((tk) => ({
      serial: tk.serial,
      code: tk.code,
      status: tk.status,
      holderName: tk.holderName,
      qrDataUrl: tk.qrDataUrl,
      booking,
      show: booking.showDate?.show,
      showDate: booking.showDate,
      venue: booking.showDate?.venue,
      locale
    })));
  } catch (e) {
    if (e.code === 'ERR_MODULE_NOT_FOUND') {
      return res.status(503).json({ error: 'PDF module not installed — run: npm install (server)' });
    }
    next(e);
  }
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
