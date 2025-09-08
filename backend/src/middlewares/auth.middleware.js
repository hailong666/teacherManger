const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const { getConnection } = require('typeorm');
const User = require('../models/User');

/**
 * 验证JWT令牌的中间件
 */
exports.verifyToken = async (req, res, next) => {
  try {
    // 从请求头获取token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        code: 401,
        message: '未提供授权令牌'
      });
    }

    const token = authHeader.split(' ')[1];
    
    // 验证token
    const decoded = jwt.verify(token, jwtConfig.secret);
    
    // 查询用户
    const userRepository = getConnection().getRepository(User);
    const user = await userRepository.findOne({ where: { id: decoded.id } });
    
    if (!user) {
      return res.status(401).json({
        code: 401,
        message: '用户不存在'
      });
    }
    
    if (!user.status) {
      return res.status(403).json({
        code: 403,
        message: '用户已被禁用'
      });
    }
    
    // 将用户信息添加到请求对象
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        code: 401,
        message: '授权令牌已过期'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        code: 401,
        message: '无效的授权令牌'
      });
    }
    
    console.error('验证令牌时出错:', error);
    return res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
};

/**
 * 检查用户角色权限的中间件
 * @param {Array} roles - 允许访问的角色数组
 */
exports.checkRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        code: 401,
        message: '未授权'
      });
    }
    
    if (roles.includes(req.user.role)) {
      next();
    } else {
      return res.status(403).json({
        code: 403,
        message: '权限不足'
      });
    }
  };
};

/**
 * 检查资源权限的中间件
 * @param {String} resource - 资源名称
 * @param {String} action - 操作类型 (view, edit, delete)
 */
exports.checkPermission = (resource, action) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          code: 401,
          message: '未授权'
        });
      }
      
      // 教师拥有所有权限
      if (req.user.role === 'teacher') {
        return next();
      }
      
      const permissionRepository = getConnection().getRepository('Permission');
      const permission = await permissionRepository.findOne({
        where: {
          role: req.user.role,
          resource,
          action
        }
      });
      
      if (permission) {
        next();
      } else {
        return res.status(403).json({
          code: 403,
          message: '权限不足'
        });
      }
    } catch (error) {
      console.error('检查权限时出错:', error);
      return res.status(500).json({
        code: 500,
        message: '服务器内部错误'
      });
    }
  };
};