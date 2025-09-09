const express = require('express');
const router = express.Router();
const roleController = require('../controllers/role.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// 所有角色路由都需要认证
router.use(authMiddleware.verifyToken);

// 获取所有角色
router.get('/', roleController.getAllRoles);

// 创建角色
router.post('/', authMiddleware.checkRole(['admin']), roleController.createRole);

// 更新角色
router.put('/:id', authMiddleware.checkRole(['admin']), roleController.updateRole);

// 删除角色
router.delete('/:id', authMiddleware.checkRole(['admin']), roleController.deleteRole);

module.exports = router;