const { createConnection } = require('typeorm');
const path = require('path');
require('dotenv').config();

module.exports = {
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'teacher_manager',
  entities: [path.join(__dirname, '../models/*.js')],
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV === 'development',
  charset: 'utf8mb4',
  timezone: '+08:00',
  extra: {
    connectionLimit: 10
  }
};