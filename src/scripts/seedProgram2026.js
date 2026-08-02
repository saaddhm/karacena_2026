/**
 * Seed du PROGRAMME KARACENA 2026 (du 21 au 31 août, Salé).
 *
 * Idempotent : ré-exécutable sans créer de doublons (clés = slug pour les
 * lieux et spectacles ; showId+venueId+startsAt pour les séances).
 *
 * Lancer :   npm run db:seed:program        (depuis /server)
 * ou :       node src/scripts/seedProgram2026.js
 *
 * NB : les horaires sont en heure du Maroc (UTC+01:00). Les prix ne sont pas
 * fournis ici → laissés à 0 / gratuit ; ajustez-les ensuite dans l'admin
 * (champs « Prix adulte » / « Prix enfant »).
 */
import { sequelize, Show, Venue, ShowDate } from '../models/index.js';

// ---- Lieux ----------------------------------------------------------------
// slug → nom (FR). L'anglais reprend le FR (modifiable en admin).
const VENUES = {
  'medina-sale': 'Médina de Salé',
  'bab-lamrissa': 'Bab Lamrissa',
  'centre-ibn-toumert': 'Centre Culturel Ibn Toumert',
  'bab-fes': 'Bab Fès',
  'esplanade-sidi-moussa': 'Esplanade de Sidi Moussa',
  'chapiteau-mawsim': "Chapiteau Mawsim — ENC Shems'y",
  'chapiteau-pedagogique': "Chapiteau pédagogique — ENC Shems'y",
  'bab-hssain': 'Bab Hssain',
  'marina-sale': 'Marina de Salé',
  'jardin-hay-essalam': 'Jardin Hay Essalam (près du tram)',
  'espace-artisanat-medina': "Espace de Vente et d'Exposition des Produits Artisanaux (Médina de Salé)"
};

// ---- Spectacles -----------------------------------------------------------
// slug → { titleFr, category, summaryFr (compagnie — pays), free? }
const SHOWS = {
  'parade-ville-en-mouvement': { titleFr: 'La ville en mouvement — Parade', category: 'AMESIP', summaryFr: 'Parade d’ouverture dans les rues de Salé.', free: true },
  'labordage-ouverture': { titleFr: 'L’Abordage — Ouverture de la biennale', category: 'AMESIP', summaryFr: 'Cérémonie d’ouverture de Karacena 2026.', free: true },
  'clother': { titleFr: 'Cloth.er', category: 'INTERNATIONAL', summaryFr: 'Circo Hannover — Allemagne' },
  'bateau': { titleFr: 'Bateau', category: 'AMESIP', summaryFr: 'Ismail Errahali — Maroc' },
  'moussa-enfant-de-la-mer': { titleFr: 'Moussa l’Enfant de la Mer', category: 'AMESIP', summaryFr: 'EAE Shems’y — Maroc' },
  'jha': { titleFr: 'Jha', category: 'LAUREATS', summaryFr: 'ENC Shems’y — Le Grand Souffle — France / Maroc' },
  'le-monde-a-lenvers': { titleFr: 'Le Monde à l’Envers', category: 'LAUREATS', summaryFr: 'ENC Shems’y — Cie la Rose des Vents — Maroc' },
  'chajara': { titleFr: 'Chajara', category: 'INTERNATIONAL', summaryFr: 'Cie Nejmah — France / Maroc' },
  'zarbia': { titleFr: 'Zarbia', category: 'INTERNATIONAL', summaryFr: 'Cie Zid — France / Maroc' },
  'rihla': { titleFr: 'Rihla', category: 'INTERNATIONAL', summaryFr: 'La Carrière — France' },
  'awal-qalam-2026': { titleFr: 'Awal Qalam 2026', category: 'LAUREATS', summaryFr: 'ENC Shems’y — Maroc' },
  'sopla': { titleFr: 'Sopla', category: 'INTERNATIONAL', summaryFr: 'Cie Truca — Espagne' },
  'mawja': { titleFr: 'Mawja', category: 'LAUREATS', summaryFr: 'ENC Shems’y — Le Phare — France / Maroc' },
  // Expositions (une longue séance sur toute la durée du festival)
  'expo-j-lioum': { titleFr: 'J-lioum (exposition)', category: 'AMESIP', summaryFr: 'Institut Français du Maroc', free: true },
  'expo-regards-aventure-collective': { titleFr: 'Regards sur une aventure collective (exposition)', category: 'AMESIP', summaryFr: 'Exposition — Karacena 2026', free: true }
};

