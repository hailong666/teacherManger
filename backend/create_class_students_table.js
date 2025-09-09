const mysql = require('mysql2/promise');
require('dotenv').config();

async function createClassStudentsTable() {
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
    
    // 检查class_students表是否存在
    const [tables] = await connection.execute(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'class_students'",
      [process.env.DB_DATABASE || 'teacher_manager']
    );
    
    if (tables.length > 0) {
      console.log('class_students表已存在');
      return;
    }
    
    // 创建class_students表
    const createTableSQL = `
      CREATE TABLE class_students (
        id INT AUTO_INCREMENT PRIMARY KEY,
        class_id INT NOT NULL,
        student_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_class_student (class_id, student_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    
    await connection.execute(createTableSQL);
    console.log('成功创建class_students表');
    
    // 查看表结构
    console.log('\n=== class_students表结构 ===');
    const [columns] = await connection.execute('DESCRIBE class_students');
    console.table(columns);
    
    // 从现有的TypeORM关系中迁移数据（如果有的话）
    console.log('\n正在检查是否需要迁移现有数据...');
    
    // 查看是否有TypeORM的关联表
    const [ormTables] = await connection.execute(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME LIKE '%class%student%'",
      [process.env.DB_DATABASE || 'teacher_manager']
    );
    
    console.log('找到的相关表:', ormTables);
    
    console.log('\nclass_students表创建完成！');
    
  } catch (error) {
    console.error('创建表失败:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('数据库连接已关闭');
    }
  }
}

createClassStudentsTable();