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
    
    // 查看表结构
    console.log('\n=== 用户表结构 ===');
    const [tableStructure] = await connection.execute('DESCRIBE users');
    console.table(tableStructure);
    
    // 查看所有用户
    console.log('\n=== 所有用户数据 ===');
    const [users] = await connection.execute('SELECT id, username, name, email, role, status FROM users');
    console.table(users);
    
    // 查找admin用户
    console.log('\n=== admin用户详情 ===');
    const [adminUsers] = await connection.execute('SELECT * FROM users WHERE username = ?', ['admin']);
    if (adminUsers.length > 0) {
      console.log('找到admin用户:');
      console.log(adminUsers[0]);
    } else {
      console.log('未找到admin用户');
    }
    
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n数据库连接已关闭');
    }
  }
}

checkUsers();