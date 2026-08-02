import { Router } from 'express';
import bcrypt from 'bcrypt';
import Sequelize from 'sequelize';
const { Op } = Sequelize;
import { body, param } from 'express-validator';
import { User, AuditLog } from '../models/index.js';
import { requireAuth, requirePermission, ROLES } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { logAudit } from '../utils/audit.js';

const router = Router();
const BCRYPT_COST = 12;

// Le hash de mot de passe ne sort JAMAIS de l'API.
const SAFE_ATTRIBUTES = ['id', 'name', 'email', 'role', 'status', 'lastLogin', 'createdBy', 'updatedBy', 'createdAt', 'updatedAt'];
const SORTABLE = ['id', 'name', 'email', 'role', 'status', 'createdAt', 'lastLogin'];
const ADMIN_ROLES = ['superadmin', 'admin'];

// Toutes les routes : JWT + permission « users » (admin / superadmin).
router.use(requireAuth, requirePermission('users'));

const isSuperadmin = (req) => req.user.role === 'superadmin';

// Seul un superadmin peut toucher à un compte superadmin ou attribuer ce rôle.
function forbiddenSuperadminAccess(req, targetUser, requestedRole) {
  if (isSuperadmin(req)) return false;
  return targetUser?.role === 'superadmin' || requestedRole === 'superadmin';
}

// Empêche de retirer le dernier compte d'administration actif.
async function isLastActiveAdmin(targetUser) {
  if (!ADMIN_ROLES.includes(targetUser.role) || targetUser.status !== 'active') return false;
  const others = await User.count({
    where: { id: { [Op.ne]: targetUser.id }, role: { [Op.in]: ADMIN_ROLES }, status: 'active' }
  });
  return others === 0;
}

const passwordRules = (field) => body(field)
  .isLength({ min: 8 }).withMessage('Le mot de passe doit contenir au moins 8 caractères.')
  .matches(/[a-zA-Z]/).withMessage('Le mot de passe doit contenir au moins une lettre.')
  .matches(/\d/).withMessage('Le mot de passe doit contenir au moins un chiffre.');

// ---------- Journal d'audit (avant /:id pour éviter tout conflit de route) ----------
router.get('/audit/logs', requirePermission('audit'), async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Number(req.query.offset) || 0;
    const where = {};
    if (req.query.action) where.action = req.query.action;
    const rows = await AuditLog.findAndCountAll({ where, order: [['id', 'DESC']], limit, offset });
    res.json({ total: rows.count, items: rows.rows });
  } catch (e) { next(e); }
});

// ---------- GET /api/users — liste (recherche, filtres, tri, pagination) ----------
router.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const offset = Number(req.query.offset) || 0;
    const sort = SORTABLE.includes(req.query.sort) ? req.query.sort : 'id';
    const dir = String(req.query.dir).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const where = {};
    if (req.query.q) {
      const q = `%${String(req.query.q).trim()}%`;
      where[Op.or] = [{ name: { [Op.like]: q } }, { email: { [Op.like]: q } }];
    }
    if (req.query.role && ROLES.includes(req.query.role)) where.role = req.query.role;
    if (['active', 'inactive'].includes(req.query.status)) where.status = req.query.status;

    const rows = await User.findAndCountAll({
      where, attributes: SAFE_ATTRIBUTES, order: [[sort, dir]], limit, offset
    });
    res.json({ total: rows.count, items: rows.rows });
  } catch (e) { next(e); }
});

// ---------- GET /api/users/:id ----------
router.get('/:id', param('id').isInt(), validate, async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id, { attributes: SAFE_ATTRIBUTES });
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
    res.json(user);
  } catch (e) { next(e); }
});

// ---------- POST /api/users — création ----------
router.post('/',
  body('name').trim().isLength({ min: 2, max: 120 }).withMessage('Nom : 2 à 120 caractères.'),
  body('email').isEmail().withMessage('Email invalide.').normalizeEmail(),
  passwordRules('password'),
  body('role').optional().isIn(ROLES).withMessage('Rôle invalide.'),
  body('status').optional().isIn(['active', 'inactive']),
  validate,
  async (req, res, next) => {
    try {
      const { name, email, password, role = 'editor', status = 'active' } = req.body;
      if (forbiddenSuperadminAccess(req, null, role)) {
        return res.status(403).json({ error: 'Seul un superadmin peut créer un superadmin.' });
      }
      const existing = await User.findOne({ where: { email } });
      if (existing) return res.status(409).json({ error: 'Cet email est déjà utilisé.' });

      const user = await User.create({
        name, email, role, status,
        passwordHash: await bcrypt.hash(password, BCRYPT_COST),
        createdBy: req.user.id, updatedBy: req.user.id
      });
      await logAudit(req, { action: 'USER_CREATE', targetId: user.id, targetLabel: email, details: { role, status } });
      const safe = await User.findByPk(user.id, { attributes: SAFE_ATTRIBUTES });
      res.status(201).json(safe);
    } catch (e) { next(e); }
  });

