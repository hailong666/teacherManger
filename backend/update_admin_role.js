const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateAdminRole() {
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
    
    // 更新admin用户的角色
    const [result] = await connection.execute(
      'UPDATE users SET role = ? WHERE username = ?',
      ['admin', 'admin']
    );
    
    console.log('admin用户角色更新成功:', result.affectedRows, '行受影响');
    
    // 验证更新结果
    const [adminUser] = await connection.execute(
      'SELECT id, username, name, role FROM users WHERE username = ?',
      ['admin']
    );
    
    if (adminUser.length > 0) {
      console.log('更新后的admin用户信息:');
      console.log(adminUser[0]);
    }
    
  } catch (error) {
    console.error('更新admin角色失败:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('数据库连接已关闭');
    }
  }
}

updateAdminRole();