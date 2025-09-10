#!/usr/bin/env node

/**
 * 数据库初始化脚本
 * 用于恢复管理员、学生和老师的基础数据
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
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

// 默认密码
const DEFAULT_PASSWORD = '123456';

async function checkTableStructure(connection) {
  console.log('🔍 检查表结构...');
  
  try {
    // 检查roles表结构
    const [rolesColumns] = await connection.execute('DESCRIBE roles');
    console.log('📋 roles表结构:', rolesColumns.map(col => col.Field));
    
    // 检查users表结构
    const [usersColumns] = await connection.execute('DESCRIBE users');
    console.log('📋 users表结构:', usersColumns.map(col => col.Field));
    
    return {
      roles: rolesColumns.map(col => col.Field),
      users: usersColumns.map(col => col.Field)
    };
  } catch (error) {
    console.log('⚠️  表可能不存在，将使用基础字段');
    return {
      roles: ['id', 'name', 'description', 'created_at', 'updated_at'],
      users: ['id', 'username', 'password', 'email', 'real_name', 'phone', 'status', 'created_at', 'updated_at']
    };
  }
}

async function initDatabase() {
  let connection;
  
  try {
    console.log('🔗 连接数据库...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ 数据库连接成功');
    
    // 检查表结构
    const tableStructure = await checkTableStructure(connection);
    
    // 生成密码哈希
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    console.log('🔐 密码哈希生成完成');
    
    // 1. 插入角色数据（根据实际表结构调整）
    console.log('📝 插入角色数据...');
    if (tableStructure.roles.includes('permissions')) {
      // 包含permissions字段
      const rolesSql = `
        INSERT INTO roles (id, name, description, permissions, created_at, updated_at) VALUES
        (1, 'admin', '系统管理员', '["user:create","user:read","user:update","user:delete","role:manage","class:manage","attendance:manage","homework:manage","article:manage","points:manage"]', NOW(), NOW()),
        (2, 'teacher', '教师', '["user:read","class:read","class:update","attendance:create","attendance:read","homework:create","homework:read","homework:update","article:create","article:read","points:create","points:read"]', NOW(), NOW()),
        (3, 'student', '学生', '["user:read","class:read","attendance:read","homework:read","homework:submit","article:read","points:read"]', NOW(), NOW())
        ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        description = VALUES(description),
        permissions = VALUES(permissions),
        updated_at = NOW();
      `;
      await connection.execute(rolesSql);
    } else {
       // 不包含permissions字段，但包含display_name字段
       const rolesSql = `
         INSERT INTO roles (id, name, display_name, description, level, is_active, created_at, updated_at) VALUES
         (1, 'admin', '管理员', '系统管理员', 1, 1, NOW(), NOW()),
         (2, 'teacher', '教师', '教师角色', 2, 1, NOW(), NOW()),
         (3, 'student', '学生', '学生角色', 3, 1, NOW(), NOW())
         ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         display_name = VALUES(display_name),
         description = VALUES(description),
         level = VALUES(level),
         is_active = VALUES(is_active),
         updated_at = NOW();
       `;
       await connection.execute(rolesSql);
     }
    
    // 2. 插入管理员用户
     console.log('👤 插入管理员用户...');
     const adminSql = `
       INSERT INTO users (id, username, password, email, name, phone, role_id, status, created_at, updated_at) VALUES
       (1, 'admin', ?, 'admin@teacher.com', '系统管理员', null, 1, 'active', NOW(), NOW())
       ON DUPLICATE KEY UPDATE
       username = VALUES(username),
       password = VALUES(password),
       email = VALUES(email),
       name = VALUES(name),
       phone = VALUES(phone),
       role_id = VALUES(role_id),
       status = VALUES(status),
       updated_at = NOW();
     `;
     await connection.execute(adminSql, [passwordHash]);
    
    // 3. 插入教师用户
    console.log('👨‍🏫 插入教师用户...');
    const teachers = [
       [2, 'teacher001', 'teacher001@teacher.com', '张老师', null],
             [3, 'teacher002', 'teacher002@teacher.com', '李老师', null],
             [4, 'teacher003', 'teacher003@teacher.com', '王老师', null]
     ];
    
    for (const teacher of teachers) {
       const teacherSql = `
         INSERT INTO users (id, username, password, email, name, phone, role_id, status, created_at, updated_at) VALUES
         (?, ?, ?, ?, ?, ?, 2, 'active', NOW(), NOW())
         ON DUPLICATE KEY UPDATE
         username = VALUES(username),
         password = VALUES(password),
         email = VALUES(email),
         name = VALUES(name),
         phone = VALUES(phone),
         role_id = VALUES(role_id),
         status = VALUES(status),
         updated_at = NOW();
       `;
       await connection.execute(teacherSql, [teacher[0], teacher[1], passwordHash, teacher[2], teacher[3], teacher[4]]);
     }
    
    // 4. 插入学生用户
    console.log('👨‍🎓 插入学生用户...');
    const students = [
       [5, 'student001', 'student001@student.com', '张三', null],
             [6, 'student002', 'student002@student.com', '李四', null],
             [7, 'student003', 'student003@student.com', '王五', null],
             [8, 'student004', 'student004@student.com', '赵六', null],
             [9, 'student005', 'student005@student.com', '钱七', null]
     ];
    
    for (const student of students) {
       const studentSql = `
         INSERT INTO users (id, username, password, email, name, phone, role_id, status, created_at, updated_at) VALUES
         (?, ?, ?, ?, ?, ?, 3, 'active', NOW(), NOW())
         ON DUPLICATE KEY UPDATE
         username = VALUES(username),
         password = VALUES(password),
         email = VALUES(email),
         name = VALUES(name),
         phone = VALUES(phone),
         role_id = VALUES(role_id),
         status = VALUES(status),
         updated_at = NOW();
       `;
       await connection.execute(studentSql, [student[0], student[1], passwordHash, student[2], student[3], student[4]]);
     }
    
    // 5. 分配用户角色（如果user_roles表存在）
    console.log('🔗 分配用户角色...');
    try {
      const userRolesSql = `
        INSERT INTO user_roles (user_id, role_id, created_at) VALUES
        (1, 1, NOW()),  -- admin -> admin role
        (2, 2, NOW()),  -- teacher001 -> teacher role
        (3, 2, NOW()),  -- teacher002 -> teacher role
        (4, 2, NOW()),  -- teacher003 -> teacher role
        (5, 3, NOW()),  -- student001 -> student role
        (6, 3, NOW()),  -- student002 -> student role
        (7, 3, NOW()),  -- student003 -> student role
        (8, 3, NOW()),  -- student004 -> student role
        (9, 3, NOW())   -- student005 -> student role
        ON DUPLICATE KEY UPDATE
        created_at = VALUES(created_at);
      `;
      await connection.execute(userRolesSql);
    } catch (error) {
      console.log('⚠️  user_roles表可能不存在，跳过角色分配');
    }
    
    // 6. 插入示例班级数据（如果classes表存在）
    console.log('🏫 插入班级数据...');
    try {
      const classesSql = `
        INSERT INTO classes (id, name, description, teacher_id, semester, year, status, created_at, updated_at) VALUES
        (1, '计算机科学与技术2021级1班', '计算机科学与技术专业2021级第1班', 2, '2024-1', 2024, 'active', NOW(), NOW()),
        (2, '计算机科学与技术2021级2班', '计算机科学与技术专业2021级第2班', 3, '2024-1', 2024, 'active', NOW(), NOW()),
        (3, '软件工程2021级1班', '软件工程专业2021级第1班', 4, '2024-1', 2024, 'active', NOW(), NOW())
        ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        description = VALUES(description),
        teacher_id = VALUES(teacher_id),
        semester = VALUES(semester),
        year = VALUES(year),
        status = VALUES(status),
        updated_at = NOW();
      `;
      await connection.execute(classesSql);
      
      // 7. 分配学生到班级（如果class_students表存在）
      console.log('👥 分配学生到班级...');
      const classStudentsSql = `
        INSERT INTO class_students (class_id, student_id, created_at) VALUES
        (1, 5, NOW()),  -- 张三 -> 计科1班
        (1, 6, NOW()),  -- 李四 -> 计科1班
        (2, 7, NOW()),  -- 王五 -> 计科2班
        (2, 8, NOW()),  -- 赵六 -> 计科2班
        (3, 9, NOW())   -- 钱七 -> 软工1班
        ON DUPLICATE KEY UPDATE
        created_at = VALUES(created_at);
      `;
      await connection.execute(classStudentsSql);
    } catch (error) {
      console.log('⚠️  classes或class_students表可能不存在，跳过班级数据');
    }
    
    console.log('\n🎉 数据库初始化完成！');
    console.log('\n📋 账号信息:');
    console.log('├─ 管理员账号: admin');
    console.log('├─ 教师账号: teacher001, teacher002, teacher003');
    console.log('├─ 学生账号: student001, student002, student003, student004, student005');
    console.log('└─ 默认密码: 123456');
    console.log('\n⚠️  请及时修改默认密码！');
    
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error.message);
    console.error('详细错误:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 数据库连接已关闭');
    }
  }
}

// 执行初始化
if (require.main === module) {
  initDatabase();
}

module.exports = initDatabase;