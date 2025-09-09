import puppeteer from 'puppeteer';
import config from '../../test-config.js';
import fs from 'fs';
import path from 'path';

/**
 * 异常情况和边界条件测试
 * 测试系统在各种异常情况下的表现和错误处理
 */
class ExceptionBoundaryTest {
  constructor() {
    this.browser = null;
    this.page = null;
    this.testResults = [];
    this.screenshots = [];
    this.currentUser = null;
  }

  async init() {
    console.log('🚀 初始化异常情况测试...');
    this.browser = await puppeteer.launch({
      headless: config.testEnvironment.headless,
      slowMo: config.testEnvironment.slowMo,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1366, height: 768 });
    
    // 监听页面错误
    this.page.on('pageerror', (error) => {
      console.log(`   ⚠️ 页面错误: ${error.message}`);
      this.testResults.push({
        type: 'page_error',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    });
    
    // 监听控制台错误
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log(`   ⚠️ 控制台错误: ${msg.text()}`);
        this.testResults.push({
          type: 'console_error',
          error: msg.text(),
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async takeScreenshot(name) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${name}_${timestamp}.png`;
    const filepath = path.join('./test-reports/screenshots', filename);
    
    // 确保目录存在
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    await this.page.screenshot({ path: filepath, fullPage: true });
    this.screenshots.push({ name, filepath, timestamp });
    return filepath;
  }

  async loginAs(userType) {
    console.log(`\n🔐 使用${config.testUsers[userType].role}账号登录...`);
    const user = config.testUsers[userType];
    
    try {
      await this.page.goto(config.testEnvironment.baseUrl + '/login', {
        waitUntil: 'networkidle2',
        timeout: config.testEnvironment.timeout
      });

      await this.page.waitForSelector('input[type="text"]', { timeout: 10000 });
      await this.page.waitForSelector('input[type="password"]', { timeout: 10000 });

      // 输入用户名和密码
      await this.page.click('input[type="text"]');
      await this.page.keyboard.down('Control');
      await this.page.keyboard.press('KeyA');
      await this.page.keyboard.up('Control');
      await this.page.type('input[type="text"]', user.username);

      await this.page.click('input[type="password"]');
      await this.page.keyboard.down('Control');
      await this.page.keyboard.press('KeyA');
      await this.page.keyboard.up('Control');
      await this.page.type('input[type="password"]', user.password);

      await this.page.click('button[type="submit"]');
      await this.page.waitForTimeout(3000);

      const currentUrl = this.page.url();
      const isLoginSuccess = !currentUrl.includes('/login');

      if (isLoginSuccess) {
        console.log(`   ✅ ${user.role}登录成功`);
        this.currentUser = { userType, ...user };
        return true;
      } else {
        console.log(`   ❌ ${user.role}登录失败`);
        return false;
      }
    } catch (error) {
      console.log(`   ❌ 登录异常: ${error.message}`);
      return false;
    }
  }

  async testInvalidLoginAttempts() {
    console.log('\n🔒 测试无效登录尝试...');
    
    const testResult = {
      testCase: '无效登录尝试',
      scenarios: [],
      overallStatus: 'failed'
    };

    // 测试场景1: 错误的用户名
    const invalidUsernameResult = await this.testInvalidCredentials('invalid_user', 'password123', '错误用户名');
    testResult.scenarios.push(invalidUsernameResult);

    // 测试场景2: 错误的密码
    const invalidPasswordResult = await this.testInvalidCredentials('admin', 'wrong_password', '错误密码');
    testResult.scenarios.push(invalidPasswordResult);

    // 测试场景3: 空用户名
    const emptyUsernameResult = await this.testInvalidCredentials('', 'password123', '空用户名');
    testResult.scenarios.push(emptyUsernameResult);

    // 测试场景4: 空密码
    const emptyPasswordResult = await this.testInvalidCredentials('admin', '', '空密码');
    testResult.scenarios.push(emptyPasswordResult);

    // 测试场景5: SQL注入尝试
    const sqlInjectionResult = await this.testInvalidCredentials("admin'; DROP TABLE users; --", 'password', 'SQL注入尝试');
    testResult.scenarios.push(sqlInjectionResult);

    // 判断整体状态
    const successCount = testResult.scenarios.filter(scenario => scenario.success).length;
    testResult.overallStatus = successCount >= testResult.scenarios.length * 0.8 ? 'passed' : 'failed';

    return testResult;
  }

  async testInvalidCredentials(username, password, scenarioName) {
    console.log(`   🧪 测试场景: ${scenarioName}`);
    
    try {
      await this.page.goto(config.testEnvironment.baseUrl + '/login', {
        waitUntil: 'networkidle2',
        timeout: 10000
      });

      await this.page.waitForSelector('input[type="text"]', { timeout: 5000 });
      await this.page.waitForSelector('input[type="password"]', { timeout: 5000 });

      // 清空并输入测试数据
      await this.page.click('input[type="text"]');
      await this.page.keyboard.down('Control');
      await this.page.keyboard.press('KeyA');
      await this.page.keyboard.up('Control');
      await this.page.type('input[type="text"]', username);

      await this.page.click('input[type="password"]');
      await this.page.keyboard.down('Control');
      await this.page.keyboard.press('KeyA');
      await this.page.keyboard.up('Control');
      await this.page.type('input[type="password"]', password);

      await this.page.click('button[type="submit"]');
      await this.page.waitForTimeout(3000);

      // 检查是否显示错误信息
      const errorSelectors = [
        '.error-message',
        '.el-message--error',
        '.login-error',
        '.alert-danger',
        '[class*="error"]'
      ];

      let errorFound = false;
      let errorMessage = '';
      
      for (const selector of errorSelectors) {
        try {
          const errorElement = await this.page.$(selector);
          if (errorElement) {
            errorMessage = await this.page.evaluate(el => el.textContent, errorElement);
            if (errorMessage && errorMessage.trim()) {
              errorFound = true;
              break;
            }
          }
        } catch (error) {
          // 继续尝试下一个选择器
        }
      }

      // 检查是否仍在登录页面
      const currentUrl = this.page.url();
      const stillOnLoginPage = currentUrl.includes('/login');

      const success = errorFound || stillOnLoginPage;
      
      if (success) {
        console.log(`     ✅ ${scenarioName}: 正确显示错误或阻止登录`);
        if (errorMessage) {
          console.log(`     📝 错误信息: ${errorMessage}`);
        }
      } else {
        console.log(`     ❌ ${scenarioName}: 未正确处理无效登录`);
      }

      await this.takeScreenshot(`invalid_login_${scenarioName.replace(/\s+/g, '_')}`);
      
      return {
        scenario: scenarioName,
        success: success,
        errorMessage: errorMessage,
        details: {
          username: username,
          stillOnLoginPage: stillOnLoginPage,
          errorFound: errorFound
        }
      };
    } catch (error) {
      console.log(`     ❌ ${scenarioName}测试异常: ${error.message}`);
      return {
        scenario: scenarioName,
        success: false,
        error: error.message
      };
    }
  }

  async testFormValidation() {
    console.log('\n📝 测试表单验证...');
    
    const testResult = {
      testCase: '表单验证',
      scenarios: [],
      overallStatus: 'failed'
    };

    // 登录为管理员以访问表单
    const loginSuccess = await this.loginAs('admin');
    if (!loginSuccess) {
      testResult.error = '无法登录进行表单测试';
      return testResult;
    }

    // 测试用户创建表单验证
    const userFormResult = await this.testUserFormValidation();
    testResult.scenarios.push(userFormResult);

    // 测试班级创建表单验证
    const classFormResult = await this.testClassFormValidation();
    testResult.scenarios.push(classFormResult);

    // 判断整体状态
    const successCount = testResult.scenarios.filter(scenario => scenario.success).length;
    testResult.overallStatus = successCount >= testResult.scenarios.length * 0.7 ? 'passed' : 'failed';

    return testResult;
  }

  async testUserFormValidation() {
    console.log('   👤 测试用户表单验证...');
    
    try {
      // 导航到用户管理页面
      await this.page.goto(config.testEnvironment.baseUrl + '/user', {
        waitUntil: 'networkidle2',
        timeout: 10000
      });

      // 点击新增用户按钮
      const addButtonSelectors = [
        'text=新增用户',
        'text=添加用户',
        '.add-btn',
        'button:has-text("新增")'
      ];

      let formOpened = false;
      for (const selector of addButtonSelectors) {
        try {
          const button = await this.page.$(selector);
          if (button) {
            await button.click();
            await this.page.waitForTimeout(1000);
            formOpened = true;
            break;
          }
        } catch (error) {
          // 继续尝试
        }
      }

      if (!formOpened) {
        return {
          scenario: '用户表单验证',
          success: false,
          error: '无法打开用户表单'
        };
      }

      // 测试空表单提交
      const submitButtonSelectors = [
        'text=确定',
        'text=提交',
        '.submit-btn',
        'button[type="submit"]'
      ];

      for (const selector of submitButtonSelectors) {
        try {
          const submitBtn = await this.page.$(selector);
          if (submitBtn) {
            await submitBtn.click();
            await this.page.waitForTimeout(1000);
            break;
          }
        } catch (error) {
          // 继续尝试
        }
      }

      // 检查验证错误
      const validationErrors = await this.checkValidationErrors();
      
      await this.takeScreenshot('user_form_validation');
      
      // 关闭表单
      await this.closeModal();

      return {
        scenario: '用户表单验证',
        success: validationErrors.length > 0,
        validationErrors: validationErrors,
        details: '检查空表单提交时的验证'
      };
    } catch (error) {
      return {
        scenario: '用户表单验证',
        success: false,
        error: error.message
      };
    }
  }

  async testClassFormValidation() {
    console.log('   🏫 测试班级表单验证...');
    
    try {
      // 导航到班级管理页面
      await this.page.goto(config.testEnvironment.baseUrl + '/class', {
        waitUntil: 'networkidle2',
        timeout: 10000
      });

      // 点击新增班级按钮
      const addButtonSelectors = [
        'text=新增班级',
        'text=创建班级',
        '.add-btn',
        'button:has-text("新增")'
      ];

      let formOpened = false;
      for (const selector of addButtonSelectors) {
        try {
          const button = await this.page.$(selector);
          if (button) {
            await button.click();
            await this.page.waitForTimeout(1000);
            formOpened = true;
            break;
          }
        } catch (error) {
          // 继续尝试
        }
      }

      if (!formOpened) {
        return {
          scenario: '班级表单验证',
          success: false,
          error: '无法打开班级表单'
        };
      }

      // 测试无效数据输入
      await this.fillInvalidClassData();

      // 尝试提交
      const submitButtonSelectors = [
        'text=确定',
        'text=提交',
        '.submit-btn',
        'button[type="submit"]'
      ];

      for (const selector of submitButtonSelectors) {
        try {
          const submitBtn = await this.page.$(selector);
          if (submitBtn) {
            await submitBtn.click();
            await this.page.waitForTimeout(1000);
            break;
          }
        } catch (error) {
          // 继续尝试
        }
      }

      // 检查验证错误
      const validationErrors = await this.checkValidationErrors();
      
      await this.takeScreenshot('class_form_validation');
      
      // 关闭表单
      await this.closeModal();

      return {
        scenario: '班级表单验证',
        success: validationErrors.length > 0,
        validationErrors: validationErrors,
        details: '检查无效数据提交时的验证'
      };
    } catch (error) {
      return {
        scenario: '班级表单验证',
        success: false,
        error: error.message
      };
    }
  }

  async fillInvalidClassData() {
    // 尝试填入无效数据
    const inputSelectors = [
      'input[placeholder*="班级名称"]',
      'input[placeholder*="名称"]',
      '.class-name input',
      '.el-input__inner'
    ];

    for (const selector of inputSelectors) {
      try {
        const input = await this.page.$(selector);
        if (input) {
          await input.click();
          // 输入过长的班级名称
          await this.page.type(selector, 'A'.repeat(100));
          break;
        }
      } catch (error) {
        // 继续尝试
      }
    }
  }

  async checkValidationErrors() {
    const errorSelectors = [
      '.el-form-item__error',
      '.error-message',
      '.validation-error',
      '.field-error',
      '[class*="error"]'
    ];

    const errors = [];
    
    for (const selector of errorSelectors) {
      try {
        const errorElements = await this.page.$$(selector);
        for (const element of errorElements) {
          const errorText = await this.page.evaluate(el => el.textContent, element);
          if (errorText && errorText.trim()) {
            errors.push(errorText.trim());
          }
        }
      } catch (error) {
        // 继续尝试下一个选择器
      }
    }

    return errors;
  }

  async closeModal() {
    const closeSelectors = [
      '.el-dialog__close',
      '.modal-close',
      'text=取消',
      '.cancel-btn',
      '[aria-label="Close"]'
    ];

    for (const selector of closeSelectors) {
      try {
        const closeBtn = await this.page.$(selector);
        if (closeBtn) {
          await closeBtn.click();
          await this.page.waitForTimeout(500);
          return;
        }
      } catch (error) {
        // 继续尝试
      }
    }
  }

  async testNetworkFailure() {
    console.log('\n🌐 测试网络故障处理...');
    
    const testResult = {
      testCase: '网络故障处理',
      scenarios: [],
      overallStatus: 'failed'
    };

    // 登录系统
    const loginSuccess = await this.loginAs('admin');
    if (!loginSuccess) {
      testResult.error = '无法登录进行网络测试';
      return testResult;
    }

    // 测试场景1: 模拟网络中断
    const networkOfflineResult = await this.testNetworkOffline();
    testResult.scenarios.push(networkOfflineResult);

    // 测试场景2: 模拟慢网络
    const slowNetworkResult = await this.testSlowNetwork();
    testResult.scenarios.push(slowNetworkResult);

    // 测试场景3: 模拟API错误
    const apiErrorResult = await this.testApiError();
    testResult.scenarios.push(apiErrorResult);

    // 判断整体状态
    const successCount = testResult.scenarios.filter(scenario => scenario.success).length;
    testResult.overallStatus = successCount >= testResult.scenarios.length * 0.6 ? 'passed' : 'failed';

    return testResult;
  }

  async testNetworkOffline() {
    console.log('   📡 测试网络离线处理...');
    
    try {
      // 设置离线模式
      await this.page.setOfflineMode(true);
      
      // 尝试导航到新页面
      await this.page.goto(config.testEnvironment.baseUrl + '/user', {
        waitUntil: 'networkidle2',
        timeout: 5000
      }).catch(() => {
        // 预期会失败
      });
      
      await this.page.waitForTimeout(2000);
      
      // 检查是否显示网络错误信息
      const errorIndicators = await this.checkNetworkErrorIndicators();
      
      await this.takeScreenshot('network_offline');
      
      // 恢复网络
      await this.page.setOfflineMode(false);
      
      return {
        scenario: '网络离线',
        success: errorIndicators.length > 0,
        errorIndicators: errorIndicators,
        details: '检查离线时的错误处理'
      };
    } catch (error) {
      // 确保恢复网络
      await this.page.setOfflineMode(false);
      
      return {
        scenario: '网络离线',
        success: false,
        error: error.message
      };
    }
  }

  async testSlowNetwork() {
    console.log('   🐌 测试慢网络处理...');
    
    try {
      // 模拟慢网络
      await this.page.emulateNetworkConditions({
        offline: false,
        downloadThroughput: 50 * 1024, // 50KB/s
        uploadThroughput: 20 * 1024,   // 20KB/s
        latency: 2000 // 2秒延迟
      });
      
      const startTime = Date.now();
      
      // 尝试加载页面
      await this.page.goto(config.testEnvironment.baseUrl + '/class', {
        waitUntil: 'networkidle2',
        timeout: 15000
      });
      
      const loadTime = Date.now() - startTime;
      
      // 检查是否显示加载指示器
      const loadingIndicators = await this.checkLoadingIndicators();
      
      await this.takeScreenshot('slow_network');
      
      // 恢复正常网络
      await this.page.emulateNetworkConditions({
        offline: false,
        downloadThroughput: 0,
        uploadThroughput: 0,
        latency: 0
      });
      
      return {
        scenario: '慢网络',
        success: loadTime > 3000 || loadingIndicators.length > 0,
        loadTime: loadTime,
        loadingIndicators: loadingIndicators,
        details: '检查慢网络时的用户体验'
      };
    } catch (error) {
      // 恢复正常网络
      await this.page.emulateNetworkConditions({
        offline: false,
        downloadThroughput: 0,
        uploadThroughput: 0,
        latency: 0
      });
      
      return {
        scenario: '慢网络',
        success: false,
        error: error.message
      };
    }
  }

  async testApiError() {
    console.log('   🔌 测试API错误处理...');
    
    try {
      // 拦截API请求并返回错误
      await this.page.setRequestInterception(true);
      
      this.page.on('request', (request) => {
        if (request.url().includes('/api/')) {
          request.respond({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Internal Server Error' })
          });
        } else {
          request.continue();
        }
      });
      
      // 尝试执行需要API调用的操作
      await this.page.goto(config.testEnvironment.baseUrl + '/user', {
        waitUntil: 'networkidle2',
        timeout: 10000
      });
      
      await this.page.waitForTimeout(3000);
      
      // 检查错误处理
      const errorHandling = await this.checkApiErrorHandling();
      
      await this.takeScreenshot('api_error');
      
      // 停止请求拦截
      await this.page.setRequestInterception(false);
      
      return {
        scenario: 'API错误',
        success: errorHandling.length > 0,
        errorHandling: errorHandling,
        details: '检查API错误时的处理'
      };
    } catch (error) {
      // 停止请求拦截
      await this.page.setRequestInterception(false);
      
      return {
        scenario: 'API错误',
        success: false,
        error: error.message
      };
    }
  }

  async checkNetworkErrorIndicators() {
    const errorSelectors = [
      '.network-error',
      '.connection-error',
      '.offline-indicator',
      'text=网络连接失败',
      'text=连接超时',
      'text=网络错误'
    ];

    const indicators = [];
    
    for (const selector of errorSelectors) {
      try {
        const element = await this.page.$(selector);
        if (element) {
          const text = await this.page.evaluate(el => el.textContent, element);
          indicators.push(text);
        }
      } catch (error) {
        // 继续检查
      }
    }

    return indicators;
  }

  async checkLoadingIndicators() {
    const loadingSelectors = [
      '.loading',
      '.spinner',
      '.el-loading',
      '.loading-indicator',
      '[class*="loading"]'
    ];

    const indicators = [];
    
    for (const selector of loadingSelectors) {
      try {
        const element = await this.page.$(selector);
        if (element) {
          indicators.push(selector);
        }
      } catch (error) {
        // 继续检查
      }
    }

    return indicators;
  }

  async checkApiErrorHandling() {
    const errorSelectors = [
      '.api-error',
      '.server-error',
      '.error-message',
      'text=服务器错误',
      'text=请求失败',
      'text=系统错误'
    ];

    const handling = [];
    
    for (const selector of errorSelectors) {
      try {
        const element = await this.page.$(selector);
        if (element) {
          const text = await this.page.evaluate(el => el.textContent, element);
          handling.push(text);
        }
      } catch (error) {
        // 继续检查
      }
    }

    return handling;
  }

  async testBrowserCompatibility() {
    console.log('\n🌐 测试浏览器兼容性...');
    
    const testResult = {
      testCase: '浏览器兼容性',
      scenarios: [],
      overallStatus: 'failed'
    };

    // 测试JavaScript错误
    const jsErrorResult = await this.testJavaScriptErrors();
    testResult.scenarios.push(jsErrorResult);

    // 测试CSS兼容性
    const cssCompatResult = await this.testCSSCompatibility();
    testResult.scenarios.push(cssCompatResult);

    // 测试响应式设计
    const responsiveResult = await this.testResponsiveDesign();
    testResult.scenarios.push(responsiveResult);

    // 判断整体状态
    const successCount = testResult.scenarios.filter(scenario => scenario.success).length;
    testResult.overallStatus = successCount >= testResult.scenarios.length * 0.7 ? 'passed' : 'failed';

    return testResult;
  }

  async testJavaScriptErrors() {
    console.log('   🔧 测试JavaScript错误处理...');
    
    try {
      const jsErrors = [];
      
      // 监听JavaScript错误
      this.page.on('pageerror', (error) => {
        jsErrors.push(error.message);
      });
      
      // 访问主要页面
      const pages = ['/login', '/user', '/class', '/student'];
      
      for (const pagePath of pages) {
        try {
          await this.page.goto(config.testEnvironment.baseUrl + pagePath, {
            waitUntil: 'networkidle2',
            timeout: 10000
          });
          await this.page.waitForTimeout(2000);
        } catch (error) {
          // 页面可能不存在，继续测试
        }
      }
      
      await this.takeScreenshot('js_error_test');
      
      return {
        scenario: 'JavaScript错误',
        success: jsErrors.length === 0,
        jsErrors: jsErrors,
        details: `检测到${jsErrors.length}个JavaScript错误`
      };
    } catch (error) {
      return {
        scenario: 'JavaScript错误',
        success: false,
        error: error.message
      };
    }
  }

  async testCSSCompatibility() {
    console.log('   🎨 测试CSS兼容性...');
    
    try {
      await this.page.goto(config.testEnvironment.baseUrl, {
        waitUntil: 'networkidle2',
        timeout: 10000
      });
      
      // 检查关键CSS属性是否正确应用
      const cssIssues = await this.page.evaluate(() => {
        const issues = [];
        
        // 检查flexbox支持
        const testDiv = document.createElement('div');
        testDiv.style.display = 'flex';
        if (testDiv.style.display !== 'flex') {
          issues.push('Flexbox not supported');
        }
        
        // 检查grid支持
        testDiv.style.display = 'grid';
        if (testDiv.style.display !== 'grid') {
          issues.push('CSS Grid not supported');
        }
        
        return issues;
      });
      
      await this.takeScreenshot('css_compatibility');
      
      return {
        scenario: 'CSS兼容性',
        success: cssIssues.length === 0,
        cssIssues: cssIssues,
        details: `检测到${cssIssues.length}个CSS兼容性问题`
      };
    } catch (error) {
      return {
        scenario: 'CSS兼容性',
        success: false,
        error: error.message
      };
    }
  }

  async testResponsiveDesign() {
    console.log('   📱 测试响应式设计...');
    
    try {
      const viewports = [
        { width: 375, height: 667, name: 'Mobile' },
        { width: 768, height: 1024, name: 'Tablet' },
        { width: 1920, height: 1080, name: 'Desktop' }
      ];
      
      const responsiveIssues = [];
      
      for (const viewport of viewports) {
        await this.page.setViewport(viewport);
        
        await this.page.goto(config.testEnvironment.baseUrl, {
          waitUntil: 'networkidle2',
          timeout: 10000
        });
        
        await this.page.waitForTimeout(1000);
        
        // 检查是否有水平滚动条
        const hasHorizontalScroll = await this.page.evaluate(() => {
          return document.body.scrollWidth > window.innerWidth;
        });
        
        if (hasHorizontalScroll) {
          responsiveIssues.push(`${viewport.name}: 出现水平滚动条`);
        }
        
        await this.takeScreenshot(`responsive_${viewport.name.toLowerCase()}`);
      }
      
      // 恢复默认视口
      await this.page.setViewport({ width: 1366, height: 768 });
      
      return {
        scenario: '响应式设计',
        success: responsiveIssues.length === 0,
        responsiveIssues: responsiveIssues,
        details: `检测到${responsiveIssues.length}个响应式问题`
      };
    } catch (error) {
      return {
        scenario: '响应式设计',
        success: false,
        error: error.message
      };
    }
  }

  async runExceptionBoundaryTests() {
    console.log('\n🎯 开始执行异常情况测试');
    console.log('=' .repeat(60));
    
    const startTime = new Date();
    const allResults = {
      testSuite: '异常情况和边界条件测试',
      startTime: startTime.toISOString(),
      results: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        errors: 0
      }
    };

    // 测试无效登录尝试
    const invalidLoginResult = await this.testInvalidLoginAttempts();
    allResults.results.push(invalidLoginResult);
    this.updateSummary(allResults.summary, invalidLoginResult);

    // 测试表单验证
    const formValidationResult = await this.testFormValidation();
    allResults.results.push(formValidationResult);
    this.updateSummary(allResults.summary, formValidationResult);

    // 测试网络故障处理
    const networkFailureResult = await this.testNetworkFailure();
    allResults.results.push(networkFailureResult);
    this.updateSummary(allResults.summary, networkFailureResult);

    // 测试浏览器兼容性
    const browserCompatResult = await this.testBrowserCompatibility();
    allResults.results.push(browserCompatResult);
    this.updateSummary(allResults.summary, browserCompatResult);

    const endTime = new Date();
    allResults.endTime = endTime.toISOString();
    allResults.duration = endTime - startTime;
    allResults.screenshots = this.screenshots;
    allResults.capturedErrors = this.testResults;

    // 生成测试报告
    await this.generateReport(allResults);
    
    return allResults;
  }

  updateSummary(summary, result) {
    summary.total++;
    if (result.overallStatus === 'passed') {
      summary.passed++;
    } else if (result.error) {
      summary.errors++;
    } else {
      summary.failed++;
    }
  }

  async generateReport(results) {
    console.log('\n📊 生成异常测试报告...');
    
    // 确保报告目录存在
    const reportDir = './test-reports';
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    // 生成JSON报告
    const jsonReport = JSON.stringify(results, null, 2);
    const jsonPath = path.join(reportDir, `exception-boundary-test-${Date.now()}.json`);
    fs.writeFileSync(jsonPath, jsonReport);

    // 生成HTML报告
    const htmlReport = this.generateHtmlReport(results);
    const htmlPath = path.join(reportDir, `exception-boundary-test-${Date.now()}.html`);
    fs.writeFileSync(htmlPath, htmlReport);

    console.log(`   ✅ JSON报告已生成: ${jsonPath}`);
    console.log(`   ✅ HTML报告已生成: ${htmlPath}`);
  }

  generateHtmlReport(results) {
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>异常情况和边界条件测试报告</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px; }
        .summary-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .summary-card.total { border-left: 4px solid #007bff; }
        .summary-card.passed { border-left: 4px solid #28a745; }
        .summary-card.failed { border-left: 4px solid #dc3545; }
        .summary-card.errors { border-left: 4px solid #ffc107; }
        .test-result { margin-bottom: 30px; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; }
        .test-header { background: #f8f9fa; padding: 15px; font-weight: bold; }
        .test-header.passed { background: #d4edda; color: #155724; }
        .test-header.failed { background: #f8d7da; color: #721c24; }
        .test-content { padding: 20px; }
        .scenario-list { list-style: none; padding: 0; }
        .scenario-list li { padding: 10px; margin: 5px 0; border-radius: 4px; border-left: 4px solid #ddd; }
        .scenario-list li.success { background: #d4edda; border-left-color: #28a745; }
        .scenario-list li.failed { background: #f8d7da; border-left-color: #dc3545; }
        .error-details { background: #fff3cd; padding: 10px; border-radius: 4px; margin-top: 10px; }
        .screenshot-gallery { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; }
        .screenshot { text-align: center; }
        .screenshot img { max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>异常情况和边界条件测试报告</h1>
            <p>测试时间: ${results.startTime} - ${results.endTime}</p>
            <p>测试耗时: ${Math.round(results.duration / 1000)}秒</p>
        </div>
        
        <div class="summary">
            <div class="summary-card total">
                <h3>${results.summary.total}</h3>
                <p>总测试数</p>
            </div>
            <div class="summary-card passed">
                <h3>${results.summary.passed}</h3>
                <p>通过</p>
            </div>
            <div class="summary-card failed">
                <h3>${results.summary.failed}</h3>
                <p>失败</p>
            </div>
            <div class="summary-card errors">
                <h3>${results.summary.errors}</h3>
                <p>错误</p>
            </div>
        </div>
        
        ${results.results.map(result => `
            <div class="test-result">
                <div class="test-header ${result.overallStatus}">
                    ${result.testCase} - ${result.overallStatus === 'passed' ? '✅ 通过' : '❌ 失败'}
                </div>
                <div class="test-content">
                    ${result.scenarios ? `
                        <h4>测试场景:</h4>
                        <ul class="scenario-list">
                            ${result.scenarios.map(scenario => `
                                <li class="${scenario.success ? 'success' : 'failed'}">
                                    <strong>${scenario.scenario}:</strong> ${scenario.success ? '✅ 通过' : '❌ 失败'}
                                    ${scenario.details ? `<br><small>${scenario.details}</small>` : ''}
                                    ${scenario.error ? `<div class="error-details">错误: ${scenario.error}</div>` : ''}
                                    ${scenario.errorMessage ? `<div class="error-details">错误信息: ${scenario.errorMessage}</div>` : ''}
                                </li>
                            `).join('')}
                        </ul>
                    ` : ''}
                    ${result.error ? `<div class="error-details"><strong>测试错误:</strong> ${result.error}</div>` : ''}
                </div>
            </div>
        `).join('')}
        
        ${results.capturedErrors && results.capturedErrors.length > 0 ? `
            <div class="test-result">
                <div class="test-header failed">
                    捕获的系统错误
                </div>
                <div class="test-content">
                    <ul class="scenario-list">
                        ${results.capturedErrors.map(error => `
                            <li class="failed">
                                <strong>${error.type}:</strong> ${error.error}
                                <br><small>时间: ${error.timestamp}</small>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            </div>
        ` : ''}
        
        ${results.screenshots.length > 0 ? `
            <div class="test-section">
                <h3>测试截图</h3>
                <div class="screenshot-gallery">
                    ${results.screenshots.map(screenshot => `
                        <div class="screenshot">
                            <img src="${screenshot.filepath}" alt="${screenshot.name}">
                            <p>${screenshot.name}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : ''}
    </div>
</body>
</html>
    `;
  }
}

// 主执行函数
async function runExceptionBoundaryTest() {
  const test = new ExceptionBoundaryTest();
  
  try {
    await test.init();
    const results = await test.runExceptionBoundaryTests();
    
    console.log('\n🎉 异常情况测试完成!');
    console.log('=' .repeat(60));
    console.log(`📊 测试总结:`);
    console.log(`   总测试数: ${results.summary.total}`);
    console.log(`   通过: ${results.summary.passed}`);
    console.log(`   失败: ${results.summary.failed}`);
    console.log(`   错误: ${results.summary.errors}`);
    console.log(`   成功率: ${Math.round((results.summary.passed / results.summary.total) * 100)}%`);
    
    return results;
  } catch (error) {
    console.error('❌ 测试执行失败:', error);
    throw error;
  } finally {
    await test.cleanup();
  }
}

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
  runExceptionBoundaryTest()
    .then(() => {
      console.log('✅ 异常边界测试完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 测试失败:', error);
      process.exit(1);
    });
}

export { ExceptionBoundaryTest, runExceptionBoundaryTest };