const mysql = require('mysql2/promise');
require('dotenv').config();

async function initRoles() {
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
    
    // 创建基础角色
    const roles = [
      { name: 'admin', display_name: '管理员', description: '系统管理员，拥有所有权限' },
      { name: 'teacher', display_name: '教师', description: '教师角色，可以管理班级和学生' },
      { name: 'student', display_name: '学生', description: '学生角色，可以查看自己的信息' }
    ];
    
    for (const role of roles) {
      // 检查角色是否已存在
      const [existing] = await connection.execute(
        'SELECT id FROM roles WHERE name = ?',
        [role.name]
      );
      
      if (existing.length === 0) {
        await connection.execute(
          'INSERT INTO roles (name, display_name, description, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
          [role.name, role.display_name, role.description]
        );
        console.log(`创建角色: ${role.name}`);
      } else {
        console.log(`角色已存在: ${role.name}`);
      }
    }
    
    // 获取角色ID
    const [adminRole] = await connection.execute('SELECT id FROM roles WHERE name = "admin"');
    const [teacherRole] = await connection.execute('SELECT id FROM roles WHERE name = "teacher"');
    const [studentRole] = await connection.execute('SELECT id FROM roles WHERE name = "student"');
    
    // 更新admin用户为管理员角色
    if (adminRole.length > 0) {
      await connection.execute(
        'UPDATE users SET role_id = ? WHERE username = "admin"',
        [adminRole[0].id]
      );
      console.log('更新admin用户角色为管理员');
    }
    
    // 更新其他用户为学生角色
    if (studentRole.length > 0) {
      await connection.execute(
        'UPDATE users SET role_id = ? WHERE username != "admin" AND role_id = 0',
        [studentRole[0].id]
      );
      console.log('更新其他用户角色为学生');
    }
    
    console.log('\n角色初始化完成！');
    
  } catch (error) {
    console.error('初始化失败:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

initRoles();