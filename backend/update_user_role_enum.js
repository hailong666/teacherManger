const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateUserRoleEnum() {
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
    
    // 更新role枚举，添加admin角色
    console.log('正在更新users表的role枚举...');
    await connection.execute(`
      ALTER TABLE users 
      MODIFY COLUMN role ENUM('admin', 'teacher', 'class_leader', 'student') 
      NOT NULL DEFAULT 'student'
    `);
    
    console.log('✅ users表的role枚举已更新，添加了admin角色');
    
    // 验证更新结果
    const [columns] = await connection.execute(`
      SHOW COLUMNS FROM users WHERE Field = 'role'
    `);
    
    console.log('\n当前role字段定义:');
    console.log(columns[0]);
    
  } catch (error) {
    console.error('更新失败:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n数据库连接已关闭');
    }
  }
}

updateUserRoleEnum();