// 全面UI自动化测试配置文件

module.exports = {
  // 测试环境配置
  testEnvironment: {
    baseUrl: 'http://localhost:5173',
    apiUrl: 'http://localhost:5173/api',
    timeout: 30000,
    headless: false, // 设为false便于调试
    slowMo: 100 // 减慢操作速度便于观察
  },

  // 多角色测试用户
  testUsers: {
    admin: {
      username: 'admin',
      password: 'admin123',
      role: '管理员',
      expectedPermissions: ['用户管理', '班级管理', '学生管理', '系统设置'],
      expectedMenus: ['用户管理', '班级管理', '学生管理', '白板签到']
    },
    teacher: {
      username: 'teacher001',
      password: 'teacher123',
      role: '教师',
      expectedPermissions: ['班级管理', '学生管理', '白板签到'],
      expectedMenus: ['班级管理', '学生管理', '白板签到']
    },
    student: {
      username: 'student001',
      password: 'student123',
      role: '学生',
      expectedPermissions: ['白板签到', '个人信息'],
      expectedMenus: ['白板签到', '个人信息']
    }
  },

  // 班级创建测试数据
  classTestData: {
    validClass: {
      className: '测试班级_' + Date.now(),
      classCode: 'TEST_' + Date.now(),
      description: '这是一个自动化测试创建的班级',
      maxStudents: 30,
      teacherId: 1
    },
    invalidClass: {
      className: '', // 空名称
      classCode: 'INVALID',
      description: '无效班级测试',
      maxStudents: -1, // 无效人数
      teacherId: null
    }
  },

  // 学生管理测试数据
  studentTestData: {
    validStudent: {
      username: 'teststudent_' + Date.now(),
      realName: '测试学生',
      email: 'test' + Date.now() + '@example.com',
      password: 'test123456',
      classId: 1
    },
    invalidStudent: {
      username: '', // 空用户名
      realName: '',
      email: 'invalid-email',
      password: '123', // 密码过短
      classId: null
    }
  },

  // 核心功能模块
  functionalModules: [
    {
      name: '用户管理',
      path: '/user',
      requiredRole: 'admin',
      testActions: ['查看用户列表', '添加用户', '编辑用户', '删除用户', '搜索用户']
    },
    {
      name: '班级管理',
      path: '/class',
      requiredRole: 'teacher',
      testActions: ['查看班级列表', '创建班级', '编辑班级', '删除班级', '班级详情']
    },
    {
      name: '学生管理',
      path: '/student',
      requiredRole: 'teacher',
      testActions: ['查看学生列表', '添加学生', '编辑学生', '删除学生', '学生分配']
    },
    {
      name: '白板签到',
      path: '/whiteboard',
      requiredRole: 'student',
      testActions: ['查看签到状态', '执行签到', '查看签到历史']
    }
  ],

  // 异常情况测试用例
  errorTestCases: [
    {
      name: '网络断开测试',
      description: '模拟网络中断情况下的UI表现',
      expectedBehavior: '显示网络错误提示，保持页面稳定'
    },
    {
      name: '无效数据提交',
      description: '提交空白或格式错误的表单数据',
      expectedBehavior: '显示具体的验证错误信息'
    },
    {
      name: '权限不足访问',
      description: '低权限用户访问高权限页面',
      expectedBehavior: '重定向到登录页或显示权限不足提示'
    },
    {
      name: '会话过期',
      description: '长时间无操作后的会话过期处理',
      expectedBehavior: '自动跳转到登录页面'
    }
  ],

  // 断言验证点
  assertionPoints: {
    login: {
      successIndicators: ['.user-info', '.main-menu', '.dashboard'],
      failureIndicators: ['.error-message', '.login-failed']
    },
    navigation: {
      menuItems: '.menu-item',
      activeMenu: '.menu-item.active',
      pageTitle: '.page-title'
    },
    forms: {
      submitButton: '.submit-btn',
      cancelButton: '.cancel-btn',
      errorMessage: '.error-message',
      successMessage: '.success-message'
    },
    dataTable: {
      tableRows: '.el-table__row',
      pagination: '.el-pagination',
      searchBox: '.search-input',
      addButton: '.add-btn'
    }
  },

  // 测试报告配置
  reportConfig: {
    outputDir: './test-reports',
    formats: ['html', 'json'],
    includeScreenshots: true,
    includeTimestamps: true,
    detailLevel: 'verbose'
  },

  // 测试数据清理配置
  dataCleanup: {
    cleanupAfterEach: true,
    cleanupTables: ['test_classes', 'test_students', 'test_users'],
    preserveBaseData: true
  }
};