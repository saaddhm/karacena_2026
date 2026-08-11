import { Router } from 'express';
import { crudRouter } from '../utils/crud.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { getPublicSettings, setBoolSetting } from '../utils/settings.js';
import { logAudit } from '../utils/audit.js';
import {
  Artist, Venue, ShowDate, Show, BlogPost, Partner, HistoricalEdition,
  NewsletterSubscriber, ContactMessage, PressAccreditation,
  AtabadoulRegistration, MediaFile, Translation, Ticket
} from '../models/index.js';
import { computeDashboard } from '../utils/dashboardStats.js';
import { buildReportWorkbook } from '../utils/reportExcel.js';
import { attachmentDisposition } from '../utils/bookingsExcel.js';

const router = Router();

// Dashboard stats (agrégations réelles sur la période ?from=&to=)
router.get('/stats', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    res.json(await computeDashboard(req.query.from, req.query.to));
  } catch (e) { next(e); }
});

// Export du rapport tableau de bord (.xlsx) sur la période sélectionnée
router.get('/report', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const data = await computeDashboard(req.query.from, req.query.to);
    const wb = buildReportWorkbook(data);
    const filename = `rapport-karacena-${data.range.from}_${data.range.to}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', attachmentDisposition(filename, filename));
    await wb.xlsx.write(res);
    res.end();
  } catch (e) { next(e); }
});

// Réglages globaux — lecture (admin)
router.get('/settings', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    res.json(await getPublicSettings());
  } catch (e) { next(e); }
});

// Réglages globaux — mise à jour (admin). Actuellement : paiement en ligne.
router.put('/settings', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    if (typeof req.body?.onlinePaymentEnabled === 'boolean') {
      await setBoolSetting('online_payment_enabled', req.body.onlinePaymentEnabled);
      await logAudit(req, {
        action: 'SETTINGS_UPDATE',
        targetType: 'setting',
        targetLabel: 'online_payment_enabled',
        details: { onlinePaymentEnabled: req.body.onlinePaymentEnabled }
      });
    }
    if (typeof req.body?.reservationsEnabled === 'boolean') {
      await setBoolSetting('reservations_enabled', req.body.reservationsEnabled);
      await logAudit(req, {
        action: 'SETTINGS_UPDATE',
        targetType: 'setting',
        targetLabel: 'reservations_enabled',
        details: { reservationsEnabled: req.body.reservationsEnabled }
      });
    }
    res.json(await getPublicSettings());
  } catch (e) { next(e); }
});

// Media upload
router.post('/media', requireAuth, requireAdmin, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    const media = await MediaFile.create({
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      url: `/uploads/${req.file.filename}`,
      altFr: req.body.altFr || '',
      altEn: req.body.altEn || ''
    });
    res.status(201).json(media);
  } catch (e) { next(e); }
});

// Generic CRUD for managed resources
router.use('/artists', crudRouter(Artist, { publicRead: true }));
router.use('/venues', crudRouter(Venue, { publicRead: true }));
router.use('/show-dates', crudRouter(ShowDate, { include: [Show, Venue] }));
router.use('/blog-posts', crudRouter(BlogPost));
router.use('/partners', crudRouter(Partner));
router.use('/editions', crudRouter(HistoricalEdition));
router.use('/newsletter', crudRouter(NewsletterSubscriber));
router.use('/messages', crudRouter(ContactMessage));
router.use('/press-accreditations', crudRouter(PressAccreditation));
router.use('/atabadoul-registrations', crudRouter(AtabadoulRegistration));
router.use('/media-files', crudRouter(MediaFile));
router.use('/translations', crudRouter(Translation, { publicRead: true }));

export default router;
