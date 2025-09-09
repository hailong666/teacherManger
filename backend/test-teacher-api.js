const axios = require('axios');
require('dotenv').config();

async function testTeacherAPI() {
  try {
    console.log('开始测试教师API...');
    
    // 首先登录获取token
    console.log('\n1. 登录获取token...');
    const loginResponse = await axios.post('http://localhost:3002/api/auth/login', {
      username: 'admin',
      password: '123456'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ 登录成功，获取到token');
    
    // 测试获取所有用户（包含教师）
    console.log('\n2. 测试获取所有用户...');
    const allUsersResponse = await axios.get('http://localhost:3002/api/users', {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: {
        limit: 100
      }
    });
    
    console.log('所有用户API响应状态:', allUsersResponse.status);
    console.log('用户总数:', allUsersResponse.data.data?.total || 0);
    
    // 测试获取教师用户
    console.log('\n3. 测试获取教师用户...');
    const teachersResponse = await axios.get('http://localhost:3002/api/users', {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: {
        role: 'teacher',
        limit: 100
      }
    });
    
    console.log('教师API响应状态:', teachersResponse.status);
    console.log('教师用户数据:');
    console.table(teachersResponse.data.data?.users || []);
    
    // 测试获取班级列表
    console.log('\n4. 测试获取班级列表...');
    const classesResponse = await axios.get('http://localhost:3002/api/classes', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('班级API响应状态:', classesResponse.status);
    console.log('班级数据:');
    console.table(classesResponse.data.classes || []);
    
  } catch (error) {
    console.error('测试失败:', error.response?.data || error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

testTeacherAPI();