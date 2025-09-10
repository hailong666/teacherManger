const mysql = require('mysql2/promise');
const { formatDateTime } = require('../utils/helpers');
require('dotenv').config();

// 数据库连接配置
const dbConfig = {
  host: '123.249.87.129',
  user: 'teacher_admin',
  password: 'jxj13140123',
  database: 'teacher_manager'
};

// 获取数据库连接
const getConnection = async () => {
  return await mysql.createConnection(dbConfig);
};

/**
 * 创建班级
 */
exports.createClass = async (req, res) => {
  let connection;
  try {
    const { name, description, teacherId, grade, semester, maxStudents, academicYear } = req.body;
    const currentUserId = req.user.id;
    const currentUserRole = req.user.role;
    
    connection = await getConnection();

    // 验证教师是否存在
    let finalTeacherId;
    if (teacherId) {
      const [teacherRows] = await connection.execute(
        'SELECT id FROM users WHERE id = ? AND role_id = (SELECT id FROM roles WHERE name = "teacher")',
        [teacherId]
      );
      
      if (teacherRows.length === 0) {
        return res.status(404).json({ message: '指定的教师不存在' });
      }
      finalTeacherId = teacherId;
    } else if (currentUserRole === 'teacher') {
      // 如果未指定教师且当前用户是教师，则将当前用户设为教师
      finalTeacherId = currentUserId;
    } else {
      return res.status(400).json({ message: '必须指定班级教师' });
    }

    // 检查班级名称是否已存在
    const [existingRows] = await connection.execute(
      'SELECT id FROM classes WHERE name = ?',
      [name]
    );

    if (existingRows.length > 0) {
      return res.status(400).json({ message: '班级名称已存在' });
    }

    // 创建班级
    const [result] = await connection.execute(
      'INSERT INTO classes (name, description, teacher_id, grade, semester, max_students, academic_year, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
      [name, description || null, finalTeacherId, grade || null, semester || null, maxStudents || 50, academicYear || new Date().getFullYear() + '-' + (new Date().getFullYear() + 1), 'active']
    );

    const classId = result.insertId;

    return res.status(201).json({
      message: '班级创建成功',
      class: {
        id: classId,
        name,
        description,
        teacherId: finalTeacherId,
        grade,
        semester,
        maxStudents: maxStudents || 50,
        academicYear: academicYear || new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
        createdAt: formatDateTime(new Date())
      }
    });
  } catch (error) {
    console.error('创建班级失败:', error);
    return res.status(500).json({ message: '服务器错误，创建班级失败' });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

/**
 * 获取班级列表
 */
exports.getClasses = async (req, res) => {
  let connection;
  try {
    const { page = 1, limit = 10, search } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    connection = await getConnection();
    
    let whereClause = '1=1';
    let params = [];
    
    // 根据用户角色过滤班级
    if (userRole === 'teacher') {
      whereClause += ` AND c.teacher_id = ${userId}`;
    } else if (userRole === 'student') {
      whereClause += ` AND c.id IN (SELECT class_id FROM class_students WHERE student_id = ${userId})`;
    }
    
    // 搜索条件
    if (search) {
      const searchTerm = search.replace(/'/g, "''"); // 转义单引号
      whereClause += ` AND (c.name LIKE '%${searchTerm}%' OR c.description LIKE '%${searchTerm}%' OR u.name LIKE '%${searchTerm}%')`;
    }
    
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const offset = (pageNum - 1) * limitNum;
    
    // 查询总数
    const [countRows] = await connection.query(
      `SELECT COUNT(*) as total 
       FROM classes c 
       LEFT JOIN users u ON c.teacher_id = u.id 
       WHERE ${whereClause}`
    );
    const total = countRows[0].total;

    // 查询班级列表
    const [classRows] = await connection.query(
      `SELECT c.*, u.name as teacher_name, u.username as teacher_username,
              (SELECT COUNT(*) FROM class_students cs WHERE cs.class_id = c.id) as student_count
       FROM classes c 
       LEFT JOIN users u ON c.teacher_id = u.id 
       WHERE ${whereClause} 
       ORDER BY c.created_at DESC 
       LIMIT ${limitNum} OFFSET ${offset}`
    );

    // 格式化返回数据
    const formattedClasses = classRows.map(cls => ({
      id: cls.id,
      name: cls.name,
      description: cls.description,
      teacherId: cls.teacher_id,
      teacherName: cls.teacher_name,
      teacherUsername: cls.teacher_username,
      grade: cls.grade,
      semester: cls.semester,
      maxStudents: cls.max_students,
      currentStudents: cls.student_count,
      academicYear: cls.academic_year,
      status: cls.status,
      createdAt: formatDateTime(cls.created_at),
      updatedAt: formatDateTime(cls.updated_at)
    }));

    return res.status(200).json({
      classes: formattedClasses,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('获取班级列表失败:', error);
    return res.status(500).json({
      message: '获取班级列表失败，请稍后重试'
    });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

/**
 * 获取班级详情
 */
exports.getClassById = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    connection = await getConnection();

    // 查询班级详情
    const [classRows] = await connection.execute(
      `SELECT c.*, u.name as teacher_name, u.username as teacher_username, u.email as teacher_email
       FROM classes c 
       LEFT JOIN users u ON c.teacher_id = u.id 
       WHERE c.id = ?`,
      [id]
    );

    if (classRows.length === 0) {
      return res.status(404).json({ message: '班级不存在' });
    }

    const classData = classRows[0];

    // 权限检查
    if (userRole === 'teacher' && classData.teacher_id !== userId) {
      return res.status(403).json({ message: '您不是该班级的教师，无权查看详情' });
    } else if (userRole === 'student') {
      // 检查学生是否在班级中
      const [studentRows] = await connection.execute(
        'SELECT 1 FROM class_students WHERE class_id = ? AND student_id = ?',
        [id, userId]
      );

      if (studentRows.length === 0) {
        return res.status(403).json({ message: '您不是该班级的学生，无权查看详情' });
      }
    }

    // 查询班级学生列表
    const [studentRows] = await connection.execute(
      `SELECT u.id, u.name, u.username, u.email, u.student_id, cs.join_date
       FROM users u 
       INNER JOIN class_students cs ON u.id = cs.student_id 
       WHERE cs.class_id = ? 
       ORDER BY u.name`,
      [id]
    );

    // 格式化返回数据
    const classDetail = {
      id: classData.id,
      name: classData.name,
      description: classData.description,
      grade: classData.grade,
      semester: classData.semester,
      maxStudents: classData.max_students,
      currentStudents: studentRows.length,
      academicYear: classData.academic_year,
      status: classData.status,
      teacher: {
        id: classData.teacher_id,
        name: classData.teacher_name,
        username: classData.teacher_username,
        email: classData.teacher_email
      },
      students: studentRows.map(student => ({
        id: student.id,
        name: student.name,
        username: student.username,
        email: student.email,
        studentId: student.student_id,
        joinDate: formatDateTime(student.join_date)
      })),
      createdAt: formatDateTime(classData.created_at),
      updatedAt: formatDateTime(classData.updated_at)
    };

    return res.status(200).json({ class: classDetail });
  } catch (error) {
    console.error('获取班级详情失败:', error);
    return res.status(500).json({ message: '服务器错误，获取班级详情失败' });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

/**
 * 更新班级信息
 */
exports.updateClass = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const { name, description, teacherId, grade, semester, maxStudents, academicYear, status } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    connection = await getConnection();

    // 查询班级
    const [classRows] = await connection.execute(
      'SELECT * FROM classes WHERE id = ?',
      [id]
    );

    if (classRows.length === 0) {
      return res.status(404).json({ message: '班级不存在' });
    }

    const classData = classRows[0];

    // 权限检查
    if (userRole === 'teacher' && classData.teacher_id !== userId) {
      return res.status(403).json({ message: '您不是该班级的教师，无权更新信息' });
    }

    // 构建更新数据
    const updateFields = [];
    const updateParams = [];

    if (name !== undefined) {
      // 检查新名称是否已存在（排除当前班级）
      const [existingRows] = await connection.execute(
        'SELECT id FROM classes WHERE name = ? AND id != ?',
        [name, id]
      );

      if (existingRows.length > 0) {
        return res.status(400).json({ message: '班级名称已存在' });
      }

      updateFields.push('name = ?');
      updateParams.push(name);
    }

    if (description !== undefined) {
      updateFields.push('description = ?');
      updateParams.push(description);
    }

    if (grade !== undefined) {
      updateFields.push('grade = ?');
      updateParams.push(grade);
    }

    if (semester !== undefined) {
      updateFields.push('semester = ?');
      updateParams.push(semester);
    }

    if (maxStudents !== undefined) {
      updateFields.push('max_students = ?');
      updateParams.push(maxStudents);
    }

    if (academicYear !== undefined) {
      updateFields.push('academic_year = ?');
      updateParams.push(academicYear);
    }

    if (status !== undefined) {
      updateFields.push('status = ?');
      updateParams.push(status);
    }

    // 更新教师（仅管理员可以更改班级教师）
    if (teacherId && userRole === 'admin') {
      const [teacherRows] = await connection.execute(
        'SELECT id FROM users WHERE id = ? AND role_id = (SELECT id FROM roles WHERE name = "teacher")',
        [teacherId]
      );

      if (teacherRows.length === 0) {
        return res.status(404).json({ message: '指定的教师不存在' });
      }

      updateFields.push('teacher_id = ?');
      updateParams.push(teacherId);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: '没有提供要更新的字段' });
    }

    // 添加更新时间
    updateFields.push('updated_at = NOW()');
    updateParams.push(id);

    // 执行更新
    await connection.execute(
      `UPDATE classes SET ${updateFields.join(', ')} WHERE id = ?`,
      updateParams
    );

    // 获取更新后的班级信息
    const [updatedRows] = await connection.execute(
      `SELECT c.*, u.name as teacher_name 
       FROM classes c 
       LEFT JOIN users u ON c.teacher_id = u.id 
       WHERE c.id = ?`,
      [id]
    );

    const updatedClass = updatedRows[0];

    return res.status(200).json({
      message: '班级信息更新成功',
      class: {
        id: updatedClass.id,
        name: updatedClass.name,
        description: updatedClass.description,
        teacherId: updatedClass.teacher_id,
        teacherName: updatedClass.teacher_name,
        grade: updatedClass.grade,
        semester: updatedClass.semester,
        maxStudents: updatedClass.max_students,
        academicYear: updatedClass.academic_year,
        status: updatedClass.status,
        updatedAt: formatDateTime(updatedClass.updated_at)
      }
    });
  } catch (error) {
    console.error('更新班级信息失败:', error);
    return res.status(500).json({ message: '服务器错误，更新班级信息失败' });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

/**
 * 添加学生到班级
 */
exports.addStudentsToClass = async (req, res) => {
  let connection;
  try {
    const { classId } = req.params;
    const { studentIds } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    connection = await getConnection();

    // 验证班级是否存在
    const [classRows] = await connection.execute(
      'SELECT * FROM classes WHERE id = ?',
      [classId]
    );

    if (classRows.length === 0) {
      return res.status(404).json({ message: '班级不存在' });
    }

    const classData = classRows[0];

    // 权限检查
    if (userRole === 'teacher' && classData.teacher_id !== userId) {
      return res.status(403).json({ message: '您不是该班级的教师，无权添加学生' });
    }

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ message: '请提供有效的学生ID列表' });
    }

    // 验证学生是否存在
    const placeholders = studentIds.map(() => '?').join(',');
    const [studentRows] = await connection.execute(
      `SELECT id, name FROM users WHERE id IN (${placeholders}) AND role_id = (SELECT id FROM roles WHERE name = "student")`,
      studentIds
    );

    if (studentRows.length === 0) {
      return res.status(404).json({ message: '没有找到有效的学生' });
    }

    // 检查哪些学生已经在班级中
    const [existingRows] = await connection.execute(
      `SELECT student_id FROM class_students WHERE class_id = ? AND student_id IN (${placeholders})`,
      [classId, ...studentIds]
    );

    const existingStudentIds = existingRows.map(row => row.student_id);
    const newStudentIds = studentRows
      .map(student => student.id)
      .filter(id => !existingStudentIds.includes(id));

    if (newStudentIds.length === 0) {
      return res.status(400).json({ message: '所有学生都已在班级中' });
    }

    // 检查班级容量
    const [currentCountRows] = await connection.execute(
      'SELECT COUNT(*) as count FROM class_students WHERE class_id = ?',
      [classId]
    );

    const currentCount = currentCountRows[0].count;
    const maxStudents = classData.max_students || 50;

    if (currentCount + newStudentIds.length > maxStudents) {
      return res.status(400).json({ 
        message: `班级容量不足，当前${currentCount}人，最大容量${maxStudents}人，无法添加${newStudentIds.length}名学生` 
      });
    }

    // 添加学生到班级
    const insertValues = newStudentIds.map(() => '(?, ?, NOW(), NOW())').join(',');
    const insertParams = [];
    newStudentIds.forEach(studentId => {
      insertParams.push(classId, studentId);
    });

    await connection.execute(
      `INSERT INTO class_students (class_id, student_id, join_date, created_at) VALUES ${insertValues}`,
      insertParams
    );

    // 更新班级当前学生数
    await connection.execute(
      'UPDATE classes SET current_students = (SELECT COUNT(*) FROM class_students WHERE class_id = ?) WHERE id = ?',
      [classId, classId]
    );

    const addedStudents = studentRows.filter(student => newStudentIds.includes(student.id));

    return res.status(200).json({
      message: `成功添加${addedStudents.length}名学生到班级`,
      addedStudents: addedStudents.map(student => ({
        id: student.id,
        name: student.name
      })),
      skippedCount: studentIds.length - addedStudents.length
    });
  } catch (error) {
    console.error('添加学生到班级失败:', error);
    return res.status(500).json({ message: '服务器错误，添加学生到班级失败' });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

/**
 * 从班级移除学生
 */
exports.removeStudentFromClass = async (req, res) => {
  let connection;
  try {
    const { classId, studentId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    connection = await getConnection();

    // 验证班级是否存在
    const [classRows] = await connection.execute(
      'SELECT * FROM classes WHERE id = ?',
      [classId]
    );

    if (classRows.length === 0) {
      return res.status(404).json({ message: '班级不存在' });
    }

    const classData = classRows[0];

    // 权限检查
    if (userRole === 'teacher' && classData.teacher_id !== userId) {
      return res.status(403).json({ message: '您不是该班级的教师，无权移除学生' });
    }

    // 检查学生是否在班级中
    const [studentRows] = await connection.execute(
      'SELECT cs.*, u.name as student_name FROM class_students cs JOIN users u ON cs.student_id = u.id WHERE cs.class_id = ? AND cs.student_id = ?',
      [classId, studentId]
    );

    if (studentRows.length === 0) {
      return res.status(404).json({ message: '学生不在该班级中' });
    }

    const studentData = studentRows[0];

    // 移除学生
    await connection.execute(
      'DELETE FROM class_students WHERE class_id = ? AND student_id = ?',
      [classId, studentId]
    );

    // 更新班级当前学生数
    await connection.execute(
      'UPDATE classes SET current_students = (SELECT COUNT(*) FROM class_students WHERE class_id = ?) WHERE id = ?',
      [classId, classId]
    );

    return res.status(200).json({
      message: '学生移除成功',
      removedStudent: {
        id: studentId,
        name: studentData.student_name
      }
    });
  } catch (error) {
    console.error('移除学生失败:', error);
    return res.status(500).json({ message: '服务器错误，移除学生失败' });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

/**
 * 删除班级
 */
exports.deleteClass = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    connection = await getConnection();

    // 查询班级
    const [classRows] = await connection.execute(
      'SELECT * FROM classes WHERE id = ?',
      [id]
    );

    if (classRows.length === 0) {
      return res.status(404).json({ message: '班级不存在' });
    }

    const classData = classRows[0];

    // 权限检查（只有管理员或班级教师可以删除班级）
    if (userRole !== 'admin' && classData.teacher_id !== userId) {
      return res.status(403).json({ message: '您没有权限删除该班级' });
    }

    // 检查班级是否有学生
    const [studentCountRows] = await connection.execute(
      'SELECT COUNT(*) as count FROM class_students WHERE class_id = ?',
      [id]
    );

    if (studentCountRows[0].count > 0) {
      return res.status(400).json({ message: '班级中还有学生，无法删除。请先移除所有学生。' });
    }

    // 删除班级相关数据
    await connection.execute('DELETE FROM attendances WHERE class_id = ?', [id]);
    await connection.execute('DELETE FROM points WHERE class_id = ?', [id]);
    await connection.execute('DELETE FROM recitation WHERE class_id = ?', [id]);
    await connection.execute('DELETE FROM random_calls WHERE class_id = ?', [id]);
    
    // 删除班级
    await connection.execute('DELETE FROM classes WHERE id = ?', [id]);

    return res.status(200).json({ message: '班级删除成功' });
  } catch (error) {
    console.error('删除班级失败:', error);
    return res.status(500).json({ message: '服务器错误，删除班级失败' });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

/**
 * 获取班级学生列表
 */
exports.getClassStudents = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    connection = await getConnection();

    // 验证班级是否存在
    const [classRows] = await connection.execute(
      'SELECT * FROM classes WHERE id = ?',
      [id]
    );

    if (classRows.length === 0) {
      return res.status(404).json({ message: '班级不存在' });
    }

    const classData = classRows[0];

    // 权限检查
    if (userRole === 'teacher' && classData.teacher_id !== userId) {
      return res.status(403).json({ message: '您不是该班级的教师，无权查看学生列表' });
    } else if (userRole === 'student') {
      // 检查学生是否在班级中
      const [studentRows] = await connection.execute(
        'SELECT 1 FROM class_students WHERE class_id = ? AND student_id = ?',
        [id, userId]
      );

      if (studentRows.length === 0) {
        return res.status(403).json({ message: '您不是该班级的学生，无权查看学生列表' });
      }
    }

    // 查询班级学生
    const [students] = await connection.execute(
      `SELECT u.id, u.name, u.username, u.email, u.student_id, cs.join_date, cs.created_at
       FROM users u 
       INNER JOIN class_students cs ON u.id = cs.student_id 
       WHERE cs.class_id = ? 
       ORDER BY u.name`,
      [id]
    );
    
    const formattedStudents = students.map(student => ({
      id: student.id,
      name: student.name,
      username: student.username,
      email: student.email,
      studentId: student.student_id,
      joinDate: formatDateTime(student.join_date),
      createdAt: formatDateTime(student.created_at)
    }));
    
    return res.status(200).json({
      students: formattedStudents,
      total: formattedStudents.length
    });
  } catch (error) {
    console.error('获取班级学生列表失败:', error);
    return res.status(500).json({ message: '服务器错误，获取班级学生列表失败' });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};