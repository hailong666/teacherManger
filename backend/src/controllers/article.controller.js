const Article = require('../models/Article');
const User = require('../models/User');
const { getConnection } = require('typeorm');
const { formatDateTime } = require('../utils/helpers');

// 获取Article仓库的辅助函数
const getArticleRepository = () => {
  return getConnection().getRepository(Article);
};

// 获取User仓库的辅助函数
const getUserRepository = () => {
  return getConnection().getRepository(User);
};

/**
 * 创建课文
 */
exports.createArticle = async (req, res) => {
  try {
    const {
      title,
      content,
      author,
      category,
      difficulty_level,
      grade_level,
      description,
      tags,
      estimated_time
    } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // 只有管理员和教师可以创建课文
    if (userRole !== 'admin' && userRole !== 'teacher') {
      return res.status(403).json({ message: '您没有权限创建课文' });
    }

    // 验证必填字段
    if (!title || !content) {
      return res.status(400).json({ message: '课文标题和内容不能为空' });
    }

    // 计算字数
    const word_count = content.replace(/\s/g, '').length;

    // 创建课文记录
    const article = getArticleRepository().create({
      title,
      content,
      author,
      category,
      difficulty_level: difficulty_level || 'medium',
      grade_level,
      description,
      tags,
      word_count,
      estimated_time,
      created_by: userId,
      updated_by: userId
    });

    await getArticleRepository().save(article);

    return res.status(201).json({
      message: '课文创建成功',
      article: {
        id: article.id,
        title: article.title,
        author: article.author,
        category: article.category,
        difficulty_level: article.difficulty_level,
        grade_level: article.grade_level,
        word_count: article.word_count,
        estimated_time: article.estimated_time,
        status: article.status,
        created_at: formatDateTime(article.created_at)
      }
    });
  } catch (error) {
    console.error('创建课文失败:', error);
    return res.status(500).json({ message: '服务器错误，创建课文失败' });
  }
};

/**
 * 获取课文列表
 */
