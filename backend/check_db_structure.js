const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkDatabaseStructure() {
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
    
    // 1. 查看所有表
    console.log('\n=== 数据库中的所有表 ===');
    const [tables] = await connection.execute('SHOW TABLES');
    console.table(tables);
    
    // 2. 查看users表结构
    console.log('\n=== users表结构 ===');
    const [usersStructure] = await connection.execute('DESCRIBE users');
    console.table(usersStructure);
    
    // 3. 查看classes表结构
    console.log('\n=== classes表结构 ===');
    const [classesStructure] = await connection.execute('DESCRIBE classes');
    console.table(classesStructure);
    
    // 4. 查看users表中的所有数据（前10条）
    console.log('\n=== users表数据样本 ===');
    const [usersData] = await connection.execute(`
      SELECT *
      FROM users 
      ORDER BY id
      LIMIT 10
    `);
    console.table(usersData);
    
    // 5. 检查teacher1的信息
    console.log('\n=== teacher1的信息 ===');
    const [teacher1] = await connection.execute(`
      SELECT *
      FROM users 
      WHERE username = 'teacher1'
    `);
    console.table(teacher1);
    
    // 6. 检查是否有students表
    console.log('\n=== 检查是否有students表 ===');
    try {
      const [studentsStructure] = await connection.execute('DESCRIBE students');
      console.log('students表结构:');
      console.table(studentsStructure);
      
      // 查看students表数据
      const [studentsData] = await connection.execute('SELECT * FROM students LIMIT 10');
      console.log('\nstudents表数据样本:');
      console.table(studentsData);
    } catch (error) {
      console.log('students表不存在');
    }
    
    // 7. 检查是否有teachers表
    console.log('\n=== 检查是否有teachers表 ===');
    try {
      const [teachersStructure] = await connection.execute('DESCRIBE teachers');
      console.log('teachers表结构:');
      console.table(teachersStructure);
      
      // 查看teachers表数据
      const [teachersData] = await connection.execute('SELECT * FROM teachers LIMIT 10');
      console.log('\nteachers表数据样本:');
      console.table(teachersData);
    } catch (error) {
      console.log('teachers表不存在');
    }
    
    // 8. 检查recitations表结构
    console.log('\n=== recitations表结构 ===');
    try {
      const [recitationsStructure] = await connection.execute('DESCRIBE recitations');
      console.table(recitationsStructure);
      
      // 查看recitations表数据样本
      const [recitationsData] = await connection.execute('SELECT * FROM recitations LIMIT 5');
      console.log('\nrecitations表数据样本:');
      console.table(recitationsData);
    } catch (error) {
      console.log('recitations表不存在');
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
  checkDatabaseStructure().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('执行失败:', error);
    process.exit(1);
  });
}

module.exports = { checkDatabaseStructure };