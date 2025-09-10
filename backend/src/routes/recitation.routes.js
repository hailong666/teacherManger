const express = require('express');
const router = express.Router();
const recitationController = require('../controllers/recitation.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const uploadMiddleware = require('../middlewares/upload.middleware');

// 学生提交背诵打卡
router.post('/', 
  authMiddleware.verifyToken, 
  authMiddleware.checkRole(['student']), 
  recitationController.submitRecitation
);

// 教师评分背诵打卡
router.put('/:id/grade', 
  authMiddleware.verifyToken, 
  authMiddleware.checkRole(['teacher', 'admin']), 
  recitationController.gradeRecitation
);

// 获取背诵打卡列表
router.get('/', 
  authMiddleware.verifyToken, 
  recitationController.getRecitations
);

// 获取背诵打卡统计信息
router.get('/stats', 
  authMiddleware.verifyToken, 
  recitationController.getRecitationStats
);

// 获取背诵打卡详情
router.get('/:id', 
  authMiddleware.verifyToken, 
  recitationController.getRecitationById
);

module.exports = router;