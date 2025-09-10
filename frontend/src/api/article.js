import request from '@/utils/request'

// 获取课文列表
export const getArticles = (params = {}) => {
  return request({
    url: '/articles',
    method: 'get',
    params
  })
}

// 获取课文列表（别名）
export const getArticleList = getArticles

// 获取课文详情
export const getArticleById = (id) => {
  return request({
    url: `/articles/${id}`,
    method: 'get'
  })
}

// 创建课文
export const createArticle = (data) => {
  return request({
    url: '/articles',
    method: 'post',
    data
  })
}

// 更新课文
export const updateArticle = (id, data) => {
  return request({
    url: `/articles/${id}`,
    method: 'put',
    data
  })
}

// 删除课文
export const deleteArticle = (id) => {
  return request({
    url: `/articles/${id}`,
    method: 'delete'
  })
}

// 获取课文统计信息
export const getArticleStatistics = () => {
  return request({
    url: '/articles/statistics',
    method: 'get'
  })
}

// 获取课文背诵统计
export const getArticleStats = (params) => {
  return request({
    url: '/articles/stats',
    method: 'get',
    params
  })
}

// 获取未完成背诵的学生列表
export const getUncompletedStudents = (params) => {
  return request({
    url: '/articles/uncompleted-students',
    method: 'get',
    params
  })
}