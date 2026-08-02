-- =====================================================================
-- KARACENA 2026 — Programme du festival (21 → 31 août, Salé)
-- Idempotent : ré-exécutable sans doublon.
--   - lieux & spectacles : INSERT IGNORE (slug unique)
--   - séances : INSERT ... SELECT ... WHERE NOT EXISTS
-- Horaires en heure locale (Maroc). Prix laissés à 0 → à ajuster en admin.
-- =====================================================================

START TRANSACTION;

-- ---------- LIEUX ----------
INSERT IGNORE INTO venues (slug, name_fr, name_en, created_at, updated_at) VALUES
 ('medina-sale', 'Médina de Salé', 'Médina de Salé', NOW(), NOW()),
 ('bab-lamrissa', 'Bab Lamrissa', 'Bab Lamrissa', NOW(), NOW()),
 ('centre-ibn-toumert', 'Centre Culturel Ibn Toumert', 'Centre Culturel Ibn Toumert', NOW(), NOW()),
 ('bab-fes', 'Bab Fès', 'Bab Fès', NOW(), NOW()),
 ('esplanade-sidi-moussa', 'Esplanade de Sidi Moussa', 'Esplanade de Sidi Moussa', NOW(), NOW()),
 ('chapiteau-mawsim', 'Chapiteau Mawsim — ENC Shems''y', 'Chapiteau Mawsim — ENC Shems''y', NOW(), NOW()),
 ('chapiteau-pedagogique', 'Chapiteau pédagogique — ENC Shems''y', 'Chapiteau pédagogique — ENC Shems''y', NOW(), NOW()),
 ('bab-hssain', 'Bab Hssain', 'Bab Hssain', NOW(), NOW()),
 ('marina-sale', 'Marina de Salé', 'Marina de Salé', NOW(), NOW()),
 ('jardin-hay-essalam', 'Jardin Hay Essalam (près du tram)', 'Jardin Hay Essalam (près du tram)', NOW(), NOW()),
 ('espace-artisanat-medina', 'Espace de Vente et d''Exposition des Produits Artisanaux (Médina de Salé)', 'Espace de Vente et d''Exposition des Produits Artisanaux (Médina de Salé)', NOW(), NOW());

