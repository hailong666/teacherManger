import request from '@/utils/request'

// 获取签到二维码
export function getAttendanceQRCode(classId) {
  return request({
    url: '/attendance/generate-qrcode',
    method: 'post',
    data: { classId }
  })
}

// 学生扫码签到
export function scanQRCodeAttendance(data) {
  return request({
    url: `/attendance/scan/${data.sessionId}`,
    method: 'post',
    data: { location: data.location }
  })
}

// 获取签到记录列表
export function getAttendanceList(params) {
  return request({
    url: '/attendance',
    method: 'get',
    params
  })
}

// 获取签到统计数据
export function getAttendanceStats(classId) {
  return request({
    url: '/attendance/stats',
    method: 'get',
    params: { classId }
  })
}

// 手动添加签到记录（教师用）
export function addAttendanceRecord(data) {
  return request({
    url: '/attendance/manual',
    method: 'post',
    data
  })
}

// 修改签到状态（教师用）
export function updateAttendanceStatus(data) {
  return request({
    url: `/attendance/${data.id}`,
    method: 'put',
    data
  })
}