const Class = require('../models/Class');
const User = require('../models/User');
const { getConnection } = require('typeorm');

// 获取班级仓库的辅助函数
const getClassRepository = () => {
  return getConnection().getRepository(Class);
};

// 在每个方法中使用 getClassRepository() 获取仓库
// 获取用户仓库的辅助函数
const getUserRepository = () => {
  return getConnection().getRepository(User);
};

/**
 * 创建班级
 */
exports.createClass = async (req, res) => {
  try {
    const { name, description, teacherId, studentIds } = req.body;
    const currentUserId = req.user.id;
    const currentUserRole = req.user.role;
    
    const classRepository = getClassRepository();
    const userRepository = getUserRepository();

    // 验证教师是否存在
    let teacher;
    if (teacherId) {
      teacher = await userRepository.findOne({
        where: { id: teacherId, role_id: 2 }
      });
      
      if (!teacher) {
        return res.status(404).json({ message: '指定的教师不存在' });
      }
    } else if (currentUserRole === 'teacher') {
      // 如果未指定教师且当前用户是教师，则将当前用户设为教师
      teacher = { id: currentUserId };
    } else {
      return res.status(400).json({ message: '必须指定班级教师' });
    }

    // 创建班级
    const newClass = classRepository.create({
      name,
      description,
      teacher: { id: teacher.id },
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const savedClass = await classRepository.save(newClass);

    // 如果提供了学生ID列表，添加学生到班级
    if (studentIds && studentIds.length > 0) {
      // 验证学生是否存在
      const students = await userRepository.find({
        where: { id: { $in: studentIds }, role_id: 3 }
      });

      if (students.length !== studentIds.length) {
        // 有些学生ID无效，但我们仍然继续创建班级
        console.warn(`部分学生ID无效: 请求了${studentIds.length}个，找到${students.length}个`);
      }

      // 将学生添加到班级
      if (students.length > 0) {
        savedClass.students = students;
        await classRepository.save(savedClass);
      }
    }

    return res.status(201).json({
      message: '班级创建成功',
      class: {
        id: savedClass.id,
        name: savedClass.name,
        description: savedClass.description,
        teacherId: teacher.id,
        studentCount: savedClass.students ? savedClass.students.length : 0,
        createdAt: savedClass.createdAt
      }
    });
  } catch (error) {
    console.error('创建班级失败:', error);
    return res.status(500).json({ message: '服务器错误，创建班级失败' });
  }
};

/**
 * 获取班级列表
 */
exports.getClasses = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const classRepository = getClassRepository();
    const userRepository = getUserRepository();

    // 分页参数
    const skip = (page - 1) * limit;

    // 查询班级列表
    let query = classRepository.createQueryBuilder('class')
      .leftJoinAndSelect('class.teacher', 'teacher');

    // 根据用户角色添加条件
    if (userRole === 'teacher') {
      query = query.where('teacher.id = :userId', { userId });
    } else if (userRole === 'student') {
      // 学生只能看到自己所在的班级
      const student = await userRepository.findOne({
        where: { id: userId },
        relations: ['classes']
      });
      
      if (!student || !student.classes || student.classes.length === 0) {
        return res.status(200).json({
          classes: [],
          pagination: {
            total: 0,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: 0
          }
        });
      }
      
      const classIds = student.classes.map(cls => cls.id);
      if (classIds.length > 0) {
        query = query.where('class.id IN (:...classIds)', { classIds });
      } else {
        query = query.where('1 = 0'); // 没有班级时返回空结果
      }
    }

    // 搜索条件
    if (search) {
      if (userRole === 'teacher' || userRole === 'student') {
        query = query.andWhere('(class.name LIKE :search OR class.description LIKE :search)', {
          search: `%${search}%`
        });
      } else {
        query = query.where('(class.name LIKE :search OR class.description LIKE :search)', {
          search: `%${search}%`
        });
      }
    }

    // 添加排序和分页
    query = query
      .orderBy('class.created_at', 'DESC')
      .skip(skip)
      .take(limit);

    const [classes, total] = await query.getManyAndCount();

    // 格式化返回数据
    const formattedClasses = classes.map(cls => ({
      id: cls.id,
      name: cls.name,
      description: cls.description,
      teacherId: cls.teacher ? cls.teacher.id : null,
      teacherName: cls.teacher ? cls.teacher.name : null,
      studentCount: 0, // 暂时设为0，后续可以通过单独查询获取
      createdAt: cls.created_at
    }));

    return res.status(200).json({
      classes: formattedClasses,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取班级列表失败:', error);
    return res.status(500).json({ message: '服务器错误，获取班级列表失败' });
  }
};

/**
 * 获取班级详情
 */
exports.getClassById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const classRepository = getClassRepository();

    // 查询班级详情
    const classEntity = await classRepository.findOne({
      where: { id },
      relations: ['teacher', 'students']
    });

    if (!classEntity) {
      return res.status(404).json({ message: '班级不存在' });
    }

    // 权限检查
    if (userRole === 'teacher' && classEntity.teacher.id !== userId) {
      return res.status(403).json({ message: '您不是该班级的教师，无权查看详情' });
    } else if (userRole === 'student') {
      // 检查学生是否在班级中
      const isStudentInClass = classEntity.students.some(student => student.id === userId);
      if (!isStudentInClass) {
        return res.status(403).json({ message: '您不是该班级的学生，无权查看详情' });
      }
    }

    // 格式化学生信息
    const students = classEntity.students.map(student => ({
      id: student.id,
      username: student.username,
      name: student.name,
      email: student.email,
      avatar: student.avatar
    }));

    // 格式化返回数据
    const classData = {
      id: classEntity.id,
      name: classEntity.name,
      description: classEntity.description,
      teacher: {
        id: classEntity.teacher.id,
        name: classEntity.teacher.name,
        email: classEntity.teacher.email,
        avatar: classEntity.teacher.avatar
      },
      students,
      studentCount: students.length,
      createdAt: classEntity.createdAt,
      updatedAt: classEntity.updatedAt
    };

    return res.status(200).json({ class: classData });
  } catch (error) {
    console.error('获取班级详情失败:', error);
    return res.status(500).json({ message: '服务器错误，获取班级详情失败' });
  }
};

