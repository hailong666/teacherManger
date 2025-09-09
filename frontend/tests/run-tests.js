#!/usr/bin/env node

/**
 * 简化的测试执行脚本
 * 提供快速运行Puppeteer UI自动化测试的入口
 */

import { MainTestRunner } from './main-test-runner.js';
import { TestDataManager } from './test-data-manager.js';
import testConfig from '../../test-config.js';

// 颜色输出辅助函数
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorLog(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 显示欢迎信息
function showWelcome() {
  console.log('\n' + '='.repeat(70));
  colorLog('cyan', '🎯 Puppeteer UI自动化测试套件');
  colorLog('blue', '   教师管理系统 - 全面UI测试方案');
  console.log('='.repeat(70));
  console.log();
}

// 显示帮助信息
function showHelp() {
  console.log(`
${colors.bright}用法:${colors.reset}
  node run-tests.js [选项] [测试名称...]

${colors.bright}选项:${colors.reset}
  -h, --help              显示帮助信息
  -l, --list              列出所有可用的测试套件
  -p, --parallel          并行执行测试
  -H, --headless <bool>   无头模式 (默认: true)
  -b, --browser <name>    浏览器类型 (chromium/firefox/webkit)
  -t, --timeout <ms>      测试超时时间 (默认: 300000)
  -r, --retries <num>     重试次数 (默认: 1)
  --no-report            不生成测试报告
  --no-cleanup           不清理测试数据
  --quick                快速模式 (减少等待时间)
  --debug                调试模式 (显示详细日志)

${colors.bright}测试套件:${colors.reset}
  login                  多角色登录验证测试
  class                  班级创建流程测试
  functional             功能覆盖测试
  exception              异常情况测试

${colors.bright}示例:${colors.reset}
  node run-tests.js                           # 运行所有测试
  node run-tests.js --parallel                # 并行运行所有测试
  node run-tests.js login class               # 只运行登录和班级测试
  node run-tests.js --headless false --debug  # 有头模式+调试模式
  node run-tests.js --quick --no-cleanup      # 快速模式，不清理数据

${colors.bright}环境要求:${colors.reset}
  • Node.js 14+
  • Puppeteer
  • 前后端服务正在运行
`);
}

// 列出测试套件
function listTestSuites() {
  const runner = new MainTestRunner();
  const suites = runner.getTestSuitesInfo();
  
  console.log(`\n${colors.bright}可用的测试套件:${colors.reset}\n`);
  
  suites.forEach((suite, index) => {
    const priorityColor = suite.priority === 'critical' ? 'red' : 
                         suite.priority === 'high' ? 'yellow' : 'green';
    
    console.log(`${colors.bright}${index + 1}. ${suite.name}${colors.reset}`);
    console.log(`   脚本: ${suite.script}`);
    console.log(`   优先级: ${colors[priorityColor]}${suite.priority}${colors.reset}`);
    console.log(`   超时: ${suite.timeout}ms`);
    console.log(`   重试: ${suite.retries}次`);
    console.log(`   描述: ${suite.description}`);
    console.log();
  });
}

// 解析命令行参数
function parseArguments() {
  const args = process.argv.slice(2);
  const options = {
    help: false,
    list: false,
    parallel: false,
    headless: true,
    browser: 'chromium',
    timeout: 300000,
    retries: 1,
    generateReport: true,
    cleanupData: true,
    quick: false,
    debug: false
  };
  const testNames = [];
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '-h':
      case '--help':
        options.help = true;
        break;
        
      case '-l':
      case '--list':
        options.list = true;
        break;
        
      case '-p':
      case '--parallel':
        options.parallel = true;
        break;
        
      case '-H':
      case '--headless':
        i++;
        options.headless = args[i] !== 'false';
        break;
        
      case '-b':
      case '--browser':
        i++;
        options.browser = args[i];
        break;
        
      case '-t':
      case '--timeout':
        i++;
        options.timeout = parseInt(args[i]);
        break;
        
      case '-r':
      case '--retries':
        i++;
        options.retries = parseInt(args[i]);
        break;
        
      case '--no-report':
        options.generateReport = false;
        break;
        
      case '--no-cleanup':
        options.cleanupData = false;
        break;
        
      case '--quick':
        options.quick = true;
        options.timeout = 120000; // 减少超时时间
        options.slowMo = 0; // 移除延迟
        break;
        
      case '--debug':
        options.debug = true;
        options.headless = false; // 调试模式默认显示浏览器
        break;
        
      default:
        if (!arg.startsWith('-')) {
          testNames.push(arg);
        }
        break;
    }
  }
  
  return { options, testNames };
}

