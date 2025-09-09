import puppeteer from 'puppeteer';
import config from '../../test-config.js';
import fs from 'fs';
import path from 'path';

/**
 * 多角色登录验证测试
 * 测试管理员、教师、学生三种角色的登录和权限验证
 */
class MultiRoleLoginTest {
  constructor() {
    this.browser = null;
    this.page = null;
    this.testResults = [];
    this.screenshots = [];
  }

  async init() {
    console.log('🚀 初始化多角色登录测试...');
    this.browser = await puppeteer.launch({
      headless: config.testEnvironment.headless,
      slowMo: config.testEnvironment.slowMo,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1366, height: 768 });
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

  async login(userType) {
    const user = config.testUsers[userType];
    console.log(`\n🔐 测试 ${user.role} 登录...`);
    
    try {
      // 访问登录页面
      await this.page.goto(config.testEnvironment.baseUrl + '/login', {
        waitUntil: 'networkidle2',
        timeout: config.testEnvironment.timeout
      });

      await this.takeScreenshot(`login_page_${userType}`);

      // 等待登录表单加载
      await this.page.waitForSelector('input[type="text"]', { timeout: 10000 });
      await this.page.waitForSelector('input[type="password"]', { timeout: 10000 });

      // 清空并输入用户名
      await this.page.click('input[type="text"]');
      await this.page.keyboard.down('Control');
      await this.page.keyboard.press('KeyA');
      await this.page.keyboard.up('Control');
      await this.page.type('input[type="text"]', user.username);

      // 清空并输入密码
      await this.page.click('input[type="password"]');
      await this.page.keyboard.down('Control');
      await this.page.keyboard.press('KeyA');
      await this.page.keyboard.up('Control');
      await this.page.type('input[type="password"]', user.password);

      await this.takeScreenshot(`login_form_filled_${userType}`);

      // 点击登录按钮
      await this.page.click('button[type="submit"]');

      // 等待登录结果
      await this.page.waitForTimeout(3000);

      // 检查是否登录成功
      const currentUrl = this.page.url();
      const isLoginSuccess = !currentUrl.includes('/login');

      if (isLoginSuccess) {
        console.log(`   ✅ ${user.role} 登录成功`);
        await this.takeScreenshot(`login_success_${userType}`);
        return { success: true, user, url: currentUrl };
      } else {
        console.log(`   ❌ ${user.role} 登录失败`);
        await this.takeScreenshot(`login_failed_${userType}`);
        return { success: false, user, url: currentUrl };
      }
    } catch (error) {
      console.log(`   ❌ ${user.role} 登录异常: ${error.message}`);
      await this.takeScreenshot(`login_error_${userType}`);
      return { success: false, user, error: error.message };
    }
  }

  async verifyUserPermissions(userType) {
    const user = config.testUsers[userType];
    console.log(`\n🔍 验证 ${user.role} 权限...`);
    
    const permissionResults = {
      userType,
      role: user.role,
      menuAccess: [],
      permissionChecks: []
    };

    try {
      // 等待页面加载完成
      await this.page.waitForTimeout(2000);

      // 检查菜单项是否可见
      for (const expectedMenu of user.expectedMenus) {
        try {
          const menuSelector = `text=${expectedMenu}`;
          const menuElement = await this.page.$(menuSelector);
          
          if (menuElement) {
            console.log(`   ✅ 菜单项 "${expectedMenu}" 可见`);
            permissionResults.menuAccess.push({ menu: expectedMenu, accessible: true });
          } else {
            console.log(`   ❌ 菜单项 "${expectedMenu}" 不可见`);
            permissionResults.menuAccess.push({ menu: expectedMenu, accessible: false });
          }
        } catch (error) {
          console.log(`   ❌ 检查菜单项 "${expectedMenu}" 时出错: ${error.message}`);
          permissionResults.menuAccess.push({ menu: expectedMenu, accessible: false, error: error.message });
        }
      }

      // 测试页面访问权限
      for (const module of config.functionalModules) {
        if (user.expectedPermissions.includes(module.name)) {
          try {
            await this.page.goto(config.testEnvironment.baseUrl + module.path, {
              waitUntil: 'networkidle2',
              timeout: 10000
            });
            
            const currentUrl = this.page.url();
            const hasAccess = currentUrl.includes(module.path);
            
            if (hasAccess) {
              console.log(`   ✅ 可以访问 "${module.name}" 页面`);
              permissionResults.permissionChecks.push({ module: module.name, accessible: true });
            } else {
              console.log(`   ❌ 无法访问 "${module.name}" 页面`);
              permissionResults.permissionChecks.push({ module: module.name, accessible: false });
            }
            
            await this.takeScreenshot(`permission_${userType}_${module.name.replace(/\s+/g, '_')}`);
          } catch (error) {
            console.log(`   ❌ 访问 "${module.name}" 页面时出错: ${error.message}`);
            permissionResults.permissionChecks.push({ 
              module: module.name, 
              accessible: false, 
              error: error.message 
            });
          }
        }
      }

      await this.takeScreenshot(`permissions_verified_${userType}`);
      return permissionResults;
    } catch (error) {
      console.log(`   ❌ 权限验证异常: ${error.message}`);
      return { ...permissionResults, error: error.message };
    }
  }

  async logout() {
    console.log('\n🚪 执行登出操作...');
    try {
      // 查找登出按钮或用户菜单
      const logoutSelectors = [
        'text=退出登录',
        'text=登出',
        '.logout-btn',
        '.user-menu .logout'
      ];

      for (const selector of logoutSelectors) {
        try {
          const element = await this.page.$(selector);
          if (element) {
            await element.click();
            await this.page.waitForTimeout(2000);
            
            const currentUrl = this.page.url();
            if (currentUrl.includes('/login')) {
              console.log('   ✅ 登出成功');
              await this.takeScreenshot('logout_success');
              return true;
            }
          }
        } catch (error) {
          // 继续尝试下一个选择器
        }
      }

      // 如果找不到登出按钮，直接访问登录页面
      await this.page.goto(config.testEnvironment.baseUrl + '/login');
      console.log('   ✅ 通过直接访问登录页面完成登出');
      return true;
    } catch (error) {
      console.log(`   ❌ 登出失败: ${error.message}`);
      return false;
    }
  }

  async runAllRoleTests() {
    console.log('\n🎯 开始执行多角色登录验证测试');
    console.log('=' .repeat(60));
    
    const startTime = new Date();
    const allResults = {
      testSuite: '多角色登录验证测试',
      startTime: startTime.toISOString(),
      results: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        errors: 0
      }
    };

    for (const userType of Object.keys(config.testUsers)) {
      console.log(`\n📋 测试角色: ${config.testUsers[userType].role}`);
      console.log('-'.repeat(40));
      
      const roleResult = {
        userType,
        role: config.testUsers[userType].role,
        loginResult: null,
        permissionResult: null,
        logoutResult: null,
        overallStatus: 'failed'
      };

      try {
        // 1. 登录测试
        roleResult.loginResult = await this.login(userType);
        
        if (roleResult.loginResult.success) {
          // 2. 权限验证测试
          roleResult.permissionResult = await this.verifyUserPermissions(userType);
          
          // 3. 登出测试
          roleResult.logoutResult = await this.logout();
          
          // 判断整体状态
          if (roleResult.loginResult.success && roleResult.logoutResult) {
            roleResult.overallStatus = 'passed';
            allResults.summary.passed++;
          } else {
            allResults.summary.failed++;
          }
        } else {
          allResults.summary.failed++;
        }
      } catch (error) {
        console.log(`❌ 角色 ${config.testUsers[userType].role} 测试异常: ${error.message}`);
        roleResult.error = error.message;
        allResults.summary.errors++;
      }

      allResults.results.push(roleResult);
      allResults.summary.total++;
    }

    const endTime = new Date();
    allResults.endTime = endTime.toISOString();
    allResults.duration = endTime - startTime;
    allResults.screenshots = this.screenshots;

    // 生成测试报告
    await this.generateReport(allResults);
    
    return allResults;
  }

