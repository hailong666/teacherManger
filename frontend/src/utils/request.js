import axios from 'axios'
import { ElMessage } from 'element-plus'
import { getToken, removeToken } from '@/utils/auth'
import router from '@/router'

// 创建axios实例
const service = axios.create({
  baseURL: '/api', // api的base_url
  timeout: 10000 // 请求超时时间
})

// request拦截器
service.interceptors.request.use(
  config => {
    // 在请求发送之前做一些处理
    const token = getToken()
    if (token) {
      // 让每个请求携带token
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  error => {
    // 请求错误处理
    console.log(error) // for debug
    Promise.reject(error)
  }
)

// response拦截器
service.interceptors.response.use(
  response => {
    const res = response.data
    
    // 如果返回的状态码为200，说明接口请求成功，可以正常拿到数据
    if (response.status === 200) {
      return Promise.resolve(res)
    } else {
      return Promise.reject(res)
    }
  },
  error => {
    console.log('err' + error) // for debug
    
    if (error.response) {
      switch (error.response.status) {
        case 401:
          // 401: 未登录状态，跳转登录页
          ElMessage.error('登录状态已过期，请重新登录')
          removeToken()
          router.push('/login')
          break
        case 403:
          // 403: token过期了
          ElMessage.error('登录状态已过期，请重新登录')
          removeToken()
          router.push('/login')
          break
        case 404:
          ElMessage.error('请求的资源不存在')
          break
        case 500:
          ElMessage.error('服务器内部错误')
          break
        default:
          ElMessage.error(error.response.data.message || '请求失败')
      }
    } else {
      ElMessage.error('网络连接异常，请检查网络')
    }
    
    return Promise.reject(error)
  }
)

export default service