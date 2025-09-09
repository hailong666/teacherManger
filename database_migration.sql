-- 数据库重构迁移脚本
-- 执行前请务必备份现有数据库

-- ============================================
-- 1. 备份现有数据
-- ============================================

-- 创建备份表
CREATE TABLE backup_users AS SELECT * FROM users;
CREATE TABLE backup_classes AS SELECT * FROM classes;
CREATE TABLE backup_attendance AS SELECT * FROM attendance;
CREATE TABLE backup_permissions AS SELECT * FROM permissions;
CREATE TABLE backup_recitation AS SELECT * FROM recitation;
CREATE TABLE backup_points AS SELECT * FROM points;
CREATE TABLE backup_random_call AS SELECT * FROM random_call;
CREATE TABLE backup_homework AS SELECT * FROM homework;

-- ============================================
-- 2. 创建新的表结构
-- ============================================

-- 角色表
CREATE TABLE roles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL UNIQUE COMMENT '角色名称',
  display_name VARCHAR(100) NOT NULL COMMENT '显示名称',
  description TEXT COMMENT '角色描述',
  level INT NOT NULL DEFAULT 0 COMMENT '角色级别，数字越大权限越高',
  is_active BOOLEAN DEFAULT TRUE COMMENT '是否启用',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name),
  INDEX idx_level (level)
);

-- 新权限表
CREATE TABLE new_permissions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL UNIQUE COMMENT '权限标识',
  display_name VARCHAR(100) NOT NULL COMMENT '权限显示名称',
  description TEXT COMMENT '权限描述',
  module VARCHAR(50) NOT NULL COMMENT '所属模块',
  action VARCHAR(50) NOT NULL COMMENT '操作类型',
  resource VARCHAR(50) COMMENT '资源类型',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_module (module),
  INDEX idx_name (name)
);

-- 角色权限关联表
CREATE TABLE role_permissions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  role_id INT NOT NULL,
  permission_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES new_permissions(id) ON DELETE CASCADE,
  UNIQUE KEY uk_role_permission (role_id, permission_id)
);

-- 学生班级关联表
CREATE TABLE class_students (
  id INT PRIMARY KEY AUTO_INCREMENT,
  class_id INT NOT NULL,
  student_id INT NOT NULL,
  join_date DATE NOT NULL COMMENT '加入日期',
  leave_date DATE COMMENT '离开日期',
  status ENUM('active', 'transferred', 'graduated', 'dropped') DEFAULT 'active' COMMENT '状态',
  seat_number VARCHAR(10) COMMENT '座位号',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_class_id (class_id),
  INDEX idx_student_id (student_id),
  INDEX idx_status (status)
);

-- 作业表
CREATE TABLE assignments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL COMMENT '作业标题',
  description TEXT COMMENT '作业描述',
  class_id INT NOT NULL,
  teacher_id INT NOT NULL COMMENT '发布教师',
  subject VARCHAR(50) COMMENT '科目',
  assignment_type ENUM('homework', 'project', 'quiz', 'exam') DEFAULT 'homework' COMMENT '作业类型',
  due_date DATETIME NOT NULL COMMENT '截止时间',
  max_score INT DEFAULT 100 COMMENT '满分',
  allow_late_submission BOOLEAN DEFAULT FALSE COMMENT '是否允许迟交',
  late_penalty_rate DECIMAL(3,2) DEFAULT 0.00 COMMENT '迟交扣分比例',
  instructions TEXT COMMENT '作业说明',
  attachments JSON COMMENT '附件信息',
  status ENUM('draft', 'published', 'closed', 'archived') DEFAULT 'draft' COMMENT '状态',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_class_id (class_id),
  INDEX idx_teacher_id (teacher_id),
  INDEX idx_due_date (due_date),
  INDEX idx_status (status)
);

