const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function verifyAdminPassword() {
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
    
    // 查找admin用户
    const [adminUsers] = await connection.execute(
      'SELECT username, password FROM users WHERE username = ?',
      ['admin']
    );
    
    if (adminUsers.length === 0) {
      console.log('未找到admin用户');
      return;
    }
    
    const admin = adminUsers[0];
    console.log('找到admin用户:', admin.username);
    
    // 验证密码
    const testPasswords = ['123456', 'admin', 'password', '123123'];
    
    for (const testPassword of testPasswords) {
      const isValid = await bcrypt.compare(testPassword, admin.password);
      console.log(`密码 '${testPassword}' 验证结果:`, isValid ? '✓ 正确' : '✗ 错误');
      
      if (isValid) {
        console.log(`\n✅ admin用户的正确密码是: ${testPassword}`);
        break;
      }
    }
    
  } catch (error) {
    console.error('验证失败:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n数据库连接已关闭');
    }
  }
}

verifyAdminPassword();