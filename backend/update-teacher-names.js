const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateTeacherNames() {
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
    
    // 更新教师姓名
    const teacherUpdates = [
      { username: 'teacher1', name: '张老师' },
      { username: 'teacher2', name: '李老师' }
    ];
    
    for (const teacher of teacherUpdates) {
      const result = await connection.execute(
        'UPDATE users SET name = ? WHERE username = ?',
        [teacher.name, teacher.username]
      );
      
      if (result[0].affectedRows > 0) {
        console.log(`✅ ${teacher.username}的姓名已更新为: ${teacher.name}`);
      } else {
        console.log(`⚠️  未找到用户: ${teacher.username}`);
      }
    }
    
    // 验证更新结果
    console.log('\n=== 更新后的教师信息 ===');
    const [teachers] = await connection.execute(`
      SELECT u.id, u.username, u.name, u.email
      FROM users u 
      JOIN roles r ON u.role_id = r.id
      WHERE r.name = 'teacher'
    `);
    console.table(teachers);
    
    // 检查班级教师关联
    console.log('\n=== 班级教师关联（更新后）===');
    const [classTeachers] = await connection.execute(`
      SELECT c.id, c.name as class_name, c.teacher_id, u.username, u.name as teacher_name
      FROM classes c
      LEFT JOIN users u ON c.teacher_id = u.id
    `);
    console.table(classTeachers);
    
  } catch (error) {
    console.error('更新失败:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n数据库连接已关闭');
    }
  }
}

updateTeacherNames();