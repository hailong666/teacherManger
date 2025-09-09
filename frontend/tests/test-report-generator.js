const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * 测试报告生成系统
 * 统一管理和生成各种格式的测试报告
 */
class TestReportGenerator {
  constructor() {
    this.reportDir = './test-reports';
    this.screenshotDir = path.join(this.reportDir, 'screenshots');
    this.ensureDirectories();
  }

  ensureDirectories() {
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir, { recursive: true });
    }
  }

  /**
   * 生成综合测试报告
   * @param {Array} testResults - 所有测试结果
   * @param {Object} options - 报告选项
   */
  async generateComprehensiveReport(testResults, options = {}) {
    console.log('\n📊 生成综合测试报告...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportData = {
      metadata: {
        generatedAt: new Date().toISOString(),
        testSuite: 'Puppeteer UI自动化测试套件',
        version: '1.0.0',
        environment: options.environment || 'test',
        browser: options.browser || 'chromium'
      },
      summary: this.calculateOverallSummary(testResults),
      testResults: testResults,
      recommendations: this.generateRecommendations(testResults)
    };

    // 生成多种格式的报告
    const reports = {
      json: await this.generateJsonReport(reportData, timestamp),
      html: await this.generateHtmlReport(reportData, timestamp),
      markdown: await this.generateMarkdownReport(reportData, timestamp),
      csv: await this.generateCsvReport(reportData, timestamp)
    };

    // 生成报告索引
    await this.generateReportIndex(reports, timestamp);

    console.log('   ✅ 综合测试报告生成完成');
    console.log(`   📁 报告目录: ${this.reportDir}`);
    
    return reports;
  }

  /**
   * 计算总体测试摘要
   */
  calculateOverallSummary(testResults) {
    const summary = {
      totalTests: 0,
      totalPassed: 0,
      totalFailed: 0,
      totalErrors: 0,
      totalSkipped: 0,
      successRate: 0,
      totalDuration: 0,
      testsByCategory: {},
      criticalIssues: [],
      performanceMetrics: {
        averageLoadTime: 0,
        slowestTest: null,
        fastestTest: null
      }
    };

    testResults.forEach(result => {
      // 统计基本数据
      if (result.summary) {
        summary.totalTests += result.summary.total || 0;
        summary.totalPassed += result.summary.passed || 0;
        summary.totalFailed += result.summary.failed || 0;
        summary.totalErrors += result.summary.errors || 0;
      }

      // 统计持续时间
      if (result.duration) {
        summary.totalDuration += result.duration;
      }

      // 按类别统计
      const category = result.testSuite || 'unknown';
      if (!summary.testsByCategory[category]) {
        summary.testsByCategory[category] = {
          total: 0,
          passed: 0,
          failed: 0,
          errors: 0
        };
      }
      
      if (result.summary) {
        summary.testsByCategory[category].total += result.summary.total || 0;
        summary.testsByCategory[category].passed += result.summary.passed || 0;
        summary.testsByCategory[category].failed += result.summary.failed || 0;
        summary.testsByCategory[category].errors += result.summary.errors || 0;
      }

      // 收集关键问题
      if (result.results) {
        result.results.forEach(testCase => {
          if (testCase.overallStatus === 'failed' || testCase.error) {
            summary.criticalIssues.push({
              category: category,
              testCase: testCase.testCase || testCase.module,
              error: testCase.error,
              severity: this.assessSeverity(testCase)
            });
          }
        });
      }
    });

    // 计算成功率
    if (summary.totalTests > 0) {
      summary.successRate = Math.round((summary.totalPassed / summary.totalTests) * 100);
    }

    return summary;
  }

  /**
   * 评估问题严重程度
   */
  assessSeverity(testCase) {
    if (testCase.testCase && testCase.testCase.includes('登录')) {
      return 'critical';
    }
    if (testCase.error && testCase.error.includes('网络')) {
      return 'high';
    }
    if (testCase.overallStatus === 'failed') {
      return 'medium';
    }
    return 'low';
  }

  /**
   * 生成改进建议
   */
  generateRecommendations(testResults) {
    const recommendations = [];
    const summary = this.calculateOverallSummary(testResults);

    // 基于成功率的建议
    if (summary.successRate < 70) {
      recommendations.push({
        type: 'critical',
        title: '测试成功率过低',
        description: `当前测试成功率为${summary.successRate}%，建议优先修复失败的测试用例`,
        priority: 'high'
      });
    }

    // 基于关键问题的建议
    const criticalIssues = summary.criticalIssues.filter(issue => issue.severity === 'critical');
    if (criticalIssues.length > 0) {
      recommendations.push({
        type: 'security',
        title: '发现关键功能问题',
        description: `检测到${criticalIssues.length}个关键功能问题，建议立即修复`,
        priority: 'critical',
        issues: criticalIssues
      });
    }

    // 基于性能的建议
    if (summary.totalDuration > 300000) { // 5分钟
      recommendations.push({
        type: 'performance',
        title: '测试执行时间过长',
        description: '测试执行时间超过5分钟，建议优化测试用例或并行执行',
        priority: 'medium'
      });
    }

    // 基于覆盖率的建议
    const categories = Object.keys(summary.testsByCategory);
    if (categories.length < 4) {
      recommendations.push({
        type: 'coverage',
        title: '测试覆盖率不足',
        description: '建议增加更多功能模块的测试用例以提高覆盖率',
        priority: 'medium'
      });
    }

    return recommendations;
  }

  /**
   * 生成JSON格式报告
   */
  async generateJsonReport(reportData, timestamp) {
    const filename = `comprehensive-test-report-${timestamp}.json`;
    const filepath = path.join(this.reportDir, filename);
    
    const jsonContent = JSON.stringify(reportData, null, 2);
    fs.writeFileSync(filepath, jsonContent);
    
    console.log(`   📄 JSON报告: ${filename}`);
    return { type: 'json', filename, filepath };
  }

  /**
   * 生成HTML格式报告
   */
  async generateHtmlReport(reportData, timestamp) {
    const filename = `comprehensive-test-report-${timestamp}.html`;
    const filepath = path.join(this.reportDir, filename);
    
    const htmlContent = this.generateHtmlContent(reportData);
    fs.writeFileSync(filepath, htmlContent);
    
    console.log(`   🌐 HTML报告: ${filename}`);
    return { type: 'html', filename, filepath };
  }

  /**
   * 生成HTML内容
   */
  generateHtmlContent(reportData) {
    const { metadata, summary, testResults, recommendations } = reportData;
    
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Puppeteer UI自动化测试综合报告</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f7fa; color: #333; }
        .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px; text-align: center; }
        .header h1 { font-size: 2.5em; margin-bottom: 10px; }
        .header p { font-size: 1.1em; opacity: 0.9; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .summary-card { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; transition: transform 0.2s; }
        .summary-card:hover { transform: translateY(-2px); }
        .summary-card h3 { font-size: 2.5em; margin-bottom: 10px; }
        .summary-card.total h3 { color: #3498db; }
        .summary-card.passed h3 { color: #2ecc71; }
        .summary-card.failed h3 { color: #e74c3c; }
        .summary-card.errors h3 { color: #f39c12; }
        .summary-card.rate h3 { color: #9b59b6; }
        .chart-container { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-bottom: 30px; }
        .progress-bar { width: 100%; height: 20px; background: #ecf0f1; border-radius: 10px; overflow: hidden; margin: 10px 0; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #2ecc71, #27ae60); transition: width 0.3s ease; }
        .test-results { background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-bottom: 30px; overflow: hidden; }
        .test-header { background: #34495e; color: white; padding: 20px; font-size: 1.3em; font-weight: bold; }
        .test-item { border-bottom: 1px solid #ecf0f1; }
        .test-item:last-child { border-bottom: none; }
        .test-summary { padding: 20px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: background 0.2s; }
        .test-summary:hover { background: #f8f9fa; }
        .test-details { padding: 0 20px 20px; background: #f8f9fa; display: none; }
        .test-details.expanded { display: block; }
        .status-badge { padding: 5px 12px; border-radius: 20px; font-size: 0.9em; font-weight: bold; }
        .status-passed { background: #d4edda; color: #155724; }
        .status-failed { background: #f8d7da; color: #721c24; }
        .status-error { background: #fff3cd; color: #856404; }
        .recommendations { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-bottom: 30px; }
        .recommendation-item { padding: 15px; margin: 10px 0; border-left: 4px solid #3498db; background: #f8f9fa; border-radius: 0 8px 8px 0; }
        .recommendation-item.critical { border-left-color: #e74c3c; }
        .recommendation-item.high { border-left-color: #f39c12; }
        .recommendation-item.medium { border-left-color: #f1c40f; }
        .screenshot-gallery { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        .screenshot-item { background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .screenshot-item img { width: 100%; height: 150px; object-fit: cover; }
        .screenshot-item p { padding: 10px; font-size: 0.9em; text-align: center; }
        .expand-btn { background: none; border: none; color: #3498db; cursor: pointer; font-size: 0.9em; }
        .expand-btn:hover { text-decoration: underline; }
        .metadata { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-bottom: 30px; }
        .metadata-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        .metadata-item { padding: 10px; background: #f8f9fa; border-radius: 6px; }
        .metadata-item strong { color: #2c3e50; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 Puppeteer UI自动化测试综合报告</h1>
            <p>生成时间: ${metadata.generatedAt}</p>
            <p>测试环境: ${metadata.environment} | 浏览器: ${metadata.browser}</p>
        </div>

        <div class="metadata">
            <h2>📋 测试元数据</h2>
            <div class="metadata-grid">
                <div class="metadata-item">
                    <strong>测试套件:</strong><br>${metadata.testSuite}
                </div>
                <div class="metadata-item">
                    <strong>版本:</strong><br>${metadata.version}
                </div>
                <div class="metadata-item">
                    <strong>总耗时:</strong><br>${Math.round(summary.totalDuration / 1000)}秒
                </div>
                <div class="metadata-item">
                    <strong>测试类别:</strong><br>${Object.keys(summary.testsByCategory).length}个
                </div>
            </div>
        </div>

        <div class="summary-grid">
            <div class="summary-card total">
                <h3>${summary.totalTests}</h3>
                <p>总测试数</p>
            </div>
            <div class="summary-card passed">
                <h3>${summary.totalPassed}</h3>
                <p>通过</p>
            </div>
            <div class="summary-card failed">
                <h3>${summary.totalFailed}</h3>
                <p>失败</p>
            </div>
            <div class="summary-card errors">
                <h3>${summary.totalErrors}</h3>
                <p>错误</p>
            </div>
            <div class="summary-card rate">
                <h3>${summary.successRate}%</h3>
                <p>成功率</p>
            </div>
        </div>

        <div class="chart-container">
            <h2>📊 测试成功率</h2>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${summary.successRate}%"></div>
            </div>
            <p style="text-align: center; margin-top: 10px;">成功率: ${summary.successRate}% (${summary.totalPassed}/${summary.totalTests})</p>
        </div>

        ${Object.keys(summary.testsByCategory).length > 0 ? `
        <div class="chart-container">
            <h2>📈 分类测试统计</h2>
            ${Object.entries(summary.testsByCategory).map(([category, stats]) => `
                <div style="margin: 15px 0;">
                    <h4>${category}</h4>
                    <div style="display: flex; gap: 10px; margin: 5px 0;">
                        <span class="status-badge status-passed">通过: ${stats.passed}</span>
                        <span class="status-badge status-failed">失败: ${stats.failed}</span>
                        <span class="status-badge status-error">错误: ${stats.errors}</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0}%"></div>
                    </div>
                </div>
            `).join('')}
        </div>
        ` : ''}

        ${recommendations.length > 0 ? `
        <div class="recommendations">
            <h2>💡 改进建议</h2>
            ${recommendations.map(rec => `
                <div class="recommendation-item ${rec.priority}">
                    <h4>${rec.title}</h4>
                    <p>${rec.description}</p>
                    ${rec.issues ? `
                        <ul style="margin-top: 10px;">
                            ${rec.issues.map(issue => `<li>${issue.testCase}: ${issue.error}</li>`).join('')}
                        </ul>
                    ` : ''}
                </div>
            `).join('')}
        </div>
        ` : ''}

        <div class="test-results">
            <div class="test-header">🧪 详细测试结果</div>
            ${testResults.map((result, index) => `
                <div class="test-item">
                    <div class="test-summary" onclick="toggleDetails(${index})">
                        <div>
                            <strong>${result.testSuite || '未知测试套件'}</strong>
                            <br>
                            <small>耗时: ${result.duration ? Math.round(result.duration / 1000) + '秒' : '未知'}</small>
                        </div>
                        <div>
                            ${result.summary ? `
                                <span class="status-badge status-passed">通过: ${result.summary.passed}</span>
                                <span class="status-badge status-failed">失败: ${result.summary.failed}</span>
                                <span class="status-badge status-error">错误: ${result.summary.errors}</span>
                            ` : '<span class="status-badge status-error">无统计数据</span>'}
                            <button class="expand-btn">展开详情</button>
                        </div>
                    </div>
                    <div class="test-details" id="details-${index}">
                        ${result.results ? `
                            <h4>测试用例详情:</h4>
                            ${result.results.map(testCase => `
                                <div style="margin: 10px 0; padding: 10px; background: white; border-radius: 6px;">
                                    <strong>${testCase.testCase || testCase.module}</strong>
                                    <span class="status-badge ${testCase.overallStatus === 'passed' ? 'status-passed' : 'status-failed'}">
                                        ${testCase.overallStatus === 'passed' ? '✅ 通过' : '❌ 失败'}
                                    </span>
                                    ${testCase.error ? `<p style="color: #e74c3c; margin-top: 5px;">错误: ${testCase.error}</p>` : ''}
                                    ${testCase.scenarios ? `
                                        <ul style="margin-top: 10px;">
                                            ${testCase.scenarios.map(scenario => `
                                                <li style="margin: 5px 0;">
                                                    ${scenario.scenario || scenario.action}: 
                                                    <span style="color: ${scenario.success ? '#27ae60' : '#e74c3c'}">
                                                        ${scenario.success ? '✅' : '❌'}
                                                    </span>
                                                    ${scenario.error ? ` (${scenario.error})` : ''}
                                                </li>
                                            `).join('')}
                                        </ul>
                                    ` : ''}
                                    ${testCase.actions ? `
                                        <ul style="margin-top: 10px;">
                                            ${testCase.actions.map(action => `
                                                <li style="margin: 5px 0;">
                                                    ${action.action}: 
                                                    <span style="color: ${action.success ? '#27ae60' : '#e74c3c'}">
                                                        ${action.success ? '✅' : '❌'}
                                                    </span>
                                                    ${action.error ? ` (${action.error})` : ''}
                                                </li>
                                            `).join('')}
                                        </ul>
                                    ` : ''}
                                </div>
                            `).join('')}
                        ` : '<p>无详细测试结果</p>'}
                        
                        ${result.screenshots && result.screenshots.length > 0 ? `
                            <h4 style="margin-top: 20px;">测试截图:</h4>
                            <div class="screenshot-gallery">
                                ${result.screenshots.map(screenshot => `
                                    <div class="screenshot-item">
                                        <img src="${screenshot.filepath}" alt="${screenshot.name}" onclick="openImage('${screenshot.filepath}')">
                                        <p>${screenshot.name}</p>
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                </div>
            `).join('')}
        </div>

        ${summary.criticalIssues.length > 0 ? `
        <div class="recommendations">
            <h2>🚨 关键问题汇总</h2>
            ${summary.criticalIssues.map(issue => `
                <div class="recommendation-item ${issue.severity}">
                    <h4>${issue.category} - ${issue.testCase}</h4>
                    <p><strong>严重程度:</strong> ${issue.severity}</p>
                    <p><strong>错误信息:</strong> ${issue.error || '未知错误'}</p>
                </div>
            `).join('')}
        </div>
        ` : ''}
    </div>

    <script>
        function toggleDetails(index) {
            const details = document.getElementById('details-' + index);
            const isExpanded = details.classList.contains('expanded');
            
            // 关闭所有其他详情
            document.querySelectorAll('.test-details').forEach(el => {
                el.classList.remove('expanded');
            });
            
            // 切换当前详情
            if (!isExpanded) {
                details.classList.add('expanded');
            }
        }
        
        function openImage(src) {
            window.open(src, '_blank');
        }
        
        // 自动展开第一个失败的测试
        document.addEventListener('DOMContentLoaded', function() {
            const failedTests = document.querySelectorAll('.status-failed');
            if (failedTests.length > 0) {
                const firstFailed = failedTests[0].closest('.test-item');
                if (firstFailed) {
                    const details = firstFailed.querySelector('.test-details');
                    if (details) {
                        details.classList.add('expanded');
                    }
                }
            }
        });
    </script>
</body>
</html>
    `;
  }

  /**
   * 生成Markdown格式报告
   */
  async generateMarkdownReport(reportData, timestamp) {
    const filename = `comprehensive-test-report-${timestamp}.md`;
    const filepath = path.join(this.reportDir, filename);
    
    const markdownContent = this.generateMarkdownContent(reportData);
    fs.writeFileSync(filepath, markdownContent);
    
    console.log(`   📝 Markdown报告: ${filename}`);
    return { type: 'markdown', filename, filepath };
  }

  /**
   * 生成Markdown内容
   */
  generateMarkdownContent(reportData) {
    const { metadata, summary, testResults, recommendations } = reportData;
    
    let content = `# 🎯 Puppeteer UI自动化测试综合报告\n\n`;
    
    // 元数据
    content += `## 📋 测试信息\n\n`;
    content += `- **生成时间**: ${metadata.generatedAt}\n`;
    content += `- **测试套件**: ${metadata.testSuite}\n`;
    content += `- **版本**: ${metadata.version}\n`;
    content += `- **环境**: ${metadata.environment}\n`;
    content += `- **浏览器**: ${metadata.browser}\n`;
    content += `- **总耗时**: ${Math.round(summary.totalDuration / 1000)}秒\n\n`;
    
    // 测试摘要
    content += `## 📊 测试摘要\n\n`;
    content += `| 指标 | 数量 |\n`;
    content += `|------|------|\n`;
    content += `| 总测试数 | ${summary.totalTests} |\n`;
    content += `| 通过 | ${summary.totalPassed} |\n`;
    content += `| 失败 | ${summary.totalFailed} |\n`;
    content += `| 错误 | ${summary.totalErrors} |\n`;
    content += `| 成功率 | ${summary.successRate}% |\n\n`;
    
    // 分类统计
    if (Object.keys(summary.testsByCategory).length > 0) {
      content += `## 📈 分类测试统计\n\n`;
      content += `| 类别 | 总数 | 通过 | 失败 | 错误 | 成功率 |\n`;
      content += `|------|------|------|------|------|--------|\n`;
      
      Object.entries(summary.testsByCategory).forEach(([category, stats]) => {
        const successRate = stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0;
        content += `| ${category} | ${stats.total} | ${stats.passed} | ${stats.failed} | ${stats.errors} | ${successRate}% |\n`;
      });
      content += `\n`;
    }
    
    // 改进建议
    if (recommendations.length > 0) {
      content += `## 💡 改进建议\n\n`;
      recommendations.forEach((rec, index) => {
        content += `### ${index + 1}. ${rec.title} (${rec.priority})\n\n`;
        content += `${rec.description}\n\n`;
        if (rec.issues && rec.issues.length > 0) {
          content += `**相关问题:**\n`;
          rec.issues.forEach(issue => {
            content += `- ${issue.testCase}: ${issue.error}\n`;
          });
          content += `\n`;
        }
      });
    }
    
    // 详细测试结果
    content += `## 🧪 详细测试结果\n\n`;
    testResults.forEach((result, index) => {
      content += `### ${index + 1}. ${result.testSuite || '未知测试套件'}\n\n`;
      content += `- **耗时**: ${result.duration ? Math.round(result.duration / 1000) + '秒' : '未知'}\n`;
      
      if (result.summary) {
        content += `- **通过**: ${result.summary.passed}\n`;
        content += `- **失败**: ${result.summary.failed}\n`;
        content += `- **错误**: ${result.summary.errors}\n`;
      }
      
      if (result.results && result.results.length > 0) {
        content += `\n**测试用例:**\n\n`;
        result.results.forEach(testCase => {
          const status = testCase.overallStatus === 'passed' ? '✅' : '❌';
          content += `- ${status} **${testCase.testCase || testCase.module}**\n`;
          
          if (testCase.error) {
            content += `  - 错误: ${testCase.error}\n`;
          }
          
          if (testCase.scenarios && testCase.scenarios.length > 0) {
            testCase.scenarios.forEach(scenario => {
              const scenarioStatus = scenario.success ? '✅' : '❌';
              content += `    - ${scenarioStatus} ${scenario.scenario || scenario.action}`;
              if (scenario.error) {
                content += ` (${scenario.error})`;
              }
              content += `\n`;
            });
          }
          
          if (testCase.actions && testCase.actions.length > 0) {
            testCase.actions.forEach(action => {
              const actionStatus = action.success ? '✅' : '❌';
              content += `    - ${actionStatus} ${action.action}`;
              if (action.error) {
                content += ` (${action.error})`;
              }
              content += `\n`;
            });
          }
        });
      }
      
      content += `\n`;
    });
    
    // 关键问题
    if (summary.criticalIssues.length > 0) {
      content += `## 🚨 关键问题汇总\n\n`;
      summary.criticalIssues.forEach((issue, index) => {
        content += `### ${index + 1}. ${issue.category} - ${issue.testCase}\n\n`;
        content += `- **严重程度**: ${issue.severity}\n`;
        content += `- **错误信息**: ${issue.error || '未知错误'}\n\n`;
      });
    }
    
    return content;
  }

  /**
   * 生成CSV格式报告
   */
  async generateCsvReport(reportData, timestamp) {
    const filename = `comprehensive-test-report-${timestamp}.csv`;
    const filepath = path.join(this.reportDir, filename);
    
    const csvContent = this.generateCsvContent(reportData);
    fs.writeFileSync(filepath, csvContent);
    
    console.log(`   📊 CSV报告: ${filename}`);
    return { type: 'csv', filename, filepath };
  }

  /**
   * 生成CSV内容
   */
  generateCsvContent(reportData) {
    const { testResults } = reportData;
    
    let csvContent = 'Test Suite,Test Case,Status,Duration,Error,Category\n';
    
    testResults.forEach(result => {
      const testSuite = result.testSuite || 'Unknown';
      const duration = result.duration ? Math.round(result.duration / 1000) : 0;
      
      if (result.results && result.results.length > 0) {
        result.results.forEach(testCase => {
          const testCaseName = testCase.testCase || testCase.module || 'Unknown';
          const status = testCase.overallStatus || 'unknown';
          const error = testCase.error ? `"${testCase.error.replace(/"/g, '""')}"` : '';
          
          csvContent += `"${testSuite}","${testCaseName}","${status}",${duration},${error},"${testSuite}"\n`;
          
          // 添加子测试场景
          if (testCase.scenarios) {
            testCase.scenarios.forEach(scenario => {
              const scenarioName = scenario.scenario || scenario.action || 'Unknown Scenario';
              const scenarioStatus = scenario.success ? 'passed' : 'failed';
              const scenarioError = scenario.error ? `"${scenario.error.replace(/"/g, '""')}"` : '';
              
              csvContent += `"${testSuite}","${testCaseName} - ${scenarioName}","${scenarioStatus}",${duration},${scenarioError},"${testSuite}"\n`;
            });
          }
          
          // 添加子测试动作
          if (testCase.actions) {
            testCase.actions.forEach(action => {
              const actionName = action.action || 'Unknown Action';
              const actionStatus = action.success ? 'passed' : 'failed';
              const actionError = action.error ? `"${action.error.replace(/"/g, '""')}"` : '';
              
              csvContent += `"${testSuite}","${testCaseName} - ${actionName}","${actionStatus}",${duration},${actionError},"${testSuite}"\n`;
            });
          }
        });
      } else {
        // 如果没有详细结果，添加套件级别的记录
        const status = result.summary && result.summary.passed > 0 ? 'passed' : 'failed';
        csvContent += `"${testSuite}","${testSuite} Suite","${status}",${duration},,"${testSuite}"\n`;
      }
    });
    
    return csvContent;
  }

  /**
   * 生成报告索引
   */
  async generateReportIndex(reports, timestamp) {
    const indexFilename = 'test-reports-index.html';
    const indexFilepath = path.join(this.reportDir, indexFilename);
    
    const indexContent = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>测试报告索引</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .report-list { list-style: none; padding: 0; }
        .report-item { background: #f8f9fa; margin: 10px 0; padding: 20px; border-radius: 8px; border-left: 4px solid #007bff; }
        .report-item h3 { margin: 0 0 10px 0; color: #333; }
        .report-item p { margin: 5px 0; color: #666; }
        .report-link { display: inline-block; margin-top: 10px; padding: 8px 16px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; }
        .report-link:hover { background: #0056b3; }
        .timestamp { color: #888; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 测试报告索引</h1>
            <p class="timestamp">生成时间: ${new Date().toISOString()}</p>
        </div>
        
        <ul class="report-list">
            <li class="report-item">
                <h3>📊 HTML综合报告</h3>
                <p>包含完整的测试结果、图表和交互式界面</p>
                <a href="${reports.html.filename}" class="report-link" target="_blank">查看HTML报告</a>
            </li>
            
            <li class="report-item">
                <h3>📄 JSON数据报告</h3>
                <p>机器可读的完整测试数据，适合程序化处理</p>
                <a href="${reports.json.filename}" class="report-link" target="_blank">下载JSON报告</a>
            </li>
            
            <li class="report-item">
                <h3>📝 Markdown文档报告</h3>
                <p>适合文档化和版本控制的文本格式报告</p>
                <a href="${reports.markdown.filename}" class="report-link" target="_blank">查看Markdown报告</a>
            </li>
            
            <li class="report-item">
                <h3>📊 CSV数据报告</h3>
                <p>表格格式的测试数据，适合数据分析和导入</p>
                <a href="${reports.csv.filename}" class="report-link" target="_blank">下载CSV报告</a>
            </li>
        </ul>
        
        <div style="margin-top: 30px; padding: 20px; background: #e9ecef; border-radius: 8px;">
            <h3>📁 报告文件位置</h3>
            <p><strong>报告目录:</strong> ${this.reportDir}</p>
            <p><strong>截图目录:</strong> ${this.screenshotDir}</p>
        </div>
    </div>
</body>
</html>
    `;
    
    fs.writeFileSync(indexFilepath, indexContent);
    console.log(`   🗂️ 报告索引: ${indexFilename}`);
    
    return { filename: indexFilename, filepath: indexFilepath };
  }

  /**
   * 清理旧报告
   * @param {number} daysToKeep - 保留天数
   */
  async cleanupOldReports(daysToKeep = 7) {
    console.log(`\n🧹 清理${daysToKeep}天前的旧报告...`);
    
    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    let deletedCount = 0;
    
    try {
      const files = fs.readdirSync(this.reportDir);
      
      for (const file of files) {
        const filepath = path.join(this.reportDir, file);
        const stats = fs.statSync(filepath);
        
        if (stats.isFile() && stats.mtime.getTime() < cutoffTime) {
          fs.unlinkSync(filepath);
          deletedCount++;
          console.log(`   🗑️ 已删除: ${file}`);
        }
      }
      
      // 清理截图目录
      if (fs.existsSync(this.screenshotDir)) {
        const screenshots = fs.readdirSync(this.screenshotDir);
        
        for (const screenshot of screenshots) {
          const screenshotPath = path.join(this.screenshotDir, screenshot);
          const stats = fs.statSync(screenshotPath);
          
          if (stats.isFile() && stats.mtime.getTime() < cutoffTime) {
            fs.unlinkSync(screenshotPath);
            deletedCount++;
            console.log(`   🗑️ 已删除截图: ${screenshot}`);
          }
        }
      }
      
      console.log(`   ✅ 清理完成，共删除${deletedCount}个文件`);
    } catch (error) {
      console.error(`   ❌ 清理失败: ${error.message}`);
    }
  }

  /**
   * 生成测试趋势报告
   * @param {Array} historicalResults - 历史测试结果
   */
  async generateTrendReport(historicalResults) {
    console.log('\n📈 生成测试趋势报告...');
    
    const trendData = {
      metadata: {
        generatedAt: new Date().toISOString(),
        reportType: '测试趋势分析',
        dataPoints: historicalResults.length
      },
      trends: this.analyzeTrends(historicalResults),
      recommendations: this.generateTrendRecommendations(historicalResults)
    };
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `test-trend-report-${timestamp}.html`;
    const filepath = path.join(this.reportDir, filename);
    
    const htmlContent = this.generateTrendHtmlContent(trendData);
    fs.writeFileSync(filepath, htmlContent);
    
    console.log(`   ✅ 趋势报告已生成: ${filename}`);
    return { filename, filepath, data: trendData };
  }

  analyzeTrends(historicalResults) {
    // 分析测试趋势的逻辑
    const trends = {
      successRateTrend: [],
      performanceTrend: [],
      stabilityTrend: []
    };
    
    historicalResults.forEach((result, index) => {
      if (result.summary) {
        const successRate = result.summary.totalTests > 0 
          ? Math.round((result.summary.totalPassed / result.summary.totalTests) * 100)
          : 0;
        
        trends.successRateTrend.push({
          date: result.metadata?.generatedAt || new Date().toISOString(),
          value: successRate,
          index: index
        });
      }
    });
    
    return trends;
  }

  generateTrendRecommendations(historicalResults) {
    const recommendations = [];
    
    if (historicalResults.length >= 3) {
      const recentResults = historicalResults.slice(-3);
      const successRates = recentResults.map(r => 
        r.summary && r.summary.totalTests > 0 
          ? Math.round((r.summary.totalPassed / r.summary.totalTests) * 100)
          : 0
      );
      
      const isDecreasing = successRates.every((rate, index) => 
        index === 0 || rate <= successRates[index - 1]
      );
      
      if (isDecreasing) {
        recommendations.push({
          type: 'trend',
          title: '测试成功率呈下降趋势',
          description: '最近3次测试的成功率持续下降，建议检查代码质量和测试稳定性',
          priority: 'high'
        });
      }
    }
    
    return recommendations;
  }

  generateTrendHtmlContent(trendData) {
    // 生成趋势报告的HTML内容
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>测试趋势分析报告</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .chart-container { margin: 30px 0; }
        .chart-wrapper { position: relative; height: 400px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📈 测试趋势分析报告</h1>
            <p>生成时间: ${trendData.metadata.generatedAt}</p>
            <p>数据点数量: ${trendData.metadata.dataPoints}</p>
        </div>
        
        <div class="chart-container">
            <h2>成功率趋势</h2>
            <div class="chart-wrapper">
                <canvas id="successRateChart"></canvas>
            </div>
        </div>
        
        ${trendData.recommendations.length > 0 ? `
        <div style="margin-top: 30px;">
            <h2>💡 趋势建议</h2>
            ${trendData.recommendations.map(rec => `
                <div style="padding: 15px; margin: 10px 0; border-left: 4px solid #f39c12; background: #fff3cd; border-radius: 0 8px 8px 0;">
                    <h4>${rec.title}</h4>
                    <p>${rec.description}</p>
                </div>
            `).join('')}
        </div>
        ` : ''}
    </div>
    
    <script>
        const ctx = document.getElementById('successRateChart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ${JSON.stringify(trendData.trends.successRateTrend.map(t => new Date(t.date).toLocaleDateString()))},
                datasets: [{
                    label: '成功率 (%)',
                    data: ${JSON.stringify(trendData.trends.successRateTrend.map(t => t.value))},
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    </script>
</body>
</html>
    `;
  }
}

module.exports = { TestReportGenerator };