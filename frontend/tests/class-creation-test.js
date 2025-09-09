import puppeteer from 'puppeteer';
import config from '../../test-config.js';
import fs from 'fs';
import path from 'path';

/**
 * 班级创建流程UI测试
 * 完整模拟用户通过WEB UI创建班级的操作流程
 */
class ClassCreationTest {
  constructor() {
    this.browser = null;
    this.page = null;
    this.testResults = [];
    this.screenshots = [];
    this.createdClasses = []; // 记录创建的班级，用于清理
  }

  async init() {
    console.log('🚀 初始化班级创建流程测试...');
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

  async loginAsTeacher() {
    console.log('\n🔐 使用教师账号登录...');
    const teacher = config.testUsers.teacher;
    
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
      await this.page.type('input[type="text"]', teacher.username);

      await this.page.click('input[type="password"]');
      await this.page.keyboard.down('Control');
      await this.page.keyboard.press('KeyA');
      await this.page.keyboard.up('Control');
      await this.page.type('input[type="password"]', teacher.password);

      await this.page.click('button[type="submit"]');
      await this.page.waitForTimeout(3000);

      const currentUrl = this.page.url();
      const isLoginSuccess = !currentUrl.includes('/login');

      if (isLoginSuccess) {
        console.log('   ✅ 教师登录成功');
        await this.takeScreenshot('teacher_login_success');
        return true;
      } else {
        console.log('   ❌ 教师登录失败');
        await this.takeScreenshot('teacher_login_failed');
        return false;
      }
    } catch (error) {
      console.log(`   ❌ 登录异常: ${error.message}`);
      return false;
    }
  }

  async navigateToClassManagement() {
    console.log('\n🧭 导航到班级管理页面...');
    
    try {
      // 方法1: 通过菜单导航
      const menuSelectors = [
        'text=班级管理',
        '.menu-item:has-text("班级管理")',
        'a[href*="/class"]',
        '.nav-link:has-text("班级")',
        '.sidebar-menu .class-menu'
      ];

      let navigated = false;
      for (const selector of menuSelectors) {
        try {
          const element = await this.page.$(selector);
          if (element) {
            await element.click();
            await this.page.waitForTimeout(2000);
            
            const currentUrl = this.page.url();
            if (currentUrl.includes('/class')) {
              console.log('   ✅ 通过菜单成功导航到班级管理页面');
              navigated = true;
              break;
            }
          }
        } catch (error) {
          // 继续尝试下一个选择器
        }
      }

      // 方法2: 直接访问URL
      if (!navigated) {
        await this.page.goto(config.testEnvironment.baseUrl + '/class', {
          waitUntil: 'networkidle2',
          timeout: 10000
        });
        
        const currentUrl = this.page.url();
        if (currentUrl.includes('/class')) {
          console.log('   ✅ 通过直接访问URL导航到班级管理页面');
          navigated = true;
        }
      }

      if (navigated) {
        await this.takeScreenshot('class_management_page');
        return true;
      } else {
        console.log('   ❌ 无法导航到班级管理页面');
        await this.takeScreenshot('navigation_failed');
        return false;
      }
    } catch (error) {
      console.log(`   ❌ 导航异常: ${error.message}`);
      await this.takeScreenshot('navigation_error');
      return false;
    }
  }

  async clickCreateClassButton() {
    console.log('\n➕ 点击创建班级按钮...');
    
    try {
      const createButtonSelectors = [
        'text=新增班级',
        'text=创建班级',
        'text=添加班级',
        '.add-btn',
        '.create-btn',
        '.new-class-btn',
        'button:has-text("新增")',
        'button:has-text("创建")',
        '.el-button--primary:has-text("新增")',
        '.btn-primary'
      ];

      for (const selector of createButtonSelectors) {
        try {
          const element = await this.page.$(selector);
          if (element) {
            await element.click();
            await this.page.waitForTimeout(1000);
            
            // 检查是否出现了创建表单或对话框
            const formSelectors = [
              '.el-dialog',
              '.modal',
              '.class-form',
              '.create-form',
              'form',
              '.form-container'
            ];
            
            for (const formSelector of formSelectors) {
              const formElement = await this.page.$(formSelector);
              if (formElement) {
                console.log('   ✅ 成功打开创建班级表单');
                await this.takeScreenshot('create_form_opened');
                return true;
              }
            }
          }
        } catch (error) {
          // 继续尝试下一个选择器
        }
      }

      console.log('   ❌ 无法找到或点击创建班级按钮');
      await this.takeScreenshot('create_button_not_found');
      return false;
    } catch (error) {
      console.log(`   ❌ 点击创建按钮异常: ${error.message}`);
      await this.takeScreenshot('create_button_error');
      return false;
    }
  }