-- 作业提交表
CREATE TABLE assignment_submissions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  assignment_id INT NOT NULL,
  student_id INT NOT NULL,
  content TEXT COMMENT '提交内容',
  file_path VARCHAR(500) COMMENT '文件路径',
  file_name VARCHAR(255) COMMENT '原文件名',
  file_size BIGINT COMMENT '文件大小',
  mime_type VARCHAR(100) COMMENT '文件类型',
  submission_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '提交时间',
  is_late BOOLEAN DEFAULT FALSE COMMENT '是否迟交',
  score DECIMAL(5,2) COMMENT '得分',
  feedback TEXT COMMENT '教师反馈',
  graded_by INT COMMENT '批改教师',
  graded_at TIMESTAMP NULL COMMENT '批改时间',
  status ENUM('submitted', 'graded', 'returned', 'resubmitted') DEFAULT 'submitted' COMMENT '状态',
  version INT DEFAULT 1 COMMENT '提交版本',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_assignment_student_version (assignment_id, student_id, version),
  INDEX idx_assignment_id (assignment_id),
  INDEX idx_student_id (student_id),
  INDEX idx_submission_time (submission_time),
  INDEX idx_status (status)
);

-- ============================================
-- 3. 初始化基础数据
-- ============================================

-- 插入默认角色
INSERT INTO roles (name, display_name, description, level) VALUES
('admin', '系统管理员', '拥有系统最高权限', 100),
('teacher', '教师', '班级管理和教学权限', 50),
('student', '学生', '基本学习权限', 10);

-- 插入基础权限
INSERT INTO new_permissions (name, display_name, description, module, action, resource) VALUES
-- 用户管理权限
('user.view', '查看用户', '查看用户信息', 'user', 'view', 'user'),
('user.create', '创建用户', '创建新用户', 'user', 'create', 'user'),
('user.edit', '编辑用户', '编辑用户信息', 'user', 'edit', 'user'),
('user.delete', '删除用户', '删除用户', 'user', 'delete', 'user'),

-- 班级管理权限
('class.view', '查看班级', '查看班级信息', 'class', 'view', 'class'),
('class.create', '创建班级', '创建新班级', 'class', 'create', 'class'),
('class.edit', '编辑班级', '编辑班级信息', 'class', 'edit', 'class'),
('class.delete', '删除班级', '删除班级', 'class', 'delete', 'class'),
('class.manage_students', '管理学生', '管理班级学生', 'class', 'manage', 'student'),

-- 考勤管理权限
('attendance.view', '查看考勤', '查看考勤记录', 'attendance', 'view', 'attendance'),
('attendance.create', '记录考勤', '创建考勤记录', 'attendance', 'create', 'attendance'),
('attendance.edit', '编辑考勤', '编辑考勤记录', 'attendance', 'edit', 'attendance'),
('attendance.delete', '删除考勤', '删除考勤记录', 'attendance', 'delete', 'attendance'),

-- 作业管理权限
('assignment.view', '查看作业', '查看作业信息', 'assignment', 'view', 'assignment'),
('assignment.create', '发布作业', '创建新作业', 'assignment', 'create', 'assignment'),
('assignment.edit', '编辑作业', '编辑作业信息', 'assignment', 'edit', 'assignment'),
('assignment.delete', '删除作业', '删除作业', 'assignment', 'delete', 'assignment'),
('assignment.grade', '批改作业', '批改学生作业', 'assignment', 'grade', 'assignment'),

-- 积分管理权限
('points.view', '查看积分', '查看积分记录', 'points', 'view', 'points'),
('points.manage', '管理积分', '管理学生积分', 'points', 'manage', 'points'),

-- 随机点名权限
('random_call.use', '随机点名', '使用随机点名功能', 'random_call', 'use', 'random_call'),
('random_call.view_history', '查看点名历史', '查看点名历史记录', 'random_call', 'view', 'random_call'),

-- 背诵管理权限
('recitation.view', '查看背诵', '查看背诵记录', 'recitation', 'view', 'recitation'),
('recitation.check', '检查背诵', '检查学生背诵', 'recitation', 'check', 'recitation'),

-- 系统管理权限
('system.manage', '系统管理', '系统配置管理', 'system', 'manage', 'system'),
('role.manage', '角色管理', '管理用户角色', 'role', 'manage', 'role'),
('permission.manage', '权限管理', '管理系统权限', 'permission', 'manage', 'permission');

-- 分配角色权限
-- 管理员权限（所有权限）
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, new_permissions p WHERE r.name = 'admin';