-- ---------- SPECTACLES ----------
INSERT IGNORE INTO shows (slug, title_fr, title_en, category, summary_fr, summary_en, price_mad, is_free, is_published, created_at, updated_at) VALUES
 ('parade-ville-en-mouvement', 'La ville en mouvement — Parade', 'La ville en mouvement — Parade', 'AMESIP', 'Parade d''ouverture dans les rues de Salé.', 'Parade d''ouverture dans les rues de Salé.', 0, 1, 1, NOW(), NOW()),
 ('labordage-ouverture', 'L''Abordage — Ouverture de la biennale', 'L''Abordage — Ouverture de la biennale', 'AMESIP', 'Cérémonie d''ouverture de Karacena 2026.', 'Cérémonie d''ouverture de Karacena 2026.', 0, 1, 1, NOW(), NOW()),
 ('clother', 'Cloth.er', 'Cloth.er', 'INTERNATIONAL', 'Circo Hannover — Allemagne', 'Circo Hannover — Allemagne', 0, 0, 1, NOW(), NOW()),
 ('bateau', 'Bateau', 'Bateau', 'AMESIP', 'Ismail Errahali — Maroc', 'Ismail Errahali — Maroc', 0, 0, 1, NOW(), NOW()),
 ('moussa-enfant-de-la-mer', 'Moussa l''Enfant de la Mer', 'Moussa l''Enfant de la Mer', 'AMESIP', 'EAE Shems''y — Maroc', 'EAE Shems''y — Maroc', 0, 0, 1, NOW(), NOW()),
 ('jha', 'Jha', 'Jha', 'LAUREATS', 'ENC Shems''y — Le Grand Souffle — France / Maroc', 'ENC Shems''y — Le Grand Souffle — France / Maroc', 0, 0, 1, NOW(), NOW()),
 ('le-monde-a-lenvers', 'Le Monde à l''Envers', 'Le Monde à l''Envers', 'LAUREATS', 'ENC Shems''y — Cie la Rose des Vents — Maroc', 'ENC Shems''y — Cie la Rose des Vents — Maroc', 0, 0, 1, NOW(), NOW()),
 ('chajara', 'Chajara', 'Chajara', 'INTERNATIONAL', 'Cie Nejmah — France / Maroc', 'Cie Nejmah — France / Maroc', 0, 0, 1, NOW(), NOW()),
 ('zarbia', 'Zarbia', 'Zarbia', 'INTERNATIONAL', 'Cie Zid — France / Maroc', 'Cie Zid — France / Maroc', 0, 0, 1, NOW(), NOW()),
 ('rihla', 'Rihla', 'Rihla', 'INTERNATIONAL', 'La Carrière — France', 'La Carrière — France', 0, 0, 1, NOW(), NOW()),
 ('awal-qalam-2026', 'Awal Qalam 2026', 'Awal Qalam 2026', 'LAUREATS', 'ENC Shems''y — Maroc', 'ENC Shems''y — Maroc', 0, 0, 1, NOW(), NOW()),
 ('sopla', 'Sopla', 'Sopla', 'INTERNATIONAL', 'Cie Truca — Espagne', 'Cie Truca — Espagne', 0, 0, 1, NOW(), NOW()),
 ('mawja', 'Mawja', 'Mawja', 'LAUREATS', 'ENC Shems''y — Le Phare — France / Maroc', 'ENC Shems''y — Le Phare — France / Maroc', 0, 0, 1, NOW(), NOW()),
 ('expo-j-lioum', 'J-lioum (exposition)', 'J-lioum (exposition)', 'AMESIP', 'Institut Français du Maroc', 'Institut Français du Maroc', 0, 1, 1, NOW(), NOW()),
 ('expo-regards-aventure-collective', 'Regards sur une aventure collective (exposition)', 'Regards sur une aventure collective (exposition)', 'AMESIP', 'Exposition — Karacena 2026', 'Exposition — Karacena 2026', 0, 1, 1, NOW(), NOW());

-- ---------- SÉANCES ----------
-- Modèle idempotent : n'insère que si (show_id, venue_id, starts_at) n'existe pas.

-- Vendredi 21 août
INSERT INTO show_dates (show_id, venue_id, starts_at, ends_at, seats_total, seats_booked, status, created_at, updated_at)
SELECT s.id, v.id, '2026-08-21 11:00:00', NULL, 200, 0, 'SCHEDULED', NOW(), NOW() FROM shows s, venues v
WHERE s.slug='parade-ville-en-mouvement' AND v.slug='medina-sale'
AND NOT EXISTS (SELECT 1 FROM show_dates d WHERE d.show_id=s.id AND d.venue_id=v.id AND d.starts_at='2026-08-21 11:00:00');

INSERT INTO show_dates (show_id, venue_id, starts_at, ends_at, seats_total, seats_booked, status, created_at, updated_at)
SELECT s.id, v.id, '2026-08-21 20:30:00', NULL, 200, 0, 'SCHEDULED', NOW(), NOW() FROM shows s, venues v
WHERE s.slug='labordage-ouverture' AND v.slug='bab-lamrissa'
AND NOT EXISTS (SELECT 1 FROM show_dates d WHERE d.show_id=s.id AND d.venue_id=v.id AND d.starts_at='2026-08-21 20:30:00');

-- Samedi 22 août
INSERT INTO show_dates (show_id, venue_id, starts_at, ends_at, seats_total, seats_booked, status, created_at, updated_at)
SELECT s.id, v.id, '2026-08-22 16:00:00', NULL, 200, 0, 'SCHEDULED', NOW(), NOW() FROM shows s, venues v
WHERE s.slug='clother' AND v.slug='centre-ibn-toumert'
AND NOT EXISTS (SELECT 1 FROM show_dates d WHERE d.show_id=s.id AND d.venue_id=v.id AND d.starts_at='2026-08-22 16:00:00');

