const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkClassStudentsTable() {
  let connection;
  
  try {
    // 创建数据库连接
    connection = await mysql.createConnection({
      host: '123.249.87.129',
      port: 3306,
      user: 'root',
      password: 'jxj13140123',
      database: 'teacher_manager'
    });
    
    console.log('数据库连接成功');
    
    // 1. 检查class_students表是否存在
    console.log('\n=== 检查class_students表 ===');
    try {
      const [classStudentsStructure] = await connection.execute('DESCRIBE class_students');
      console.log('class_students表结构:');
      console.table(classStudentsStructure);
      
      // 查看class_students表数据
      const [classStudentsData] = await connection.execute('SELECT * FROM class_students LIMIT 10');
      console.log('\nclass_students表数据样本:');
      console.table(classStudentsData);
      
      // 查看高一(1)班的学生关联
      console.log('\n=== 高一(1)班的学生关联 ===');
      const [class1Students] = await connection.execute(`
        SELECT 
          cs.class_id,
          cs.student_id,
          u.username,
          u.name,
          u.role_id,
          c.name as class_name
        FROM class_students cs
        JOIN users u ON cs.student_id = u.id
        JOIN classes c ON cs.class_id = c.id
        WHERE cs.class_id = 1
        ORDER BY u.username
      `);
      
      if (class1Students.length > 0) {
        console.table(class1Students);
        console.log(`\n高一(1)班共有 ${class1Students.length} 名学生`);
      } else {
        console.log('高一(1)班没有学生关联');
      }
      
      // 查看所有班级的学生分布
      console.log('\n=== 所有班级的学生分布 ===');
      const [classDistribution] = await connection.execute(`
        SELECT 
          c.id as class_id,
          c.name as class_name,
          c.teacher_id,
          COUNT(cs.student_id) as student_count
        FROM classes c
        LEFT JOIN class_students cs ON c.id = cs.class_id
        GROUP BY c.id, c.name, c.teacher_id
        ORDER BY c.id
      `);
      console.table(classDistribution);
      
    } catch (error) {
      console.log('class_students表查询失败，错误:', error.message);
    }
    
    // 2. 检查roles表
    console.log('\n=== 检查roles表 ===');
    try {
      const [rolesData] = await connection.execute('SELECT * FROM roles');
      console.table(rolesData);
    } catch (error) {
      console.log('roles表不存在，错误:', error.message);
    }
    
    // 3. 检查users表中role_id的分布
    console.log('\n=== users表中role_id分布 ===');
    const [roleDistribution] = await connection.execute(`
      SELECT 
        u.role_id,
        r.name as role_name,
        COUNT(*) as count
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      GROUP BY u.role_id, r.name
      ORDER BY u.role_id
    `);
    console.table(roleDistribution);
    
    // 4. 查看学生用户（假设role_id=3是学生）
    console.log('\n=== 学生用户列表（前10个）===');
    const [students] = await connection.execute(`
      SELECT u.id, u.username, u.name, u.role_id, r.name as role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE r.name = 'student' OR u.role_id = 3
      ORDER BY u.username
      LIMIT 10
    `);
    console.table(students);
    
    // 5. 检查teacher1能访问的班级和学生
    console.log('\n=== teacher1的班级和学生访问权限 ===');
    const [teacher1Classes] = await connection.execute(`
      SELECT 
        c.id as class_id,
        c.name as class_name,
        c.teacher_id,
        u.username as teacher_username,
        u.name as teacher_name
      FROM classes c
      JOIN users u ON c.teacher_id = u.id
      WHERE u.username = 'teacher1'
    `);
    
    if (teacher1Classes.length > 0) {
      console.table(teacher1Classes);
      
      // 查看teacher1班级的学生
      for (const cls of teacher1Classes) {
        console.log(`\n=== ${cls.class_name}的学生列表 ===`);
        try {
          const [students] = await connection.execute(`
            SELECT 
              cs.student_id,
              u.username,
              u.name,
              u.role_id,
              r.name as role_name,
              cs.join_date
            FROM class_students cs
            JOIN users u ON cs.student_id = u.id
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE cs.class_id = ?
            ORDER BY u.username
          `, [cls.class_id]);
          
          if (students.length > 0) {
            console.table(students);
            console.log(`该班级共有 ${students.length} 名学生`);
          } else {
            console.log('该班级没有学生');
          }
        } catch (error) {
          console.log('查询学生失败:', error.message);
        }
      }
    } else {
      console.log('teacher1没有关联的班级');
    }
    
    // 6. 检查是否有学生没有班级关联
    console.log('\n=== 没有班级关联的学生 ===');
    try {
      const [unassignedStudents] = await connection.execute(`
        SELECT 
          u.id,
          u.username,
          u.name,
          u.role_id,
          r.name as role_name
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        LEFT JOIN class_students cs ON u.id = cs.student_id
        WHERE (r.name = 'student' OR u.role_id = 3) AND cs.student_id IS NULL
        ORDER BY u.username
        LIMIT 10
      `);
      
      if (unassignedStudents.length > 0) {
        console.table(unassignedStudents);
        console.log(`有 ${unassignedStudents.length} 名学生没有班级关联`);
      } else {
        console.log('所有学生都有班级关联');
      }
    } catch (error) {
      console.log('查询未分配学生失败:', error.message);
    }
    
  } catch (error) {
    console.error('检查失败:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n数据库连接已关闭');
    }
  }
}

// 如果直接运行此文件，则执行检查
if (require.main === module) {
  checkClassStudentsTable().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('执行失败:', error);
    process.exit(1);
  });
}

module.exports = { checkClassStudentsTable };