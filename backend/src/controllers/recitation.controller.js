const mysql = require('mysql2/promise');
const { formatDateTime } = require('../utils/helpers');
require('dotenv').config();

// 数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'teacher_manager'
};

// 获取数据库连接
const getConnection = async () => {
  return await mysql.createConnection(dbConfig);
};

/**
 * 提交背诵打卡
 */
exports.submitRecitation = async (req, res) => {
  let connection;
  try {
    const { classId, content, audioUrl } = req.body;
    const studentId = req.user.id;

    connection = await getConnection();

    // 验证班级是否存在
    const [classRows] = await connection.execute(
      'SELECT id FROM classes WHERE id = ?',
      [classId]
    );

    if (classRows.length === 0) {
      return res.status(404).json({ message: '班级不存在' });
    }

    // 验证学生是否在班级中
    const [studentClassRows] = await connection.execute(
      'SELECT 1 FROM class_students WHERE class_id = ? AND student_id = ?',
      [classId, studentId]
    );

    if (studentClassRows.length === 0) {
      return res.status(403).json({ message: '您不是该班级的学生，无法提交背诵打卡' });
    }

    // 检查今天是否已提交过背诵打卡
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const [existingRows] = await connection.execute(
      'SELECT id FROM recitation WHERE student_id = ? AND class_id = ? AND createdAt >= ? AND createdAt < ?',
      [studentId, classId, todayStart, todayEnd]
    );

    if (existingRows.length > 0) {
      return res.status(400).json({ message: '今天已提交过背诵打卡，请明天再来' });
    }

    // 创建背诵打卡记录
    const [result] = await connection.execute(
      'INSERT INTO recitation (student_id, class_id, content, audioUrl, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
      [studentId, classId, content, audioUrl || null, 'pending']
    );

    return res.status(201).json({
      message: '背诵打卡提交成功，等待老师评分',
      recitation: {
        id: result.insertId,
        content,
        audioUrl,
        status: 'pending',
        createdAt: formatDateTime(new Date())
      }
    });
  } catch (error) {
    console.error('提交背诵打卡失败:', error);
    return res.status(500).json({ message: '服务器错误，提交背诵打卡失败' });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

/**
 * 教师评分背诵打卡
 */
exports.gradeRecitation = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const { score, feedback } = req.body;
    const teacherId = req.user.id;

    // 验证分数范围
    if (score < 0 || score > 100) {
      return res.status(400).json({ message: '分数必须在0-100之间' });
    }

    connection = await getConnection();

    // 查找背诵打卡记录并验证权限
    const [recitationRows] = await connection.execute(
      `SELECT r.*, c.teacher_id, u.name as student_name 
       FROM recitation r 
       JOIN classes c ON r.class_id = c.id 
       JOIN users u ON r.student_id = u.id 
       WHERE r.id = ?`,
      [id]
    );

    if (recitationRows.length === 0) {
      return res.status(404).json({ message: '背诵打卡记录不存在' });
    }

    const recitation = recitationRows[0];

    // 验证权限（只有班级教师可以评分）
    if (recitation.teacher_id !== teacherId) {
      return res.status(403).json({ message: '您不是该班级的教师，无权评分' });
    }

    // 更新背诵打卡记录
    await connection.execute(
      'UPDATE recitation SET score = ?, feedback = ?, status = ?, gradedAt = NOW(), gradedBy = ?, updatedAt = NOW() WHERE id = ?',
      [score, feedback || null, 'graded', teacherId, id]
    );

    return res.status(200).json({
      message: '背诵打卡评分成功',
      recitation: {
        id: recitation.id,
        studentId: recitation.student_id,
        studentName: recitation.student_name,
        score,
        feedback,
        status: 'graded',
        gradedAt: formatDateTime(new Date())
      }
    });
  } catch (error) {
    console.error('评分背诵打卡失败:', error);
    return res.status(500).json({ message: '服务器错误，评分背诵打卡失败' });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

/**
 * 获取背诵打卡列表
 */
exports.getRecitations = async (req, res) => {
  let connection;
  try {
    const { classId, studentId, status, startDate, endDate, page = 1, limit = 10 } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    connection = await getConnection();

    // 构建查询条件
    let whereClause = '1=1';
    const params = [];

    // 按班级筛选
    if (classId) {
      whereClause += ' AND r.class_id = ?';
      params.push(classId);

      // 如果是教师，验证是否为该班级的教师
      if (userRole === 'teacher') {
        const [classRows] = await connection.execute(
          'SELECT teacher_id FROM classes WHERE id = ?',
          [classId]
        );

        if (classRows.length === 0 || classRows[0].teacher_id !== userId) {
          return res.status(403).json({ message: '您不是该班级的教师，无权查看背诵打卡记录' });
        }
      }
    }

    // 按学生筛选
    if (studentId) {
      // 如果是学生本人查询或教师/管理员查询
      if (userRole === 'student' && studentId !== userId.toString()) {
        return res.status(403).json({ message: '您只能查看自己的背诵打卡记录' });
      }

      whereClause += ' AND r.student_id = ?';
      params.push(studentId);
    } else if (userRole === 'student') {
      // 学生只能查看自己的背诵打卡记录
      whereClause += ' AND r.student_id = ?';
      params.push(userId);
    }

    // 按状态筛选
    if (status) {
      whereClause += ' AND r.status = ?';
      params.push(status);
    }

    // 按日期范围筛选
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      whereClause += ' AND r.createdAt >= ? AND r.createdAt <= ?';
      params.push(start, end);
    }

    // 计算分页
    const offset = (page - 1) * limit;

    // 查询总数
    const [countRows] = await connection.execute(
      `SELECT COUNT(*) as total 
       FROM recitation r 
       JOIN users u ON r.student_id = u.id 
       JOIN classes c ON r.class_id = c.id 
       WHERE ${whereClause}`,
      params
    );
    const total = countRows[0].total;

    // 查询背诵打卡记录
    const [recitationRows] = await connection.execute(
      `SELECT r.*, u.name as student_name, c.name as class_name, 
              grader.name as graded_by_name
       FROM recitation r 
       JOIN users u ON r.student_id = u.id 
       JOIN classes c ON r.class_id = c.id 
       LEFT JOIN users grader ON r.gradedBy = grader.id 
       WHERE ${whereClause} 
       ORDER BY r.createdAt DESC 
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    // 格式化返回数据
    const formattedRecitations = recitationRows.map(recitation => ({
      id: recitation.id,
      studentId: recitation.student_id,
      studentName: recitation.student_name,
      classId: recitation.class_id,
      className: recitation.class_name,
      content: recitation.content,
      audioUrl: recitation.audioUrl,
      score: recitation.score,
      feedback: recitation.feedback,
      status: recitation.status,
      createdAt: formatDateTime(recitation.createdAt),
      gradedAt: recitation.gradedAt ? formatDateTime(recitation.gradedAt) : null,
      gradedBy: recitation.gradedBy ? {
        id: recitation.gradedBy,
        name: recitation.graded_by_name
      } : null
    }));

    return res.status(200).json({
      recitations: formattedRecitations,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取背诵打卡列表失败:', error);
    return res.status(500).json({ message: '服务器错误，获取背诵打卡列表失败' });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

/**
 * 获取背诵打卡详情
 */
exports.getRecitationById = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    connection = await getConnection();

    // 查询背诵打卡记录
    const [recitationRows] = await connection.execute(
      `SELECT r.*, u.name as student_name, u.avatar as student_avatar,
              c.name as class_name, c.teacher_id,
              grader.name as graded_by_name
       FROM recitation r 
       JOIN users u ON r.student_id = u.id 
       JOIN classes c ON r.class_id = c.id 
       LEFT JOIN users grader ON r.gradedBy = grader.id 
       WHERE r.id = ?`,
      [id]
    );

    if (recitationRows.length === 0) {
      return res.status(404).json({ message: '背诵打卡记录不存在' });
    }

    const recitation = recitationRows[0];

    // 权限检查
    if (userRole === 'student' && recitation.student_id !== userId) {
      return res.status(403).json({ message: '您只能查看自己的背诵打卡记录' });
    } else if (userRole === 'teacher' && recitation.teacher_id !== userId) {
      return res.status(403).json({ message: '您不是该班级的教师，无权查看此背诵打卡记录' });
    }

    // 格式化返回数据
    const recitationData = {
      id: recitation.id,
      student: {
        id: recitation.student_id,
        name: recitation.student_name,
        avatar: recitation.student_avatar
      },
      class: {
        id: recitation.class_id,
        name: recitation.class_name
      },
      content: recitation.content,
      audioUrl: recitation.audioUrl,
      score: recitation.score,
      feedback: recitation.feedback,
      status: recitation.status,
      createdAt: formatDateTime(recitation.createdAt),
      updatedAt: formatDateTime(recitation.updatedAt),
      gradedAt: recitation.gradedAt ? formatDateTime(recitation.gradedAt) : null,
      gradedBy: recitation.gradedBy ? {
        id: recitation.gradedBy,
        name: recitation.graded_by_name
      } : null
    };

    return res.status(200).json({ recitation: recitationData });
  } catch (error) {
    console.error('获取背诵打卡详情失败:', error);
    return res.status(500).json({ message: '服务器错误，获取背诵打卡详情失败' });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

/**
 * 获取背诵打卡统计信息
 */
exports.getRecitationStats = async (req, res) => {
  let connection;
  try {
    const { classId, studentId, startDate, endDate } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    connection = await getConnection();

    // 构建查询条件
    let whereClause = '1=1';
    const params = [];

    // 按班级筛选
    if (classId) {
      whereClause += ' AND r.class_id = ?';
      params.push(classId);

      // 如果是教师，验证是否为该班级的教师
      if (userRole === 'teacher') {
        const [classRows] = await connection.execute(
          'SELECT teacher_id FROM classes WHERE id = ?',
          [classId]
        );

        if (classRows.length === 0 || classRows[0].teacher_id !== userId) {
          return res.status(403).json({ message: '您不是该班级的教师，无权查看背诵打卡统计' });
        }
      }
    }

    // 按学生筛选
    if (studentId) {
      // 如果是学生本人查询或教师/管理员查询
      if (userRole === 'student' && studentId !== userId.toString()) {
        return res.status(403).json({ message: '您只能查看自己的背诵打卡统计' });
      }

      whereClause += ' AND r.student_id = ?';
      params.push(studentId);
    } else if (userRole === 'student') {
      // 学生只能查看自己的背诵打卡统计
      whereClause += ' AND r.student_id = ?';
      params.push(userId);
    }

    // 按日期范围筛选
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      whereClause += ' AND r.createdAt >= ? AND r.createdAt <= ?';
      params.push(start, end);
    }

    // 查询统计数据
    const [statsRows] = await connection.execute(
      `SELECT 
         COUNT(*) as total,
         COUNT(CASE WHEN status = 'graded' THEN 1 END) as graded,
         COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
         AVG(CASE WHEN status = 'graded' THEN score END) as averageScore
       FROM recitation r 
       WHERE ${whereClause}`,
      params
    );

    const stats = {
      total: statsRows[0].total,
      graded: statsRows[0].graded,
      pending: statsRows[0].pending,
      averageScore: statsRows[0].averageScore ? Math.round(statsRows[0].averageScore * 100) / 100 : 0
    };

    return res.status(200).json({ stats });
  } catch (error) {
    console.error('获取背诵打卡统计失败:', error);
    return res.status(500).json({ message: '服务器错误，获取背诵打卡统计失败' });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};