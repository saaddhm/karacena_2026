import { sequelize, Booking, Ticket, ShowDate } from '../models/index.js';
import { generateTicketCode, generateQr } from '../utils/tickets.js';

/**
 * Confirm a booking's payment — the ONLY place seats_booked is incremented.
 *
 * Guarantees:
 * - Idempotent: if the booking is already PAID (webhook retries), returns success
 *   without touching seats or tickets again.
 * - Oversell-safe: SELECT … FOR UPDATE on both the booking row (serializes
 *   concurrent webhooks for the same booking) and the show_date row (serializes
 *   concurrent buyers of the same date), then re-checks availability before
 *   incrementing.
 * - Atomic: status flip, seat increment and ticket creation share one MySQL
 *   transaction — all or nothing.
 *
 * Returns { ok, booking?, alreadyPaid?, code? } — code ∈ NOT_FOUND | DATE_NOT_FOUND | OVERSOLD.
 */
export async function confirmBookingPayment(reference, { paymentRef } = {}) {
  const t = await sequelize.transaction();
  let oversoldBooking = null;
  try {
    const booking = await Booking.findOne({
      where: { reference }, lock: t.LOCK.UPDATE, transaction: t
    });
    if (!booking) { await t.rollback(); return { ok: false, code: 'NOT_FOUND' }; }

    // Idempotency: payment provider may call the webhook more than once.
    if (booking.paymentStatus === 'PAID') {
      await t.commit();
      return { ok: true, booking, alreadyPaid: true };
    }

    if (booking.showDateId) {
      const showDate = await ShowDate.findByPk(booking.showDateId, {
        lock: t.LOCK.UPDATE, transaction: t
      });
      if (!showDate) { await t.rollback(); return { ok: false, code: 'DATE_NOT_FOUND' }; }
      if (showDate.status === 'CANCELLED' || showDate.seatsBooked + booking.quantity > showDate.seatsTotal) {
        oversoldBooking = booking;
        const err = new Error('OVERSOLD'); err.code = 'OVERSOLD'; throw err;
      }
      showDate.seatsBooked += booking.quantity;
      if (showDate.seatsBooked >= showDate.seatsTotal) showDate.status = 'SOLD_OUT';
      await showDate.save({ transaction: t });
    }

    // Tickets are only created here, after verified payment.
    const existing = await Ticket.count({ where: { bookingId: booking.id }, transaction: t });
    for (let i = existing; i < booking.quantity; i++) {
      const code = generateTicketCode();
      const qrDataUrl = await generateQr(code); // QR carries only the opaque token
      await Ticket.create({
        bookingId: booking.id,
        code,
        serial: `${booking.reference}-${String(i + 1).padStart(2, '0')}`,
        qrDataUrl,
        holderName: booking.customerName
      }, { transaction: t });
    }

    await booking.update({
      paymentStatus: 'PAID',
      paymentRef: paymentRef || booking.paymentRef
    }, { transaction: t });

    await t.commit();
    return { ok: true, booking };
  } catch (e) {
    await t.rollback();
    if (e.code === 'OVERSOLD' && oversoldBooking) {
      // Customer paid but seats ran out between checkout and confirmation:
      // flag for manual review / refund, never allocate seats.
      await oversoldBooking.update({
        paymentStatus: 'FAILED',
        paymentRef: `REVIEW-OVERSOLD${paymentRef ? ':' + paymentRef : ''}`
      });
      return { ok: false, code: 'OVERSOLD', booking: oversoldBooking };
    }
    throw e;
  }
}

/** Mark a still-pending booking as failed/cancelled/expired (never touches seats). */
export async function markBookingClosed(reference, status = 'FAILED') {
  const booking = await Booking.findOne({ where: { reference } });
  if (booking && booking.paymentStatus === 'PENDING') await booking.update({ paymentStatus: status });
  return booking;
}
