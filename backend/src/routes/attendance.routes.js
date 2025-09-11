const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendance.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

// 所有路由都需要认证
router.use(verifyToken);

// 创建签到记录
router.post('/create', attendanceController.createAttendance);

// 获取签到记录列表
router.get('/', attendanceController.getAttendanceList);

// 清除所有签到记录
router.delete('/clear/all', attendanceController.clearAllAttendance);

module.exports = router;