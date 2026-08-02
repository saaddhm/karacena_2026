-- =====================================================================
-- KARACENA 2026 — Séances (show_dates) des 22, 23, 28, 29, 30 et 31 août.
-- Les spectacles existent déjà (référencés par slug). Les lieux manquants
-- sont créés. Idempotent : NOT EXISTS sur (show_id, venue_id, starts_at).
-- Heures « murales » (heure locale du festival), stockées telles quelles.
-- =====================================================================

START TRANSACTION;

-- ---------- Lieux (créés seulement s'ils n'existent pas déjà, par nom) ----------
INSERT INTO venues (slug, name_fr, name_en, created_at, updated_at)
SELECT 'centre-ibn-toumert', 'Centre Culturel Ibn Toumert', 'Centre Culturel Ibn Toumert', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM venues WHERE name_fr = 'Centre Culturel Ibn Toumert');

INSERT INTO venues (slug, name_fr, name_en, created_at, updated_at)
SELECT 'bab-fes', 'Bab Fès', 'Bab Fès', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM venues WHERE name_fr = 'Bab Fès');

INSERT INTO venues (slug, name_fr, name_en, created_at, updated_at)
SELECT 'esplanade-sidi-moussa', 'Esplanade de Sidi Moussa', 'Esplanade de Sidi Moussa', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM venues WHERE name_fr = 'Esplanade de Sidi Moussa');

INSERT INTO venues (slug, name_fr, name_en, created_at, updated_at)
SELECT 'chapiteau-mawsim', 'Chapiteau Mawsim — ENC Shems''y', 'Chapiteau Mawsim — ENC Shems''y', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM venues WHERE name_fr = 'Chapiteau Mawsim — ENC Shems''y');

INSERT INTO venues (slug, name_fr, name_en, created_at, updated_at)
SELECT 'chapiteau-pedagogique', 'Chapiteau pédagogique — ENC Shems''y', 'Chapiteau pédagogique — ENC Shems''y', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM venues WHERE name_fr = 'Chapiteau pédagogique — ENC Shems''y');

INSERT INTO venues (slug, name_fr, name_en, created_at, updated_at)
SELECT 'bab-hssain', 'Bab Hssain', 'Bab Hssain', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM venues WHERE name_fr = 'Bab Hssain');

INSERT INTO venues (slug, name_fr, name_en, created_at, updated_at)
SELECT 'marina-sale', 'Marina de Salé', 'Marina de Salé', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM venues WHERE name_fr = 'Marina de Salé');

INSERT INTO venues (slug, name_fr, name_en, created_at, updated_at)
SELECT 'jardin-hay-essalam', 'Jardin Hay Essalam (près du tram)', 'Jardin Hay Essalam (près du tram)', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM venues WHERE name_fr = 'Jardin Hay Essalam (près du tram)');

-- ---------- Séances ----------
-- Motif : INSERT ... SELECT depuis shows (slug) JOIN venues (name_fr),
-- seulement si la séance n'existe pas déjà.

-- ===== SAMEDI 22 AOÛT =====
INSERT INTO show_dates (show_id, venue_id, starts_at, ends_at, seats_total, seats_booked, status, created_at, updated_at)
SELECT s.id, v.id, '2026-08-22 16:00:00', NULL, 200, 0, 'SCHEDULED', NOW(), NOW()
FROM shows s JOIN venues v ON v.name_fr = 'Centre Culturel Ibn Toumert'
WHERE s.slug = 'Cloth.er'
AND NOT EXISTS (SELECT 1 FROM show_dates d WHERE d.show_id=s.id AND d.venue_id=v.id AND d.starts_at='2026-08-22 16:00:00');

