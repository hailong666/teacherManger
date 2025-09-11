<template>
  <div class="whiteboard-attendance">
    <!-- 顶部信息栏 -->
    <div class="header-info">
      <div class="class-info">
        <h2>{{ classInfo.name || '班级签到' }}</h2>
        <p>请在下方白板上写下您的姓名进行签到</p>
      </div>
      <div class="attendance-stats">
        <el-tag type="success" size="large">已签到: {{ attendedCount }}人</el-tag>
        <el-tag type="warning" size="large" style="margin-left: 10px;">未签到: {{ unattendedCount }}人</el-tag>
      </div>
    </div>

    <!-- 白板签到区域 -->
    <div class="whiteboard-container">
      <div class="whiteboard-header">
        <h3>签到白板</h3>
        <div class="whiteboard-controls">
          <el-button-group>
            <el-button @click="clearCanvas" type="warning">清空画板</el-button>
            <el-button @click="submitSignature" type="primary" :disabled="!hasSignature">提交签到</el-button>
          </el-button-group>
        </div>
      </div>
      
      <div class="canvas-container">
        <canvas
          ref="signatureCanvas"
          @mousedown="startDrawing"
          @mousemove="draw"
          @mouseup="stopDrawing"
          @touchstart="startDrawing"
          @touchmove="draw"
          @touchend="stopDrawing"
          class="signature-canvas"
        ></canvas>
        <div class="canvas-placeholder" v-if="!hasSignature">
          <p>请在此处写下您的姓名</p>
        </div>
      </div>
    </div>

    <!-- 手动添加签到 -->
    <div class="manual-attendance" v-if="userStore.userInfo?.role?.name === 'teacher'">
      <el-card>
        <template #header>
          <h3>手动添加签到</h3>
        </template>
        <div class="manual-form">
          <el-select
            v-model="selectedStudentId"
            placeholder="选择学生"
            style="width: 200px; margin-right: 10px;"
            filterable
          >
            <el-option
              v-for="student in classStudents"
              :key="student.id"
              :label="student.name"
              :value="student.id"
              :disabled="attendedStudentIds.includes(student.id)"
            >
              <span>{{ student.name }}</span>
              <span v-if="attendedStudentIds.includes(student.id)" style="color: #67c23a; margin-left: 10px;">已签到</span>
            </el-option>
          </el-select>
          <el-button @click="manualAttendance" type="success" :disabled="!selectedStudentId">手动签到</el-button>
        </div>
      </el-card>
    </div>

    <!-- 签到统计 -->
    <div class="attendance-stats-section">
      <el-card>
        <template #header>
          <h3>签到统计</h3>
        </template>
        <div class="stats-summary">
          <div class="stat-item">
            <span class="stat-label">总人数:</span>
            <span class="stat-value">{{ classStudents.length }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">已签到:</span>
            <span class="stat-value present">{{ attendedCount }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">未签到:</span>
            <span class="stat-value absent">{{ unattendedCount }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">签到率:</span>
            <span class="stat-value">{{ attendanceRate }}%</span>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 已签到学生列表 -->
    <div class="attendance-list">
      <el-card>
        <template #header>
          <div class="list-header">
            <h3>已签到学生 ({{ attendedCount }}人)</h3>
            <div class="header-actions">
              <el-button @click="refreshAttendance" :loading="loading">刷新</el-button>
              <el-button 
                @click="clearAllAttendance" 
                type="danger" 
                :disabled="attendedCount === 0"
                v-if="userStore.userInfo?.role?.name === 'teacher'"
              >
                清除所有记录
              </el-button>
            </div>
          </div>
        </template>
        
        <div v-if="attendedCount === 0" class="empty-state">
          <p>暂无签到记录</p>
        </div>
        <div v-else class="student-grid">
          <div 
            v-for="record in attendanceRecords.filter(r => r.status === 'present')"
            :key="record.id"
            class="student-card attended"
          >
            <div class="student-name">{{ record.studentName }}</div>
            <div class="attendance-time">{{ formatTime(record.attendanceTime) }}</div>
            <div class="attendance-method">{{ record.method === 'signature' ? '手写签到' : '手动签到' }}</div>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 未签到学生列表 -->
    <div class="student-list" v-if="unattendedStudents.length > 0">
      <el-card>
        <template #header>
          <h3>未签到学生 ({{ unattendedCount }}人)</h3>
        </template>
        
        <div class="student-grid">
          <div 
            v-for="student in unattendedStudents"
            :key="student.id"
            class="student-card unattended"
          >
            <div class="student-name">{{ student.name }}</div>
            <div class="student-info">{{ student.username || student.studentId || student.id }}</div>
            <el-button 
              size="small" 
              type="primary" 
              @click="quickAttendance(student)"
              style="margin-top: 8px;"
            >
              快速签到
            </el-button>
          </div>
        </div>
      </el-card>
    </div>
    
    <!-- 全部学生已签到提示 -->
    <div v-else-if="classStudents.length > 0" class="all-attended">
      <el-card>
        <el-result
          icon="success"
          title="全部学生已签到"
          sub-title="今日所有学生都已完成签到"
        >
        </el-result>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
// 使用fetch API进行网络请求

const userStore = useUserStore()

// 响应式数据
const loading = ref(false)
const hasSignature = ref(false)
const isDrawing = ref(false)
const activeTab = ref('attended')
const selectedStudentId = ref('')

const classInfo = reactive({
  id: null,
  name: '',
  teacherId: null
})

const classStudents = ref([])
const attendanceRecords = ref([])

// Canvas相关
const signatureCanvas = ref(null)
let ctx = null
let lastX = 0
let lastY = 0

// 计算属性
const attendedCount = computed(() => {
  return attendanceRecords.value.filter(r => r.status === 'present').length
})

const unattendedCount = computed(() => {
  return classStudents.value.length - attendedCount.value
})

const attendedStudentIds = computed(() => {
  return attendanceRecords.value
    .filter(r => r.status === 'present')
    .map(r => r.studentId)
})

const unattendedStudents = computed(() => {
  return classStudents.value.filter(student => 
    !attendedStudentIds.value.includes(student.id)
  )
})

// 计算签到率
const attendanceRate = computed(() => {
  if (classStudents.value.length === 0) return 0
  return Math.round((attendedCount.value / classStudents.value.length) * 100)
})

// 获取已签到学生列表
const attendedStudents = computed(() => {
  return attendanceRecords.value.map(record => ({
    id: record.id,
    studentName: record.studentName,
    attendanceTime: new Date(record.attendanceTime).toLocaleString(),
    method: record.method
  }))
})

// Canvas绘图方法
const initCanvas = () => {
  nextTick(() => {
    const canvas = signatureCanvas.value
    if (!canvas) return
    
    ctx = canvas.getContext('2d')
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight
    
    ctx.strokeStyle = '#2c3e50'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  })
}

const getEventPos = (e) => {
  const canvas = signatureCanvas.value
  const rect = canvas.getBoundingClientRect()
  
  if (e.touches) {
    return {
      x: e.touches[0].clientX - rect.left,
      y: e.touches[0].clientY - rect.top
    }
  } else {
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }
}

const startDrawing = (e) => {
  e.preventDefault()
  isDrawing.value = true
  const pos = getEventPos(e)
  lastX = pos.x
  lastY = pos.y
}

const draw = (e) => {
  if (!isDrawing.value) return
  e.preventDefault()
  
  const pos = getEventPos(e)
  
  ctx.beginPath()
  ctx.moveTo(lastX, lastY)
  ctx.lineTo(pos.x, pos.y)
  ctx.stroke()
  
  lastX = pos.x
  lastY = pos.y
  hasSignature.value = true
}

const stopDrawing = (e) => {
  e.preventDefault()
  isDrawing.value = false
}

const clearCanvas = () => {
  if (!ctx) return
  ctx.clearRect(0, 0, signatureCanvas.value.width, signatureCanvas.value.height)
  hasSignature.value = false
}

// 提交签名签到
const submitSignature = async () => {
  if (!hasSignature.value) {
    ElMessage.warning('请先在白板上写下您的姓名')
    return
  }
  
  try {
    // 获取签名图片数据
    const canvas = signatureCanvas.value
    const signatureData = canvas.toDataURL('image/png')
    
    // 构建请求体
    const requestBody = {
      classId: classInfo.id,
      method: 'signature',
      signatureData: signatureData,
      notes: '希沃白板手写签到'
    }
    
    // 如果是学生角色，需要传递studentId（使用当前用户ID）
    if (userStore.userInfo?.role?.name === 'student') {
      requestBody.studentId = userStore.userInfo.id
    }
    
    // 提交签到
    const response = await fetch('/api/attendance/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('teacher-manager-token')}`
      },
      body: JSON.stringify(requestBody)
    })
    
    const result = await response.json()
    
    if (response.ok) {
      ElMessage.success('签到成功！')
      clearCanvas()
      await refreshAttendance()
    } else {
      ElMessage.error(result.message || '签到失败')
    }
    
  } catch (error) {
    console.error('签到失败:', error)
    ElMessage.error('签到失败，请重试')
  }
}

// 手动签到
const manualAttendance = async () => {
  if (!selectedStudentId.value) {
    ElMessage.warning('请选择学生')
    return
  }
  
  try {
    // 调用API添加手动签到
    const response = await fetch('/api/attendance/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('teacher-manager-token')}`
      },
      body: JSON.stringify({
        classId: classInfo.id,
        studentId: selectedStudentId.value,
        method: 'manual',
        notes: '教师手动签到'
      })
    })
    
    const result = await response.json()
    
    if (response.ok) {
      ElMessage.success('手动签到成功！')
      selectedStudentId.value = ''
      await refreshAttendance()
    } else {
      ElMessage.error(result.message || '手动签到失败')
    }
    
  } catch (error) {
    console.error('手动签到失败:', error)
    ElMessage.error('手动签到失败，请重试')
  }
}

