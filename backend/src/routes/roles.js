const express = require('express');
const router = express.Router();
const roleController = require('../controllers/role.controller');
const { authenticateToken, requireRole } = require('../middleware/auth');

// 获取所有角色
router.get('/', authenticateToken, requireRole(['admin']), roleController.getAllRoles);

// 创建角色
router.post('/', authenticateToken, requireRole(['admin']), roleController.createRole);

// 更新角色
router.put('/:id', authenticateToken, requireRole(['admin']), roleController.updateRole);

// 删除角色
router.delete('/:id', authenticateToken, requireRole(['admin']), roleController.deleteRole);

// 获取所有权限
router.get('/permissions', authenticateToken, requireRole(['admin']), roleController.getAllPermissions);

module.exports = router;