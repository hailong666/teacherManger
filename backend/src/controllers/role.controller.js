const Role = require('../models/Role');
const Permission = require('../models/NewPermission');
const { getConnection } = require('typeorm');

// 获取仓库的辅助函数
const getRoleRepository = () => {
  return getConnection().getRepository(Role);
};

const getPermissionRepository = () => {
  return getConnection().getRepository(Permission);
};

/**
 * 获取所有角色
 */
exports.getAllRoles = async (req, res) => {
  try {
    // 检查权限
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: '无权限访问角色列表' });
    }

    const roleRepository = getRoleRepository();
    const roles = await roleRepository.find({
      relations: ['permissions'],
      order: { level: 'ASC' }
    });

    res.status(200).json({
      message: '获取角色列表成功',
      data: roles
    });
  } catch (error) {
    console.error('获取角色列表失败:', error);
    res.status(500).json({ message: '服务器错误，获取角色列表失败' });
  }
};

/**
 * 创建角色
 */
exports.createRole = async (req, res) => {
  try {
    // 检查权限
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: '无权限创建角色' });
    }

    const roleRepository = getRoleRepository();
    const { name, display_name, description, level, permissions } = req.body;

    // 检查角色名是否已存在
    const existingRole = await roleRepository.findOne({ where: { name } });
    if (existingRole) {
      return res.status(400).json({ message: '角色名已存在' });
    }

    // 创建角色
    const role = roleRepository.create({
      name,
      display_name,
      description,
      level: level || 1,
      status: 'active'
    });

    const savedRole = await roleRepository.save(role);

    // 如果提供了权限列表，关联权限
    if (permissions && permissions.length > 0) {
      const permissionRepository = getPermissionRepository();
      const permissionEntities = await permissionRepository.findByIds(permissions);
      savedRole.permissions = permissionEntities;
      await roleRepository.save(savedRole);
    }

    res.status(201).json({
      message: '角色创建成功',
      data: savedRole
    });
  } catch (error) {
    console.error('创建角色失败:', error);
    res.status(500).json({ message: '服务器错误，创建角色失败' });
  }
};

/**
 * 更新角色
 */
exports.updateRole = async (req, res) => {
  try {
    // 检查权限
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: '无权限更新角色' });
    }

    const roleRepository = getRoleRepository();
    const { id } = req.params;
    const { name, display_name, description, level, permissions } = req.body;

    const role = await roleRepository.findOne({ 
      where: { id },
      relations: ['permissions']
    });

    if (!role) {
      return res.status(404).json({ message: '角色不存在' });
    }

    // 更新角色信息
    if (name) role.name = name;
    if (display_name) role.display_name = display_name;
    if (description) role.description = description;
    if (level) role.level = level;

    // 更新权限关联
    if (permissions) {
      const permissionRepository = getPermissionRepository();
      const permissionEntities = await permissionRepository.findByIds(permissions);
      role.permissions = permissionEntities;
    }

    const updatedRole = await roleRepository.save(role);

    res.status(200).json({
      message: '角色更新成功',
      data: updatedRole
    });
  } catch (error) {
    console.error('更新角色失败:', error);
    res.status(500).json({ message: '服务器错误，更新角色失败' });
  }
};

/**
 * 删除角色
 */
exports.deleteRole = async (req, res) => {
  try {
    // 检查权限
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: '无权限删除角色' });
    }

    const roleRepository = getRoleRepository();
    const { id } = req.params;

    const role = await roleRepository.findOne({ where: { id } });
    if (!role) {
      return res.status(404).json({ message: '角色不存在' });
    }

    // 检查是否有用户使用此角色
    const userRepository = getConnection().getRepository('User');
    const userCount = await userRepository.count({ where: { role_id: id } });
    
    if (userCount > 0) {
      return res.status(400).json({ message: '该角色正在被使用，无法删除' });
    }

    await roleRepository.remove(role);

    res.status(200).json({ message: '角色删除成功' });
  } catch (error) {
    console.error('删除角色失败:', error);
    res.status(500).json({ message: '服务器错误，删除角色失败' });
  }
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
      order: { module: 'ASC', name: 'ASC' }
    });

    // 按模块分组
    const groupedPermissions = permissions.reduce((acc, permission) => {
      if (!acc[permission.module]) {
        acc[permission.module] = [];
      }
      acc[permission.module].push(permission);
      return acc;
    }, {});

    res.status(200).json({
      message: '获取权限列表成功',
      data: groupedPermissions
    });
  } catch (error) {
    console.error('获取权限列表失败:', error);
    res.status(500).json({ message: '服务器错误，获取权限列表失败' });
  }
};