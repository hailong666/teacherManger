import request from './request'

// 获取背诵打卡列表
export function getRecitationList(params) {
  return request({
    url: '/recitation',
    method: 'get',
    params
  })
}

// 获取背诵打卡任务（别名）
export function getRecitationTasks(params) {
  return request({
    url: '/recitation',
    method: 'get',
    params
  })
}

// 提交背诵打卡
export function submitRecitation(data) {
  return request({
    url: '/recitation',
    method: 'post',
    data
  })
}

// 教师评分背诵打卡
export function gradeRecitation(id, data) {
  return request({
    url: `/recitation/${id}/grade`,
    method: 'put',
    data
  })
}

// 获取背诵打卡详情
export function getRecitationById(id) {
  return request({
    url: `/recitation/${id}`,
    method: 'get'
  })
}

// 创建背诵任务（暂时使用背诵打卡接口）
export function createRecitationTask(data) {
  return request({
    url: '/recitation',
    method: 'post',
    data
  })
}

// 更新背诵任务（暂时使用评分接口）
export function updateRecitationTask(id, data) {
  return request({
    url: `/recitation/${id}/grade`,
    method: 'put',
    data
  })
}

// 获取班级列表
export function getClasses() {
  return request({
    url: '/classes',
    method: 'get'
  })
}

// 获取背诵统计信息
export function getRecitationStats(params) {
  return request({
    url: '/recitation/stats',
    method: 'get',
    params
  })
}