-- 教师权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, new_permissions p 
WHERE r.name = 'teacher' AND p.name IN (
  'user.view', 'class.view', 'class.manage_students',
  'attendance.view', 'attendance.create', 'attendance.edit',
  'assignment.view', 'assignment.create', 'assignment.edit', 'assignment.delete', 'assignment.grade',
  'points.view', 'points.manage',
  'random_call.use', 'random_call.view_history',
  'recitation.view', 'recitation.check'
);

-- 学生权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, new_permissions p 
WHERE r.name = 'student' AND p.name IN (
  'attendance.view', 'assignment.view', 'points.view', 'recitation.view'
);

-- ============================================
-- 4. 修改现有表结构
-- ============================================

-- 修改用户表
ALTER TABLE users ADD COLUMN role_id INT AFTER password;
ALTER TABLE users ADD COLUMN student_id VARCHAR(20) UNIQUE AFTER role_id;
ALTER TABLE users ADD COLUMN teacher_id VARCHAR(20) UNIQUE AFTER student_id;
ALTER TABLE users ADD COLUMN email VARCHAR(100) UNIQUE AFTER name;
ALTER TABLE users ADD COLUMN phone VARCHAR(20) AFTER email;
ALTER TABLE users ADD COLUMN avatar VARCHAR(255) AFTER phone;
ALTER TABLE users ADD COLUMN gender ENUM('male', 'female', 'other') AFTER avatar;
ALTER TABLE users ADD COLUMN birth_date DATE AFTER gender;
ALTER TABLE users ADD COLUMN address TEXT AFTER birth_date;
ALTER TABLE users ADD COLUMN emergency_contact VARCHAR(100) AFTER address;
ALTER TABLE users ADD COLUMN emergency_phone VARCHAR(20) AFTER emergency_contact;
ALTER TABLE users ADD COLUMN status ENUM('active', 'inactive', 'suspended') DEFAULT 'active' AFTER emergency_phone;
ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP NULL AFTER status;

-- 修改班级表
ALTER TABLE classes ADD COLUMN code VARCHAR(20) NOT NULL UNIQUE AFTER name;
ALTER TABLE classes ADD COLUMN grade VARCHAR(20) NOT NULL AFTER code;
ALTER TABLE classes ADD COLUMN assistant_teacher_id INT AFTER teacher_id;
ALTER TABLE classes ADD COLUMN academic_year VARCHAR(20) NOT NULL AFTER assistant_teacher_id;
ALTER TABLE classes ADD COLUMN semester ENUM('spring', 'fall') NOT NULL AFTER academic_year;
ALTER TABLE classes ADD COLUMN max_students INT DEFAULT 50 AFTER semester;
ALTER TABLE classes ADD COLUMN current_students INT DEFAULT 0 AFTER max_students;
ALTER TABLE classes ADD COLUMN classroom VARCHAR(50) AFTER current_students;
ALTER TABLE classes ADD COLUMN description TEXT AFTER classroom;
ALTER TABLE classes ADD COLUMN status ENUM('active', 'inactive', 'archived') DEFAULT 'active' AFTER description;

-- 修改考勤表
ALTER TABLE attendance ADD COLUMN teacher_id INT NOT NULL AFTER student_id;
ALTER TABLE attendance ADD COLUMN period VARCHAR(20) AFTER date;
ALTER TABLE attendance MODIFY COLUMN status ENUM('present', 'absent', 'late', 'early_leave', 'sick_leave', 'personal_leave') NOT NULL;
ALTER TABLE attendance ADD COLUMN check_in_time TIME AFTER status;
ALTER TABLE attendance ADD COLUMN check_out_time TIME AFTER check_in_time;
ALTER TABLE attendance ADD COLUMN reason TEXT AFTER check_out_time;
ALTER TABLE attendance ADD COLUMN notes TEXT AFTER reason;

-- 修改积分表
ALTER TABLE points ADD COLUMN teacher_id INT NOT NULL AFTER class_id;
ALTER TABLE points ADD COLUMN category ENUM('attendance', 'homework', 'behavior', 'participation', 'achievement', 'other') NOT NULL AFTER reason;
ALTER TABLE points ADD COLUMN reference_type VARCHAR(50) AFTER category;
ALTER TABLE points ADD COLUMN reference_id INT AFTER reference_type;
ALTER TABLE points ADD COLUMN notes TEXT AFTER reference_id;

