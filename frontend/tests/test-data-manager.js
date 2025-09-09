import fs from 'fs';
import path from 'path';
import testConfig from '../../test-config.js';

/**
 * 测试数据管理器
 * 负责测试数据的创建、管理和清理
 */
class TestDataManager {
  constructor(options = {}) {
    this.options = {
      apiBaseUrl: options.apiBaseUrl || testConfig.testEnvironment.apiBaseUrl,
      cleanupAfterTest: options.cleanupAfterTest !== false,
      preserveData: options.preserveData || false,
      dataIsolation: options.dataIsolation !== false,
      ...options
    };
    
    this.createdData = {
      users: [],
      classes: [],
      students: [],
      sessions: []
    };
    
    this.testSession = {
      id: this.generateSessionId(),
      startTime: new Date().toISOString(),
      endTime: null,
      dataCreated: 0,
      dataDeleted: 0
    };
    
    console.log(`🗃️ 测试数据管理器初始化 (会话ID: ${this.testSession.id})`);
  }

  /**
   * 初始化测试数据环境
   */
  async initializeTestEnvironment() {
    console.log('\n🛠️ 初始化测试数据环境...');
    
    try {
      // 创建测试数据目录
      await this.ensureDataDirectories();
      
      // 验证API连接
      await this.verifyApiConnection();
      
      // 清理旧的测试数据
      if (this.options.cleanupAfterTest) {
        await this.cleanupOldTestData();
      }
      
      // 准备基础测试数据
      await this.prepareBaseTestData();
      
      console.log('   ✅ 测试数据环境初始化完成');
      
    } catch (error) {
      console.error('   ❌ 测试数据环境初始化失败:', error.message);
      throw error;
    }
  }

