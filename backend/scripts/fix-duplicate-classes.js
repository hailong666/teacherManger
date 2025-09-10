require('dotenv').config();
const mysql = require('mysql2/promise');

async function fixDuplicateClasses() {
  const connection = await mysql.createConnection({
    host: '123.249.87.129',
    port: 3306,
    user: 'teacher_admin',
    password: 'jxj13140123',
    database: 'teacher_manager'
  });

  try {
    console.log('数据库连接成功');
    
    // 1. 查看当前重复的班级
    console.log('\n=== 修复前的班级状态 ===');
    const [beforeClasses] = await connection.execute(`
      SELECT c.id, c.name, c.teacher_id, 
             (SELECT COUNT(*) FROM class_students cs WHERE cs.class_id = c.id) as student_count
      FROM classes c
      ORDER BY c.id
    `);
    console.table(beforeClasses);
    
    // 2. 找到每个班级名称的最小ID（保留的记录）
    const [keepClasses] = await connection.execute(`
      SELECT name, MIN(id) as keep_id
      FROM classes
      GROUP BY name
    `);
    console.log('\n=== 要保留的班级记录 ===');
    console.table(keepClasses);
    
    // 3. 对于高一4班，将所有学生关联到ID最小的班级记录
    const keepClassId = keepClasses.find(c => c.name === '高一4班')?.keep_id;
    if (keepClassId) {
      console.log(`\n将所有学生关联到班级ID: ${keepClassId}`);
      
      // 更新class_students表，将所有高一4班的学生都关联到保留的班级ID
      const [updateResult] = await connection.execute(`
        UPDATE class_students 
        SET class_id = ?
        WHERE class_id IN (SELECT id FROM classes WHERE name = '高一4班' AND id != ?)
      `, [keepClassId, keepClassId]);
      console.log(`更新了 ${updateResult.affectedRows} 条学生班级关联记录`);
      
      // 删除重复的班级记录
      const [deleteResult] = await connection.execute(`
        DELETE FROM classes 
        WHERE name = '高一4班' AND id != ?
      `, [keepClassId]);
      console.log(`删除了 ${deleteResult.affectedRows} 条重复的班级记录`);
    }
    
    // 4. 查看修复后的状态
    console.log('\n=== 修复后的班级状态 ===');
    const [afterClasses] = await connection.execute(`
      SELECT c.id, c.name, c.teacher_id, 
             (SELECT COUNT(*) FROM class_students cs WHERE cs.class_id = c.id) as student_count
      FROM classes c
      ORDER BY c.id
    `);
    console.table(afterClasses);
    
    console.log('\n班级重复记录修复完成！');
    
  } catch (error) {
    console.error('修复失败:', error);
  } finally {
    await connection.end();
    console.log('数据库连接已关闭');
  }
}

fixDuplicateClasses();