INSERT INTO show_dates (show_id, venue_id, starts_at, ends_at, seats_total, seats_booked, status, created_at, updated_at)
SELECT s.id, v.id, '2026-08-22 17:00:00', NULL, 200, 0, 'SCHEDULED', NOW(), NOW()
FROM shows s JOIN venues v ON v.name_fr = 'Bab Fès'
WHERE s.slug = 'Bateau'
AND NOT EXISTS (SELECT 1 FROM show_dates d WHERE d.show_id=s.id AND d.venue_id=v.id AND d.starts_at='2026-08-22 17:00:00');

INSERT INTO show_dates (show_id, venue_id, starts_at, ends_at, seats_total, seats_booked, status, created_at, updated_at)
SELECT s.id, v.id, '2026-08-22 18:00:00', NULL, 200, 0, 'SCHEDULED', NOW(), NOW()
FROM shows s JOIN venues v ON v.name_fr = 'Esplanade de Sidi Moussa'
WHERE s.slug = 'Moussa, l''Enfant de la Mer'
AND NOT EXISTS (SELECT 1 FROM show_dates d WHERE d.show_id=s.id AND d.venue_id=v.id AND d.starts_at='2026-08-22 18:00:00');

INSERT INTO show_dates (show_id, venue_id, starts_at, ends_at, seats_total, seats_booked, status, created_at, updated_at)
SELECT s.id, v.id, '2026-08-22 19:30:00', NULL, 200, 0, 'SCHEDULED', NOW(), NOW()
FROM shows s JOIN venues v ON v.name_fr = 'Chapiteau Mawsim — ENC Shems''y'
WHERE s.slug = 'Jha — Les Métamorphoses de Jha V2'
AND NOT EXISTS (SELECT 1 FROM show_dates d WHERE d.show_id=s.id AND d.venue_id=v.id AND d.starts_at='2026-08-22 19:30:00');

INSERT INTO show_dates (show_id, venue_id, starts_at, ends_at, seats_total, seats_booked, status, created_at, updated_at)
SELECT s.id, v.id, '2026-08-22 21:00:00', NULL, 200, 0, 'SCHEDULED', NOW(), NOW()
FROM shows s JOIN venues v ON v.name_fr = 'Chapiteau pédagogique — ENC Shems''y'
WHERE s.slug = 'Le Monde à l''Envers'
AND NOT EXISTS (SELECT 1 FROM show_dates d WHERE d.show_id=s.id AND d.venue_id=v.id AND d.starts_at='2026-08-22 21:00:00');

-- ===== DIMANCHE 23 AOÛT =====
INSERT INTO show_dates (show_id, venue_id, starts_at, ends_at, seats_total, seats_booked, status, created_at, updated_at)
SELECT s.id, v.id, '2026-08-23 16:00:00', NULL, 200, 0, 'SCHEDULED', NOW(), NOW()
FROM shows s JOIN venues v ON v.name_fr = 'Centre Culturel Ibn Toumert'
WHERE s.slug = 'Cloth.er'
AND NOT EXISTS (SELECT 1 FROM show_dates d WHERE d.show_id=s.id AND d.venue_id=v.id AND d.starts_at='2026-08-23 16:00:00');

INSERT INTO show_dates (show_id, venue_id, starts_at, ends_at, seats_total, seats_booked, status, created_at, updated_at)
SELECT s.id, v.id, '2026-08-23 17:00:00', NULL, 200, 0, 'SCHEDULED', NOW(), NOW()
FROM shows s JOIN venues v ON v.name_fr = 'Bab Fès'
WHERE s.slug = 'Bateau'
AND NOT EXISTS (SELECT 1 FROM show_dates d WHERE d.show_id=s.id AND d.venue_id=v.id AND d.starts_at='2026-08-23 17:00:00');

INSERT INTO show_dates (show_id, venue_id, starts_at, ends_at, seats_total, seats_booked, status, created_at, updated_at)
SELECT s.id, v.id, '2026-08-23 18:00:00', NULL, 200, 0, 'SCHEDULED', NOW(), NOW()
FROM shows s JOIN venues v ON v.name_fr = 'Esplanade de Sidi Moussa'
WHERE s.slug = 'Moussa, l''Enfant de la Mer'
AND NOT EXISTS (SELECT 1 FROM show_dates d WHERE d.show_id=s.id AND d.venue_id=v.id AND d.starts_at='2026-08-23 18:00:00');

