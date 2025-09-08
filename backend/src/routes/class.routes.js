const express = require('express');
const router = express.Router();
const classController = require('../controllers/class.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// 创建班级（教师和管理员可用）
router.post('/', 
  authMiddleware.verifyToken, 
  authMiddleware.checkRole(['teacher', 'admin']), 
  classController.createClass
);

// 获取班级列表
router.get('/', 
  authMiddleware.verifyToken, 
  classController.getClasses
);

// 获取班级详情
router.get('/:id', 
  authMiddleware.verifyToken, 
  classController.getClassById
);

// 更新班级信息
router.put('/:id', 
  authMiddleware.verifyToken, 
  authMiddleware.checkRole(['teacher', 'admin']), 
  classController.updateClass
);

// 添加学生到班级
router.post('/:id/students', 
  authMiddleware.verifyToken, 
  authMiddleware.checkRole(['teacher', 'admin']), 
  classController.addStudentsToClass
);

// 从班级移除学生
router.delete('/:id/students/:studentId', 
  authMiddleware.verifyToken, 
  authMiddleware.checkRole(['teacher', 'admin']), 
  classController.removeStudentFromClass
);

// 删除班级
router.delete('/:id', 
  authMiddleware.verifyToken, 
  authMiddleware.checkRole(['teacher', 'admin']), 
  classController.deleteClass
);

module.exports = router;