exports.getArticles = async (req, res) => {
  try {
    const {
      category,
      difficulty_level,
      grade_level,
      status,
      keyword,
      page = 1,
      limit = 10
    } = req.query;

    // 构建查询条件
    const whereClause = {};

    if (category) {
      whereClause.category = category;
    }

    if (difficulty_level) {
      whereClause.difficulty_level = difficulty_level;
    }

    if (grade_level) {
      whereClause.grade_level = grade_level;
    }

    if (status) {
      whereClause.status = status;
    } else {
      // 默认只显示激活状态的课文
      whereClause.status = 'active';
    }

    // 分页参数
    const skip = (page - 1) * limit;

    let queryBuilder = getArticleRepository()
      .createQueryBuilder('article')
      .leftJoinAndSelect('article.creator', 'creator')
      .where(whereClause)
      .skip(skip)
      .take(limit)
      .orderBy('article.created_at', 'DESC');

    // 关键词搜索
    if (keyword) {
      queryBuilder = queryBuilder.andWhere(
        '(article.title LIKE :keyword OR article.content LIKE :keyword OR article.author LIKE :keyword)',
        { keyword: `%${keyword}%` }
      );
    }

    const [articles, total] = await queryBuilder.getManyAndCount();

    // 格式化返回数据
    const formattedArticles = articles.map(article => ({
      id: article.id,
      title: article.title,
      author: article.author,
      category: article.category,
      difficulty_level: article.difficulty_level,
      grade_level: article.grade_level,
      description: article.description,
      tags: article.tags ? article.tags.split(',') : [],
      word_count: article.word_count,
      estimated_time: article.estimated_time,
      status: article.status,
      creator: {
        id: article.creator.id,
        name: article.creator.name
      },
      created_at: formatDateTime(article.created_at),
      updated_at: formatDateTime(article.updated_at)
    }));

    return res.status(200).json({
      articles: formattedArticles,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取课文列表失败:', error);
    return res.status(500).json({ message: '服务器错误，获取课文列表失败' });
  }
};

/**
 * 获取课文详情
 */
exports.getArticleById = async (req, res) => {
  try {
    const { id } = req.params;

    const article = await getArticleRepository().findOne({
      where: { id },
      relations: ['creator', 'updater']
    });

    if (!article) {
      return res.status(404).json({ message: '课文不存在' });
    }

    return res.status(200).json({
      article: {
        id: article.id,
        title: article.title,
        content: article.content,
        author: article.author,
        category: article.category,
        difficulty_level: article.difficulty_level,
        grade_level: article.grade_level,
        description: article.description,
        tags: article.tags ? article.tags.split(',') : [],
        word_count: article.word_count,
        estimated_time: article.estimated_time,
        status: article.status,
        creator: {
          id: article.creator.id,
          name: article.creator.name
        },
        updater: article.updater ? {
          id: article.updater.id,
          name: article.updater.name
        } : null,
        created_at: formatDateTime(article.created_at),
        updated_at: formatDateTime(article.updated_at)
      }
    });
  } catch (error) {
    console.error('获取课文详情失败:', error);
    return res.status(500).json({ message: '服务器错误，获取课文详情失败' });
  }
};

/**
 * 更新课文
 */
exports.updateArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      content,
      author,
      category,
      difficulty_level,
      grade_level,
      description,
      tags,
      estimated_time,
      status
    } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // 只有管理员和教师可以更新课文
    if (userRole !== 'admin' && userRole !== 'teacher') {
      return res.status(403).json({ message: '您没有权限更新课文' });
    }

    const article = await getArticleRepository().findOne({
      where: { id },
      relations: ['creator']
    });

    if (!article) {
      return res.status(404).json({ message: '课文不存在' });
    }

    // 非管理员只能更新自己创建的课文
    if (userRole !== 'admin' && article.creator.id !== userId) {
      return res.status(403).json({ message: '您只能更新自己创建的课文' });
    }

    // 更新字段
    if (title !== undefined) article.title = title;
    if (content !== undefined) {
      article.content = content;
      article.word_count = content.replace(/\s/g, '').length;
    }
    if (author !== undefined) article.author = author;
    if (category !== undefined) article.category = category;
    if (difficulty_level !== undefined) article.difficulty_level = difficulty_level;
    if (grade_level !== undefined) article.grade_level = grade_level;
    if (description !== undefined) article.description = description;
    if (tags !== undefined) article.tags = tags;
    if (estimated_time !== undefined) article.estimated_time = estimated_time;
    if (status !== undefined) article.status = status;
    
    article.updated_by = userId;
    article.updated_at = new Date();

    await getArticleRepository().save(article);

    return res.status(200).json({
      message: '课文更新成功',
      article: {
        id: article.id,
        title: article.title,
        author: article.author,
        category: article.category,
        difficulty_level: article.difficulty_level,
        grade_level: article.grade_level,
        word_count: article.word_count,
        estimated_time: article.estimated_time,
        status: article.status,
        updated_at: formatDateTime(article.updated_at)
      }
    });
  } catch (error) {
    console.error('更新课文失败:', error);
    return res.status(500).json({ message: '服务器错误，更新课文失败' });
  }
};

/**
 * 删除课文
 */
exports.deleteArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // 只有管理员可以删除课文
    if (userRole !== 'admin') {
      return res.status(403).json({ message: '只有管理员可以删除课文' });
    }

    const article = await getArticleRepository().findOne({
      where: { id }
    });

    if (!article) {
      return res.status(404).json({ message: '课文不存在' });
    }

    await getArticleRepository().remove(article);

    return res.status(200).json({
      message: '课文删除成功'
    });
  } catch (error) {
    console.error('删除课文失败:', error);
    return res.status(500).json({ message: '服务器错误，删除课文失败' });
  }
};

/**
 * 获取课文统计信息
 */
exports.getArticleStatistics = async (req, res) => {
  try {
    const userRole = req.user.role;

    // 只有管理员和教师可以查看统计信息
    if (userRole !== 'admin' && userRole !== 'teacher') {
      return res.status(403).json({ message: '您没有权限查看课文统计信息' });
    }

    const repository = getArticleRepository();

    // 总课文数
    const total = await repository.count();

    // 按状态统计
    const activeCount = await repository.count({ where: { status: 'active' } });
    const inactiveCount = await repository.count({ where: { status: 'inactive' } });
    const draftCount = await repository.count({ where: { status: 'draft' } });

    // 按分类统计
    const categoryStats = await repository
      .createQueryBuilder('article')
      .select('article.category', 'category')
      .addSelect('COUNT(*)', 'count')
      .where('article.status = :status', { status: 'active' })
      .groupBy('article.category')
      .getRawMany();

    // 按难度统计
    const difficultyStats = await repository
      .createQueryBuilder('article')
      .select('article.difficulty_level', 'difficulty')
      .addSelect('COUNT(*)', 'count')
      .where('article.status = :status', { status: 'active' })
      .groupBy('article.difficulty_level')
      .getRawMany();

    return res.status(200).json({
      stats: {
        total,
        active: activeCount,
        inactive: inactiveCount,
        draft: draftCount,
        categoryStats: categoryStats.map(item => ({
          category: item.category || '未分类',
          count: parseInt(item.count)
        })),
        difficultyStats: difficultyStats.map(item => ({
          difficulty: item.difficulty,
          count: parseInt(item.count)
        }))
      }
    });
  } catch (error) {
    console.error('获取课文统计信息失败:', error);
    return res.status(500).json({ message: '服务器错误，获取课文统计信息失败' });
  }
};