INSERT INTO show_dates (show_id, venue_id, starts_at, ends_at, seats_total, seats_booked, status, created_at, updated_at)
SELECT s.id, v.id, '2026-08-22 17:00:00', NULL, 200, 0, 'SCHEDULED', NOW(), NOW() FROM shows s, venues v
WHERE s.slug='bateau' AND v.slug='bab-fes'
AND NOT EXISTS (SELECT 1 FROM show_dates d WHERE d.show_id=s.id AND d.venue_id=v.id AND d.starts_at='2026-08-22 17:00:00');

INSERT INTO show_dates (show_id, venue_id, starts_at, ends_at, seats_total, seats_booked, status, created_at, updated_at)
SELECT s.id, v.id, '2026-08-22 18:00:00', NULL, 200, 0, 'SCHEDULED', NOW(), NOW() FROM shows s, venues v
WHERE s.slug='moussa-enfant-de-la-mer' AND v.slug='esplanade-sidi-moussa'
AND NOT EXISTS (SELECT 1 FROM show_dates d WHERE d.show_id=s.id AND d.venue_id=v.id AND d.starts_at='2026-08-22 18:00:00');

INSERT INTO show_dates (show_id, venue_id, starts_at, ends_at, seats_total, seats_booked, status, created_at, updated_at)
SELECT s.id, v.id, '2026-08-22 19:30:00', NULL, 200, 0, 'SCHEDULED', NOW(), NOW() FROM shows s, venues v
WHERE s.slug='jha' AND v.slug='chapiteau-mawsim'
AND NOT EXISTS (SELECT 1 FROM show_dates d WHERE d.show_id=s.id AND d.venue_id=v.id AND d.starts_at='2026-08-22 19:30:00');

INSERT INTO show_dates (show_id, venue_id, starts_at, ends_at, seats_total, seats_booked, status, created_at, updated_at)
SELECT s.id, v.id, '2026-08-22 21:00:00', NULL, 200, 0, 'SCHEDULED', NOW(), NOW() FROM shows s, venues v
WHERE s.slug='le-monde-a-lenvers' AND v.slug='chapiteau-pedagogique'
AND NOT EXISTS (SELECT 1 FROM show_dates d WHERE d.show_id=s.id AND d.venue_id=v.id AND d.starts_at='2026-08-22 21:00:00');

-- Dimanche 23 août
INSERT INTO show_dates (show_id, venue_id, starts_at, ends_at, seats_total, seats_booked, status, created_at, updated_at)
SELECT s.id, v.id, '2026-08-23 16:00:00', NULL, 200, 0, 'SCHEDULED', NOW(), NOW() FROM shows s, venues v
WHERE s.slug='clother' AND v.slug='centre-ibn-toumert'
AND NOT EXISTS (SELECT 1 FROM show_dates d WHERE d.show_id=s.id AND d.venue_id=v.id AND d.starts_at='2026-08-23 16:00:00');

INSERT INTO show_dates (show_id, venue_id, starts_at, ends_at, seats_total, seats_booked, status, created_at, updated_at)
SELECT s.id, v.id, '2026-08-23 17:00:00', NULL, 200, 0, 'SCHEDULED', NOW(), NOW() FROM shows s, venues v
WHERE s.slug='bateau' AND v.slug='bab-fes'
AND NOT EXISTS (SELECT 1 FROM show_dates d WHERE d.show_id=s.id AND d.venue_id=v.id AND d.starts_at='2026-08-23 17:00:00');

INSERT INTO show_dates (show_id, venue_id, starts_at, ends_at, seats_total, seats_booked, status, created_at, updated_at)
SELECT s.id, v.id, '2026-08-23 18:00:00', NULL, 200, 0, 'SCHEDULED', NOW(), NOW() FROM shows s, venues v
WHERE s.slug='moussa-enfant-de-la-mer' AND v.slug='esplanade-sidi-moussa'
AND NOT EXISTS (SELECT 1 FROM show_dates d WHERE d.show_id=s.id AND d.venue_id=v.id AND d.starts_at='2026-08-23 18:00:00');

