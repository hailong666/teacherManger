const express = require('express');
const router = express.Router();
const homeworkController = require('../controllers/homework.controller');
const { verifyToken, checkRole } = require('../middlewares/auth.middleware');
const { uploadHomework } = require('../middlewares/upload.middleware');

// 教师发布作业
router.post(
  '/create',
  [verifyToken, checkRole(['teacher', 'admin'])],
  homeworkController.createHomework
);

// 学生提交作业
router.post(
  '/submit/:homeworkId',
  [verifyToken, checkRole(['student']), uploadHomework.single('file')],
  homeworkController.submitHomework
);

// 教师评分
router.post(
  '/grade/:submissionId',
  [verifyToken, checkRole(['teacher', 'admin'])],
  homeworkController.gradeHomework
);

// 获取班级作业列表
router.get(
  '/class/:classId',
  [verifyToken],
  homeworkController.getClassHomeworks
);

// 获取作业详情
router.get(
  '/:homeworkId',
  [verifyToken],
  homeworkController.getHomeworkDetail
);

// 下载作业文件
router.get(
  '/download/:submissionId',
  [verifyToken],
  homeworkController.downloadHomework
);

// 更新作业信息
router.put(
  '/:homeworkId',
  [verifyToken, checkRole(['teacher', 'admin'])],
  homeworkController.updateHomework
);

// 删除作业
router.delete(
  '/:homeworkId',
  [verifyToken, checkRole(['teacher', 'admin'])],
  homeworkController.deleteHomework
);

module.exports = router;