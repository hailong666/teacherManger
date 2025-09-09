-- 数据库重构回滚脚本
-- 用于在迁移失败时恢复到原始状态

-- ============================================
-- 1. 删除新创建的表
-- ============================================

-- 删除外键约束（避免删除表时的依赖问题）
SET FOREIGN_KEY_CHECKS = 0;

-- 删除新创建的表
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS class_students;
DROP TABLE IF EXISTS assignment_submissions;
DROP TABLE IF EXISTS homework_assignments;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS new_permissions;

-- ============================================
-- 2. 恢复原始表结构
-- ============================================

-- 恢复用户表结构
ALTER TABLE users DROP FOREIGN KEY IF EXISTS users_ibfk_1;
ALTER TABLE users DROP COLUMN IF EXISTS role_id;
ALTER TABLE users DROP COLUMN IF EXISTS student_id;
ALTER TABLE users DROP COLUMN IF EXISTS teacher_id;
ALTER TABLE users DROP COLUMN IF EXISTS email;
ALTER TABLE users DROP COLUMN IF EXISTS phone;
ALTER TABLE users DROP COLUMN IF EXISTS avatar;
ALTER TABLE users DROP COLUMN IF EXISTS gender;
ALTER TABLE users DROP COLUMN IF EXISTS birth_date;
ALTER TABLE users DROP COLUMN IF EXISTS address;
ALTER TABLE users DROP COLUMN IF EXISTS emergency_contact;
ALTER TABLE users DROP COLUMN IF EXISTS emergency_phone;
ALTER TABLE users DROP COLUMN IF EXISTS status;
ALTER TABLE users DROP COLUMN IF EXISTS last_login_at;

-- 恢复用户表的role字段
ALTER TABLE users ADD COLUMN role ENUM('admin', 'teacher', 'student') NOT NULL DEFAULT 'student' AFTER password;

-- 恢复班级表结构
ALTER TABLE classes DROP FOREIGN KEY IF EXISTS classes_ibfk_1;
ALTER TABLE classes DROP FOREIGN KEY IF EXISTS classes_ibfk_2;
ALTER TABLE classes DROP COLUMN IF EXISTS code;
ALTER TABLE classes DROP COLUMN IF EXISTS grade;
ALTER TABLE classes DROP COLUMN IF EXISTS assistant_teacher_id;
ALTER TABLE classes DROP COLUMN IF EXISTS academic_year;
ALTER TABLE classes DROP COLUMN IF EXISTS semester;
ALTER TABLE classes DROP COLUMN IF EXISTS max_students;
ALTER TABLE classes DROP COLUMN IF EXISTS current_students;
ALTER TABLE classes DROP COLUMN IF EXISTS classroom;
ALTER TABLE classes DROP COLUMN IF EXISTS description;
ALTER TABLE classes DROP COLUMN IF EXISTS status;

-- 恢复班级表的student_ids字段
ALTER TABLE classes ADD COLUMN student_ids TEXT COMMENT '学生ID列表，逗号分隔' AFTER teacher_id;

-- 恢复考勤表结构
ALTER TABLE attendance DROP FOREIGN KEY IF EXISTS attendance_ibfk_1;
ALTER TABLE attendance DROP FOREIGN KEY IF EXISTS attendance_ibfk_2;
ALTER TABLE attendance DROP FOREIGN KEY IF EXISTS attendance_ibfk_3;
ALTER TABLE attendance DROP COLUMN IF EXISTS teacher_id;
ALTER TABLE attendance DROP COLUMN IF EXISTS period;
ALTER TABLE attendance DROP COLUMN IF EXISTS check_in_time;
ALTER TABLE attendance DROP COLUMN IF EXISTS check_out_time;
ALTER TABLE attendance DROP COLUMN IF EXISTS reason;
ALTER TABLE attendance DROP COLUMN IF EXISTS notes;

-- 恢复考勤表的status字段类型
ALTER TABLE attendance MODIFY COLUMN status ENUM('present', 'absent', 'late') NOT NULL;

