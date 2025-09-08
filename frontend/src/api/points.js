import request from './request'

// 给学生添加积分
export function addPoints(data) {
  return request({
    url: '/points/add',
    method: 'post',
    data
  })
}

// 获取学生积分记录
export function getStudentPoints(params) {
  return request({
    url: '/points/student',
    method: 'get',
    params
  })
}

// 获取班级积分排行榜
export function getClassLeaderboard(classId) {
  return request({
    url: `/points/leaderboard/${classId}`,
    method: 'get'
  })
}

// 获取积分统计信息
export function getPointsStats(params) {
  return request({
    url: '/points/stats',
    method: 'get',
    params
  })
}

// 删除积分记录
export function deletePointsRecord(id) {
  return request({
    url: `/points/${id}`,
    method: 'delete'
  })
}