const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkRolesAndUsers() {
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
    
    // 查看roles表数据
    console.log('\n=== roles表数据 ===');
    const [roles] = await connection.execute('SELECT * FROM roles');
    console.table(roles);
    
    // 查看users表数据
    console.log('\n=== users表数据 ===');
    const [users] = await connection.execute('SELECT id, username, name, email, role_id, status FROM users');
    console.table(users);
    
    // 查看用户和角色的关联
    console.log('\n=== 用户角色关联 ===');
    const [userRoles] = await connection.execute(`
      SELECT u.id, u.username, u.name, r.name as role_name, r.display_name
      FROM users u 
      LEFT JOIN roles r ON u.role_id = r.id
    `);
    console.table(userRoles);
    
    // 查看教师用户
    console.log('\n=== 教师用户 ===');
    const [teachers] = await connection.execute(`
      SELECT u.id, u.username, u.name, u.email
      FROM users u 
      JOIN roles r ON u.role_id = r.id
      WHERE r.name = 'teacher'
    `);
    console.table(teachers);
    
    // 查看班级和教师关联
    console.log('\n=== 班级教师关联 ===');
    const [classTeachers] = await connection.execute(`
      SELECT c.id, c.name as class_name, c.teacher_id, u.username, u.name as teacher_name
      FROM classes c
      LEFT JOIN users u ON c.teacher_id = u.id
    `);
    console.table(classTeachers);
    
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n数据库连接已关闭');
    }
  }
}

checkRolesAndUsers();