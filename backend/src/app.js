const express = require('express');
const cors = require('cors');
const { createConnection } = require('typeorm');
const dbConfig = require('./config/database');
const path = require('path');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

// 创建Express应用
const app = express();

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 路由
const userRoutes = require('./routes/user.routes');
const roleRoutes = require('./routes/role.routes');
const permissionRoutes = require('./routes/permission.routes');
const classRoutes = require('./routes/class.routes');

const recitationRoutes = require('./routes/recitation.routes');
const articleRoutes = require('./routes/article.routes');
const randomRoutes = require('./routes/random.routes');
const pointsRoutes = require('./routes/points.routes');
const homeworkRoutes = require('./routes/homework.routes');
const attendanceRoutes = require('./routes/attendance.routes');

app.use('/api/auth', userRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/classes', classRoutes);

app.use('/api/recitation', recitationRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/random', randomRoutes);
app.use('/api/points', pointsRoutes);
app.use('/api/homework', homeworkRoutes);
app.use('/api/attendance', attendanceRoutes);

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    code: 500,
    message: '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 数据库连接状态
let databaseInitialized = false;

// 数据库连接验证
const validateDatabaseConnection = async () => {
  try {
    const mysql = require('mysql2/promise');
    const testConnection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.username,
      password: dbConfig.password,
      connectTimeout: 10000
    });
    
    await testConnection.ping();
    await testConnection.end();
    console.log('数据库连接验证成功');
    return true;
  } catch (error) {
    console.error('数据库连接验证失败:', error.message);
    return false;
  }
};

// 数据库连接
const initDatabase = async () => {
  if (databaseInitialized) {
    return;
  }
  
  console.log('正在连接到远程数据库...');
  
  // 首先验证数据库连接
  const isConnectionValid = await validateDatabaseConnection();
  if (!isConnectionValid) {
    console.error('无法连接到数据库服务器，应用程序将退出');
    process.exit(1);
  }
  
  try {
    // 首先尝试创建数据库
    const mysql = require('mysql2/promise');
    const connection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.username,
      password: dbConfig.password,
      connectTimeout: 30000
    });
    
    await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`数据库 ${dbConfig.database} 创建成功或已存在`);
    await connection.end();
    
    // 然后连接到具体数据库
    await createConnection(dbConfig);
    console.log('数据库连接成功，应用程序已准备就绪');
    databaseInitialized = true;
  } catch (error) {
    console.error('数据库连接失败:', error.message);
    console.error('应用程序无法在没有数据库的情况下运行，正在退出...');
    process.exit(1);
  }
};

// 启动服务器
const PORT = process.env.PORT || 3002;
app.listen(PORT, async () => {
  console.log(`服务器运行在端口 ${PORT}`);
  await initDatabase();
});

module.exports = app; // 导出供测试使用