// 获取班级信息
const getClassInfo = async () => {
  try {
    loading.value = true
    
    // 获取用户的班级信息
    const response = await fetch('/api/classes', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('teacher-manager-token')}`
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log('获取到的班级数据:', data)
      
      if (data && data.classes && data.classes.length > 0) {
        const classData = data.classes[0]
        classInfo.id = classData.id
        classInfo.name = classData.name
        classInfo.teacherId = classData.teacherId
        
        console.log('设置班级信息:', classInfo)
        
        // 获取班级学生
        await getClassStudents(classData.id)
      } else {
        console.warn('没有找到班级数据:', data)
        ElMessage.warning('没有找到可用的班级')
      }
    } else {
      const errorData = await response.json().catch(() => ({}))
      console.error('获取班级信息失败:', response.status, errorData)
      ElMessage.error(`获取班级信息失败: ${errorData.message || response.statusText}`)
    }
  } catch (error) {
    console.error('获取班级信息失败:', error)
    ElMessage.error('获取班级信息失败，请检查网络连接')
  } finally {
    loading.value = false
  }
}

// 获取班级学生
const getClassStudents = async (classId) => {
  try {
    const response = await fetch(`/api/classes/${classId}/students`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('teacher-manager-token')}`
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log('获取到的班级学生数据:', data)
      // 后端返回的数据结构是 {students: [...], total: ...}
      classStudents.value = data.students || []
    } else {
      const errorData = await response.json().catch(() => ({}))
      console.error('获取班级学生失败:', response.status, errorData)
      ElMessage.error(`获取班级学生失败: ${errorData.message || response.statusText}`)
      classStudents.value = []
    }
  } catch (error) {
    console.error('获取班级学生失败:', error)
    ElMessage.error('获取班级学生失败')
    classStudents.value = []
  }
}

