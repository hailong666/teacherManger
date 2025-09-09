const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendance.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// 教师生成签到二维码
router.post('/generate-qrcode', 
  authMiddleware.verifyToken, 
  authMiddleware.checkRole(['teacher', 'admin']), 
  attendanceController.generateQRCode
);

// 学生扫码签到
router.post('/scan/:sessionId', 
  authMiddleware.verifyToken, 
  authMiddleware.checkRole(['student']), 
  attendanceController.scanQRCode
);

// 教师手动为学生签到
router.post('/manual', 
  authMiddleware.verifyToken, 
  authMiddleware.checkRole(['teacher', 'admin']), 
  attendanceController.manualAttendance
);

// 创建签到记录（支持手写签名）
router.post('/create', 
  authMiddleware.verifyToken, 
  attendanceController.createAttendance
);

// 获取签到记录列表
router.get('/', 
  authMiddleware.verifyToken, 
  attendanceController.getAttendanceList
);

// 获取签到统计信息
router.get('/stats', 
  authMiddleware.verifyToken, 
  attendanceController.getAttendanceStats
);

// 更新签到记录
router.put('/:id', 
  authMiddleware.verifyToken, 
  authMiddleware.checkRole(['teacher', 'admin']), 
  attendanceController.updateAttendance
);

module.exports = router;