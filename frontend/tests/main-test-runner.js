import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import TestReportGenerator from '../../test-report-generator.js';
import testConfig from '../../test-config.js';

/**
 * 主测试执行器
 * 统一管理和执行所有Puppeteer UI自动化测试
 */
class MainTestRunner {
  constructor(options = {}) {
    this.options = {
      parallel: options.parallel || false,
      maxConcurrency: options.maxConcurrency || 3,
      timeout: options.timeout || 300000, // 5分钟
      retries: options.retries || 1,
      environment: options.environment || 'test',
      browser: options.browser || 'chromium',
      headless: options.headless !== false,
      slowMo: options.slowMo || 0,
      generateReport: options.generateReport !== false,
      cleanupData: options.cleanupData !== false,
      ...options
    };
    
    this.testSuites = [
      {
        name: '多角色登录验证测试',
        script: './multi-role-login-test.js',
        priority: 'critical',
        timeout: 120000,
        retries: 2,
        description: '测试管理员、教师、学生三种角色的登录验证和权限控制'
      },
      {
        name: '班级创建流程测试',
        script: './class-creation-test.js',
        priority: 'high',
        timeout: 180000,
        retries: 1,
        description: '完整测试班级创建的UI操作流程和数据验证'
      },
      {
        name: '功能覆盖测试',
        script: './functional-coverage-test.js',
        priority: 'high',
        timeout: 300000,
        retries: 1,
        description: '覆盖系统所有主要功能模块的UI操作测试'
      },
      {
        name: '异常情况测试',
        script: './exception-boundary-test.js',
        priority: 'medium',
        timeout: 240000,
        retries: 2,
        description: '测试各种异常情况和边界条件下的系统表现'
      }
    ];
    
    this.reportGenerator = new TestReportGenerator();
    this.results = [];
    this.startTime = null;
    this.endTime = null;
  }

  /**
   * 执行所有测试套件
   */
  async runAllTests() {
    console.log('\n🚀 启动Puppeteer UI自动化测试套件');
    console.log('=' .repeat(60));
    
    this.startTime = Date.now();
    
    try {
      // 预检查
      await this.preflightCheck();
      
      // 准备测试环境
      await this.prepareTestEnvironment();
      
      // 执行测试
      if (this.options.parallel) {
        await this.runTestsInParallel();
      } else {
        await this.runTestsSequentially();
      }
      
      // 生成报告
      if (this.options.generateReport) {
        await this.generateComprehensiveReport();
      }
      
      // 清理测试数据
      if (this.options.cleanupData) {
        await this.cleanupTestData();
      }
      
    } catch (error) {
      console.error('\n❌ 测试执行失败:', error.message);
      throw error;
    } finally {
      this.endTime = Date.now();
      await this.printFinalSummary();
    }
    
    return this.results;
  }

  /**
   * 预检查测试环境
   */
  async preflightCheck() {
    console.log('\n🔍 执行预检查...');
    
    const checks = [
      {
        name: '检查Node.js版本',
        check: () => {
          const version = process.version;
          const majorVersion = parseInt(version.slice(1).split('.')[0]);
          if (majorVersion < 14) {
            throw new Error(`Node.js版本过低: ${version}，需要14+`);
          }
          console.log(`   ✅ Node.js版本: ${version}`);
        }
      },
      {
        name: '检查Puppeteer依赖',
        check: () => {
          try {
            require('puppeteer');
            console.log('   ✅ Puppeteer已安装');
          } catch (error) {
            throw new Error('Puppeteer未安装，请运行: npm install puppeteer');
          }
        }
      },
      {
        name: '检查测试脚本',
        check: () => {
          const missingScripts = [];
          this.testSuites.forEach(suite => {
            const scriptPath = path.resolve(__dirname, suite.script);
            if (!fs.existsSync(scriptPath)) {
              missingScripts.push(suite.script);
            }
          });
          
          if (missingScripts.length > 0) {
            throw new Error(`缺少测试脚本: ${missingScripts.join(', ')}`);
          }
          console.log(`   ✅ 所有测试脚本存在 (${this.testSuites.length}个)`);
        }
      },
      {
        name: '检查测试配置',
        check: () => {
          if (!testConfig || !testConfig.testEnvironment) {
            throw new Error('测试配置文件无效或缺失');
          }
          console.log('   ✅ 测试配置有效');
        }
      },
      {
        name: '检查服务器连接',
        check: async () => {
          const baseUrl = testConfig.testEnvironment.baseUrl;
          try {
            const response = await fetch(baseUrl, { 
              method: 'HEAD',
              timeout: 5000 
            });
            if (response.ok || response.status === 404) {
              console.log(`   ✅ 服务器连接正常: ${baseUrl}`);
            } else {
              throw new Error(`服务器响应异常: ${response.status}`);
            }
          } catch (error) {
            console.warn(`   ⚠️ 服务器连接检查失败: ${error.message}`);
            console.warn('   继续执行测试，但可能会遇到连接问题');
          }
        }
      }
    ];
    
    for (const check of checks) {
      try {
        await check.check();
      } catch (error) {
        console.error(`   ❌ ${check.name}: ${error.message}`);
        throw error;
      }
    }
    
    console.log('   ✅ 预检查完成');
  }

