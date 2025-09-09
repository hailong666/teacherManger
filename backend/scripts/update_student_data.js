const { createConnection, getConnection } = require('typeorm');
const User = require('../src/models/User');
const config = require('../src/config/database');

// 学生姓名数据
const studentNames = [
  '张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十',
  '郑十一', '王十二', '冯十三', '陈十四', '褚十五', '卫十六', '蒋十七', '沈十八',
  '韩十九', '杨二十', '朱二十一', '秦二十二', '尤二十三', '许二十四', '何二十五', '吕二十六',
  '施二十七', '张二十八', '孔二十九', '曹三十', '严三十一', '华三十二', '金三十三', '魏三十四',
  '陶三十五', '姜三十六', '戚三十七', '谢三十八', '邹三十九', '喻四十', '柏四十一', '水四十二'
];

// 生成学号的函数
function generateStudentNumber(index, classId) {
  const year = '2024';
  const classNum = classId.toString().padStart(2, '0');
  const studentNum = (index + 1).toString().padStart(2, '0');
  return `${year}${classNum}${studentNum}`;
}

// 生成邮箱的函数
function generateEmail(name, studentNumber) {
  const pinyin = {
    '张': 'zhang', '李': 'li', '王': 'wang', '赵': 'zhao', '钱': 'qian',
    '孙': 'sun', '周': 'zhou', '吴': 'wu', '郑': 'zheng', '冯': 'feng',
    '陈': 'chen', '褚': 'chu', '卫': 'wei', '蒋': 'jiang', '沈': 'shen',
    '韩': 'han', '杨': 'yang', '朱': 'zhu', '秦': 'qin', '尤': 'you',
    '许': 'xu', '何': 'he', '吕': 'lv', '施': 'shi', '孔': 'kong',
    '曹': 'cao', '严': 'yan', '华': 'hua', '金': 'jin', '魏': 'wei',
    '陶': 'tao', '姜': 'jiang', '戚': 'qi', '谢': 'xie', '邹': 'zou',
    '喻': 'yu', '柏': 'bai', '水': 'shui'
  };
  
  const surname = name.charAt(0);
  const surnameEn = pinyin[surname] || 'student';
  return `${surnameEn}${studentNumber.slice(-2)}@student.edu.cn`;
}

async function updateStudentData() {
  try {
    console.log('开始更新学生数据...');
    
    // 创建数据库连接
    let connection;
    try {
      connection = getConnection();
    } catch (error) {
      console.log('创建新的数据库连接...');
      connection = await createConnection(config);
    }
    const userRepository = connection.getRepository(User);
    
    // 获取所有学生用户（role_id = 3）
    const students = await userRepository.find({
      where: { role_id: 3 },
      order: { id: 'ASC' }
    });
    
    console.log(`找到 ${students.length} 个学生记录`);
    
    // 更新每个学生的信息
    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      const nameIndex = i % studentNames.length;
      const name = studentNames[nameIndex];
      
      // 根据学生ID确定班级（简单分配：ID 2-22为班级1，23-43为班级2）
      const classId = student.id <= 22 ? 1 : 2;
      const classIndex = classId === 1 ? i : i - 21;
      
      const studentNumber = generateStudentNumber(classIndex, classId);
      const email = generateEmail(name, studentNumber);
      
      // 更新学生信息
      await userRepository.update(student.id, {
        name: name,
        student_id: studentNumber,
        email: email,
        avatar: null // 暂时设为null，后续可以添加默认头像
      });
      
      console.log(`更新学生 ID:${student.id} - ${name} (${studentNumber})`);
    }
    
    console.log('学生数据更新完成！');
    
  } catch (error) {
    console.error('更新学生数据失败:', error);
  }
}

module.exports = { updateStudentData };

// 如果直接运行此脚本
if (require.main === module) {
  updateStudentData().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error(error);
    process.exit(1);
  });
}