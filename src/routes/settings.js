import { Router } from 'express';
import { getPublicSettings } from '../utils/settings.js';

const router = Router();

// Public : drapeaux de configuration lus par le frontend (billetterie…).
router.get('/', async (req, res, next) => {
  try {
    res.json(await getPublicSettings());
  } catch (e) { next(e); }
});

export default router;