-- 恢复积分表结构
ALTER TABLE points DROP FOREIGN KEY IF EXISTS points_ibfk_1;
ALTER TABLE points DROP FOREIGN KEY IF EXISTS points_ibfk_2;
ALTER TABLE points DROP FOREIGN KEY IF EXISTS points_ibfk_3;
ALTER TABLE points DROP COLUMN IF EXISTS teacher_id;
ALTER TABLE points DROP COLUMN IF EXISTS category;
ALTER TABLE points DROP COLUMN IF EXISTS reference_type;
ALTER TABLE points DROP COLUMN IF EXISTS reference_id;
ALTER TABLE points DROP COLUMN IF EXISTS notes;

-- 恢复背诵表结构
ALTER TABLE recitation DROP FOREIGN KEY IF EXISTS recitation_ibfk_1;
ALTER TABLE recitation DROP FOREIGN KEY IF EXISTS recitation_ibfk_2;
ALTER TABLE recitation DROP FOREIGN KEY IF EXISTS recitation_ibfk_3;
ALTER TABLE recitation DROP COLUMN IF EXISTS teacher_id;
ALTER TABLE recitation DROP COLUMN IF EXISTS category;
ALTER TABLE recitation DROP COLUMN IF EXISTS difficulty_level;
ALTER TABLE recitation DROP COLUMN IF EXISTS score;
ALTER TABLE recitation DROP COLUMN IF EXISTS feedback;
ALTER TABLE recitation DROP COLUMN IF EXISTS check_date;
ALTER TABLE recitation DROP COLUMN IF EXISTS retry_count;
ALTER TABLE recitation DROP COLUMN IF EXISTS max_retries;

-- 恢复随机点名表结构
ALTER TABLE random_call DROP FOREIGN KEY IF EXISTS random_call_ibfk_1;
ALTER TABLE random_call DROP FOREIGN KEY IF EXISTS random_call_ibfk_2;
ALTER TABLE random_call DROP COLUMN IF EXISTS excluded_students;
ALTER TABLE random_call DROP COLUMN IF EXISTS session_name;
ALTER TABLE random_call DROP COLUMN IF EXISTS notes;

-- 恢复student_ids字段类型
ALTER TABLE random_call MODIFY COLUMN student_ids TEXT NOT NULL COMMENT 'JSON格式存储被点名学生ID列表';

-- 恢复student_names字段
ALTER TABLE random_call ADD COLUMN student_names TEXT NOT NULL COMMENT '被点名学生姓名，逗号分隔' AFTER student_ids;

-- ============================================
-- 3. 恢复原始数据
-- ============================================

-- 检查备份表是否存在
SET @backup_exists = 0;
SELECT COUNT(*) INTO @backup_exists FROM information_schema.tables 
WHERE table_schema = DATABASE() AND table_name = 'backup_users';

-- 如果备份表存在，恢复数据
IF @backup_exists > 0 THEN

  -- 清空现有数据
  TRUNCATE TABLE users;
  TRUNCATE TABLE classes;
  TRUNCATE TABLE attendance;
  TRUNCATE TABLE permissions;
  TRUNCATE TABLE recitation;
  TRUNCATE TABLE points;
  TRUNCATE TABLE random_call;
  TRUNCATE TABLE homework;

  -- 恢复用户数据
  INSERT INTO users SELECT * FROM backup_users;

  -- 恢复班级数据
  INSERT INTO classes SELECT * FROM backup_classes;

  -- 恢复考勤数据
  INSERT INTO attendance SELECT * FROM backup_attendance;

  -- 恢复权限数据
  INSERT INTO permissions SELECT * FROM backup_permissions;

  -- 恢复背诵数据
  INSERT INTO recitation SELECT * FROM backup_recitation;

  -- 恢复积分数据
  INSERT INTO points SELECT * FROM backup_points;

  -- 恢复随机点名数据
  INSERT INTO random_call SELECT * FROM backup_random_call;

  -- 恢复作业数据
  INSERT INTO homework SELECT * FROM backup_homework;

END IF;

-- ============================================
-- 4. 删除新增的索引
-- ============================================

-- 删除用户表索引
DROP INDEX IF EXISTS idx_users_role_id ON users;
DROP INDEX IF EXISTS idx_users_student_id ON users;
DROP INDEX IF EXISTS idx_users_teacher_id ON users;
DROP INDEX IF EXISTS idx_users_status ON users;

