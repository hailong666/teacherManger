const axios = require('axios');
require('dotenv').config();

async function testTeacher1Articles() {
  try {
    console.log('测试teacher1的课文访问权限...');
    
    // 1. 登录teacher1
    console.log('\n1. 登录teacher1...');
    const loginResponse = await axios.post('http://localhost:3002/api/auth/login', {
      username: 'teacher1',
      password: '123456'
    });
    
    if (loginResponse.status !== 200) {
      console.error('登录失败:', loginResponse.status);
      return;
    }
    
    const token = loginResponse.data.token;
    const user = loginResponse.data.user;
    console.log('✅ 登录成功');
    console.log('用户信息:', {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role
    });
    
    // 2. 获取课文列表
    console.log('\n2. 获取课文列表...');
    const articlesResponse = await axios.get('http://localhost:3002/api/articles', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('课文API响应状态:', articlesResponse.status);
    console.log('课文数据:');
    
    if (articlesResponse.data.articles) {
      console.table(articlesResponse.data.articles.map(article => ({
        id: article.id,
        title: article.title,
        author: article.author,
        category: article.category,
        difficulty: article.difficulty_level,
        status: article.status
      })));
      
      console.log(`\n总共 ${articlesResponse.data.articles.length} 篇课文`);
    } else {
      console.log('没有课文数据');
    }
    
    // 3. 获取班级列表
    console.log('\n3. 获取班级列表...');
    const classesResponse = await axios.get('http://localhost:3002/api/classes', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('班级API响应状态:', classesResponse.status);
    if (classesResponse.data.classes) {
      console.table(classesResponse.data.classes.map(cls => ({
        id: cls.id,
        name: cls.name,
        teacherId: cls.teacherId,
        teacherName: cls.teacherName,
        currentStudents: cls.currentStudents
      })));
    }
    
    // 4. 获取背诵记录
    console.log('\n4. 获取背诵记录...');
    const recitationsResponse = await axios.get('http://localhost:3002/api/recitation', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('背诵记录API响应状态:', recitationsResponse.status);
    if (recitationsResponse.data.recitations) {
      console.log(`背诵记录数量: ${recitationsResponse.data.recitations.length}`);
      if (recitationsResponse.data.recitations.length > 0) {
        console.table(recitationsResponse.data.recitations.slice(0, 5).map(rec => ({
          id: rec.id,
          studentName: rec.studentName,
          className: rec.className,
          articleTitle: rec.article?.title || '自由背诵',
          status: rec.status
        })));
      }
    }
    
  } catch (error) {
    console.error('测试失败:', error.response?.data || error.message);
  }
}

// 运行测试
if (require.main === module) {
  testTeacher1Articles().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('执行失败:', error);
    process.exit(1);
  });
}

module.exports = { testTeacher1Articles };