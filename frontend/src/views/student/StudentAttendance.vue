<template>
  <div class="student-attendance-container">
    <el-card class="attendance-card">
      <template #header>
        <div class="card-header">
          <h3>我的签到记录</h3>
          <div class="header-actions">
            <el-button type="primary" @click="openQRScanner">扫码签到</el-button>
            <el-button @click="refreshList">刷新</el-button>
          </div>
        </div>
      </template>
      
      <div class="filter-section">
        <el-form :model="filterForm" inline>
          <el-form-item label="日期">
            <el-date-picker
              v-model="filterForm.date"
              type="date"
              placeholder="选择日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              @change="getAttendanceList"
            />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="filterForm.status" placeholder="全部状态" clearable @change="getAttendanceList">
              <el-option label="出勤" value="present"></el-option>
              <el-option label="缺勤" value="absent"></el-option>
              <el-option label="迟到" value="late"></el-option>
              <el-option label="请假" value="leave"></el-option>
              <el-option label="位置异常" value="location_invalid"></el-option>
            </el-select>
          </el-form-item>
        </el-form>
      </div>
      
      <div class="attendance-list">
        <el-table :data="attendanceList" style="width: 100%" v-loading="loading">
          <el-table-column prop="className" label="班级" width="120"></el-table-column>
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
          <el-table-column prop="note" label="备注" show-overflow-tooltip></el-table-column>
        </el-table>
        
        <div class="pagination-wrapper">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.limit"
            :page-sizes="[10, 20, 50, 100]"
            :total="pagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </div>
    </el-card>
    
    <!-- 签到统计卡片 -->
    <el-card class="stats-card">
      <template #header>
        <div class="card-header">
          <h3>签到统计</h3>
        </div>
      </template>
      
      <div class="stats-content">
        <div class="stat-item">
          <div class="stat-number">{{ stats.totalDays || 0 }}</div>
          <div class="stat-label">总天数</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">{{ stats.presentCount || 0 }}</div>
          <div class="stat-label">出勤</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">{{ stats.lateCount || 0 }}</div>
          <div class="stat-label">迟到</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">{{ stats.absentCount || 0 }}</div>
          <div class="stat-label">缺勤</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">{{ stats.attendanceRate || 0 }}%</div>
          <div class="stat-label">出勤率</div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getAttendanceList, getAttendanceStats } from '@/api/attendance.js'

const router = useRouter()

// 响应式数据
const loading = ref(false)
const attendanceList = ref([])
const stats = ref({})
const qrScannerVisible = ref(false)

// 筛选表单
const filterForm = reactive({
  date: '',
  status: ''
})

// 分页数据
const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0
})

// 获取签到记录列表
const getAttendanceRecords = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      date: filterForm.date,
      status: filterForm.status
    }
    
    const response = await getAttendanceList(params)
    if (response && response.attendances) {
      attendanceList.value = response.attendances || []
      pagination.total = response.pagination?.total || 0
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

// 获取签到统计
const getStats = async () => {
  try {
    const response = await getAttendanceStats()
    if (response && response.stats) {
      stats.value = response.stats[0] || {}
    }
  } catch (error) {
    console.error('获取签到统计失败:', error)
  }
}

// 刷新列表
const refreshList = () => {
  getAttendanceRecords()
  getStats()
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
  const typeMap = {
    'present': 'success',
    'absent': 'danger',
    'late': 'warning',
    'leave': 'info',
    'location_invalid': 'warning'
  }
  return typeMap[status] || 'info'
}

// 获取状态文本
const getStatusText = (status) => {
  const statusMap = {
    'present': '出勤',
    'absent': '缺勤',
    'late': '迟到',
    'leave': '请假',
    'location_invalid': '位置异常'
  }
  return statusMap[status] || status
}

// 打开二维码扫描器
const openQRScanner = () => {
  ElMessageBox.prompt('请输入签到会话ID或扫描二维码', '扫码签到', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputPlaceholder: '请输入会话ID',
    inputValidator: (value) => {
      if (!value) {
        return '请输入会话ID'
      }
      return true
    }
  }).then(({ value }) => {
    // 跳转到扫码签到页面
    router.push(`/attendance/scan/${value}`)
  }).catch(() => {
    // 用户取消
  })
}

// 组件挂载时获取数据
onMounted(() => {
  getAttendanceRecords()
  getStats()
})
</script>

<style scoped>
.student-attendance-container {
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

.card-header h3 {
  margin: 0;
  color: #303133;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.filter-section {
  margin-bottom: 20px;
  padding: 20px;
  background-color: #fafafa;
  border-radius: 4px;
}

.pagination-wrapper {
  margin-top: 20px;
  text-align: center;
}

.stats-card {
  margin-top: 20px;
}

.stats-content {
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 20px 0;
}

.stat-item {
  text-align: center;
}

.stat-number {
  font-size: 32px;
  font-weight: bold;
  color: #409eff;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .student-attendance-container {
    padding: 10px;
  }
  
  .filter-section .el-form {
    display: block;
  }
  
  .filter-section .el-form-item {
    display: block;
    margin-bottom: 15px;
  }
  
  .stats-content {
    flex-wrap: wrap;
  }
  
  .stat-item {
    flex: 1;
    min-width: 80px;
    margin: 10px 0;
  }
}
</style>