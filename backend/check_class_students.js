const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkClassStudents() {
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
    
    // 1. 检查高一(1)班的基本信息
    console.log('\n=== 高一(1)班基本信息 ===');
    const [classInfo] = await connection.execute(
      'SELECT * FROM classes WHERE id = 1'
    );
    console.table(classInfo);
    
    // 2. 检查高一(1)班的学生关联
    console.log('\n=== 高一(1)班学生关联情况 ===');
    const [studentRelations] = await connection.execute(`
      SELECT 
        u.id, 
        u.username, 
        u.name, 
        u.role,
        uc.class_id,
        c.name as class_name
      FROM users u 
      LEFT JOIN user_classes uc ON u.id = uc.user_id 
      LEFT JOIN classes c ON uc.class_id = c.id 
      WHERE u.role = 'student' AND c.id = 1 
      ORDER BY u.id
    `);
    
    if (studentRelations.length > 0) {
      console.table(studentRelations);
      console.log(`\n高一(1)班共有 ${studentRelations.length} 名学生`);
    } else {
      console.log('高一(1)班没有关联的学生');
    }
    
    // 3. 检查所有学生的班级关联
    console.log('\n=== 所有学生的班级关联情况 ===');
    const [allStudents] = await connection.execute(`
      SELECT 
        u.id, 
        u.username, 
        u.name, 
        u.role,
        GROUP_CONCAT(CONCAT(c.id, ':', c.name) SEPARATOR ', ') as classes
      FROM users u 
      LEFT JOIN user_classes uc ON u.id = uc.user_id 
      LEFT JOIN classes c ON uc.class_id = c.id 
      WHERE u.role = 'student'
      GROUP BY u.id, u.username, u.name, u.role
      ORDER BY u.id
    `);
    
    console.table(allStudents.slice(0, 10)); // 只显示前10个学生
    console.log(`\n总共有 ${allStudents.length} 名学生`);
    
    // 4. 检查user_classes表的数据
    console.log('\n=== user_classes关联表数据 ===');
    const [userClasses] = await connection.execute(`
      SELECT 
        uc.user_id,
        uc.class_id,
        u.username,
        u.name as student_name,
        c.name as class_name
      FROM user_classes uc
      JOIN users u ON uc.user_id = u.id
      JOIN classes c ON uc.class_id = c.id
      WHERE c.id = 1
      ORDER BY uc.user_id
    `);
    
    if (userClasses.length > 0) {
      console.table(userClasses);
    } else {
      console.log('user_classes表中没有高一(1)班的学生关联数据');
    }
    
    // 5. 检查是否有学生但没有班级关联
    console.log('\n=== 没有班级关联的学生 ===');
    const [unassignedStudents] = await connection.execute(`
      SELECT u.id, u.username, u.name
      FROM users u
      LEFT JOIN user_classes uc ON u.id = uc.user_id
      WHERE u.role = 'student' AND uc.user_id IS NULL
      ORDER BY u.id
    `);
    
    if (unassignedStudents.length > 0) {
      console.table(unassignedStudents);
      console.log(`\n有 ${unassignedStudents.length} 名学生没有班级关联`);
    } else {
      console.log('所有学生都有班级关联');
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
  checkClassStudents().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('执行失败:', error);
    process.exit(1);
  });
}

module.exports = { checkClassStudents };