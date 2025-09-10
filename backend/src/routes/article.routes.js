const express = require('express');
const router = express.Router();
const articleController = require('../controllers/article.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

// 所有路由都需要认证
router.use(verifyToken);

// 获取课文统计信息
router.get('/statistics', articleController.getArticleStatistics);

// 获取课文背诵统计
router.get('/stats', articleController.getArticleStats);

// 获取未完成背诵的学生列表
router.get('/uncompleted-students', articleController.getUncompletedStudents);

// 获取课文列表
router.get('/', articleController.getArticles);

// 创建课文
router.post('/', articleController.createArticle);

// 获取课文详情
router.get('/:id', articleController.getArticleById);

// 更新课文
router.put('/:id', articleController.updateArticle);

// 删除课文
router.delete('/:id', articleController.deleteArticle);

module.exports = router;