-- 修改背诵表
ALTER TABLE recitation ADD COLUMN teacher_id INT NOT NULL AFTER class_id;
ALTER TABLE recitation ADD COLUMN category VARCHAR(50) AFTER content;
ALTER TABLE recitation ADD COLUMN difficulty_level ENUM('easy', 'medium', 'hard') DEFAULT 'medium' AFTER category;
ALTER TABLE recitation ADD COLUMN score DECIMAL(5,2) AFTER status;
ALTER TABLE recitation ADD COLUMN feedback TEXT AFTER score;
ALTER TABLE recitation ADD COLUMN check_date DATE NOT NULL AFTER feedback;
ALTER TABLE recitation ADD COLUMN retry_count INT DEFAULT 0 AFTER check_date;
ALTER TABLE recitation ADD COLUMN max_retries INT DEFAULT 3 AFTER retry_count;

-- 修改随机点名表
ALTER TABLE random_call MODIFY COLUMN student_ids JSON NOT NULL COMMENT '被选中学生信息';
ALTER TABLE random_call ADD COLUMN excluded_students JSON AFTER student_ids;
ALTER TABLE random_call ADD COLUMN session_name VARCHAR(100) AFTER excluded_students;
ALTER TABLE random_call ADD COLUMN notes TEXT AFTER session_name;
DROP COLUMN student_names;

-- ============================================
-- 5. 数据迁移
-- ============================================

-- 迁移用户角色数据
UPDATE users u 
SET role_id = (
  SELECT r.id FROM roles r 
  WHERE r.name = u.role
);

-- 生成学号和工号
UPDATE users SET student_id = CONCAT('S', LPAD(id, 6, '0')) WHERE role = 'student';
UPDATE users SET teacher_id = CONCAT('T', LPAD(id, 6, '0')) WHERE role = 'teacher';

-- 设置用户状态
UPDATE users SET status = 'active';

-- 生成班级代码
UPDATE classes SET code = CONCAT('C', LPAD(id, 4, '0'));
UPDATE classes SET grade = '高一', academic_year = '2024', semester = 'spring';
UPDATE classes SET status = 'active';

-- 迁移班级学生关系
INSERT INTO class_students (class_id, student_id, join_date, status)
SELECT 
  c.id as class_id,
  u.id as student_id,
  CURDATE() as join_date,
  'active' as status
FROM classes c
JOIN users u ON FIND_IN_SET(u.id, c.student_ids) > 0
WHERE u.role = 'student';

-- 更新班级当前学生数
UPDATE classes c SET current_students = (
  SELECT COUNT(*) FROM class_students cs 
  WHERE cs.class_id = c.id AND cs.status = 'active'
);

-- 迁移作业数据
INSERT INTO assignments (id, title, description, class_id, teacher_id, due_date, max_score, status, created_at, updated_at)
SELECT 
  id,
  title,
  description,
  class_id,
  (SELECT teacher_id FROM classes WHERE id = homework.class_id) as teacher_id,
  IFNULL(create_time + INTERVAL 7 DAY, NOW() + INTERVAL 7 DAY) as due_date,
  100 as max_score,
  CASE 
    WHEN status = '已批改' THEN 'closed'
    WHEN status = '待批改' THEN 'published'
    ELSE 'draft'
  END as status,
  create_time,
  update_time
FROM homework
WHERE student_id IS NULL; -- 只迁移作业模板，不迁移提交记录

-- 迁移作业提交数据
INSERT INTO assignment_submissions (assignment_id, student_id, file_path, file_name, file_size, mime_type, submission_time, score, feedback, status, created_at, updated_at)
SELECT 
  h.id as assignment_id,
  h.student_id,
  h.file_path,
  SUBSTRING_INDEX(h.file_path, '/', -1) as file_name,
  h.size,
  h.mime_type,
  h.submit_time,
  h.score,
  h.comment as feedback,
  CASE 
    WHEN h.status = '已批改' THEN 'graded'
    WHEN h.status = '待批改' THEN 'submitted'
    ELSE 'submitted'
  END as status,
  h.create_time,
  h.update_time
FROM homework h
WHERE h.student_id IS NOT NULL; -- 只迁移学生提交记录

-- ============================================
-- 6. 添加外键约束
-- ============================================

-- 用户表外键
ALTER TABLE users ADD FOREIGN KEY (role_id) REFERENCES roles(id);