-- 删除班级表索引
DROP INDEX IF EXISTS idx_classes_teacher_id ON classes;
DROP INDEX IF EXISTS idx_classes_grade ON classes;
DROP INDEX IF EXISTS idx_classes_academic_year ON classes;
DROP INDEX IF EXISTS idx_classes_status ON classes;

-- 删除考勤表索引
DROP INDEX IF EXISTS idx_attendance_date ON attendance;
DROP INDEX IF EXISTS idx_attendance_class_student ON attendance;
DROP INDEX IF EXISTS idx_attendance_status ON attendance;
DROP INDEX IF EXISTS uk_attendance_record ON attendance;

-- 删除积分表索引
DROP INDEX IF EXISTS idx_points_student_class ON points;
DROP INDEX IF EXISTS idx_points_date ON points;
DROP INDEX IF EXISTS idx_points_category ON points;
DROP INDEX IF EXISTS idx_points_reference ON points;

-- 删除背诵表索引
DROP INDEX IF EXISTS idx_recitation_student_class ON recitation;
DROP INDEX IF EXISTS idx_recitation_check_date ON recitation;
DROP INDEX IF EXISTS idx_recitation_status ON recitation;
DROP INDEX IF EXISTS idx_recitation_category ON recitation;

-- 删除随机点名表索引
DROP INDEX IF EXISTS idx_random_call_class_teacher ON random_call;
DROP INDEX IF EXISTS idx_random_call_created_at ON random_call;

-- ============================================
-- 5. 清理备份表
-- ============================================

-- 删除备份表
DROP TABLE IF EXISTS backup_users;
DROP TABLE IF EXISTS backup_classes;
DROP TABLE IF EXISTS backup_attendance;
DROP TABLE IF EXISTS backup_permissions;
DROP TABLE IF EXISTS backup_recitation;
DROP TABLE IF EXISTS backup_points;
DROP TABLE IF EXISTS backup_random_call;
DROP TABLE IF EXISTS backup_homework;

-- 重新启用外键检查
SET FOREIGN_KEY_CHECKS = 1;

COMMIT;

-- ============================================
-- 6. 验证回滚结果
-- ============================================

-- 检查表结构是否恢复
SELECT 'Users table check' as check_type, 
       CASE WHEN COUNT(*) > 0 THEN 'OK' ELSE 'ERROR' END as status
FROM information_schema.columns 
WHERE table_schema = DATABASE() 
  AND table_name = 'users' 
  AND column_name = 'role';

SELECT 'Classes table check' as check_type,
       CASE WHEN COUNT(*) > 0 THEN 'OK' ELSE 'ERROR' END as status
FROM information_schema.columns 
WHERE table_schema = DATABASE() 
  AND table_name = 'classes' 
  AND column_name = 'student_ids';

SELECT 'Random call table check' as check_type,
       CASE WHEN COUNT(*) > 0 THEN 'OK' ELSE 'ERROR' END as status
FROM information_schema.columns 
WHERE table_schema = DATABASE() 
  AND table_name = 'random_call' 
  AND column_name = 'student_names';

-- 检查数据是否恢复
SELECT 'Data recovery check' as check_type, 
       CONCAT('Users: ', COUNT(*)) as status 
FROM users;

SELECT '数据库回滚完成' as status;

-- ============================================
-- 使用说明
-- ============================================

/*
回滚脚本使用说明：

1. 在执行迁移脚本之前，请确保已经创建了备份表
2. 如果迁移过程中出现问题，立即停止迁移并执行此回滚脚本
3. 回滚脚本会：
   - 删除所有新创建的表和字段
   - 恢复原始表结构
   - 从备份表中恢复原始数据
   - 删除新增的索引
   - 清理备份表

4. 执行回滚后，请验证：
   - 所有表结构是否恢复到原始状态
   - 数据是否完整恢复
   - 应用程序是否能正常运行

5. 如果回滚成功，可以重新分析迁移问题并修复后再次尝试迁移

注意事项：
- 回滚操作不可逆，请谨慎执行
- 确保在执行回滚前停止所有应用程序对数据库的访问
- 建议在测试环境中先验证回滚脚本的正确性
*/