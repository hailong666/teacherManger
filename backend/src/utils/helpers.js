/**
 * 通用工具函数
 */

/**
 * 生成随机字符串
 * @param {Number} length - 字符串长度
 * @returns {String} 随机字符串
 */
exports.generateRandomString = (length = 10) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

/**
 * 格式化日期时间
 * @param {Date} date - 日期对象
 * @param {String} format - 格式化模板
 * @returns {String} 格式化后的日期字符串
 */
exports.formatDate = (date, format = 'YYYY-MM-DD HH:mm:ss') => {
  if (!date) return '';
  
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  
  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
};

/**
 * 格式化日期时间（别名函数）
 * @param {Date} date - 日期对象
 * @param {String} format - 格式化模板
 * @returns {String} 格式化后的日期字符串
 */
exports.formatDateTime = (date, format = 'YYYY-MM-DD HH:mm:ss') => {
  return exports.formatDate(date, format);
};

/**
 * 分页助手函数
 * @param {Number} page - 页码
 * @param {Number} limit - 每页数量
 * @returns {Object} 分页参数
 */
exports.getPagination = (page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  return { limit, offset };
};

/**
 * 格式化分页结果
 * @param {Array} data - 数据列表
 * @param {Number} count - 总数
 * @param {Number} page - 页码
 * @param {Number} limit - 每页数量
 * @returns {Object} 格式化后的分页结果
 */
exports.getPagingData = (data, count, page, limit) => {
  return {
    total: count,
    current_page: page,
    per_page: limit,
    last_page: Math.ceil(count / limit),
    data: data
  };
};

/**
 * 过滤对象中的空值
 * @param {Object} obj - 输入对象
 * @returns {Object} 过滤后的对象
 */
exports.filterEmptyValues = (obj) => {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      acc[key] = value;
    }
    return acc;
  }, {});
};

/**
 * 安全地解析JSON字符串
 * @param {String} str - JSON字符串
 * @param {*} defaultValue - 解析失败时的默认值
 * @returns {*} 解析结果
 */
exports.safeJsonParse = (str, defaultValue = {}) => {
  try {
    return JSON.parse(str);
  } catch (e) {
    return defaultValue;
  }
};

/**
 * 计算两个地理位置之间的距离（米）
 * @param {Number} lat1 - 位置1纬度
 * @param {Number} lng1 - 位置1经度
 * @param {Number} lat2 - 位置2纬度
 * @param {Number} lng2 - 位置2经度
 * @returns {Number} 距离（米）
 */
exports.calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371e3; // 地球半径（米）
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};