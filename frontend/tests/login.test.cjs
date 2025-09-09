const puppeteer = require('puppeteer');

/**
 * 用户登录流程自动化测试
 * 模拟真实用户操作：打开页面、输入用户名密码、点击登录按钮
 */
async function testLoginFlow() {
  let browser;
  let page;
  
  try {
    console.log('🚀 启动浏览器...');
    browser = await puppeteer.launch({
      headless: false, // 显示浏览器界面
      slowMo: 500,     // 操作间隔500ms，模拟真实用户速度
      defaultViewport: { width: 1280, height: 720 }
    });
    
    page = await browser.newPage();
    
    console.log('📱 打开登录页面...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
    
    // 等待页面加载完成
    await page.waitForSelector('input[type="text"]', { timeout: 10000 });
    
    console.log('✍️ 输入用户名...');
    // 模拟用户点击用户名输入框
    await page.click('input[type="text"]');
    await page.type('input[type="text"]', 'admin', { delay: 100 });
    
    console.log('🔐 输入密码...');
    // 模拟用户点击密码输入框
    await page.click('input[type="password"]');
    await page.type('input[type="password"]', '123456', { delay: 100 });
    
    // 截图记录登录前状态
    await page.screenshot({ path: 'login-before.png' });
    
    console.log('🖱️ 点击登录按钮...');
    // 查找并点击登录按钮
    const loginButton = await page.$('button[type="submit"], .login-btn, button:contains("登录")');
    if (loginButton) {
      await loginButton.click();
    } else {
      // 如果找不到特定选择器，尝试通过文本查找
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const loginBtn = buttons.find(btn => btn.textContent.includes('登录'));
        if (loginBtn) loginBtn.click();
      });
    }
    
    console.log('⏳ 等待页面跳转...');
    // 等待登录成功后的页面跳转
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
    
    // 检查是否成功跳转到主页面
    const currentUrl = page.url();
    console.log('📍 当前页面URL:', currentUrl);
    
    if (currentUrl.includes('/dashboard') || currentUrl.includes('/home') || !currentUrl.includes('/login')) {
      console.log('✅ 登录成功！已跳转到主页面');
      
      // 检查页面是否包含用户信息
      const userInfo = await page.$('.user-info, .username, .user-avatar');
      if (userInfo) {
        console.log('👤 检测到用户信息显示');
      }
      
      // 截图记录登录后状态
      await page.screenshot({ path: 'login-after.png' });
      
      return { success: true, message: '登录流程测试通过' };
    } else {
      console.log('❌ 登录失败，仍在登录页面');
      
      // 检查是否有错误提示
      const errorMsg = await page.$('.error-message, .el-message--error');
      if (errorMsg) {
        const errorText = await page.evaluate(el => el.textContent, errorMsg);
        console.log('错误信息:', errorText);
      }
      
      return { success: false, message: '登录失败' };
    }
    
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error.message);
    return { success: false, message: error.message };
  } finally {
    if (browser) {
      console.log('🔚 关闭浏览器...');
      await browser.close();
    }
  }
}

/**
 * 测试不同用户角色的登录
 */
async function testMultipleUserLogin() {
  const testUsers = [
    { username: 'admin', password: '123456', role: '管理员' },
    { username: 'teacher1', password: '123456', role: '教师' },
    { username: 'student1', password: '123456', role: '学生' }
  ];
  
  console.log('🧪 开始测试多用户登录流程...');
  
  for (const user of testUsers) {
    console.log(`\n--- 测试${user.role}登录 (${user.username}) ---`);
    
    const result = await testUserLogin(user.username, user.password);
    console.log(`${user.role}登录结果:`, result.success ? '✅ 成功' : '❌ 失败');
    
    if (!result.success) {
      console.log('失败原因:', result.message);
    }
    
    // 每次测试间隔
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

/**
 * 测试单个用户登录
 */
async function testUserLogin(username, password) {
  let browser;
  let page;
  
  try {
    browser = await puppeteer.launch({
      headless: false,
      slowMo: 300
    });
    
    page = await browser.newPage();
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
    
    // 清空并输入用户名
    await page.click('input[type="text"]');
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await page.type('input[type="text"]', username, { delay: 50 });
    
    // 清空并输入密码
    await page.click('input[type="password"]');
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await page.type('input[type="password"]', password, { delay: 50 });
    
    // 点击登录
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const loginBtn = buttons.find(btn => btn.textContent.includes('登录'));
      if (loginBtn) loginBtn.click();
    });
    
    // 等待响应
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    const success = !currentUrl.includes('/login');
    
    return {
      success,
      message: success ? '登录成功' : '登录失败',
      url: currentUrl
    };
    
  } catch (error) {
    return { success: false, message: error.message };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  (async () => {
    console.log('🎯 开始执行登录流程自动化测试\n');
    
    // 测试基本登录流程
    const basicResult = await testLoginFlow();
    console.log('\n基本登录测试结果:', basicResult);
    
    // 测试多用户登录
    await testMultipleUserLogin();
    
    console.log('\n🏁 所有登录测试完成！');
  })();
}

module.exports = {
  testLoginFlow,
  testMultipleUserLogin,
  testUserLogin
};