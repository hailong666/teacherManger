const mysql = require('mysql2/promise');

async function checkPasswords() {
  try {
    const connection = await mysql.createConnection({
      host: '123.249.87.129',
      user: 'root',
      password: 'jxj13140123',
      database: 'teacher_manager'
    });

    console.log('数据库连接成功');

    // 查看用户密码
    const [users] = await connection.execute(
      'SELECT id, username, password FROM users WHERE username IN ("admin", "teacher", "student")'
    );

    console.log('\n用户密码信息:');
    users.forEach(user => {
      console.log(`用户: ${user.username}, 密码: ${user.password}`);
    });

    await connection.end();
  } catch (error) {
    console.error('错误:', error.message);
  }
}

checkPasswords();