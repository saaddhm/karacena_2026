import { Router } from 'express';
// import { Op } from 'sequelize';
import Sequelize from 'sequelize';
const { Op } = Sequelize;
import { Show, ShowDate, Venue, Artist } from '../models/index.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();
const fullInclude = [
  { model: Artist, through: { attributes: [] } },
  { model: ShowDate, as: 'showDates', include: [Venue] }
];

// Public: list published shows with filters (?category=&date=&venue=)
router.get('/', async (req, res, next) => {
  try {
    const where = { isPublished: true };
    if (req.query.category) where.category = req.query.category;
    if (req.query.featured === 'true') where.isFeatured = true;

    const dateWhere = {};
    if (req.query.date) {
      const d = new Date(req.query.date);
      const end = new Date(d); end.setDate(end.getDate() + 1);
      dateWhere.startsAt = { [Op.gte]: d, [Op.lt]: end };
    }
    const include = [
      { model: Artist, through: { attributes: [] } },
      {
        model: ShowDate,
        as: 'showDates',
        where: Object.keys(dateWhere).length || req.query.venue ? dateWhere : undefined,
        required: Boolean(Object.keys(dateWhere).length || req.query.venue),
        include: [{ model: Venue, where: req.query.venue ? { slug: req.query.venue } : undefined }]
      }
    ];
    const shows = await Show.findAll({ where, include, order: [['isFeatured', 'DESC'], ['titleFr', 'ASC']] });
    res.json({ items: shows });
  } catch (e) { next(e); }
});

// Public: full calendar of dates
router.get('/calendar', async (req, res, next) => {
  try {
    const dates = await ShowDate.findAll({
      include: [{ model: Show, where: { isPublished: true } }, Venue],
      order: [['starts_at', 'ASC']]
    });
    res.json({ items: dates });
  } catch (e) { next(e); }
});

// Public: show detail by slug
router.get('/slug/:slug', async (req, res, next) => {
  try {
    const show = await Show.findOne({ where: { slug: req.params.slug, isPublished: true }, include: fullInclude });
    if (!show) return res.status(404).json({ error: 'Show not found' });
    res.json(show);
  } catch (e) { next(e); }
});

// Admin CRUD
router.get('/admin/all', requireAuth, requireAdmin, async (req, res, next) => {
  try { res.json({ items: await Show.findAll({ include: fullInclude, order: [['id', 'DESC']] }) }); }
  catch (e) { next(e); }
});

router.post('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { artistIds = [], ...data } = req.body;
    const show = await Show.create(data);
    if (artistIds.length) await show.setArtists(artistIds);
    res.status(201).json(await Show.findByPk(show.id, { include: fullInclude }));
  } catch (e) { next(e); }
});

router.put('/:id', requireAuth, requireAdmin, async (req, res, next) => {
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
