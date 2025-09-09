const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function setAdminPassword() {
  try {
    const connection = await mysql.createConnection({
      host: '123.249.87.129',
      user: 'root',
      password: 'jxj13140123',
      database: 'teacher_manager'
    });

    console.log('数据库连接成功');

    // 为admin用户设置密码
    const password = '123456';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    await connection.execute(
      'UPDATE users SET password = ? WHERE username = "admin"',
      [hashedPassword]
    );

    console.log('admin用户密码已设置为: 123456');
    
    // 验证更新
    const [users] = await connection.execute(
      'SELECT username, password FROM users WHERE username = "admin"'
    );
    
    console.log('更新后的admin用户信息:', users[0]);

    await connection.end();
  } catch (error) {
    console.error('错误:', error.message);
  }
}

setAdminPassword();