INSERT INTO show_dates (show_id, venue_id, starts_at, ends_at, seats_total, seats_booked, status, created_at, updated_at)
SELECT s.id, v.id, '2026-08-23 19:30:00', NULL, 200, 0, 'SCHEDULED', NOW(), NOW()
FROM shows s JOIN venues v ON v.name_fr = 'Chapiteau Mawsim — ENC Shems''y'
WHERE s.slug = 'Jha — Les Métamorphoses de Jha V2'
AND NOT EXISTS (SELECT 1 FROM show_dates d WHERE d.show_id=s.id AND d.venue_id=v.id AND d.starts_at='2026-08-23 19:30:00');

INSERT INTO show_dates (show_id, venue_id, starts_at, ends_at, seats_total, seats_booked, status, created_at, updated_at)
SELECT s.id, v.id, '2026-08-23 21:00:00', NULL, 200, 0, 'SCHEDULED', NOW(), NOW()
FROM shows s JOIN venues v ON v.name_fr = 'Chapiteau pédagogique — ENC Shems''y'
WHERE s.slug = 'Le Monde à l''Envers'
AND NOT EXISTS (SELECT 1 FROM show_dates d WHERE d.show_id=s.id AND d.venue_id=v.id AND d.starts_at='2026-08-23 21:00:00');

-- ===== VENDREDI 28 AOÛT =====
INSERT INTO show_dates (show_id, venue_id, starts_at, ends_at, seats_total, seats_booked, status, created_at, updated_at)
SELECT s.id, v.id, '2026-08-28 17:00:00', NULL, 200, 0, 'SCHEDULED', NOW(), NOW()
FROM shows s JOIN venues v ON v.name_fr = 'Bab Hssain'
WHERE s.slug = 'Chajara'
AND NOT EXISTS (SELECT 1 FROM show_dates d WHERE d.show_id=s.id AND d.venue_id=v.id AND d.starts_at='2026-08-28 17:00:00');

INSERT INTO show_dates (show_id, venue_id, starts_at, ends_at, seats_total, seats_booked, status, created_at, updated_at)
SELECT s.id, v.id, '2026-08-28 17:00:00', NULL, 200, 0, 'SCHEDULED', NOW(), NOW()
FROM shows s JOIN venues v ON v.name_fr = 'Bab Fès'
WHERE s.slug = 'Zarbia'
AND NOT EXISTS (SELECT 1 FROM show_dates d WHERE d.show_id=s.id AND d.venue_id=v.id AND d.starts_at='2026-08-28 17:00:00');

INSERT INTO show_dates (show_id, venue_id, starts_at, ends_at, seats_total, seats_booked, status, created_at, updated_at)
SELECT s.id, v.id, '2026-08-28 18:00:00', NULL, 200, 0, 'SCHEDULED', NOW(), NOW()
FROM shows s JOIN venues v ON v.name_fr = 'Esplanade de Sidi Moussa'
WHERE s.slug = 'Moussa, l''Enfant de la Mer'
AND NOT EXISTS (SELECT 1 FROM show_dates d WHERE d.show_id=s.id AND d.venue_id=v.id AND d.starts_at='2026-08-28 18:00:00');

INSERT INTO show_dates (show_id, venue_id, starts_at, ends_at, seats_total, seats_booked, status, created_at, updated_at)
SELECT s.id, v.id, '2026-08-28 18:00:00', NULL, 200, 0, 'SCHEDULED', NOW(), NOW()
FROM shows s JOIN venues v ON v.name_fr = 'Marina de Salé'
WHERE s.slug = 'Rihla'
AND NOT EXISTS (SELECT 1 FROM show_dates d WHERE d.show_id=s.id AND d.venue_id=v.id AND d.starts_at='2026-08-28 18:00:00');

