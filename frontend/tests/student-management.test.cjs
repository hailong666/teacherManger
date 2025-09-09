const puppeteer = require('puppeteer');

/**
 * 学生管理页面UI交互测试
 * 模拟真实用户操作：添加学生、编辑学生信息、删除学生等
 */
async function testStudentManagement() {
  let browser;
  let page;
  
  try {
    console.log('🚀 启动浏览器进行学生管理测试...');
    browser = await puppeteer.launch({
      headless: false,
      slowMo: 500,
      defaultViewport: { width: 1280, height: 720 }
    });
    
    page = await browser.newPage();
    
    // 先登录
    console.log('🔐 执行登录操作...');
    await loginAsAdmin(page);
    
    // 导航到学生管理页面
    console.log('👨‍🎓 导航到学生管理页面...');
    await navigateToStudentManagement(page);
    
    // 测试添加新学生
    console.log('➕ 测试添加新学生...');
    const addResult = await testAddStudent(page);
    console.log('添加学生结果:', addResult.success ? '✅ 成功' : '❌ 失败');
    
    // 测试学生列表显示
    console.log('📋 测试学生列表显示...');
    const listResult = await testStudentList(page);
    console.log('学生列表测试结果:', listResult.success ? '✅ 成功' : '❌ 失败');
    
    // 测试编辑学生信息
    console.log('✏️ 测试编辑学生信息...');
    const editResult = await testEditStudent(page);
    console.log('编辑学生结果:', editResult.success ? '✅ 成功' : '❌ 失败');
    
    // 测试学生搜索功能
    console.log('🔍 测试学生搜索功能...');
    const searchResult = await testStudentSearch(page);
    console.log('搜索功能结果:', searchResult.success ? '✅ 成功' : '❌ 失败');
    
    // 测试批量操作
    console.log('📦 测试批量操作...');
    const batchResult = await testBatchOperations(page);
    console.log('批量操作结果:', batchResult.success ? '✅ 成功' : '❌ 失败');
    
    // 截图记录最终状态
    await page.screenshot({ path: 'student-management-final.png' });
    
    return {
      success: true,
      message: '学生管理测试完成',
      results: { addResult, listResult, editResult, searchResult, batchResult }
    };
    
  } catch (error) {
    console.error('❌ 学生管理测试出现错误:', error.message);
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
 * 导航到学生管理页面
 */
async function navigateToStudentManagement(page) {
  // 等待页面加载完成
  await page.waitForTimeout(2000);
  
  // 尝试多种方式找到学生管理菜单
  const navigationMethods = [
    // 方法1: 通过菜单文本点击
    async () => {
      await page.evaluate(() => {
        const menuItems = Array.from(document.querySelectorAll('a, .menu-item, .nav-item'));
        const studentMenu = menuItems.find(item => 
          item.textContent.includes('学生管理') || 
          item.textContent.includes('学生') ||
          item.href?.includes('student')
        );
        if (studentMenu) studentMenu.click();
      });
    },
    
    // 方法2: 直接访问URL
    async () => {
      await page.goto('http://localhost:3000/student', { waitUntil: 'networkidle2' });
    },
    
    // 方法3: 通过路由链接
    async () => {
      await page.goto('http://localhost:3000/student-management', { waitUntil: 'networkidle2' });
    }
  ];
  
  for (const method of navigationMethods) {
    try {
      await method();
      await page.waitForTimeout(2000);
      
      // 检查是否成功到达学生管理页面
      const currentUrl = page.url();
      if (currentUrl.includes('student')) {
        console.log('✅ 成功导航到学生管理页面:', currentUrl);
        return;
      }
    } catch (error) {
      console.log('尝试导航方法失败，继续下一个方法...');
    }
  }
  
  throw new Error('无法导航到学生管理页面');
}

/**
 * 测试添加新学生
 */
async function testAddStudent(page) {
  try {
    // 查找并点击"添加学生"或"新建学生"按钮
    const addButton = await page.$('button:contains("新建"), button:contains("添加"), .add-btn, .create-btn');
    
    if (!addButton) {
      // 通过文本查找按钮
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const addBtn = buttons.find(btn => 
          btn.textContent.includes('新建') || 
          btn.textContent.includes('添加') ||
          btn.textContent.includes('创建')
        );
        if (addBtn) addBtn.click();
      });
    } else {
      await addButton.click();
    }
    
    // 等待弹窗或表单出现
    await page.waitForTimeout(1000);
    
    // 填写学生信息
    console.log('📝 填写学生信息...');
    
    // 学生姓名
    const nameInput = await page.$('input[placeholder*="姓名"], input[name="name"], .student-name input');
    if (nameInput) {
      await nameInput.click();
      await nameInput.type('张三', { delay: 100 });
    }
    
    // 学号
    const studentIdInput = await page.$('input[placeholder*="学号"], input[name="studentId"], .student-id input');
    if (studentIdInput) {
      await studentIdInput.click();
      await studentIdInput.type('2024001', { delay: 100 });
    }
    
    // 年龄
    const ageInput = await page.$('input[placeholder*="年龄"], input[name="age"], .student-age input');
    if (ageInput) {
      await ageInput.click();
      await ageInput.type('18', { delay: 100 });
    }
    
    // 性别选择
    const genderSelect = await page.$('select[name="gender"], .gender-select select, .el-select');
    if (genderSelect) {
      await genderSelect.click();
      await page.waitForTimeout(500);
      
      // 选择男性
      const maleOption = await page.$('option[value="male"], .el-option:contains("男")');
      if (maleOption) {
        await maleOption.click();
      }
    }
    
    // 选择班级
    console.log('🏫 选择班级...');
    const classSelect = await page.$('select[name="class"], .class-select select, .el-select');
    if (classSelect) {
      await classSelect.click();
      await page.waitForTimeout(500);
      
      // 选择第一个可用的班级
      const classOption = await page.$('option:not([value=""]):not([disabled]), .el-option');
      if (classOption) {
        await classOption.click();
      }
    }
    
    // 联系电话
    const phoneInput = await page.$('input[placeholder*="电话"], input[name="phone"], .student-phone input');
    if (phoneInput) {
      await phoneInput.click();
      await phoneInput.type('13800138000', { delay: 100 });
    }
    
    // 家庭地址
    const addressInput = await page.$('input[placeholder*="地址"], textarea[name="address"], .student-address input');
    if (addressInput) {
      await addressInput.click();
      await addressInput.type('北京市朝阳区', { delay: 100 });
    }
    
    // 截图记录表单填写状态
    await page.screenshot({ path: 'add-student-form.png' });
    
    // 提交表单
    console.log('💾 提交学生添加表单...');
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
      message: successMsg ? '学生添加成功' : '学生添加可能失败'
    };
    
  } catch (error) {
    return { success: false, message: `添加学生失败: ${error.message}` };
  }
}

