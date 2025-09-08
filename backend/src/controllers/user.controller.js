const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getConnection } = require('typeorm');
const jwtConfig = require('../config/jwt');

// 获取用户仓库的辅助函数
const getUserRepository = () => {
  return getConnection().getRepository(User);
};

/**
 * 用户注册
 */
exports.register = async (req, res) => {
  try {
    const userRepository = getUserRepository();
    const { username, password, email, name, role } = req.body;

    // 检查用户名是否已存在
    const existingUser = await userRepository.findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ message: '用户名已存在' });
    }

    // 检查邮箱是否已存在
    const existingEmail = await userRepository.findOne({ where: { email } });
    if (existingEmail) {
      return res.status(400).json({ message: '邮箱已被注册' });
    }

    // 创建新用户
    const user = userRepository.create({
      username,
      password, // 密码会在实体的beforeInsert钩子中自动加密
      email,
      name,
      role: role || 'student', // 默认为学生角色
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await userRepository.save(user);

    // 返回用户信息（不包含密码）
    const { password: _, ...userWithoutPassword } = user;
    return res.status(201).json({
      message: '注册成功',
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('注册失败:', error);
    return res.status(500).json({ message: '服务器错误，注册失败' });
  }
};

/**
 * 用户登录
 */
exports.login = async (req, res) => {
  try {
    const userRepository = getUserRepository();
    const { username, password } = req.body;

    // 查找用户
    const user = await userRepository.findOne({ 
      where: { username },
      select: ['id', 'username', 'password', 'email', 'name', 'role', 'status']
    });

    if (!user) {
      return res.status(401).json({ message: '用户名或密码不正确' });
    }

    // 检查用户状态
    if (user.status !== 1) {
      return res.status(403).json({ message: '账户已被禁用，请联系管理员' });
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: '用户名或密码不正确' });
    }

    // 生成JWT令牌
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      jwtConfig.secret,
      { expiresIn: jwtConfig.expiresIn }
    );

    // 更新最后登录时间（暂时注释掉，因为数据库中没有lastLoginAt字段）
    // await userRepository.update(user.id, { lastLoginAt: new Date() });

    // 返回用户信息和令牌（不包含密码）
    const { password: _, ...userWithoutPassword } = user;
    return res.status(200).json({
      message: '登录成功',
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    console.error('登录失败:', error);
    return res.status(500).json({ message: '服务器错误，登录失败' });
  }
};

/**
 * 用户登出
 */
exports.logout = async (req, res) => {
  try {
    // 由于JWT是无状态的，服务端不需要特殊处理
    // 客户端删除token即可实现登出
    return res.status(200).json({
      message: '登出成功'
    });
  } catch (error) {
    console.error('登出失败:', error);
    return res.status(500).json({ message: '服务器错误，登出失败' });
  }
};

/**
 * 获取当前用户信息
 */
exports.getCurrentUser = async (req, res) => {
  try {
    const userRepository = getUserRepository();
    const userId = req.user.id;

    const user = await userRepository.findOne({ 
      where: { id: userId },
      select: ['id', 'username', 'email', 'name', 'role', 'status', 'avatar', 'createdAt', 'lastLoginAt']
    });

    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    return res.status(200).json({ user });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    return res.status(500).json({ message: '服务器错误，获取用户信息失败' });
  }
};

/**
 * 更新用户信息
 */
exports.updateUser = async (req, res) => {
  try {
    const userRepository = getUserRepository();
    const userId = req.params.id;
    const { name, email, avatar, status } = req.body;

    // 检查是否为当前用户或管理员
    if (req.user.id !== parseInt(userId) && req.user.role !== 'admin') {
      return res.status(403).json({ message: '无权限修改此用户信息' });
    }

    // 查找用户
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    // 更新用户信息
    const updateData = {
      updatedAt: new Date()
    };

    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (avatar) updateData.avatar = avatar;
    
    // 只有管理员可以修改用户状态
    if (status && req.user.role === 'admin') {
      updateData.status = status;
    }

    await userRepository.update(userId, updateData);

    // 获取更新后的用户信息
    const updatedUser = await userRepository.findOne({ 
      where: { id: userId },
      select: ['id', 'username', 'email', 'name', 'role', 'status', 'avatar', 'createdAt', 'updatedAt']
    });

    return res.status(200).json({
      message: '用户信息更新成功',
      user: updatedUser
    });
  } catch (error) {
    console.error('更新用户信息失败:', error);
    return res.status(500).json({ message: '服务器错误，更新用户信息失败' });
  }
};

/**
 * 修改密码
 */
exports.changePassword = async (req, res) => {
  try {
    const userRepository = getUserRepository();
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    // 查找用户
    const user = await userRepository.findOne({ 
      where: { id: userId },
      select: ['id', 'password']
    });

    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    // 验证当前密码
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json({ message: '当前密码不正确' });
    }

    // 加密新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 更新密码
    await userRepository.update(userId, {
      password: hashedPassword,
      updatedAt: new Date()
    });

    return res.status(200).json({ message: '密码修改成功' });
  } catch (error) {
    console.error('修改密码失败:', error);
    return res.status(500).json({ message: '服务器错误，修改密码失败' });
  }
};

/**
 * 获取用户列表（仅管理员）
 */
exports.getAllUsers = async (req, res) => {
  try {
    const userRepository = getUserRepository();
    // 检查权限
    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
      return res.status(403).json({ message: '无权限访问用户列表' });
    }

    // 分页参数
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // 过滤参数
    const { role, status, search } = req.query;
    const whereClause = {};
    
    if (role) whereClause.role = role;
    if (status) whereClause.status = status;
    
    // 搜索条件
    if (search) {
      whereClause.where = [
        { username: { $like: `%${search}%` } },
        { name: { $like: `%${search}%` } },
        { email: { $like: `%${search}%` } }
      ];
    }

    // 查询用户列表
    const [users, total] = await userRepository.findAndCount({
      where: whereClause,
      select: ['id', 'username', 'email', 'name', 'role', 'status', 'avatar', 'createdAt', 'lastLoginAt'],
      skip,
      take: limit,
      order: { createdAt: 'DESC' }
    });

    return res.status(200).json({
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    return res.status(500).json({ message: '服务器错误，获取用户列表失败' });
  }
};

/**
 * 删除用户（仅管理员）
 */
exports.deleteUser = async (req, res) => {
  try {
    const userRepository = getUserRepository();
    const userId = req.params.id;

    // 检查权限
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: '无权限删除用户' });
    }

    // 查找用户
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    // 不允许删除管理员账户
    if (user.role === 'admin') {
      return res.status(403).json({ message: '不允许删除管理员账户' });
    }

    // 删除用户
    await userRepository.delete(userId);

    return res.status(200).json({ message: '用户删除成功' });
  } catch (error) {
    console.error('删除用户失败:', error);
    return res.status(500).json({ message: '服务器错误，删除用户失败' });
  }
};