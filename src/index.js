// import express from 'express';
// import cors from 'cors';
// import helmet from 'helmet';
// import rateLimit from 'express-rate-limit';
// import path from 'path';
// import { fileURLToPath } from 'url';
// import dotenv from 'dotenv';
// dotenv.config();

// import { connectDB, sequelize } from './config/db.js';
// import { runMigrations } from './scripts/migrate.js';
// import authRoutes from './routes/auth.js';
// import showRoutes from './routes/shows.js';
// import bookingRoutes from './routes/bookings.js';
// import ticketRoutes from './routes/tickets.js';
// import publicRoutes from './routes/public.js';
// import adminRoutes from './routes/admin.js';
// import { notFound, errorHandler } from './middleware/errorHandler.js';

// const __dirname = path.dirname(fileURLToPath(import.meta.url));
// const app = express();

// app.set('trust proxy', 1);
// app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
// app.use(cors({ origin: process.env.CLIENT_URL?.split(',') || '*' }));
// app.use(express.json({ limit: '2mb' }));
// app.use(express.urlencoded({ extended: true })); // CMI posts form-encoded callbacks
// app.use(rateLimit({ windowMs: 60 * 1000, max: 300 }));

// // Static uploads
// app.use('/uploads', express.static(path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads')));

// app.get('/api/health', (req, res) => res.json({ ok: true, edition: 'Karacena 2026 — Faire corps' }));

// app.use('/api/auth', authRoutes);
// app.use('/api/shows', showRoutes);
// app.use('/api/bookings', bookingRoutes);
// app.use('/api/tickets', ticketRoutes);
// app.use('/api', publicRoutes);
// app.use('/api/admin', adminRoutes);

// app.use(notFound);
// app.use(errorHandler);

// const PORT = process.env.PORT || 5000;
// connectDB()
//   .then(() => sequelize.sync())
//   .then(() => runMigrations())
//   .then(() => app.listen(PORT, () => console.log(`✔ Karacena API on http://localhost:${PORT}`)))
//   .catch((e) => { 
//     console.error('✖ Startup failed:', e.message); process.exit(1); 
  
//   });

import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { connectDB } from './config/db.js';
import { runMigrations } from './scripts/migrate.js';

import authRoutes from './routes/auth.js';
import showRoutes from './routes/shows.js';
import bookingRoutes from './routes/bookings.js';
import ticketRoutes from './routes/tickets.js';
import publicRoutes from './routes/public.js';
import adminRoutes from './routes/admin.js';

import {
  notFound,
  errorHandler,
} from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 5000);

/*
|--------------------------------------------------------------------------
| Reverse proxy
|--------------------------------------------------------------------------
*/

app.set('trust proxy', 1);

/*
|--------------------------------------------------------------------------
| Security
|--------------------------------------------------------------------------
*/

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: 'cross-origin',
    },
  }),
);

/*
|--------------------------------------------------------------------------
| CORS
|--------------------------------------------------------------------------
*/

const allowedOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Autoriser curl, Postman, CMI et les requêtes serveur à serveur
      if (!origin) {
        return callback(null, true);
      }

      if (
        allowedOrigins.length === 0 ||
        allowedOrigins.includes(origin)
      ) {
        return callback(null, true);
      }

      return callback(
        new Error(`CORS origin not allowed: ${origin}`),
      );
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

/*
|--------------------------------------------------------------------------
| Body parsing
|--------------------------------------------------------------------------
*/

app.use(express.json({ limit: '2mb' }));

app.use(
  express.urlencoded({
    extended: true,
    limit: '2mb',
  }),
);

/*
|--------------------------------------------------------------------------
| Rate limiting
|--------------------------------------------------------------------------
*/

app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

/*
|--------------------------------------------------------------------------
| Static uploads
|--------------------------------------------------------------------------
*/

const configuredUploadDir =
  process.env.UPLOAD_DIR?.trim() || 'uploads';

const uploadDirectory = path.isAbsolute(configuredUploadDir)
  ? configuredUploadDir
  : path.resolve(__dirname, '..', configuredUploadDir);

app.use('/uploads', express.static(uploadDirectory));

/*
|--------------------------------------------------------------------------
| Health check
|--------------------------------------------------------------------------
*/

app.get('/api/health', (req, res) => {
  res.status(200).json({
    ok: true,
    environment: process.env.NODE_ENV || 'development',
    edition: 'Karacena 2026 — Faire corps',
  });
});

/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
*/

app.use('/api/auth', authRoutes);
app.use('/api/shows', showRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', publicRoutes);

/*
|--------------------------------------------------------------------------
| Client (production build) — serves client/dist when it exists.
| Same origin as the API, so the built site needs no CORS and no proxy.
|--------------------------------------------------------------------------
*/

const clientDist = path.resolve(__dirname, '..', '..', 'client', 'dist');

if (fs.existsSync(path.join(clientDist, 'index.html'))) {
  app.use(express.static(clientDist, { maxAge: '1h', index: 'index.html' }));

  // SPA fallback: every non-API, non-upload GET returns index.html
  // so React Router handles /billetterie, /admin, /billets/…, etc.
  app.get(/^\/(?!api\/|uploads\/).*/, (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });

  console.log('✔ Serving client build from', clientDist);
}

/*
|--------------------------------------------------------------------------
| Error handlers
|--------------------------------------------------------------------------
*/

app.use(notFound);
app.use(errorHandler);

/*
|--------------------------------------------------------------------------
| Startup
|--------------------------------------------------------------------------
*/

async function startServer() {
  try {
    await connectDB();
    console.log('✔ MySQL connected');

    await runMigrations();
    console.log('✔ Database migrations completed');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✔ Karacena API running on port ${PORT}`);
      console.log(
        `✔ Local health check: http://127.0.0.1:${PORT}/api/health`,
      );
    });
  } catch (error) {
    console.error('✖ Startup failed:', error);
    console.error(error?.stack);
    process.exit(1);
  }
}

startServer();
