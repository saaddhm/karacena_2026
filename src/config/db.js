import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// --- HACK RADICAL POUR NODE v24 + SEQUELIZE v6 ---
// On intercepte et on simule la présence du paquet sur l'objet global de Node
import mysql2 from 'mysql2';
global.require = require; 

// On surcharge le cache des modules pour que require('mysql2') et require('mysql') renvoient directement le driver
try {
  const module = require('module');
  const originalLoad = module._load;
  module._load = function (request, parent, isMain) {
    if (request === 'mysql2' || request === 'mysql') {
      return mysql2;
    }
    return originalLoad.apply(this, arguments);
  };
} catch (e) {
  // En cas d'erreur de surcharge, on laisse filer
}
// -------------------------------------------------

import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
dotenv.config();

export const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    dialect: 'mysql',
    dialectModule: mysql2, // Conservé par sécurité
    logging: false,
    define: { underscored: true },
    pool: { max: 10, min: 0, acquire: 30000, idle: 10000 }
  }
);

export async function connectDB() {
  await sequelize.authenticate();
  console.log('✔ MySQL connected');
}