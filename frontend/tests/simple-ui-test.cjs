const http = require('http');
const https = require('https');
const { URL } = require('url');

/**
 * 简化的前端UI测试 - 不依赖Puppeteer
 * 通过HTTP请求测试前端页面的可访问性和基本功能
 */
async function testFrontendPages() {
  console.log('🚀 开始执行简化的前端UI测试');
  console.log('=' .repeat(60));
  
  const baseUrl = 'http://localhost:5173';
  const testResults = {
    pageAccessibility: {},
    apiConnectivity: {},
    startTime: new Date(),
    endTime: null
  };
  
  try {
    // 1. 测试前端页面可访问性
    console.log('\n🌐 第一阶段：测试前端页面可访问性');
    console.log('-'.repeat(40));
    
    const pages = [
      { name: '首页', path: '/' },
      { name: '登录页', path: '/login' },
      { name: '班级管理', path: '/class' },
      { name: '学生管理', path: '/student' }
    ];
    
    for (const page of pages) {
      console.log(`📄 测试 ${page.name} (${page.path})...`);
      const result = await testPageAccess(baseUrl + page.path);
      testResults.pageAccessibility[page.name] = result;
      console.log(`   结果: ${result.success ? '✅ 可访问' : '❌ 不可访问'} (${result.statusCode})`);
      
      // 等待一下避免请求过快
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // 2. 测试后端API连接性
    console.log('\n🔌 第二阶段：测试后端API连接性');
    console.log('-'.repeat(40));
    
    const apis = [
      { name: '用户API', path: '/api/users' },
      { name: '班级API', path: '/api/classes' },
      { name: '学生API', path: '/api/students' }
    ];
    
    for (const api of apis) {
      console.log(`🔗 测试 ${api.name} (${api.path})...`);
      const result = await testApiAccess('http://localhost:5173' + api.path);
      testResults.apiConnectivity[api.name] = result;
      console.log(`   结果: ${result.success ? '✅ 连接正常' : '❌ 连接失败'} (${result.statusCode || result.error})`);
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // 3. 模拟用户操作流程测试
    console.log('\n👤 第三阶段：模拟用户操作流程');
    console.log('-'.repeat(40));
    
    const userFlowResult = await testUserFlow();
    testResults.userFlow = userFlowResult;
    console.log(`用户流程测试: ${userFlowResult.success ? '✅ 通过' : '❌ 失败'}`);
    
    testResults.endTime = new Date();
    testResults.totalDuration = testResults.endTime - testResults.startTime;
    
    // 生成测试报告
    generateSimpleTestReport(testResults);
    
    return testResults;
    
  } catch (error) {
    console.error('❌ 测试执行过程中出现错误:', error.message);
    testResults.error = error.message;
    testResults.endTime = new Date();
    return testResults;
  }
}

/**
 * 测试页面可访问性
 */
function testPageAccess(url) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: 'GET',
      timeout: 5000
    };
    
    const req = http.request(options, (res) => {
      resolve({
        success: res.statusCode >= 200 && res.statusCode < 400,
        statusCode: res.statusCode,
        message: `HTTP ${res.statusCode}`
      });
    });
    
    req.on('error', (error) => {
      resolve({
        success: false,
        error: error.message,
        message: `请求失败: ${error.message}`
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        success: false,
        error: 'timeout',
        message: '请求超时'
      });
    });
    
    req.end();
  });
}

/**
 * 测试API连接性
 */
function testApiAccess(url) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: 'GET',
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          success: res.statusCode >= 200 && res.statusCode < 500, // API可能返回401等认证错误，但说明连接正常
          statusCode: res.statusCode,
          message: `HTTP ${res.statusCode}`,
          hasData: data.length > 0
        });
      });
    });
    
    req.on('error', (error) => {
      resolve({
        success: false,
        error: error.message,
        message: `API连接失败: ${error.message}`
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        success: false,
        error: 'timeout',
        message: 'API请求超时'
      });
    });
    
    req.end();
  });
}

/**
 * 模拟用户操作流程测试
 */
