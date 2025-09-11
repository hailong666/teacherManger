<template>
  <div class="layout-container">
    <!-- 侧边栏 -->
    <el-aside width="auto" class="sidebar-container">
      <div class="logo-container">
        <h1 class="logo-title">语文教学管理系统</h1>
      </div>
      <el-menu
        :default-active="activeMenu"
        class="sidebar-menu"
        :collapse="isCollapse"
        router
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
      >
        <el-menu-item index="/dashboard">
          <el-icon><Odometer /></el-icon>
          <template #title>首页</template>
        </el-menu-item>
        
        <!-- 教师专用菜单 -->
        <template v-if="userStore.hasRole('teacher') || userStore.hasRole('admin')">
          <el-menu-item index="/attendance">
            <el-icon><Calendar /></el-icon>
            <template #title>学生签到</template>
          </el-menu-item>
          <el-menu-item index="/whiteboard-attendance">
            <el-icon><Edit /></el-icon>
            <template #title>希沃白板签到</template>
          </el-menu-item>
        </template>
        
        <!-- 学生专用菜单 -->
        <template v-if="userStore.hasRole('student')">
          <el-menu-item index="/student-attendance">
            <el-icon><Calendar /></el-icon>
            <template #title>我的签到</template>
          </el-menu-item>
        </template>
        
        <el-menu-item index="/recitation">
          <el-icon><Microphone /></el-icon>
          <template #title>背诵打卡</template>
        </el-menu-item>
        
        <!-- 教师和管理员专用菜单 -->
        <template v-if="userStore.hasRole('teacher') || userStore.hasRole('admin')">
          <el-menu-item index="/article-stats">
            <el-icon><DataAnalysis /></el-icon>
            <template #title>课文统计</template>
          </el-menu-item>
        </template>
        
        <!-- 教师专用菜单 -->
        <template v-if="userStore.hasRole('teacher') || userStore.hasRole('admin')">
          <el-menu-item index="/random-call">
            <el-icon><User /></el-icon>
            <template #title>随机点名</template>
          </el-menu-item>
        </template>
        
        <el-menu-item index="/points">
          <el-icon><Star /></el-icon>
          <template #title>班级积分</template>
        </el-menu-item>
        <el-menu-item index="/homework">
          <el-icon><Document /></el-icon>
          <template #title>电子作业</template>
        </el-menu-item>
        <el-menu-item index="/profile">
          <el-icon><User /></el-icon>
          <template #title>个人中心</template>
        </el-menu-item>
        
        <!-- 管理员专用菜单 -->
        <template v-if="userStore.hasRole('admin')">
          <el-menu-item index="/class-management">
            <el-icon><School /></el-icon>
            <template #title>班级管理</template>
          </el-menu-item>
          <el-menu-item index="/user-management">
            <el-icon><User /></el-icon>
            <template #title>用户管理</template>
          </el-menu-item>
          <el-menu-item index="/role-management">
            <el-icon><Setting /></el-icon>
            <template #title>角色管理</template>
          </el-menu-item>
          <el-menu-item index="/article-management">
            <el-icon><Edit /></el-icon>
            <template #title>课文管理</template>
          </el-menu-item>
        </template>
        
        <!-- 角色测试页面 - 所有用户可访问 -->
        <el-menu-item index="/role-test">
          <el-icon><Setting /></el-icon>
          <template #title>角色测试</template>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <!-- 主要内容区 -->
    <el-container class="main-container">
      <!-- 顶部导航栏 -->
      <el-header class="header">
        <div class="header-left">
          <el-icon class="toggle-sidebar" @click="toggleSidebar">
            <Fold v-if="!isCollapse" />
            <Expand v-else />
          </el-icon>
        </div>
        <div class="header-right">
          <el-dropdown trigger="click">
            <span class="user-dropdown">
              <el-avatar :size="32" src="https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png" />
              <span class="username">{{ userStore.userInfo?.real_name || userStore.userInfo?.name || '用户' }}</span>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="navigateTo('/profile')">
                  <el-icon><User /></el-icon>个人中心
                </el-dropdown-item>
                <el-dropdown-item divided @click="handleLogout">
                  <el-icon><SwitchButton /></el-icon>退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <!-- 内容区 -->
      <el-main class="main-content">
        <router-view />
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { logout } from '@/api/user'
import { useUserStore } from '@/stores/user'
import { Setting, School, Edit, DataAnalysis } from '@element-plus/icons-vue'

// 路由实例
const route = useRoute()
const router = useRouter()

// 用户store
const userStore = useUserStore()

// 侧边栏折叠状态
const isCollapse = ref(false)

// 切换侧边栏折叠状态
const toggleSidebar = () => {
  isCollapse.value = !isCollapse.value
}

// 当前激活的菜单
const activeMenu = computed(() => {
  return '/' + route.path.split('/')[1]
})

// 导航到指定路由
const navigateTo = (path) => {
  router.push(path)
}

// 处理登出
const handleLogout = () => {
  ElMessageBox.confirm('确定要退出登录吗?', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await logout()
      userStore.logout()
      router.push('/login')
    } catch (error) {
      console.error('登出失败:', error)
      // 即使API调用失败，也要清除本地状态
      userStore.logout()
      router.push('/login')
    }
  }).catch(() => {})
}

// 组件挂载时获取用户信息
onMounted(async () => {
  if (userStore.token && !userStore.userInfo) {
    try {
      await userStore.getUserInfo()
    } catch (error) {
      console.error('获取用户信息失败:', error)
      // 如果获取用户信息失败，可能token已过期，跳转到登录页
      userStore.logout()
      router.push('/login')
    }
  }
})
</script>

<style scoped>
.layout-container {
  height: 100vh;
  display: flex;
}

/* 侧边栏样式 */
.sidebar-container {
  background-color: #304156;
  transition: width 0.3s;
  overflow-x: hidden;
}

.logo-container {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #2b3649;
}

.logo-title {
  color: #fff;
  font-size: 16px;
  margin: 0;
  white-space: nowrap;
}

.sidebar-menu {
  border-right: none;
}

/* 主容器样式 */
.main-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 头部样式 */
.header {
  background-color: #fff;
  border-bottom: 1px solid #e6e6e6;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}

.toggle-sidebar {
  font-size: 20px;
  cursor: pointer;
}

.user-dropdown {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.username {
  margin-left: 8px;
}

/* 主内容区样式 */
.main-content {
  padding: 20px;
  overflow-y: auto;
  background-color: #f0f2f5;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .sidebar-container {
    position: fixed;
    z-index: 1001;
    height: 100%;
  }
  
  .main-container {
    margin-left: 0;
  }
}
</style>