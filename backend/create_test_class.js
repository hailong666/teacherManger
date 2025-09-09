const mysql = require('mysql2/promise');
require('dotenv').config();

async function createTestClass() {
  let connection;
  
  try {
    // 创建数据库连接
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'teacher_manager'
    });
    
    console.log('数据库连接成功');
    
    // 查找teacher1的用户ID
    const [teacherRows] = await connection.execute(
      'SELECT id, name FROM users WHERE username = ? AND role = ?',
      ['teacher1', 'teacher']
    );
    
    if (teacherRows.length === 0) {
      console.log('未找到teacher1用户');
      return;
    }
    
    const teacher = teacherRows[0];
    console.log('找到教师:', teacher);
    
    // 检查是否已存在测试班级
    const [existingClass] = await connection.execute(
      'SELECT id, name FROM classes WHERE name = ?',
      ['测试班级']
    );
    
    if (existingClass.length > 0) {
      console.log('测试班级已存在:', existingClass[0]);
      
      // 更新班级的班主任为teacher1
      await connection.execute(
        'UPDATE classes SET teacher_id = ? WHERE id = ?',
        [teacher.id, existingClass[0].id]
      );
      
      console.log('已更新测试班级的班主任为teacher1');
    } else {
      // 创建新的测试班级
      const [result] = await connection.execute(
        'INSERT INTO classes (name, description, teacher_id, create_time, update_time) VALUES (?, ?, ?, NOW(), NOW())',
        ['测试班级', '这是一个测试班级，用于验证teacher1的班级管理功能', teacher.id]
      );
      
      console.log('成功创建测试班级，ID:', result.insertId);
    }
    
    // 查询teacher1负责的所有班级
    const [classes] = await connection.execute(
      'SELECT c.id, c.name, c.description, u.name as teacher_name FROM classes c JOIN users u ON c.teacher_id = u.id WHERE c.teacher_id = ?',
      [teacher.id]
    );
    
    console.log('teacher1负责的班级:');
    classes.forEach(cls => {
      console.log(`- 班级ID: ${cls.id}, 班级名称: ${cls.name}, 班主任: ${cls.teacher_name}`);
    });
    
    // 添加一些测试学生到班级（如果存在学生用户）
    const [students] = await connection.execute(
      'SELECT id, name, username FROM users WHERE role = ? LIMIT 3',
      ['student']
    );
    
    if (students.length > 0 && classes.length > 0) {
      const classId = classes[0].id;
      
      for (const student of students) {
        // 检查学生是否已在班级中
        const [existing] = await connection.execute(
          'SELECT id FROM class_students WHERE class_id = ? AND student_id = ?',
          [classId, student.id]
        );
        
        if (existing.length === 0) {
          await connection.execute(
            'INSERT INTO class_students (class_id, student_id, created_at) VALUES (?, ?, NOW())',
            [classId, student.id]
          );
          console.log(`已添加学生 ${student.name} (${student.username}) 到班级`);
        } else {
          console.log(`学生 ${student.name} (${student.username}) 已在班级中`);
        }
      }
    }
    
    console.log('\n测试班级创建完成！');
    console.log('现在teacher1应该能够在教室签到页面看到学生名单了。');
    
  } catch (error) {
    console.error('创建测试班级时出错:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('数据库连接已关闭');
    }
  }
}

// 运行脚本
createTestClass();