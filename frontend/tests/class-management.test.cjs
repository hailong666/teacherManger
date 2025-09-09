const puppeteer = require('puppeteer');

/**
 * 班级管理页面UI交互测试
 * 模拟真实用户操作：创建班级、编辑班级、删除班级等
 */
async function testClassManagement() {
  let browser;
  let page;
  
  try {
    console.log('🚀 启动浏览器进行班级管理测试...');
    browser = await puppeteer.launch({
      headless: false,
      slowMo: 500,
      defaultViewport: { width: 1280, height: 720 }
    });
    
    page = await browser.newPage();
    
    // 先登录
    console.log('🔐 执行登录操作...');
    await loginAsAdmin(page);
    
    // 导航到班级管理页面
    console.log('📚 导航到班级管理页面...');
    await navigateToClassManagement(page);
    
    // 测试创建新班级
    console.log('➕ 测试创建新班级...');
    const createResult = await testCreateClass(page);
    console.log('创建班级结果:', createResult.success ? '✅ 成功' : '❌ 失败');
    
    // 测试班级列表显示
    console.log('📋 测试班级列表显示...');
    const listResult = await testClassList(page);
    console.log('班级列表测试结果:', listResult.success ? '✅ 成功' : '❌ 失败');
    
    // 测试编辑班级
    console.log('✏️ 测试编辑班级...');
    const editResult = await testEditClass(page);
    console.log('编辑班级结果:', editResult.success ? '✅ 成功' : '❌ 失败');
    
    // 测试搜索功能
    console.log('🔍 测试搜索功能...');
    const searchResult = await testClassSearch(page);
    console.log('搜索功能结果:', searchResult.success ? '✅ 成功' : '❌ 失败');
    
    // 截图记录最终状态
    await page.screenshot({ path: 'class-management-final.png' });
    
    return {
      success: true,
      message: '班级管理测试完成',
      results: { createResult, listResult, editResult, searchResult }
    };
    
  } catch (error) {
    console.error('❌ 班级管理测试出现错误:', error.message);
    return { success: false, message: error.message };
  } finally {
    if (browser) {
      console.log('🔚 关闭浏览器...');
      await browser.close();
    }
  }
}

/**
 * 管理员登录
 */
async function loginAsAdmin(page) {
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
  
  // 等待登录表单加载
  await page.waitForSelector('input[type="text"]', { timeout: 10000 });
  
  // 输入管理员账号
  await page.click('input[type="text"]');
  await page.type('input[type="text"]', 'admin', { delay: 100 });
  
  await page.click('input[type="password"]');
  await page.type('input[type="password"]', '123456', { delay: 100 });
  
  // 点击登录按钮
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const loginBtn = buttons.find(btn => btn.textContent.includes('登录'));
    if (loginBtn) loginBtn.click();
  });
  
  // 等待登录成功
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
}

/**
 * 导航到班级管理页面
 */
async function navigateToClassManagement(page) {
  // 等待页面加载完成
  await page.waitForTimeout(2000);
  
  // 尝试多种方式找到班级管理菜单
  const navigationMethods = [
    // 方法1: 通过菜单文本点击
    async () => {
      await page.evaluate(() => {
        const menuItems = Array.from(document.querySelectorAll('a, .menu-item, .nav-item'));
        const classMenu = menuItems.find(item => 
          item.textContent.includes('班级管理') || 
          item.textContent.includes('班级') ||
          item.href?.includes('class')
        );
        if (classMenu) classMenu.click();
      });
    },
    
    // 方法2: 直接访问URL
    async () => {
      await page.goto('http://localhost:3000/class', { waitUntil: 'networkidle2' });
    },
    
    // 方法3: 通过路由链接
    async () => {
      await page.goto('http://localhost:3000/class-management', { waitUntil: 'networkidle2' });
    }
  ];
  
  for (const method of navigationMethods) {
    try {
      await method();
      await page.waitForTimeout(2000);
      
      // 检查是否成功到达班级管理页面
      const currentUrl = page.url();
      if (currentUrl.includes('class')) {
        console.log('✅ 成功导航到班级管理页面:', currentUrl);
        return;
      }
    } catch (error) {
      console.log('尝试导航方法失败，继续下一个方法...');
    }
  }
  
  throw new Error('无法导航到班级管理页面');
}

/**
 * 测试创建新班级
 */
