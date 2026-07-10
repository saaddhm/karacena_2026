import { Router } from 'express';
import { body } from 'express-validator';
import {
  NewsletterSubscriber, ContactMessage, PressAccreditation,
  AtabadoulRegistration, BlogPost, Partner, HistoricalEdition, Venue, User
} from '../models/index.js';
import { validate } from '../middleware/validate.js';
import rateLimit from 'express-rate-limit';

const router = Router();
const formLimiter = rateLimit({ windowMs: 60 * 1000, max: 10 });

// Newsletter
router.post('/newsletter', formLimiter,
  body('email').isEmail().normalizeEmail(),
  body('locale').optional().isIn(['fr', 'en']),
  validate,
  async (req, res, next) => {
    try {
      const [sub, created] = await NewsletterSubscriber.findOrCreate({
        where: { email: req.body.email },
        defaults: { locale: req.body.locale || 'fr' }
      });
      if (!created && sub.unsubscribedAt) await sub.update({ unsubscribedAt: null });
      res.status(created ? 201 : 200).json({ ok: true });
    } catch (e) { next(e); }
  });

// Contact
router.post('/contact', formLimiter,
  body('name').trim().isLength({ min: 2, max: 180 }),
  body('email').isEmail().normalizeEmail(),
  body('message').trim().isLength({ min: 10, max: 5000 }),
  validate,
  async (req, res, next) => {
    try {
      await ContactMessage.create(req.body);
      res.status(201).json({ ok: true });
    } catch (e) { next(e); }
  });

// Press accreditation
router.post('/press/accreditation', formLimiter,
  body('fullName').trim().isLength({ min: 2, max: 180 }),
  body('email').isEmail().normalizeEmail(),
  body('mediaOutlet').trim().isLength({ min: 2, max: 255 }),
  validate,
  async (req, res, next) => {
    try {
      await PressAccreditation.create(req.body);
      res.status(201).json({ ok: true });
    } catch (e) { next(e); }
  });

// Atabadoul registration
router.post('/atabadoul/register', formLimiter,
  body('fullName').trim().isLength({ min: 2, max: 180 }),
  body('email').isEmail().normalizeEmail(),
  validate,
  async (req, res, next) => {
    try {
      await AtabadoulRegistration.create(req.body);
      res.status(201).json({ ok: true });
    } catch (e) { next(e); }
  });

// Atabadoul professional directory (opted-in, confirmed)
router.get('/atabadoul/directory', async (req, res, next) => {
  try {
    const items = await AtabadoulRegistration.findAll({
      where: { wantsDirectory: true, status: 'CONFIRMED' },
      attributes: ['id', 'fullName', 'organization', 'role', 'country', 'directoryBio'],
      order: [['full_name', 'ASC']]
    });
    res.json({ items });
  } catch (e) { next(e); }
});

// Blog (published only)
router.get('/blog', async (req, res, next) => {
  try {
    const where = { isPublished: true };
    if (req.query.category) where.category = req.query.category;
    const items = await BlogPost.findAll({
      where,
      include: [{ model: User, as: 'author', attributes: ['name'] }],
      order: [['published_at', 'DESC']],
      limit: Math.min(Number(req.query.limit) || 50, 100)
    });
    res.json({ items });
  } catch (e) { next(e); }
});

router.get('/blog/:slug', async (req, res, next) => {
  try {
    const post = await BlogPost.findOne({
      where: { slug: req.params.slug, isPublished: true },
      include: [{ model: User, as: 'author', attributes: ['name'] }]
    });
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json(post);
  } catch (e) { next(e); }
});

// Partners
router.get('/partners', async (req, res, next) => {
  try {
    const where = { isActive: true };
    if (req.query.type) where.type = req.query.type;
    res.json({ items: await Partner.findAll({ where, order: [['display_order', 'ASC'], ['name', 'ASC']] }) });
  } catch (e) { next(e); }
});

// Historical editions
router.get('/editions', async (req, res, next) => {
  try {
    res.json({ items: await HistoricalEdition.findAll({ order: [['year', 'ASC']] }) });
  } catch (e) { next(e); }
});

// Venues (map)
router.get('/venues', async (req, res, next) => {
  try { res.json({ items: await Venue.findAll({ order: [['name_fr', 'ASC']] }) }); }
  catch (e) { next(e); }
});

export default router;
