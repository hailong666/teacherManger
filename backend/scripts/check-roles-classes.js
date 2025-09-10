require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkRolesAndClasses() {
  const connection = await mysql.createConnection({
    host: '123.249.87.129',
    port: 3306,
    user: 'teacher_admin',
    password: 'jxj13140123',
    database: 'teacher_manager'
  });

  try {
    console.log('数据库连接成功');
    
    // 1. 查看角色表
    console.log('\n=== 角色表 ===');
    const [roles] = await connection.execute('SELECT * FROM roles');
    console.table(roles);
    
    // 2. 查看teacher1关联的班级
    console.log('\n=== teacher1关联的班级 ===');
    const [teacher1Classes] = await connection.execute(`
      SELECT c.id, c.name, c.teacher_id, u.username, u.name as teacher_name
      FROM classes c
      JOIN users u ON c.teacher_id = u.id
      WHERE u.username = 'teacher1'
    `);
    console.table(teacher1Classes);
    
    // 3. 查看班级表中的重复记录
    console.log('\n=== 班级表重复记录检查 ===');
    const [duplicateClasses] = await connection.execute(`
      SELECT name, COUNT(*) as count
      FROM classes
      GROUP BY name
      HAVING COUNT(*) > 1
    `);
    console.table(duplicateClasses);
    
    // 4. 查看所有班级的基本信息
    console.log('\n=== 所有班级基本信息 ===');
    const [allClasses] = await connection.execute(`
      SELECT c.id, c.name, c.teacher_id, u.username as teacher_username, u.name as teacher_name
      FROM classes c
      LEFT JOIN users u ON c.teacher_id = u.id
      ORDER BY c.id
    `);
    console.table(allClasses);
    
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await connection.end();
    console.log('数据库连接已关闭');
  }
}

checkRolesAndClasses();