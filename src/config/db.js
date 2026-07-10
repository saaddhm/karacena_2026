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
    logging: false,
    define: { underscored: true },
    pool: { max: 10, min: 0, acquire: 30000, idle: 10000 }
  }
);

export async function connectDB() {
  await sequelize.authenticate();
  console.log('✔ MySQL connected');
}