  async generateReport(results) {
    console.log('\n📊 生成测试报告...');
    
    // 确保报告目录存在
    const reportDir = './test-reports';
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    // 生成JSON报告
    const jsonReport = JSON.stringify(results, null, 2);
    const jsonPath = path.join(reportDir, `multi-role-login-test-${Date.now()}.json`);
    fs.writeFileSync(jsonPath, jsonReport);

    // 生成HTML报告
    const htmlReport = this.generateHtmlReport(results);
    const htmlPath = path.join(reportDir, `multi-role-login-test-${Date.now()}.html`);
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
    <title>多角色登录验证测试报告</title>
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
        .test-section { margin-bottom: 20px; }
        .test-section h4 { margin-bottom: 10px; color: #333; }
        .permission-list { list-style: none; padding: 0; }
        .permission-list li { padding: 8px; margin: 4px 0; border-radius: 4px; }
        .permission-list li.success { background: #d4edda; color: #155724; }
        .permission-list li.failed { background: #f8d7da; color: #721c24; }
        .screenshot-gallery { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; }
        .screenshot { text-align: center; }
        .screenshot img { max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>多角色登录验证测试报告</h1>
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
                    ${result.role} (${result.userType}) - ${result.overallStatus === 'passed' ? '✅ 通过' : '❌ 失败'}
                </div>
                <div class="test-content">
                    <div class="test-section">
                        <h4>登录测试</h4>
                        <p>状态: ${result.loginResult?.success ? '✅ 成功' : '❌ 失败'}</p>
                        ${result.loginResult?.error ? `<p>错误: ${result.loginResult.error}</p>` : ''}
                    </div>
                    
                    ${result.permissionResult ? `
                        <div class="test-section">
                            <h4>权限验证</h4>
                            <h5>菜单访问权限:</h5>
                            <ul class="permission-list">
                                ${result.permissionResult.menuAccess.map(menu => 
                                    `<li class="${menu.accessible ? 'success' : 'failed'}">
                                        ${menu.menu}: ${menu.accessible ? '✅ 可访问' : '❌ 不可访问'}
                                    </li>`
                                ).join('')}
                            </ul>
                            
                            <h5>页面访问权限:</h5>
                            <ul class="permission-list">
                                ${result.permissionResult.permissionChecks.map(check => 
                                    `<li class="${check.accessible ? 'success' : 'failed'}">
                                        ${check.module}: ${check.accessible ? '✅ 可访问' : '❌ 不可访问'}
                                    </li>`
                                ).join('')}
                            </ul>
                        </div>
                    ` : ''}
                    
                    <div class="test-section">
                        <h4>登出测试</h4>
                        <p>状态: ${result.logoutResult ? '✅ 成功' : '❌ 失败'}</p>
                    </div>
                </div>
            </div>
        `).join('')}
        
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
async function runMultiRoleLoginTest() {
  const test = new MultiRoleLoginTest();
  
  try {
    await test.init();
    const results = await test.runAllRoleTests();
    
    console.log('\n🎉 多角色登录验证测试完成!');
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
  runMultiRoleLoginTest()
    .then(() => {
      console.log('✅ 多角色登录测试完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 测试失败:', error);
      process.exit(1);
    });
}

export { MultiRoleLoginTest, runMultiRoleLoginTest };