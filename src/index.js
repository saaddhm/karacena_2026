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
//   .catch((e) => { console.error('✖ Startup failed:', e.message); process.exit(1); });
import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
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

// Application behind Nginx/reverse proxy
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
      // Allow requests without Origin:
      // curl, Postman, server-to-server and CMI callbacks
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
| Request parsing
|--------------------------------------------------------------------------
*/

app.use(express.json({ limit: '2mb' }));

// Necessary for CMI form-encoded callbacks
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
| Health endpoint
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
| API routes
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

    // Apply controlled database migrations.
    // Avoid sequelize.sync() in production because it may modify
    // the schema unexpectedly.
    await runMigrations();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✔ Karacena API started`);
      console.log(`✔ Port: ${PORT}`);
      console.log(
        `✔ Environment: ${process.env.NODE_ENV || 'development'}`,
      );
      console.log(`✔ Health: http://127.0.0.1:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('✖ Startup failed:', error);
    process.exit(1);
  }
}

startServer();