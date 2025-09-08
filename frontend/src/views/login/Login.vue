<template>
  <div class="login-container">
    <div class="login-box">
      <div class="login-title">
        <h2>语文教学管理系统</h2>
      </div>
      <el-form :model="loginForm" :rules="loginRules" ref="loginFormRef" class="login-form">
        <el-form-item prop="username">
          <el-input v-model="loginForm.username" placeholder="用户名" prefix-icon="el-icon-user"></el-input>
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="loginForm.password" type="password" placeholder="密码" prefix-icon="el-icon-lock" @keyup.enter="handleLogin"></el-input>
        </el-form-item>
        <el-form-item>
          <el-button :loading="loading" type="primary" class="login-button" @click="handleLogin">登录</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { login } from '@/api/user'

// 路由实例
const router = useRouter()
const route = useRoute()

// 表单引用
const loginFormRef = ref(null)

// 加载状态
const loading = ref(false)

// 登录表单数据
const loginForm = reactive({
  username: '',
  password: ''
})

// 表单验证规则
const loginRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '长度在 3 到 20 个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '长度在 6 到 20 个字符', trigger: 'blur' }
  ]
}

// 处理登录
const handleLogin = () => {
  loginFormRef.value.validate(valid => {
    if (valid) {
      loading.value = true
      
      // 调用实际的登录API
      login(loginForm).then(response => {
        // 保存token到本地存储
        localStorage.setItem('teacher-manager-token', response.token)
        
        // 登录成功提示
        ElMessage.success('登录成功')
        
        // 跳转到首页或者重定向页面
        const redirect = route.query.redirect || '/'
        router.push(redirect)
      }).catch(error => {
        // 登录失败提示
        ElMessage.error(error.response?.data?.message || '登录失败，请检查用户名和密码')
      }).finally(() => {
        loading.value = false
      })
    }
  })
}
</script>

<style scoped>
.login-container {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f3f3f3;
  background-image: linear-gradient(120deg, #e0c3fc 0%, #8ec5fc 100%);
}

.login-box {
  width: 400px;
  padding: 30px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.login-title {
  text-align: center;
  margin-bottom: 30px;
}

.login-title h2 {
  font-weight: 500;
  color: #303133;
}

.login-form {
  margin-top: 20px;
}

.login-button {
  width: 100%;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .login-box {
    width: 90%;
    max-width: 400px;
    padding: 20px;
  }
}
</style>