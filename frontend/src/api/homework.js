import request from '@/utils/request'

// 获取学生作业列表
export function getStudentHomeworks(params) {
  return request({
    url: '/homework/student/list',
    method: 'get',
    params
  })
}

// 学生提交作业
export function submitStudentHomework(homeworkId, data) {
  return request({
    url: `/homework/submit/${homeworkId}`,
    method: 'post',
    data
  })
}

// 获取学生提交详情
export function getSubmissionDetail(homeworkId) {
  return request({
    url: `/homework/submission/${homeworkId}`,
    method: 'get'
  })
}

// 教师创建作业
export function createHomework(data) {
  return request({
    url: '/homework/create',
    method: 'post',
    data
  })
}

// 获取教师作业列表
export function getTeacherHomeworks(params) {
  return request({
    url: '/homework/teacher',
    method: 'get',
    params
  })
}

// 获取作业详情
export function getHomeworkDetail(homeworkId) {
  return request({
    url: `/homework/${homeworkId}`,
    method: 'get'
  })
}

// 获取作业提交列表
export function getHomeworkSubmissions(homeworkId, params) {
  return request({
    url: `/homework/${homeworkId}/submissions`,
    method: 'get',
    params
  })
}

// 教师评分
export function gradeSubmission(submissionId, data) {
  return request({
    url: `/homework/grade/${submissionId}`,
    method: 'post',
    data
  })
}

// 更新作业
export function updateHomework(homeworkId, data) {
  return request({
    url: `/homework/${homeworkId}`,
    method: 'put',
    data
  })
}

// 删除作业
export function deleteHomework(homeworkId) {
  return request({
    url: `/homework/${homeworkId}`,
    method: 'delete'
  })
}

// 下载作业文件
export function downloadHomework(submissionId) {
  return request({
    url: `/homework/download/${submissionId}`,
    method: 'get',
    responseType: 'blob'
  })
}