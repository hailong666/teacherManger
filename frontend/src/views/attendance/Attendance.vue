<template>
  <div class="attendance-container">
    <!-- 生成签到码卡片 -->
    <el-card class="attendance-card">
      <template #header>
        <div class="card-header">
          <h3>生成签到码</h3>
        </div>
      </template>
      <div class="qrcode-section">
        <el-form :model="qrcodeForm" label-width="100px">
          <el-form-item label="班级">
            <el-select v-model="qrcodeForm.classId" placeholder="请选择班级" style="width: 200px" :loading="loadingClasses">
              <el-option v-for="cls in classList" :key="cls.id" :label="cls.name" :value="cls.id"></el-option>
            </el-select>
          </el-form-item>
          <el-form-item label="有效时间">
            <el-select v-model="qrcodeForm.validMinutes" style="width: 200px">
              <el-option label="5分钟" :value="5"></el-option>
              <el-option label="10分钟" :value="10"></el-option>
              <el-option label="15分钟" :value="15"></el-option>
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="generateQRCode" :loading="generating">生成签到码</el-button>
          </el-form-item>
        </el-form>
        
        <div v-if="qrcodeUrl" class="qrcode-display">
          <h4>签到二维码</h4>
          <div class="qrcode-image">
            <img :src="qrcodeUrl" alt="签到二维码" />
          </div>
          <p class="qrcode-info">有效时间：{{ qrcodeForm.validMinutes }}分钟</p>
          <p class="session-id">会话ID：{{ sessionId }}</p>
        </div>
      </div>
    </el-card>

    <!-- 签到记录卡片 -->
    <el-card class="attendance-card">
      <template #header>
        <div class="card-header">
          <h3>签到记录</h3>
          <el-button @click="refreshAttendanceList">刷新</el-button>
        </div>
      </template>
      <div class="attendance-list">
        <el-table :data="attendanceList" style="width: 100%" v-loading="loading">
          <el-table-column prop="student.name" label="学生姓名" width="120"></el-table-column>
          <el-table-column prop="student.studentId" label="学号" width="120"></el-table-column>
          <el-table-column prop="class.name" label="班级" width="120"></el-table-column>
          <el-table-column prop="checkInTime" label="签到时间" width="180">
            <template #default="scope">
              {{ formatTime(scope.row.checkInTime) }}
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="100">
            <template #default="scope">
              <el-tag :type="getStatusType(scope.row.status)">{{ getStatusText(scope.row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="location" label="签到位置" show-overflow-tooltip></el-table-column>
          <el-table-column label="操作" width="120">
            <template #default="scope">
              <el-button size="small" @click="editAttendance(scope.row)">编辑</el-button>
            </template>
          </el-table-column>
        </el-table>
        
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
          style="margin-top: 20px; text-align: right"
        />
      </div>
    </el-card>

    <!-- 编辑签到记录对话框 -->
    <el-dialog v-model="editDialogVisible" title="编辑签到记录" width="500px">
      <el-form :model="editForm" label-width="100px">
        <el-form-item label="学生姓名">
          <el-input v-model="editForm.studentName" disabled></el-input>
        </el-form-item>
        <el-form-item label="签到状态">
          <el-select v-model="editForm.status">
            <el-option label="已签到" value="present"></el-option>
            <el-option label="迟到" value="late"></el-option>
            <el-option label="缺席" value="absent"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="editForm.notes" type="textarea" rows="3"></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="editDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="updateAttendance">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getAttendanceQRCode, getAttendanceList, updateAttendanceStatus } from '@/api/attendance'
import { getClasses } from '@/api/class'

// 响应式数据
const generating = ref(false)
const loading = ref(false)
const loadingClasses = ref(false)
const qrcodeUrl = ref('')
const sessionId = ref('')
const editDialogVisible = ref(false)
const classList = ref([])

// 表单数据
const qrcodeForm = reactive({
  classId: '',
  validMinutes: 5
})

const editForm = reactive({
  id: '',
  studentName: '',
  status: '',
  notes: ''
})

// 签到记录列表
const attendanceList = ref([])

// 分页数据
const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0
})

// 生成签到二维码
const generateQRCode = async () => {
  if (!qrcodeForm.classId) {
    ElMessage.warning('请选择班级')
    return
  }
  
  generating.value = true
  try {
    const response = await getAttendanceQRCode(qrcodeForm.classId)
    if (response && response.data) {
      qrcodeUrl.value = response.data.qrcodeUrl || ''
      sessionId.value = response.data.sessionId || ''
      ElMessage.success('签到码生成成功')
    } else {
      ElMessage.error('生成签到码失败：服务器响应异常')
    }
  } catch (error) {
    ElMessage.error('生成签到码失败：' + (error.response?.data?.message || error.message))
  } finally {
    generating.value = false
  }
}

// 获取签到记录列表
const getAttendanceRecords = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit
    }
    const response = await getAttendanceList(params)
    if (response && response.data) {
      attendanceList.value = response.data.attendances || []
      pagination.total = response.data.pagination?.total || 0
    } else {
      attendanceList.value = []
      pagination.total = 0
    }
  } catch (error) {
    ElMessage.error('获取签到记录失败：' + (error.response?.data?.message || error.message))
    attendanceList.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

// 刷新签到记录
const refreshAttendanceList = () => {
  getAttendanceRecords()
}

// 编辑签到记录
const editAttendance = (row) => {
  editForm.id = row.id
  editForm.studentName = row.student.name
  editForm.status = row.status
  editForm.notes = row.notes || ''
  editDialogVisible.value = true
}

// 更新签到记录
const updateAttendance = async () => {
  try {
    await updateAttendanceStatus({
      id: editForm.id,
      status: editForm.status,
      notes: editForm.notes
    })
    ElMessage.success('更新成功')
    editDialogVisible.value = false
    getAttendanceRecords()
  } catch (error) {
    ElMessage.error('更新失败：' + (error.response?.data?.message || error.message))
  }
}

// 分页处理
const handleSizeChange = (val) => {
  pagination.limit = val
  pagination.page = 1
  getAttendanceRecords()
}

const handleCurrentChange = (val) => {
  pagination.page = val
  getAttendanceRecords()
}

// 格式化时间
const formatTime = (time) => {
  if (!time) return '-'
  return new Date(time).toLocaleString('zh-CN')
}

// 获取状态类型
const getStatusType = (status) => {
  const types = {
    present: 'success',
    late: 'warning',
    absent: 'danger'
  }
  return types[status] || 'info'
}

// 获取状态文本
const getStatusText = (status) => {
  const texts = {
    present: '已签到',
    late: '迟到',
    absent: '缺席'
  }
  return texts[status] || '未知'
}

// 获取班级列表
const getClassList = async () => {
  loadingClasses.value = true
  try {
    const response = await getClasses()
    if (response && response.classes) {
      classList.value = response.classes
    } else {
      classList.value = []
    }
  } catch (error) {
    ElMessage.error('获取班级列表失败：' + (error.response?.data?.message || error.message))
    classList.value = []
  } finally {
    loadingClasses.value = false
  }
}

// 组件挂载时获取数据
onMounted(() => {
  getClassList()
  getAttendanceRecords()
})
</script>

<style scoped>
.attendance-container {
  padding: 20px;
}

.attendance-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.qrcode-section {
  padding: 10px 0;
}

.qrcode-display {
  margin-top: 20px;
  text-align: center;
  padding: 20px;
  border: 1px dashed #dcdfe6;
  border-radius: 4px;
}

.qrcode-image img {
  width: 200px;
  height: 200px;
}

.qrcode-info {
  margin: 10px 0;
  color: #606266;
}

.session-id {
  font-size: 12px;
  color: #909399;
  word-break: break-all;
}

.attendance-list {
  padding: 10px 0;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .attendance-container {
    padding: 10px;
  }
  
  .qrcode-image img {
    width: 150px;
    height: 150px;
  }
}
</style>