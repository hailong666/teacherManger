const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Class = require('../models/Class');
const { getConnection } = require('typeorm');
const { formatDateTime, calculateDistance } = require('../utils/helpers');

// 获取Attendance仓库的辅助函数
const getAttendanceRepository = () => {
  return getConnection().getRepository(Attendance);
};
// 获取User仓库的辅助函数
const getUserRepository = () => {
  return getConnection().getRepository(User);
};
// 获取Class仓库的辅助函数
const getClassRepository = () => {
  return getConnection().getRepository(Class);
};

// 存储活跃的签到会话
const activeAttendanceSessions = new Map();

/**
 * 生成签到二维码（教师用）
 */
exports.generateQRCode = async (req, res) => {
  try {
    const { classId, validMinutes = 5, location } = req.body;
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
      return res.status(403).json({ message: '您不是该班级的教师，无权生成签到码' });
    }

    // 生成唯一的签到会话ID
    const sessionId = uuidv4();
    
    // 创建签到数据
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + validMinutes);
    
    // 存储签到会话信息
    activeAttendanceSessions.set(sessionId, {
      classId,
      teacherId,
      createdAt: new Date(),
      expiresAt,
      location: location || null,
      attendedStudents: []
    });
    
    // 生成签到URL（实际应用中这应该是前端扫码后访问的URL）
    const attendanceUrl = `${process.env.FRONTEND_URL}/attendance/scan/${sessionId}`;
    
    // 生成二维码
    const qrCodeDataUrl = await QRCode.toDataURL(attendanceUrl);
    
    return res.status(200).json({
      message: '签到二维码生成成功',
      sessionId,
      qrCode: qrCodeDataUrl,
      expiresAt,
      validMinutes
    });
  } catch (error) {
    console.error('生成签到二维码失败:', error);
    return res.status(500).json({ message: '服务器错误，生成签到二维码失败' });
  }
};

/**
 * 学生扫码签到
 */
exports.scanQRCode = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const studentId = req.user.id;
    const { location } = req.body; // 学生当前位置（可选）
    
    // 检查签到会话是否存在
    const session = activeAttendanceSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ message: '签到会话不存在或已过期' });
    }
    
    // 检查签到是否过期
    if (new Date() > session.expiresAt) {
      return res.status(400).json({ message: '签到已过期' });
    }
    
    // 检查学生是否已签到
    if (session.attendedStudents.includes(studentId)) {
      return res.status(400).json({ message: '您已完成签到' });
    }
    
    // 验证学生是否属于该班级
    const student = await getUserRepository().findOne({
      where: { id: studentId },
      relations: ['classes']
    });
    
    const isStudentInClass = student.classes.some(cls => cls.id === session.classId);
    if (!isStudentInClass) {
      return res.status(403).json({ message: '您不是该班级的学生，无法签到' });
    }
    
    // 检查位置（如果有位置要求）
    let locationValid = true;
    if (session.location && location) {
      const distance = calculateDistance(
        session.location.latitude,
        session.location.longitude,
        location.latitude,
        location.longitude
      );
      
      // 如果距离超过100米，则认为位置无效
      if (distance > 0.1) {
        locationValid = false;
      }
    }
    
    // 创建签到记录
    const attendance = getAttendanceRepository().create({
      student: { id: studentId },
      class: { id: session.classId },
      class_time: new Date(),
      status: locationValid ? 'present' : 'location_invalid',
      sessionId,
      location: location || null
    });
    
    await getAttendanceRepository().save(attendance);
    
    // 更新会话中的已签到学生列表
    session.attendedStudents.push(studentId);
    
    return res.status(200).json({
      message: locationValid ? '签到成功' : '签到成功，但位置异常',
      attendanceId: attendance.id,
      status: attendance.status,
      attendanceTime: formatDateTime(attendance.class_time)
    });
  } catch (error) {
    console.error('签到失败:', error);
    return res.status(500).json({ message: '服务器错误，签到失败' });
  }
};

/**
 * 手动签到（教师为学生签到）
 */
exports.manualAttendance = async (req, res) => {
  try {
    const { classId, studentId, status = 'present', note } = req.body;
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
      return res.status(403).json({ message: '您不是该班级的教师，无权进行签到操作' });
    }
    
    // 验证学生是否存在
    const student = await getUserRepository().findOne({
      where: { id: studentId, role: 'student' },
      relations: ['classes']
    });
    
    if (!student) {
      return res.status(404).json({ message: '学生不存在' });
    }
    
    // 验证学生是否属于该班级
    const isStudentInClass = student.classes.some(cls => cls.id === classId);
    if (!isStudentInClass) {
      return res.status(400).json({ message: '该学生不属于此班级' });
    }
    
    // 创建签到记录
    const attendance = getAttendanceRepository().create({
      student: { id: studentId },
      class: { id: classId },
      class_time: new Date(),
      status,
      note,
      manuallyCreated: true,
      createdBy: { id: teacherId }
    });
    
    await getAttendanceRepository().save(attendance);
    
    return res.status(200).json({
      message: '手动签到成功',
      attendanceId: attendance.id,
      status: attendance.status,
      attendanceTime: formatDateTime(attendance.class_time)
    });
  } catch (error) {
    console.error('手动签到失败:', error);
    return res.status(500).json({ message: '服务器错误，手动签到失败' });
  }
};

/**
 * 获取签到记录列表
 */
