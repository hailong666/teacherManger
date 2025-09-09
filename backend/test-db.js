const mysql = require('mysql2/promise');
require('dotenv').config();

async function testDatabase() {
  try {
    // 创建数据库连接
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE
    });

    console.log('数据库连接成功');

    // 检查表是否存在
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'random_calls'"
    );
    
    if (tables.length === 0) {
      console.log('random_calls表不存在');
    } else {
      console.log('random_calls表存在');
      
      // 查看表结构
      const [columns] = await connection.execute(
        "DESCRIBE random_calls"
      );
      console.log('表结构:', columns);
      
      // 查看表中的数据数量
      const [count] = await connection.execute(
        "SELECT COUNT(*) as count FROM random_calls"
      );
      console.log('表中记录数:', count[0].count);
    }

    // 检查其他相关表
    const [userTables] = await connection.execute(
      "SHOW TABLES LIKE 'users'"
    );
    console.log('users表存在:', userTables.length > 0);
    
    const [classTables] = await connection.execute(
      "SHOW TABLES LIKE 'classes'"
    );
    console.log('classes表存在:', classTables.length > 0);

    await connection.end();
  } catch (error) {
    console.error('数据库连接失败:', error.message);
  }
}

testDatabase();