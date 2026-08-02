import { AuditLog } from '../models/index.js';

/**
 * Journalise une action d'administration (création, modification, mot de
 * passe, statut, rôle, suppression). Ne bloque jamais la requête principale.
 *
 * logAudit(req, { action, targetId, targetLabel, details })
 */
export async function logAudit(req, { action, targetType = 'user', targetId = null, targetLabel = null, details = null }) {
  try {
    await AuditLog.create({
      action,
      targetType,
      targetId,
      targetLabel,
      actorId: req.user?.id || null,
      actorEmail: req.user?.email || null,
      ip: req.ip || req.headers['x-forwarded-for'] || null,
      details
    });
  } catch (e) {
    console.error('[audit] écriture impossible :', e.message);
  }
}
