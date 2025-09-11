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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingAttendance = await attendanceRepository.findOne({
      where: {
        studentId,
        classId,
        createdAt: {
          $gte: today,
          $lt: tomorrow
        }
      }
    });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        message: '今天已有签到记录'
      });
    }

    const attendance = attendanceRepository.create({
      studentId,
      classId,
      teacherId,
      status,
      notes,
      signatureData
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
      whereCondition.classId = classId;
    }
    
    if (status) {
      whereCondition.status = status;
    }
    
    if (date) {
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      
      whereCondition.createdAt = {
        $gte: targetDate,
        $lt: nextDay
      };
    }

    const [attendances, total] = await attendanceRepository.findAndCount({
      where: whereCondition,
      relations: ['student', 'class', 'teacher'],
      order: { createdAt: 'DESC' },
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