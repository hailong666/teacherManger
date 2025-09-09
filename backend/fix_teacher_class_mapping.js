const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixTeacherClassMapping() {
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
    
    // 查找teacher1和teacher2的用户ID
    const [teachers] = await connection.execute(
      'SELECT u.id, u.username, u.name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.username IN (?, ?) AND r.name = ?',
      ['teacher1', 'teacher2', 'teacher']
    );
    
    if (teachers.length !== 2) {
      console.log('未找到teacher1和teacher2用户');
      return;
    }
    
    const teacher1 = teachers.find(t => t.username === 'teacher1');
    const teacher2 = teachers.find(t => t.username === 'teacher2');
    
    console.log('找到教师:', teachers);
    
    // 检查是否已存在高一(2)班
    const [existingClass2] = await connection.execute(
      'SELECT id, name FROM classes WHERE name = ?',
      ['高一(2)班']
    );
    
    let class2Id;
    if (existingClass2.length > 0) {
      console.log('高一(2)班已存在:', existingClass2[0]);
      class2Id = existingClass2[0].id;
      
      // 更新班级的班主任为teacher2
      await connection.execute(
        'UPDATE classes SET teacher_id = ? WHERE id = ?',
        [teacher2.id, class2Id]
      );
      
      console.log('已更新高一(2)班的班主任为teacher2');
    } else {
      // 创建新的高一(2)班
      const [result] = await connection.execute(
        'INSERT INTO classes (name, description, teacher_id, grade, semester, max_students, current_students, status, academic_year) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        ['高一(2)班', '高一年级2班，由teacher2负责管理', teacher2.id, '高一', 'spring', 50, 0, 'active', '2024-2025']
      );
      
      class2Id = result.insertId;
      console.log('成功创建高一(2)班，ID:', class2Id);
    }
    
    // 确保teacher1只关联高一(1)班
    await connection.execute(
      'UPDATE classes SET teacher_id = ? WHERE name = ?',
      [teacher1.id, '高一(1)班']
    );
    
    // 删除测试班级（如果存在）
    await connection.execute(
      'DELETE FROM classes WHERE name = ?',
      ['测试班级']
    );
    
    console.log('已删除测试班级');
    
    // 查询最终的班级教师关联
    const [finalClasses] = await connection.execute(`
      SELECT c.id, c.name as class_name, c.teacher_id, u.username, u.name as teacher_name
      FROM classes c
      LEFT JOIN users u ON c.teacher_id = u.id
      ORDER BY c.id
    `);
    
    console.log('\n=== 最终班级教师关联 ===');
    console.table(finalClasses);
    
    // 为每个班级添加学生（如果还没有的话）
    await addStudentsToClasses(connection, teacher1.id, teacher2.id);
    
    console.log('\n班级和教师关联修复完成！');
    console.log('- teacher1 (张老师) 负责高一(1)班');
    console.log('- teacher2 (李老师) 负责高一(2)班');
    
  } catch (error) {
    console.error('修复班级教师关联时出错:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('数据库连接已关闭');
    }
  }
}

async function addStudentsToClasses(connection, teacher1Id, teacher2Id) {
  try {
    // 查找所有学生
    const [students] = await connection.execute(
      'SELECT u.id, u.username, u.name FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = ? ORDER BY u.username',
      ['student']
    );
    
    if (students.length === 0) {
      console.log('未找到学生用户');
      return;
    }
    
    console.log(`\n找到 ${students.length} 名学生`);
    
    // 获取班级信息
    const [classes] = await connection.execute(
      'SELECT id, name, teacher_id FROM classes WHERE teacher_id IN (?, ?)',
      [teacher1Id, teacher2Id]
    );
    
    const class1 = classes.find(c => c.teacher_id === teacher1Id);
    const class2 = classes.find(c => c.teacher_id === teacher2Id);
    
    if (!class1 || !class2) {
      console.log('班级信息不完整');
      return;
    }
    
    // 清空现有的班级学生关联
    await connection.execute(
      'DELETE FROM class_students WHERE class_id IN (?, ?)',
      [class1.id, class2.id]
    );
    
    // 将学生平均分配到两个班级
    const midPoint = Math.ceil(students.length / 2);
    const class1Students = students.slice(0, midPoint);
    const class2Students = students.slice(midPoint);
    
    // 添加学生到高一(1)班
    for (const student of class1Students) {
        await connection.execute(
          'INSERT INTO class_students (class_id, student_id, join_date, created_at) VALUES (?, ?, NOW(), NOW())',
          [class1.id, student.id]
        );
    }
    
    // 添加学生到高一(2)班
    for (const student of class2Students) {
      await connection.execute(
          'INSERT INTO class_students (class_id, student_id, join_date, created_at) VALUES (?, ?, NOW(), NOW())',
          [class2.id, student.id]
        );
    }
    
    console.log(`已将 ${class1Students.length} 名学生添加到 ${class1.name}`);
    console.log(`已将 ${class2Students.length} 名学生添加到 ${class2.name}`);
    
    // 显示最终的班级学生分配
    const [class1StudentsResult] = await connection.execute(`
      SELECT u.username, u.name
      FROM class_students cs
      JOIN users u ON cs.student_id = u.id
      WHERE cs.class_id = ?
      ORDER BY u.username
    `, [class1.id]);
    
    const [class2StudentsResult] = await connection.execute(`
      SELECT u.username, u.name
      FROM class_students cs
      JOIN users u ON cs.student_id = u.id
      WHERE cs.class_id = ?
      ORDER BY u.username
    `, [class2.id]);
    
    console.log(`\n=== ${class1.name} 学生名单 ===`);
    console.table(class1StudentsResult);
    
    console.log(`\n=== ${class2.name} 学生名单 ===`);
    console.table(class2StudentsResult);
    
  } catch (error) {
    console.error('添加学生到班级时出错:', error);
  }
}

// 运行脚本
fixTeacherClassMapping();