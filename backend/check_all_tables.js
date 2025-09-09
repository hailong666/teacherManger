const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkAllTables() {
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
    
    // 查看所有表
    console.log('\n=== 数据库中的所有表 ===');
    const [tables] = await connection.execute('SHOW TABLES');
    console.table(tables);
    
    // 查看users表结构（看看学生表结构）
    console.log('\n=== users表结构 ===');
    const [userColumns] = await connection.execute('DESCRIBE users');
    console.table(userColumns);
    
    // 查看是否有学生数据
    console.log('\n=== 学生用户数据 ===');
    const [students] = await connection.execute("SELECT id, name, role FROM users WHERE role = 'student'");
    console.table(students);
    
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n数据库连接已关闭');
    }
  }
}

checkAllTables();