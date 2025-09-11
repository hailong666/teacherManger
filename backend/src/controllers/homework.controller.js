const Homework = require('../models/Homework');
const User = require('../models/User');
const Class = require('../models/Class');
const { getConnection, In } = require('typeorm');
const { formatDateTime, filterEmptyValues } = require('../utils/helpers');
const fs = require('fs');
const path = require('path');

// 获取Homework仓库的辅助函数
const getHomeworkRepository = () => {
  return getConnection().getRepository(Homework);
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
 * 教师发布作业
 */
exports.createHomework = async (req, res) => {
  try {
    const { classId, title, description, dueDate, maxScore = 100 } = req.body;
    const teacherId = req.user.id;

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
      return res.status(403).json({ message: '您不是该班级的教师，无权发布作业' });
    }

    // 创建作业
    const homework = getHomeworkRepository().create({
      class: { id: classId },
      title,
      description,
      dueDate: new Date(dueDate),
      maxScore,
      createdBy: { id: teacherId },
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await getHomeworkRepository().save(homework);

    return res.status(201).json({
      message: '作业发布成功',
      homework: {
        id: homework.id,
        title: homework.title,
        description: homework.description,
        dueDate: formatDateTime(homework.dueDate),
        maxScore: homework.maxScore,
        createdAt: formatDateTime(homework.createdAt)
      }
    });
  } catch (error) {
    console.error('发布作业失败:', error);
    return res.status(500).json({ message: '服务器错误，发布作业失败' });
  }
};

/**
 * 学生提交作业
 */
exports.submitHomework = async (req, res) => {
  try {
    const { homeworkId } = req.params;
    const studentId = req.user.id;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: '请上传作业文件' });
    }

    // 验证作业是否存在
    const homework = await getHomeworkRepository().findOne({
      where: { id: homeworkId },
      relations: ['class', 'class.students']
    });

    if (!homework) {
      // 删除上传的文件
      fs.unlinkSync(file.path);
      return res.status(404).json({ message: '作业不存在' });
    }

    // 验证学生是否属于该班级
    const isStudentInClass = homework.class.students.some(student => student.id === studentId);
    if (!isStudentInClass) {
      // 删除上传的文件
      fs.unlinkSync(file.path);
      return res.status(403).json({ message: '您不是该班级的学生，无权提交作业' });
    }

    // 检查截止日期
    const now = new Date();
    const isOverdue = now > homework.dueDate;

    // 检查是否已提交过作业
    const existingSubmission = await getHomeworkRepository().findOne({
      where: {
        homework: { id: homeworkId },
        student: { id: studentId }
      }
    });

    if (existingSubmission) {
      // 如果已提交过，删除旧文件
      if (existingSubmission.filePath && fs.existsSync(existingSubmission.filePath)) {
        fs.unlinkSync(existingSubmission.filePath);
      }

      // 更新提交记录
      existingSubmission.filePath = file.path;
      existingSubmission.fileName = file.originalname;
      existingSubmission.fileSize = file.size;
      existingSubmission.submissionDate = now;
      existingSubmission.isLate = isOverdue;
      existingSubmission.updatedAt = now;

      await getHomeworkRepository().save(existingSubmission);

      return res.status(200).json({
        message: '作业更新提交成功',
        submission: {
          id: existingSubmission.id,
          homeworkId,
          fileName: existingSubmission.fileName,
          fileSize: existingSubmission.fileSize,
          submissionDate: formatDateTime(existingSubmission.submissionDate),
          isLate: existingSubmission.isLate
        }
      });
    }

    // 创建新的提交记录
    const submission = getHomeworkRepository().create({
      homework: { id: homeworkId },
      student: { id: studentId },
      filePath: file.path,
      fileName: file.originalname,
      fileSize: file.size,
      submissionDate: now,
      isLate: isOverdue,
      createdAt: now,
      updatedAt: now
    });

    await getHomeworkRepository().save(submission);

    return res.status(201).json({
      message: '作业提交成功',
      submission: {
        id: submission.id,
        homeworkId,
        fileName: submission.fileName,
        fileSize: submission.fileSize,
        submissionDate: formatDateTime(submission.submissionDate),
        isLate: submission.isLate
      }
    });
  } catch (error) {
    console.error('提交作业失败:', error);
    // 删除上传的文件
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(500).json({ message: '服务器错误，提交作业失败' });
  }
};

