import { defineStore } from 'pinia'
import { login, getUserInfo } from '@/api/user'
import { removeToken, setToken, getToken } from '@/utils/auth'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: getToken(),
    userInfo: null,
    roles: []
  }),

  getters: {
    isLoggedIn: (state) => !!state.token,
    hasRole: (state) => (role) => state.roles.includes(role)
  },

  actions: {
    // 用户登录
    async login(loginForm) {
      try {
        const response = await login(loginForm)
        const { token, user } = response.data
        
        this.token = token
        this.userInfo = user
        this.roles = [user.role]
        
        setToken(token)
        return response
      } catch (error) {
        throw error
      }
    },

    // 获取用户信息
    async getUserInfo() {
      try {
        const response = await getUserInfo()
        const { user } = response.data
        
        this.userInfo = user
        this.roles = [user.role]
        
        return user
      } catch (error) {
        throw error
      }
    },

    // 用户登出
    logout() {
      this.token = null
      this.userInfo = null
      this.roles = []
      removeToken()
    },

    // 重置状态
    resetState() {
      this.token = null
      this.userInfo = null
      this.roles = []
    }
  }
})