#!/usr/bin/env node

const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// 数据库配置
const dbConfig = {
  host: '123.249.87.129',
  port: 3306,
  user: 'teacher_admin',
  password: 'jxj13140123',
  database: 'teacher_manager',
  charset: 'utf8mb4',
  timezone: '+08:00'
};

async function fixDatabase() {
  let connection;
  
  try {
    console.log('🔗 连接数据库...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ 数据库连接成功');
    
    // 检查并删除重复的索引
    console.log('🔍 检查重复索引...');
    
    try {
      // 尝试删除可能重复的索引
      await connection.execute('DROP INDEX uk_role_resource_action ON permissions');
      console.log('✅ 删除重复索引成功');
    } catch (error) {
      if (error.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
        console.log('ℹ️  索引不存在，无需删除');
      } else {
        console.log('⚠️  删除索引时出现错误:', error.message);
      }
    }
    
    // 清理可能的重复数据
    console.log('🧹 清理重复数据...');
    
    try {
      // 删除permissions表中的重复数据
      await connection.execute(`
        DELETE p1 FROM permissions p1
        INNER JOIN permissions p2 
        WHERE p1.id > p2.id 
        AND p1.role = p2.role 
        AND p1.resource = p2.resource 
        AND p1.action = p2.action
      `);
      console.log('✅ 清理重复数据完成');
    } catch (error) {
      console.log('⚠️  清理重复数据时出现错误:', error.message);
    }
    
    console.log('🎉 数据库修复完成！');
    
  } catch (error) {
    console.error('❌ 数据库修复失败:', error.message);
    console.error('详细错误:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 数据库连接已关闭');
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  fixDatabase();
}

module.exports = fixDatabase;