INSERT INTO show_dates (show_id, venue_id, starts_at, ends_at, seats_total, seats_booked, status, created_at, updated_at)
SELECT s.id, v.id, '2026-08-23 19:30:00', NULL, 200, 0, 'SCHEDULED', NOW(), NOW() FROM shows s, venues v
WHERE s.slug='jha' AND v.slug='chapiteau-mawsim'
AND NOT EXISTS (SELECT 1 FROM show_dates d WHERE d.show_id=s.id AND d.venue_id=v.id AND d.starts_at='2026-08-23 19:30:00');

INSERT INTO show_dates (show_id, venue_id, starts_at, ends_at, seats_total, seats_booked, status, created_at, updated_at)
SELECT s.id, v.id, '2026-08-23 21:00:00', NULL, 200, 0, 'SCHEDULED', NOW(), NOW() FROM shows s, venues v
WHERE s.slug='le-monde-a-lenvers' AND v.slug='chapiteau-pedagogique'
AND NOT EXISTS (SELECT 1 FROM show_dates d WHERE d.show_id=s.id AND d.venue_id=v.id AND d.starts_at='2026-08-23 21:00:00');

-- Vendredi 28 août
INSERT INTO show_dates (show_id, venue_id, starts_at, ends_at, seats_total, seats_booked, status, created_at, updated_at)
SELECT s.id, v.id, '2026-08-28 17:00:00', NULL, 200, 0, 'SCHEDULED', NOW(), NOW() FROM shows s, venues v
WHERE s.slug='chajara' AND v.slug='bab-hssain'
AND NOT EXISTS (SELECT 1 FROM show_dates d WHERE d.show_id=s.id AND d.venue_id=v.id AND d.starts_at='2026-08-28 17:00:00');

INSERT INTO show_dates (show_id, venue_id, starts_at, ends_at, seats_total, seats_booked, status, created_at, updated_at)
SELECT s.id, v.id, '2026-08-28 17:00:00', NULL, 200, 0, 'SCHEDULED', NOW(), NOW() FROM shows s, venues v
WHERE s.slug='zarbia' AND v.slug='bab-fes'
AND NOT EXISTS (SELECT 1 FROM show_dates d WHERE d.show_id=s.id AND d.venue_id=v.id AND d.starts_at='2026-08-28 17:00:00');

INSERT INTO show_dates (show_id, venue_id, starts_at, ends_at, seats_total, seats_booked, status, created_at, updated_at)
SELECT s.id, v.id, '2026-08-28 18:00:00', NULL, 200, 0, 'SCHEDULED', NOW(), NOW() FROM shows s, venues v
WHERE s.slug='moussa-enfant-de-la-mer' AND v.slug='esplanade-sidi-moussa'
AND NOT EXISTS (SELECT 1 FROM show_dates d WHERE d.show_id=s.id AND d.venue_id=v.id AND d.starts_at='2026-08-28 18:00:00');

INSERT INTO show_dates (show_id, venue_id, starts_at, ends_at, seats_total, seats_booked, status, created_at, updated_at)
SELECT s.id, v.id, '2026-08-28 18:00:00', NULL, 200, 0, 'SCHEDULED', NOW(), NOW() FROM shows s, venues v
WHERE s.slug='rihla' AND v.slug='marina-sale'
AND NOT EXISTS (SELECT 1 FROM show_dates d WHERE d.show_id=s.id AND d.venue_id=v.id AND d.starts_at='2026-08-28 18:00:00');

