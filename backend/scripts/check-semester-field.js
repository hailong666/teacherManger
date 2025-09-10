require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkSemesterField() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'teacher_manager'
  });

  try {
    console.log('数据库连接成功');
    
    // 查看classes表结构
    console.log('\n=== Classes表结构 ===');
    const [tableStructure] = await connection.execute('DESCRIBE classes');
    tableStructure.forEach(field => {
      if (field.Field === 'semester') {
        console.log(`semester字段: ${field.Type}, 允许空值: ${field.Null}, 默认值: ${field.Default}`);
      }
    });
    
    // 查看现有的semester数据
    console.log('\n=== 现有semester数据 ===');
    const [semesterData] = await connection.execute('SELECT DISTINCT semester FROM classes WHERE semester IS NOT NULL');
    console.log('现有semester值:', semesterData.map(row => row.semester));
    
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await connection.end();
    console.log('数据库连接已关闭');
  }
}

checkSemesterField();