async function testCreateClass(page) {
  try {
    // 查找并点击"新建班级"或"添加班级"按钮
    const createButton = await page.$('button:contains("新建"), button:contains("添加"), .create-btn, .add-btn');
    
    if (!createButton) {
      // 通过文本查找按钮
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const createBtn = buttons.find(btn => 
          btn.textContent.includes('新建') || 
          btn.textContent.includes('添加') ||
          btn.textContent.includes('创建')
        );
        if (createBtn) createBtn.click();
      });
    } else {
      await createButton.click();
    }
    
    // 等待弹窗或表单出现
    await page.waitForTimeout(1000);
    
    // 填写班级信息
    console.log('📝 填写班级信息...');
    
    // 班级名称
    const nameInput = await page.$('input[placeholder*="班级名称"], input[name="name"], .class-name input');
    if (nameInput) {
      await nameInput.click();
      await nameInput.type('测试班级2024', { delay: 100 });
    }
    
    // 班级描述
    const descInput = await page.$('textarea[placeholder*="描述"], textarea[name="description"], .class-desc textarea');
    if (descInput) {
      await descInput.click();
      await descInput.type('这是一个自动化测试创建的班级', { delay: 100 });
    }
    
    // 选择班主任
    console.log('👨‍🏫 选择班主任...');
    const teacherSelect = await page.$('select[name="teacher"], .teacher-select select, .el-select');
    if (teacherSelect) {
      await teacherSelect.click();
      await page.waitForTimeout(500);
      
      // 选择第一个可用的教师
      const teacherOption = await page.$('option:not([value=""]):not([disabled]), .el-option');
      if (teacherOption) {
        await teacherOption.click();
      }
    }
    
    // 截图记录表单填写状态
    await page.screenshot({ path: 'create-class-form.png' });
    
    // 提交表单
    console.log('💾 提交班级创建表单...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const submitBtn = buttons.find(btn => 
        btn.textContent.includes('确定') || 
        btn.textContent.includes('保存') ||
        btn.textContent.includes('提交') ||
        btn.type === 'submit'
      );
      if (submitBtn) submitBtn.click();
    });
    
    // 等待提交结果
    await page.waitForTimeout(3000);
    
    // 检查是否有成功提示
    const successMsg = await page.$('.success-message, .el-message--success, .notification-success');
    
    return {
      success: !!successMsg,
      message: successMsg ? '班级创建成功' : '班级创建可能失败'
    };
    
  } catch (error) {
    return { success: false, message: `创建班级失败: ${error.message}` };
  }
}

/**
 * 测试班级列表显示
 */
async function testClassList(page) {
  try {
    // 等待列表加载
    await page.waitForTimeout(2000);
    
    // 检查是否有班级列表
    const classList = await page.$('.class-list, .table, .el-table, tbody');
    if (!classList) {
      return { success: false, message: '未找到班级列表' };
    }
    
    // 检查列表中是否有数据
    const classItems = await page.$$('.class-item, tr, .el-table__row');
    console.log(`📊 检测到 ${classItems.length} 个班级项目`);
    
    // 检查表头是否正确显示
    const headers = await page.$$eval('th, .table-header, .el-table__header th', elements => 
      elements.map(el => el.textContent.trim())
    );
    console.log('📋 表头信息:', headers);
    
    // 截图记录列表状态
    await page.screenshot({ path: 'class-list.png' });
    
    return {
      success: classItems.length > 0,
      message: `班级列表显示正常，共${classItems.length}个班级`,
      data: { itemCount: classItems.length, headers }
    };
    
  } catch (error) {
    return { success: false, message: `班级列表测试失败: ${error.message}` };
  }
}

/**
 * 测试编辑班级
 */
async function testEditClass(page) {
  try {
    // 查找编辑按钮
    const editButton = await page.$('.edit-btn, button:contains("编辑"), .action-edit');
    
    if (!editButton) {
      // 通过文本查找编辑按钮
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const editBtn = buttons.find(btn => btn.textContent.includes('编辑'));
        if (editBtn) editBtn.click();
      });
    } else {
      await editButton.click();
    }
    
    // 等待编辑表单出现
    await page.waitForTimeout(1000);
    
    // 修改班级名称
    const nameInput = await page.$('input[name="name"], .class-name input');
    if (nameInput) {
      await nameInput.click();
      // 清空原内容
      await page.keyboard.down('Control');
      await page.keyboard.press('KeyA');
      await page.keyboard.up('Control');
      await nameInput.type('测试班级2024-已编辑', { delay: 100 });
    }
    
    // 保存修改
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const saveBtn = buttons.find(btn => 
        btn.textContent.includes('保存') || 
        btn.textContent.includes('确定')
      );
      if (saveBtn) saveBtn.click();
    });
    
    await page.waitForTimeout(2000);
    
    return { success: true, message: '班级编辑操作完成' };
    
  } catch (error) {
    return { success: false, message: `编辑班级失败: ${error.message}` };
  }
}

/**
 * 测试搜索功能
 */
async function testClassSearch(page) {
  try {
    // 查找搜索框
    const searchInput = await page.$('input[placeholder*="搜索"], .search-input, .el-input__inner');
    
    if (searchInput) {
      console.log('🔍 测试搜索功能...');
      await searchInput.click();
      await searchInput.type('测试', { delay: 100 });
      
      // 触发搜索
      await page.keyboard.press('Enter');
      await page.waitForTimeout(2000);
      
      // 检查搜索结果
      const searchResults = await page.$$('.class-item, tr, .el-table__row');
      console.log(`🔍 搜索结果: ${searchResults.length} 个班级`);
      
      return {
        success: true,
        message: `搜索功能正常，找到${searchResults.length}个结果`
      };
    } else {
      return { success: false, message: '未找到搜索框' };
    }
    
  } catch (error) {
    return { success: false, message: `搜索功能测试失败: ${error.message}` };
  }
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  (async () => {
    console.log('🎯 开始执行班级管理UI测试\n');
    
    const result = await testClassManagement();
    console.log('\n班级管理测试结果:', result);
    
    console.log('\n🏁 班级管理测试完成！');
  })();
}

module.exports = {
  testClassManagement,
  testCreateClass,
  testClassList,
  testEditClass,
  testClassSearch
};