-- 班级表外键
ALTER TABLE classes ADD FOREIGN KEY (teacher_id) REFERENCES users(id);
ALTER TABLE classes ADD FOREIGN KEY (assistant_teacher_id) REFERENCES users(id);

-- 班级学生关联表外键
ALTER TABLE class_students ADD FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;
ALTER TABLE class_students ADD FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;

-- 考勤表外键
ALTER TABLE attendance ADD FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;
ALTER TABLE attendance ADD FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE attendance ADD FOREIGN KEY (teacher_id) REFERENCES users(id);

-- 作业表外键
ALTER TABLE assignments ADD FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;
ALTER TABLE assignments ADD FOREIGN KEY (teacher_id) REFERENCES users(id);

-- 作业提交表外键
ALTER TABLE assignment_submissions ADD FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE;
ALTER TABLE assignment_submissions ADD FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE assignment_submissions ADD FOREIGN KEY (graded_by) REFERENCES users(id);

-- 积分表外键
ALTER TABLE points ADD FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE points ADD FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;
ALTER TABLE points ADD FOREIGN KEY (teacher_id) REFERENCES users(id);

-- 背诵表外键
ALTER TABLE recitation ADD FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE recitation ADD FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;
ALTER TABLE recitation ADD FOREIGN KEY (teacher_id) REFERENCES users(id);

-- 随机点名表外键
ALTER TABLE random_call ADD FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;
ALTER TABLE random_call ADD FOREIGN KEY (teacher_id) REFERENCES users(id);

-- ============================================
-- 7. 添加索引
-- ============================================

-- 用户表索引
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_student_id ON users(student_id);
CREATE INDEX idx_users_teacher_id ON users(teacher_id);
CREATE INDEX idx_users_status ON users(status);

-- 班级表索引
CREATE INDEX idx_classes_teacher_id ON classes(teacher_id);
CREATE INDEX idx_classes_grade ON classes(grade);
CREATE INDEX idx_classes_academic_year ON classes(academic_year);
CREATE INDEX idx_classes_status ON classes(status);

-- 考勤表索引
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_attendance_class_student ON attendance(class_id, student_id);
CREATE INDEX idx_attendance_status ON attendance(status);
CREATE UNIQUE INDEX uk_attendance_record ON attendance(class_id, student_id, date, period);

-- 积分表索引
CREATE INDEX idx_points_student_class ON points(student_id, class_id);
CREATE INDEX idx_points_date ON points(date);
CREATE INDEX idx_points_category ON points(category);
CREATE INDEX idx_points_reference ON points(reference_type, reference_id);

-- 背诵表索引
CREATE INDEX idx_recitation_student_class ON recitation(student_id, class_id);
CREATE INDEX idx_recitation_check_date ON recitation(check_date);
CREATE INDEX idx_recitation_status ON recitation(status);
CREATE INDEX idx_recitation_category ON recitation(category);

-- 随机点名表索引
CREATE INDEX idx_random_call_class_teacher ON random_call(class_id, teacher_id);
CREATE INDEX idx_random_call_created_at ON random_call(created_at);

-- ============================================
-- 8. 清理工作
-- ============================================

-- 删除用户表中的旧role字段
ALTER TABLE users DROP COLUMN role;

-- 删除班级表中的student_ids字段
ALTER TABLE classes DROP COLUMN student_ids;

-- 重命名权限表
DROP TABLE permissions;
RENAME TABLE new_permissions TO permissions;

-- 删除旧的作业表
DROP TABLE homework;
RENAME TABLE assignments TO homework_assignments;
RENAME TABLE assignment_submissions TO homework_submissions;

COMMIT;

-- ============================================
-- 验证数据完整性
-- ============================================

-- 检查用户数据
SELECT 'Users check' as check_type, COUNT(*) as count FROM users WHERE role_id IS NOT NULL;

-- 检查班级数据
SELECT 'Classes check' as check_type, COUNT(*) as count FROM classes WHERE teacher_id IS NOT NULL;

-- 检查班级学生关系
SELECT 'Class students check' as check_type, COUNT(*) as count FROM class_students;

-- 检查角色权限
SELECT 'Role permissions check' as check_type, COUNT(*) as count FROM role_permissions;

SELECT '数据库重构完成' as status;