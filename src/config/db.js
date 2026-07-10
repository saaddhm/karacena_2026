// import { Sequelize } from 'sequelize';
// import mysql2 from 'mysql2'; // <-- 1. On importe le driver directement
// import dotenv from 'dotenv';
// dotenv.config();

// export const sequelize = new Sequelize(
//   process.env.DB_NAME,
//   process.env.DB_USER,
//   process.env.DB_PASSWORD,
//   {
//     host: process.env.DB_HOST || 'localhost',
//     port: Number(process.env.DB_PORT) || 3306,
//     dialect: 'mysql',
//     dialectModule: mysql2, // <-- 2. On force Sequelize à utiliser l'instance importée
//     logging: false,
//     define: { underscored: true },
//     pool: { max: 10, min: 0, acquire: 30000, idle: 10000 }
//   }
// );

// export async function connectDB() {
//   await sequelize.authenticate();
//   console.log('✔ MySQL connected');
// }


import { Sequelize } from 'sequelize';
import mysql2 from 'mysql2';
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
    // C'est cette ligne qui force Node v24 à utiliser le package importé au lieu de le chercher dynamiquement
    dialectModule: mysql2, 
    logging: false,
    define: { underscored: true },
    pool: { max: 10, min: 0, acquire: 30000, idle: 10000 }
  }
);

export async function connectDB() {
  await sequelize.authenticate();
  console.log('✔ MySQL connected');
}