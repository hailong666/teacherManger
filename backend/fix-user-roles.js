const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixUserRoles() {
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
    
    // 获取角色ID
    const [roles] = await connection.execute('SELECT * FROM roles');
    const adminRole = roles.find(r => r.name === 'admin');
    const teacherRole = roles.find(r => r.name === 'teacher');
    const studentRole = roles.find(r => r.name === 'student');
    
    console.log('角色信息:');
    console.log('Admin角色ID:', adminRole?.id);
    console.log('Teacher角色ID:', teacherRole?.id);
    console.log('Student角色ID:', studentRole?.id);
    
    // 修复admin用户角色
    if (adminRole) {
      await connection.execute(
        'UPDATE users SET role_id = ? WHERE username = ?',
        [adminRole.id, 'admin']
      );
      console.log('✅ admin用户角色已修复');
    }
    
    // 修复教师用户角色
    if (teacherRole) {
      const teacherUsernames = ['teacher1', 'teacher2'];
      for (const username of teacherUsernames) {
        const result = await connection.execute(
          'UPDATE users SET role_id = ? WHERE username = ?',
          [teacherRole.id, username]
        );
        if (result[0].affectedRows > 0) {
          console.log(`✅ ${username}用户角色已修复为教师`);
        } else {
          console.log(`⚠️  未找到用户: ${username}`);
        }
      }
    }
    
    // 修复学生用户角色（确保student开头的用户是学生角色）
    if (studentRole) {
      const result = await connection.execute(
        'UPDATE users SET role_id = ? WHERE username LIKE ? AND role_id != ?',
        [studentRole.id, 'student%', studentRole.id]
      );
      console.log(`✅ ${result[0].affectedRows}个学生用户角色已修复`);
    }
    
    // 验证修复结果
    console.log('\n=== 修复后的用户角色分配 ===');
    const [userRoles] = await connection.execute(`
      SELECT u.id, u.username, u.name, r.name as role_name, r.display_name
      FROM users u 
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.username IN ('admin', 'teacher1', 'teacher2') OR u.username LIKE 'student%'
      ORDER BY u.id
    `);
    console.table(userRoles);
    
    // 检查教师用户
    console.log('\n=== 教师用户列表 ===');
    const [teachers] = await connection.execute(`
      SELECT u.id, u.username, u.name, u.email
      FROM users u 
      JOIN roles r ON u.role_id = r.id
      WHERE r.name = 'teacher'
    `);
    console.table(teachers);
    
  } catch (error) {
    console.error('修复失败:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n数据库连接已关闭');
    }
  }
}

fixUserRoles();