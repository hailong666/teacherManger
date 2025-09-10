import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

// 路由配置
const routes = [
  {
    path: '/',
    name: 'Layout',
    component: () => import('../views/layout/Layout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('../views/dashboard/Dashboard.vue'),
        meta: { title: '首页', icon: 'dashboard', requiresAuth: true }
      },
      {
        path: 'attendance',
        name: 'Attendance',
        component: () => import('../views/attendance/Attendance.vue'),
        meta: { title: '学生签到', icon: 'calendar', requiresAuth: true, roles: ['teacher', 'admin'] }
      },
      {
        path: 'student-attendance',
        name: 'StudentAttendance',
        component: () => import('../views/student/StudentAttendance.vue'),
        meta: { title: '我的签到', icon: 'calendar', requiresAuth: true, roles: ['student'] }
      },
      {
        path: 'recitation',
        name: 'Recitation',
        component: () => import('../views/recitation/Recitation.vue'),
        meta: { title: '背诵打卡', icon: 'microphone', requiresAuth: true }
      },
      {
        path: 'random-call',
        name: 'RandomCall',
        component: () => import('../views/random-call/RandomCall.vue'),
        meta: { title: '随机点名', icon: 'user', requiresAuth: true }
      },
      {
        path: 'points',
        name: 'Points',
        component: () => import('../views/points/Points.vue'),
        meta: { title: '班级积分', icon: 'star', requiresAuth: true }
      },
      {
        path: 'homework',
        name: 'Homework',
        component: () => import('../views/homework/Homework.vue'),
        meta: { title: '电子作业', icon: 'document', requiresAuth: true }
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('../views/profile/Profile.vue'),
        meta: { title: '个人中心', icon: 'user', requiresAuth: true }
      },
      {
        path: 'role-test',
        name: 'RoleTest',
        component: () => import('../views/test/RoleTest.vue'),
        meta: { title: '角色测试', icon: 'user', requiresAuth: true }
      },
      {
        path: 'class-management',
        name: 'ClassManagement',
        component: () => import('../views/class/ClassManagement.vue'),
        meta: { title: '班级管理', icon: 'school', requiresAuth: true, roles: ['admin'] }
      },
      {
        path: 'user-management',
        name: 'UserManagement',
        component: () => import('../views/admin/UserManagement.vue'),
        meta: { title: '用户管理', icon: 'user', requiresAuth: true, roles: ['admin'] }
      },
      {
        path: 'role-management',
        name: 'RoleManagement',
        component: () => import('../views/admin/RoleManagement.vue'),
        meta: { title: '角色管理', icon: 'setting', requiresAuth: true, roles: ['admin'] }
      },
      {
        path: 'article-management',
        name: 'ArticleManagement',
        component: () => import('../views/admin/ArticleManagement.vue'),
        meta: { title: '课文管理', icon: 'edit', requiresAuth: true, roles: ['admin'] }
      },
      {
        path: 'article-stats',
        name: 'ArticleStats',
        component: () => import('../views/recitation/ArticleStats.vue'),
        meta: { title: '课文统计', icon: 'data-analysis', requiresAuth: true, roles: ['teacher', 'admin'] }
      },
      {
        path: 'whiteboard-attendance',
        name: 'WhiteboardAttendance',
        component: () => import('../views/attendance/WhiteboardAttendance.vue'),
        meta: { title: '希沃白板签到', icon: 'edit', requiresAuth: true, roles: ['teacher', 'admin'] }
      }
    ]
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/login/Login.vue'),
    meta: { title: '登录', requiresAuth: false }
  },
  {
    path: '/attendance/scan/:sessionId',
    name: 'AttendanceScan',
    component: () => import('../views/attendance/AttendanceScan.vue'),
    meta: { title: '学生签到', requiresAuth: true }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../views/error/NotFound.vue'),
    meta: { title: '404', requiresAuth: false }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 全局前置守卫
router.beforeEach(async (to, from, next) => {
  // 设置页面标题
  document.title = to.meta.title ? `${to.meta.title} - 语文教学管理系统` : '语文教学管理系统'
  
  // 权限验证
  if (to.meta.requiresAuth) {
    const userStore = useUserStore()
    
    if (!userStore.token) {
      next({ name: 'Login', query: { redirect: to.fullPath } })
      return
    }
    
    // 如果没有用户信息，尝试获取
    if (!userStore.userInfo) {
      try {
        console.log('尝试获取用户信息...')
        await userStore.getUserInfo()
        console.log('用户信息获取成功:', userStore.userInfo)
      } catch (error) {
        console.error('获取用户信息失败:', error)
        // 如果获取用户信息失败，但有token，可能是API问题，暂时跳过
        if (userStore.token) {
          console.warn('有token但获取用户信息失败，继续导航')
          next()
          return
        }
        userStore.logout()
        next({ name: 'Login', query: { redirect: to.fullPath } })
        return
      }
    }
    
    // 检查角色权限
    if (to.meta.roles && to.meta.roles.length > 0) {
      const hasPermission = to.meta.roles.some(role => userStore.hasRole(role))
      if (!hasPermission) {
        // 没有权限，重定向到首页
        next({ name: 'Dashboard' })
        return
      }
    }
    
    next()
  } else {
    next()
  }
})

export default router