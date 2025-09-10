const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkCurrentDatabase() {
  let connection;
  
  try {
    // 使用正确的数据库配置
    connection = await mysql.createConnection({
      host: '123.249.87.129',
      port: 3306,
      user: 'teacher_admin',
      password: 'jxj13140123',
      database: 'teacher_manager'
    });
    
    console.log('数据库连接成功');
    
    // 1. 查看所有表
    console.log('\n=== 数据库中的所有表 ===');
    const [tables] = await connection.execute('SHOW TABLES');
    console.table(tables);
    
    // 2. 查看users表结构
    console.log('\n=== users表结构 ===');
    const [usersStructure] = await connection.execute('DESCRIBE users');
    console.table(usersStructure);
    
    // 3. 查看classes表结构
    console.log('\n=== classes表结构 ===');
    const [classesStructure] = await connection.execute('DESCRIBE classes');
    console.table(classesStructure);
    
    // 4. 查看articles表结构（如果存在）
    try {
      console.log('\n=== articles表结构 ===');
      const [articlesStructure] = await connection.execute('DESCRIBE articles');
      console.table(articlesStructure);
    } catch (error) {
      console.log('articles表不存在');
    }
    
    // 5. 查看当前用户数据
    console.log('\n=== 当前用户数据 ===');
    const [users] = await connection.execute('SELECT * FROM users ORDER BY id LIMIT 10');
    console.table(users);
    
    // 6. 查看当前班级数据
    console.log('\n=== 当前班级数据 ===');
    const [classes] = await connection.execute('SELECT * FROM classes ORDER BY id');
    console.table(classes);
    
  } catch (error) {
    console.error('检查失败:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n数据库连接已关闭');
    }
  }
}

checkCurrentDatabase();