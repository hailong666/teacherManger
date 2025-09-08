import { createRouter, createWebHistory } from 'vue-router'

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
        meta: { title: '学生签到', icon: 'calendar', requiresAuth: true }
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
router.beforeEach((to, from, next) => {
  // 设置页面标题
  document.title = to.meta.title ? `${to.meta.title} - 语文教学管理系统` : '语文教学管理系统'
  
  // 权限验证
  if (to.meta.requiresAuth) {
    const token = localStorage.getItem('teacher-manager-token')
    if (!token) {
      next({ name: 'Login', query: { redirect: to.fullPath } })
    } else {
      next()
    }
  } else {
    next()
  }
})

export default router