  async fillClassForm(classData) {
    console.log('\n📝 填写班级信息表单...');
    
    try {
      await this.page.waitForTimeout(1000);
      
      const formFields = {
        className: {
          selectors: [
            'input[placeholder*="班级名称"]',
            'input[name="className"]',
            'input[name="name"]',
            '.class-name-input input',
            '.el-input__inner[placeholder*="名称"]'
          ],
          value: classData.className
        },
        classCode: {
          selectors: [
            'input[placeholder*="班级代码"]',
            'input[name="classCode"]',
            'input[name="code"]',
            '.class-code-input input',
            '.el-input__inner[placeholder*="代码"]'
          ],
          value: classData.classCode
        },
        description: {
          selectors: [
            'textarea[placeholder*="描述"]',
            'textarea[name="description"]',
            '.description-input textarea',
            '.el-textarea__inner[placeholder*="描述"]'
          ],
          value: classData.description
        },
        maxStudents: {
          selectors: [
            'input[placeholder*="最大人数"]',
            'input[name="maxStudents"]',
            'input[type="number"]',
            '.max-students-input input'
          ],
          value: classData.maxStudents.toString()
        }
      };

      const fillResults = {};
      
      for (const [fieldName, fieldConfig] of Object.entries(formFields)) {
        let filled = false;
        
        for (const selector of fieldConfig.selectors) {
          try {
            const element = await this.page.$(selector);
            if (element) {
              // 清空字段
              await element.click();
              await this.page.keyboard.down('Control');
              await this.page.keyboard.press('KeyA');
              await this.page.keyboard.up('Control');
              
              // 输入新值
              await this.page.type(selector, fieldConfig.value);
              
              console.log(`   ✅ 成功填写 ${fieldName}: ${fieldConfig.value}`);
              fillResults[fieldName] = { success: true, value: fieldConfig.value };
              filled = true;
              break;
            }
          } catch (error) {
            // 继续尝试下一个选择器
          }
        }
        
        if (!filled) {
          console.log(`   ❌ 无法填写 ${fieldName}`);
          fillResults[fieldName] = { success: false, error: '找不到字段' };
        }
      }

      await this.takeScreenshot('form_filled');
      return fillResults;
    } catch (error) {
      console.log(`   ❌ 填写表单异常: ${error.message}`);
      await this.takeScreenshot('form_fill_error');
      return { error: error.message };
    }
  }

  async submitClassForm() {
    console.log('\n✅ 提交班级创建表单...');
    
    try {
      const submitButtonSelectors = [
        'button:has-text("确定")',
        'button:has-text("提交")',
        'button:has-text("保存")',
        'button:has-text("创建")',
        '.submit-btn',
        '.confirm-btn',
        '.el-button--primary:has-text("确定")',
        '.btn-primary',
        'button[type="submit"]'
      ];

      for (const selector of submitButtonSelectors) {
        try {
          const element = await this.page.$(selector);
          if (element) {
            await element.click();
            await this.page.waitForTimeout(3000);
            
            console.log('   ✅ 成功提交表单');
            await this.takeScreenshot('form_submitted');
            return true;
          }
        } catch (error) {
          // 继续尝试下一个选择器
        }
      }

      console.log('   ❌ 无法找到提交按钮');
      await this.takeScreenshot('submit_button_not_found');
      return false;
    } catch (error) {
      console.log(`   ❌ 提交表单异常: ${error.message}`);
      await this.takeScreenshot('submit_error');
      return false;
    }
  }

  async verifyClassCreation(classData) {
    console.log('\n🔍 验证班级创建结果...');
    
    try {
      // 等待页面更新
      await this.page.waitForTimeout(2000);
      
      const verificationResults = {
        successMessage: false,
        classInList: false,
        classDetails: null
      };

      // 1. 检查成功提示消息
      const successMessageSelectors = [
        '.el-message--success',
        '.success-message',
        '.alert-success',
        'text=创建成功',
        'text=添加成功',
        '.notification-success'
      ];

      for (const selector of successMessageSelectors) {
        try {
          const element = await this.page.$(selector);
          if (element) {
            console.log('   ✅ 检测到成功提示消息');
            verificationResults.successMessage = true;
            break;
          }
        } catch (error) {
          // 继续检查
        }
      }

      // 2. 检查班级是否出现在列表中
      try {
        // 刷新页面或重新加载列表
        await this.page.reload({ waitUntil: 'networkidle2' });
        await this.page.waitForTimeout(2000);
        
        // 查找包含班级名称的元素
        const classNameElement = await this.page.$(`text=${classData.className}`);
        if (classNameElement) {
          console.log(`   ✅ 在列表中找到班级: ${classData.className}`);
          verificationResults.classInList = true;
          
          // 尝试获取班级详细信息
          try {
            const rowElement = await classNameElement.evaluateHandle(el => el.closest('tr') || el.closest('.class-item'));
            if (rowElement) {
              const rowText = await this.page.evaluate(el => el.textContent, rowElement);
              verificationResults.classDetails = rowText;
            }
          } catch (error) {
            // 获取详细信息失败，但不影响主要验证
          }
        } else {
          console.log(`   ❌ 在列表中未找到班级: ${classData.className}`);
        }
      } catch (error) {
        console.log(`   ❌ 验证班级列表时出错: ${error.message}`);
      }

      await this.takeScreenshot('verification_completed');
      return verificationResults;
    } catch (error) {
      console.log(`   ❌ 验证异常: ${error.message}`);
      await this.takeScreenshot('verification_error');
      return { error: error.message };
    }
  }

