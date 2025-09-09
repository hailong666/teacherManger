/**
 * 测试报告生成器
 * 生成多种格式的测试报告，包括HTML、JSON、JUnit等
 */

import fs from 'fs';
import path from 'path';

class TestReportGenerator {
  constructor(options = {}) {
    this.options = {
      outputDir: options.outputDir || './test-results/reports',
      includeScreenshots: options.includeScreenshots !== false,
      includeVideos: options.includeVideos || false,
      detailedLogs: options.detailedLogs !== false,
      performanceMetrics: options.performanceMetrics || false,
      ...options
    };
    
    this.reportData = {
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0,
        startTime: null,
        endTime: null
      },
      testSuites: [],
      environment: {},
      metadata: {}
    };
  }

  /**
   * 初始化报告生成器
   */
  async initialize() {
    try {
      // 确保输出目录存在
      await this.ensureDirectories();
      
      // 初始化报告数据
      this.reportData.summary.startTime = new Date().toISOString();
      this.reportData.metadata = {
        generator: 'Puppeteer UI Test Suite',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        platform: process.platform,
        nodeVersion: process.version
      };
      
      console.log('📊 测试报告生成器已初始化');
    } catch (error) {
      console.error('❌ 报告生成器初始化失败:', error.message);
      throw error;
    }
  }

  /**
   * 确保必要的目录存在
   */
  async ensureDirectories() {
    const dirs = [
      this.options.outputDir,
      path.join(this.options.outputDir, 'html'),
      path.join(this.options.outputDir, 'json'),
      path.join(this.options.outputDir, 'junit'),
      path.join(this.options.outputDir, 'assets')
    ];
    
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  /**
   * 添加测试套件结果
   */
  addTestSuite(suiteResult) {
    this.reportData.testSuites.push(suiteResult);
    
    // 更新汇总统计
    if (suiteResult.summary) {
      this.reportData.summary.total += suiteResult.summary.total || 0;
      this.reportData.summary.passed += suiteResult.summary.passed || 0;
      this.reportData.summary.failed += suiteResult.summary.failed || 0;
      this.reportData.summary.skipped += suiteResult.summary.skipped || 0;
      this.reportData.summary.duration += suiteResult.summary.duration || 0;
    }
  }

  /**
   * 设置环境信息
   */
  setEnvironmentInfo(envInfo) {
    this.reportData.environment = envInfo;
  }

  /**
   * 生成所有格式的报告
   */
  async generateAllReports() {
    try {
      this.reportData.summary.endTime = new Date().toISOString();
      
      const reports = {
        html: await this.generateHTMLReport(),
        json: await this.generateJSONReport(),
        junit: await this.generateJUnitReport()
      };
      
      // 生成汇总报告
      await this.generateSummaryReport();
      
      console.log('📊 所有测试报告已生成完成');
      return reports;
    } catch (error) {
      console.error('❌ 生成报告失败:', error.message);
      throw error;
    }
  }

  /**
   * 生成HTML报告
   */
  async generateHTMLReport() {
    const htmlContent = this.generateHTMLContent();
    const filePath = path.join(this.options.outputDir, 'html', 'test-report.html');
    
    fs.writeFileSync(filePath, htmlContent, 'utf8');
    console.log(`📄 HTML报告已生成: ${filePath}`);
    
    return filePath;
  }

  /**
   * 生成HTML内容
   */
  generateHTMLContent() {
    const { summary, testSuites, environment, metadata } = this.reportData;
    const successRate = summary.total > 0 ? Math.round((summary.passed / summary.total) * 100) : 0;
    
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>UI自动化测试报告</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 20px; }
        .header h1 { font-size: 2.5em; margin-bottom: 10px; }
        .header .subtitle { font-size: 1.2em; opacity: 0.9; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .summary-card { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }
        .summary-card h3 { color: #333; margin-bottom: 10px; }
        .summary-card .number { font-size: 2em; font-weight: bold; margin-bottom: 5px; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .skipped { color: #ffc107; }
        .total { color: #007bff; }
        .success-rate { color: ${successRate >= 90 ? '#28a745' : successRate >= 70 ? '#ffc107' : '#dc3545'}; }
        .test-suites { background: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden; }
        .test-suite { border-bottom: 1px solid #eee; }
        .test-suite:last-child { border-bottom: none; }
        .suite-header { padding: 20px; background: #f8f9fa; cursor: pointer; display: flex; justify-content: space-between; align-items: center; }
        .suite-header:hover { background: #e9ecef; }
        .suite-title { font-size: 1.2em; font-weight: bold; }
        .suite-status { padding: 5px 15px; border-radius: 20px; color: white; font-size: 0.9em; }
        .suite-status.passed { background: #28a745; }
        .suite-status.failed { background: #dc3545; }
        .suite-details { padding: 20px; display: none; background: #fff; }
        .suite-details.active { display: block; }
        .test-case { padding: 10px 0; border-bottom: 1px solid #f0f0f0; }
        .test-case:last-child { border-bottom: none; }
        .test-name { font-weight: 500; margin-bottom: 5px; }
        .test-duration { color: #666; font-size: 0.9em; }
        .test-error { background: #f8d7da; color: #721c24; padding: 10px; border-radius: 5px; margin-top: 10px; font-family: monospace; font-size: 0.9em; }
        .metadata { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-top: 20px; }
        .metadata h3 { margin-bottom: 15px; color: #333; }
        .metadata-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; }
        .metadata-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
        .metadata-item:last-child { border-bottom: none; }
        .metadata-label { font-weight: 500; color: #666; }
        .metadata-value { color: #333; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 UI自动化测试报告</h1>
            <div class="subtitle">教师管理系统 - Puppeteer测试套件</div>
        </div>
        
        <div class="summary">
            <div class="summary-card">
                <h3>总测试数</h3>
                <div class="number total">${summary.total}</div>
            </div>
            <div class="summary-card">
                <h3>通过</h3>
                <div class="number passed">${summary.passed}</div>
            </div>
            <div class="summary-card">
                <h3>失败</h3>
                <div class="number failed">${summary.failed}</div>
            </div>
            <div class="summary-card">
                <h3>跳过</h3>
                <div class="number skipped">${summary.skipped}</div>
            </div>
            <div class="summary-card">
                <h3>成功率</h3>
                <div class="number success-rate">${successRate}%</div>
            </div>
            <div class="summary-card">
                <h3>执行时间</h3>
                <div class="number">${Math.round(summary.duration / 1000)}s</div>
            </div>
        </div>
        
        <div class="test-suites">
            ${testSuites.map((suite, index) => `
                <div class="test-suite">
                    <div class="suite-header" onclick="toggleSuite(${index})">
                        <div class="suite-title">${suite.name || '未命名测试套件'}</div>
                        <div class="suite-status ${(suite.summary?.failed || 0) > 0 ? 'failed' : 'passed'}">
                            ${(suite.summary?.failed || 0) > 0 ? '失败' : '通过'}
                        </div>
                    </div>
                    <div class="suite-details" id="suite-${index}">
                        <div class="metadata-grid">
                            <div class="metadata-item">
                                <span class="metadata-label">执行时间:</span>
                                <span class="metadata-value">${Math.round((suite.summary?.duration || 0) / 1000)}秒</span>
                            </div>
                            <div class="metadata-item">
                                <span class="metadata-label">测试用例:</span>
                                <span class="metadata-value">${suite.summary?.total || 0}个</span>
                            </div>
                        </div>
                        ${suite.testCases ? suite.testCases.map(testCase => `
                            <div class="test-case">
                                <div class="test-name ${testCase.status}">
                                    ${testCase.status === 'passed' ? '✅' : testCase.status === 'failed' ? '❌' : '⏭️'} 
                                    ${testCase.name}
                                </div>
                                <div class="test-duration">执行时间: ${Math.round((testCase.duration || 0) / 1000)}秒</div>
                                ${testCase.error ? `<div class="test-error">${testCase.error}</div>` : ''}
                            </div>
                        `).join('') : '<div class="test-case">无详细测试用例信息</div>'}
                    </div>
                </div>
            `).join('')}
        </div>
        
        <div class="metadata">
            <h3>📋 测试环境信息</h3>
            <div class="metadata-grid">
                <div class="metadata-item">
                    <span class="metadata-label">开始时间:</span>
                    <span class="metadata-value">${new Date(summary.startTime).toLocaleString('zh-CN')}</span>
                </div>
                <div class="metadata-item">
                    <span class="metadata-label">结束时间:</span>
                    <span class="metadata-value">${new Date(summary.endTime).toLocaleString('zh-CN')}</span>
                </div>
                <div class="metadata-item">
                    <span class="metadata-label">平台:</span>
                    <span class="metadata-value">${metadata.platform}</span>
                </div>
                <div class="metadata-item">
                    <span class="metadata-label">Node.js版本:</span>
                    <span class="metadata-value">${metadata.nodeVersion}</span>
                </div>
                <div class="metadata-item">
                    <span class="metadata-label">基础URL:</span>
                    <span class="metadata-value">${environment.baseUrl || 'N/A'}</span>
                </div>
                <div class="metadata-item">
                    <span class="metadata-label">浏览器:</span>
                    <span class="metadata-value">${environment.browser || 'N/A'}</span>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        function toggleSuite(index) {
            const details = document.getElementById('suite-' + index);
            details.classList.toggle('active');
        }
        
        // 自动展开失败的测试套件
        document.addEventListener('DOMContentLoaded', function() {
            const failedSuites = document.querySelectorAll('.suite-status.failed');
            failedSuites.forEach((status, index) => {
                const suiteIndex = Array.from(document.querySelectorAll('.suite-status')).indexOf(status);
                document.getElementById('suite-' + suiteIndex).classList.add('active');
            });
        });
    </script>
</body>
</html>
    `;
  }

  /**
   * 生成JSON报告
   */
  async generateJSONReport() {
    const filePath = path.join(this.options.outputDir, 'json', 'test-report.json');
    
    fs.writeFileSync(filePath, JSON.stringify(this.reportData, null, 2), 'utf8');
    console.log(`📄 JSON报告已生成: ${filePath}`);
    
    return filePath;
  }

  /**
   * 生成JUnit格式报告
   */
  async generateJUnitReport() {
    const junitContent = this.generateJUnitXML();
    const filePath = path.join(this.options.outputDir, 'junit', 'test-results.xml');
    
    fs.writeFileSync(filePath, junitContent, 'utf8');
    console.log(`📄 JUnit报告已生成: ${filePath}`);
    
    return filePath;
  }

  /**
   * 生成JUnit XML内容
   */
  generateJUnitXML() {
    const { summary, testSuites } = this.reportData;
    
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += `<testsuites name="UI自动化测试" tests="${summary.total}" failures="${summary.failed}" time="${summary.duration / 1000}">\n`;
    
    testSuites.forEach(suite => {
      const suiteSummary = suite.summary || {};
      xml += `  <testsuite name="${this.escapeXML(suite.name || '未命名测试套件')}" tests="${suiteSummary.total || 0}" failures="${suiteSummary.failed || 0}" time="${(suiteSummary.duration || 0) / 1000}">\n`;
      
      if (suite.testCases) {
        suite.testCases.forEach(testCase => {
          xml += `    <testcase name="${this.escapeXML(testCase.name)}" time="${(testCase.duration || 0) / 1000}">\n`;
          
          if (testCase.status === 'failed' && testCase.error) {
            xml += `      <failure message="测试失败">${this.escapeXML(testCase.error)}</failure>\n`;
          } else if (testCase.status === 'skipped') {
            xml += `      <skipped/>\n`;
          }
          
          xml += `    </testcase>\n`;
        });
      }
      
      xml += `  </testsuite>\n`;
    });
    
    xml += '</testsuites>\n';
    return xml;
  }

  /**
   * 生成汇总报告
   */
  async generateSummaryReport() {
    const { summary } = this.reportData;
    const successRate = summary.total > 0 ? Math.round((summary.passed / summary.total) * 100) : 0;
    
    const summaryText = `
🎯 UI自动化测试执行汇总
${'='.repeat(50)}

📊 测试统计:
   总测试数: ${summary.total}
   通过: ${summary.passed}
   失败: ${summary.failed}
   跳过: ${summary.skipped}
   成功率: ${successRate}%

⏱️ 执行时间:
   开始时间: ${new Date(summary.startTime).toLocaleString('zh-CN')}
   结束时间: ${new Date(summary.endTime).toLocaleString('zh-CN')}
   总耗时: ${Math.round(summary.duration / 1000)}秒

${this.generateRecommendations()}

${'='.repeat(50)}
生成时间: ${new Date().toLocaleString('zh-CN')}
    `;
    
    const filePath = path.join(this.options.outputDir, 'summary.txt');
    fs.writeFileSync(filePath, summaryText, 'utf8');
    
    console.log(`📄 汇总报告已生成: ${filePath}`);
    return filePath;
  }

  /**
   * 生成改进建议
   */
  generateRecommendations() {
    const { summary, testSuites } = this.reportData;
    const successRate = summary.total > 0 ? Math.round((summary.passed / summary.total) * 100) : 0;
    const recommendations = [];
    
    if (successRate < 70) {
      recommendations.push('🔴 测试成功率较低，建议优先修复失败的测试用例');
    } else if (successRate < 90) {
      recommendations.push('🟡 测试成功率良好，建议关注失败用例并持续改进');
    } else {
      recommendations.push('🟢 测试成功率优秀，继续保持代码质量');
    }
    
    if (summary.duration > 300000) { // 5分钟
      recommendations.push('⏱️ 测试执行时间较长，考虑优化测试用例或并行执行');
    }
    
    const failedSuites = testSuites.filter(suite => (suite.summary?.failed || 0) > 0);
    if (failedSuites.length > 0) {
      recommendations.push(`🔧 需要关注的失败测试套件: ${failedSuites.map(s => s.name).join(', ')}`);
    }
    
    if (recommendations.length === 0) {
      recommendations.push('✨ 所有测试都运行良好，无需特别关注');
    }
    
    return `💡 改进建议:\n${recommendations.map(r => `   ${r}`).join('\n')}`;
  }

  /**
   * 清理旧报告
   */
  async cleanupOldReports(daysToKeep = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      const reportDirs = ['html', 'json', 'junit'];
      let cleanedCount = 0;
      
      for (const dir of reportDirs) {
        const dirPath = path.join(this.options.outputDir, dir);
        if (fs.existsSync(dirPath)) {
          const files = fs.readdirSync(dirPath);
          
          for (const file of files) {
            const filePath = path.join(dirPath, file);
            const stats = fs.statSync(filePath);
            
            if (stats.mtime < cutoffDate) {
              fs.unlinkSync(filePath);
              cleanedCount++;
            }
          }
        }
      }
      
      if (cleanedCount > 0) {
        console.log(`🧹 已清理 ${cleanedCount} 个旧报告文件`);
      }
    } catch (error) {
      console.error('❌ 清理旧报告失败:', error.message);
    }
  }

  /**
   * 生成趋势报告
   */
  async generateTrendReport() {
    try {
      const trendFile = path.join(this.options.outputDir, 'trend-data.json');
      let trendData = [];
      
      // 读取现有趋势数据
      if (fs.existsSync(trendFile)) {
        const content = fs.readFileSync(trendFile, 'utf8');
        trendData = JSON.parse(content);
      }
      
      // 添加当前测试结果
      const currentResult = {
        timestamp: new Date().toISOString(),
        summary: this.reportData.summary,
        successRate: this.reportData.summary.total > 0 ? 
          Math.round((this.reportData.summary.passed / this.reportData.summary.total) * 100) : 0
      };
      
      trendData.push(currentResult);
      
      // 保留最近30次的数据
      if (trendData.length > 30) {
        trendData = trendData.slice(-30);
      }
      
      // 保存趋势数据
      fs.writeFileSync(trendFile, JSON.stringify(trendData, null, 2), 'utf8');
      
      console.log('📈 趋势报告数据已更新');
      return trendData;
    } catch (error) {
      console.error('❌ 生成趋势报告失败:', error.message);
      return [];
    }
  }

  /**
   * XML转义
   */
  escapeXML(str) {
    return str.replace(/[<>&"']/g, (match) => {
      switch (match) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '"': return '&quot;';
        case "'": return '&apos;';
        default: return match;
      }
    });
  }

  /**
   * 获取报告统计信息
   */
  getReportSummary() {
    return {
      ...this.reportData.summary,
      successRate: this.reportData.summary.total > 0 ? 
        Math.round((this.reportData.summary.passed / this.reportData.summary.total) * 100) : 0,
      testSuitesCount: this.reportData.testSuites.length
    };
  }
}

export default TestReportGenerator;