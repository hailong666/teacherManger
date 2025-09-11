import request from './request'

// 获取班级列表
export const getClasses = (params) => {
  return request({
    url: '/classes',
    method: 'get',
    params
  })
}

// 获取班级详情
export const getClassById = (id) => {
  return request({
    url: `/classes/${id}`,
    method: 'get'
  })
}

// 创建班级
export const createClass = (data) => {
  return request({
    url: '/classes',
    method: 'post',
    data
  })
}

// 更新班级信息
export const updateClass = (id, data) => {
  return request({
    url: `/classes/${id}`,
    method: 'put',
    data
  })
}

// 删除班级
export const deleteClass = (id) => {
  return request({
    url: `/classes/${id}`,
    method: 'delete'
  })
}

// 添加学生到班级
export const addStudentsToClass = (classId, studentIds) => {
  return request({
    url: `/classes/${classId}/students`,
    method: 'post',
    data: { studentIds }
  })
}

// 从班级移除学生
export const removeStudentFromClass = (classId, studentId) => {
  return request({
    url: `/classes/${classId}/students/${studentId}`,
    method: 'delete'
  })
}