import request from './request'

// 获取签到二维码
export const getAttendanceQRCode = (classId) => {
  return request({
    url: '/api/attendance/qrcode',
    method: 'post',
    data: { classId }
  })
}

// 获取签到记录列表
export const getAttendanceList = (params) => {
  return request({
    url: '/api/attendance/list',
    method: 'get',
    params
  })
}

// 更新签到状态
export const updateAttendanceStatus = (id, data) => {
  return request({
    url: `/api/attendance/${id}`,
    method: 'put',
    data
  })
}

// 创建签到记录
export const createAttendance = (data) => {
  return request({
    url: '/api/attendance',
    method: 'post',
    data
  })
}

// 删除签到记录
export const deleteAttendance = (id) => {
  return request({
    url: `/api/attendance/${id}`,
    method: 'delete'
  })
}

// 清除所有签到记录
export const clearAllAttendance = () => {
  return request({
    url: '/api/attendance/clear',
    method: 'delete'
  })
}

// 获取签到统计信息
export const getAttendanceStats = (params) => {
  return request({
    url: '/api/attendance/stats',
    method: 'get',
    params
  })
}

// 扫描二维码签到
export const scanQRCodeAttendance = (data) => {
  return request({
    url: '/api/attendance/scan',
    method: 'post',
    data
  })
}