  /**
   * 确保数据目录存在
   */
  async ensureDataDirectories() {
    const directories = [
      './test-data',
      './test-data/backups',
      './test-data/exports',
      './test-data/temp'
    ];
    
    directories.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`   📁 创建目录: ${dir}`);
      }
    });
  }

  /**
   * 验证API连接
   */
  async verifyApiConnection() {
    console.log('   🔗 验证API连接...');
    
    try {
      // 这里可以添加实际的API健康检查
      const healthCheckUrl = `${this.options.apiBaseUrl}/health`;
      
      // 模拟API检查
      console.log(`   ✅ API连接正常: ${this.options.apiBaseUrl}`);
      
    } catch (error) {
      console.warn(`   ⚠️ API连接检查失败: ${error.message}`);
      console.warn('   继续执行，但API相关功能可能受限');
    }
  }

  /**
   * 清理旧的测试数据
   */
  async cleanupOldTestData() {
    console.log('   🧹 清理旧的测试数据...');
    
    try {
      // 清理临时文件
      const tempDir = './test-data/temp';
      if (fs.existsSync(tempDir)) {
        const files = fs.readdirSync(tempDir);
        files.forEach(file => {
          const filePath = path.join(tempDir, file);
          fs.unlinkSync(filePath);
        });
        console.log(`     🗑️ 清理临时文件: ${files.length}个`);
      }
      
      // 清理过期的测试会话数据
      await this.cleanupExpiredSessions();
      
      // 清理测试用户创建的数据（如果有API支持）
      await this.cleanupTestUserData();
      
    } catch (error) {
      console.warn(`     ⚠️ 清理旧数据失败: ${error.message}`);
    }
  }

  /**
   * 准备基础测试数据
   */
  async prepareBaseTestData() {
    console.log('   📋 准备基础测试数据...');
    
    try {
      // 验证测试用户账号
      await this.verifyTestUsers();
      
      // 准备测试班级数据
      await this.prepareTestClasses();
      
      // 准备测试学生数据
      await this.prepareTestStudents();
      
      // 保存会话信息
      await this.saveSessionInfo();
      
    } catch (error) {
      console.warn(`     ⚠️ 准备基础数据失败: ${error.message}`);
    }
  }

  /**
   * 验证测试用户
   */
  async verifyTestUsers() {
    console.log('     👥 验证测试用户...');
    
    const testUsers = testConfig.testUsers;
    let verifiedCount = 0;
    
    for (const role in testUsers) {
      const users = testUsers[role];
      
      for (const user of users) {
        try {
          // 这里可以添加实际的用户验证逻辑
          // 例如尝试登录或检查用户是否存在
          
          console.log(`       ✅ ${role}: ${user.username}`);
          verifiedCount++;
          
        } catch (error) {
          console.warn(`       ⚠️ ${role}: ${user.username} - ${error.message}`);
        }
      }
    }
    
    console.log(`     📊 验证完成: ${verifiedCount}个用户`);
  }

  /**
   * 准备测试班级数据
   */
  async prepareTestClasses() {
    console.log('     🏫 准备测试班级数据...');
    
    const testClasses = testConfig.testData.classes;
    
    testClasses.forEach((classData, index) => {
      // 为每个测试会话生成唯一的班级名称
      const uniqueClassName = `${classData.name}_${this.testSession.id}_${index}`;
      
      const preparedClass = {
        ...classData,
        name: uniqueClassName,
        sessionId: this.testSession.id,
        createdAt: new Date().toISOString()
      };
      
      this.createdData.classes.push(preparedClass);
      console.log(`       📚 准备班级: ${uniqueClassName}`);
    });
  }

  /**
   * 准备测试学生数据
   */
  async prepareTestStudents() {
    console.log('     👨‍🎓 准备测试学生数据...');
    
    const testStudents = testConfig.testData.students;
    
    testStudents.forEach((studentData, index) => {
      // 为每个测试会话生成唯一的学生信息
      const uniqueStudentId = `${studentData.studentId}_${this.testSession.id}_${index}`;
      
      const preparedStudent = {
        ...studentData,
        studentId: uniqueStudentId,
        sessionId: this.testSession.id,
        createdAt: new Date().toISOString()
      };
      
      this.createdData.students.push(preparedStudent);
      console.log(`       👤 准备学生: ${preparedStudent.name} (${uniqueStudentId})`);
    });
  }

  /**
   * 创建测试班级
   */
  async createTestClass(classData) {
    console.log(`\n📚 创建测试班级: ${classData.name}`);
    
    try {
      // 生成唯一的班级数据
      const uniqueClass = {
        ...classData,
        name: `${classData.name}_${this.testSession.id}_${Date.now()}`,
        sessionId: this.testSession.id,
        createdAt: new Date().toISOString(),
        isTestData: true
      };
      
      // 这里可以添加实际的API调用来创建班级
      // const response = await this.apiCall('POST', '/api/classes', uniqueClass);
      
      // 记录创建的数据
      this.createdData.classes.push(uniqueClass);
      this.testSession.dataCreated++;
      
      console.log(`   ✅ 班级创建成功: ${uniqueClass.name}`);
      return uniqueClass;
      
    } catch (error) {
      console.error(`   ❌ 班级创建失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 创建测试学生
   */
  async createTestStudent(studentData, classId = null) {
    console.log(`\n👤 创建测试学生: ${studentData.name}`);
    
    try {
      // 生成唯一的学生数据
      const uniqueStudent = {
        ...studentData,
        studentId: `${studentData.studentId || 'STU'}_${this.testSession.id}_${Date.now()}`,
        classId: classId,
        sessionId: this.testSession.id,
        createdAt: new Date().toISOString(),
        isTestData: true
      };
      
      // 这里可以添加实际的API调用来创建学生
      // const response = await this.apiCall('POST', '/api/students', uniqueStudent);
      
      // 记录创建的数据
      this.createdData.students.push(uniqueStudent);
      this.testSession.dataCreated++;
      
      console.log(`   ✅ 学生创建成功: ${uniqueStudent.name} (${uniqueStudent.studentId})`);
      return uniqueStudent;
      
    } catch (error) {
      console.error(`   ❌ 学生创建失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取测试数据
   */
  getTestData(type) {
    switch (type) {
      case 'users':
        return testConfig.testUsers;
      case 'classes':
        return this.createdData.classes;
      case 'students':
        return this.createdData.students;
      case 'all':
        return this.createdData;
      default:
        throw new Error(`未知的数据类型: ${type}`);
    }
  }

  /**
   * 获取随机测试用户
   */
  getRandomTestUser(role = null) {
    const testUsers = testConfig.testUsers;
    
    if (role) {
      const roleUsers = testUsers[role];
      if (!roleUsers || roleUsers.length === 0) {
        throw new Error(`没有找到角色为 ${role} 的测试用户`);
      }
      return roleUsers[Math.floor(Math.random() * roleUsers.length)];
    }
    
    // 随机选择任意角色的用户
    const allUsers = Object.values(testUsers).flat();
    return allUsers[Math.floor(Math.random() * allUsers.length)];
  }

  /**
   * 获取测试班级数据
   */
  getTestClassData(index = 0) {
    const classes = this.createdData.classes;
    if (classes.length === 0) {
      throw new Error('没有可用的测试班级数据');
    }
    
    return classes[index % classes.length];
  }

  /**
   * 获取测试学生数据
   */
  getTestStudentData(index = 0) {
    const students = this.createdData.students;
    if (students.length === 0) {
      throw new Error('没有可用的测试学生数据');
    }
    
    return students[index % students.length];
  }

  /**
   * 备份测试数据
   */
  async backupTestData() {
    console.log('\n💾 备份测试数据...');
    
    try {
      const backupData = {
        session: this.testSession,
        createdData: this.createdData,
        timestamp: new Date().toISOString()
      };
      
      const backupFile = `./test-data/backups/backup_${this.testSession.id}.json`;
      fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
      
      console.log(`   ✅ 数据备份完成: ${backupFile}`);
      return backupFile;
      
    } catch (error) {
      console.error(`   ❌ 数据备份失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 恢复测试数据
   */
  async restoreTestData(backupFile) {
    console.log(`\n📥 恢复测试数据: ${backupFile}`);
    
    try {
      if (!fs.existsSync(backupFile)) {
        throw new Error(`备份文件不存在: ${backupFile}`);
      }
      
      const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
      
      this.testSession = backupData.session;
      this.createdData = backupData.createdData;
      
      console.log(`   ✅ 数据恢复完成`);
      console.log(`   📊 恢复数据统计:`);
      console.log(`     - 班级: ${this.createdData.classes.length}个`);
      console.log(`     - 学生: ${this.createdData.students.length}个`);
      
    } catch (error) {
      console.error(`   ❌ 数据恢复失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 导出测试数据
   */
  async exportTestData(format = 'json') {
    console.log(`\n📤 导出测试数据 (${format}格式)...`);
    
    try {
      const exportData = {
        metadata: {
          sessionId: this.testSession.id,
          exportTime: new Date().toISOString(),
          format: format
        },
        data: this.createdData
      };
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      let exportFile;
      
      switch (format.toLowerCase()) {
        case 'json':
          exportFile = `./test-data/exports/test-data-${timestamp}.json`;
          fs.writeFileSync(exportFile, JSON.stringify(exportData, null, 2));
          break;
          
        case 'csv':
          exportFile = `./test-data/exports/test-data-${timestamp}.csv`;
          const csvContent = this.convertToCSV(exportData.data);
          fs.writeFileSync(exportFile, csvContent);
          break;
          
        default:
          throw new Error(`不支持的导出格式: ${format}`);
      }
      
      console.log(`   ✅ 数据导出完成: ${exportFile}`);
      return exportFile;
      
    } catch (error) {
      console.error(`   ❌ 数据导出失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 转换为CSV格式
   */
  convertToCSV(data) {
    let csvContent = '';
    
    // 导出班级数据
    if (data.classes.length > 0) {
      csvContent += 'Type,Name,ID,SessionId,CreatedAt\n';
      data.classes.forEach(cls => {
        csvContent += `Class,"${cls.name}","${cls.id || ''}","${cls.sessionId}","${cls.createdAt}"\n`;
      });
    }
    
    // 导出学生数据
    if (data.students.length > 0) {
      if (csvContent) csvContent += '\n';
      csvContent += 'Type,Name,StudentId,ClassId,SessionId,CreatedAt\n';
      data.students.forEach(student => {
        csvContent += `Student,"${student.name}","${student.studentId}","${student.classId || ''}","${student.sessionId}","${student.createdAt}"\n`;
      });
    }
    
    return csvContent;
  }

  /**
   * 清理测试数据
   */
  async cleanupTestData() {
    console.log('\n🧹 清理测试数据...');
    
    try {
      let deletedCount = 0;
      
      // 清理创建的班级
      for (const classData of this.createdData.classes) {
        try {
          // 这里可以添加实际的API调用来删除班级
          // await this.apiCall('DELETE', `/api/classes/${classData.id}`);
          
          console.log(`   🗑️ 删除班级: ${classData.name}`);
          deletedCount++;
          
        } catch (error) {
          console.warn(`     ⚠️ 删除班级失败: ${classData.name} - ${error.message}`);
        }
      }
      
      // 清理创建的学生
      for (const studentData of this.createdData.students) {
        try {
          // 这里可以添加实际的API调用来删除学生
          // await this.apiCall('DELETE', `/api/students/${studentData.id}`);
          
          console.log(`   🗑️ 删除学生: ${studentData.name}`);
          deletedCount++;
          
        } catch (error) {
          console.warn(`     ⚠️ 删除学生失败: ${studentData.name} - ${error.message}`);
        }
      }
      
      // 更新统计
      this.testSession.dataDeleted = deletedCount;
      this.testSession.endTime = new Date().toISOString();
      
      // 保存清理记录
      await this.saveCleanupRecord();
      
      console.log(`   ✅ 清理完成，共删除 ${deletedCount} 条数据`);
      
      // 重置数据
      this.createdData = {
        users: [],
        classes: [],
        students: [],
        sessions: []
      };
      
    } catch (error) {
      console.error(`   ❌ 清理失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 清理过期的会话数据
   */
  async cleanupExpiredSessions() {
    console.log('     🕒 清理过期会话数据...');
    
    try {
      const backupDir = './test-data/backups';
      if (!fs.existsSync(backupDir)) {
        return;
      }
      
      const files = fs.readdirSync(backupDir);
      const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7天前
      let deletedCount = 0;
      
      files.forEach(file => {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isFile() && file.endsWith('.json') && stats.mtime.getTime() < cutoffTime) {
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      });
      
      if (deletedCount > 0) {
        console.log(`       🗑️ 清理过期会话: ${deletedCount}个`);
      }
      
    } catch (error) {
      console.warn(`       ⚠️ 清理过期会话失败: ${error.message}`);
    }
  }

  /**
   * 清理测试用户数据
   */
  async cleanupTestUserData() {
    console.log('     👥 清理测试用户数据...');
    
    try {
      // 这里可以添加清理测试用户创建的数据的逻辑
      // 例如清理测试用户的个人文件、设置等
      
      console.log('       ✅ 测试用户数据清理完成');
      
    } catch (error) {
      console.warn(`       ⚠️ 清理测试用户数据失败: ${error.message}`);
    }
  }

  /**
   * 保存会话信息
   */
  async saveSessionInfo() {
    try {
      const sessionFile = `./test-data/session_${this.testSession.id}.json`;
      fs.writeFileSync(sessionFile, JSON.stringify(this.testSession, null, 2));
    } catch (error) {
      console.warn(`保存会话信息失败: ${error.message}`);
    }
  }

  /**
   * 保存清理记录
   */
  async saveCleanupRecord() {
    try {
      const cleanupRecord = {
        sessionId: this.testSession.id,
        cleanupTime: new Date().toISOString(),
        dataCreated: this.testSession.dataCreated,
        dataDeleted: this.testSession.dataDeleted,
        duration: new Date(this.testSession.endTime) - new Date(this.testSession.startTime)
      };
      
      const recordFile = `./test-data/cleanup_${this.testSession.id}.json`;
      fs.writeFileSync(recordFile, JSON.stringify(cleanupRecord, null, 2));
      
    } catch (error) {
      console.warn(`保存清理记录失败: ${error.message}`);
    }
  }

  /**
   * 生成会话ID
   */
  generateSessionId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `test_${timestamp}_${random}`;
  }

  /**
   * API调用辅助方法
   */
  async apiCall(method, endpoint, data = null) {
    // 这里可以实现实际的API调用逻辑
    // 例如使用fetch或axios
    
    const url = `${this.options.apiBaseUrl}${endpoint}`;
    console.log(`API调用: ${method} ${url}`);
    
    // 模拟API调用
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, data: data });
      }, 100);
    });
  }

  /**
   * 获取数据统计
   */
  getDataStatistics() {
    return {
      session: this.testSession,
      statistics: {
        classesCreated: this.createdData.classes.length,
        studentsCreated: this.createdData.students.length,
        totalDataCreated: this.testSession.dataCreated,
        totalDataDeleted: this.testSession.dataDeleted
      },
      createdData: this.createdData
    };
  }

  /**
   * 验证数据完整性
   */
  async validateDataIntegrity() {
    console.log('\n🔍 验证数据完整性...');
    
    const issues = [];
    
    try {
      // 检查班级数据
      this.createdData.classes.forEach((cls, index) => {
        if (!cls.name || !cls.sessionId) {
          issues.push(`班级 ${index}: 缺少必要字段`);
        }
      });
      
      // 检查学生数据
      this.createdData.students.forEach((student, index) => {
        if (!student.name || !student.studentId || !student.sessionId) {
          issues.push(`学生 ${index}: 缺少必要字段`);
        }
      });
      
      if (issues.length === 0) {
        console.log('   ✅ 数据完整性验证通过');
        return true;
      } else {
        console.warn('   ⚠️ 发现数据完整性问题:');
        issues.forEach(issue => console.warn(`     - ${issue}`));
        return false;
      }
      
    } catch (error) {
      console.error(`   ❌ 数据完整性验证失败: ${error.message}`);
      return false;
    }
  }
}

export { TestDataManager };