/**
 * 更新班级信息
 */
exports.updateClass = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, teacherId } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const classRepository = getClassRepository();
    const userRepository = getUserRepository();

    // 查询班级
    const classEntity = await classRepository.findOne({
      where: { id },
      relations: ['teacher']
    });

    if (!classEntity) {
      return res.status(404).json({ message: '班级不存在' });
    }

    // 权限检查
    if (userRole === 'teacher' && classEntity.teacher.id !== userId) {
      return res.status(403).json({ message: '您不是该班级的教师，无权更新信息' });
    }

    // 更新班级信息
    const updateData = {
      updatedAt: new Date()
    };

    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;

    // 更新教师（仅管理员可以更改班级教师）
    if (teacherId && userRole === 'admin') {
      const teacher = await userRepository.findOne({
        where: { id: teacherId, role: 'teacher' }
      });

      if (!teacher) {
        return res.status(404).json({ message: '指定的教师不存在' });
      }

      updateData.teacher = { id: teacherId };
    }

    await classRepository.update(id, updateData);

    // 获取更新后的班级信息
    const updatedClass = await classRepository.findOne({
      where: { id },
      relations: ['teacher']
    });

    return res.status(200).json({
      message: '班级信息更新成功',
      class: {
        id: updatedClass.id,
        name: updatedClass.name,
        description: updatedClass.description,
        teacherId: updatedClass.teacher.id,
        teacherName: updatedClass.teacher.name,
        updatedAt: updatedClass.updatedAt
      }
    });
  } catch (error) {
    console.error('更新班级信息失败:', error);
    return res.status(500).json({ message: '服务器错误，更新班级信息失败' });
  }
};

/**
 * 添加学生到班级
 */