// ---------- PUT /api/users/:id — modification (nom, email, rôle, statut) ----------
router.put('/:id',
  param('id').isInt(),
  body('name').optional().trim().isLength({ min: 2, max: 120 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('role').optional().isIn(ROLES),
  body('status').optional().isIn(['active', 'inactive']),
  validate,
  async (req, res, next) => {
    try {
      const user = await User.findByPk(req.params.id);
      if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
      const { name, email, role, status } = req.body;

      if (forbiddenSuperadminAccess(req, user, role)) {
        return res.status(403).json({ error: 'Seul un superadmin peut modifier un superadmin.' });
      }
      if (email && email !== user.email) {
        const dup = await User.findOne({ where: { email, id: { [Op.ne]: user.id } } });
        if (dup) return res.status(409).json({ error: 'Cet email est déjà utilisé.' });
      }
      // Protéger le dernier administrateur actif contre la rétrogradation/désactivation.
      const losesAdmin = (role && !ADMIN_ROLES.includes(role)) || status === 'inactive';
      if (losesAdmin && await isLastActiveAdmin(user)) {
        return res.status(409).json({ error: 'Impossible : c’est le dernier administrateur actif.' });
      }
      if (user.id === req.user.id && status === 'inactive') {
        return res.status(409).json({ error: 'Vous ne pouvez pas désactiver votre propre compte.' });
      }

      const roleChanged = role && role !== user.role;
      const previous = { name: user.name, email: user.email, role: user.role, status: user.status };
      await user.update({
        name: name ?? user.name,
        email: email ?? user.email,
        role: role ?? user.role,
        status: status ?? user.status,
        updatedBy: req.user.id
      });
      await logAudit(req, {
        action: roleChanged ? 'USER_ROLE' : 'USER_UPDATE',
        targetId: user.id, targetLabel: user.email,
        details: { before: previous, after: { name: user.name, email: user.email, role: user.role, status: user.status } }
      });
      res.json(await User.findByPk(user.id, { attributes: SAFE_ATTRIBUTES }));
    } catch (e) { next(e); }
  });

// ---------- PATCH /api/users/:id/password ----------
router.patch('/:id/password',
  param('id').isInt(),
  passwordRules('password'),
  body('passwordConfirm').custom((v, { req }) => v === req.body.password).withMessage('La confirmation ne correspond pas.'),
  validate,
  async (req, res, next) => {
    try {
      const user = await User.findByPk(req.params.id);
      if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
      if (forbiddenSuperadminAccess(req, user)) {
        return res.status(403).json({ error: 'Seul un superadmin peut modifier un superadmin.' });
      }
      await user.update({
        passwordHash: await bcrypt.hash(req.body.password, BCRYPT_COST),
        updatedBy: req.user.id
      });
      await logAudit(req, { action: 'USER_PASSWORD', targetId: user.id, targetLabel: user.email });
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

// ---------- PATCH /api/users/:id/status — activer / désactiver ----------
router.patch('/:id/status',
  param('id').isInt(),
  body('status').isIn(['active', 'inactive']).withMessage('Statut invalide.'),
  validate,
  async (req, res, next) => {
    try {
      const user = await User.findByPk(req.params.id);
      if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
      if (forbiddenSuperadminAccess(req, user)) {
        return res.status(403).json({ error: 'Seul un superadmin peut modifier un superadmin.' });
      }
      if (user.id === req.user.id && req.body.status === 'inactive') {
        return res.status(409).json({ error: 'Vous ne pouvez pas désactiver votre propre compte.' });
      }
      if (req.body.status === 'inactive' && await isLastActiveAdmin(user)) {
        return res.status(409).json({ error: 'Impossible : c’est le dernier administrateur actif.' });
      }
      await user.update({ status: req.body.status, updatedBy: req.user.id });
      await logAudit(req, { action: 'USER_STATUS', targetId: user.id, targetLabel: user.email, details: { status: req.body.status } });
      res.json(await User.findByPk(user.id, { attributes: SAFE_ATTRIBUTES }));
    } catch (e) { next(e); }
  });

// ---------- DELETE /api/users/:id ----------
router.delete('/:id', param('id').isInt(), validate, async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
    if (forbiddenSuperadminAccess(req, user)) {
      return res.status(403).json({ error: 'Seul un superadmin peut supprimer un superadmin.' });
    }
    if (user.id === req.user.id) {
      return res.status(409).json({ error: 'Vous ne pouvez pas supprimer votre propre compte.' });
    }
    if (await isLastActiveAdmin(user)) {
      return res.status(409).json({ error: 'Impossible : c’est le dernier administrateur actif.' });
    }
    const label = user.email;
    await user.destroy();
    await logAudit(req, { action: 'USER_DELETE', targetId: Number(req.params.id), targetLabel: label });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
