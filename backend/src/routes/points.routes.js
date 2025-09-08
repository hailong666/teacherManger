const express = require('express');
const router = express.Router();
const pointsController = require('../controllers/points.controller');
const { verifyToken, checkRole } = require('../middlewares/auth.middleware');

// 给学生添加积分（教师权限）
router.post(
  '/add',
  [verifyToken, checkRole(['teacher', 'admin'])],
  pointsController.addPoints
);

// 获取学生积分记录（学生可查看自己的，教师可查看所教班级的，管理员可查看所有）
router.get(
  '/student',
  [verifyToken],
  pointsController.getStudentPoints
);

// 获取班级积分排行榜（班级内学生和教师可查看）
router.get(
  '/leaderboard/:classId',
  [verifyToken],
  pointsController.getClassLeaderboard
);

// 获取积分统计信息
router.get(
  '/stats',
  [verifyToken],
  pointsController.getPointsStats
);

// 删除积分记录（仅限教师和管理员）
router.delete(
  '/:id',
  [verifyToken, checkRole(['teacher', 'admin'])],
  pointsController.deletePointsRecord
);

module.exports = router;