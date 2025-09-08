const mysql = require('mysql2/promise');

async function createDatabase() {
  try {
    // 连接到MySQL服务器（不指定数据库）
    const connection = await mysql.createConnection({
      host: '123.249.87.129',
      user: 'root',
      password: 'jxj13140123'
    });

    console.log('连接到MySQL服务器成功');

    // 创建数据库
    await connection.execute('CREATE DATABASE IF NOT EXISTS teacher_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    console.log('数据库 teacher_manager 创建成功');

    // 关闭连接
    await connection.end();
    console.log('数据库连接已关闭');
  } catch (error) {
    console.error('创建数据库失败:', error);
    process.exit(1);
  }
}

createDatabase();