async function testUserFlow() {
  console.log('🔄 模拟用户操作流程:');
  
  const steps = [
    {
      name: '访问首页',
      action: () => testPageAccess('http://localhost:3000/')
    },
    {
      name: '访问登录页',
      action: () => testPageAccess('http://localhost:3000/login')
    },
    {
      name: '检查登录API',
      action: () => testApiAccess('http://localhost:3000/api/auth/login')
    },
    {
      name: '访问班级管理页',
      action: () => testPageAccess('http://localhost:3000/class')
    },
    {
      name: '检查班级API',
      action: () => testApiAccess('http://localhost:3000/api/classes')
    }
  ];
  
  let successCount = 0;
  const results = [];
  
  for (const step of steps) {
    console.log(`   ${step.name}...`);
    const result = await step.action();
    results.push({ step: step.name, result });
    
    if (result.success) {
      successCount++;
      console.log(`   ✅ ${step.name} 成功`);
    } else {
      console.log(`   ❌ ${step.name} 失败: ${result.message}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  return {
    success: successCount >= steps.length * 0.8, // 80%以上成功即认为通过
    successCount,
    totalSteps: steps.length,
    successRate: Math.round((successCount / steps.length) * 100),
    results
  };
}

/**
 * 生成简化测试报告
 */
function generateSimpleTestReport(results) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 简化测试报告');
  console.log('='.repeat(60));
  
  console.log(`🕐 测试开始时间: ${results.startTime.toLocaleString()}`);
  console.log(`🕐 测试结束时间: ${results.endTime.toLocaleString()}`);
  console.log(`⏱️  总耗时: ${Math.round(results.totalDuration / 1000)}秒`);
  
  // 页面可访问性报告
  console.log('\n🌐 页面可访问性测试结果:');
  let pageSuccessCount = 0;
  const pageTotal = Object.keys(results.pageAccessibility).length;
  
  for (const [pageName, result] of Object.entries(results.pageAccessibility)) {
    const status = result.success ? '✅' : '❌';
    console.log(`   ${status} ${pageName}: ${result.message}`);
    if (result.success) pageSuccessCount++;
  }
  
  // API连接性报告
  console.log('\n🔌 API连接性测试结果:');
  let apiSuccessCount = 0;
  const apiTotal = Object.keys(results.apiConnectivity).length;
  
  for (const [apiName, result] of Object.entries(results.apiConnectivity)) {
    const status = result.success ? '✅' : '❌';
    console.log(`   ${status} ${apiName}: ${result.message}`);
    if (result.success) apiSuccessCount++;
  }
  
  // 用户流程测试报告
  if (results.userFlow) {
    console.log('\n👤 用户流程测试结果:');
    console.log(`   成功步骤: ${results.userFlow.successCount}/${results.userFlow.totalSteps}`);
    console.log(`   成功率: ${results.userFlow.successRate}%`);
    console.log(`   整体结果: ${results.userFlow.success ? '✅ 通过' : '❌ 失败'}`);
  }
  
  // 总体统计
  console.log('\n📈 测试统计:');
  console.log(`   页面可访问性: ${pageSuccessCount}/${pageTotal} (${Math.round(pageSuccessCount/pageTotal*100)}%)`);
  console.log(`   API连接性: ${apiSuccessCount}/${apiTotal} (${Math.round(apiSuccessCount/apiTotal*100)}%)`);
  
  const overallSuccess = pageSuccessCount >= pageTotal * 0.8 && apiSuccessCount >= apiTotal * 0.5;
  
  console.log('\n🎯 总体结论:');
  if (overallSuccess) {
    console.log('🎉 基础功能测试通过！前端页面和后端API连接正常。');
    console.log('💡 建议：可以进一步进行手动测试验证具体功能。');
  } else {
    console.log('⚠️  部分功能存在问题，建议检查:');
    if (pageSuccessCount < pageTotal * 0.8) {
      console.log('   - 前端服务器可能未正常运行');
    }
    if (apiSuccessCount < apiTotal * 0.5) {
      console.log('   - 后端API服务可能存在问题');
    }
  }
  
  console.log('\n💡 测试说明:');
  console.log('   本测试通过HTTP请求验证页面和API的基本可访问性');
  console.log('   如需更详细的UI交互测试，建议手动操作验证');
  console.log('   或升级Node.js版本后使用Puppeteer进行自动化测试');
  
  console.log('\n' + '='.repeat(60));
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  (async () => {
    console.log('🚀 启动简化前端UI测试\n');
    
    const results = await testFrontendPages();
    console.log('\n🏁 简化测试执行完成！');
  })();
}

module.exports = {
  testFrontendPages,
  testPageAccess,
  testApiAccess,
  testUserFlow,
  generateSimpleTestReport
};