/**
 * 获取课文背诵统计
 */
exports.getArticleStats = async (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user.id;
    let { classId } = req.query;

    // 只有管理员和教师可以查看统计信息
    if (userRole !== 'admin' && userRole !== 'teacher') {
      return res.status(403).json({ message: '您没有权限查看课文统计信息' });
    }

    // 如果是教师，需要验证权限并限制只能查看自己的班级
    if (userRole === 'teacher') {
      const Class = require('../models/Class');
      const classRepository = getConnection().getRepository(Class);
      
      if (classId) {
        // 验证教师是否有权限查看指定班级
        const teacherClass = await classRepository.findOne({
          where: { id: classId, teacher_id: userId }
        });
        
        if (!teacherClass) {
          return res.status(403).json({ message: '您没有权限查看该班级的统计信息' });
        }
      } else {
        // 如果没有指定班级，获取教师的第一个班级
        const teacherClasses = await classRepository.find({
          where: { teacher_id: userId, status: 'active' }
        });
        
        if (teacherClasses.length === 0) {
          return res.status(404).json({ message: '您当前没有任何班级' });
        }
        
        // 默认使用第一个班级
        classId = teacherClasses[0].id;
      }
    }

    const Recitation = require('../models/Recitation');
    const recitationRepository = getConnection().getRepository(Recitation);
    const articleRepository = getArticleRepository();
    const userRepository = getUserRepository();

    // 获取课文列表
    const articles = await articleRepository.find({
      where: { status: 'active' },
      order: { created_at: 'DESC' }
    });

    // 获取学生总数（根据班级筛选）
    let studentQuery;
    
    if (classId) {
      // 通过 ClassStudent 表关联查询指定班级的学生
      const ClassStudent = require('../models/ClassStudent');
      const classStudentRepository = getConnection().getRepository(ClassStudent);
      
      studentQuery = userRepository.createQueryBuilder('user')
        .innerJoin('user.role', 'role')
        .innerJoin('user.classStudents', 'classStudent')
        .where('role.name = :roleName', { roleName: 'student' })
        .andWhere('classStudent.class_id = :classId', { classId })
        .andWhere('classStudent.status = :status', { status: 'active' });
    } else {
      // 查询所有学生
      studentQuery = userRepository.createQueryBuilder('user')
        .innerJoin('user.role', 'role')
        .where('role.name = :roleName', { roleName: 'student' });
    }
    
    const totalStudents = await studentQuery.getCount();

    // 统计每篇课文的背诵情况
    const articleStats = [];
    
    for (const article of articles) {
      // 查询该课文的背诵次数
      let recitationQuery = recitationRepository.createQueryBuilder('recitation')
        .leftJoin('recitation.student', 'student')
        .where('recitation.article_id = :articleId', { articleId: article.id });
      
      if (classId) {
        // 通过 ClassStudent 表关联查询指定班级的背诵记录
        recitationQuery = recitationQuery
          .leftJoin('student.classStudents', 'classStudent')
          .andWhere('classStudent.class_id = :classId', { classId })
          .andWhere('classStudent.status = :status', { status: 'active' });
      }
      
      const completedCount = await recitationQuery.getCount();
      const completionRate = totalStudents > 0 ? ((completedCount / totalStudents) * 100).toFixed(1) : 0;
      
      articleStats.push({
        id: article.id,
        title: article.title,
        category: article.category,
        difficulty_level: article.difficulty_level,
        totalStudents,
        completedCount,
        uncompletedCount: totalStudents - completedCount,
        completionRate: parseFloat(completionRate)
      });
    }

    return res.status(200).json({
      stats: articleStats,
      summary: {
        totalArticles: articles.length,
        totalStudents,
        averageCompletionRate: articleStats.length > 0 
          ? (articleStats.reduce((sum, item) => sum + item.completionRate, 0) / articleStats.length).toFixed(1)
          : 0
      }
    });
  } catch (error) {
    console.error('获取课文背诵统计失败:', error);
    return res.status(500).json({
      message: '获取课文背诵统计失败，请稍后重试'
    });
  }
};

