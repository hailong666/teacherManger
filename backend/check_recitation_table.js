const mysql = require('mysql2/promise');

async function checkRecitationTable() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: '123.249.87.129',
      user: 'root',
      password: 'jxj13140123',
      database: 'teacher_manager'
    });

    console.log('数据库连接成功');

    // 检查recitation表是否存在
    const [tables] = await connection.execute("SHOW TABLES LIKE 'recitation'");
    console.log('Recitation table exists:', tables.length > 0);

    if (tables.length > 0) {
      // 查看表结构
      const [structure] = await connection.execute('DESCRIBE recitation');
      console.log('\n=== Recitation表结构 ===');
      console.table(structure);

      // 查看表数据
      const [data] = await connection.execute('SELECT * FROM recitation LIMIT 3');
      console.log('\n=== Recitation表数据 ===');
      console.table(data);
    } else {
      console.log('Recitation表不存在，需要创建');
    }

  } catch (error) {
    console.error('检查recitation表时出错:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('数据库连接已关闭');
    }
  }
}

checkRecitationTable();