INSERT INTO show_dates (show_id, venue_id, starts_at, ends_at, seats_total, seats_booked, status, created_at, updated_at)
SELECT s.id, v.id, '2026-08-28 19:30:00', NULL, 200, 0, 'SCHEDULED', NOW(), NOW() FROM shows s, venues v
WHERE s.slug='awal-qalam-2026' AND v.slug='chapiteau-pedagogique'
AND NOT EXISTS (SELECT 1 FROM show_dates d WHERE d.show_id=s.id AND d.venue_id=v.id AND d.starts_at='2026-08-28 19:30:00');

-- Samedi 29 août
INSERT INTO show_dates (show_id, venue_id, starts_at, ends_at, seats_total, seats_booked, status, created_at, updated_at)
SELECT s.id, v.id, '2026-08-29 17:00:00', NULL, 200, 0, 'SCHEDULED', NOW(), NOW() FROM shows s, venues v
WHERE s.slug='chajara' AND v.slug='bab-fes'
AND NOT EXISTS (SELECT 1 FROM show_dates d WHERE d.show_id=s.id AND d.venue_id=v.id AND d.starts_at='2026-08-29 17:00:00');

INSERT INTO show_dates (show_id, venue_id, starts_at, ends_at, seats_total, seats_booked, status, created_at, updated_at)
SELECT s.id, v.id, '2026-08-29 17:00:00', NULL, 200, 0, 'SCHEDULED', NOW(), NOW() FROM shows s, venues v
WHERE s.slug='zarbia' AND v.slug='bab-hssain'
AND NOT EXISTS (SELECT 1 FROM show_dates d WHERE d.show_id=s.id AND d.venue_id=v.id AND d.starts_at='2026-08-29 17:00:00');

INSERT INTO show_dates (show_id, venue_id, starts_at, ends_at, seats_total, seats_booked, status, created_at, updated_at)
SELECT s.id, v.id, '2026-08-29 18:00:00', NULL, 200, 0, 'SCHEDULED', NOW(), NOW() FROM shows s, venues v
WHERE s.slug='moussa-enfant-de-la-mer' AND v.slug='esplanade-sidi-moussa'
AND NOT EXISTS (SELECT 1 FROM show_dates d WHERE d.show_id=s.id AND d.venue_id=v.id AND d.starts_at='2026-08-29 18:00:00');

INSERT INTO show_dates (show_id, venue_id, starts_at, ends_at, seats_total, seats_booked, status, created_at, updated_at)
SELECT s.id, v.id, '2026-08-29 18:00:00', NULL, 200, 0, 'SCHEDULED', NOW(), NOW() FROM shows s, venues v
WHERE s.slug='rihla' AND v.slug='marina-sale'
AND NOT EXISTS (SELECT 1 FROM show_dates d WHERE d.show_id=s.id AND d.venue_id=v.id AND d.starts_at='2026-08-29 18:00:00');

-- Dimanche 30 août
INSERT INTO show_dates (show_id, venue_id, starts_at, ends_at, seats_total, seats_booked, status, created_at, updated_at)
SELECT s.id, v.id, '2026-08-30 17:00:00', NULL, 200, 0, 'SCHEDULED', NOW(), NOW() FROM shows s, venues v
WHERE s.slug='chajara' AND v.slug='bab-fes'
AND NOT EXISTS (SELECT 1 FROM show_dates d WHERE d.show_id=s.id AND d.venue_id=v.id AND d.starts_at='2026-08-30 17:00:00');

INSERT INTO show_dates (show_id, venue_id, starts_at, ends_at, seats_total, seats_booked, status, created_at, updated_at)
SELECT s.id, v.id, '2026-08-30 17:00:00', NULL, 200, 0, 'SCHEDULED', NOW(), NOW() FROM shows s, venues v
WHERE s.slug='zarbia' AND v.slug='bab-fes'
AND NOT EXISTS (SELECT 1 FROM show_dates d WHERE d.show_id=s.id AND d.venue_id=v.id AND d.starts_at='2026-08-30 17:00:00');

