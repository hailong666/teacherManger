require('dotenv').config();
const mysql = require('mysql2/promise');

async function testClassQuery() {
  const connection = await mysql.createConnection({
    host: '123.249.87.129',
    user: 'teacher_admin',
    password: 'jxj13140123',
    database: 'teacher_manager'
  });

  try {
    console.log('数据库连接成功');
    
    const userId = 10; // teacher1的ID
    const limitNum = 10;
    const offset = 0;
    
    console.log('参数:', { userId, limitNum, offset });
    console.log('参数类型:', typeof userId, typeof limitNum, typeof offset);
    
    // 测试简化的查询
    console.log('\n=== 测试简化查询 ===');
    const [simpleRows] = await connection.execute(
      'SELECT * FROM classes WHERE teacher_id = ? LIMIT ? OFFSET ?',
      [userId, limitNum, offset]
    );
    console.log('简化查询结果:', simpleRows.length, '条记录');
    
    // 测试完整查询
    console.log('\n=== 测试完整查询 ===');
    const [fullRows] = await connection.execute(
      `SELECT c.*, u.name as teacher_name, u.username as teacher_username,
              (SELECT COUNT(*) FROM class_students cs WHERE cs.class_id = c.id) as student_count
       FROM classes c 
       LEFT JOIN users u ON c.teacher_id = u.id 
       WHERE c.teacher_id = ? 
       ORDER BY c.created_at DESC 
       LIMIT ? OFFSET ?`,
      [userId, limitNum, offset]
    );
    console.log('完整查询结果:', fullRows.length, '条记录');
    console.table(fullRows);
    
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await connection.end();
    console.log('数据库连接已关闭');
  }
}

testClassQuery();