// 验证环境
async function validateEnvironment() {
  colorLog('blue', '🔍 验证测试环境...');
  
  const checks = [
    {
      name: 'Node.js版本',
      check: () => {
        const version = process.version;
        const majorVersion = parseInt(version.slice(1).split('.')[0]);
        if (majorVersion < 14) {
          throw new Error(`Node.js版本过低: ${version}，需要14+`);
        }
        return `${version} ✅`;
      }
    },
    {
      name: 'Puppeteer依赖',
      check: async () => {
        try {
          const fs = await import('fs');
          const path = await import('path');
          const puppeteerPath = path.default.resolve(process.cwd(), 'node_modules/puppeteer/package.json');
          if (fs.default.existsSync(puppeteerPath)) {
            return '已安装 ✅';
          } else {
            throw new Error('未安装，请运行: npm install puppeteer');
          }
        } catch (error) {
          throw new Error('未安装，请运行: npm install puppeteer');
        }
      }
    },
    {
      name: '测试配置',
      check: () => {
        if (!testConfig || !testConfig.testEnvironment) {
          throw new Error('配置文件无效或缺失');
        }
        return '配置有效 ✅';
      }
    }
  ];
  
  for (const check of checks) {
    try {
      const result = await check.check();
      console.log(`   ${check.name}: ${result}`);
    } catch (error) {
      colorLog('red', `   ${check.name}: ${error.message} ❌`);
      throw error;
    }
  }
  
  colorLog('green', '   环境验证通过 ✅');
}

// 显示测试配置
function showTestConfiguration(options, testNames) {
  console.log(`\n${colors.bright}测试配置:${colors.reset}`);
  console.log(`   执行模式: ${options.parallel ? '并行' : '顺序'}`);
  console.log(`   浏览器: ${options.browser}`);
  console.log(`   无头模式: ${options.headless ? '是' : '否'}`);
  console.log(`   超时时间: ${options.timeout}ms`);
  console.log(`   重试次数: ${options.retries}`);
  console.log(`   生成报告: ${options.generateReport ? '是' : '否'}`);
  console.log(`   清理数据: ${options.cleanupData ? '是' : '否'}`);
  
  if (testNames.length > 0) {
    console.log(`   指定测试: ${testNames.join(', ')}`);
  } else {
    console.log(`   执行范围: 所有测试套件`);
  }
  
  if (options.quick) {
    colorLog('yellow', '   快速模式: 已启用 ⚡');
  }
  
  if (options.debug) {
    colorLog('magenta', '   调试模式: 已启用 🐛');
  }
}

// 主执行函数
async function main() {
  try {
    showWelcome();
    
    const { options, testNames } = parseArguments();
    
    // 处理帮助和列表选项
    if (options.help) {
      showHelp();
      process.exit(0);
    }
    
    if (options.list) {
      listTestSuites();
      process.exit(0);
    }
    
    // 验证环境
    await validateEnvironment();
    
    // 显示配置
    showTestConfiguration(options, testNames);
    
    // 初始化数据管理器
    colorLog('blue', '\n🗃️ 初始化测试数据管理器...');
    const dataManager = new TestDataManager({
      cleanupAfterTest: options.cleanupData
    });
    await dataManager.initializeTestEnvironment();
    
    // 创建测试运行器
    colorLog('blue', '\n🚀 初始化测试运行器...');
    const runner = new MainTestRunner({
      ...options,
      slowMo: options.debug ? 100 : (options.quick ? 0 : 50)
    });
    
    // 执行测试
    let results;
    if (testNames.length > 0) {
      results = await runner.runSpecificTests(testNames);
    } else {
      results = await runner.runAllTests();
    }
    
    // 清理数据
    if (options.cleanupData) {
      colorLog('blue', '\n🧹 清理测试数据...');
      await dataManager.cleanupTestData();
    }
    
    // 计算最终结果
    const totalTests = results.reduce((sum, r) => sum + (r.summary?.total || 0), 0);
    const totalPassed = results.reduce((sum, r) => sum + (r.summary?.passed || 0), 0);
    const totalFailed = results.reduce((sum, r) => sum + (r.summary?.failed || 0), 0);
    const successRate = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;
    
    // 显示最终状态
    console.log('\n' + '='.repeat(70));
    if (successRate >= 90) {
      colorLog('green', '🎉 测试执行完成 - 质量优秀!');
    } else if (successRate >= 70) {
      colorLog('yellow', '⚠️ 测试执行完成 - 质量良好，建议关注失败用例');
    } else {
      colorLog('red', '❌ 测试执行完成 - 质量需要改进');
    }
    
    console.log(`成功率: ${successRate}% (${totalPassed}/${totalTests})`);
    console.log('='.repeat(70));
    
    // 设置退出码
    if (totalFailed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
    
  } catch (error) {
    console.log('\n' + '='.repeat(70));
    colorLog('red', '❌ 测试执行失败');
    console.error(`错误: ${error.message}`);
    
    if (error.stack && process.env.DEBUG) {
      console.error('\n堆栈跟踪:');
      console.error(error.stack);
    }
    
    console.log('='.repeat(70));
    process.exit(1);
  }
}

// 处理未捕获的异常
process.on('unhandledRejection', (reason, promise) => {
  console.error('\n❌ 未处理的Promise拒绝:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('\n❌ 未捕获的异常:', error.message);
  process.exit(1);
});

// 处理中断信号
process.on('SIGINT', () => {
  console.log('\n\n⏹️ 测试被用户中断');
  process.exit(130);
});

process.on('SIGTERM', () => {
  console.log('\n\n⏹️ 测试被系统终止');
  process.exit(143);
});

// 执行主函数
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  main,
  parseArguments,
  validateEnvironment,
  showHelp,
  listTestSuites
};