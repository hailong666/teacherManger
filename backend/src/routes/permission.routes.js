const express = require('express');
const router = express.Router();
const permissionController = require('../controllers/permission.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// 所有权限路由都需要认证
router.use(authMiddleware.verifyToken);

// 获取所有权限
router.get('/', permissionController.getAllPermissions);

// 创建权限
router.post('/', authMiddleware.checkRole(['admin']), permissionController.createPermission);

// 更新权限
router.put('/:id', authMiddleware.checkRole(['admin']), permissionController.updatePermission);

// 删除权限
router.delete('/:id', authMiddleware.checkRole(['admin']), permissionController.deletePermission);

module.exports = router;