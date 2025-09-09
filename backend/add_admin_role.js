const mysql = require('mysql2/promise');
require('dotenv').config();

async function addAdminRole() {
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
    
    // 修改role字段的枚举值，添加admin
    console.log('正在修改role字段，添加admin角色...');
    await connection.execute(
      "ALTER TABLE users MODIFY COLUMN role ENUM('teacher','class_leader','student','admin') NOT NULL DEFAULT 'student'"
    );
    
    console.log('role字段修改成功，已添加admin角色');
    
    // 更新admin用户的角色
    console.log('正在更新admin用户角色...');
    const [result] = await connection.execute(
      'UPDATE users SET role = ? WHERE username = ?',
      ['admin', 'admin']
    );
    
    console.log('admin用户角色更新成功:', result.affectedRows, '行受影响');
    
    // 验证更新结果
    const [adminUser] = await connection.execute(
      'SELECT id, username, name, role FROM users WHERE username = ?',
      ['admin']
    );
    
    if (adminUser.length > 0) {
      console.log('更新后的admin用户信息:');
      console.log(adminUser[0]);
    }
    
    // 验证表结构
    console.log('\n验证修改后的表结构:');
    const [columns] = await connection.execute('DESCRIBE users');
    const roleColumn = columns.find(col => col.Field === 'role');
    if (roleColumn) {
      console.log('Role字段类型:', roleColumn.Type);
    }
    
  } catch (error) {
    console.error('操作失败:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n数据库连接已关闭');
    }
  }
}

addAdminRole();