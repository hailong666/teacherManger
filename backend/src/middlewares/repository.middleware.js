/**
 * 仓库初始化中间件
 * 用于在请求处理前初始化TypeORM仓库
 */
const { getConnection } = require('typeorm');

/**
 * 创建一个仓库初始化中间件
 * @param {Function} entityGetter - 获取实体的函数
 * @param {String} repositoryName - 仓库名称，将被添加到req对象上
 */
const initRepository = (entityGetter, repositoryName = 'repository') => {
  return async (req, res, next) => {
    try {
      const connection = getConnection();
      const entity = entityGetter();
      req[repositoryName] = connection.getRepository(entity);
      next();
    } catch (error) {
      console.error(`初始化仓库失败: ${error.message}`);
      res.status(500).json({ message: '服务器内部错误' });
    }
  };
};

module.exports = { initRepository };