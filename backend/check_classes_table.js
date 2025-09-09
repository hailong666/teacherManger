const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkClassesTable() {
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
    
    // 查看classes表结构
    console.log('\n=== classes表结构 ===');
    const [columns] = await connection.execute('DESCRIBE classes');
    console.table(columns);
    
    // 查看classes表的创建语句
    console.log('\n=== classes表创建语句 ===');
    const [createTable] = await connection.execute('SHOW CREATE TABLE classes');
    console.log(createTable[0]['Create Table']);
    
    // 查看现有的班级数据
    console.log('\n=== 现有班级数据 ===');
    const [classes] = await connection.execute('SELECT * FROM classes');
    console.table(classes);
    
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n数据库连接已关闭');
    }
  }
}

checkClassesTable();