import request from './request'

// 用户登录
export function login(data) {
  return request({
    url: '/users/login',
    method: 'post',
    data
  })
}

// 获取用户信息
export function getUserInfo() {
  return request({
    url: '/users/me',
    method: 'get'
  })
}

// 用户登出
export function logout() {
  return request({
    url: '/users/logout',
    method: 'post'
  })
}

// 修改密码
export function changePassword(data) {
  return request({
    url: '/user/change-password',
    method: 'post',
    data
  })
}

// 获取班级学生列表
export function getUsersByClass(classId) {
  return request({
    url: `/classes/${classId}`,
    method: 'get'
  })
}

// 获取所有用户
export function getAllUsers(params = {}) {
  return request({
    url: '/users',
    method: 'get',
    params
  })
}

// 创建用户
export function createUser(data) {
  return request({
    url: '/users',
    method: 'post',
    data
  })
}

// 更新用户
export function updateUser(id, data) {
  return request({
    url: `/users/${id}`,
    method: 'put',
    data
  })
}

// 删除用户
export function deleteUser(id) {
  return request({
    url: `/users/${id}`,
    method: 'delete'
  })
}

// 获取所有角色
export function getAllRoles() {
  return request({
    url: '/roles',
    method: 'get'
  })
}

// 创建角色
export function createRole(data) {
  return request({
    url: '/roles',
    method: 'post',
    data
  })
}

// 更新角色
export function updateRole(id, data) {
  return request({
    url: `/roles/${id}`,
    method: 'put',
    data
  })
}

// 删除角色
export function deleteRole(id) {
  return request({
    url: `/roles/${id}`,
    method: 'delete'
  })
}

// 获取所有权限
export function getAllPermissions() {
  return request({
    url: '/permissions',
    method: 'get'
  })
}