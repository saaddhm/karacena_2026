/**
 * Diagnostic Karacena — pourquoi les données n'apparaissent-elles pas ?
 *
 *   cd /chemin/vers/server && node src/scripts/diagnose.js
 *
 * Ne modifie RIEN. Vérifie, dans l'ordre : environnement, chargement des
 * modules, connexion MySQL, contenu de show_dates, et ce que renverraient
 * les routes publiques.
 */
import 'dotenv/config';

const ok = (m) => console.log('  \x1b[32m✔\x1b[0m ' + m);
const ko = (m) => console.log('  \x1b[31m✘\x1b[0m ' + m);
const info = (m) => console.log('    ' + m);
const title = (m) => console.log('\n\x1b[1m' + m + '\x1b[0m');

let fatal = false;

title('1. Environnement');
info(`Node                : ${process.version}`);
info(`TZ du serveur       : ${process.env.TZ || '(non défini)'}`);
info(`Heure locale serveur: ${new Date().toString()}`);
info(`NODE_ENV            : ${process.env.NODE_ENV || '(non défini)'}`);
info(`DB_NAME / DB_HOST   : ${process.env.DB_NAME || '?'} @ ${process.env.DB_HOST || '?'}:${process.env.DB_PORT || 3306}`);
try {
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Casablanca' }).format(new Date());
  ok('Intl connaît Africa/Casablanca (ICU complet)');
} catch (e) {
  ko(`Intl NE connaît PAS Africa/Casablanca -> ${e.name}. Repli UTC+1 utilisé.`);
}

title('2. Chargement des modules modifiés');
let festivalNowSql;
try {
  ({ festivalNowSql } = await import('../utils/festivalTime.js'));
  ok(`utils/festivalTime.js chargé — maintenant à Casablanca = ${festivalNowSql()}`);
} catch (e) {
  ko(`utils/festivalTime.js NE SE CHARGE PAS -> ${e.name}: ${e.message}`);
  console.log(e.stack);
  fatal = true;
}
let models;
try {
  models = await import('../models/index.js');
  ok('models/index.js chargé');
} catch (e) {
  ko(`models/index.js -> ${e.name}: ${e.message}`);
  fatal = true;
}
try {
  await import('../routes/shows.js');
  ok('routes/shows.js chargé');
} catch (e) {
  ko(`routes/shows.js NE SE CHARGE PAS -> ${e.name}: ${e.message}`);
  console.log(e.stack);
  fatal = true;
}

if (fatal) {
  console.log('\n\x1b[31mUn module ne se charge pas : c\'est la cause du crash de l\'API.\x1b[0m\n');
  process.exit(1);
}

title('3. Connexion MySQL');
const { sequelize, ShowDate, Show } = models;
try {
  await sequelize.authenticate();
  ok('connexion MySQL établie');
} catch (e) {
  ko(`MySQL injoignable -> ${e.message}`);
  process.exit(1);
}
const [[dbNow]] = await sequelize.query('SELECT NOW() AS n, @@session.time_zone AS tz');
info(`NOW() côté MySQL    : ${dbNow.n}  (time_zone = ${dbNow.tz})`);
info(`Filtre appliqué     : starts_at >= '${festivalNowSql()}'`);

title('4. Contenu de show_dates');
const total = await ShowDate.count();
const published = await Show.count({ where: { isPublished: true } });
info(`séances en base            : ${total}`);
info(`spectacles publiés         : ${published}`);
if (!total) ko('AUCUNE séance en base — le filtre n\'y est pour rien.');
if (!published) ko('AUCUN spectacle publié (is_published = 1) — rien ne s\'affichera.');

const rows = await sequelize.query(
  `SELECT sd.id, sd.starts_at, sd.status, s.title_fr, s.is_published,
          (sd.starts_at >= ?) AS a_venir
     FROM show_dates sd JOIN shows s ON s.id = sd.show_id
    ORDER BY sd.starts_at`,
  { replacements: [festivalNowSql()], type: sequelize.QueryTypes.SELECT }
);
const upcoming = rows.filter((r) => Number(r.a_venir) === 1);
const past = rows.filter((r) => Number(r.a_venir) !== 1);
info(`séances À VENIR (affichées): ${upcoming.length}`);
info(`séances PASSÉES (masquées) : ${past.length}`);
console.log();
for (const r of rows) {
  const flag = Number(r.a_venir) === 1 ? '\x1b[32mÀ VENIR\x1b[0m' : '\x1b[90mpassée \x1b[0m';
  const pub = r.is_published ? '' : ' \x1b[33m[NON PUBLIÉ]\x1b[0m';
  console.log(`    ${flag}  ${r.starts_at}  ${String(r.title_fr).slice(0, 34)}${pub}`);
}
if (rows.length && !upcoming.length) {
  console.log();
  ko('Toutes les séances sont passées : le site public n\'affichera aucune date.');
  info('-> soit le festival est terminé, soit les dates en base doivent être mises à jour.');
}

title('5. Ce que renvoient les routes publiques');
const { Op } = (await import('sequelize')).default;
const cal = await ShowDate.count({
  where: { startsAt: { [Op.gte]: festivalNowSql() } },
  include: [{ model: Show, where: { isPublished: true } }]
});
info(`GET /api/shows/calendar  -> ${cal} séance(s)`);
const shows = await Show.count({ where: { isPublished: true } });
info(`GET /api/shows           -> ${shows} spectacle(s)`);

console.log('\n\x1b[1mSi cette section renvoie des données mais que le site est vide,');
console.log('le problème est le service (pm2) ou le proxy Nginx, pas le filtre.\x1b[0m\n');
await sequelize.close();
