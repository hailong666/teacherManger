const { User } = require('../models/User');
const Class = require('../models/Class');
const ClassStudent = require('../models/ClassStudent');
const RandomCall = require('../models/RandomCall');
const { getConnection } = require('typeorm');
const { generateRandomString, getPagination, formatDate } = require('../utils/helpers');

// 获取User仓库的辅助函数
const getUserRepository = () => {
  return getConnection().getRepository(User);
};
// 获取Class仓库的辅助函数
const getClassRepository = () => {
  return getConnection().getRepository(Class);
};
// 获取ClassStudent仓库的辅助函数
const getClassStudentRepository = () => {
  return getConnection().getRepository(ClassStudent);
};
// 获取RandomCall仓库的辅助函数
const getRandomCallRepository = () => {
  return getConnection().getRepository(RandomCall);
};

/**
 * 随机选择学生
 */
exports.randomSelect = async (req, res) => {
  try {
    const { classId, count = 1, excludeIds = [] } = req.body;
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
      return res.status(403).json({ message: '您不是该班级的教师，无权进行随机点名' });
    }

    // 通过ClassStudent中间表获取班级学生列表
    const classStudents = await getClassStudentRepository().find({
      where: { 
        class_id: classId,
        status: 'active'
      },
      relations: ['student']
    });

    // 获取学生列表（排除指定的学生）
    let students = classStudents.map(cs => cs.student);
    if (excludeIds.length > 0) {
      students = students.filter(student => !excludeIds.includes(student.id));
    }

    if (students.length === 0) {
      return res.status(400).json({ message: '没有可选择的学生' });
    }

    // 限制选择数量不超过可选学生总数
    const selectCount = Math.min(count, students.length);

    // 随机选择学生
    const selectedStudents = [];
    const selectedIndices = new Set();

    while (selectedIndices.size < selectCount) {
      const randomIndex = Math.floor(Math.random() * students.length);
      if (!selectedIndices.has(randomIndex)) {
        selectedIndices.add(randomIndex);
        const student = students[randomIndex];
        selectedStudents.push({
          id: student.id,
          name: student.name,
          avatar: student.avatar,
          studentNumber: student.student_id
        });
      }
    }

    // 生成唯一的选择ID，用于记录本次随机选择
    const selectionId = generateRandomString(16);

    return res.status(200).json({
      selectionId,
      selectedStudents,
      timestamp: new Date().toISOString(),
      classId,
      className: classEntity.name
    });
  } catch (error) {
    console.error('随机选择学生失败:', error);
    return res.status(500).json({ message: '服务器错误，随机选择学生失败' });
  }
};

/**
 * 获取班级学生列表（用于随机点名）
 */
exports.getClassStudents = async (req, res) => {
  try {
    const { classId } = req.params;
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
      return res.status(403).json({ message: '您不是该班级的教师，无权查看学生列表' });
    }

    // 通过ClassStudent中间表获取班级学生列表
    const classStudents = await getClassStudentRepository().find({
      where: { 
        class_id: classId,
        status: 'active'
      },
      relations: ['student']
    });

    // 格式化学生列表
    const students = classStudents.map(classStudent => ({
      id: classStudent.student.id,
      name: classStudent.student.name,
      avatar: classStudent.student.avatar,
      studentNumber: classStudent.student.student_id,
      email: classStudent.student.email,
      seatNumber: classStudent.seat_number,
      joinDate: classStudent.join_date
    }));

    return res.status(200).json({
      classId,
      className: classEntity.name,
      students,
      totalCount: students.length
    });
  } catch (error) {
    console.error('获取班级学生列表失败:', error);
    return res.status(500).json({ message: '服务器错误，获取班级学生列表失败' });
  }
};

/**
 * 随机分组
 */
