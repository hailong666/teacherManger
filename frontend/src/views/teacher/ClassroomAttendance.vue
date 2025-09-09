<template>
  <div class="classroom-attendance-container">
    <el-card class="attendance-card">
      <template #header>
        <div class="card-header">
          <h3>教室签到管理</h3>
          <div class="header-actions">
            <el-select v-model="selectedClassId" placeholder="选择班级" @change="loadClassStudents">
              <el-option
                v-for="cls in classList"
                :key="cls.id"
                :label="cls.name"
                :value="cls.id"
              />
            </el-select>
            <el-button type="primary" @click="startAttendance" :disabled="!selectedClassId">开始签到</el-button>
            <el-button @click="viewAttendanceStats" :disabled="!selectedClassId">查看统计</el-button>
          </div>
        </div>
      </template>

      <!-- 签到状态显示 -->
      <div v-if="attendanceStarted" class="attendance-status">
        <el-alert
          title="签到进行中"
          type="success"
          :description="`当前班级：${currentClassName} | 已签到：${attendedStudents.length}人 | 未签到：${unattendedStudents.length}人`"
          show-icon
          :closable="false"
        />
      </div>

      <!-- 学生名单 -->
      <div v-if="selectedClassId" class="student-list">
        <div class="list-header">
          <h4>学生名单</h4>
          <div class="quick-actions">
            <el-button size="small" @click="markAllPresent">全部出勤</el-button>
            <el-button size="small" @click="resetAttendance">重置签到</el-button>
          </div>
        </div>

        <div class="students-grid">
          <div
            v-for="student in studentList"
            :key="student.id"
            class="student-card"
            :class="{
              'attended': student.attended,
              'not-attended': !student.attended && attendanceStarted
            }"
            @click="toggleStudentAttendance(student)"
          >
            <div class="student-info">
              <div class="student-name">{{ student.name }}</div>
              <div class="student-id">学号: {{ student.username }}</div>
            </div>
            <div class="attendance-status">
              <el-icon v-if="student.attended" class="check-icon"><Check /></el-icon>
              <el-icon v-else class="pending-icon"><Clock /></el-icon>
            </div>
          </div>
        </div>
      </div>

      <!-- 签到记录 -->
      <div v-if="attendanceStarted" class="attendance-records">
        <h4>今日签到记录</h4>
        <el-table :data="todayAttendanceRecords" style="width: 100%">
          <el-table-column prop="studentName" label="学生姓名" width="120"></el-table-column>
          <el-table-column prop="attendanceTime" label="签到时间" width="180">
            <template #default="scope">
              {{ formatTime(scope.row.attendanceTime) }}
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="100">
            <template #default="scope">
              <el-tag :type="getStatusType(scope.row.status)">{{ getStatusText(scope.row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120">
            <template #default="scope">
              <el-button size="small" @click="editAttendanceRecord(scope.row)">编辑</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>

    <!-- 编辑签到记录对话框 -->
    <el-dialog v-model="editDialogVisible" title="编辑签到记录" width="400px">
      <el-form :model="editForm" label-width="80px">
        <el-form-item label="学生">
          <el-input v-model="editForm.studentName" disabled></el-input>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="editForm.status" placeholder="选择状态">
            <el-option label="出勤" value="present"></el-option>
            <el-option label="迟到" value="late"></el-option>
            <el-option label="缺勤" value="absent"></el-option>
            <el-option label="请假" value="leave"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="editForm.note" type="textarea" rows="3"></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="editDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveAttendanceRecord">保存</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 统计对话框 -->
    <el-dialog v-model="statsDialogVisible" title="签到统计" width="600px">
      <div v-if="attendanceStats" class="stats-content">
        <div class="stats-summary">
          <el-row :gutter="20">
            <el-col :span="6">
              <div class="stat-item">
                <div class="stat-number">{{ attendanceStats.totalStudents }}</div>
                <div class="stat-label">总人数</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="stat-item">
                <div class="stat-number">{{ attendanceStats.presentCount }}</div>
                <div class="stat-label">已签到</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="stat-item">
                <div class="stat-number">{{ attendanceStats.absentCount }}</div>
                <div class="stat-label">未签到</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="stat-item">
                <div class="stat-number">{{ attendanceStats.attendanceRate }}%</div>
                <div class="stat-label">出勤率</div>
              </div>
            </el-col>
          </el-row>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Check, Clock } from '@element-plus/icons-vue'
import { getClasses } from '@/api/class'
import { addAttendanceRecord, getAttendanceList, updateAttendanceStatus } from '@/api/attendance'
import { getUsersByClass } from '@/api/user'

// 响应式数据
const selectedClassId = ref('')
const currentClassName = ref('')
const classList = ref([])
const studentList = ref([])
const attendanceStarted = ref(false)
const todayAttendanceRecords = ref([])
const editDialogVisible = ref(false)
const statsDialogVisible = ref(false)
const attendanceStats = ref(null)

// 编辑表单
const editForm = reactive({
  id: '',
  studentName: '',
  status: '',
  note: ''
})

// 计算属性
const attendedStudents = computed(() => {
  return studentList.value.filter(student => student.attended)
})

const unattendedStudents = computed(() => {
  return studentList.value.filter(student => !student.attended)
})

// 生命周期
onMounted(() => {
  loadClassList()
})

// 方法
const loadClassList = async () => {
  try {
    const response = await getClasses()
    classList.value = response.data.classes || []
  } catch (error) {
    ElMessage.error('获取班级列表失败')
  }
}

const loadClassStudents = async () => {
  if (!selectedClassId.value) return
  
  try {
    const selectedClass = classList.value.find(cls => cls.id === selectedClassId.value)
    currentClassName.value = selectedClass?.name || ''
    
    const response = await getUsersByClass(selectedClassId.value)
    studentList.value = response.data.class.students.map(student => ({
      ...student,
      attended: false
    }))
    
    // 加载今日签到记录
    await loadTodayAttendanceRecords()
  } catch (error) {
    ElMessage.error('获取学生列表失败')
  }
}

const loadTodayAttendanceRecords = async () => {
  try {
    const today = new Date().toISOString().split('T')[0]
    const response = await getAttendanceList({
      classId: selectedClassId.value,
      date: today
    })
    
    todayAttendanceRecords.value = response.data.attendances || []
    
    // 更新学生签到状态
    studentList.value.forEach(student => {
      const attendanceRecord = todayAttendanceRecords.value.find(
        record => record.studentId === student.id
      )
      student.attended = !!attendanceRecord
    })
  } catch (error) {
    console.error('获取今日签到记录失败:', error)
  }
}

const startAttendance = () => {
  attendanceStarted.value = true
  ElMessage.success('签到已开始，学生可以在白板上写名字进行签到')
}

const toggleStudentAttendance = async (student) => {
  if (!attendanceStarted.value) {
    ElMessage.warning('请先开始签到')
    return
  }
  
  try {
    if (!student.attended) {
      // 添加签到记录
      await addAttendanceRecord({
        classId: selectedClassId.value,
        studentId: student.id,
        status: 'present',
        note: '希沃白板签到'
      })
      
      student.attended = true
      ElMessage.success(`${student.name} 签到成功`)
    } else {
      ElMessage.info(`${student.name} 已经签到过了`)
    }
    
    // 重新加载今日签到记录
    await loadTodayAttendanceRecords()
  } catch (error) {
    ElMessage.error('签到操作失败')
  }
}

const markAllPresent = async () => {
  if (!attendanceStarted.value) {
    ElMessage.warning('请先开始签到')
    return
  }
  
  try {
    await ElMessageBox.confirm('确定要将所有学生标记为出勤吗？', '确认操作', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    const unattendedStudents = studentList.value.filter(student => !student.attended)
    
    for (const student of unattendedStudents) {
      await addAttendanceRecord({
        classId: selectedClassId.value,
        studentId: student.id,
        status: 'present',
        note: '批量标记出勤'
      })
      student.attended = true
    }
    
    await loadTodayAttendanceRecords()
    ElMessage.success('所有学生已标记为出勤')
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量签到失败')
    }
  }
}

const resetAttendance = async () => {
  try {
    await ElMessageBox.confirm('确定要重置今日签到记录吗？此操作不可恢复！', '确认操作', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    // 这里需要后端提供删除今日签到记录的API
    // 暂时只重置前端状态
    studentList.value.forEach(student => {
      student.attended = false
    })
    todayAttendanceRecords.value = []
    attendanceStarted.value = false
    
    ElMessage.success('签到记录已重置')
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('重置失败')
    }
  }
}

const editAttendanceRecord = (record) => {
  editForm.id = record.id
  editForm.studentName = record.studentName
  editForm.status = record.status
  editForm.note = record.note || ''
  editDialogVisible.value = true
}

const saveAttendanceRecord = async () => {
  try {
    await updateAttendanceStatus({
      id: editForm.id,
      status: editForm.status,
      note: editForm.note
    })
    
    editDialogVisible.value = false
    await loadTodayAttendanceRecords()
    ElMessage.success('签到记录更新成功')
  } catch (error) {
    ElMessage.error('更新签到记录失败')
  }
}

const viewAttendanceStats = () => {
  const totalStudents = studentList.value.length
  const presentCount = attendedStudents.value.length
  const absentCount = unattendedStudents.value.length
  const attendanceRate = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0
  
  attendanceStats.value = {
    totalStudents,
    presentCount,
    absentCount,
    attendanceRate
  }
  
  statsDialogVisible.value = true
}

const formatTime = (timeString) => {
  return new Date(timeString).toLocaleString('zh-CN')
}

const getStatusType = (status) => {
  const statusMap = {
    present: 'success',
    late: 'warning',
    absent: 'danger',
    leave: 'info'
  }
  return statusMap[status] || 'info'
}

const getStatusText = (status) => {
  const statusMap = {
    present: '出勤',
    late: '迟到',
    absent: '缺勤',
    leave: '请假'
  }
  return statusMap[status] || status
}
</script>

<style scoped>
.classroom-attendance-container {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.attendance-status {
  margin-bottom: 20px;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.quick-actions {
  display: flex;
  gap: 10px;
}

.students-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 30px;
}

.student-card {
  border: 2px solid #e4e7ed;
  border-radius: 8px;
  padding: 15px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.student-card:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
}

.student-card.attended {
  border-color: #67c23a;
  background-color: #f0f9ff;
}

.student-card.not-attended {
  border-color: #f56c6c;
  background-color: #fef0f0;
}

.student-info {
  flex: 1;
}

.student-name {
  font-weight: bold;
  font-size: 16px;
  margin-bottom: 5px;
}

.student-id {
  color: #909399;
  font-size: 12px;
}

.attendance-status {
  font-size: 20px;
}

.check-icon {
  color: #67c23a;
}

.pending-icon {
  color: #e6a23c;
}

.attendance-records {
  margin-top: 30px;
}

.stats-content {
  padding: 20px 0;
}

.stat-item {
  text-align: center;
  padding: 20px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
}

.stat-number {
  font-size: 24px;
  font-weight: bold;
  color: #409eff;
  margin-bottom: 5px;
}

.stat-label {
  color: #909399;
  font-size: 14px;
}
</style>