  async testClassCreationFlow(classData) {
    console.log(`\n🎯 测试班级创建流程: ${classData.className}`);
    console.log('-'.repeat(50));
    
    const testResult = {
      classData,
      steps: {
        login: false,
        navigation: false,
        openForm: false,
        fillForm: null,
        submit: false,
        verification: null
      },
      overallStatus: 'failed',
      error: null
    };

    try {
      // 步骤1: 登录
      testResult.steps.login = await this.loginAsTeacher();
      if (!testResult.steps.login) {
        throw new Error('教师登录失败');
      }

      // 步骤2: 导航到班级管理页面
      testResult.steps.navigation = await this.navigateToClassManagement();
      if (!testResult.steps.navigation) {
        throw new Error('导航到班级管理页面失败');
      }

      // 步骤3: 打开创建表单
      testResult.steps.openForm = await this.clickCreateClassButton();
      if (!testResult.steps.openForm) {
        throw new Error('打开创建表单失败');
      }

      // 步骤4: 填写表单
      testResult.steps.fillForm = await this.fillClassForm(classData);
      if (testResult.steps.fillForm.error) {
        throw new Error('填写表单失败: ' + testResult.steps.fillForm.error);
      }

      // 步骤5: 提交表单
      testResult.steps.submit = await this.submitClassForm();
      if (!testResult.steps.submit) {
        throw new Error('提交表单失败');
      }

      // 步骤6: 验证创建结果
      testResult.steps.verification = await this.verifyClassCreation(classData);
      
      // 判断整体状态
      if (testResult.steps.verification.classInList) {
        testResult.overallStatus = 'passed';
        this.createdClasses.push(classData);
        console.log(`   🎉 班级 "${classData.className}" 创建成功!`);
      } else {
        testResult.overallStatus = 'failed';
        console.log(`   ❌ 班级 "${classData.className}" 创建失败`);
      }

    } catch (error) {
      testResult.error = error.message;
      testResult.overallStatus = 'error';
      console.log(`   ❌ 测试异常: ${error.message}`);
    }

    return testResult;
  }

  async runAllClassCreationTests() {
    console.log('\n🎯 开始执行班级创建流程测试');
    console.log('=' .repeat(60));
    
    const startTime = new Date();
    const allResults = {
      testSuite: '班级创建流程测试',
      startTime: startTime.toISOString(),
      results: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        errors: 0
      }
    };

    // 测试有效班级创建
    console.log('\n📋 测试有效班级数据创建');
    const validResult = await this.testClassCreationFlow(config.classTestData.validClass);
    allResults.results.push(validResult);
    
    if (validResult.overallStatus === 'passed') {
      allResults.summary.passed++;
    } else if (validResult.overallStatus === 'error') {
      allResults.summary.errors++;
    } else {
      allResults.summary.failed++;
    }
    allResults.summary.total++;

    // 测试无效班级创建（验证表单验证）
    console.log('\n📋 测试无效班级数据创建（表单验证）');
    const invalidResult = await this.testClassCreationFlow(config.classTestData.invalidClass);
    allResults.results.push(invalidResult);
    
    // 对于无效数据，期望的是创建失败
    if (invalidResult.overallStatus === 'failed' && !invalidResult.error) {
      // 这是期望的结果：表单验证阻止了无效数据的提交
      invalidResult.overallStatus = 'passed';
      invalidResult.expectedFailure = true;
      allResults.summary.passed++;
    } else if (invalidResult.overallStatus === 'error') {
      allResults.summary.errors++;
    } else {
      allResults.summary.failed++;
    }
    allResults.summary.total++;