/**
 * 教师评分
 */
exports.gradeHomework = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { score, feedback } = req.body;
    const teacherId = req.user.id;

    // 验证分数
    if (score === undefined || isNaN(score) || score < 0) {
      return res.status(400).json({ message: '分数无效' });
    }

    // 查找提交记录
    const submission = await getHomeworkRepository().findOne({
      where: { id: submissionId },
      relations: ['homework', 'homework.class', 'homework.class.teacher']
    });

    if (!submission) {
      return res.status(404).json({ message: '作业提交记录不存在' });
    }

    // 验证当前用户是否为该班级的教师
    if (submission.homework.class.teacher.id !== teacherId) {
      return res.status(403).json({ message: '您不是该班级的教师，无权评分' });
    }

    // 验证分数是否超过最大分数
    if (score > submission.homework.maxScore) {
      return res.status(400).json({ message: `分数不能超过最大分数 ${submission.homework.maxScore}` });
    }

    // 更新评分
    submission.score = score;
    submission.feedback = feedback;
    submission.gradedBy = { id: teacherId };
    submission.gradedAt = new Date();
    submission.updatedAt = new Date();

    await getHomeworkRepository().save(submission);

    return res.status(200).json({
      message: '作业评分成功',
      submission: {
        id: submission.id,
        score: submission.score,
        feedback: submission.feedback,
        gradedAt: formatDateTime(submission.gradedAt)
      }
    });
  } catch (error) {
    console.error('评分失败:', error);
    return res.status(500).json({ message: '服务器错误，评分失败' });
  }
};

/**
 * 获取班级作业列表
 */
