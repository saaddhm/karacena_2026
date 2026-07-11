import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
dotenv.config();
import { connectDB, sequelize } from '../config/db.js';
import {
  User, Venue, Artist, Show, ShowDate, Partner,
  HistoricalEdition, BlogPost
} from '../models/index.js';

async function seed() {
  await connectDB();
  await sequelize.sync();

  // ----- Admin user -----
  const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'ChangeMe!2026', 12);
  const [admin] = await User.findOrCreate({
    where: { email: process.env.ADMIN_EMAIL || 'admin@karacena.ma' },
    defaults: { name: 'Admin Karacena', passwordHash, role: 'admin' }
  });
  await admin.update({
    name: admin.name || 'Admin Karacena',
    passwordHash,
    role: 'admin'
  });

  // ----- Venues (Salé) -----
  const venues = await Venue.bulkCreate([
    { nameFr: "École Nationale du Cirque Shems'y", nameEn: "Shems'y National Circus School", slug: 'shemsy',
      addressFr: 'Route de Kénitra, Salé', addressEn: 'Kénitra Road, Salé',
      descriptionFr: "Le cœur battant de Karacena : chapiteau, salles de création et espaces de rencontre.",
      descriptionEn: "The beating heart of Karacena: big top, creation studios and meeting spaces.",
      latitude: 34.0620, longitude: -6.7680, capacity: 600,
      accessInfoFr: 'Bus 12/34 — Parking gratuit sur place', accessInfoEn: 'Bus 12/34 — Free on-site parking' },
    { nameFr: 'Place Bab Lamrissa', nameEn: 'Bab Lamrissa Square', slug: 'bab-lamrissa',
      addressFr: 'Bab Lamrissa, Médina de Salé', addressEn: 'Bab Lamrissa, Salé Medina',
      descriptionFr: 'Scène monumentale au pied des remparts mérinides.',
      descriptionEn: 'Monumental open-air stage at the foot of the Marinid ramparts.',
      latitude: 34.0397, longitude: -6.8166, capacity: 2000,
      accessInfoFr: 'Tramway L2 — arrêt Bab Lamrissa', accessInfoEn: 'Tramway L2 — Bab Lamrissa stop' },
    { nameFr: 'Plage de Salé', nameEn: 'Salé Beach', slug: 'plage-sale',
      addressFr: 'Corniche de Salé', addressEn: 'Salé Corniche',
      descriptionFr: 'Entre terre et mer, les spectacles au coucher du soleil.',
      descriptionEn: 'Between earth and sea, sunset performances.',
      latitude: 34.0486, longitude: -6.8280, capacity: 3000,
      accessInfoFr: 'Accès libre — Corniche', accessInfoEn: 'Free access — Corniche' },
    { nameFr: 'Médina de Salé — Déambulation', nameEn: 'Salé Medina — Roaming stage', slug: 'medina',
      addressFr: 'Médina de Salé', addressEn: 'Salé Medina',
      descriptionFr: 'Parades et impromptus dans les ruelles de la médina.',
      descriptionEn: 'Parades and pop-up acts through the medina alleys.',
      latitude: 34.0415, longitude: -6.8130, capacity: 0,
      accessInfoFr: 'Tramway L2 — Médina', accessInfoEn: 'Tramway L2 — Medina' },
    { nameFr: 'Borj Adoumoue (Borj Nord)', nameEn: 'Borj Adoumoue (North Tower)', slug: 'borj-adoumoue',
      addressFr: 'Front de mer, Salé', addressEn: 'Seafront, Salé',
      descriptionFr: 'Forteresse face à l’Atlantique, écrin des formes intimistes.',
      descriptionEn: 'A fortress facing the Atlantic, home to intimate performances.',
      latitude: 34.0452, longitude: -6.8305, capacity: 300,
      accessInfoFr: 'À 10 min à pied de Bab Lamrissa', accessInfoEn: '10 min walk from Bab Lamrissa' }
  ], { ignoreDuplicates: true });

  // ----- Artists -----
  const artists = await Artist.bulkCreate([
    { name: "Troupe Shems'y", slug: 'troupe-shemsy', country: 'Maroc', discipline: 'Cirque contemporain', isCompany: true,
      bioFr: "La troupe de l'École Nationale du Cirque Shems'y, née du programme social d'AMESIP, forme depuis 2009 des artistes de cirque professionnels.",
      bioEn: "The company of the Shems'y National Circus School, born from AMESIP's social programme, has trained professional circus artists since 2009." },
    { name: 'Collectif Kif-Kif', slug: 'collectif-kif-kif', country: 'Maroc', discipline: 'Acrobatie / danse', isCompany: true,
      bioFr: 'Jeunes lauréats de Shems’y explorant l’acrobatie marocaine traditionnelle au présent.',
      bioEn: 'Young Shems’y graduates reinventing traditional Moroccan acrobatics for today.' },
    { name: 'Cie Lʼenvolée', slug: 'cie-lenvolee', country: 'France', discipline: 'Voltige aérienne', isCompany: true,
      bioFr: 'Compagnie française de voltige aérienne, invitée internationale de la 10e édition.',
      bioEn: 'French aerial company, international guest of the 10th edition.' },
    { name: 'Sara El Hamdi', slug: 'sara-el-hamdi', country: 'Maroc', discipline: 'Fil de fer',
      bioFr: 'Fildefériste lauréate de Shems’y, elle tisse un langage entre équilibre et transe gnaouie.',
      bioEn: 'Tightwire artist and Shems’y graduate weaving balance with Gnawa trance.' },
    { name: 'Circo del Sur', slug: 'circo-del-sur', country: 'Argentine', discipline: 'Cirque social', isCompany: true,
      bioFr: 'Compagnie argentine de cirque social, compagnon de route de Karacena depuis 2012.',
      bioEn: 'Argentinian social circus company, fellow traveller of Karacena since 2012.' }
  ], { ignoreDuplicates: true });

  // ----- Shows -----
  const showsData = [
    { titleFr: 'Faire corps — Création 2026', titleEn: 'Faire corps — 2026 Creation', slug: 'faire-corps-creation',
      category: 'AMESIP', isFeatured: true, priceMad: 80, durationMinutes: 75,
      summaryFr: "La création collective de la troupe Shems'y : trente corps qui n'en font qu'un.",
      summaryEn: "The Shems'y company's collective creation: thirty bodies becoming one.",
      descriptionFr: "Sous le chapiteau, la troupe Shems'y déploie la thématique de la 10e édition : faire corps — avec l'autre, avec la ville, avec la mer. Portés acrobatiques, mât chinois et musique live.",
      descriptionEn: "Under the big top, the Shems'y company embodies the 10th edition's theme: faire corps — with each other, with the city, with the sea. Acrobatic lifts, Chinese pole and live music.",
      artists: ['troupe-shemsy'], venue: 'shemsy',
      dates: [['2026-08-21 20:30', 600], ['2026-08-23 20:30', 600], ['2026-08-28 20:30', 600]] },
    { titleFr: 'Ouverture — Parade des remparts', titleEn: 'Opening — Ramparts Parade', slug: 'parade-remparts',
      category: 'AMESIP', isFree: true, isFeatured: true, durationMinutes: 90,
      summaryFr: 'Grande parade d’ouverture de Bab Lamrissa à la plage, avec tous les artistes du festival.',
      summaryEn: 'Grand opening parade from Bab Lamrissa to the beach, with all festival artists.',
      descriptionFr: 'Salé devient scène à ciel ouvert : échassiers, acrobates et musiciens traversent la médina jusqu’à l’océan.',
      descriptionEn: 'Salé becomes an open-air stage: stilt walkers, acrobats and musicians cross the medina down to the ocean.',
      artists: ['troupe-shemsy', 'collectif-kif-kif'], venue: 'medina',
      dates: [['2026-08-21 17:00', 5000]] },
    { titleFr: 'Ssiff — solo de fil', titleEn: 'Ssiff — wire solo', slug: 'ssiff',
      category: 'LAUREATS', priceMad: 50, durationMinutes: 45,
      summaryFr: 'Sara El Hamdi sur un fil, entre ciel et forteresse.',
      summaryEn: 'Sara El Hamdi on a wire, between sky and fortress.',
      descriptionFr: 'Dans l’enceinte du Borj Adoumoue, un solo de fil de fer hypnotique porté par des chants gnaouis.',
      descriptionEn: 'Inside Borj Adoumoue, a hypnotic tightwire solo carried by Gnawa songs.',
      artists: ['sara-el-hamdi'], venue: 'borj-adoumoue',
      dates: [['2026-08-24 19:00', 300], ['2026-08-26 19:00', 300]] },
    { titleFr: 'Horizons', titleEn: 'Horizons', slug: 'horizons',
      category: 'INTERNATIONAL', priceMad: 100, isFeatured: true, durationMinutes: 60,
      summaryFr: 'Voltige aérienne face à l’Atlantique par la Cie L’envolée.',
      summaryEn: 'Aerial acrobatics facing the Atlantic by Cie L’envolée.',
      descriptionFr: 'Un portique de 12 mètres planté dans le sable : trapèze volant au coucher du soleil.',
      descriptionEn: 'A 12-metre rig planted in the sand: flying trapeze at sunset.',
      artists: ['cie-lenvolee'], venue: 'plage-sale',
      dates: [['2026-08-25 19:30', 3000], ['2026-08-27 19:30', 3000]] },
    { titleFr: 'Sur — cabaret du Sud', titleEn: 'Sur — Southern cabaret', slug: 'sur-cabaret',
      category: 'INTERNATIONAL', priceMad: 60, durationMinutes: 80,
      summaryFr: 'Le cirque social argentin rencontre les acrobates de Salé.',
      summaryEn: 'Argentinian social circus meets the acrobats of Salé.',
      descriptionFr: 'Circo del Sur et les élèves de Shems’y partagent la piste pour un cabaret métissé.',
      descriptionEn: 'Circo del Sur and Shems’y students share the ring for a cross-cultural cabaret.',
      artists: ['circo-del-sur', 'troupe-shemsy'], venue: 'bab-lamrissa',
      dates: [['2026-08-29 21:00', 2000]] },
    { titleFr: 'Clôture — Faire corps avec la mer', titleEn: 'Closing — One body with the sea', slug: 'cloture-faire-corps',
      category: 'AMESIP', isFree: true, isFeatured: true, durationMinutes: 120,
      summaryFr: 'Spectacle de clôture monumental sur la plage de Salé.',
      summaryEn: 'Monumental closing show on Salé beach.',
      descriptionFr: 'Tous les artistes de la biennale réunis pour un final entre feu, mer et acrobatie.',
      descriptionEn: 'All biennale artists together for a finale of fire, sea and acrobatics.',
      artists: ['troupe-shemsy', 'collectif-kif-kif', 'cie-lenvolee', 'circo-del-sur'], venue: 'plage-sale',
      dates: [['2026-08-30 20:00', 5000]] }
  ];

  const venueBySlug = Object.fromEntries((await Venue.findAll()).map(v => [v.slug, v]));
  const artistBySlug = Object.fromEntries((await Artist.findAll()).map(a => [a.slug, a]));

  for (const s of showsData) {
    const { artists: aSlugs, venue: vSlug, dates, ...data } = s;
    const [show] = await Show.findOrCreate({ where: { slug: data.slug }, defaults: data });
    await show.setArtists(aSlugs.map(sl => artistBySlug[sl]).filter(Boolean));
    for (const [dt, seats] of dates) {
      await ShowDate.findOrCreate({
        where: { showId: show.id, startsAt: new Date(dt + ':00+01:00') },
        defaults: { venueId: venueBySlug[vSlug].id, seatsTotal: seats }
      });
    }
  }

  // ----- Historical editions 2006 → 2026 (sample content — edit in admin) -----
  await HistoricalEdition.bulkCreate([
    { year: 2006, editionNumber: 1, themeFr: 'Naissance', themeEn: 'Birth',
      descriptionFr: "Première Karacena : AMESIP et Shems'y inventent une biennale des arts du cirque et du voyage à Salé.",
      descriptionEn: "The first Karacena: AMESIP and Shems'y create a biennale of circus and travelling arts in Salé." },
    { year: 2008, editionNumber: 2, themeFr: 'Caravanes', themeEn: 'Caravans',
      descriptionFr: 'La biennale s’ouvre aux compagnies itinérantes venues d’Afrique et d’Europe.',
      descriptionEn: 'The biennale opens to travelling companies from Africa and Europe.' },
    { year: 2010, editionNumber: 3, themeFr: 'Traversées', themeEn: 'Crossings',
      descriptionFr: 'Échanges artistiques entre les deux rives de la Méditerranée.',
      descriptionEn: 'Artistic exchanges across the Mediterranean.' },
    { year: 2012, editionNumber: 4, themeFr: 'Racines et envol', themeEn: 'Roots and Flight',
      descriptionFr: 'L’acrobatie traditionnelle marocaine dialogue avec le cirque contemporain.',
      descriptionEn: 'Traditional Moroccan acrobatics in dialogue with contemporary circus.' },
    { year: 2014, editionNumber: 5, themeFr: 'La piste aux étoiles', themeEn: 'Ring of Stars',
      descriptionFr: 'Cinquième édition : Salé tout entière devient piste de cirque.',
      descriptionEn: 'Fifth edition: the whole of Salé becomes a circus ring.' },
    { year: 2016, editionNumber: 6, themeFr: 'Corps voyageurs', themeEn: 'Travelling Bodies',
      descriptionFr: 'Le voyage comme matière artistique, des caravanes sahariennes aux ports atlantiques.',
      descriptionEn: 'Travel as artistic material, from Saharan caravans to Atlantic harbours.' },
    { year: 2018, editionNumber: 7, themeFr: 'Rives', themeEn: 'Shores',
      descriptionFr: 'La mer, frontière et lien : créations entre Salé et ses villes jumelles.',
      descriptionEn: 'The sea as border and bond: creations between Salé and its twin cities.' },
    { year: 2021, editionNumber: 8, themeFr: 'Résilience', themeEn: 'Resilience',
      descriptionFr: 'Édition de la renaissance après la pandémie, dédiée aux artistes du monde entier.',
      descriptionEn: 'The rebirth edition after the pandemic, dedicated to artists worldwide.' },
    { year: 2024, editionNumber: 9, themeFr: 'Horizons partagés', themeEn: 'Shared Horizons',
      descriptionFr: 'Neuvième édition : coopérations Sud-Sud et nouvelles écritures du cirque africain.',
      descriptionEn: 'Ninth edition: South-South cooperation and new African circus writing.' },
    { year: 2026, editionNumber: 10, themeFr: 'Faire corps', themeEn: 'Faire corps',
      descriptionFr: 'Dixième édition anniversaire : faire corps avec l’autre, avec la ville de Salé, avec le monde. Du 21 au 30 août 2026.',
      descriptionEn: 'Tenth anniversary edition: becoming one body with each other, with the city of Salé, with the world. 21–30 August 2026.' }
  ], { ignoreDuplicates: true });

  // ----- Partners -----
  await Partner.bulkCreate([
    { name: 'AMESIP', type: 'INSTITUTIONAL', websiteUrl: 'https://amesip.org', displayOrder: 1,
      descriptionFr: 'Association Marocaine d’Aide aux Enfants en Situation Précaire — fondatrice du projet Shems’y.',
      descriptionEn: 'Moroccan Association for Children in Precarious Situations — founder of the Shems’y project.' },
    { name: "École Nationale du Cirque Shems'y", type: 'INSTITUTIONAL', displayOrder: 2,
      descriptionFr: 'Première école de cirque professionnelle du Maroc.', descriptionEn: 'Morocco’s first professional circus school.' },
    { name: 'Ministère de la Culture', type: 'INSTITUTIONAL', displayOrder: 3 },
    { name: 'Ville de Salé', type: 'INSTITUTIONAL', displayOrder: 4 },
    { name: 'Institut Français du Maroc', type: 'INSTITUTIONAL', displayOrder: 5 },
    { name: 'Fondation Drosos', type: 'SPONSOR', displayOrder: 10 },
    { name: 'Royal Air Maroc', type: 'SPONSOR', displayOrder: 11 },
    { name: '2M TV', type: 'MEDIA', displayOrder: 20 },
    { name: 'Radio Aswat', type: 'MEDIA', displayOrder: 21 }
  ], { ignoreDuplicates: true });

  // ----- Blog posts -----
  await BlogPost.bulkCreate([
    { titleFr: 'Karacena 2026 : « Faire corps », le thème dévoilé', titleEn: 'Karacena 2026: “Faire corps”, the theme revealed',
      slug: 'theme-2026-devoile', category: 'NEWS', isPublished: true, publishedAt: new Date('2026-03-15'), authorId: admin.id,
      excerptFr: 'La 10e édition de la biennale explorera ce qui nous lie : les corps, la ville, la mer.',
      excerptEn: 'The 10th biennale will explore what binds us: bodies, the city, the sea.',
      bodyFr: 'Du 21 au 30 août 2026, Salé vibrera au rythme de la 10e Karacena…',
      bodyEn: 'From 21 to 30 August 2026, Salé will pulse to the rhythm of the 10th Karacena…' },
    { titleFr: 'Portrait : Sara El Hamdi, sur le fil', titleEn: 'Portrait: Sara El Hamdi, on the wire',
      slug: 'portrait-sara-el-hamdi', category: 'PORTRAIT', isPublished: true, publishedAt: new Date('2026-05-02'), authorId: admin.id,
      excerptFr: 'De l’école Shems’y au Borj Adoumoue, itinéraire d’une fildefériste.',
      excerptEn: 'From Shems’y school to Borj Adoumoue, a tightwire artist’s journey.',
      bodyFr: 'Sara a rejoint Shems’y à quatorze ans…', bodyEn: 'Sara joined Shems’y at fourteen…' },
    { titleFr: 'Dans les coulisses du chapiteau', titleEn: 'Behind the big top',
      slug: 'coulisses-chapiteau', category: 'BACKSTAGE', isPublished: true, publishedAt: new Date('2026-06-10'), authorId: admin.id,
      excerptFr: 'Montage du chapiteau, répétitions nocturnes : la biennale se prépare.',
      excerptEn: 'Raising the big top, night rehearsals: the biennale takes shape.',
      bodyFr: 'À deux mois de l’ouverture…', bodyEn: 'Two months before opening…' }
  ], { ignoreDuplicates: true });

  console.log('✔ Seed complete — admin:', admin.email);
  process.exit(0);
}

seed().catch((e) => { console.error(e); process.exit(1); });
