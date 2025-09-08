const express = require('express');
const router = express.Router();
const randomController = require('../controllers/random.controller');
const { verifyToken, checkRole } = require('../middlewares/auth.middleware');

// 随机选择学生（仅限教师和管理员）
router.post(
  '/select',
  [verifyToken, checkRole(['teacher', 'admin'])],
  randomController.randomSelect
);

// 获取班级学生列表（用于随机点名，仅限教师和管理员）
router.get(
  '/students/:classId',
  [verifyToken, checkRole(['teacher', 'admin'])],
  randomController.getClassStudents
);

// 随机分组（仅限教师和管理员）
router.post(
  '/groups',
  [verifyToken, checkRole(['teacher', 'admin'])],
  randomController.randomGroups
);

// 获取随机点名历史记录（仅限教师和管理员）
router.get(
  '/history',
  [verifyToken, checkRole(['teacher', 'admin'])],
  randomController.getRandomCallHistory
);

// 创建随机点名记录（仅限教师和管理员）
router.post(
  '/call',
  [verifyToken, checkRole(['teacher', 'admin'])],
  randomController.createRandomCall
);

module.exports = router;