// ---- Séances --------------------------------------------------------------
// [ slugSpectacle, slugLieu, débutISO(+01:00), finISO? ]
const SESSIONS = [
  // Vendredi 21 août
  ['parade-ville-en-mouvement', 'medina-sale', '2026-08-21T11:00:00+01:00'],
  ['labordage-ouverture', 'bab-lamrissa', '2026-08-21T20:30:00+01:00'],
  // Samedi 22 août
  ['clother', 'centre-ibn-toumert', '2026-08-22T16:00:00+01:00'],
  ['bateau', 'bab-fes', '2026-08-22T17:00:00+01:00'],
  ['moussa-enfant-de-la-mer', 'esplanade-sidi-moussa', '2026-08-22T18:00:00+01:00'],
  ['jha', 'chapiteau-mawsim', '2026-08-22T19:30:00+01:00'],
  ['le-monde-a-lenvers', 'chapiteau-pedagogique', '2026-08-22T21:00:00+01:00'],
  // Dimanche 23 août
  ['clother', 'centre-ibn-toumert', '2026-08-23T16:00:00+01:00'],
  ['bateau', 'bab-fes', '2026-08-23T17:00:00+01:00'],
  ['moussa-enfant-de-la-mer', 'esplanade-sidi-moussa', '2026-08-23T18:00:00+01:00'],
  ['jha', 'chapiteau-mawsim', '2026-08-23T19:30:00+01:00'],
  ['le-monde-a-lenvers', 'chapiteau-pedagogique', '2026-08-23T21:00:00+01:00'],
  // Vendredi 28 août
  ['chajara', 'bab-hssain', '2026-08-28T17:00:00+01:00'],
  ['zarbia', 'bab-fes', '2026-08-28T17:00:00+01:00'],
  ['moussa-enfant-de-la-mer', 'esplanade-sidi-moussa', '2026-08-28T18:00:00+01:00'],
  ['rihla', 'marina-sale', '2026-08-28T18:00:00+01:00'],
  ['awal-qalam-2026', 'chapiteau-pedagogique', '2026-08-28T19:30:00+01:00'],
  // Samedi 29 août
  ['chajara', 'bab-fes', '2026-08-29T17:00:00+01:00'],
  ['zarbia', 'bab-hssain', '2026-08-29T17:00:00+01:00'],
  ['moussa-enfant-de-la-mer', 'esplanade-sidi-moussa', '2026-08-29T18:00:00+01:00'],
  ['rihla', 'marina-sale', '2026-08-29T18:00:00+01:00'],
  // Dimanche 30 août
  ['chajara', 'bab-fes', '2026-08-30T17:00:00+01:00'],
  ['zarbia', 'bab-fes', '2026-08-30T17:00:00+01:00'],
  ['moussa-enfant-de-la-mer', 'esplanade-sidi-moussa', '2026-08-30T18:00:00+01:00'],
  ['rihla', 'jardin-hay-essalam', '2026-08-30T18:00:00+01:00'],
  ['sopla', 'chapiteau-pedagogique', '2026-08-30T19:00:00+01:00'],
  ['mawja', 'chapiteau-mawsim', '2026-08-30T21:00:00+01:00'],
  // Lundi 31 août
  ['mawja', 'chapiteau-mawsim', '2026-08-31T21:00:00+01:00'],
  // Expositions (21 → 31 août)
  ['expo-j-lioum', 'espace-artisanat-medina', '2026-08-21T10:00:00+01:00', '2026-08-31T19:00:00+01:00'],
  ['expo-regards-aventure-collective', 'espace-artisanat-medina', '2026-08-21T10:00:00+01:00', '2026-08-31T19:00:00+01:00']
];

async function run() {
  await sequelize.authenticate();
  console.log('✔ MySQL connecté');

  // 1) Lieux
  const venueBySlug = {};
  for (const [slug, nameFr] of Object.entries(VENUES)) {
    const [venue] = await Venue.findOrCreate({
      where: { slug },
      defaults: { slug, nameFr, nameEn: nameFr }
    });
    venueBySlug[slug] = venue;
  }
  console.log(`✔ ${Object.keys(venueBySlug).length} lieux`);

  // 2) Spectacles
  const showBySlug = {};
  for (const [slug, s] of Object.entries(SHOWS)) {
    const [show] = await Show.findOrCreate({
      where: { slug },
      defaults: {
        slug,
        titleFr: s.titleFr,
        titleEn: s.titleFr, // EN = FR par défaut, à affiner en admin
        category: s.category,
        summaryFr: s.summaryFr || null,
        summaryEn: s.summaryFr || null,
        priceMad: 0,
        isFree: Boolean(s.free),
        isPublished: true
      }
    });
    showBySlug[slug] = show;
  }
  console.log(`✔ ${Object.keys(showBySlug).length} spectacles`);

  // 3) Séances (évite les doublons showId+venueId+startsAt)
  let created = 0;
  let skipped = 0;
  for (const [showSlug, venueSlug, startIso, endIso] of SESSIONS) {
    const show = showBySlug[showSlug];
    const venue = venueBySlug[venueSlug];
    if (!show || !venue) { console.warn(`⚠ séance ignorée (${showSlug} @ ${venueSlug})`); continue; }
    const startsAt = new Date(startIso);
    const [, wasCreated] = await ShowDate.findOrCreate({
      where: { showId: show.id, venueId: venue.id, startsAt },
      defaults: {
        showId: show.id,
        venueId: venue.id,
        startsAt,
        endsAt: endIso ? new Date(endIso) : null,
        seatsTotal: 200,
        seatsBooked: 0,
        status: 'SCHEDULED'
      }
    });
    wasCreated ? created++ : skipped++;
  }
  console.log(`✔ séances : ${created} créées, ${skipped} déjà présentes`);
  console.log('✔ Programme Karacena 2026 importé.');
}

run()
  .then(() => sequelize.close())
  .then(() => process.exit(0))
  .catch((e) => { console.error('✖ Échec du seed programme :', e); process.exit(1); });
