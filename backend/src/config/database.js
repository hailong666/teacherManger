const { createConnection } = require('typeorm');
const path = require('path');
require('dotenv').config();

module.exports = {
  type: 'mysql',
  host: '123.249.87.129',
  port: 3306,
  username: 'root',
  password: 'jxj13140123',
  database: 'teacher_manager',
  entities: [path.join(__dirname, '../models/*.js')],
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV === 'development',
  charset: 'utf8mb4',
  timezone: '+08:00',
  connectTimeout: 30000,
  acquireTimeout: 30000,
  timeout: 30000,
  extra: {
    connectionLimit: 10,
    acquireTimeout: 30000,
    timeout: 30000,
    reconnect: true,
    idleTimeout: 300000
  }
};