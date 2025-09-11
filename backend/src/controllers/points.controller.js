const Points = require('../models/Points');
const User = require('../models/User');
const Class = require('../models/Class');
const { getConnection } = require('typeorm');
const { formatDateTime } = require('../utils/helpers');

// 获取Points仓库的辅助函数
const getPointsRepository = () => {
  return getConnection().getRepository(Points);
};
// 获取User仓库的辅助函数
const getUserRepository = () => {
  return getConnection().getRepository(User);
};
// 获取Class仓库的辅助函数
const getClassRepository = () => {
  return getConnection().getRepository(Class);
};

/**
 * 给学生添加积分
 */
exports.addPoints = async (req, res) => {
  try {
    const { studentId, classId, points, reason } = req.body;
    const teacherId = req.user.id;

    // 验证积分值
    if (!points || isNaN(points) || points === 0) {
      return res.status(400).json({ message: '积分值无效' });
    }

    // 验证班级是否存在
    const classEntity = await getClassRepository().findOne({
      where: { id: classId },
      relations: ['teacher']
    });

    if (!classEntity) {
      return res.status(404).json({ message: '班级不存在' });
    }

    // 验证当前用户是否为该班级的教师
    if (classEntity.teacher.id !== teacherId) {
      return res.status(403).json({ message: '您不是该班级的教师，无权添加积分' });
    }

    // 验证学生是否存在
    const student = await getUserRepository().findOne({
      where: { id: studentId }
    });

    if (!student) {
      return res.status(404).json({ message: '学生不存在' });
    }
    
    // 获取学生角色ID（假设学生角色ID为3，或者查询roles表获取）
    const Role = require('../models/Role');
    const getRoleRepository = () => {
      return getConnection().getRepository(Role);
    };
    
    const studentRole = await getRoleRepository().findOne({
      where: { name: 'student' }
    });
    
    if (!studentRole || student.role_id !== studentRole.id) {
      return res.status(400).json({ message: '用户不是学生角色' });
    }

    // 验证学生是否属于该班级（通过ClassStudent中间表）
    const ClassStudent = require('../models/ClassStudent');
    const getClassStudentRepository = () => {
      return getConnection().getRepository(ClassStudent);
    };
    
    const classStudent = await getClassStudentRepository().findOne({
      where: { 
        student: { id: studentId }, 
        class: { id: classId },
        status: 'active'
      }
    });
    
    if (!classStudent) {
      return res.status(400).json({ message: '该学生不属于此班级' });
    }

    // 创建积分记录
    const pointsRecord = getPointsRepository().create({
      student: { id: studentId },
      class: { id: classId },
      points,
      reason,
      teacher: { id: teacherId },
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await getPointsRepository().save(pointsRecord);

    return res.status(201).json({
      message: points > 0 ? '积分添加成功' : '积分扣除成功',
      pointsRecord: {
        id: pointsRecord.id,
        studentId,
        classId,
        points: pointsRecord.points,
        reason: pointsRecord.reason,
        createdAt: formatDateTime(pointsRecord.createdAt)
      }
    });
  } catch (error) {
    console.error('添加积分失败:', error);
    return res.status(500).json({ message: '服务器错误，添加积分失败' });
  }
};

/**
 * 获取学生积分记录
 */
exports.getStudentPoints = async (req, res) => {
  try {
    const { studentId, classId, page = 1, limit = 10 } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    // 构建查询条件
    const whereClause = {};

    // 按学生筛选
    if (studentId) {
      // 如果是学生本人查询或教师/管理员查询
      if (userRole === 'student' && studentId !== userId.toString()) {
        return res.status(403).json({ message: '您只能查看自己的积分记录' });
      }

      whereClause.student = { id: studentId };
    } else if (userRole === 'student') {
      // 学生只能查看自己的积分记录
      whereClause.student = { id: userId };
    }

    // 按班级筛选
    if (classId) {
      whereClause.class = { id: classId };

      // 如果是教师，验证是否为该班级的教师
      if (userRole === 'teacher') {
        const classEntity = await getClassRepository().findOne({
          where: { id: classId },
          relations: ['teacher']
        });

        if (!classEntity || classEntity.teacher.id !== userId) {
          return res.status(403).json({ message: '您不是该班级的教师，无权查看积分记录' });
        }
      }
    }

    // 分页参数
    const skip = (page - 1) * limit;

    // 查询积分记录
    const [pointsRecords, total] = await getPointsRepository().findAndCount({
      where: whereClause,
      relations: ['student', 'class', 'teacher'],
      skip,
      take: limit,
      order: { createdAt: 'DESC' }
    });

    // 格式化返回数据
    const formattedRecords = pointsRecords.map(record => ({
      id: record.id,
      studentId: record.student.id,
      studentName: record.student.name,
      classId: record.class.id,
      className: record.class.name,
      points: record.points,
      reason: record.reason,
      awardedBy: {
        id: record.teacher.id,
        name: record.teacher.name
      },
      createdAt: formatDateTime(record.createdAt)
    }));

    return res.status(200).json({
      pointsRecords: formattedRecords,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取积分记录失败:', error);
    return res.status(500).json({ message: '服务器错误，获取积分记录失败' });
  }
};

/**
 * 获取班级积分排行榜
 */
exports.getClassLeaderboard = async (req, res) => {
  try {
    const { classId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // 验证班级是否存在
    const classEntity = await getClassRepository().findOne({
      where: { id: classId },
      relations: ['teacher', 'classStudents', 'classStudents.student']
    });

    if (!classEntity) {
      return res.status(404).json({ message: '班级不存在' });
    }

    // 权限检查
    if (userRole === 'teacher' && classEntity.teacher.id !== userId) {
      return res.status(403).json({ message: '您不是该班级的教师，无权查看积分排行榜' });
    } else if (userRole === 'student') {
      // 检查学生是否在班级中
      const isStudentInClass = classEntity.classStudents.some(cs => cs.student.id === userId);
      if (!isStudentInClass) {
        return res.status(403).json({ message: '您不是该班级的学生，无权查看积分排行榜' });
      }
    }

    // 获取班级所有学生
    const students = classEntity.classStudents.map(cs => cs.student);

    // 获取班级所有积分记录
    const pointsRecords = await getPointsRepository().find({
      where: { class: { id: classId } },
      relations: ['student']
    });

    // 计算每个学生的总积分
    const studentPoints = {};
    students.forEach(student => {
      studentPoints[student.id] = {
        studentId: student.id,
        studentName: student.name,
        avatar: student.avatar,
        totalPoints: 0,
        positivePoints: 0,
        negativePoints: 0,
        records: []
      };
    });

    // 统计积分
    pointsRecords.forEach(record => {
      const studentId = record.student.id;
      if (studentPoints[studentId]) {
        studentPoints[studentId].totalPoints += record.points;
        if (record.points > 0) {
          studentPoints[studentId].positivePoints += record.points;
        } else {
          studentPoints[studentId].negativePoints += Math.abs(record.points);
        }
        studentPoints[studentId].records.push({
          id: record.id,
          points: record.points,
          reason: record.reason,
          createdAt: formatDateTime(record.createdAt)
        });
      }
    });

    // 转换为数组并排序
    const leaderboard = Object.values(studentPoints).sort((a, b) => b.totalPoints - a.totalPoints);

    // 添加排名
    leaderboard.forEach((item, index) => {
      item.rank = index + 1;
    });

    return res.status(200).json({
      classId,
      className: classEntity.name,
      leaderboard
    });
  } catch (error) {
    console.error('获取积分排行榜失败:', error);
    return res.status(500).json({ message: '服务器错误，获取积分排行榜失败' });
  }
};

/**
 * 获取积分统计信息
 */
exports.getPointsStats = async (req, res) => {
  try {
    const { classId, studentId, startDate, endDate } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    // 构建查询条件
    const whereClause = {};

    // 按班级筛选
    if (classId) {
      whereClause.class = { id: classId };

      // 如果是教师，验证是否为该班级的教师
      if (userRole === 'teacher') {
        const classEntity = await getClassRepository().findOne({
          where: { id: classId },
          relations: ['teacher']
        });

        if (!classEntity || classEntity.teacher.id !== userId) {
          return res.status(403).json({ message: '您不是该班级的教师，无权查看积分统计' });
        }
      }
    }

    // 按学生筛选
    if (studentId) {
      // 如果是学生本人查询或教师/管理员查询
      if (userRole === 'student' && studentId !== userId.toString()) {
        return res.status(403).json({ message: '您只能查看自己的积分统计' });
      }

      whereClause.student = { id: studentId };
    } else if (userRole === 'student') {
      // 学生只能查看自己的积分统计
      whereClause.student = { id: userId };
    }

    // 按日期范围筛选
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      whereClause.createdAt = {
        $gte: start,
        $lte: end
      };
    }

    // 查询积分记录
    const pointsRecords = await getPointsRepository().find({
      where: whereClause,
      relations: ['student', 'class']
    });

    // 计算统计信息
    const stats = {
      totalRecords: pointsRecords.length,
      totalPoints: 0,
      positivePoints: 0,
      negativePoints: 0,
      averagePoints: 0,
      mostCommonReasons: {},
      dailyPoints: {}
    };

    // 统计积分
    pointsRecords.forEach(record => {
      stats.totalPoints += record.points;
      if (record.points > 0) {
        stats.positivePoints += record.points;
      } else {
        stats.negativePoints += Math.abs(record.points);
      }

      // 统计原因
      if (record.reason) {
        if (!stats.mostCommonReasons[record.reason]) {
          stats.mostCommonReasons[record.reason] = 0;
        }
        stats.mostCommonReasons[record.reason]++;
      }

      // 统计每日积分
      const dateStr = record.createdAt.toISOString().split('T')[0];
      if (!stats.dailyPoints[dateStr]) {
        stats.dailyPoints[dateStr] = 0;
      }
      stats.dailyPoints[dateStr] += record.points;
    });

    // 计算平均积分
    if (pointsRecords.length > 0) {
      stats.averagePoints = Math.round((stats.totalPoints / pointsRecords.length) * 100) / 100;
    }

    // 排序最常见原因
    const sortedReasons = Object.entries(stats.mostCommonReasons)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .reduce((obj, [key, value]) => {
        obj[key] = value;
        return obj;
      }, {});

    stats.mostCommonReasons = sortedReasons;

    return res.status(200).json({ stats });
  } catch (error) {
    console.error('获取积分统计失败:', error);
    return res.status(500).json({ message: '服务器错误，获取积分统计失败' });
  }
};

/**
 * 删除积分记录（仅限教师和管理员）
 */
exports.deletePointsRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // 查找积分记录
    const pointsRecord = await getPointsRepository().findOne({
      where: { id },
      relations: ['class', 'class.teacher', 'teacher']
    });

    if (!pointsRecord) {
      return res.status(404).json({ message: '积分记录不存在' });
    }

    // 权限检查
    if (userRole === 'teacher') {
      // 只有班级教师或积分授予者可以删除
      const isTeacher = pointsRecord.class.teacher.id === userId;
      const isAwarder = pointsRecord.teacher.id === userId;

      if (!isTeacher && !isAwarder) {
        return res.status(403).json({ message: '您无权删除此积分记录' });
      }
    }

    // 删除积分记录
    await getPointsRepository().remove(pointsRecord);

    return res.status(200).json({
      message: '积分记录删除成功',
      deletedRecordId: id
    });
  } catch (error) {
    console.error('删除积分记录失败:', error);
    return res.status(500).json({ message: '服务器错误，删除积分记录失败' });
  }
};