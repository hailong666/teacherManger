const { testLoginFlow } = require('./login.test.cjs');
const { testClassManagement } = require('./class-management.test.cjs');
const { testStudentManagement } = require('./student-management.test.cjs');

/**
 * 主测试运行器 - 执行完整的前端UI自动化测试
 * 模拟真实用户操作流程，全面测试每个页面功能
 */
async function runAllTests() {
  console.log('🎯 开始执行完整的前端UI自动化测试');
  console.log('=' .repeat(60));
  
  const testResults = {
    login: null,
    classManagement: null,
    studentManagement: null,
    startTime: new Date(),
    endTime: null,
    totalDuration: null
  };
  
  try {
    // 1. 测试用户登录流程
    console.log('\n🔐 第一阶段：用户登录流程测试');
    console.log('-'.repeat(40));
    testResults.login = await testLoginFlow();
    console.log('登录测试结果:', testResults.login.success ? '✅ 通过' : '❌ 失败');
    if (!testResults.login.success) {
      console.log('❌ 登录测试失败，停止后续测试');
      return testResults;
    }
    
    // 等待一段时间确保系统稳定
    console.log('⏳ 等待系统稳定...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 2. 测试班级管理功能
    console.log('\n📚 第二阶段：班级管理功能测试');
    console.log('-'.repeat(40));
    testResults.classManagement = await testClassManagement();
    console.log('班级管理测试结果:', testResults.classManagement.success ? '✅ 通过' : '❌ 失败');
    
    // 等待一段时间
    console.log('⏳ 等待系统稳定...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 3. 测试学生管理功能
    console.log('\n👨‍🎓 第三阶段：学生管理功能测试');
    console.log('-'.repeat(40));
    testResults.studentManagement = await testStudentManagement();
    console.log('学生管理测试结果:', testResults.studentManagement.success ? '✅ 通过' : '❌ 失败');
    
    // 计算总耗时
    testResults.endTime = new Date();
    testResults.totalDuration = testResults.endTime - testResults.startTime;
    
    // 生成测试报告
    generateTestReport(testResults);
    
    return testResults;
    
  } catch (error) {
    console.error('❌ 测试执行过程中出现严重错误:', error.message);
    testResults.error = error.message;
    testResults.endTime = new Date();
    testResults.totalDuration = testResults.endTime - testResults.startTime;
    return testResults;
  }
}

/**
 * 生成详细的测试报告
 */
function generateTestReport(results) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 测试报告总结');
  console.log('='.repeat(60));
  
  console.log(`🕐 测试开始时间: ${results.startTime.toLocaleString()}`);
  console.log(`🕐 测试结束时间: ${results.endTime.toLocaleString()}`);
  console.log(`⏱️  总耗时: ${Math.round(results.totalDuration / 1000)}秒`);
  
  console.log('\n📋 各模块测试结果:');
  
  // 登录测试结果
  if (results.login) {
    console.log(`🔐 登录功能: ${results.login.success ? '✅ 通过' : '❌ 失败'}`);
    if (results.login.message) {
      console.log(`   详情: ${results.login.message}`);
    }
  }
  
  // 班级管理测试结果
  if (results.classManagement) {
    console.log(`📚 班级管理: ${results.classManagement.success ? '✅ 通过' : '❌ 失败'}`);
    if (results.classManagement.message) {
      console.log(`   详情: ${results.classManagement.message}`);
    }
    if (results.classManagement.results) {
      const subResults = results.classManagement.results;
      console.log('   子功能测试:');
      if (subResults.createResult) {
        console.log(`     - 创建班级: ${subResults.createResult.success ? '✅' : '❌'}`);
      }
      if (subResults.listResult) {
        console.log(`     - 班级列表: ${subResults.listResult.success ? '✅' : '❌'}`);
      }
      if (subResults.editResult) {
        console.log(`     - 编辑班级: ${subResults.editResult.success ? '✅' : '❌'}`);
      }
      if (subResults.searchResult) {
        console.log(`     - 搜索功能: ${subResults.searchResult.success ? '✅' : '❌'}`);
      }
    }
  }
  
  // 学生管理测试结果
  if (results.studentManagement) {
    console.log(`👨‍🎓 学生管理: ${results.studentManagement.success ? '✅ 通过' : '❌ 失败'}`);
    if (results.studentManagement.message) {
      console.log(`   详情: ${results.studentManagement.message}`);
    }
    if (results.studentManagement.results) {
      const subResults = results.studentManagement.results;
      console.log('   子功能测试:');
      if (subResults.addResult) {
        console.log(`     - 添加学生: ${subResults.addResult.success ? '✅' : '❌'}`);
      }
      if (subResults.listResult) {
        console.log(`     - 学生列表: ${subResults.listResult.success ? '✅' : '❌'}`);
      }
      if (subResults.editResult) {
        console.log(`     - 编辑学生: ${subResults.editResult.success ? '✅' : '❌'}`);
      }
      if (subResults.searchResult) {
        console.log(`     - 搜索功能: ${subResults.searchResult.success ? '✅' : '❌'}`);
      }
      if (subResults.batchResult) {
        console.log(`     - 批量操作: ${subResults.batchResult.success ? '✅' : '❌'}`);
      }
    }
  }
  
  // 计算通过率
  const totalTests = Object.keys(results).filter(key => 
    ['login', 'classManagement', 'studentManagement'].includes(key) && results[key]
  ).length;
  
  const passedTests = Object.keys(results).filter(key => 
    ['login', 'classManagement', 'studentManagement'].includes(key) && 
    results[key] && results[key].success
  ).length;
  
  const passRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
  
  console.log('\n📈 测试统计:');
  console.log(`   总测试模块: ${totalTests}`);
  console.log(`   通过模块: ${passedTests}`);
  console.log(`   失败模块: ${totalTests - passedTests}`);
  console.log(`   通过率: ${passRate}%`);
  
  // 总体结论
  console.log('\n🎯 总体结论:');
  if (passRate === 100) {
    console.log('🎉 所有测试均通过！前端功能运行正常。');
  } else if (passRate >= 80) {
    console.log('⚠️  大部分测试通过，但仍有部分功能需要检查。');
  } else if (passRate >= 50) {
    console.log('⚠️  部分测试通过，建议检查失败的功能模块。');
  } else {
    console.log('❌ 多数测试失败，建议全面检查系统功能。');
  }
  
  console.log('\n📸 测试截图已保存到当前目录:');
  console.log('   - login-success.png (登录成功截图)');
  console.log('   - create-class-form.png (创建班级表单)');
  console.log('   - class-list.png (班级列表)');
  console.log('   - class-management-final.png (班级管理最终状态)');
  console.log('   - add-student-form.png (添加学生表单)');
  console.log('   - student-list.png (学生列表)');
  console.log('   - student-management-final.png (学生管理最终状态)');
  
  console.log('\n' + '='.repeat(60));
}

/**
 * 快速测试模式 - 只测试核心功能
 */
async function runQuickTests() {
  console.log('🚀 执行快速测试模式（仅核心功能）');
  
  try {
    // 只测试登录功能
    console.log('\n🔐 测试登录功能...');
    const loginResult = await testLoginFlow();
    
    if (loginResult.success) {
      console.log('✅ 快速测试通过：登录功能正常');
      return { success: true, message: '核心功能测试通过' };
    } else {
      console.log('❌ 快速测试失败：登录功能异常');
      return { success: false, message: '核心功能测试失败' };
    }
    
  } catch (error) {
    console.error('❌ 快速测试出现错误:', error.message);
    return { success: false, message: error.message };
  }
}

// 如果直接运行此文件，执行完整测试
if (require.main === module) {
  (async () => {
    // 检查命令行参数
    const args = process.argv.slice(2);
    const isQuickMode = args.includes('--quick') || args.includes('-q');
    
    if (isQuickMode) {
      console.log('🚀 启动快速测试模式\n');
      const result = await runQuickTests();
      console.log('\n快速测试结果:', result);
    } else {
      console.log('🚀 启动完整测试模式\n');
      const results = await runAllTests();
      console.log('\n🏁 所有测试执行完成！');
    }
  })();
}

module.exports = {
  runAllTests,
  runQuickTests,
  generateTestReport
};