// 刷新签到记录
const refreshAttendance = async () => {
  if (!classInfo.id) return
  
  try {
    loading.value = true
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD格式
    const response = await fetch(`/api/attendance?classId=${classInfo.id}&date=${today}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('teacher-manager-token')}`
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log('获取到的签到记录数据:', data)
      // 后端返回的数据结构是 {data: {attendances: [...], pagination: {...}}}
      const attendances = data.data?.attendances || data.attendances || []
      attendanceRecords.value = attendances.map(item => ({
        id: item.id,
        studentId: item.student_id || item.studentId,
        studentName: item.student?.name || item.studentName,
        attendanceTime: item.check_in_time || item.attendanceTime || item.created_at,
        method: item.method || 'manual',
        status: item.status || 'present'
      }))
    } else {
      const errorData = await response.json().catch(() => ({}))
      console.error('获取签到列表失败:', response.status, errorData)
      ElMessage.error(`获取签到记录失败: ${errorData.message || response.statusText}`)
      attendanceRecords.value = []
    }
  } catch (error) {
    console.error('获取签到记录失败:', error)
    ElMessage.error('获取签到记录失败')
    attendanceRecords.value = []
  } finally {
    loading.value = false
  }
}

// 快速签到
const quickAttendance = async (student) => {
  try {
    const response = await fetch('/api/attendance/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('teacher-manager-token')}`
      },
      body: JSON.stringify({
        classId: classInfo.id,
        studentId: student.id,
        method: 'manual',
        notes: '教师快速签到'
      })
    })
    
    const result = await response.json()
    
    if (response.ok) {
      ElMessage.success(`${student.name} 签到成功！`)
      await refreshAttendance()
    } else {
      ElMessage.error(result.message || '快速签到失败')
    }
    
  } catch (error) {
    console.error('快速签到失败:', error)
    ElMessage.error('快速签到失败，请重试')
  }
}

