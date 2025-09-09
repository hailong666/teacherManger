const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkUsers() {
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
    
    // 检查用户表
    const [users] = await connection.execute(
      'SELECT u.id, u.username, u.name, u.password, u.role_id, r.name as role_name FROM users u LEFT JOIN roles r ON u.role_id = r.id'
    );
    
    console.log('\n用户列表:');
    console.table(users);
    
    // 检查角色表
    const [roles] = await connection.execute('SELECT * FROM roles LIMIT 10');
    
    console.log('\n角色列表:');
    console.table(roles);
    
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkUsers();