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
    
    // 测试不带LIMIT的查询
    console.log('\n=== 测试不带LIMIT的查询 ===');
    const [rows1] = await connection.execute(
      'SELECT * FROM classes WHERE teacher_id = ?',
      [userId]
    );
    console.log('查询结果:', rows1.length, '条记录');
    console.table(rows1);
    
    // 测试使用query而不是execute
    console.log('\n=== 测试使用query方法 ===');
    const [rows2] = await connection.query(
      `SELECT * FROM classes WHERE teacher_id = ${userId} LIMIT 10 OFFSET 0`
    );
    console.log('查询结果:', rows2.length, '条记录');
    console.table(rows2);
    
    // 测试完整查询使用query
    console.log('\n=== 测试完整查询使用query ===');
    const [rows3] = await connection.query(
      `SELECT c.*, u.name as teacher_name, u.username as teacher_username,
              (SELECT COUNT(*) FROM class_students cs WHERE cs.class_id = c.id) as student_count
       FROM classes c 
       LEFT JOIN users u ON c.teacher_id = u.id 
       WHERE c.teacher_id = ${userId} 
       ORDER BY c.created_at DESC 
       LIMIT 10 OFFSET 0`
    );
    console.log('查询结果:', rows3.length, '条记录');
    console.table(rows3);
    
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await connection.end();
    console.log('数据库连接已关闭');
  }
}

testClassQuery();