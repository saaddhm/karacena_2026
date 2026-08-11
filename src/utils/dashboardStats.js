import Sequelize from 'sequelize';
import {
  Show, Artist, NewsletterSubscriber, PressAccreditation,
  AtabadoulRegistration, Ticket, ContactMessage, Booking, ShowDate,
} from '../models/index.js';

const { Op, fn, col } = Sequelize;

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const endOfDay = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };
const ymd = (d) => {
  const x = new Date(d); const p = (n) => String(n).padStart(2, '0');
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`;
};
const pctChange = (cur, prev) => (prev === 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 100));

/**
 * Calcule toutes les données du tableau de bord admin pour une période [from, to].
 * Utilise uniquement des données réellement présentes en base (Booking, Ticket,
 * Show, ShowDate, etc.). Réutilisé par la route stats ET par l'export rapport.
 */
export async function computeDashboard(fromRaw, toRaw) {
  const to = endOfDay(toRaw ? new Date(toRaw) : new Date());
  const from = startOfDay(fromRaw ? new Date(fromRaw) : new Date(to.getTime() - 6 * 86400000));
  const spanMs = to.getTime() - from.getTime();
  const prevTo = new Date(from.getTime() - 1);
  const prevFrom = new Date(from.getTime() - spanMs - 1);

  const inRange = { createdAt: { [Op.between]: [from, to] } };
  const inPrev = { createdAt: { [Op.between]: [prevFrom, prevTo] } };

  // --- Totaux (état courant) ---
  const [totalShows, totalArtists, totalSubs, totalTickets, totalAtab, pending, newMsg] = await Promise.all([
    Show.count(), Artist.count(), NewsletterSubscriber.count(), Ticket.count(),
    AtabadoulRegistration.count(),
    PressAccreditation.count({ where: { status: 'PENDING' } }),
    ContactMessage.count({ where: { status: 'NEW' } }),
  ]);

  // --- Tendances (créés dans la période vs période précédente) ---
  const trend = async (model, extra = {}) => {
    const [c, p] = await Promise.all([
      model.count({ where: { ...extra, ...inRange } }),
      model.count({ where: { ...extra, ...inPrev } }),
    ]);
    return pctChange(c, p);
  };
  const [tShows, tArtists, tSubs, tTickets, tAtab] = await Promise.all([
    trend(Show), trend(Artist), trend(NewsletterSubscriber), trend(Ticket), trend(AtabadoulRegistration),
  ]);

  // --- Série quotidienne : réservations & billets émis ---
  const [bDay, tDay] = await Promise.all([
    Booking.findAll({ attributes: [[fn('DATE', col('created_at')), 'd'], [fn('COUNT', '*'), 'c']], where: inRange, group: [fn('DATE', col('created_at'))], raw: true }),
    Ticket.findAll({ attributes: [[fn('DATE', col('created_at')), 'd'], [fn('COUNT', '*'), 'c']], where: inRange, group: [fn('DATE', col('created_at'))], raw: true }),
  ]);
  const bMap = Object.fromEntries(bDay.map((r) => [String(r.d).slice(0, 10), Number(r.c)]));
  const tMap = Object.fromEntries(tDay.map((r) => [String(r.d).slice(0, 10), Number(r.c)]));
  const series = [];
  for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    const key = ymd(d);
    series.push({ date: key, label: `${key.slice(8, 10)}/${key.slice(5, 7)}`, reservations: bMap[key] || 0, tickets: tMap[key] || 0 });
  }

  // --- Réservations de la période (top, statuts, canaux, plus réservé) ---
  const rows = await Booking.findAll({
    where: inRange,
    attributes: ['id', 'paymentStatus', 'paymentMethod'],
    include: [{ model: ShowDate, as: 'showDate', attributes: ['id', 'showId'], include: [{ model: Show, attributes: ['id', 'titleFr', 'slug', 'posterUrl'] }] }],
  });
  const totalB = rows.length || 1;
  const st = { confirmed: 0, pending: 0, cancelled: 0, refunded: 0 };
  const ch = { web: 0, onsite: 0 };
  const showAgg = new Map();
  for (const b of rows) {
    if (b.paymentStatus === 'PAID') st.confirmed += 1;
    else if (b.paymentStatus === 'PENDING') st.pending += 1;
    else if (b.paymentStatus === 'REFUNDED') st.refunded += 1;
    else st.cancelled += 1;
    if (b.paymentMethod === 'ONSITE') ch.onsite += 1; else ch.web += 1;
    const show = b.showDate?.show;
    if (show) {
      const cur = showAgg.get(show.id) || { id: show.id, title: show.titleFr, slug: show.slug, posterUrl: show.posterUrl, count: 0 };
      cur.count += 1; showAgg.set(show.id, cur);
    }
  }
  const topShows = [...showAgg.values()].sort((a, b) => b.count - a.count).slice(0, 5)
    .map((s) => ({ ...s, pct: Math.round((s.count / totalB) * 100) }));
  const statuses = [['confirmed', st.confirmed], ['pending', st.pending], ['cancelled', st.cancelled], ['refunded', st.refunded]]
    .map(([key, value]) => ({ key, value, pct: Math.round((value / totalB) * 100) }));
  const channels = [['web', ch.web], ['onsite', ch.onsite]]
    .map(([key, value]) => ({ key, value, pct: Math.round((value / totalB) * 100) }));

  let mostBooked = null;
  if (topShows.length) {
    const top = topShows[0];
    const next = await ShowDate.findOne({
      where: { showId: top.id, startsAt: { [Op.gte]: new Date() } },
      order: [['startsAt', 'ASC']], attributes: ['startsAt'],
    });
    mostBooked = { ...top, nextDate: next?.startsAt || null };
  }

  // --- Activité récente (réservations + messages + accréditations) ---
  const [recentBookings, recentMsgs, recentPress] = await Promise.all([
    Booking.findAll({ order: [['id', 'DESC']], limit: 5, attributes: ['reference', 'quantity', 'paymentStatus', 'createdAt'], include: [{ model: ShowDate, as: 'showDate', attributes: ['id'], include: [{ model: Show, attributes: ['titleFr'] }] }] }),
    ContactMessage.findAll({ order: [['id', 'DESC']], limit: 5, attributes: ['email', 'createdAt'] }),
    PressAccreditation.findAll({ order: [['id', 'DESC']], limit: 5, attributes: ['mediaOutlet', 'createdAt'] }),
  ]);
  const recent = [
    ...recentBookings.map((b) => ({ type: 'booking', title: b.paymentStatus === 'PAID' ? 'Réservation confirmée' : 'Réservation reçue', subtitle: `${b.showDate?.show?.titleFr || '—'} — ${b.quantity} billet(s)`, at: b.createdAt })),
    ...recentMsgs.map((m) => ({ type: 'message', title: 'Nouveau message', subtitle: `De : ${m.email}`, at: m.createdAt })),
    ...recentPress.map((p) => ({ type: 'press', title: 'Accréditation demandée', subtitle: p.mediaOutlet, at: p.createdAt })),
  ].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 8);

  return {
    range: { from: ymd(from), to: ymd(to) },
    cards: {
      shows: { value: totalShows, pct: tShows },
      artists: { value: totalArtists, pct: tArtists },
      subscribers: { value: totalSubs, pct: tSubs },
      tickets: { value: totalTickets, pct: tTickets },
      pressPending: { value: pending, alert: pending > 0 },
      atabadoul: { value: totalAtab, pct: tAtab },
      newMessages: { value: newMsg, alert: newMsg > 0 },
    },
    series,
    topShows,
    mostBooked,
    statuses,
    channels,
    recent,
    totalBookings: rows.length,
  };
}
