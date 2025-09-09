const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkDatabaseStructure() {
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
    
    // 查看users表结构
    console.log('\n=== users表结构 ===');
    const [userStructure] = await connection.execute('DESCRIBE users');
    console.table(userStructure);
    
    // 检查是否有roles表
    const tableNames = tables.map(table => Object.values(table)[0]);
    if (tableNames.includes('roles')) {
      console.log('\n=== roles表结构 ===');
      const [roleStructure] = await connection.execute('DESCRIBE roles');
      console.table(roleStructure);
      
      console.log('\n=== roles表数据 ===');
      const [roles] = await connection.execute('SELECT * FROM roles');
      console.table(roles);
    } else {
      console.log('\n❌ 未找到roles表');
    }
    
    // 查看users表数据（不包含role字段）
    console.log('\n=== users表数据 ===');
    const [users] = await connection.execute('SELECT id, username, name, email, role_id, status FROM users');
    console.table(users);
    
    // 检查是否有classes表
    if (tableNames.includes('classes')) {
      console.log('\n=== classes表结构 ===');
      const [classStructure] = await connection.execute('DESCRIBE classes');
      console.table(classStructure);
      
      console.log('\n=== classes表数据 ===');
      const [classes] = await connection.execute('SELECT * FROM classes');
      console.table(classes);
    } else {
      console.log('\n❌ 未找到classes表');
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

checkDatabaseStructure();