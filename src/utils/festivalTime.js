/**
 * Heure « murale » du festival — Karacena.
 *
 * Les colonnes DATETIME (`show_dates.starts_at`…) stockent des heures LOCALES
 * du festival, sans fuseau, et `config/db.js` active `dateStrings: true` : MySQL
 * les rend telles quelles ("2026-08-25 19:00:00"). Aucune conversion UTC n'a
 * donc lieu, ni à l'écriture ni à la lecture.
 *
 * Pour comparer ces valeurs à « maintenant », il faut donc « maintenant » dans
 * le MÊME référentiel : l'heure murale à Casablanca. On la dérive avec Intl
 * (base IANA) et non avec un décalage fixe « +01:00 », car le Maroc recule ses
 * horloges d'une heure pendant le Ramadan : un offset codé en dur serait faux
 * une partie de l'année.
 *
 * Le serveur peut ainsi tourner en UTC, en Europe/Paris ou en Africa/Casablanca
 * sans changer le résultat.
 */

export const FESTIVAL_TZ = 'Africa/Casablanca';

const PARTS = new Intl.DateTimeFormat('en-CA', {
  timeZone: FESTIVAL_TZ,
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
  hour12: false
});

/**
 * « Maintenant » à Casablanca, au format MySQL "YYYY-MM-DD HH:mm:ss".
 * Directement comparable à une colonne DATETIME via Op.gte / Op.lt.
 * @param {Date} [now] injectable pour les tests
 */
export function festivalNowSql(now = new Date()) {
  try {
    const p = Object.fromEntries(PARTS.formatToParts(now).map((x) => [x.type, x.value]));
    // Intl peut rendre "24" pour minuit selon l'implémentation : on normalise.
    const hour = p.hour === '24' ? '00' : p.hour;
    return `${p.year}-${p.month}-${p.day} ${hour}:${p.minute}:${p.second}`;
  } catch {
    // Environnement sans base de fuseaux (build ICU minimal) : on retombe sur
    // l'heure locale du serveur plutôt que de casser la requête.
    const p = (n) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())} `
      + `${p(now.getHours())}:${p(now.getMinutes())}:${p(now.getSeconds())}`;
  }
}
