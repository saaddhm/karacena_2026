import jwt from 'jsonwebtoken';

/*
|--------------------------------------------------------------------------
| Permissions centralisées
|--------------------------------------------------------------------------
| superadmin : accès total (y compris gestion des superadmins)
| admin      : gestion du contenu + gestion des utilisateurs + audit
| editor     : contenu uniquement + scanner d'entrée
| user       : aucune administration
*/
export const ROLES = ['superadmin', 'admin', 'editor', 'user'];

export const PERMISSIONS = {
  superadmin: ['content', 'users', 'audit', 'scanner', 'superadmin'],
  admin: ['content', 'users', 'audit', 'scanner'],
  editor: ['content', 'scanner'],
  user: []
};

export function hasPermission(role, permission) {
  return PERMISSIONS[role]?.includes(permission) || false;
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Historique : « admin » = niveau administration complet. Étendu au superadmin
// pour que toutes les routes existantes restent valides sans régression.
export function requireAdmin(req, res, next) {
  if (!['admin', 'superadmin'].includes(req.user?.role)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

/** Garde générique par permission (voir PERMISSIONS ci-dessus). */
export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (!hasPermission(req.user.role, permission)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

// All authenticated staff accounts may operate the entrance scanner. This is
// deliberately separate from requireAdmin so management APIs remain admin-only.
export function requireScannerAccess(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  if (!hasPermission(req.user.role, 'scanner')) {
    return res.status(403).json({ error: 'Scanner access required' });
  }
  next();
}
