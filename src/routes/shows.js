import { Router } from 'express';
// import { Op } from 'sequelize';
import Sequelize from 'sequelize';
const { Op } = Sequelize;
import { Show, ShowDate, Venue, Artist } from '../models/index.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { isSafeVideoUrl } from '../utils/videoUrl.js';
import { festivalNowSql } from '../utils/festivalTime.js';

const router = Router();

// Admin : TOUTES les séances, passées comprises (historique, stats, exports).
const fullInclude = [
  { model: Artist, through: { attributes: [] } },
  { model: ShowDate, as: 'showDates', include: [Venue] }
];

// Public : uniquement les séances à venir. Une séance est « à venir » tant que
// son heure de début n'est pas dépassée, à l'heure murale de Casablanca — la
// séance de 19:00 reste donc affichée toute la journée jusqu'à 19:00 pile.
// Rien n'est supprimé en base : c'est un simple filtre de lecture.
//
// Coupe-circuit : poser HIDE_PAST_SHOW_DATES=false dans l'environnement
// réaffiche toutes les séances, sans toucher au code (utile en cas de doute
// en production). Toute autre valeur, ou l'absence de variable, garde le filtre.
const FILTER_PAST = process.env.HIDE_PAST_SHOW_DATES !== 'false';
const upcomingWhere = () => (FILTER_PAST ? { startsAt: { [Op.gte]: festivalNowSql() } } : {});

// Tri chronologique des séances imbriquées dans un Show.
const showDatesOrder = [{ model: ShowDate, as: 'showDates' }, 'startsAt', 'ASC'];

const publicInclude = () => [
  { model: Artist, through: { attributes: [] } },
  { model: ShowDate, as: 'showDates', where: upcomingWhere(), required: false, include: [Venue] }
];
const videoUrlValidation = [
  body('teaserVideoUrl')
    .optional({ nullable: true, checkFalsy: true })
    .isString().withMessage('Teaser video URL must be a string.')
    .bail()
    .trim()
    .isLength({ max: 500 }).withMessage('Teaser video URL must not exceed 500 characters.')
    .bail()
    .custom(isSafeVideoUrl).withMessage('Teaser video URL must be a valid HTTP or HTTPS URL.'),
  validate
];

// Public: list published shows with filters (?category=&date=&venue=)
router.get('/', async (req, res, next) => {
  try {
    const where = { isPublished: true };
    if (req.query.category) where.category = req.query.category;
    if (req.query.featured === 'true') where.isFeatured = true;

    // Les séances passées sont TOUJOURS exclues côté public ; le filtre ?date=
    // vient s'ajouter à cette contrainte (Op.and) au lieu de l'écraser.
    const dateClauses = [upcomingWhere()];
    let hasDayFilter = false;
    if (req.query.date) {
      const d = new Date(req.query.date);
      if (!Number.isNaN(d.getTime())) {
        const end = new Date(d); end.setDate(end.getDate() + 1);
        dateClauses.push({ startsAt: { [Op.gte]: d, [Op.lt]: end } });
        hasDayFilter = true;
      }
    }
    const include = [
      { model: Artist, through: { attributes: [] } },
      {
        model: ShowDate,
        as: 'showDates',
        where: { [Op.and]: dateClauses },
        // required:false → un spectacle dont toutes les séances sont passées
        // reste listé (avec showDates vide) : aucune régression d'affichage.
        required: Boolean(hasDayFilter || req.query.venue),
        include: [{ model: Venue, where: req.query.venue ? { slug: req.query.venue } : undefined }]
      }
    ];
    const shows = await Show.findAll({
      where,
      include,
      order: [[Sequelize.literal('display_order = 0'), 'ASC'], ['displayOrder', 'ASC'], ['isFeatured', 'DESC'], ['titleFr', 'ASC'], showDatesOrder]
    });
    res.json({ items: shows });
  } catch (e) { next(e); }
});

// Public: full calendar of dates
router.get('/calendar', async (req, res, next) => {
  try {
    const dates = await ShowDate.findAll({
      where: upcomingWhere(),
      include: [{ model: Show, where: { isPublished: true } }, Venue],
      order: [['starts_at', 'ASC']]
    });
    res.json({ items: dates });
  } catch (e) { next(e); }
});

// Public: show detail by slug
router.get('/slug/:slug', async (req, res, next) => {
  try {
    const show = await Show.findOne({
      where: { slug: req.params.slug, isPublished: true },
      include: publicInclude(),
      order: [showDatesOrder]
    });
    if (!show) return res.status(404).json({ error: 'Show not found' });
    res.json(show);
  } catch (e) { next(e); }
});

// Admin CRUD
router.get('/admin/all', requireAuth, requireAdmin, async (req, res, next) => {
  try { res.json({ items: await Show.findAll({ include: fullInclude, order: [[Sequelize.literal('display_order = 0'), 'ASC'], ['displayOrder', 'ASC'], ['id', 'DESC']] }) }); }
  catch (e) { next(e); }
});

router.post('/', requireAuth, requireAdmin, videoUrlValidation, async (req, res, next) => {
  try {
    const { artistIds = [], ...data } = req.body;
    const show = await Show.create(data);
    if (artistIds.length) await show.setArtists(artistIds);
    res.status(201).json(await Show.findByPk(show.id, { include: fullInclude }));
  } catch (e) { next(e); }
});

router.put('/:id', requireAuth, requireAdmin, videoUrlValidation, async (req, res, next) => {
  try {
    const show = await Show.findByPk(req.params.id);
    if (!show) return res.status(404).json({ error: 'Not found' });
    const { artistIds, ...data } = req.body;
    await show.update(data);
    if (Array.isArray(artistIds)) await show.setArtists(artistIds);
    res.json(await Show.findByPk(show.id, { include: fullInclude }));
  } catch (e) { next(e); }
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const show = await Show.findByPk(req.params.id);
    if (!show) return res.status(404).json({ error: 'Not found' });
    await show.destroy();
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
