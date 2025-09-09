/**
 * UI自动化测试配置文件
 * 包含测试环境、用户数据、测试参数等配置
 */

// 测试环境配置
const testEnvironment = {
  baseUrl: 'http://localhost:3000',
  apiUrl: 'http://localhost:5000',
  timeout: 30000,
  retries: 2,
  slowMo: 50, // 操作间延迟(ms)
  headless: true,
  viewport: {
    width: 1920,
    height: 1080
  },
  screenshotPath: './test-results/screenshots',
  reportPath: './test-results/reports'
};

// 测试用户数据
const testUsers = {
  admin: {
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    displayName: '系统管理员',
    permissions: ['user_management', 'class_management', 'system_settings']
  },
  teacher: {
    username: 'teacher001',
    password: 'teacher123',
    role: 'teacher',
    displayName: '张老师',
    permissions: ['class_management', 'student_management']
  },
  student: {
    username: 'student001',
    password: 'student123',
    role: 'student',
    displayName: '李同学',
    permissions: ['view_classes', 'checkin']
  }
};

// 测试数据
const testData = {
  classes: [
    {
      name: '测试班级001',
      description: '这是一个用于UI测试的班级',
      teacher: 'teacher001',
      capacity: 30
    },
    {
      name: '测试班级002',
      description: '另一个测试班级',
      teacher: 'teacher001',
      capacity: 25
    }
  ],
  students: [
    {
      name: '测试学生001',
      studentId: 'S001',
      email: 'student001@test.com',
      phone: '13800138001'
    },
    {
      name: '测试学生002',
      studentId: 'S002',
      email: 'student002@test.com',
      phone: '13800138002'
    }
  ]
};

// 核心功能模块配置
const functionalModules = {
  authentication: {
    loginUrl: '/login',
    logoutUrl: '/logout',
    testCases: ['valid_login', 'invalid_login', 'logout']
  },
  userManagement: {
    baseUrl: '/users',
    testCases: ['create_user', 'edit_user', 'delete_user', 'search_user']
  },
  classManagement: {
    baseUrl: '/classes',
    testCases: ['create_class', 'edit_class', 'delete_class', 'assign_students']
  },
  studentManagement: {
    baseUrl: '/students',
    testCases: ['add_student', 'edit_student', 'remove_student']
  },
  whiteboard: {
    baseUrl: '/whiteboard',
    testCases: ['open_whiteboard', 'draw_content', 'save_content']
  },
  checkin: {
    baseUrl: '/checkin',
    testCases: ['student_checkin', 'view_checkin_status']
  }
};

// 异常情况测试配置
const exceptionTestCases = {
  invalidInputs: {
    emptyFields: ['', '   ', null, undefined],
    invalidEmails: ['invalid-email', '@test.com', 'test@', 'test.com'],
    invalidPasswords: ['123', 'a', ''],
    sqlInjection: ["'; DROP TABLE users; --", "1' OR '1'='1"],
    xssAttempts: ['<script>alert("XSS")</script>', '<img src=x onerror=alert(1)>']
  },
  networkErrors: {
    timeout: 30000,
    retryAttempts: 3,
    simulateOffline: true
  },
  browserCompatibility: {
    browsers: ['chromium', 'firefox', 'webkit'],
    viewports: [
      { width: 1920, height: 1080 }, // Desktop
      { width: 1366, height: 768 },  // Laptop
      { width: 768, height: 1024 },  // Tablet
      { width: 375, height: 667 }    // Mobile
    ]
  }
};

// 断言验证点配置
const assertionPoints = {
  pageLoad: {
    titlePresent: true,
    navigationVisible: true,
    contentLoaded: true,
    noConsoleErrors: true
  },
  userInterface: {
    buttonsClickable: true,
    formsSubmittable: true,
    linksNavigable: true,
    responsiveDesign: true
  },
  dataIntegrity: {
    formValidation: true,
    dataConsistency: true,
    errorHandling: true
  },
  security: {
    authenticationRequired: true,
    authorizationChecks: true,
    inputSanitization: true
  }
};

// 测试报告配置
const reportConfig = {
  formats: ['html', 'json', 'junit'],
  includeScreenshots: true,
  includeVideos: false,
  detailedLogs: true,
  performanceMetrics: true,
  coverageReport: true
};

// 数据清理配置
const dataCleanup = {
  cleanupAfterEachTest: true,
  cleanupAfterSuite: true,
  preserveOnFailure: true,
  backupBeforeCleanup: true
};

// 导出配置
const config = {
  testEnvironment,
  testUsers,
  testData,
  functionalModules,
  exceptionTestCases,
  assertionPoints,
  reportConfig,
  dataCleanup
};

export default config;
export {
  testEnvironment,
  testUsers,
  testData,
  functionalModules,
  exceptionTestCases,
  assertionPoints,
  reportConfig,
  dataCleanup
};