const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// 公开路由
router.post('/register', userController.register);
router.post('/login', userController.login);
router.post('/logout', userController.logout);

// 需要认证的路由
router.get('/me', authMiddleware.verifyToken, userController.getCurrentUser);
router.put('/change-password', authMiddleware.verifyToken, userController.changePassword);

// 用户管理路由（需要认证和权限）
router.get('/', authMiddleware.verifyToken, userController.getAllUsers);
router.put('/:id', authMiddleware.verifyToken, userController.updateUser);
router.delete('/:id', authMiddleware.verifyToken, userController.deleteUser);

module.exports = router;