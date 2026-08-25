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
 * horloges d'une heure pendant le Ramadan.
 *
 * ROBUSTESSE : ce module ne doit JAMAIS empêcher l'API de démarrer. Certaines
 * versions de Node compilées sans ICU complet (small-icu, images Alpine…) font
 * lever RangeError à `new Intl.DateTimeFormat(..., { timeZone })`. Le
 * formateur est donc construit paresseusement, dans un try/catch, avec un
 * repli qui reste correct. Aucun appel Intl n'a lieu au chargement du module.
 */

export const FESTIVAL_TZ = 'Africa/Casablanca';

let cachedFormatter;   // undefined = pas encore tenté, null = indisponible

function getFormatter() {
  if (cachedFormatter !== undefined) return cachedFormatter;
  try {
    cachedFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: FESTIVAL_TZ,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false
    });
  } catch {
    cachedFormatter = null;
    console.warn(
      `[festivalTime] Intl indisponible pour ${FESTIVAL_TZ} (Node sans ICU complet). `
      + 'Repli sur un décalage fixe UTC+1.'
    );
  }
  return cachedFormatter;
}

const pad = (n) => String(n).padStart(2, '0');
const fmt = (y, mo, d, h, mi, s) => `${y}-${pad(mo)}-${pad(d)} ${pad(h)}:${pad(mi)}:${pad(s)}`;

/**
 * « Maintenant » à Casablanca, au format MySQL "YYYY-MM-DD HH:mm:ss".
 * Directement comparable à une colonne DATETIME via Op.gte / Op.lt.
 * Ne lève jamais : en dernier recours on rend l'heure locale du serveur.
 *
 * @param {Date} [now] injectable pour les tests
 */
export function festivalNowSql(now = new Date()) {
  const f = getFormatter();
  if (f) {
    try {
      const p = {};
      for (const part of f.formatToParts(now)) p[part.type] = part.value;
      if (p.year && p.month && p.day && p.hour && p.minute && p.second) {
        // Certaines implémentations rendent "24" pour minuit.
        const hour = p.hour === '24' ? '00' : p.hour;
        return `${p.year}-${p.month}-${p.day} ${hour}:${p.minute}:${p.second}`;
      }
    } catch { /* on bascule sur le repli ci-dessous */ }
  }
  // Repli 1 : UTC+1 (heure standard du Maroc).
  try {
    const d = new Date(now.getTime() + 3600 * 1000);
    return fmt(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(),
      d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds());
  } catch {
    // Repli 2 : heure locale du serveur — mieux que planter la requête.
    return fmt(now.getFullYear(), now.getMonth() + 1, now.getDate(),
      now.getHours(), now.getMinutes(), now.getSeconds());
  }
}
