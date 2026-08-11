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

  // 6) users.role → 4 niveaux (superadmin, admin, editor, user)
  ct = await columnType('users', 'role');
  if (ct && !ct.includes('superadmin')) {
    await q(`ALTER TABLE users MODIFY role ENUM('superadmin', 'admin', 'editor', 'user') NOT NULL DEFAULT 'editor'`);
    console.log('✔ migrated users.role (4 rôles)');
  }

  // 7) users.status / last_login / created_by / updated_by
  if (!(await columnType('users', 'status'))) {
    await q(`ALTER TABLE users ADD COLUMN status ENUM('active', 'inactive') NOT NULL DEFAULT 'active' AFTER role`);
    console.log('✔ migrated users.status');
  }
  if (!(await columnType('users', 'last_login'))) {
    await q(`ALTER TABLE users ADD COLUMN last_login DATETIME NULL AFTER status`);
    console.log('✔ migrated users.last_login');
  }
  if (!(await columnType('users', 'created_by'))) {
    await q(`ALTER TABLE users ADD COLUMN created_by INT UNSIGNED NULL AFTER last_login`);
    await q(`ALTER TABLE users ADD COLUMN updated_by INT UNSIGNED NULL AFTER created_by`);
    console.log('✔ migrated users.created_by / updated_by');
  }

  // 8b) Champs arabes (*_ar) — ajout idempotent, conserve fr/en.
  const arabicColumns = [
    ['shows', 'title_ar', 'VARCHAR(255) NULL AFTER title_en'],
    ['shows', 'summary_ar', 'TEXT NULL AFTER summary_en'],
    ['shows', 'description_ar', 'LONGTEXT NULL AFTER description_en'],
    ['venues', 'name_ar', 'VARCHAR(180) NULL AFTER name_en'],
    ['venues', 'address_ar', 'VARCHAR(255) NULL AFTER address_en'],
    ['venues', 'description_ar', 'TEXT NULL AFTER description_en'],
    ['venues', 'access_info_ar', 'TEXT NULL AFTER access_info_en'],
    ['artists', 'name_ar', 'VARCHAR(180) NULL AFTER name'],
    ['artists', 'discipline_ar', 'VARCHAR(180) NULL AFTER discipline'],
    ['artists', 'bio_ar', 'TEXT NULL AFTER bio_en'],
    ['blog_posts', 'title_ar', 'VARCHAR(255) NULL AFTER title_en'],
    ['blog_posts', 'excerpt_ar', 'TEXT NULL AFTER excerpt_en'],
    ['blog_posts', 'body_ar', 'LONGTEXT NULL AFTER body_en'],
    ['partners', 'description_ar', 'TEXT NULL AFTER description_en'],
    ['historical_editions', 'theme_ar', 'VARCHAR(255) NULL AFTER theme_en'],
    ['historical_editions', 'description_ar', 'TEXT NULL AFTER description_en']
  ];
  for (const [table, column, definition] of arabicColumns) {
    if (!(await columnType(table, column))) {
      try {
        await q(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
        console.log(`✔ migrated ${table}.${column}`);
      } catch (e) {
        // Retombe sans la clause AFTER si la colonne de référence manque.
        try {
          await q(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition.replace(/\s+AFTER\s+\w+/i, '')}`);
          console.log(`✔ migrated ${table}.${column} (sans AFTER)`);
        } catch (e2) {
          console.warn(`⚠ ${table}.${column} skipped:`, e2.message);
        }
      }
    }
  }

  // 8c) newsletter_subscribers.locale → inclut 'ar'
  ct = await columnType('newsletter_subscribers', 'locale');
  if (ct && !ct.includes("'ar'")) {
    await q(`ALTER TABLE newsletter_subscribers MODIFY locale ENUM('fr','en','ar') NOT NULL DEFAULT 'fr'`);
    console.log('✔ migrated newsletter_subscribers.locale (ar)');
  }

  // 8e) tarifs enfant (shows.price_child_mad) + ventilation (bookings.quantity_child)
  if (!(await columnType('shows', 'price_child_mad'))) {
    await q(`ALTER TABLE shows ADD COLUMN price_child_mad DECIMAL(8,2) NULL AFTER price_mad`);
    console.log('✔ migrated shows.price_child_mad');
  }
  if (!(await columnType('bookings', 'quantity_child'))) {
    await q(`ALTER TABLE bookings ADD COLUMN quantity_child INT NOT NULL DEFAULT 0 AFTER quantity`);
    console.log('✔ migrated bookings.quantity_child');
  }

  // 8f) shows.display_order — ordre d'affichage personnalisable (spectacles à l'affiche)
  if (!(await columnType('shows', 'display_order'))) {
    try {
      await q(`ALTER TABLE shows ADD COLUMN display_order INT NOT NULL DEFAULT 0 AFTER is_published`);
      console.log('✔ migrated shows.display_order');
    } catch (e) {
      // Retombe sans la clause AFTER si la colonne de référence manque.
      await q(`ALTER TABLE shows ADD COLUMN display_order INT NOT NULL DEFAULT 0`);
      console.log('✔ migrated shows.display_order (sans AFTER)');
    }
  }

  // 8d) settings (réglages globaux clé/valeur) + valeur par défaut
  await q(`CREATE TABLE IF NOT EXISTS settings (
    \`key\` VARCHAR(80) NOT NULL PRIMARY KEY,
    value VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await q(`INSERT IGNORE INTO settings (\`key\`, value) VALUES ('online_payment_enabled', 'true')`);
  await q(`INSERT IGNORE INTO settings (\`key\`, value) VALUES ('reservations_enabled', 'true')`);

  // 8) audit_logs (journal des actions d'administration)
  await q(`CREATE TABLE IF NOT EXISTS audit_logs (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    action VARCHAR(60) NOT NULL,
    target_type VARCHAR(60) DEFAULT 'user',
    target_id INT UNSIGNED NULL,
    target_label VARCHAR(255) NULL,
    actor_id INT UNSIGNED NULL,
    actor_email VARCHAR(180) NULL,
    ip VARCHAR(64) NULL,
    details JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_action (action),
    INDEX idx_audit_target (target_type, target_id),
    INDEX idx_audit_created (created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
}