INSERT INTO show_dates (show_id, venue_id, starts_at, ends_at, seats_total, seats_booked, status, created_at, updated_at)
SELECT s.id, v.id, '2026-08-28 19:30:00', NULL, 200, 0, 'SCHEDULED', NOW(), NOW()
FROM shows s JOIN venues v ON v.name_fr = 'Chapiteau pédagogique — ENC Shems''y'
WHERE s.slug = 'Awal Qalam 2026'
AND NOT EXISTS (SELECT 1 FROM show_dates d WHERE d.show_id=s.id AND d.venue_id=v.id AND d.starts_at='2026-08-28 19:30:00');

-- ===== SAMEDI 29 AOÛT =====
INSERT INTO show_dates (show_id, venue_id, starts_at, ends_at, seats_total, seats_booked, status, created_at, updated_at)
SELECT s.id, v.id, '2026-08-29 17:00:00', NULL, 200, 0, 'SCHEDULED', NOW(), NOW()
FROM shows s JOIN venues v ON v.name_fr = 'Bab Fès'
WHERE s.slug = 'Chajara'
AND NOT EXISTS (SELECT 1 FROM show_dates d WHERE d.show_id=s.id AND d.venue_id=v.id AND d.starts_at='2026-08-29 17:00:00');

INSERT INTO show_dates (show_id, venue_id, starts_at, ends_at, seats_total, seats_booked, status, created_at, updated_at)
SELECT s.id, v.id, '2026-08-29 17:00:00', NULL, 200, 0, 'SCHEDULED', NOW(), NOW()
FROM shows s JOIN venues v ON v.name_fr = 'Bab Hssain'
WHERE s.slug = 'Zarbia'
AND NOT EXISTS (SELECT 1 FROM show_dates d WHERE d.show_id=s.id AND d.venue_id=v.id AND d.starts_at='2026-08-29 17:00:00');

INSERT INTO show_dates (show_id, venue_id, starts_at, ends_at, seats_total, seats_booked, status, created_at, updated_at)
SELECT s.id, v.id, '2026-08-29 18:00:00', NULL, 200, 0, 'SCHEDULED', NOW(), NOW()
FROM shows s JOIN venues v ON v.name_fr = 'Esplanade de Sidi Moussa'
WHERE s.slug = 'Moussa, l''Enfant de la Mer'
AND NOT EXISTS (SELECT 1 FROM show_dates d WHERE d.show_id=s.id AND d.venue_id=v.id AND d.starts_at='2026-08-29 18:00:00');

INSERT INTO show_dates (show_id, venue_id, starts_at, ends_at, seats_total, seats_booked, status, created_at, updated_at)
SELECT s.id, v.id, '2026-08-29 18:00:00', NULL, 200, 0, 'SCHEDULED', NOW(), NOW()
FROM shows s JOIN venues v ON v.name_fr = 'Marina de Salé'
WHERE s.slug = 'Rihla'
AND NOT EXISTS (SELECT 1 FROM show_dates d WHERE d.show_id=s.id AND d.venue_id=v.id AND d.starts_at='2026-08-29 18:00:00');

-- ===== DIMANCHE 30 AOÛT =====
INSERT INTO show_dates (show_id, venue_id, starts_at, ends_at, seats_total, seats_booked, status, created_at, updated_at)
SELECT s.id, v.id, '2026-08-30 17:00:00', NULL, 200, 0, 'SCHEDULED', NOW(), NOW()
FROM shows s JOIN venues v ON v.name_fr = 'Bab Fès'
WHERE s.slug = 'Chajara'
AND NOT EXISTS (SELECT 1 FROM show_dates d WHERE d.show_id=s.id AND d.venue_id=v.id AND d.starts_at='2026-08-30 17:00:00');

