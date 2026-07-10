-- =====================================================================
-- Karacena 2026 — seed data (SQL variant)
-- Preferred: `npm run db:seed` (creates admin with bcrypt hash + QR-ready data).
-- This SQL file seeds the same public content without the admin user.
-- =====================================================================
USE karacena_2026;

INSERT IGNORE INTO venues (name_fr, name_en, slug, address_fr, address_en, description_fr, description_en, latitude, longitude, capacity, access_info_fr, access_info_en) VALUES
("École Nationale du Cirque Shems'y", "Shems'y National Circus School", 'shemsy', 'Route de Kénitra, Salé', 'Kénitra Road, Salé', 'Le cœur battant de Karacena : chapiteau, salles de création et espaces de rencontre.', 'The beating heart of Karacena: big top, creation studios and meeting spaces.', 34.0620, -6.7680, 600, 'Bus 12/34 — Parking gratuit sur place', 'Bus 12/34 — Free on-site parking'),
('Place Bab Lamrissa', 'Bab Lamrissa Square', 'bab-lamrissa', 'Bab Lamrissa, Médina de Salé', 'Bab Lamrissa, Salé Medina', 'Scène monumentale au pied des remparts mérinides.', 'Monumental open-air stage at the foot of the Marinid ramparts.', 34.0397, -6.8166, 2000, 'Tramway L2 — arrêt Bab Lamrissa', 'Tramway L2 — Bab Lamrissa stop'),
('Plage de Salé', 'Salé Beach', 'plage-sale', 'Corniche de Salé', 'Salé Corniche', 'Entre terre et mer, les spectacles au coucher du soleil.', 'Between earth and sea, sunset performances.', 34.0486, -6.8280, 3000, 'Accès libre — Corniche', 'Free access — Corniche'),
('Médina de Salé — Déambulation', 'Salé Medina — Roaming stage', 'medina', 'Médina de Salé', 'Salé Medina', 'Parades et impromptus dans les ruelles de la médina.', 'Parades and pop-up acts through the medina alleys.', 34.0415, -6.8130, 0, 'Tramway L2 — Médina', 'Tramway L2 — Medina'),
('Borj Adoumoue (Borj Nord)', 'Borj Adoumoue (North Tower)', 'borj-adoumoue', 'Front de mer, Salé', 'Seafront, Salé', 'Forteresse face à l''Atlantique, écrin des formes intimistes.', 'A fortress facing the Atlantic, home to intimate performances.', 34.0452, -6.8305, 300, 'À 10 min à pied de Bab Lamrissa', '10 min walk from Bab Lamrissa');

INSERT IGNORE INTO historical_editions (year, edition_number, theme_fr, theme_en, description_fr, description_en) VALUES
(2006, 1, 'Naissance', 'Birth', 'Première Karacena : AMESIP et Shems''y inventent une biennale des arts du cirque et du voyage à Salé.', 'The first Karacena: AMESIP and Shems''y create a biennale of circus and travelling arts in Salé.'),
(2008, 2, 'Caravanes', 'Caravans', 'La biennale s''ouvre aux compagnies itinérantes venues d''Afrique et d''Europe.', 'The biennale opens to travelling companies from Africa and Europe.'),
(2010, 3, 'Traversées', 'Crossings', 'Échanges artistiques entre les deux rives de la Méditerranée.', 'Artistic exchanges across the Mediterranean.'),
(2012, 4, 'Racines et envol', 'Roots and Flight', 'L''acrobatie traditionnelle marocaine dialogue avec le cirque contemporain.', 'Traditional Moroccan acrobatics in dialogue with contemporary circus.'),
(2014, 5, 'La piste aux étoiles', 'Ring of Stars', 'Cinquième édition : Salé tout entière devient piste de cirque.', 'Fifth edition: the whole of Salé becomes a circus ring.'),
(2016, 6, 'Corps voyageurs', 'Travelling Bodies', 'Le voyage comme matière artistique, des caravanes sahariennes aux ports atlantiques.', 'Travel as artistic material, from Saharan caravans to Atlantic harbours.'),
(2018, 7, 'Rives', 'Shores', 'La mer, frontière et lien : créations entre Salé et ses villes jumelles.', 'The sea as border and bond: creations between Salé and its twin cities.'),
(2021, 8, 'Résilience', 'Resilience', 'Édition de la renaissance après la pandémie.', 'The rebirth edition after the pandemic.'),
(2024, 9, 'Horizons partagés', 'Shared Horizons', 'Coopérations Sud-Sud et nouvelles écritures du cirque africain.', 'South-South cooperation and new African circus writing.'),
(2026, 10, 'Faire corps', 'Faire corps', 'Dixième édition anniversaire. Du 21 au 30 août 2026.', 'Tenth anniversary edition. 21–30 August 2026.');

INSERT IGNORE INTO partners (name, type, website_url, display_order, description_fr, description_en) VALUES
('AMESIP', 'INSTITUTIONAL', 'https://amesip.org', 1, 'Association Marocaine d''Aide aux Enfants en Situation Précaire.', 'Moroccan Association for Children in Precarious Situations.'),
("École Nationale du Cirque Shems'y", 'INSTITUTIONAL', NULL, 2, 'Première école de cirque professionnelle du Maroc.', 'Morocco''s first professional circus school.'),
('Ministère de la Culture', 'INSTITUTIONAL', NULL, 3, NULL, NULL),
('Ville de Salé', 'INSTITUTIONAL', NULL, 4, NULL, NULL),
('Institut Français du Maroc', 'INSTITUTIONAL', NULL, 5, NULL, NULL),
('Fondation Drosos', 'SPONSOR', NULL, 10, NULL, NULL),
('Royal Air Maroc', 'SPONSOR', NULL, 11, NULL, NULL),
('2M TV', 'MEDIA', NULL, 20, NULL, NULL),
('Radio Aswat', 'MEDIA', NULL, 21, NULL, NULL);
