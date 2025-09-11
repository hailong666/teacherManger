const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Class = require('../models/Class');
const { getConnection } = require('typeorm');

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

/**
 * 创建签到记录
 */
exports.createAttendance = async (req, res) => {
  try {
    const { studentId, classId, status = 'present', notes, signatureData } = req.body;
    const teacherId = req.user.id;

    const attendanceRepository = getAttendanceRepository();
    
    // 检查今天是否已有签到记录
    const today = new Date().toISOString().split('T')[0]; // 格式化为 YYYY-MM-DD

    const existingAttendance = await attendanceRepository.findOne({
      where: {
        student_id: studentId,
        class_id: classId,
        date: today
      }
    });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        message: '今天已有签到记录'
      });
    }

    const attendance = attendanceRepository.create({
      student_id: studentId,
      class_id: classId,
      date: today,
      status: status || 'present',
      notes,
      check_in_time: new Date().toTimeString().split(' ')[0] // 当前时间作为签到时间
    });

    await attendanceRepository.save(attendance);

    res.status(201).json({
      success: true,
      message: '签到记录创建成功',
      data: attendance
    });
  } catch (error) {
    console.error('创建签到记录失败:', error);
    res.status(500).json({
      success: false,
      message: '创建签到记录失败',
      error: error.message
    });
  }
};

/**
 * 获取签到记录列表
 */
exports.getAttendanceList = async (req, res) => {
  try {
    const { page = 1, limit = 10, classId, status, date } = req.query;
    const attendanceRepository = getAttendanceRepository();

    let whereCondition = {};
    
    if (classId) {
      whereCondition.class_id = classId;
    }
    
    if (status) {
      whereCondition.status = status;
    }
    
    if (date) {
      whereCondition.date = date;
    }

    const [attendances, total] = await attendanceRepository.findAndCount({
      where: whereCondition,
      relations: ['student', 'class'],
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: parseInt(limit)
    });

    res.json({
      success: true,
      data: {
        attendances,
        pagination: {
          current: parseInt(page),
          pageSize: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('获取签到列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取签到列表失败',
      error: error.message
    });
  }
};

/**
 * 清除所有签到记录
 */
exports.clearAllAttendance = async (req, res) => {
  try {
    const attendanceRepository = getAttendanceRepository();
    
    // 删除所有签到记录
    await attendanceRepository.clear();

    res.json({
      success: true,
      message: '所有签到记录已清除'
    });
  } catch (error) {
    console.error('清除签到记录失败:', error);
    res.status(500).json({
      success: false,
      message: '清除签到记录失败',
      error: error.message
    });
  }
};

/**
 * 获取签到二维码
 */
exports.getAttendanceQRCode = async (req, res) => {
  try {
    const { classId } = req.body;
    
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }
    
    const teacherId = req.user.id;
    
    // 生成二维码数据
    const qrData = {
      classId,
      teacherId,
      timestamp: Date.now(),
      type: 'attendance'
    };
    
    res.json({
      success: true,
      data: {
        qrCode: JSON.stringify(qrData),
        classId,
        teacherId
      }
    });
  } catch (error) {
    console.error('生成签到二维码失败:', error);
    res.status(500).json({
      success: false,
      message: '生成签到二维码失败',
      error: error.message
    });
  }
};

/**
 * 扫描二维码签到
 */
exports.scanQRCodeAttendance = async (req, res) => {
  try {
    const { qrData, location } = req.body;
    const studentId = req.user.id;
    
    // 解析二维码数据
    const qrInfo = JSON.parse(qrData);
    const { classId, teacherId } = qrInfo;
    
    // 创建签到记录
    const attendanceRepository = getAttendanceRepository();
    const attendance = attendanceRepository.create({
      student_id: studentId,
      class_id: classId,
      date: new Date().toISOString().split('T')[0],
      status: 'present',
      check_in_time: new Date().toTimeString().split(' ')[0],
      location: location,
      recorded_by: teacherId,
      is_manual: false
    });
    
    await attendanceRepository.save(attendance);
    
    res.json({
      success: true,
      message: '签到成功',
      data: attendance
    });
  } catch (error) {
    console.error('扫码签到失败:', error);
    res.status(500).json({
      success: false,
      message: '扫码签到失败',
      error: error.message
    });
  }
};

/**
 * 获取签到统计
 */
exports.getAttendanceStats = async (req, res) => {
  try {
    const { classId, startDate, endDate } = req.query;
    const attendanceRepository = getAttendanceRepository();
    
    let whereCondition = {};
    
    if (classId) {
      whereCondition.class_id = classId;
    }
    
    if (startDate && endDate) {
      whereCondition.date = {
        $gte: startDate,
        $lte: endDate
      };
    }
    
    const attendances = await attendanceRepository.find({
      where: whereCondition
    });
    
    // 统计各状态数量
    const stats = {
      total: attendances.length,
      present: attendances.filter(a => a.status === 'present').length,
      absent: attendances.filter(a => a.status === 'absent').length,
      late: attendances.filter(a => a.status === 'late').length,
      excused: attendances.filter(a => a.status === 'excused').length,
      sick_leave: attendances.filter(a => a.status === 'sick_leave').length
    };
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('获取签到统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取签到统计失败',
      error: error.message
    });
  }
};

/**
 * 更新签到状态
 */
exports.updateAttendanceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    
    const attendanceRepository = getAttendanceRepository();
    const attendance = await attendanceRepository.findOne({ where: { id } });
    
    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: '签到记录不存在'
      });
    }
    
    attendance.status = status;
    if (notes !== undefined) {
      attendance.notes = notes;
    }
    
    await attendanceRepository.save(attendance);
    
    res.json({
      success: true,
      message: '签到状态更新成功',
      data: attendance
    });
  } catch (error) {
    console.error('更新签到状态失败:', error);
    res.status(500).json({
      success: false,
      message: '更新签到状态失败',
      error: error.message
    });
  }
};

/**
 * 删除签到记录
 */
exports.deleteAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    
    const attendanceRepository = getAttendanceRepository();
    const attendance = await attendanceRepository.findOne({ where: { id } });
    
    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: '签到记录不存在'
      });
    }
    
    await attendanceRepository.remove(attendance);
    
    res.json({
      success: true,
      message: '签到记录删除成功'
    });
  } catch (error) {
    console.error('删除签到记录失败:', error);
    res.status(500).json({
      success: false,
      message: '删除签到记录失败',
      error: error.message
    });
  }
};