exports.getAttendanceList = async (req, res) => {
  try {
    const { classId, studentId, date, status, page = 1, limit = 10 } = req.query;
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
          return res.status(403).json({ message: '您不是该班级的教师，无权查看签到记录' });
        }
      }
    }
    
    // 按学生筛选
    if (studentId) {
      // 如果是学生本人查询或教师/管理员查询
      if (userRole === 'student' && studentId !== userId.toString()) {
        return res.status(403).json({ message: '您只能查看自己的签到记录' });
      }
      
      whereClause.student = { id: studentId };
    } else if (userRole === 'student') {
      // 学生只能查看自己的签到记录
      whereClause.student = { id: userId };
    }
    
    // 按日期筛选
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      
      whereClause.class_time = {
        $gte: startDate,
        $lte: endDate
      };
    }
    
    // 按状态筛选
    if (status) {
      whereClause.status = status;
    }
    
    // 分页参数
    const skip = (page - 1) * limit;
    
    // 查询签到记录
    const [attendances, total] = await getAttendanceRepository().findAndCount({
      where: whereClause,
      relations: ['student', 'class'],
      skip,
      take: limit,
      order: { class_time: 'DESC' }
    });
    
    // 格式化返回数据
    const formattedAttendances = attendances.map(attendance => ({
      id: attendance.id,
      studentId: attendance.student.id,
      studentName: attendance.student.name,
      classId: attendance.class.id,
      className: attendance.class.name,
      attendanceTime: formatDateTime(attendance.class_time),
      status: attendance.status,
      note: attendance.note,
      manuallyCreated: attendance.manuallyCreated
    }));
    
    return res.status(200).json({
      attendances: formattedAttendances,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取签到记录失败:', error);
    return res.status(500).json({ message: '服务器错误，获取签到记录失败' });
  }
};

/**
 * 获取签到统计信息
 */
exports.getAttendanceStats = async (req, res) => {
  try {
    const { classId, startDate, endDate } = req.query;
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
      return res.status(403).json({ message: '您不是该班级的教师，无权查看签到统计' });
    }
    
    // 构建日期范围
    let dateFilter = {};
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      
      dateFilter = {
        $gte: start,
        $lte: end
      };
    }
    
    // 获取班级所有学生
    const students = classEntity.students;
    
    // 获取签到记录
    const attendances = await getAttendanceRepository().find({
      where: {
        class: { id: classId },
        ...(Object.keys(dateFilter).length > 0 ? { class_time: dateFilter } : {})
      },
      relations: ['student']
    });
    
    // 计算统计信息
    const stats = {
      totalStudents: students.length,
      totalAttendances: attendances.length,
      statusCounts: {
        present: 0,
        late: 0,
        absent: 0,
        leave: 0,
        location_invalid: 0
      },
      studentStats: []
    };
    
    // 统计各状态数量
    attendances.forEach(attendance => {
      if (stats.statusCounts[attendance.status] !== undefined) {
        stats.statusCounts[attendance.status]++;
      }
    });
    
    // 计算每个学生的出勤率
    students.forEach(student => {
      const studentAttendances = attendances.filter(a => a.student.id === student.id);
      const presentCount = studentAttendances.filter(a => a.status === 'present').length;
      const lateCount = studentAttendances.filter(a => a.status === 'late').length;
      const absentCount = studentAttendances.filter(a => a.status === 'absent').length;
      const leaveCount = studentAttendances.filter(a => a.status === 'leave').length;
      const locationInvalidCount = studentAttendances.filter(a => a.status === 'location_invalid').length;
      
      const totalDays = studentAttendances.length;
      const attendanceRate = totalDays > 0 ? ((presentCount + lateCount) / totalDays) * 100 : 0;
      
      stats.studentStats.push({
        studentId: student.id,
        studentName: student.name,
        presentCount,
        lateCount,
        absentCount,
        leaveCount,
        locationInvalidCount,
        totalDays,
        attendanceRate: Math.round(attendanceRate * 100) / 100 // 保留两位小数
      });
    });
    
    return res.status(200).json({
      classId,
      className: classEntity.name,
      stats
    });
  } catch (error) {
    console.error('获取签到统计失败:', error);
    return res.status(500).json({ message: '服务器错误，获取签到统计失败' });
  }
};

/**
 * 更新签到记录（教师用）
 */
exports.updateAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;
    const teacherId = req.user.id;
    
    // 查找签到记录
    const attendance = await getAttendanceRepository().findOne({
      where: { id },
      relations: ['class', 'class.teacher']
    });
    
    if (!attendance) {
      return res.status(404).json({ message: '签到记录不存在' });
    }
    
    // 验证权限
    if (attendance.class.teacher.id !== teacherId) {
      return res.status(403).json({ message: '您不是该班级的教师，无权修改签到记录' });
    }
    
    // 更新签到记录
    if (status) attendance.status = status;
    if (note !== undefined) attendance.note = note;
    attendance.updatedAt = new Date();
    
    await getAttendanceRepository().save(attendance);
    
    return res.status(200).json({
      message: '签到记录更新成功',
      attendance: {
        id: attendance.id,
        status: attendance.status,
        note: attendance.note,
        updatedAt: formatDateTime(attendance.updatedAt)
      }
    });
  } catch (error) {
    console.error('更新签到记录失败:', error);
    return res.status(500).json({ message: '服务器错误，更新签到记录失败' });
  }
};