INSERT INTO show_dates (show_id, venue_id, starts_at, ends_at, seats_total, seats_booked, status, created_at, updated_at)
SELECT s.id, v.id, '2026-08-30 17:00:00', NULL, 200, 0, 'SCHEDULED', NOW(), NOW()
FROM shows s JOIN venues v ON v.name_fr = 'Bab Fès'
WHERE s.slug = 'Zarbia'
AND NOT EXISTS (SELECT 1 FROM show_dates d WHERE d.show_id=s.id AND d.venue_id=v.id AND d.starts_at='2026-08-30 17:00:00');

INSERT INTO show_dates (show_id, venue_id, starts_at, ends_at, seats_total, seats_booked, status, created_at, updated_at)
SELECT s.id, v.id, '2026-08-30 18:00:00', NULL, 200, 0, 'SCHEDULED', NOW(), NOW()
FROM shows s JOIN venues v ON v.name_fr = 'Esplanade de Sidi Moussa'
WHERE s.slug = 'Moussa, l''Enfant de la Mer'
AND NOT EXISTS (SELECT 1 FROM show_dates d WHERE d.show_id=s.id AND d.venue_id=v.id AND d.starts_at='2026-08-30 18:00:00');

INSERT INTO show_dates (show_id, venue_id, starts_at, ends_at, seats_total, seats_booked, status, created_at, updated_at)
SELECT s.id, v.id, '2026-08-30 18:00:00', NULL, 200, 0, 'SCHEDULED', NOW(), NOW()
FROM shows s JOIN venues v ON v.name_fr = 'Jardin Hay Essalam (près du tram)'
WHERE s.slug = 'Rihla'
AND NOT EXISTS (SELECT 1 FROM show_dates d WHERE d.show_id=s.id AND d.venue_id=v.id AND d.starts_at='2026-08-30 18:00:00');

INSERT INTO show_dates (show_id, venue_id, starts_at, ends_at, seats_total, seats_booked, status, created_at, updated_at)
SELECT s.id, v.id, '2026-08-30 19:00:00', NULL, 200, 0, 'SCHEDULED', NOW(), NOW()
FROM shows s JOIN venues v ON v.name_fr = 'Chapiteau pédagogique — ENC Shems''y'
WHERE s.slug = 'Sopla'
AND NOT EXISTS (SELECT 1 FROM show_dates d WHERE d.show_id=s.id AND d.venue_id=v.id AND d.starts_at='2026-08-30 19:00:00');

INSERT INTO show_dates (show_id, venue_id, starts_at, ends_at, seats_total, seats_booked, status, created_at, updated_at)
SELECT s.id, v.id, '2026-08-30 21:00:00', NULL, 200, 0, 'SCHEDULED', NOW(), NOW()
FROM shows s JOIN venues v ON v.name_fr = 'Chapiteau Mawsim — ENC Shems''y'
WHERE s.slug = 'Mawja'
AND NOT EXISTS (SELECT 1 FROM show_dates d WHERE d.show_id=s.id AND d.venue_id=v.id AND d.starts_at='2026-08-30 21:00:00');

-- ===== LUNDI 31 AOÛT =====
INSERT INTO show_dates (show_id, venue_id, starts_at, ends_at, seats_total, seats_booked, status, created_at, updated_at)
SELECT s.id, v.id, '2026-08-31 21:00:00', NULL, 200, 0, 'SCHEDULED', NOW(), NOW()
FROM shows s JOIN venues v ON v.name_fr = 'Chapiteau Mawsim — ENC Shems''y'
WHERE s.slug = 'Mawja'
AND NOT EXISTS (SELECT 1 FROM show_dates d WHERE d.show_id=s.id AND d.venue_id=v.id AND d.starts_at='2026-08-31 21:00:00');

COMMIT;

-- Vérification :
-- SELECT d.starts_at, s.title_fr, v.name_fr FROM show_dates d
--   JOIN shows s ON s.id=d.show_id JOIN venues v ON v.id=d.venue_id
--   WHERE d.starts_at >= '2026-08-22' ORDER BY d.starts_at;
