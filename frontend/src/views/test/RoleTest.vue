<template>
  <div class="role-test">
    <h2>角色权限测试页面</h2>
    
    <div class="user-info">
      <h3>当前用户信息</h3>
      <p><strong>用户名:</strong> {{ userStore.userInfo?.username || '未登录' }}</p>
      <p><strong>姓名:</strong> {{ userStore.userInfo?.real_name || userStore.userInfo?.name || '未登录' }}</p>
      <p><strong>角色:</strong> {{ userStore.userRole || '未登录' }}</p>
      <p><strong>权限:</strong> {{ userStore.permissions?.map(p => p.name).join(', ') || '无权限' }}</p>
      <p><strong>Token:</strong> {{ userStore.token ? '已设置' : '未设置' }}</p>
    </div>

    <div class="role-permissions">
      <h3>角色权限检查</h3>
      <p><strong>是否为学生:</strong> {{ userStore.hasRole('student') ? '是' : '否' }}</p>
      <p><strong>是否为教师:</strong> {{ userStore.hasRole('teacher') ? '是' : '否' }}</p>
      <p><strong>是否为管理员:</strong> {{ userStore.hasRole('admin') ? '是' : '否' }}</p>
    </div>

    <div class="menu-access">
      <h3>菜单访问权限</h3>
      <ul>
        <li>首页: 所有用户可访问</li>
        <li v-if="userStore.hasRole('student')">学生签到: 学生可访问 ✓</li>
        <li v-if="userStore.hasRole('teacher')">考勤管理: 教师可访问 ✓</li>
        <li v-if="userStore.hasRole('teacher')">背诵打卡: 教师可访问 ✓</li>
        <li v-if="userStore.hasRole('teacher')">积分管理: 教师可访问 ✓</li>
        <li v-if="userStore.hasRole('admin')">系统管理: 管理员可访问 ✓</li>
      </ul>
    </div>

    <div class="test-actions">
      <h3>测试操作</h3>
      <el-button @click="refreshUserInfo">刷新用户信息</el-button>
      <el-button @click="logout" type="danger">退出登录</el-button>
    </div>
  </div>
</template>

<script setup>
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'

const userStore = useUserStore()

const refreshUserInfo = async () => {
  try {
    await userStore.getUserInfo()
    ElMessage.success('用户信息刷新成功')
  } catch (error) {
    ElMessage.error('刷新用户信息失败: ' + error.message)
  }
}

const logout = () => {
  userStore.logout()
  ElMessage.success('已退出登录')
}
</script>

<style scoped>
.role-test {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.user-info,
.role-permissions,
.menu-access,
.test-actions {
  margin-bottom: 30px;
  padding: 20px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background-color: #f9f9f9;
}

h2 {
  color: #409eff;
  text-align: center;
  margin-bottom: 30px;
}

h3 {
  color: #606266;
  margin-bottom: 15px;
  border-bottom: 2px solid #409eff;
  padding-bottom: 5px;
}

p {
  margin: 10px 0;
  font-size: 14px;
}

ul {
  list-style-type: none;
  padding: 0;
}

li {
  padding: 8px 0;
  border-bottom: 1px solid #eee;
}

li:last-child {
  border-bottom: none;
}

.test-actions {
  text-align: center;
}
</style>