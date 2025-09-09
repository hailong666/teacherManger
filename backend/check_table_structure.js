const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkTableStructure() {
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
    
    // 查看users表的创建语句
    console.log('\n=== users表创建语句 ===');
    const [createTable] = await connection.execute('SHOW CREATE TABLE users');
    console.log(createTable[0]['Create Table']);
    
    // 查看role字段的详细信息
    console.log('\n=== users表结构详情 ===');
    const [columns] = await connection.execute('DESCRIBE users');
    console.table(columns);
    
    // 查看role字段的具体定义
    console.log('\n=== role字段详情 ===');
    const roleColumn = columns.find(col => col.Field === 'role');
    if (roleColumn) {
      console.log('Role字段类型:', roleColumn.Type);
      console.log('Role字段默认值:', roleColumn.Default);
      console.log('Role字段是否可空:', roleColumn.Null);
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

checkTableStructure();