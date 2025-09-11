const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendance.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

// 所有路由都需要认证
router.use(verifyToken);

// 创建签到记录
router.post('/create', attendanceController.createAttendance);
router.post('/', attendanceController.createAttendance);

// 获取签到记录列表
router.get('/', attendanceController.getAttendanceList);
router.get('/list', attendanceController.getAttendanceList);

// 获取签到二维码
router.post('/qrcode', attendanceController.getAttendanceQRCode);

// 扫描二维码签到
router.post('/scan', attendanceController.scanQRCodeAttendance);

// 获取签到统计
router.get('/stats', attendanceController.getAttendanceStats);

// 更新签到状态
router.put('/:id', attendanceController.updateAttendanceStatus);

// 删除签到记录
router.delete('/:id', attendanceController.deleteAttendance);

// 清除所有签到记录
router.delete('/clear/all', attendanceController.clearAllAttendance);
router.delete('/clear', attendanceController.clearAllAttendance);

module.exports = router;