/**
 * 获取未完成背诵的学生列表
 */
exports.getUncompletedStudents = async (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user.id;
    const { articleId } = req.query;
    let { classId } = req.query;

    // 只有管理员和教师可以查看
    if (userRole !== 'admin' && userRole !== 'teacher') {
      return res.status(403).json({ message: '您没有权限查看学生信息' });
    }

    if (!articleId) {
      return res.status(400).json({ message: '课文ID不能为空' });
    }

    // 如果是教师，需要验证权限并限制只能查看自己的班级
    if (userRole === 'teacher') {
      const Class = require('../models/Class');
      const classRepository = getConnection().getRepository(Class);
      
      if (classId) {
        // 验证教师是否有权限查看指定班级
        const teacherClass = await classRepository.findOne({
          where: { id: classId, teacher_id: userId }
        });
        
        if (!teacherClass) {
          return res.status(403).json({ message: '您没有权限查看该班级的学生信息' });
        }
      } else {
        // 如果没有指定班级，获取教师的第一个班级
        const teacherClasses = await classRepository.find({
          where: { teacher_id: userId, status: 'active' }
        });
        
        if (teacherClasses.length === 0) {
          return res.status(404).json({ message: '您当前没有任何班级' });
        }
        
        // 默认使用第一个班级
        classId = teacherClasses[0].id;
      }
    }

    const Recitation = require('../models/Recitation');
    const recitationRepository = getConnection().getRepository(Recitation);
    const userRepository = getUserRepository();

    // 获取已完成背诵的学生ID列表
    let completedQuery = recitationRepository.createQueryBuilder('recitation')
      .select('DISTINCT recitation.student_id', 'studentId')
      .leftJoin('recitation.student', 'student')
      .where('recitation.article_id = :articleId', { articleId });
    
    if (classId) {
      // 通过 ClassStudent 表关联查询指定班级的已完成背诵学生
      completedQuery = completedQuery
        .leftJoin('student.classStudents', 'classStudent')
        .andWhere('classStudent.class_id = :classId', { classId })
        .andWhere('classStudent.status = :status', { status: 'active' });
    }
    
    const completedStudentIds = (await completedQuery.getRawMany()).map(item => item.studentId);

    // 获取未完成背诵的学生列表
    let uncompletedQuery;
    
    if (classId) {
      // 通过 ClassStudent 表关联查询指定班级的未完成学生
      uncompletedQuery = userRepository.createQueryBuilder('user')
        .innerJoin('user.role', 'role')
        .leftJoin('user.classStudents', 'classStudent')
        .leftJoin('classStudent.class', 'class')
        .select([
          'user.id',
          'user.name',
          'user.student_id',
          'class.name as className'
        ])
        .where('role.name = :roleName', { roleName: 'student' })
        .andWhere('classStudent.class_id = :classId', { classId })
        .andWhere('classStudent.status = :status', { status: 'active' });
    } else {
      // 查询所有学生
      uncompletedQuery = userRepository.createQueryBuilder('user')
        .innerJoin('user.role', 'role')
        .select([
          'user.id',
          'user.name',
          'user.student_id'
        ])
        .where('role.name = :roleName', { roleName: 'student' });
    }
    
    if (completedStudentIds.length > 0) {
      uncompletedQuery = uncompletedQuery.andWhere('user.id NOT IN (:...completedIds)', { completedIds: completedStudentIds });
    }
    
    const uncompletedStudents = await uncompletedQuery.getRawMany();

    return res.status(200).json({
      students: uncompletedStudents.map(student => ({
        id: student.user_id,
        name: student.user_name,
        studentId: student.user_student_id,
        className: student.className
      })),
      total: uncompletedStudents.length
    });
  } catch (error) {
    console.error('获取未完成学生列表失败:', error);
    return res.status(500).json({ message: '服务器错误，获取未完成学生列表失败' });
  }
};