// 清除所有签到记录
const clearAllAttendance = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要清除所有签到记录吗？此操作不可恢复！',
      '警告',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    
    const response = await fetch('/api/attendance/clear/all', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('teacher-manager-token')}`
      }
    })
    
    const result = await response.json()
    
    if (response.ok) {
      ElMessage.success('所有签到记录已清除')
      await refreshAttendance()
    } else {
      ElMessage.error(result.message || '清除记录失败')
    }
    
  } catch (error) {
    if (error !== 'cancel') {
      console.error('清除签到记录失败:', error)
      ElMessage.error('清除签到记录失败，请重试')
    }
  }
}

// 格式化时间
const formatTime = (timeString) => {
  if (!timeString) return ''
  const date = new Date(timeString)
  return date.toLocaleTimeString('zh-CN', { 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit'
  })
}

// 组件挂载
onMounted(async () => {
  await getClassInfo()
  await refreshAttendance()
  initCanvas()
})
</script>

<style scoped>
.whiteboard-attendance {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.header-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 10px;
}

.class-info h2 {
  margin: 0 0 5px 0;
  font-size: 24px;
}

.class-info p {
  margin: 0;
  opacity: 0.9;
}

.attendance-stats {
  display: flex;
  align-items: center;
}

.whiteboard-container {
  margin-bottom: 30px;
}

.whiteboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.whiteboard-header h3 {
  margin: 0;
  color: #2c3e50;
}

.canvas-container {
  position: relative;
  border: 3px solid #e1e8ed;
  border-radius: 10px;
  background: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.signature-canvas {
  width: 100%;
  height: 300px;
  cursor: crosshair;
  display: block;
  border-radius: 7px;
}

.canvas-placeholder {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #999;
  font-size: 18px;
  pointer-events: none;
  z-index: 1;
}

.manual-attendance {
  margin-bottom: 30px;
}

.manual-form {
  display: flex;
  align-items: center;
}

.attendance-stats-section {
  margin-bottom: 20px;
}

.stats-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 20px;
  margin-top: 15px;
}

.stat-item {
  text-align: center;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.stat-label {
  display: block;
  font-size: 14px;
  color: #6c757d;
  margin-bottom: 5px;
}

.stat-value {
  display: block;
  font-size: 24px;
  font-weight: bold;
  color: #495057;
}

.stat-value.present {
  color: #28a745;
}

.stat-value.absent {
  color: #dc3545;
}

.attendance-list {
  margin-bottom: 20px;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.list-header h3 {
  margin: 0;
}

.student-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 15px;
  margin-top: 15px;
}

.student-card {
  padding: 15px;
  border-radius: 8px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;
}

.student-card:hover {
  transform: translateY(-2px);
}

.student-card.attended {
  background: linear-gradient(135deg, #67c23a, #85ce61);
  color: white;
}

.student-card.unattended {
  background: linear-gradient(135deg, #f56c6c, #f78989);
  color: white;
}

.student-name {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 5px;
}

.attendance-time {
  font-size: 12px;
  opacity: 0.9;
  margin-bottom: 3px;
}

.attendance-method {
  font-size: 11px;
  opacity: 0.8;
}

.student-info {
  font-size: 12px;
  opacity: 0.9;
}

.all-attended {
  margin-bottom: 20px;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #909399;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .whiteboard-attendance {
    padding: 10px;
  }
  
  .header-info {
    flex-direction: column;
    text-align: center;
    gap: 15px;
  }
  
  .whiteboard-header {
    flex-direction: column;
    gap: 10px;
  }
  
  .manual-form {
    flex-direction: column;
    gap: 10px;
  }
  
  .student-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }
}
</style>