  /**
   * 准备测试环境
   */
  async prepareTestEnvironment() {
    console.log('\n🛠️ 准备测试环境...');
    
    try {
      // 创建测试报告目录
      const reportDir = './test-reports';
      if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
        console.log('   ✅ 创建测试报告目录');
      }
      
      // 创建截图目录
      const screenshotDir = path.join(reportDir, 'screenshots');
      if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir, { recursive: true });
        console.log('   ✅ 创建截图目录');
      }
      
      // 清理旧的测试数据（如果启用）
      if (this.options.cleanupData) {
        await this.cleanupOldTestData();
      }
      
      // 设置环境变量
      process.env.TEST_ENVIRONMENT = this.options.environment;
      process.env.TEST_BROWSER = this.options.browser;
      process.env.TEST_HEADLESS = this.options.headless.toString();
      
      console.log('   ✅ 测试环境准备完成');
      
    } catch (error) {
      console.error('   ❌ 测试环境准备失败:', error.message);
      throw error;
    }
  }

  /**
   * 顺序执行测试
   */
  async runTestsSequentially() {
    console.log('\n📋 顺序执行测试套件...');
    
    for (let i = 0; i < this.testSuites.length; i++) {
      const suite = this.testSuites[i];
      console.log(`\n[${i + 1}/${this.testSuites.length}] 执行: ${suite.name}`);
      console.log(`   描述: ${suite.description}`);
      console.log(`   优先级: ${suite.priority}`);
      
      const result = await this.runSingleTest(suite);
      this.results.push(result);
      
      // 如果是关键测试失败，考虑是否继续
      if (suite.priority === 'critical' && result.overallStatus === 'failed') {
        console.warn(`\n⚠️ 关键测试失败: ${suite.name}`);
        console.warn('   建议修复后再继续其他测试');
        
        if (!this.options.continueOnCriticalFailure) {
          console.log('   停止后续测试执行');
          break;
        }
      }
      
      // 测试间隔
      if (i < this.testSuites.length - 1) {
        console.log('   ⏳ 等待2秒后执行下一个测试...');
        await this.sleep(2000);
      }
    }
  }

  /**
   * 并行执行测试
   */
  async runTestsInParallel() {
    console.log(`\n🔄 并行执行测试套件 (最大并发: ${this.options.maxConcurrency})...`);
    
    const chunks = this.chunkArray(this.testSuites, this.options.maxConcurrency);
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`\n批次 ${i + 1}/${chunks.length}: 执行${chunk.length}个测试`);
      
      const promises = chunk.map(suite => {
        console.log(`   启动: ${suite.name}`);
        return this.runSingleTest(suite);
      });
      
      const results = await Promise.allSettled(promises);
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          this.results.push(result.value);
        } else {
          console.error(`   ❌ ${chunk[index].name} 执行失败:`, result.reason);
          this.results.push({
            testSuite: chunk[index].name,
            overallStatus: 'failed',
            error: result.reason.message,
            duration: 0,
            summary: { total: 0, passed: 0, failed: 1, errors: 1 }
          });
        }
      });
      
      // 批次间隔
      if (i < chunks.length - 1) {
        console.log('   ⏳ 等待3秒后执行下一批次...');
        await this.sleep(3000);
      }
    }
  }

  /**
   * 执行单个测试套件
   */
  async runSingleTest(suite) {
    const startTime = Date.now();
    let attempt = 0;
    let lastError = null;
    
    while (attempt <= suite.retries) {
      try {
        if (attempt > 0) {
          console.log(`   🔄 重试 ${attempt}/${suite.retries}...`);
          await this.sleep(2000); // 重试前等待
        }
        
        const result = await this.executeTestScript(suite);
        const duration = Date.now() - startTime;
        
        return {
          ...result,
          testSuite: suite.name,
          duration: duration,
          attempts: attempt + 1,
          priority: suite.priority
        };
        
      } catch (error) {
        lastError = error;
        attempt++;
        
        if (attempt <= suite.retries) {
          console.warn(`   ⚠️ 测试失败，准备重试: ${error.message}`);
        }
      }
    }
    
    // 所有重试都失败
    const duration = Date.now() - startTime;
    console.error(`   ❌ 测试最终失败: ${lastError.message}`);
    
    return {
      testSuite: suite.name,
      overallStatus: 'failed',
      error: lastError.message,
      duration: duration,
      attempts: attempt,
      priority: suite.priority,
      summary: { total: 1, passed: 0, failed: 1, errors: 1 }
    };
  }

  /**
   * 执行测试脚本
   */
  async executeTestScript(suite) {
    return new Promise((resolve, reject) => {
      const scriptPath = path.resolve(__dirname, suite.script);
      const timeout = suite.timeout || this.options.timeout;
      
      console.log(`   🏃 执行脚本: ${suite.script}`);
      
      const child = spawn('node', [scriptPath], {
        cwd: __dirname,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          TEST_SUITE_NAME: suite.name,
          TEST_TIMEOUT: timeout.toString(),
          TEST_HEADLESS: this.options.headless.toString(),
          TEST_SLOW_MO: this.options.slowMo.toString()
        }
      });
      
      let stdout = '';
      let stderr = '';
      
      child.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        // 实时输出重要信息
        if (output.includes('✅') || output.includes('❌') || output.includes('⚠️')) {
          process.stdout.write(`     ${output}`);
        }
      });
      
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      const timeoutId = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`测试超时 (${timeout}ms)`));
      }, timeout);
      
      child.on('close', (code) => {
        clearTimeout(timeoutId);
        
        if (code === 0) {
          try {
            // 尝试解析测试结果
            const resultMatch = stdout.match(/TEST_RESULT_JSON:(.+)/s);
            if (resultMatch) {
              const result = JSON.parse(resultMatch[1].trim());
              console.log(`   ✅ 测试完成: ${result.summary?.passed || 0}通过, ${result.summary?.failed || 0}失败`);
              resolve(result);
            } else {
              // 如果没有JSON结果，创建基本结果
              const success = !stdout.includes('❌') && !stderr;
              resolve({
                overallStatus: success ? 'passed' : 'failed',
                summary: { total: 1, passed: success ? 1 : 0, failed: success ? 0 : 1, errors: 0 },
                results: [{
                  testCase: suite.name,
                  overallStatus: success ? 'passed' : 'failed',
                  error: stderr || (success ? null : '测试执行异常')
                }]
              });
            }
          } catch (parseError) {
            reject(new Error(`解析测试结果失败: ${parseError.message}`));
          }
        } else {
          reject(new Error(`测试进程退出异常 (code: ${code})${stderr ? ': ' + stderr : ''}`));
        }
      });
      
      child.on('error', (error) => {
        clearTimeout(timeoutId);
        reject(new Error(`启动测试进程失败: ${error.message}`));
      });
    });
  }

  /**
   * 生成综合报告
   */
  async generateComprehensiveReport() {
    console.log('\n📊 生成综合测试报告...');
    
    try {
      const reports = await this.reportGenerator.generateComprehensiveReport(
        this.results,
        {
          environment: this.options.environment,
          browser: this.options.browser,
          parallel: this.options.parallel,
          totalDuration: this.endTime - this.startTime
        }
      );
      
      console.log('\n📋 报告生成完成:');
      console.log(`   🌐 HTML报告: ${reports.html.filename}`);
      console.log(`   📄 JSON报告: ${reports.json.filename}`);
      console.log(`   📝 Markdown报告: ${reports.markdown.filename}`);
      console.log(`   📊 CSV报告: ${reports.csv.filename}`);
      
      return reports;
      
    } catch (error) {
      console.error('   ❌ 报告生成失败:', error.message);
      throw error;
    }
  }

  /**
   * 清理测试数据
   */
  async cleanupTestData() {
    console.log('\n🧹 清理测试数据...');
    
    try {
      // 清理旧报告
      await this.reportGenerator.cleanupOldReports(7);
      
      // 清理测试用户数据（如果有API支持）
      if (testConfig.cleanup && testConfig.cleanup.enabled) {
        await this.cleanupTestUsers();
      }
      
      console.log('   ✅ 测试数据清理完成');
      
    } catch (error) {
      console.warn('   ⚠️ 测试数据清理失败:', error.message);
    }
  }

  /**
   * 清理旧的测试数据
   */
  async cleanupOldTestData() {
    console.log('   🗑️ 清理旧的测试数据...');
    
    try {
      // 清理临时文件
      const tempDir = './temp';
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
      
      // 清理旧截图
      const screenshotDir = './test-reports/screenshots';
      if (fs.existsSync(screenshotDir)) {
        const files = fs.readdirSync(screenshotDir);
        const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 1天前
        
        files.forEach(file => {
          const filePath = path.join(screenshotDir, file);
          const stats = fs.statSync(filePath);
          if (stats.mtime.getTime() < cutoffTime) {
            fs.unlinkSync(filePath);
          }
        });
      }
      
    } catch (error) {
      console.warn('     ⚠️ 清理旧数据失败:', error.message);
    }
  }

  /**
   * 清理测试用户
   */
  async cleanupTestUsers() {
    console.log('   👥 清理测试用户数据...');
    
    try {
      const testUsers = testConfig.testUsers;
      
      for (const role in testUsers) {
        const users = testUsers[role];
        for (const user of users) {
          if (user.cleanup) {
            // 这里可以调用API清理用户创建的测试数据
            console.log(`     🗑️ 清理用户 ${user.username} 的测试数据`);
          }
        }
      }
      
    } catch (error) {
      console.warn('     ⚠️ 清理测试用户失败:', error.message);
    }
  }

  /**
   * 打印最终摘要
   */
  async printFinalSummary() {
    const totalDuration = this.endTime - this.startTime;
    const totalTests = this.results.reduce((sum, r) => sum + (r.summary?.total || 0), 0);
    const totalPassed = this.results.reduce((sum, r) => sum + (r.summary?.passed || 0), 0);
    const totalFailed = this.results.reduce((sum, r) => sum + (r.summary?.failed || 0), 0);
    const totalErrors = this.results.reduce((sum, r) => sum + (r.summary?.errors || 0), 0);
    const successRate = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;
    
    console.log('\n' + '='.repeat(60));
    console.log('🎯 测试执行完成 - 最终摘要');
    console.log('='.repeat(60));
    console.log(`📊 总体统计:`);
    console.log(`   • 执行套件: ${this.results.length}/${this.testSuites.length}`);
    console.log(`   • 总测试数: ${totalTests}`);
    console.log(`   • 通过: ${totalPassed}`);
    console.log(`   • 失败: ${totalFailed}`);
    console.log(`   • 错误: ${totalErrors}`);
    console.log(`   • 成功率: ${successRate}%`);
    console.log(`   • 总耗时: ${Math.round(totalDuration / 1000)}秒`);
    
    console.log(`\n📋 套件详情:`);
    this.results.forEach((result, index) => {
      const status = result.overallStatus === 'passed' ? '✅' : '❌';
      const duration = Math.round((result.duration || 0) / 1000);
      const attempts = result.attempts > 1 ? ` (${result.attempts}次尝试)` : '';
      
      console.log(`   ${index + 1}. ${status} ${result.testSuite} - ${duration}秒${attempts}`);
      
      if (result.error) {
        console.log(`      错误: ${result.error}`);
      }
    });
    
    // 性能评估
    console.log(`\n⚡ 性能评估:`);
    const avgDuration = totalDuration / this.results.length;
    if (avgDuration > 60000) {
      console.log(`   ⚠️ 平均测试时间较长 (${Math.round(avgDuration / 1000)}秒)，建议优化`);
    } else {
      console.log(`   ✅ 测试执行效率良好 (平均${Math.round(avgDuration / 1000)}秒/套件)`);
    }
    
    // 质量评估
    console.log(`\n🎯 质量评估:`);
    if (successRate >= 90) {
      console.log(`   ✅ 测试质量优秀 (${successRate}%)`);
    } else if (successRate >= 70) {
      console.log(`   ⚠️ 测试质量良好 (${successRate}%)，建议关注失败用例`);
    } else {
      console.log(`   ❌ 测试质量需要改进 (${successRate}%)，建议优先修复问题`);
    }
    
    console.log('\n' + '='.repeat(60));
  }

  /**
   * 工具方法
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * 运行特定测试套件
   */
  async runSpecificTests(testNames) {
    console.log(`\n🎯 运行指定测试: ${testNames.join(', ')}`);
    
    const selectedSuites = this.testSuites.filter(suite => 
      testNames.some(name => suite.name.includes(name) || suite.script.includes(name))
    );
    
    if (selectedSuites.length === 0) {
      throw new Error(`未找到匹配的测试套件: ${testNames.join(', ')}`);
    }
    
    console.log(`找到${selectedSuites.length}个匹配的测试套件`);
    
    // 临时替换测试套件列表
    const originalSuites = this.testSuites;
    this.testSuites = selectedSuites;
    
    try {
      return await this.runAllTests();
    } finally {
      this.testSuites = originalSuites;
    }
  }

  /**
   * 获取测试套件信息
   */
  getTestSuitesInfo() {
    return this.testSuites.map(suite => ({
      name: suite.name,
      script: suite.script,
      priority: suite.priority,
      description: suite.description,
      timeout: suite.timeout,
      retries: suite.retries
    }));
  }
}