exports.randomGroups = async (req, res) => {
  try {
    const { classId, groupCount, studentsPerGroup, excludeIds = [] } = req.body;
    const teacherId = req.user.id;

    // 验证参数
    if (!groupCount && !studentsPerGroup) {
      return res.status(400).json({ message: '请提供分组数量或每组学生数量' });
    }

    // 验证班级是否存在
    const classEntity = await getClassRepository().findOne({
      where: { id: classId },
      relations: ['teacher', 'students']
    });

    if (!classEntity) {
      return res.status(404).json({ message: '班级不存在' });
    }

    // 验证当前用户是否为该班级的教师
    if (classEntity.teacher.id !== teacherId) {
      return res.status(403).json({ message: '您不是该班级的教师，无权进行随机分组' });
    }

    // 获取班级学生列表（排除指定的学生）
    let students = classEntity.students;
    if (excludeIds.length > 0) {
      students = students.filter(student => !excludeIds.includes(student.id));
    }

    if (students.length === 0) {
      return res.status(400).json({ message: '没有可分组的学生' });
    }

    // 随机打乱学生顺序
    const shuffledStudents = [...students].sort(() => Math.random() - 0.5);

    // 根据参数决定分组方式
    let groups = [];
    if (groupCount) {
      // 按组数分组
      const actualGroupCount = Math.min(groupCount, students.length);
      groups = Array.from({ length: actualGroupCount }, () => []);

      // 将学生分配到各组
      shuffledStudents.forEach((student, index) => {
        const groupIndex = index % actualGroupCount;
        groups[groupIndex].push({
          id: student.id,
          name: student.name,
          avatar: student.avatar,
          studentNumber: student.studentNumber
        });
      });
    } else if (studentsPerGroup) {
      // 按每组人数分组
      const actualStudentsPerGroup = Math.min(studentsPerGroup, students.length);
      const actualGroupCount = Math.ceil(students.length / actualStudentsPerGroup);

      groups = Array.from({ length: actualGroupCount }, (_, groupIndex) => {
        const start = groupIndex * actualStudentsPerGroup;
        const end = Math.min(start + actualStudentsPerGroup, shuffledStudents.length);
        return shuffledStudents.slice(start, end).map(student => ({
          id: student.id,
          name: student.name,
          avatar: student.avatar,
          studentNumber: student.studentNumber
        }));
      });
    }

    // 生成唯一的分组ID
    const groupingId = generateRandomString(16);

    return res.status(200).json({
      groupingId,
      groups,
      groupCount: groups.length,
      timestamp: new Date().toISOString(),
      classId,
      className: classEntity.name
    });
  } catch (error) {
    console.error('随机分组失败:', error);
    return res.status(500).json({ message: '服务器错误，随机分组失败' });
  }
};

/**
 * 获取随机点名历史记录
 */
exports.getRandomCallHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10, classId } = req.query;
    const teacherId = req.user.id;
    const userRole = req.user.role;

    // 构建查询条件
    const whereClause = {};
    
    // 如果是教师，只能查看自己的点名记录
    if (userRole === 'teacher') {
      whereClause.teacher_id = teacherId;
    }
    
    // 按班级筛选
    if (classId) {
      whereClause.class_id = parseInt(classId);
    }

    // 分页参数
    const { offset, limit: pageLimit } = getPagination(parseInt(page), parseInt(limit));

    // 查询点名记录
    const [calls, total] = await getRandomCallRepository().findAndCount({
      where: whereClause,
      relations: ['class', 'teacher'],
      order: { created_at: 'DESC' },
      skip: offset,
      take: pageLimit
    });

    // 格式化返回数据
    const formattedCalls = calls.map(call => ({
      id: call.id,
      classId: call.class_id,
      className: call.class.name,
      teacherId: call.teacher_id,
      teacherName: call.teacher.name,
      studentNames: call.student_names,
      studentIds: JSON.parse(call.student_ids),
      callType: call.call_type,
      callCount: call.call_count,
      createdAt: formatDate(call.created_at)
    }));

    return res.status(200).json({
      calls: formattedCalls,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('获取随机点名历史失败:', error);
    return res.status(500).json({ message: '服务器错误，获取随机点名历史失败' });
  }
};

/**
 * 创建随机点名记录
 */
exports.createRandomCall = async (req, res) => {
  try {
    const { classId, studentIds, callType = 'random' } = req.body;
    const teacherId = req.user.id;

    // 验证必要参数
    if (!classId || !studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ message: '参数错误：班级ID和学生ID列表不能为空' });
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
      return res.status(403).json({ message: '您不是该班级的教师，无权创建点名记录' });
    }

    // 通过ClassStudent中间表获取班级学生列表
    const classStudents = await getClassStudentRepository().find({
      where: { 
        class_id: classId,
        status: 'active'
      },
      relations: ['student']
    });

    // 验证学生是否属于该班级
    const classStudentIds = classStudents.map(cs => cs.student.id);
    const invalidStudentIds = studentIds.filter(id => !classStudentIds.includes(id));
    
    if (invalidStudentIds.length > 0) {
      return res.status(400).json({ 
        message: `以下学生不属于该班级：${invalidStudentIds.join(', ')}` 
      });
    }

    // 获取学生姓名
    const selectedStudents = classStudents.filter(cs => studentIds.includes(cs.student.id)).map(cs => cs.student);
    const studentNames = selectedStudents.map(student => student.name).join('、');

    // 创建点名记录
    const randomCallRepository = getRandomCallRepository();
    const newCall = randomCallRepository.create({
      class_id: classId,
      teacher_id: teacherId,
      student_ids: JSON.stringify(studentIds),
      student_names: studentNames,
      call_type: callType,
      call_count: studentIds.length
    });

    const savedCall = await randomCallRepository.save(newCall);

    return res.status(201).json({
      message: '点名记录创建成功',
      call: {
        id: savedCall.id,
        classId: savedCall.class_id,
        className: classEntity.name,
        teacherId: savedCall.teacher_id,
        teacherName: classEntity.teacher.name,
        studentNames: savedCall.student_names,
        studentIds: JSON.parse(savedCall.student_ids),
        callType: savedCall.call_type,
        callCount: savedCall.call_count,
        createdAt: formatDate(savedCall.created_at)
      }
    });
  } catch (error) {
    console.error('创建随机点名记录失败:', error);
    return res.status(500).json({ message: '服务器错误，创建随机点名记录失败' });
  }
};