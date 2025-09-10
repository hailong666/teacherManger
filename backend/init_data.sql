-- 教师管理系统初始化数据脚本
-- 用于恢复管理员、学生和老师的基础数据

USE teacher_manager;

-- 清空现有数据（谨慎操作）
-- DELETE FROM user_roles;
-- DELETE FROM users;
-- DELETE FROM roles;

-- 插入角色数据
INSERT INTO roles (id, name, description, permissions, created_at, updated_at) VALUES
(1, 'admin', '系统管理员', '["user:create","user:read","user:update","user:delete","role:manage","class:manage","attendance:manage","homework:manage","article:manage","points:manage"]', NOW(), NOW()),
(2, 'teacher', '教师', '["user:read","class:read","class:update","attendance:create","attendance:read","homework:create","homework:read","homework:update","article:create","article:read","points:create","points:read"]', NOW(), NOW()),
(3, 'student', '学生', '["user:read","class:read","attendance:read","homework:read","homework:submit","article:read","points:read"]', NOW(), NOW())
ON DUPLICATE KEY UPDATE
name = VALUES(name),
description = VALUES(description),
permissions = VALUES(permissions),
updated_at = NOW();

-- 插入管理员用户
INSERT INTO users (id, username, password, email, real_name, phone, avatar, status, created_at, updated_at) VALUES
(1, 'admin', '$2b$10$rOzJqQZQZQZQZQZQZQZQZOzJqQZQZQZQZQZQZQZQZOzJqQZQZQZQZQ', 'admin@teacher.com', '系统管理员', '13800138000', NULL, 'active', NOW(), NOW())
ON DUPLICATE KEY UPDATE
username = VALUES(username),
email = VALUES(email),
real_name = VALUES(real_name),
phone = VALUES(phone),
status = VALUES(status),
updated_at = NOW();

-- 插入示例教师用户
INSERT INTO users (id, username, password, email, real_name, phone, avatar, status, created_at, updated_at) VALUES
(2, 'teacher001', '$2b$10$rOzJqQZQZQZQZQZQZQZQZOzJqQZQZQZQZQZQZQZQZOzJqQZQZQZQZQ', 'teacher001@teacher.com', '张老师', '13800138001', NULL, 'active', NOW(), NOW()),
(3, 'teacher002', '$2b$10$rOzJqQZQZQZQZQZQZQZQZOzJqQZQZQZQZQZQZQZQZOzJqQZQZQZQZQ', 'teacher002@teacher.com', '李老师', '13800138002', NULL, 'active', NOW(), NOW()),
(4, 'teacher003', '$2b$10$rOzJqQZQZQZQZQZQZQZQZOzJqQZQZQZQZQZQZQZQZOzJqQZQZQZQZQ', 'teacher003@teacher.com', '王老师', '13800138003', NULL, 'active', NOW(), NOW())
ON DUPLICATE KEY UPDATE
username = VALUES(username),
email = VALUES(email),
real_name = VALUES(real_name),
phone = VALUES(phone),
status = VALUES(status),
updated_at = NOW();

-- 插入示例学生用户
INSERT INTO users (id, username, password, email, real_name, phone, avatar, status, created_at, updated_at) VALUES
(5, 'student001', '$2b$10$rOzJqQZQZQZQZQZQZQZQZOzJqQZQZQZQZQZQZQZQZOzJqQZQZQZQZQ', 'student001@student.com', '张三', '13800138005', NULL, 'active', NOW(), NOW()),
(6, 'student002', '$2b$10$rOzJqQZQZQZQZQZQZQZQZOzJqQZQZQZQZQZQZQZQZOzJqQZQZQZQZQ', 'student002@student.com', '李四', '13800138006', NULL, 'active', NOW(), NOW()),
(7, 'student003', '$2b$10$rOzJqQZQZQZQZQZQZQZQZOzJqQZQZQZQZQZQZQZQZOzJqQZQZQZQZQ', 'student003@student.com', '王五', '13800138007', NULL, 'active', NOW(), NOW()),
(8, 'student004', '$2b$10$rOzJqQZQZQZQZQZQZQZQZOzJqQZQZQZQZQZQZQZQZOzJqQZQZQZQZQ', 'student004@student.com', '赵六', '13800138008', NULL, 'active', NOW(), NOW()),
(9, 'student005', '$2b$10$rOzJqQZQZQZQZQZQZQZQZOzJqQZQZQZQZQZQZQZQZOzJqQZQZQZQZQ', 'student005@student.com', '钱七', '13800138009', NULL, 'active', NOW(), NOW())
ON DUPLICATE KEY UPDATE
username = VALUES(username),
email = VALUES(email),
real_name = VALUES(real_name),
phone = VALUES(phone),
status = VALUES(status),
updated_at = NOW();

-- 分配用户角色
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

-- 插入示例班级数据
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

-- 分配学生到班级
INSERT INTO class_students (class_id, student_id, created_at) VALUES
(1, 5, NOW()),  -- 张三 -> 计科1班
(1, 6, NOW()),  -- 李四 -> 计科1班
(2, 7, NOW()),  -- 王五 -> 计科2班
(2, 8, NOW()),  -- 赵六 -> 计科2班
(3, 9, NOW())   -- 钱七 -> 软工1班
ON DUPLICATE KEY UPDATE
created_at = VALUES(created_at);

SELECT '数据库初始化完成！' as message;
SELECT '默认密码为: 123456' as password_info;
SELECT '管理员账号: admin' as admin_account;
SELECT '教师账号: teacher001, teacher002, teacher003' as teacher_accounts;
SELECT '学生账号: student001, student002, student003, student004, student005' as student_accounts;