exports.addStudentsToClass = async (req, res) => {
  try {
    const { id } = req.params;
    const { studentIds } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const classRepository = getClassRepository();
    const userRepository = getUserRepository();

    // 验证参数
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ message: '必须提供有效的学生ID列表' });
    }

    // 查询班级
    const classEntity = await classRepository.findOne({
      where: { id },
      relations: ['teacher', 'students']
    });

    if (!classEntity) {
      return res.status(404).json({ message: '班级不存在' });
    }

    // 权限检查
    if (userRole === 'teacher' && classEntity.teacher.id !== userId) {
      return res.status(403).json({ message: '您不是该班级的教师，无权添加学生' });
    }

    // 查询要添加的学生
    const students = await userRepository.find({
      where: { id: { $in: studentIds }, role_id: 3 }
    });

    if (students.length === 0) {
      return res.status(404).json({ message: '未找到有效的学生' });
    }

    // 过滤出尚未在班级中的学生
    const existingStudentIds = classEntity.students.map(student => student.id);
    const newStudents = students.filter(student => !existingStudentIds.includes(student.id));

    if (newStudents.length === 0) {
      return res.status(400).json({ message: '所有指定的学生已在班级中' });
    }

    // 添加新学生到班级
    classEntity.students = [...classEntity.students, ...newStudents];
    await classRepository.save(classEntity);

    // 格式化新添加的学生信息
    const addedStudents = newStudents.map(student => ({
      id: student.id,
      name: student.name,
      username: student.username,
      email: student.email
    }));

    return res.status(200).json({
      message: `成功添加${newStudents.length}名学生到班级`,
      addedStudents,
      totalStudents: classEntity.students.length
    });
  } catch (error) {
    console.error('添加学生到班级失败:', error);
    return res.status(500).json({ message: '服务器错误，添加学生到班级失败' });
  }
};

/**
 * 从班级移除学生
 */
exports.removeStudentFromClass = async (req, res) => {
  try {
    const { id, studentId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const classRepository = getClassRepository();

    // 查询班级
    const classEntity = await classRepository.findOne({
      where: { id },
      relations: ['teacher', 'students']
    });

    if (!classEntity) {
      return res.status(404).json({ message: '班级不存在' });
    }

    // 权限检查
    if (userRole === 'teacher' && classEntity.teacher.id !== userId) {
      return res.status(403).json({ message: '您不是该班级的教师，无权移除学生' });
    }

    // 检查学生是否在班级中
    const studentIndex = classEntity.students.findIndex(student => student.id === parseInt(studentId));
    if (studentIndex === -1) {
      return res.status(404).json({ message: '该学生不在班级中' });
    }

    // 移除学生
    classEntity.students.splice(studentIndex, 1);
    await classRepository.save(classEntity);

    return res.status(200).json({
      message: '学生已从班级中移除',
      removedStudentId: studentId,
      remainingStudents: classEntity.students.length
    });
  } catch (error) {
    console.error('从班级移除学生失败:', error);
    return res.status(500).json({ message: '服务器错误，从班级移除学生失败' });
  }
};

/**
 * 删除班级
 */
exports.deleteClass = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const classRepository = getClassRepository();

    // 查询班级
    const classEntity = await classRepository.findOne({
      where: { id },
      relations: ['teacher']
    });

    if (!classEntity) {
      return res.status(404).json({ message: '班级不存在' });
    }

    // 权限检查（只有管理员或班级的教师可以删除班级）
    if (userRole === 'teacher' && classEntity.teacher.id !== userId) {
      return res.status(403).json({ message: '您不是该班级的教师，无权删除班级' });
    }

    // 删除班级
    await classRepository.remove(classEntity);

    return res.status(200).json({
      message: '班级删除成功',
      deletedClassId: id
    });
  } catch (error) {
    console.error('删除班级失败:', error);
    return res.status(500).json({ message: '服务器错误，删除班级失败' });
  }
};

/**
 * 获取班级学生列表
 */
exports.getClassStudents = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const connection = getConnection();
    
    // 查询班级信息
    const classResult = await connection.query(
      'SELECT id, name, teacher_id FROM classes WHERE id = ?',
      [id]
    );
    
    if (classResult.length === 0) {
      return res.status(404).json({ message: '班级不存在' });
    }
    
    const classInfo = classResult[0];
    
    // 权限检查
    if (userRole === 'teacher' && classInfo.teacher_id !== userId) {
      return res.status(403).json({ message: '您不是该班级的教师，无权查看学生列表' });
    }
    
    // 查询班级学生
    const students = await connection.query(
      `SELECT u.id, u.name, u.username, u.email 
       FROM users u 
       INNER JOIN class_student cs ON u.id = cs.student_id 
       WHERE cs.class_id = ? AND u.role_id = 3
       ORDER BY u.name`,
      [id]
    );
    
    return res.status(200).json(students);
  } catch (error) {
    console.error('获取班级学生列表失败:', error);
    return res.status(500).json({ message: '服务器错误，获取班级学生列表失败' });
  }
};