INSERT INTO show_dates (show_id, venue_id, starts_at, ends_at, seats_total, seats_booked, status, created_at, updated_at)
SELECT s.id, v.id, '2026-08-30 18:00:00', NULL, 200, 0, 'SCHEDULED', NOW(), NOW() FROM shows s, venues v
WHERE s.slug='moussa-enfant-de-la-mer' AND v.slug='esplanade-sidi-moussa'
AND NOT EXISTS (SELECT 1 FROM show_dates d WHERE d.show_id=s.id AND d.venue_id=v.id AND d.starts_at='2026-08-30 18:00:00');

INSERT INTO show_dates (show_id, venue_id, starts_at, ends_at, seats_total, seats_booked, status, created_at, updated_at)
SELECT s.id, v.id, '2026-08-30 18:00:00', NULL, 200, 0, 'SCHEDULED', NOW(), NOW() FROM shows s, venues v
WHERE s.slug='rihla' AND v.slug='jardin-hay-essalam'
AND NOT EXISTS (SELECT 1 FROM show_dates d WHERE d.show_id=s.id AND d.venue_id=v.id AND d.starts_at='2026-08-30 18:00:00');

INSERT INTO show_dates (show_id, venue_id, starts_at, ends_at, seats_total, seats_booked, status, created_at, updated_at)
SELECT s.id, v.id, '2026-08-30 19:00:00', NULL, 200, 0, 'SCHEDULED', NOW(), NOW() FROM shows s, venues v
WHERE s.slug='sopla' AND v.slug='chapiteau-pedagogique'
AND NOT EXISTS (SELECT 1 FROM show_dates d WHERE d.show_id=s.id AND d.venue_id=v.id AND d.starts_at='2026-08-30 19:00:00');

INSERT INTO show_dates (show_id, venue_id, starts_at, ends_at, seats_total, seats_booked, status, created_at, updated_at)
SELECT s.id, v.id, '2026-08-30 21:00:00', NULL, 200, 0, 'SCHEDULED', NOW(), NOW() FROM shows s, venues v
WHERE s.slug='mawja' AND v.slug='chapiteau-mawsim'
AND NOT EXISTS (SELECT 1 FROM show_dates d WHERE d.show_id=s.id AND d.venue_id=v.id AND d.starts_at='2026-08-30 21:00:00');

-- Lundi 31 août
INSERT INTO show_dates (show_id, venue_id, starts_at, ends_at, seats_total, seats_booked, status, created_at, updated_at)
SELECT s.id, v.id, '2026-08-31 21:00:00', NULL, 200, 0, 'SCHEDULED', NOW(), NOW() FROM shows s, venues v
WHERE s.slug='mawja' AND v.slug='chapiteau-mawsim'
AND NOT EXISTS (SELECT 1 FROM show_dates d WHERE d.show_id=s.id AND d.venue_id=v.id AND d.starts_at='2026-08-31 21:00:00');

-- Expositions (21 → 31 août)
INSERT INTO show_dates (show_id, venue_id, starts_at, ends_at, seats_total, seats_booked, status, created_at, updated_at)
SELECT s.id, v.id, '2026-08-21 10:00:00', '2026-08-31 19:00:00', 200, 0, 'SCHEDULED', NOW(), NOW() FROM shows s, venues v
WHERE s.slug='expo-j-lioum' AND v.slug='espace-artisanat-medina'
AND NOT EXISTS (SELECT 1 FROM show_dates d WHERE d.show_id=s.id AND d.venue_id=v.id AND d.starts_at='2026-08-21 10:00:00');

INSERT INTO show_dates (show_id, venue_id, starts_at, ends_at, seats_total, seats_booked, status, created_at, updated_at)
SELECT s.id, v.id, '2026-08-21 10:00:00', '2026-08-31 19:00:00', 200, 0, 'SCHEDULED', NOW(), NOW() FROM shows s, venues v
WHERE s.slug='expo-regards-aventure-collective' AND v.slug='espace-artisanat-medina'
AND NOT EXISTS (SELECT 1 FROM show_dates d WHERE d.show_id=s.id AND d.venue_id=v.id AND d.starts_at='2026-08-21 10:00:00');

COMMIT;
