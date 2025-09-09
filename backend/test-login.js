const axios = require('axios');

async function testLogin() {
  try {
    console.log('测试登录API...');
    
    const response = await axios.post('http://localhost:3002/api/users/login', {
      username: 'admin',
      password: '123456'
    });
    
    console.log('登录成功!');
    console.log('响应数据:', JSON.stringify(response.data, null, 2));
    
    // 测试获取用户信息
    const token = response.data.token;
    const userInfoResponse = await axios.get('http://localhost:3002/api/users/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('\n获取用户信息成功!');
    console.log('用户信息:', JSON.stringify(userInfoResponse.data, null, 2));
    
  } catch (error) {
    console.error('测试失败:', error.response?.data || error.message);
  }
}

testLogin();