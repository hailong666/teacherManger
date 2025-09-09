const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config();

/**
 * 初始化默认管理员账号
 */
async function initAdminUser() {
  let connection;
  
  try {
    // 连接数据库
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'teacher_manager'
    });
    
    console.log('数据库连接成功');
    
    // 检查是否已存在管理员账号
    const [existingUsers] = await connection.execute(
      'SELECT id FROM users WHERE username = ?',
      ['admin']
    );
    
    if (existingUsers.length > 0) {
      console.log('管理员账号已存在，跳过初始化');
      return;
    }
    
    // 加密密码
    const hashedPassword = await bcrypt.hash('123456', 10);
    
    // 创建默认管理员账号
    await connection.execute(
      `INSERT INTO users (username, password, name, email, role, status, create_time, update_time) 
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      ['admin', hashedPassword, '系统管理员', 'admin@example.com', 'admin', 1]
    );
    
    console.log('默认管理员账号创建成功:');
    console.log('用户名: admin');
    console.log('密码: 123456');
    console.log('角色: teacher');
    
  } catch (error) {
    console.error('初始化管理员账号失败:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('数据库连接已关闭');
    }
  }
}

// 如果直接运行此文件，则执行初始化
if (require.main === module) {
  initAdminUser().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('执行失败:', error);
    process.exit(1);
  });
}

module.exports = { initAdminUser };