# 数据库重构设计方案

## 1. 现有数据库结构分析

### 当前实体模型
- **User**: 用户表（学生、教师、管理员）
- **Class**: 班级表
- **Attendance**: 考勤表
- **Permission**: 权限表
- **Recitation**: 背诵记录表
- **Points**: 积分表
- **RandomCall**: 随机点名表
- **Homework**: 作业表

### 现有问题分析
1. **权限管理不够细粒度**：当前权限表结构简单，缺乏角色分级
2. **表关系不够规范**：部分外键约束缺失
3. **索引优化不足**：查询性能有待提升
4. **数据完整性约束不完善**：缺乏必要的约束条件

## 2. 优化后的数据库设计

### 2.1 用户权限体系重构

#### 角色表 (roles)
```sql
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
```

#### 权限表 (permissions)
```sql
CREATE TABLE permissions (
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
```

#### 角色权限关联表 (role_permissions)
```sql
CREATE TABLE role_permissions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  role_id INT NOT NULL,
  permission_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
  UNIQUE KEY uk_role_permission (role_id, permission_id)
);
```

### 2.2 用户表优化 (users)
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
  password VARCHAR(255) NOT NULL COMMENT '密码',
  name VARCHAR(100) NOT NULL COMMENT '真实姓名',
  email VARCHAR(100) UNIQUE COMMENT '邮箱',
  phone VARCHAR(20) COMMENT '手机号',
  avatar VARCHAR(255) COMMENT '头像URL',
  role_id INT NOT NULL COMMENT '角色ID',
  student_id VARCHAR(20) UNIQUE COMMENT '学号（学生专用）',
  teacher_id VARCHAR(20) UNIQUE COMMENT '工号（教师专用）',
  gender ENUM('male', 'female', 'other') COMMENT '性别',
  birth_date DATE COMMENT '出生日期',
  address TEXT COMMENT '地址',
  emergency_contact VARCHAR(100) COMMENT '紧急联系人',
  emergency_phone VARCHAR(20) COMMENT '紧急联系电话',
  status ENUM('active', 'inactive', 'suspended') DEFAULT 'active' COMMENT '状态',
  last_login_at TIMESTAMP NULL COMMENT '最后登录时间',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id),
  INDEX idx_username (username),
  INDEX idx_role_id (role_id),
  INDEX idx_student_id (student_id),
  INDEX idx_teacher_id (teacher_id),
  INDEX idx_status (status)
);
```

### 2.3 班级表优化 (classes)
```sql
CREATE TABLE classes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL COMMENT '班级名称',
  code VARCHAR(20) NOT NULL UNIQUE COMMENT '班级代码',
  grade VARCHAR(20) NOT NULL COMMENT '年级',
  teacher_id INT NOT NULL COMMENT '班主任ID',
  assistant_teacher_id INT COMMENT '副班主任ID',
  academic_year VARCHAR(20) NOT NULL COMMENT '学年',
  semester ENUM('spring', 'fall') NOT NULL COMMENT '学期',
  max_students INT DEFAULT 50 COMMENT '最大学生数',
  current_students INT DEFAULT 0 COMMENT '当前学生数',
  classroom VARCHAR(50) COMMENT '教室',
  description TEXT COMMENT '班级描述',
  status ENUM('active', 'inactive', 'archived') DEFAULT 'active' COMMENT '状态',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (teacher_id) REFERENCES users(id),
  FOREIGN KEY (assistant_teacher_id) REFERENCES users(id),
  INDEX idx_teacher_id (teacher_id),
  INDEX idx_grade (grade),
  INDEX idx_academic_year (academic_year),
  INDEX idx_status (status)
);
```

### 2.4 学生班级关联表 (class_students)
```sql
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
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uk_class_student_active (class_id, student_id, status),
  INDEX idx_class_id (class_id),
  INDEX idx_student_id (student_id),
  INDEX idx_status (status)
);
```

### 2.5 考勤表优化 (attendance)
```sql
CREATE TABLE attendance (
  id INT PRIMARY KEY AUTO_INCREMENT,
  class_id INT NOT NULL,
  student_id INT NOT NULL,
  teacher_id INT NOT NULL COMMENT '记录教师',
  date DATE NOT NULL COMMENT '考勤日期',
  period VARCHAR(20) COMMENT '时段（如：第1节课）',
  status ENUM('present', 'absent', 'late', 'early_leave', 'sick_leave', 'personal_leave') NOT NULL COMMENT '考勤状态',
  check_in_time TIME COMMENT '签到时间',
  check_out_time TIME COMMENT '签退时间',
  reason TEXT COMMENT '缺勤原因',
  notes TEXT COMMENT '备注',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES users(id),
  UNIQUE KEY uk_attendance_record (class_id, student_id, date, period),
  INDEX idx_date (date),
  INDEX idx_class_student (class_id, student_id),
  INDEX idx_status (status)
);
```

### 2.6 作业系统优化

#### 作业表 (assignments)
```sql
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
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES users(id),
  INDEX idx_class_id (class_id),
  INDEX idx_teacher_id (teacher_id),
  INDEX idx_due_date (due_date),
  INDEX idx_status (status)
);
```

#### 作业提交表 (assignment_submissions)
```sql
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
  FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (graded_by) REFERENCES users(id),
  UNIQUE KEY uk_assignment_student_version (assignment_id, student_id, version),
  INDEX idx_assignment_id (assignment_id),
  INDEX idx_student_id (student_id),
  INDEX idx_submission_time (submission_time),
  INDEX idx_status (status)
);
```

### 2.7 积分系统优化 (points)
```sql
CREATE TABLE points (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  class_id INT NOT NULL,
  teacher_id INT NOT NULL COMMENT '操作教师',
  points INT NOT NULL COMMENT '积分变化（正数加分，负数扣分）',
  reason VARCHAR(255) NOT NULL COMMENT '积分原因',
  category ENUM('attendance', 'homework', 'behavior', 'participation', 'achievement', 'other') NOT NULL COMMENT '积分类别',
  reference_type VARCHAR(50) COMMENT '关联类型（如：assignment, attendance）',
  reference_id INT COMMENT '关联ID',
  date DATE NOT NULL COMMENT '积分日期',
  notes TEXT COMMENT '备注',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES users(id),
  INDEX idx_student_class (student_id, class_id),
  INDEX idx_date (date),
  INDEX idx_category (category),
  INDEX idx_reference (reference_type, reference_id)
);
```

### 2.8 随机点名优化 (random_calls)
```sql
CREATE TABLE random_calls (
  id INT PRIMARY KEY AUTO_INCREMENT,
  class_id INT NOT NULL,
  teacher_id INT NOT NULL,
  call_type ENUM('random', 'targeted', 'group') DEFAULT 'random' COMMENT '点名类型',
  call_count INT DEFAULT 1 COMMENT '点名人数',
  selected_students JSON NOT NULL COMMENT '被选中学生信息',
  excluded_students JSON COMMENT '排除的学生ID',
  session_name VARCHAR(100) COMMENT '点名会话名称',
  notes TEXT COMMENT '备注',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES users(id),
  INDEX idx_class_teacher (class_id, teacher_id),
  INDEX idx_created_at (created_at)
);
```

### 2.9 背诵记录优化 (recitations)
```sql
CREATE TABLE recitations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  class_id INT NOT NULL,
  teacher_id INT NOT NULL COMMENT '检查教师',
  title VARCHAR(255) NOT NULL COMMENT '背诵内容标题',
  content TEXT COMMENT '背诵内容',
  category VARCHAR(50) COMMENT '类别（如：古诗词、课文等）',
  difficulty_level ENUM('easy', 'medium', 'hard') DEFAULT 'medium' COMMENT '难度等级',
  status ENUM('pending', 'passed', 'failed', 'partial') NOT NULL COMMENT '背诵状态',
  score DECIMAL(5,2) COMMENT '背诵得分',
  feedback TEXT COMMENT '教师评价',
  check_date DATE NOT NULL COMMENT '检查日期',
  retry_count INT DEFAULT 0 COMMENT '重试次数',
  max_retries INT DEFAULT 3 COMMENT '最大重试次数',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES users(id),
  INDEX idx_student_class (student_id, class_id),
  INDEX idx_check_date (check_date),
  INDEX idx_status (status),
  INDEX idx_category (category)
);
```

## 3. 数据迁移策略

### 3.1 迁移步骤
1. **备份现有数据**
2. **创建新表结构**
3. **数据迁移脚本**
4. **验证数据完整性**
5. **切换到新结构**
6. **清理旧表**

### 3.2 关键迁移点
- 用户角色数据迁移到新的角色权限体系
- 班级学生关系迁移到独立关联表
- 作业数据结构调整
- 权限数据重新组织

## 4. 性能优化

### 4.1 索引策略
- 主键索引：所有表的id字段
- 外键索引：所有外键字段
- 复合索引：常用查询组合字段
- 时间索引：日期时间字段

### 4.2 查询优化
- 避免全表扫描
- 合理使用JOIN
- 分页查询优化
- 缓存热点数据

## 5. 数据完整性约束

### 5.1 外键约束
- 所有关联表设置外键约束
- 级联删除策略
- 引用完整性保证

### 5.2 检查约束
- 枚举值约束
- 数值范围约束
- 日期逻辑约束

## 6. 安全性考虑

### 6.1 数据安全
- 敏感数据加密
- 密码哈希存储
- 数据访问日志

### 6.2 权限控制
- 细粒度权限管理
- 角色分级控制
- 操作审计跟踪