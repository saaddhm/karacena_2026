import { sequelize } from '../config/db.js';

async function columnType(table, column) {
  const [rows] = await sequelize.query(
    `SELECT COLUMN_TYPE ct FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table AND COLUMN_NAME = :column`,
    { replacements: { table, column } }
  );
  return rows[0]?.ct || null; // null = column doesn't exist
}

/**
 * Idempotent in-place migrations for existing databases.
 * Fresh databases get the right schema from sequelize.sync(); this reconciles
 * tables created before the booking-lifecycle / ticket-system changes.
 */
export async function runMigrations() {
  const q = (sql) => sequelize.query(sql);

  // 1) bookings.payment_method → ENUM('CMI','ONSITE')
  let ct = await columnType('bookings', 'payment_method');
  if (ct && ct.includes('PAYPAL')) {
    await q(`UPDATE bookings SET payment_method = 'CMI' WHERE payment_method NOT IN ('CMI', 'ONSITE')`);
    await q(`ALTER TABLE bookings MODIFY payment_method ENUM('CMI', 'ONSITE') NOT NULL DEFAULT 'CMI'`);
    console.log('✔ migrated bookings.payment_method');
  }

  // 2) bookings.payment_status → full lifecycle enum
  ct = await columnType('bookings', 'payment_status');
  if (ct && !ct.includes('CANCELLED')) {
    await q(`ALTER TABLE bookings MODIFY payment_status
             ENUM('PENDING', 'PAID', 'FAILED', 'CANCELLED', 'EXPIRED', 'REFUNDED') NOT NULL DEFAULT 'PENDING'`);
    console.log('✔ migrated bookings.payment_status');
  }

  // 3) tickets.serial (+ backfill + one-time seats_booked recount)
  if (!(await columnType('tickets', 'serial'))) {
    await q(`ALTER TABLE tickets ADD COLUMN serial VARCHAR(40) NULL UNIQUE AFTER code`);
    try {
      await q(`UPDATE tickets tk
               JOIN bookings b ON b.id = tk.booking_id
               JOIN (SELECT id, ROW_NUMBER() OVER (PARTITION BY booking_id ORDER BY id) rn FROM tickets) x ON x.id = tk.id
               SET tk.serial = CONCAT(b.reference, '-', LPAD(x.rn, 2, '0'))
               WHERE tk.serial IS NULL`);
    } catch (e) { console.warn('⚠ serial backfill skipped:', e.message); }
    // Old flow counted seats at creation (before payment) — recount from PAID bookings.
    await q(`UPDATE show_dates sd SET sd.seats_booked = (
               SELECT COALESCE(SUM(b.quantity), 0) FROM bookings b
               WHERE b.show_date_id = sd.id AND b.payment_status = 'PAID')`);
    await q(`UPDATE show_dates SET status = IF(seats_booked >= seats_total, 'SOLD_OUT', 'SCHEDULED')
             WHERE status IN ('SCHEDULED', 'SOLD_OUT')`);
    console.log('✔ migrated tickets.serial + recounted seats_booked');
  }

  // 4) tickets.checked_in_by
  if (!(await columnType('tickets', 'checked_in_by'))) {
    await q(`ALTER TABLE tickets ADD COLUMN checked_in_by VARCHAR(120) NULL AFTER scanned_at`);
    console.log('✔ migrated tickets.checked_in_by');
  }

  // 5) tickets.status → includes REFUNDED
  ct = await columnType('tickets', 'status');
  if (ct && !ct.includes('REFUNDED')) {
    await q(`ALTER TABLE tickets MODIFY status ENUM('VALID', 'USED', 'CANCELLED', 'REFUNDED') DEFAULT 'VALID'`);
    console.log('✔ migrated tickets.status');
  }
}
