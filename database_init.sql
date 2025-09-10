-- 教师管理系统数据库初始化脚本
-- 执行前请确保已创建数据库和用户

USE teacher_manager;

-- 设置字符集
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================
-- 1. 创建基础表结构（如果不存在）
-- ============================================

-- 角色表
CREATE TABLE IF NOT EXISTS `roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL COMMENT '角色名称',
  `display_name` varchar(100) NOT NULL COMMENT '显示名称',
  `description` text COMMENT '角色描述',
  `level` int NOT NULL DEFAULT '0' COMMENT '角色级别，数字越大权限越高',
  `is_active` tinyint(1) DEFAULT '1' COMMENT '是否启用',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  KEY `idx_name` (`name`),
  KEY `idx_level` (`level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 权限表
CREATE TABLE IF NOT EXISTS `permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL COMMENT '权限标识',
  `display_name` varchar(100) NOT NULL COMMENT '显示名称',
  `description` text COMMENT '权限描述',
  `module` varchar(50) DEFAULT NULL COMMENT '所属模块',
  `action` varchar(50) DEFAULT NULL COMMENT '操作类型',
  `resource` varchar(100) DEFAULT NULL COMMENT '资源标识',
  `is_active` tinyint(1) DEFAULT '1' COMMENT '是否启用',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  KEY `idx_module` (`module`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 角色权限关联表
CREATE TABLE IF NOT EXISTS `role_permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `role_id` int NOT NULL,
  `permission_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `role_permission` (`role_id`,`permission_id`),
  KEY `fk_role_permissions_permission` (`permission_id`),
  CONSTRAINT `fk_role_permissions_permission` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_role_permissions_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 用户表
CREATE TABLE IF NOT EXISTS `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL COMMENT '用户名',
  `password` varchar(255) NOT NULL COMMENT '密码哈希',
  `email` varchar(100) DEFAULT NULL COMMENT '邮箱',
  `phone` varchar(20) DEFAULT NULL COMMENT '电话',
  `real_name` varchar(100) DEFAULT NULL COMMENT '真实姓名',
  `avatar` varchar(255) DEFAULT NULL COMMENT '头像URL',
  `role_id` int DEFAULT NULL COMMENT '角色ID',
  `status` enum('active','inactive','banned') DEFAULT 'active' COMMENT '用户状态',
  `last_login_at` timestamp NULL DEFAULT NULL COMMENT '最后登录时间',
  `last_login_ip` varchar(45) DEFAULT NULL COMMENT '最后登录IP',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  KEY `fk_users_role` (`role_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 班级表
CREATE TABLE IF NOT EXISTS `classes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL COMMENT '班级名称',
  `description` text COMMENT '班级描述',
  `teacher_id` int DEFAULT NULL COMMENT '班主任ID',
  `grade` varchar(20) DEFAULT NULL COMMENT '年级',
  `semester` varchar(20) DEFAULT NULL COMMENT '学期',
  `academic_year` varchar(20) DEFAULT NULL COMMENT '学年',
  `max_students` int DEFAULT '50' COMMENT '最大学生数',
  `status` enum('active','inactive','archived') DEFAULT 'active' COMMENT '班级状态',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_classes_teacher` (`teacher_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_classes_teacher` FOREIGN KEY (`teacher_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 学生班级关联表
CREATE TABLE IF NOT EXISTS `class_students` (
  `id` int NOT NULL AUTO_INCREMENT,
  `class_id` int NOT NULL,
  `student_id` int NOT NULL,
  `joined_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `status` enum('active','inactive') DEFAULT 'active',
  PRIMARY KEY (`id`),
  UNIQUE KEY `class_student` (`class_id`,`student_id`),
  KEY `fk_class_students_student` (`student_id`),
  CONSTRAINT `fk_class_students_class` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_class_students_student` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 文章表
CREATE TABLE IF NOT EXISTS `articles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(200) NOT NULL COMMENT '文章标题',
  `content` longtext COMMENT '文章内容',
  `author` varchar(100) DEFAULT NULL COMMENT '作者',
  `source` varchar(200) DEFAULT NULL COMMENT '来源',
  `category` varchar(50) DEFAULT NULL COMMENT '分类',
  `difficulty` enum('easy','medium','hard') DEFAULT 'medium' COMMENT '难度等级',
  `word_count` int DEFAULT '0' COMMENT '字数',
  `is_active` tinyint(1) DEFAULT '1' COMMENT '是否启用',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_category` (`category`),
  KEY `idx_difficulty` (`difficulty`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 2. 插入基础数据
-- ============================================

-- 插入角色数据
INSERT IGNORE INTO `roles` (`name`, `display_name`, `description`, `level`) VALUES
('admin', '系统管理员', '拥有系统所有权限的超级管理员', 100),
('teacher', '教师', '负责班级管理和教学的教师角色', 50),
('student', '学生', '参与学习和签到的学生角色', 10);

-- 插入权限数据
INSERT IGNORE INTO `permissions` (`name`, `display_name`, `description`, `module`, `action`, `resource`) VALUES
-- 用户管理权限
('user.create', '创建用户', '创建新用户账户', 'user', 'create', 'user'),
('user.read', '查看用户', '查看用户信息', 'user', 'read', 'user'),
('user.update', '更新用户', '修改用户信息', 'user', 'update', 'user'),
('user.delete', '删除用户', '删除用户账户', 'user', 'delete', 'user'),

-- 角色管理权限
('role.create', '创建角色', '创建新角色', 'role', 'create', 'role'),
('role.read', '查看角色', '查看角色信息', 'role', 'read', 'role'),
('role.update', '更新角色', '修改角色信息', 'role', 'update', 'role'),
('role.delete', '删除角色', '删除角色', 'role', 'delete', 'role'),

-- 班级管理权限
('class.create', '创建班级', '创建新班级', 'class', 'create', 'class'),
('class.read', '查看班级', '查看班级信息', 'class', 'read', 'class'),
('class.update', '更新班级', '修改班级信息', 'class', 'update', 'class'),
('class.delete', '删除班级', '删除班级', 'class', 'delete', 'class'),

-- 考勤管理权限
('attendance.create', '创建考勤', '创建考勤记录', 'attendance', 'create', 'attendance'),
('attendance.read', '查看考勤', '查看考勤记录', 'attendance', 'read', 'attendance'),
('attendance.update', '更新考勤', '修改考勤记录', 'attendance', 'update', 'attendance'),
('attendance.delete', '删除考勤', '删除考勤记录', 'attendance', 'delete', 'attendance'),

-- 背诵管理权限
('recitation.create', '创建背诵', '创建背诵记录', 'recitation', 'create', 'recitation'),
('recitation.read', '查看背诵', '查看背诵记录', 'recitation', 'read', 'recitation'),
('recitation.update', '更新背诵', '修改背诵记录', 'recitation', 'update', 'recitation'),
('recitation.delete', '删除背诵', '删除背诵记录', 'recitation', 'delete', 'recitation'),

-- 文章管理权限
('article.create', '创建文章', '创建新文章', 'article', 'create', 'article'),
('article.read', '查看文章', '查看文章内容', 'article', 'read', 'article'),
('article.update', '更新文章', '修改文章内容', 'article', 'update', 'article'),
('article.delete', '删除文章', '删除文章', 'article', 'delete', 'article'),

-- 系统管理权限
('system.settings', '系统设置', '修改系统配置', 'system', 'update', 'settings'),
('system.logs', '查看日志', '查看系统日志', 'system', 'read', 'logs');

-- 为管理员角色分配所有权限
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `roles` r, `permissions` p
WHERE r.name = 'admin';

-- 为教师角色分配相关权限
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `roles` r, `permissions` p
WHERE r.name = 'teacher' AND p.name IN (
  'class.read', 'class.update',
  'attendance.create', 'attendance.read', 'attendance.update',
  'recitation.create', 'recitation.read', 'recitation.update',
  'article.read',
  'user.read'
);

-- 为学生角色分配基础权限
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `roles` r, `permissions` p
WHERE r.name = 'student' AND p.name IN (
  'attendance.read',
  'recitation.read',
  'article.read'
);

-- ============================================
-- 3. 创建默认管理员账户
-- ============================================

-- 创建默认管理员用户（密码：admin123）
-- 注意：生产环境中请立即修改默认密码
INSERT IGNORE INTO `users` (`username`, `password`, `email`, `real_name`, `role_id`, `status`)
SELECT 'admin', '$2b$10$rQJ8YnWmjKZKZQxqYrQqKOYxGYxGYxGYxGYxGYxGYxGYxGYxGYxGYx', 'admin@example.com', '系统管理员', r.id, 'active'
FROM `roles` r
WHERE r.name = 'admin'
AND NOT EXISTS (SELECT 1 FROM `users` WHERE `username` = 'admin');

-- 插入示例文章
INSERT IGNORE INTO `articles` (`title`, `content`, `author`, `category`, `difficulty`, `word_count`) VALUES
('静夜思', '床前明月光，疑是地上霜。举头望明月，低头思故乡。', '李白', '古诗', 'easy', 20),
('春晓', '春眠不觉晓，处处闻啼鸟。夜来风雨声，花落知多少。', '孟浩然', '古诗', 'easy', 20),
('登鹳雀楼', '白日依山尽，黄河入海流。欲穷千里目，更上一层楼。', '王之涣', '古诗', 'medium', 20);

-- ============================================
-- 4. 创建索引优化
-- ============================================

-- 为常用查询字段创建索引
CREATE INDEX IF NOT EXISTS `idx_users_role_status` ON `users` (`role_id`, `status`);
CREATE INDEX IF NOT EXISTS `idx_classes_teacher_status` ON `classes` (`teacher_id`, `status`);
CREATE INDEX IF NOT EXISTS `idx_articles_category_active` ON `articles` (`category`, `is_active`);

-- ============================================
-- 5. 设置完成
-- ============================================

SET FOREIGN_KEY_CHECKS = 1;

-- 显示初始化结果
SELECT '数据库初始化完成！' as message;
SELECT COUNT(*) as role_count FROM roles;
SELECT COUNT(*) as permission_count FROM permissions;
SELECT COUNT(*) as user_count FROM users;
SELECT COUNT(*) as article_count FROM articles;

-- 显示默认管理员信息
SELECT u.username, u.real_name, r.display_name as role
FROM users u
JOIN roles r ON u.role_id = r.id
WHERE u.username = 'admin';

-- 重要提醒
SELECT '⚠️  重要提醒：请立即修改默认管理员密码！' as warning;
SELECT '默认管理员账户：admin / admin123' as default_account;