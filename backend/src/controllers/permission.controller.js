const Permission = require('../models/NewPermission');
const { getConnection } = require('typeorm');

// 获取仓库的辅助函数
const getPermissionRepository = () => {
  return getConnection().getRepository(Permission);
};

/**
 * 获取所有权限
 */
exports.getAllPermissions = async (req, res) => {
  try {
    // 检查权限
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: '无权限访问权限列表' });
    }

    const permissionRepository = getPermissionRepository();
    const permissions = await permissionRepository.find({
      order: { name: 'ASC' }
    });

    res.status(200).json({
      message: '获取权限列表成功',
      data: permissions
    });
  } catch (error) {
    console.error('获取权限列表失败:', error);
    res.status(500).json({ message: '服务器错误，获取权限列表失败' });
  }
};

/**
 * 创建权限
 */
exports.createPermission = async (req, res) => {
  try {
    // 检查权限
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: '无权限创建权限' });
    }

    const { name, description, resource, action } = req.body;
    
    if (!name || !resource || !action) {
      return res.status(400).json({ message: '权限名称、资源和操作不能为空' });
    }

    const permissionRepository = getPermissionRepository();
    
    // 检查权限是否已存在
    const existingPermission = await permissionRepository.findOne({ 
      where: { name } 
    });
    
    if (existingPermission) {
      return res.status(400).json({ message: '权限名称已存在' });
    }

    const permission = permissionRepository.create({
      name,
      description,
      resource,
      action
    });

    const savedPermission = await permissionRepository.save(permission);
    
    res.status(201).json({
      message: '权限创建成功',
      data: savedPermission
    });
  } catch (error) {
    console.error('创建权限失败:', error);
    res.status(500).json({ message: '服务器错误，创建权限失败' });
  }
};

/**
 * 更新权限
 */
exports.updatePermission = async (req, res) => {
  try {
    // 检查权限
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: '无权限更新权限' });
    }

    const { id } = req.params;
    const { name, description, resource, action } = req.body;
    
    const permissionRepository = getPermissionRepository();
    const permission = await permissionRepository.findOne({ where: { id } });
    
    if (!permission) {
      return res.status(404).json({ message: '权限不存在' });
    }

    // 更新权限信息
    if (name) permission.name = name;
    if (description !== undefined) permission.description = description;
    if (resource) permission.resource = resource;
    if (action) permission.action = action;

    const updatedPermission = await permissionRepository.save(permission);
    
    res.status(200).json({
      message: '权限更新成功',
      data: updatedPermission
    });
  } catch (error) {
    console.error('更新权限失败:', error);
    res.status(500).json({ message: '服务器错误，更新权限失败' });
  }
};

/**
 * 删除权限
 */
exports.deletePermission = async (req, res) => {
  try {
    // 检查权限
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: '无权限删除权限' });
    }

    const { id } = req.params;
    
    const permissionRepository = getPermissionRepository();
    const permission = await permissionRepository.findOne({ where: { id } });
    
    if (!permission) {
      return res.status(404).json({ message: '权限不存在' });
    }

    await permissionRepository.remove(permission);
    
    res.status(200).json({
      message: '权限删除成功'
    });
  } catch (error) {
    console.error('删除权限失败:', error);
    res.status(500).json({ message: '服务器错误，删除权限失败' });
  }
};