// 命令行接口
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const options = {};
  const testNames = [];
  
  // 解析命令行参数
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--parallel':
        options.parallel = true;
        break;
      case '--headless':
        options.headless = args[i + 1] !== 'false';
        i++;
        break;
      case '--browser':
        options.browser = args[i + 1];
        i++;
        break;
      case '--timeout':
        options.timeout = parseInt(args[i + 1]);
        i++;
        break;
      case '--retries':
        options.retries = parseInt(args[i + 1]);
        i++;
        break;
      case '--no-report':
        options.generateReport = false;
        break;
      case '--no-cleanup':
        options.cleanupData = false;
        break;
      case '--tests':
        // 收集测试名称
        i++;
        while (i < args.length && !args[i].startsWith('--')) {
          testNames.push(args[i]);
          i++;
        }
        i--; // 回退一步
        break;
      case '--help':
        console.log(`
🎯 Puppeteer UI自动化测试执行器

用法:
  node main-test-runner.js [选项]

选项:
  --parallel              并行执行测试
  --headless <true|false> 无头模式 (默认: true)
  --browser <name>        浏览器类型 (默认: chromium)
  --timeout <ms>          测试超时时间 (默认: 300000)
  --retries <num>         重试次数 (默认: 1)
  --no-report            不生成测试报告
  --no-cleanup           不清理测试数据
  --tests <names...>     只运行指定的测试
  --help                 显示帮助信息

示例:
  node main-test-runner.js
  node main-test-runner.js --parallel --headless false
  node main-test-runner.js --tests "登录" "班级创建"
`);
        process.exit(0);
        break;
    }
  }
  
  // 执行测试
  const runner = new MainTestRunner(options);
  
  (async () => {
    try {
      if (testNames.length > 0) {
        await runner.runSpecificTests(testNames);
      } else {
        await runner.runAllTests();
      }
      
      const results = runner.results;
      const totalFailed = results.reduce((sum, r) => sum + (r.summary?.failed || 0), 0);
      const totalErrors = results.reduce((sum, r) => sum + (r.summary?.errors || 0), 0);
      
      // 根据测试结果设置退出码
      if (totalFailed > 0 || totalErrors > 0) {
        process.exit(1);
      } else {
        process.exit(0);
      }
      
    } catch (error) {
      console.error('\n❌ 测试执行器失败:', error.message);
      process.exit(1);
    }
  })();
}

export { MainTestRunner };