exports.getClassHomeworks = async (req, res) => {
  try {
    const { classId } = req.params;
    const { status, page = 1, limit = 10 } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    // 验证班级是否存在
    const classEntity = await getClassRepository().findOne({
      where: { id: classId },
      relations: ['teacher', 'students']
    });

    if (!classEntity) {
      return res.status(404).json({ message: '班级不存在' });
    }

    // 权限检查
    if (userRole === 'teacher' && classEntity.teacher.id !== userId) {
      return res.status(403).json({ message: '您不是该班级的教师，无权查看作业' });
    } else if (userRole === 'student') {
      // 检查学生是否在班级中
      const isStudentInClass = classEntity.students.some(student => student.id === userId);
      if (!isStudentInClass) {
        return res.status(403).json({ message: '您不是该班级的学生，无权查看作业' });
      }
    }

    // 构建查询条件
    const whereClause = { class: { id: classId } };

    // 根据状态筛选
    if (status) {
      const now = new Date();
      switch (status) {
        case 'active':
          whereClause.dueDate = { $gte: now };
          break;
        case 'past':
          whereClause.dueDate = { $lt: now };
          break;
      }
    }

    // 分页参数
    const skip = (page - 1) * limit;

    // 查询作业
    const [homeworks, total] = await getHomeworkRepository().findAndCount({
      where: whereClause,
      relations: ['createdBy'],
      skip,
      take: limit,
      order: { createdAt: 'DESC' }
    });

    // 格式化返回数据
    const formattedHomeworks = await Promise.all(homeworks.map(async (homework) => {
      // 获取提交情况
      const submissionCount = await getHomeworkRepository().count({
        where: { homework: { id: homework.id } }
      });

      // 如果是学生，获取自己的提交情况
      let studentSubmission = null;
      if (userRole === 'student') {
        studentSubmission = await getHomeworkRepository().findOne({
          where: {
            homework: { id: homework.id },
            student: { id: userId }
          }
        });
      }

      return {
        id: homework.id,
        title: homework.title,
        description: homework.description,
        dueDate: formatDateTime(homework.dueDate),
        maxScore: homework.maxScore,
        createdBy: {
          id: homework.createdBy.id,
          name: homework.createdBy.name
        },
        createdAt: formatDateTime(homework.createdAt),
        submissionCount,
        studentCount: classEntity.students.length,
        isOverdue: new Date() > homework.dueDate,
        studentSubmission: studentSubmission ? {
          id: studentSubmission.id,
          fileName: studentSubmission.fileName,
          submissionDate: formatDateTime(studentSubmission.submissionDate),
          isLate: studentSubmission.isLate,
          score: studentSubmission.score,
          feedback: studentSubmission.feedback,
          gradedAt: studentSubmission.gradedAt ? formatDateTime(studentSubmission.gradedAt) : null
        } : null
      };
    }));

    return res.status(200).json({
      homeworks: formattedHomeworks,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取作业列表失败:', error);
    return res.status(500).json({ message: '服务器错误，获取作业列表失败' });
  }
};

/**
 * 获取作业详情
 */
exports.getHomeworkDetail = async (req, res) => {
  try {
    const { homeworkId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // 查询作业
    const homework = await getHomeworkRepository().findOne({
      where: { id: homeworkId },
      relations: ['class', 'class.teacher', 'class.students', 'createdBy']
    });

    if (!homework) {
      return res.status(404).json({ message: '作业不存在' });
    }

    // 权限检查
    if (userRole === 'teacher' && homework.class.teacher.id !== userId) {
      return res.status(403).json({ message: '您不是该班级的教师，无权查看作业详情' });
    } else if (userRole === 'student') {
      // 检查学生是否在班级中
      const isStudentInClass = homework.class.students.some(student => student.id === userId);
      if (!isStudentInClass) {
        return res.status(403).json({ message: '您不是该班级的学生，无权查看作业详情' });
      }
    }

    // 获取提交情况
    let submissions = [];
    if (userRole === 'teacher' || userRole === 'admin') {
      // 教师和管理员可以看到所有提交
      submissions = await getHomeworkRepository().find({
        where: { homework: { id: homeworkId } },
        relations: ['student', 'gradedBy']
      });

      submissions = submissions.map(submission => ({
        id: submission.id,
        studentId: submission.student.id,
        studentName: submission.student.name,
        fileName: submission.fileName,
        fileSize: submission.fileSize,
        submissionDate: formatDateTime(submission.submissionDate),
        isLate: submission.isLate,
        score: submission.score,
        feedback: submission.feedback,
        gradedAt: submission.gradedAt ? formatDateTime(submission.gradedAt) : null,
        gradedBy: submission.gradedBy ? {
          id: submission.gradedBy.id,
          name: submission.gradedBy.name
        } : null
      }));
    } else if (userRole === 'student') {
      // 学生只能看到自己的提交
      const submission = await getHomeworkRepository().findOne({
        where: {
          homework: { id: homeworkId },
          student: { id: userId }
        },
        relations: ['gradedBy']
      });

      if (submission) {
        submissions = [{
          id: submission.id,
          fileName: submission.fileName,
          fileSize: submission.fileSize,
          submissionDate: formatDateTime(submission.submissionDate),
          isLate: submission.isLate,
          score: submission.score,
          feedback: submission.feedback,
          gradedAt: submission.gradedAt ? formatDateTime(submission.gradedAt) : null
        }];
      }
    }

    // 格式化返回数据
    const homeworkDetail = {
      id: homework.id,
      title: homework.title,
      description: homework.description,
      dueDate: formatDateTime(homework.dueDate),
      maxScore: homework.maxScore,
      class: {
        id: homework.class.id,
        name: homework.class.name
      },
      createdBy: {
        id: homework.createdBy.id,
        name: homework.createdBy.name
      },
      createdAt: formatDateTime(homework.createdAt),
      isOverdue: new Date() > homework.dueDate,
      submissions
    };

    return res.status(200).json({ homework: homeworkDetail });
  } catch (error) {
    console.error('获取作业详情失败:', error);
    return res.status(500).json({ message: '服务器错误，获取作业详情失败' });
  }
};

/**
 * 下载作业文件
 */
exports.downloadHomework = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // 查找提交记录
    const submission = await getHomeworkRepository().findOne({
      where: { id: submissionId },
      relations: ['student', 'homework', 'homework.class', 'homework.class.teacher']
    });

    if (!submission) {
      return res.status(404).json({ message: '作业提交记录不存在' });
    }

    // 权限检查
    if (userRole === 'teacher' && submission.homework.class.teacher.id !== userId) {
      return res.status(403).json({ message: '您不是该班级的教师，无权下载作业' });
    } else if (userRole === 'student' && submission.student.id !== userId) {
      return res.status(403).json({ message: '您只能下载自己提交的作业' });
    }

    // 检查文件是否存在
    if (!submission.filePath || !fs.existsSync(submission.filePath)) {
      return res.status(404).json({ message: '作业文件不存在或已被删除' });
    }

    // 发送文件
    res.download(submission.filePath, submission.fileName, (err) => {
      if (err) {
        console.error('下载文件失败:', err);
        return res.status(500).json({ message: '服务器错误，下载文件失败' });
      }
    });
  } catch (error) {
    console.error('下载作业失败:', error);
    return res.status(500).json({ message: '服务器错误，下载作业失败' });
  }
};

/**
 * 更新作业信息（仅限教师和管理员）
 */
exports.updateHomework = async (req, res) => {
  try {
    const { homeworkId } = req.params;
    const updateData = filterEmptyValues(req.body);
    const userId = req.user.id;
    const userRole = req.user.role;

    // 查询作业
    const homework = await getHomeworkRepository().findOne({
      where: { id: homeworkId },
      relations: ['class', 'class.teacher']
    });

    if (!homework) {
      return res.status(404).json({ message: '作业不存在' });
    }

    // 权限检查
    if (userRole === 'teacher' && homework.class.teacher.id !== userId) {
      return res.status(403).json({ message: '您不是该班级的教师，无权更新作业' });
    }

    // 更新作业信息
    if (updateData.title) homework.title = updateData.title;
    if (updateData.description) homework.description = updateData.description;
    if (updateData.dueDate) homework.dueDate = new Date(updateData.dueDate);
    if (updateData.maxScore) homework.maxScore = updateData.maxScore;
    homework.updatedAt = new Date();

    await getHomeworkRepository().save(homework);

    return res.status(200).json({
      message: '作业更新成功',
      homework: {
        id: homework.id,
        title: homework.title,
        description: homework.description,
        dueDate: formatDateTime(homework.dueDate),
        maxScore: homework.maxScore,
        updatedAt: formatDateTime(homework.updatedAt)
      }
    });
  } catch (error) {
    console.error('更新作业失败:', error);
    return res.status(500).json({ message: '服务器错误，更新作业失败' });
  }
};

/**
 * 删除作业（仅限教师和管理员）
 */
exports.deleteHomework = async (req, res) => {
  try {
    const { homeworkId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // 查询作业
    const homework = await getHomeworkRepository().findOne({
      where: { id: homeworkId },
      relations: ['class', 'class.teacher']
    });

    if (!homework) {
      return res.status(404).json({ message: '作业不存在' });
    }

    // 权限检查
    if (userRole === 'teacher' && homework.class.teacher.id !== userId) {
      return res.status(403).json({ message: '您不是该班级的教师，无权删除作业' });
    }

    // 查找所有相关的提交记录
    const submissions = await getHomeworkRepository().find({
      where: { homework: { id: homeworkId } }
    });

    // 删除所有提交的文件
    for (const submission of submissions) {
      if (submission.filePath && fs.existsSync(submission.filePath)) {
        fs.unlinkSync(submission.filePath);
      }
    }

    // 删除作业和所有提交记录
    await getHomeworkRepository().remove([homework, ...submissions]);

    return res.status(200).json({
      message: '作业删除成功',
      deletedHomeworkId: homeworkId
    });
  } catch (error) {
    console.error('删除作业失败:', error);
    return res.status(500).json({ message: '服务器错误，删除作业失败' });
  }
};

/**
 * 获取学生作业列表
 */
exports.getStudentHomeworks = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, status } = req.query;

    // 获取学生所在的班级
    const userRepository = getUserRepository();
    const student = await userRepository.findOne({
      where: { id: userId },
      relations: ['classStudents', 'classStudents.class']
    });

    if (!student || !student.classStudents || student.classStudents.length === 0) {
      return res.status(200).json({
        homeworks: [],
        total: 0,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          totalPages: 0
        }
      });
    }

    // 获取班级ID列表
    const classIds = student.classStudents.map(cs => cs.class.id);

    // 构建查询条件
    const whereConditions = {
      class: { id: In(classIds) },
      status: 'published'
    };

    // 获取作业列表
    const homeworkRepository = getHomeworkRepository();
    const [homeworks, total] = await homeworkRepository.findAndCount({
      where: whereConditions,
      relations: ['class', 'teacher', 'submissions'],
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: parseInt(limit)
    });

    // 格式化返回数据
    const formattedHomeworks = await Promise.all(homeworks.map(async (homework) => {
      // 获取学生的提交情况
      const submissionRepository = getConnection().getRepository('AssignmentSubmission');
      const studentSubmission = await submissionRepository.findOne({
        where: {
          assignment_id: homework.id,
          student_id: userId
        }
      });

      // 判断作业状态
      let submissionStatus = 'pending';
      if (studentSubmission) {
        submissionStatus = studentSubmission.status;
      } else if (new Date() > homework.due_date) {
        submissionStatus = 'expired';
      }

      // 根据状态过滤
      if (status && submissionStatus !== status) {
        return null;
      }

      return {
        id: homework.id,
        title: homework.title,
        description: homework.description,
        instructions: homework.instructions,
        subject: homework.subject,
        dueDate: homework.due_date,
        maxScore: homework.max_score,
        teacherName: homework.teacher?.real_name || homework.teacher?.name,
        className: homework.class?.name,
        submissionStatus,
        score: studentSubmission?.score || null,
        isLate: studentSubmission?.is_late || false,
        submissionTime: studentSubmission?.submission_time || null,
        feedback: studentSubmission?.feedback || null
      };
    }));

    // 过滤掉null值（被状态过滤掉的）
    const filteredHomeworks = formattedHomeworks.filter(hw => hw !== null);

    return res.status(200).json({
      homeworks: filteredHomeworks,
      total: filteredHomeworks.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filteredHomeworks.length,
        totalPages: Math.ceil(filteredHomeworks.length / limit)
      }
    });
  } catch (error) {
    console.error('获取学生作业列表失败:', error);
    return res.status(500).json({ message: '服务器错误，获取作业列表失败' });
  }
};

/**
 * 获取学生提交详情
 */
exports.getStudentSubmissionDetail = async (req, res) => {
  try {
    const { homeworkId } = req.params;
    const userId = req.user.id;

    // 获取提交详情
    const submissionRepository = getConnection().getRepository('AssignmentSubmission');
    const submission = await submissionRepository.findOne({
      where: {
        assignment_id: parseInt(homeworkId),
        student_id: userId
      }
    });

    if (!submission) {
      return res.status(404).json({ message: '未找到提交记录' });
    }

    // 处理附件
    let attachments = [];
    if (submission.attachments) {
      try {
        attachments = JSON.parse(submission.attachments);
      } catch (e) {
        console.error('解析附件失败:', e);
      }
    }

    const formattedSubmission = {
      id: submission.id,
      content: submission.content,
      attachments,
      submissionTime: submission.submission_time,
      isLate: submission.is_late,
      status: submission.status,
      score: submission.score,
      grade: submission.grade,
      feedback: submission.feedback,
      gradedAt: submission.graded_at
    };

    return res.status(200).json({
      submission: formattedSubmission
    });
  } catch (error) {
    console.error('获取提交详情失败:', error);
    return res.status(500).json({ message: '服务器错误，获取提交详情失败' });
  }
};