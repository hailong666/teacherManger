const { createConnection } = require('typeorm');
const User = require('../src/models/User');
const Class = require('../src/models/Class');
const dbConfig = require('../src/config/database');
require('dotenv').config();

// 高一(1)班学生数据
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

async function addStudentsToClass() {
  let connection;
  
  try {
    // 创建数据库连接
    connection = await createConnection({
      ...dbConfig,
      entities: [User, Class],
      synchronize: false
    });

    const userRepository = connection.getRepository(User);
    const classRepository = connection.getRepository(Class);
    
    console.log('开始将学生添加到高一(1)班...');
    
    // 查找高一(1)班
    const classEntity = await classRepository.findOne({
      where: { name: '高一(1)班' },
      relations: ['students', 'teacher']
    });
    
    if (!classEntity) {
      console.error('未找到高一(1)班');
      return;
    }
    
    console.log(`找到班级: ${classEntity.name} (ID: ${classEntity.id})`);
    
    // 查找所有学生
    const students = [];
    const notFoundStudents = [];
    
    for (const studentData of studentsData) {
      const username = `student${studentData.id.toString().padStart(2, '0')}`;
      const student = await userRepository.findOne({
        where: { username, role: 'student' }
      });
      
      if (student) {
        students.push(student);
        console.log(`找到学生: ${student.name} (${username})`);
      } else {
        notFoundStudents.push(studentData);
        console.log(`未找到学生: ${studentData.name} (${username})`);
      }
    }
    
    console.log(`\n共找到 ${students.length} 名学生`);
    if (notFoundStudents.length > 0) {
      console.log(`未找到 ${notFoundStudents.length} 名学生`);
    }
    
    // 过滤出尚未在班级中的学生
    const existingStudentIds = classEntity.students.map(s => s.id);
    const newStudents = students.filter(s => !existingStudentIds.includes(s.id));
    
    console.log(`\n班级中已有 ${existingStudentIds.length} 名学生`);
    console.log(`需要添加 ${newStudents.length} 名新学生`);
    
    if (newStudents.length > 0) {
      // 添加新学生到班级
      classEntity.students = [...classEntity.students, ...newStudents];
      await classRepository.save(classEntity);
      
      console.log('\n成功添加的学生:');
      newStudents.forEach(student => {
        console.log(`- ${student.name} (${student.username})`);
      });
    } else {
      console.log('\n所有学生都已在班级中，无需添加');
    }
    
    // 显示最终班级信息
    const updatedClass = await classRepository.findOne({
      where: { id: classEntity.id },
      relations: ['students', 'teacher']
    });
    
    console.log(`\n班级最终信息:`);
    console.log(`班级名称: ${updatedClass.name}`);
    console.log(`教师: ${updatedClass.teacher.name}`);
    console.log(`学生总数: ${updatedClass.students.length}`);
    
  } catch (error) {
    console.error('添加学生到班级失败:', error);
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  addStudentsToClass();
}

module.exports = { addStudentsToClass };