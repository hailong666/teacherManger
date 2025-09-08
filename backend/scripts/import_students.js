const { createConnection } = require('typeorm');
const User = require('../src/models/User');
const bcrypt = require('bcryptjs');
const dbConfig = require('../src/config/database');
require('dotenv').config();

// 学生数据
const studentsData = [
  { id: 1, name: '刘轩玮', gender: '男' },
  { id: 2, name: '滕紫瑜', gender: '男' },
  { id: 3, name: '陈禹汐', gender: '女' },
  { id: 4, name: '王艺潼', gender: '女' },
  { id: 5, name: '李佳怡', gender: '女' },
  { id: 6, name: '罗泽熹', gender: '男' },
  { id: 7, name: '郭梓鑫', gender: '男' },
  { id: 8, name: '孙琮傲', gender: '男' },
  { id: 9, name: '付莹滢', gender: '女' },
  { id: 10, name: '刘雨晴', gender: '女' },
  { id: 11, name: '张煜堃', gender: '男' },
  { id: 12, name: '金梦萱', gender: '女' },
  { id: 13, name: '魏伊姝', gender: '女' },
  { id: 14, name: '李佳隆', gender: '男' },
  { id: 15, name: '金子豪', gender: '男' },
  { id: 16, name: '石梓萱', gender: '女' },
  { id: 17, name: '刘石蕾', gender: '女' },
  { id: 18, name: '李兴', gender: '男' },
  { id: 19, name: '王梓銮', gender: '女' },
  { id: 20, name: '吴绮瑶', gender: '女' },
  { id: 21, name: '刘敬易', gender: '男' },
  { id: 22, name: '曹露予', gender: '女' },
  { id: 23, name: '张辰雨', gender: '女' },
  { id: 24, name: '沈逸轩', gender: '男' },
  { id: 25, name: '冯梓航', gender: '男' },
  { id: 26, name: '吕迪', gender: '女' },
  { id: 27, name: '周恒旭', gender: '男' },
  { id: 28, name: '郭玥希', gender: '女' },
  { id: 29, name: '朱棋枫', gender: '女' },
  { id: 30, name: '贾泽轩', gender: '男' },
  { id: 31, name: '李承旭', gender: '男' },
  { id: 32, name: '宋雨泽', gender: '男' },
  { id: 33, name: '于震灏', gender: '男' },
  { id: 34, name: '刘思琪', gender: '女' },
  { id: 35, name: '胡伦嘉', gender: '男' },
  { id: 36, name: '王娅琳', gender: '女' },
  { id: 37, name: '东雨萱', gender: '女' },
  { id: 38, name: '李欣怡', gender: '女' },
  { id: 39, name: '陈达尔汉', gender: '男' }
];

async function importStudents() {
  let connection;
  
  try {
    // 创建数据库连接
    connection = await createConnection({
      ...dbConfig,
      entities: [User],
      synchronize: false
    });

    const userRepository = connection.getRepository(User);
    
    console.log('开始导入学生数据...');
    
    const importedStudents = [];
    
    for (const studentData of studentsData) {
      try {
        // 生成用户名（学号格式：student + 学号）
        const username = `student${studentData.id.toString().padStart(2, '0')}`;
        
        // 检查用户是否已存在
        const existingUser = await userRepository.findOne({ 
          where: { username } 
        });
        
        if (existingUser) {
          console.log(`学生 ${studentData.name} (${username}) 已存在，跳过`);
          continue;
        }
        
        // 创建学生用户
        const student = userRepository.create({
          username: username,
          password: '123456', // 默认密码，会在beforeInsert钩子中自动加密
          name: studentData.name,
          role: 'student',
          status: 1
        });
        
        const savedStudent = await userRepository.save(student);
        importedStudents.push({
          id: savedStudent.id,
          username: savedStudent.username,
          name: savedStudent.name,
          studentNumber: studentData.id
        });
        
        console.log(`成功导入学生: ${studentData.name} (${username})`);
        
      } catch (error) {
        console.error(`导入学生 ${studentData.name} 失败:`, error.message);
      }
    }
    
    console.log(`\n导入完成！共成功导入 ${importedStudents.length} 名学生`);
    console.log('\n导入的学生列表:');
    console.table(importedStudents);
    
    console.log('\n默认登录信息:');
    console.log('用户名格式: student01, student02, ..., student39');
    console.log('默认密码: 123456');
    
  } catch (error) {
    console.error('导入学生数据失败:', error);
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  importStudents();
}

module.exports = { importStudents };