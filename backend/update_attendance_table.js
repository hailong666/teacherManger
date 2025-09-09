const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateAttendanceTable() {
  let connection;
  
  try {
    // 连接数据库
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'teacher_manager'
    });
    
    console.log('数据库连接成功');
    
    // 检查表是否存在
    const [tables] = await connection.execute(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'attendance'",
      [process.env.DB_DATABASE || 'teacher_manager']
    );
    
    if (tables.length === 0) {
      console.log('attendance表不存在，跳过更新');
      return;
    }
    
    console.log('开始更新attendance表结构...');
    
    // 检查字段是否已存在，如果不存在则添加
    const [columns] = await connection.execute('DESCRIBE attendance');
    const existingColumns = columns.map(col => col.Field);
    
    // 添加note字段
    if (!existingColumns.includes('note')) {
      await connection.execute(
        'ALTER TABLE attendance ADD COLUMN note TEXT NULL COMMENT "签到备注"'
      );
      console.log('✓ 添加note字段成功');
    } else {
      console.log('✓ note字段已存在');
    }
    
    // 添加signature_data字段
    if (!existingColumns.includes('signature_data')) {
      await connection.execute(
        'ALTER TABLE attendance ADD COLUMN signature_data LONGTEXT NULL COMMENT "手写签名数据（Base64格式）"'
      );
      console.log('✓ 添加signature_data字段成功');
    } else {
      console.log('✓ signature_data字段已存在');
    }
    
    // 添加manually_created字段
    if (!existingColumns.includes('manually_created')) {
      await connection.execute(
        'ALTER TABLE attendance ADD COLUMN manually_created BOOLEAN DEFAULT FALSE COMMENT "是否为手动创建的签到记录"'
      );
      console.log('✓ 添加manually_created字段成功');
    } else {
      console.log('✓ manually_created字段已存在');
    }
    
    // 添加created_by字段
    if (!existingColumns.includes('created_by')) {
      await connection.execute(
        'ALTER TABLE attendance ADD COLUMN created_by INT NULL COMMENT "创建者ID（教师或管理员）"'
      );
      console.log('✓ 添加created_by字段成功');
      
      // 添加外键约束
      await connection.execute(
        'ALTER TABLE attendance ADD CONSTRAINT fk_attendance_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL'
      );
      console.log('✓ 添加created_by外键约束成功');
    } else {
      console.log('✓ created_by字段已存在');
    }
    
    // 显示更新后的表结构
    console.log('\n=== 更新后的attendance表结构 ===');
    const [updatedColumns] = await connection.execute('DESCRIBE attendance');
    console.table(updatedColumns);
    
    console.log('\nattendance表结构更新完成！');
    
  } catch (error) {
    console.error('更新失败:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n数据库连接已关闭');
    }
  }
}

updateAttendanceTable();