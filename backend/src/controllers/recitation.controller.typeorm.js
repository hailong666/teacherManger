const Recitation = require('../models/Recitation');
const { User } = require('../models/User');
const { Class } = require('../models/Class');
const { getConnection } = require('typeorm');
const { formatDateTime } = require('../utils/helpers');

// 获取Recitation仓库的辅助函数
const getRecitationRepository = () => {
  return getConnection().getRepository(Recitation);
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
 * 提交背诵打卡
 */
exports.submitRecitation = async (req, res) => {
  try {
    const { classId, content, audioUrl } = req.body;
    const studentId = req.user.id;

    // 验证班级是否存在
    const classEntity = await getClassRepository().findOne({
      where: { id: classId },
      relations: ['students']
    });

    if (!classEntity) {
      return res.status(404).json({ message: '班级不存在' });
    }

    // 验证学生是否在班级中
    const isStudentInClass = classEntity.students.some(student => student.id === studentId);
    if (!isStudentInClass) {
      return res.status(403).json({ message: '您不是该班级的学生，无法提交背诵打卡' });
    }

    // 检查今天是否已提交过背诵打卡
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingRecitation = await getRecitationRepository().findOne({
      where: {
        student: { id: studentId },
        class: { id: classId },
        createdAt: {
          $gte: today,
          $lt: tomorrow
        }
      }
    });

    if (existingRecitation) {
      return res.status(400).json({ message: '今天已提交过背诵打卡，请明天再来' });
    }

    // 创建背诵打卡记录
    const recitation = getRecitationRepository().create({
      student: { id: studentId },
      class: { id: classId },
      content,
      audioUrl,
      status: 'pending', // 默认为待评分状态
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await getRecitationRepository().save(recitation);

    return res.status(201).json({
      message: '背诵打卡提交成功，等待老师评分',
      recitation: {
        id: recitation.id,
        content: recitation.content,
        audioUrl: recitation.audioUrl,
        status: recitation.status,
        createdAt: formatDateTime(recitation.createdAt)
      }
    });
  } catch (error) {
    console.error('提交背诵打卡失败:', error);
    return res.status(500).json({ message: '服务器错误，提交背诵打卡失败' });
  }
};

/**
 * 教师评分背诵打卡
 */
exports.gradeRecitation = async (req, res) => {
  try {
    const { id } = req.params;
    const { score, feedback } = req.body;
    const teacherId = req.user.id;

    // 验证分数范围
    if (score < 0 || score > 100) {
      return res.status(400).json({ message: '分数必须在0-100之间' });
    }

    // 查找背诵打卡记录
    const recitation = await getRecitationRepository().findOne({
      where: { id },
      relations: ['class', 'class.teacher', 'student']
    });

    if (!recitation) {
      return res.status(404).json({ message: '背诵打卡记录不存在' });
    }

    // 验证权限（只有班级教师可以评分）
    if (recitation.class.teacher.id !== teacherId) {
      return res.status(403).json({ message: '您不是该班级的教师，无权评分' });
    }

    // 更新背诵打卡记录
    recitation.score = score;
    recitation.feedback = feedback;
    recitation.status = 'graded';
    recitation.gradedAt = new Date();
    recitation.gradedBy = { id: teacherId };
    recitation.updatedAt = new Date();

    await getRecitationRepository().save(recitation);

    return res.status(200).json({
      message: '背诵打卡评分成功',
      recitation: {
        id: recitation.id,
        studentId: recitation.student.id,
        studentName: recitation.student.name,
        score: recitation.score,
        feedback: recitation.feedback,
        status: recitation.status,
        gradedAt: formatDateTime(recitation.gradedAt)
      }
    });
  } catch (error) {
    console.error('评分背诵打卡失败:', error);
    return res.status(500).json({ message: '服务器错误，评分背诵打卡失败' });
  }
};

/**
 * 获取背诵打卡列表
 */
exports.getRecitations = async (req, res) => {
  try {
    const { classId, studentId, status, startDate, endDate, page = 1, limit = 10 } = req.query;
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

      whereClause.student = { id: studentId };
    } else if (userRole === 'student') {
      // 学生只能查看自己的背诵打卡记录
      whereClause.student = { id: userId };
    }

    // 按状态筛选
    if (status) {
      whereClause.status = status;
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

    // 分页参数
    const skip = (page - 1) * limit;

    // 查询背诵打卡记录
    const [recitations, total] = await getRecitationRepository().findAndCount({
      where: whereClause,
      relations: ['student', 'class', 'gradedBy'],
      skip,
      take: limit,
      order: { createdAt: 'DESC' }
    });

    // 格式化返回数据
    const formattedRecitations = recitations.map(recitation => ({
      id: recitation.id,
      studentId: recitation.student.id,
      studentName: recitation.student.name,
      classId: recitation.class.id,
      className: recitation.class.name,
      content: recitation.content,
      audioUrl: recitation.audioUrl,
      score: recitation.score,
      feedback: recitation.feedback,
      status: recitation.status,
      createdAt: formatDateTime(recitation.createdAt),
      gradedAt: recitation.gradedAt ? formatDateTime(recitation.gradedAt) : null,
      gradedBy: recitation.gradedBy ? {
        id: recitation.gradedBy.id,
        name: recitation.gradedBy.name
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
  }
};

/**
 * 获取背诵打卡详情
 */
exports.getRecitationById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // 查询背诵打卡记录
    const recitation = await getRecitationRepository().findOne({
      where: { id },
      relations: ['student', 'class', 'class.teacher', 'gradedBy']
    });

    if (!recitation) {
      return res.status(404).json({ message: '背诵打卡记录不存在' });
    }

    // 权限检查
    if (userRole === 'student' && recitation.student.id !== userId) {
      return res.status(403).json({ message: '您只能查看自己的背诵打卡记录' });
    } else if (userRole === 'teacher' && recitation.class.teacher.id !== userId) {
      return res.status(403).json({ message: '您不是该班级的教师，无权查看此背诵打卡记录' });
    }

    // 格式化返回数据
    const recitationData = {
      id: recitation.id,
      student: {
        id: recitation.student.id,
        name: recitation.student.name,
        avatar: recitation.student.avatar
      },
      class: {
        id: recitation.class.id,
        name: recitation.class.name
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
        id: recitation.gradedBy.id,
        name: recitation.gradedBy.name
      } : null
    };

    return res.status(200).json({ recitation: recitationData });
  } catch (error) {
    console.error('获取背诵打卡详情失败:', error);
    return res.status(500).json({ message: '服务器错误，获取背诵打卡详情失败' });
  }
};

/**
 * 获取背诵打卡统计信息
 */
exports.getRecitationStats = async (req, res) => {
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

      whereClause.student = { id: studentId };
    } else if (userRole === 'student') {
      // 学生只能查看自己的背诵打卡统计
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

    // 查询背诵打卡记录
    const recitations = await getRecitationRepository().find({
      where: whereClause,
      relations: ['student', 'class']
    });

    // 计算统计信息
    const stats = {
      totalRecitations: recitations.length,
      gradedRecitations: recitations.filter(r => r.status === 'graded').length,
      pendingRecitations: recitations.filter(r => r.status === 'pending').length,
      averageScore: 0,
      highestScore: 0,
      lowestScore: 100,
      scoreDistribution: {
        '0-60': 0,
        '60-70': 0,
        '70-80': 0,
        '80-90': 0,
        '90-100': 0
      },
      dailyRecitations: {}
    };

    // 计算分数统计
    const gradedRecitations = recitations.filter(r => r.status === 'graded');
    if (gradedRecitations.length > 0) {
      const totalScore = gradedRecitations.reduce((sum, r) => sum + r.score, 0);
      stats.averageScore = Math.round((totalScore / gradedRecitations.length) * 100) / 100;
      stats.highestScore = Math.max(...gradedRecitations.map(r => r.score));
      stats.lowestScore = Math.min(...gradedRecitations.map(r => r.score));

      // 计算分数分布
      gradedRecitations.forEach(r => {
        if (r.score < 60) stats.scoreDistribution['0-60']++;
        else if (r.score < 70) stats.scoreDistribution['60-70']++;
        else if (r.score < 80) stats.scoreDistribution['70-80']++;
        else if (r.score < 90) stats.scoreDistribution['80-90']++;
        else stats.scoreDistribution['90-100']++;
      });
    }

    // 计算每日打卡数量
    recitations.forEach(r => {
      const dateStr = r.createdAt.toISOString().split('T')[0];
      if (!stats.dailyRecitations[dateStr]) {
        stats.dailyRecitations[dateStr] = 0;
      }
      stats.dailyRecitations[dateStr]++;
    });

    // 如果是查询特定学生的统计
    if (studentId) {
      // 计算连续打卡天数
      const dateSet = new Set();
      recitations.forEach(r => {
        const dateStr = r.createdAt.toISOString().split('T')[0];
        dateSet.add(dateStr);
      });

      const dates = Array.from(dateSet).sort();
      let currentStreak = 0;
      let maxStreak = 0;

      // 计算当前连续打卡天数
      const today = new Date().toISOString().split('T')[0];
      let i = dates.length - 1;
      while (i >= 0) {
        const date = dates[i];
        const dateObj = new Date(date);
        const expectedDate = new Date(today);
        expectedDate.setDate(expectedDate.getDate() - currentStreak);
        const expectedDateStr = expectedDate.toISOString().split('T')[0];

        if (date === expectedDateStr) {
          currentStreak++;
        } else {
          break;
        }
        i--;
      }

      // 计算最长连续打卡天数
      for (let i = 0; i < dates.length; i++) {
        let streak = 1;
        for (let j = i + 1; j < dates.length; j++) {
          const date1 = new Date(dates[j - 1]);
          const date2 = new Date(dates[j]);
          const diffTime = date2 - date1;
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays === 1) {
            streak++;
          } else {
            break;
          }
        }
        maxStreak = Math.max(maxStreak, streak);
      }

      stats.currentStreak = currentStreak;
      stats.maxStreak = maxStreak;
    }

    return res.status(200).json({ stats });
  } catch (error) {
    console.error('获取背诵打卡统计失败:', error);
    return res.status(500).json({ message: '服务器错误，获取背诵打卡统计失败' });
  }
};