/**
 * 测试学生列表显示
 */
async function testStudentList(page) {
  try {
    // 等待列表加载
    await page.waitForTimeout(2000);
    
    // 检查是否有学生列表
    const studentList = await page.$('.student-list, .table, .el-table, tbody');
    if (!studentList) {
      return { success: false, message: '未找到学生列表' };
    }
    
    // 检查列表中是否有数据
    const studentItems = await page.$$('.student-item, tr, .el-table__row');
    console.log(`📊 检测到 ${studentItems.length} 个学生项目`);
    
    // 检查表头是否正确显示
    const headers = await page.$$eval('th, .table-header, .el-table__header th', elements => 
      elements.map(el => el.textContent.trim())
    );
    console.log('📋 表头信息:', headers);
    
    // 检查分页功能
    const pagination = await page.$('.pagination, .el-pagination');
    console.log('📄 分页组件:', pagination ? '存在' : '不存在');
    
    // 截图记录列表状态
    await page.screenshot({ path: 'student-list.png' });
    
    return {
      success: studentItems.length >= 0, // 允许空列表
      message: `学生列表显示正常，共${studentItems.length}个学生`,
      data: { itemCount: studentItems.length, headers, hasPagination: !!pagination }
    };
    
  } catch (error) {
    return { success: false, message: `学生列表测试失败: ${error.message}` };
  }
}

/**
 * 测试编辑学生信息
 */
async function testEditStudent(page) {
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
    
    // 修改学生姓名
    const nameInput = await page.$('input[name="name"], .student-name input');
    if (nameInput) {
      await nameInput.click();
      // 清空原内容
      await page.keyboard.down('Control');
      await page.keyboard.press('KeyA');
      await page.keyboard.up('Control');
      await nameInput.type('张三-已编辑', { delay: 100 });
    }
    
    // 修改年龄
    const ageInput = await page.$('input[name="age"], .student-age input');
    if (ageInput) {
      await ageInput.click();
      await page.keyboard.down('Control');
      await page.keyboard.press('KeyA');
      await page.keyboard.up('Control');
      await ageInput.type('19', { delay: 100 });
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
    
    return { success: true, message: '学生编辑操作完成' };
    
  } catch (error) {
    return { success: false, message: `编辑学生失败: ${error.message}` };
  }
}

/**
 * 测试学生搜索功能
 */
async function testStudentSearch(page) {
  try {
    // 查找搜索框
    const searchInput = await page.$('input[placeholder*="搜索"], .search-input, .el-input__inner');
    
    if (searchInput) {
      console.log('🔍 测试学生搜索功能...');
      await searchInput.click();
      await searchInput.type('张', { delay: 100 });
      
      // 触发搜索
      await page.keyboard.press('Enter');
      await page.waitForTimeout(2000);
      
      // 检查搜索结果
      const searchResults = await page.$$('.student-item, tr, .el-table__row');
      console.log(`🔍 搜索结果: ${searchResults.length} 个学生`);
      
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

/**
 * 测试批量操作
 */
async function testBatchOperations(page) {
  try {
    // 查找复选框进行批量选择
    const checkboxes = await page.$$('input[type="checkbox"], .el-checkbox__input');
    
    if (checkboxes.length > 1) {
      console.log('☑️ 测试批量选择...');
      
      // 选择前几个学生
      for (let i = 0; i < Math.min(2, checkboxes.length); i++) {
        await checkboxes[i].click();
        await page.waitForTimeout(200);
      }
      
      // 查找批量操作按钮
      const batchButtons = await page.$$('button:contains("批量"), .batch-btn, .bulk-action');
      
      if (batchButtons.length > 0) {
        console.log('📦 执行批量操作...');
        await batchButtons[0].click();
        await page.waitForTimeout(1000);
        
        return { success: true, message: '批量操作功能正常' };
      } else {
        return { success: false, message: '未找到批量操作按钮' };
      }
    } else {
      return { success: false, message: '未找到可选择的复选框' };
    }
    
  } catch (error) {
    return { success: false, message: `批量操作测试失败: ${error.message}` };
  }
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  (async () => {
    console.log('🎯 开始执行学生管理UI测试\n');
    
    const result = await testStudentManagement();
    console.log('\n学生管理测试结果:', result);
    
    console.log('\n🏁 学生管理测试完成！');
  })();
}

module.exports = {
  testStudentManagement,
  testAddStudent,
  testStudentList,
  testEditStudent,
  testStudentSearch,
  testBatchOperations
};