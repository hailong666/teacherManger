import { defineStore } from 'pinia'
import { login, getUserInfo } from '@/api/user'
import { removeToken, setToken, getToken } from '@/utils/auth'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: getToken(),
    userInfo: null,
    roles: [],
    permissions: []
  }),

  getters: {
    isLoggedIn: (state) => !!state.token,
    user: (state) => state.userInfo,
    hasRole: (state) => (role) => {
      if (state.userInfo?.role?.name) {
        return state.userInfo.role.name === role
      }
      return state.roles.includes(role)
    },
    hasPermission: (state) => (permission) => {
      return state.permissions.some(p => p.name === permission)
    },
    userRole: (state) => {
      return state.userInfo?.role?.name || (state.roles.length > 0 ? state.roles[0] : null)
    }
  },

  actions: {
    // 用户登录
    async login(loginForm) {
      try {
        const response = await login(loginForm)
        console.log('Login response:', response)
        
        // 根据实际API响应结构调整
        // 由于响应拦截器已经返回了response.data，所以直接使用response
        const token = response.token
        const user = response.user
        
        if (!token) {
          throw new Error('登录响应中缺少token')
        }
        
        this.token = token
        this.userInfo = user
        this.roles = user?.role ? [user.role.name || user.role] : []
        this.permissions = user?.role?.permissions || []
        
        setToken(token)
        return response
      } catch (error) {
        console.error('Login error:', error)
        throw error
      }
    },

    // 获取用户信息
    async getUserInfo() {
      try {
        const response = await getUserInfo()
        console.log('GetUserInfo response:', response)
        
        // 根据实际API响应结构调整
        const user = response.user || response.data?.user || response.data || response
        
        if (!user) {
          throw new Error('获取用户信息响应格式错误')
        }
        
        this.userInfo = user
        this.roles = user?.role ? [user.role.name || user.role] : []
        this.permissions = user?.role?.permissions || []
        
        return user
      } catch (error) {
        console.error('GetUserInfo error:', error)
        throw error
      }
    },

    // 用户登出
    logout() {
      this.token = null
      this.userInfo = null
      this.roles = []
      this.permissions = []
      removeToken()
    },

    // 重置状态
    resetState() {
      this.token = null
      this.userInfo = null
      this.roles = []
      this.permissions = []
    }
  }
})