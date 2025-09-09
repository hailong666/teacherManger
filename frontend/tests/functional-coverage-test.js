import puppeteer from 'puppeteer';
import config from '../../test-config.js';
import fs from 'fs';
import path from 'path';

/**
 * 功能覆盖测试
 * 对系统所有主要功能模块进行UI操作测试
 */
class FunctionalCoverageTest {
  constructor() {
    this.browser = null;
    this.page = null;
    this.testResults = [];
    this.screenshots = [];
    this.currentUser = null;
  }

  async init() {
    console.log('🚀 初始化功能覆盖测试...');
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
        await this.takeScreenshot(`login_${userType}_success`);
        return true;
      } else {
        console.log(`   ❌ ${user.role}登录失败`);
        await this.takeScreenshot(`login_${userType}_failed`);
        return false;
      }
    } catch (error) {
      console.log(`   ❌ 登录异常: ${error.message}`);
      return false;
    }
  }

  async testUserManagement() {
    console.log('\n👥 测试用户管理功能...');
    
    const testResult = {
      module: '用户管理',
      actions: [],
      overallStatus: 'failed'
    };

    try {
      // 导航到用户管理页面
      await this.page.goto(config.testEnvironment.baseUrl + '/user', {
        waitUntil: 'networkidle2',
        timeout: 10000
      });
      
      await this.takeScreenshot('user_management_page');
      
      // 测试查看用户列表
      const viewListResult = await this.testViewUserList();
      testResult.actions.push(viewListResult);
      
      // 测试添加用户
      const addUserResult = await this.testAddUser();
      testResult.actions.push(addUserResult);
      
      // 测试搜索用户
      const searchUserResult = await this.testSearchUser();
      testResult.actions.push(searchUserResult);
      
      // 测试编辑用户
      const editUserResult = await this.testEditUser();
      testResult.actions.push(editUserResult);
      
      // 判断整体状态
      const successCount = testResult.actions.filter(action => action.success).length;
      testResult.overallStatus = successCount >= testResult.actions.length * 0.7 ? 'passed' : 'failed';
      
    } catch (error) {
      testResult.error = error.message;
      console.log(`   ❌ 用户管理测试异常: ${error.message}`);
    }

    return testResult;
  }

  async testViewUserList() {
    console.log('   📋 测试查看用户列表...');
    
    try {
      // 等待表格加载
      await this.page.waitForTimeout(2000);
      
      // 检查是否有用户列表表格
      const tableSelectors = [
        '.el-table',
        '.user-table',
        'table',
        '.data-table'
      ];
      
      for (const selector of tableSelectors) {
        const table = await this.page.$(selector);
        if (table) {
          console.log('     ✅ 用户列表加载成功');
          await this.takeScreenshot('user_list_loaded');
          return { action: '查看用户列表', success: true };
        }
      }
      
      console.log('     ❌ 未找到用户列表');
      return { action: '查看用户列表', success: false, error: '未找到用户列表' };
    } catch (error) {
      console.log(`     ❌ 查看用户列表异常: ${error.message}`);
      return { action: '查看用户列表', success: false, error: error.message };
    }
  }

  async testAddUser() {
    console.log('   ➕ 测试添加用户...');
    
    try {
      // 查找添加按钮
      const addButtonSelectors = [
        'text=新增用户',
        'text=添加用户',
        '.add-btn',
        '.new-user-btn',
        'button:has-text("新增")',
        '.el-button--primary:has-text("新增")'
      ];
      
      let addButtonFound = false;
      for (const selector of addButtonSelectors) {
        try {
          const button = await this.page.$(selector);
          if (button) {
            await button.click();
            await this.page.waitForTimeout(1000);
            addButtonFound = true;
            break;
          }
        } catch (error) {
          // 继续尝试下一个选择器
        }
      }
      
      if (!addButtonFound) {
        console.log('     ❌ 未找到添加用户按钮');
        return { action: '添加用户', success: false, error: '未找到添加按钮' };
      }
      
      // 检查是否打开了添加表单
      const formSelectors = [
        '.el-dialog',
        '.modal',
        '.user-form',
        '.add-form'
      ];
      
      for (const selector of formSelectors) {
        const form = await this.page.$(selector);
        if (form) {
          console.log('     ✅ 添加用户表单打开成功');
          await this.takeScreenshot('add_user_form');
          
          // 尝试关闭表单
          const cancelSelectors = [
            'text=取消',
            '.cancel-btn',
            '.el-dialog__close'
          ];
          
          for (const cancelSelector of cancelSelectors) {
            try {
              const cancelBtn = await this.page.$(cancelSelector);
              if (cancelBtn) {
                await cancelBtn.click();
                break;
              }
            } catch (error) {
              // 继续尝试
            }
          }
          
          return { action: '添加用户', success: true };
        }
      }
      
      console.log('     ❌ 添加用户表单未打开');
      return { action: '添加用户', success: false, error: '表单未打开' };
    } catch (error) {
      console.log(`     ❌ 添加用户异常: ${error.message}`);
      return { action: '添加用户', success: false, error: error.message };
    }
  }

  async testSearchUser() {
    console.log('   🔍 测试搜索用户...');
    
    try {
      // 查找搜索框
      const searchSelectors = [
        '.search-input input',
        'input[placeholder*="搜索"]',
        'input[placeholder*="查找"]',
        '.el-input__inner[placeholder*="搜索"]'
      ];
      
      for (const selector of searchSelectors) {
        try {
          const searchInput = await this.page.$(selector);
          if (searchInput) {
            await searchInput.click();
            await this.page.type(selector, 'admin');
            await this.page.keyboard.press('Enter');
            await this.page.waitForTimeout(2000);
            
            console.log('     ✅ 搜索功能执行成功');
            await this.takeScreenshot('user_search_result');
            
            // 清空搜索框
            await searchInput.click();
            await this.page.keyboard.down('Control');
            await this.page.keyboard.press('KeyA');
            await this.page.keyboard.up('Control');
            await this.page.keyboard.press('Backspace');
            
            return { action: '搜索用户', success: true };
          }
        } catch (error) {
          // 继续尝试下一个选择器
        }
      }
      
      console.log('     ❌ 未找到搜索框');
      return { action: '搜索用户', success: false, error: '未找到搜索框' };
    } catch (error) {
      console.log(`     ❌ 搜索用户异常: ${error.message}`);
      return { action: '搜索用户', success: false, error: error.message };
    }
  }

  async testEditUser() {
    console.log('   ✏️ 测试编辑用户...');
    
    try {
      // 查找编辑按钮
      const editButtonSelectors = [
        'text=编辑',
        '.edit-btn',
        '.el-button:has-text("编辑")',
        'button:has-text("编辑")'
      ];
      
      for (const selector of editButtonSelectors) {
        try {
          const button = await this.page.$(selector);
          if (button) {
            await button.click();
            await this.page.waitForTimeout(1000);
            
            // 检查是否打开了编辑表单
            const formSelectors = [
              '.el-dialog',
              '.modal',
              '.edit-form'
            ];
            
            for (const formSelector of formSelectors) {
              const form = await this.page.$(formSelector);
              if (form) {
                console.log('     ✅ 编辑用户表单打开成功');
                await this.takeScreenshot('edit_user_form');
                
                // 关闭表单
                const cancelSelectors = [
                  'text=取消',
                  '.cancel-btn',
                  '.el-dialog__close'
                ];
                
                for (const cancelSelector of cancelSelectors) {
                  try {
                    const cancelBtn = await this.page.$(cancelSelector);
                    if (cancelBtn) {
                      await cancelBtn.click();
                      break;
                    }
                  } catch (error) {
                    // 继续尝试
                  }
                }
                
                return { action: '编辑用户', success: true };
              }
            }
          }
        } catch (error) {
          // 继续尝试下一个选择器
        }
      }
      
      console.log('     ❌ 未找到编辑按钮或表单未打开');
      return { action: '编辑用户', success: false, error: '未找到编辑按钮' };
    } catch (error) {
      console.log(`     ❌ 编辑用户异常: ${error.message}`);
      return { action: '编辑用户', success: false, error: error.message };
    }
  }

  async testClassManagement() {
    console.log('\n🏫 测试班级管理功能...');
    
    const testResult = {
      module: '班级管理',
      actions: [],
      overallStatus: 'failed'
    };

    try {
      // 导航到班级管理页面
      await this.page.goto(config.testEnvironment.baseUrl + '/class', {
        waitUntil: 'networkidle2',
        timeout: 10000
      });
      
      await this.takeScreenshot('class_management_page');
      
      // 测试查看班级列表
      const viewListResult = await this.testViewClassList();
      testResult.actions.push(viewListResult);
      
      // 测试创建班级
      const createClassResult = await this.testCreateClass();
      testResult.actions.push(createClassResult);
      
      // 测试班级详情
      const classDetailResult = await this.testClassDetail();
      testResult.actions.push(classDetailResult);
      
      // 判断整体状态
      const successCount = testResult.actions.filter(action => action.success).length;
      testResult.overallStatus = successCount >= testResult.actions.length * 0.7 ? 'passed' : 'failed';
      
    } catch (error) {
      testResult.error = error.message;
      console.log(`   ❌ 班级管理测试异常: ${error.message}`);
    }

    return testResult;
  }

  async testViewClassList() {
    console.log('   📋 测试查看班级列表...');
    
    try {
      await this.page.waitForTimeout(2000);
      
      const tableSelectors = [
        '.el-table',
        '.class-table',
        'table',
        '.data-table'
      ];
      
      for (const selector of tableSelectors) {
        const table = await this.page.$(selector);
        if (table) {
          console.log('     ✅ 班级列表加载成功');
          await this.takeScreenshot('class_list_loaded');
          return { action: '查看班级列表', success: true };
        }
      }
      
      console.log('     ❌ 未找到班级列表');
      return { action: '查看班级列表', success: false, error: '未找到班级列表' };
    } catch (error) {
      console.log(`     ❌ 查看班级列表异常: ${error.message}`);
      return { action: '查看班级列表', success: false, error: error.message };
    }
  }

  async testCreateClass() {
    console.log('   ➕ 测试创建班级...');
    
    try {
      const addButtonSelectors = [
        'text=新增班级',
        'text=创建班级',
        '.add-btn',
        '.create-btn',
        'button:has-text("新增")',
        '.el-button--primary:has-text("新增")'
      ];
      
      for (const selector of addButtonSelectors) {
        try {
          const button = await this.page.$(selector);
          if (button) {
            await button.click();
            await this.page.waitForTimeout(1000);
            
            // 检查是否打开了创建表单
            const formSelectors = [
              '.el-dialog',
              '.modal',
              '.class-form'
            ];
            
            for (const formSelector of formSelectors) {
              const form = await this.page.$(formSelector);
              if (form) {
                console.log('     ✅ 创建班级表单打开成功');
                await this.takeScreenshot('create_class_form');
                
                // 关闭表单
                const cancelSelectors = [
                  'text=取消',
                  '.cancel-btn',
                  '.el-dialog__close'
                ];
                
                for (const cancelSelector of cancelSelectors) {
                  try {
                    const cancelBtn = await this.page.$(cancelSelector);
                    if (cancelBtn) {
                      await cancelBtn.click();
                      break;
                    }
                  } catch (error) {
                    // 继续尝试
                  }
                }
                
                return { action: '创建班级', success: true };
              }
            }
          }
        } catch (error) {
          // 继续尝试下一个选择器
        }
      }
      
      console.log('     ❌ 未找到创建班级按钮');
      return { action: '创建班级', success: false, error: '未找到创建按钮' };
    } catch (error) {
      console.log(`     ❌ 创建班级异常: ${error.message}`);
      return { action: '创建班级', success: false, error: error.message };
    }
  }

  async testClassDetail() {
    console.log('   👁️ 测试班级详情...');
    
    try {
      const detailButtonSelectors = [
        'text=详情',
        'text=查看',
        '.detail-btn',
        '.view-btn',
        'button:has-text("详情")',
        'button:has-text("查看")'
      ];
      
      for (const selector of detailButtonSelectors) {
        try {
          const button = await this.page.$(selector);
          if (button) {
            await button.click();
            await this.page.waitForTimeout(2000);
            
            console.log('     ✅ 班级详情查看成功');
            await this.takeScreenshot('class_detail_view');
            
            // 返回列表
            await this.page.goBack();
            await this.page.waitForTimeout(1000);
            
            return { action: '班级详情', success: true };
          }
        } catch (error) {
          // 继续尝试下一个选择器
        }
      }
      
      console.log('     ❌ 未找到详情按钮');
      return { action: '班级详情', success: false, error: '未找到详情按钮' };
    } catch (error) {
      console.log(`     ❌ 查看班级详情异常: ${error.message}`);
      return { action: '班级详情', success: false, error: error.message };
    }
  }

  async testStudentManagement() {
    console.log('\n🎓 测试学生管理功能...');
    
    const testResult = {
      module: '学生管理',
      actions: [],
      overallStatus: 'failed'
    };

    try {
      // 导航到学生管理页面
      await this.page.goto(config.testEnvironment.baseUrl + '/student', {
        waitUntil: 'networkidle2',
        timeout: 10000
      });
      
      await this.takeScreenshot('student_management_page');
      
      // 测试查看学生列表
      const viewListResult = await this.testViewStudentList();
      testResult.actions.push(viewListResult);
      
      // 测试添加学生
      const addStudentResult = await this.testAddStudent();
      testResult.actions.push(addStudentResult);
      
      // 测试学生分配
      const assignStudentResult = await this.testAssignStudent();
      testResult.actions.push(assignStudentResult);
      
      // 判断整体状态
      const successCount = testResult.actions.filter(action => action.success).length;
      testResult.overallStatus = successCount >= testResult.actions.length * 0.7 ? 'passed' : 'failed';
      
    } catch (error) {
      testResult.error = error.message;
      console.log(`   ❌ 学生管理测试异常: ${error.message}`);
    }

    return testResult;
  }

  async testViewStudentList() {
    console.log('   📋 测试查看学生列表...');
    
    try {
      await this.page.waitForTimeout(2000);
      
      const tableSelectors = [
        '.el-table',
        '.student-table',
        'table',
        '.data-table'
      ];
      
      for (const selector of tableSelectors) {
        const table = await this.page.$(selector);
        if (table) {
          console.log('     ✅ 学生列表加载成功');
          await this.takeScreenshot('student_list_loaded');
          return { action: '查看学生列表', success: true };
        }
      }
      
      console.log('     ❌ 未找到学生列表');
      return { action: '查看学生列表', success: false, error: '未找到学生列表' };
    } catch (error) {
      console.log(`     ❌ 查看学生列表异常: ${error.message}`);
      return { action: '查看学生列表', success: false, error: error.message };
    }
  }

  async testAddStudent() {
    console.log('   ➕ 测试添加学生...');
    
    try {
      const addButtonSelectors = [
        'text=新增学生',
        'text=添加学生',
        '.add-btn',
        '.new-student-btn',
        'button:has-text("新增")',
        '.el-button--primary:has-text("新增")'
      ];
      
      for (const selector of addButtonSelectors) {
        try {
          const button = await this.page.$(selector);
          if (button) {
            await button.click();
            await this.page.waitForTimeout(1000);
            
            // 检查是否打开了添加表单
            const formSelectors = [
              '.el-dialog',
              '.modal',
              '.student-form'
            ];
            
            for (const formSelector of formSelectors) {
              const form = await this.page.$(formSelector);
              if (form) {
                console.log('     ✅ 添加学生表单打开成功');
                await this.takeScreenshot('add_student_form');
                
                // 关闭表单
                const cancelSelectors = [
                  'text=取消',
                  '.cancel-btn',
                  '.el-dialog__close'
                ];
                
                for (const cancelSelector of cancelSelectors) {
                  try {
                    const cancelBtn = await this.page.$(cancelSelector);
                    if (cancelBtn) {
                      await cancelBtn.click();
                      break;
                    }
                  } catch (error) {
                    // 继续尝试
                  }
                }
                
                return { action: '添加学生', success: true };
              }
            }
          }
        } catch (error) {
          // 继续尝试下一个选择器
        }
      }
      
      console.log('     ❌ 未找到添加学生按钮');
      return { action: '添加学生', success: false, error: '未找到添加按钮' };
    } catch (error) {
      console.log(`     ❌ 添加学生异常: ${error.message}`);
      return { action: '添加学生', success: false, error: error.message };
    }
  }

  async testAssignStudent() {
    console.log('   🔄 测试学生分配...');
    
    try {
      const assignButtonSelectors = [
        'text=分配',
        'text=分配班级',
        '.assign-btn',
        'button:has-text("分配")'
      ];
      
      for (const selector of assignButtonSelectors) {
        try {
          const button = await this.page.$(selector);
          if (button) {
            await button.click();
            await this.page.waitForTimeout(1000);
            
            console.log('     ✅ 学生分配功能可用');
            await this.takeScreenshot('student_assign');
            return { action: '学生分配', success: true };
          }
        } catch (error) {
          // 继续尝试下一个选择器
        }
      }
      
      console.log('     ❌ 未找到分配按钮');
      return { action: '学生分配', success: false, error: '未找到分配按钮' };
    } catch (error) {
      console.log(`     ❌ 学生分配异常: ${error.message}`);
      return { action: '学生分配', success: false, error: error.message };
    }
  }

  async testWhiteboardAttendance() {
    console.log('\n📝 测试白板签到功能...');
    
    const testResult = {
      module: '白板签到',
      actions: [],
      overallStatus: 'failed'
    };

    try {
      // 导航到白板签到页面
      await this.page.goto(config.testEnvironment.baseUrl + '/whiteboard', {
        waitUntil: 'networkidle2',
        timeout: 10000
      });
      
      await this.takeScreenshot('whiteboard_attendance_page');
      
      // 测试查看签到状态
      const viewStatusResult = await this.testViewAttendanceStatus();
      testResult.actions.push(viewStatusResult);
      
      // 测试签到功能
      const attendanceResult = await this.testAttendanceAction();
      testResult.actions.push(attendanceResult);
      
      // 判断整体状态
      const successCount = testResult.actions.filter(action => action.success).length;
      testResult.overallStatus = successCount >= testResult.actions.length * 0.7 ? 'passed' : 'failed';
      
    } catch (error) {
      testResult.error = error.message;
      console.log(`   ❌ 白板签到测试异常: ${error.message}`);
    }

    return testResult;
  }

  async testViewAttendanceStatus() {
    console.log('   👁️ 测试查看签到状态...');
    
    try {
      await this.page.waitForTimeout(2000);
      
      // 检查签到状态显示
      const statusSelectors = [
        '.attendance-status',
        '.whiteboard-info',
        '.class-info',
        '.attendance-summary'
      ];
      
      for (const selector of statusSelectors) {
        const element = await this.page.$(selector);
        if (element) {
          console.log('     ✅ 签到状态显示正常');
          await this.takeScreenshot('attendance_status_view');
          return { action: '查看签到状态', success: true };
        }
      }
      
      console.log('     ❌ 未找到签到状态显示');
      return { action: '查看签到状态', success: false, error: '未找到状态显示' };
    } catch (error) {
      console.log(`     ❌ 查看签到状态异常: ${error.message}`);
      return { action: '查看签到状态', success: false, error: error.message };
    }
  }

  async testAttendanceAction() {
    console.log('   ✅ 测试签到操作...');
    
    try {
      // 查找签到按钮或签到区域
      const attendanceSelectors = [
        '.attendance-btn',
        '.sign-in-btn',
        'button:has-text("签到")',
        '.whiteboard-area',
        '.attendance-area'
      ];
      
      for (const selector of attendanceSelectors) {
        try {
          const element = await this.page.$(selector);
          if (element) {
            // 如果是按钮，点击它
            if (selector.includes('btn') || selector.includes('button')) {
              await element.click();
              await this.page.waitForTimeout(1000);
            }
            
            console.log('     ✅ 签到功能可用');
            await this.takeScreenshot('attendance_action');
            return { action: '执行签到', success: true };
          }
        } catch (error) {
          // 继续尝试下一个选择器
        }
      }
      
      console.log('     ❌ 未找到签到功能');
      return { action: '执行签到', success: false, error: '未找到签到功能' };
    } catch (error) {
      console.log(`     ❌ 签到操作异常: ${error.message}`);
      return { action: '执行签到', success: false, error: error.message };
    }
  }

  async runFunctionalCoverageTests() {
    console.log('\n🎯 开始执行功能覆盖测试');
    console.log('=' .repeat(60));
    
    const startTime = new Date();
    const allResults = {
      testSuite: '功能覆盖测试',
      startTime: startTime.toISOString(),
      results: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        errors: 0
      }
    };

    // 使用管理员账号测试用户管理
    console.log('\n📋 使用管理员账号测试用户管理');
    const loginSuccess = await this.loginAs('admin');
    if (loginSuccess) {
      const userMgmtResult = await this.testUserManagement();
      allResults.results.push(userMgmtResult);
      this.updateSummary(allResults.summary, userMgmtResult);
    }

    // 使用教师账号测试班级管理
    console.log('\n📋 使用教师账号测试班级管理');
    const teacherLoginSuccess = await this.loginAs('teacher');
    if (teacherLoginSuccess) {
      const classMgmtResult = await this.testClassManagement();
      allResults.results.push(classMgmtResult);
      this.updateSummary(allResults.summary, classMgmtResult);
      
      // 测试学生管理
      const studentMgmtResult = await this.testStudentManagement();
      allResults.results.push(studentMgmtResult);
      this.updateSummary(allResults.summary, studentMgmtResult);
    }

    // 使用学生账号测试白板签到
    console.log('\n📋 使用学生账号测试白板签到');
    const studentLoginSuccess = await this.loginAs('student');
    if (studentLoginSuccess) {
      const whiteboardResult = await this.testWhiteboardAttendance();
      allResults.results.push(whiteboardResult);
      this.updateSummary(allResults.summary, whiteboardResult);
    }

    const endTime = new Date();
    allResults.endTime = endTime.toISOString();
    allResults.duration = endTime - startTime;
    allResults.screenshots = this.screenshots;

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
    console.log('\n📊 生成测试报告...');
    
    // 确保报告目录存在
    const reportDir = './test-reports';
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    // 生成JSON报告
    const jsonReport = JSON.stringify(results, null, 2);
    const jsonPath = path.join(reportDir, `functional-coverage-test-${Date.now()}.json`);
    fs.writeFileSync(jsonPath, jsonReport);

    // 生成HTML报告
    const htmlReport = this.generateHtmlReport(results);
    const htmlPath = path.join(reportDir, `functional-coverage-test-${Date.now()}.html`);
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
    <title>功能覆盖测试报告</title>
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
        .module-result { margin-bottom: 30px; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; }
        .module-header { background: #f8f9fa; padding: 15px; font-weight: bold; }
        .module-header.passed { background: #d4edda; color: #155724; }
        .module-header.failed { background: #f8d7da; color: #721c24; }
        .module-content { padding: 20px; }
        .action-list { list-style: none; padding: 0; }
        .action-list li { padding: 10px; margin: 5px 0; border-radius: 4px; border-left: 4px solid #ddd; }
        .action-list li.success { background: #d4edda; border-left-color: #28a745; }
        .action-list li.failed { background: #f8d7da; border-left-color: #dc3545; }
        .screenshot-gallery { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; }
        .screenshot { text-align: center; }
        .screenshot img { max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>功能覆盖测试报告</h1>
            <p>测试时间: ${results.startTime} - ${results.endTime}</p>
            <p>测试耗时: ${Math.round(results.duration / 1000)}秒</p>
        </div>
        
        <div class="summary">
            <div class="summary-card total">
                <h3>${results.summary.total}</h3>
                <p>总模块数</p>
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
            <div class="module-result">
                <div class="module-header ${result.overallStatus}">
                    ${result.module} - ${result.overallStatus === 'passed' ? '✅ 通过' : '❌ 失败'}
                </div>
                <div class="module-content">
                    <h4>功能测试结果:</h4>
                    <ul class="action-list">
                        ${result.actions.map(action => `
                            <li class="${action.success ? 'success' : 'failed'}">
                                ${action.action}: ${action.success ? '✅ 成功' : '❌ 失败'}
                                ${action.error ? ` (${action.error})` : ''}
                            </li>
                        `).join('')}
                    </ul>
                    ${result.error ? `<p><strong>模块错误:</strong> ${result.error}</p>` : ''}
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
async function runFunctionalCoverageTest() {
  const test = new FunctionalCoverageTest();
  
  try {
    await test.init();
    const results = await test.runFunctionalCoverageTests();
    
    console.log('\n🎉 功能覆盖测试完成!');
    console.log('=' .repeat(60));
    console.log(`📊 测试总结:`);
    console.log(`   总模块数: ${results.summary.total}`);
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
  runFunctionalCoverageTest()
    .then(() => {
      console.log('\n✅ 测试执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ 测试执行失败:', error);
      process.exit(1);
    });
}

export { FunctionalCoverageTest, runFunctionalCoverageTest };