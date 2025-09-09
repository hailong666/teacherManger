const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkClassesFields() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'teacher_manager'
    });
    
    console.log('数据库连接成功');
    
    // 查看classes表字段
    const [fields] = await connection.execute('DESCRIBE classes');
    console.log('\n=== classes表字段结构 ===');
    console.table(fields);
    
    // 查看现有数据
    const [data] = await connection.execute('SELECT * FROM classes LIMIT 3');
    console.log('\n=== classes表现有数据 ===');
    console.table(data);
    
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n数据库连接已关闭');
    }
  }
}

checkClassesFields();