    const endTime = new Date();
    allResults.endTime = endTime.toISOString();
    allResults.duration = endTime - startTime;
    allResults.screenshots = this.screenshots;
    allResults.createdClasses = this.createdClasses;

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
    const jsonPath = path.join(reportDir, `class-creation-test-${Date.now()}.json`);
    fs.writeFileSync(jsonPath, jsonReport);

    // 生成HTML报告
    const htmlReport = this.generateHtmlReport(results);
    const htmlPath = path.join(reportDir, `class-creation-test-${Date.now()}.html`);
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
    <title>班级创建流程测试报告</title>
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
        .test-header.error { background: #fff3cd; color: #856404; }
        .test-content { padding: 20px; }
        .step-list { list-style: none; padding: 0; }
        .step-list li { padding: 10px; margin: 5px 0; border-radius: 4px; border-left: 4px solid #ddd; }
        .step-list li.success { background: #d4edda; border-left-color: #28a745; }
        .step-list li.failed { background: #f8d7da; border-left-color: #dc3545; }
        .class-data { background: #f8f9fa; padding: 15px; border-radius: 4px; margin: 10px 0; }
        .screenshot-gallery { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; }
        .screenshot { text-align: center; }
        .screenshot img { max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>班级创建流程测试报告</h1>
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
        
        ${results.results.map((result, index) => `
            <div class="test-result">
                <div class="test-header ${result.overallStatus}">
                    测试 ${index + 1}: ${result.classData.className} - 
                    ${result.overallStatus === 'passed' ? '✅ 通过' : 
                      result.overallStatus === 'error' ? '⚠️ 错误' : '❌ 失败'}
                    ${result.expectedFailure ? '(预期失败)' : ''}
                </div>
                <div class="test-content">
                    <div class="class-data">
                        <h4>测试数据:</h4>
                        <p><strong>班级名称:</strong> ${result.classData.className}</p>
                        <p><strong>班级代码:</strong> ${result.classData.classCode}</p>
                        <p><strong>描述:</strong> ${result.classData.description}</p>
                        <p><strong>最大学生数:</strong> ${result.classData.maxStudents}</p>
                    </div>
                    
                    <h4>测试步骤:</h4>
                    <ul class="step-list">
                        <li class="${result.steps.login ? 'success' : 'failed'}">
                            1. 教师登录: ${result.steps.login ? '✅ 成功' : '❌ 失败'}
                        </li>
                        <li class="${result.steps.navigation ? 'success' : 'failed'}">
                            2. 导航到班级管理: ${result.steps.navigation ? '✅ 成功' : '❌ 失败'}
                        </li>
                        <li class="${result.steps.openForm ? 'success' : 'failed'}">
                            3. 打开创建表单: ${result.steps.openForm ? '✅ 成功' : '❌ 失败'}
                        </li>
                        <li class="${result.steps.fillForm && !result.steps.fillForm.error ? 'success' : 'failed'}">
                            4. 填写表单: ${result.steps.fillForm && !result.steps.fillForm.error ? '✅ 成功' : '❌ 失败'}
                        </li>
                        <li class="${result.steps.submit ? 'success' : 'failed'}">
                            5. 提交表单: ${result.steps.submit ? '✅ 成功' : '❌ 失败'}
                        </li>
                        <li class="${result.steps.verification && result.steps.verification.classInList ? 'success' : 'failed'}">
                            6. 验证创建结果: ${result.steps.verification && result.steps.verification.classInList ? '✅ 成功' : '❌ 失败'}
                        </li>
                    </ul>
                    
                    ${result.error ? `<p><strong>错误信息:</strong> ${result.error}</p>` : ''}
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
async function runClassCreationTest() {
  const test = new ClassCreationTest();
  
  try {
    await test.init();
    const results = await test.runAllClassCreationTests();
    
    console.log('\n🎉 班级创建流程测试完成!');
    console.log('=' .repeat(60));
    console.log(`📊 测试总结:`);
    console.log(`   总测试数: ${results.summary.total}`);
    console.log(`   通过: ${results.summary.passed}`);
    console.log(`   失败: ${results.summary.failed}`);
    console.log(`   错误: ${results.summary.errors}`);
    console.log(`   成功率: ${Math.round((results.summary.passed / results.summary.total) * 100)}%`);
    
    if (results.createdClasses.length > 0) {
      console.log(`\n📝 创建的班级:`);
      results.createdClasses.forEach(cls => {
        console.log(`   - ${cls.className} (${cls.classCode})`);
      });
    }
    
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
  runClassCreationTest()
    .then(() => {
      console.log('✅ 班级创建测试完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 测试失败:', error);
      process.exit(1);
    });
}

export { ClassCreationTest, runClassCreationTest };