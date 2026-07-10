import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

/**
 * Generic admin CRUD router factory.
 * Public GETs are opt-in; all writes require admin JWT.
 */
export function crudRouter(Model, { publicRead = false, include = [], order = [['id', 'DESC']] } = {}) {
  const router = Router();
  const guard = publicRead ? [] : [requireAuth, requireAdmin];

  router.get('/', ...guard, async (req, res, next) => {
    try {
      const limit = Math.min(Number(req.query.limit) || 100, 500);
      const offset = Number(req.query.offset) || 0;
      const rows = await Model.findAndCountAll({ include, order, limit, offset, distinct: true });
      res.json({ total: rows.count, items: rows.rows });
    } catch (e) { next(e); }
  });

  router.get('/:id', ...guard, async (req, res, next) => {
    try {
      const row = await Model.findByPk(req.params.id, { include });
      if (!row) return res.status(404).json({ error: 'Not found' });
      res.json(row);
    } catch (e) { next(e); }
  });

  router.post('/', requireAuth, requireAdmin, async (req, res, next) => {
    try { res.status(201).json(await Model.create(req.body)); } catch (e) { next(e); }
  });

  router.put('/:id', requireAuth, requireAdmin, async (req, res, next) => {
    try {
      const row = await Model.findByPk(req.params.id);
      if (!row) return res.status(404).json({ error: 'Not found' });
      await row.update(req.body);
      res.json(row);
    } catch (e) { next(e); }
  });

  router.delete('/:id', requireAuth, requireAdmin, async (req, res, next) => {
    try {
      const row = await Model.findByPk(req.params.id);
      if (!row) return res.status(404).json({ error: 'Not found' });
      await row.destroy();
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

  return router;
}
