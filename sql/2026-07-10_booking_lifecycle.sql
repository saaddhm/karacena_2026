-- Booking lifecycle migration (run once against karacena_2026)
-- 1) Payment methods: PayPal removed.
UPDATE bookings SET payment_method = 'CMI' WHERE payment_method NOT IN ('CMI', 'ONSITE');
ALTER TABLE bookings
  MODIFY payment_method ENUM('CMI', 'ONSITE') NOT NULL DEFAULT 'CMI';

-- 2) Full booking status set: pending / paid / failed / cancelled / expired / refunded.
ALTER TABLE bookings
  MODIFY payment_status ENUM('PENDING', 'PAID', 'FAILED', 'CANCELLED', 'EXPIRED', 'REFUNDED') NOT NULL DEFAULT 'PENDING';

-- 3) Repair seats_booked: the old flow counted seats at booking creation
--    (before payment). Recompute from PAID bookings only.
UPDATE show_dates sd
SET sd.seats_booked = (
  SELECT COALESCE(SUM(b.quantity), 0)
  FROM bookings b
  WHERE b.show_date_id = sd.id AND b.payment_status = 'PAID'
);

-- 4) Refresh SOLD_OUT flags after the recount.
UPDATE show_dates
SET status = IF(seats_booked >= seats_total, 'SOLD_OUT', 'SCHEDULED')
WHERE status IN ('SCHEDULED', 'SOLD_OUT');

-- 5) Ticket system: human-readable serial, check-in metadata, refunded status.
ALTER TABLE tickets ADD COLUMN serial VARCHAR(40) NULL UNIQUE AFTER code;
ALTER TABLE tickets ADD COLUMN checked_in_by VARCHAR(120) NULL AFTER scanned_at;
ALTER TABLE tickets MODIFY status ENUM('VALID', 'USED', 'CANCELLED', 'REFUNDED') DEFAULT 'VALID';

-- 6) Backfill serials for any existing tickets.
UPDATE tickets tk
JOIN bookings b ON b.id = tk.booking_id
JOIN (SELECT id, ROW_NUMBER() OVER (PARTITION BY booking_id ORDER BY id) rn FROM tickets) x ON x.id = tk.id
SET tk.serial = CONCAT(b.reference, '-', LPAD(x.rn, 2, '0'))
WHERE tk.serial IS NULL;
