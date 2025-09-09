import request from '@/utils/request'

// 随机选择学生
export const randomSelectStudents = (data) => {
  return request({
    url: '/random/select',
    method: 'post',
    data
  })
}

// 随机分组
export const randomGroups = (data) => {
  return request({
    url: '/random/groups',
    method: 'post',
    data
  })
}

// 获取班级列表
export const getClassList = () => {
  return request({
    url: '/classes',
    method: 'get'
  })
}

// 获取班级列表（别名）
export const getClasses = () => {
  return request({
    url: '/classes',
    method: 'get'
  })
}

// 获取班级学生列表
export const getClassStudents = (classId) => {
  return request({
    url: `/random/students/${classId}`,
    method: 'get'
  })
}

// 获取班级学生列表（别名）
export const getStudentsByClass = (classId) => {
  return request({
    url: `/random/students/${classId}`,
    method: 'get'
  })
}

// 获取随机点名历史
export const getRandomCallHistory = (params) => {
  return request({
    url: '/random/history',
    method: 'get',
    params
  })
}

// 创建随机点名记录
export const createRandomCall = (data) => {
  return request({
    url: '/random/call',
    method: 'post',
    data
  })
}