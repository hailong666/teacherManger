<template>
  <div class="attendance-scan-container">
    <el-card class="scan-card">
      <template #header>
        <div class="card-header">
          <h3>学生签到</h3>
        </div>
      </template>
      
      <div class="scan-content">
        <div v-if="loading" class="loading-section">
          <el-icon class="is-loading"><Loading /></el-icon>
          <p>正在处理签到...</p>
        </div>
        
        <div v-else-if="scanResult" class="result-section">
          <div class="result-icon">
            <el-icon v-if="scanResult.success" class="success-icon"><SuccessFilled /></el-icon>
            <el-icon v-else class="error-icon"><CircleCloseFilled /></el-icon>
          </div>
          <h4 :class="scanResult.success ? 'success-text' : 'error-text'">
            {{ scanResult.message }}
          </h4>
          <div v-if="scanResult.success && scanResult.data" class="attendance-info">
            <p><strong>签到时间：</strong>{{ scanResult.data.attendanceTime }}</p>
            <p><strong>签到状态：</strong>{{ getStatusText(scanResult.data.status) }}</p>
          </div>
        </div>
        
        <div v-else class="scan-section">
          <div class="scan-info">
            <el-icon class="scan-icon"><Camera /></el-icon>
            <h4>请确认签到信息</h4>
            <p>会话ID: {{ sessionId }}</p>
          </div>
          
          <div class="location-section">
            <el-checkbox v-model="enableLocation">启用位置验证</el-checkbox>
            <p v-if="enableLocation" class="location-tip">
              启用位置验证后，系统将验证您的签到位置
            </p>
          </div>
          
          <div class="action-buttons">
            <el-button type="primary" @click="confirmAttendance" :loading="submitting">
              确认签到
            </el-button>
            <el-button @click="goBack">返回</el-button>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Loading, SuccessFilled, CircleCloseFilled, Camera } from '@element-plus/icons-vue'
import { scanQRCodeAttendance } from '@/api/attendance.js'

const route = useRoute()
const router = useRouter()

// 响应式数据
const loading = ref(false)
const submitting = ref(false)
const enableLocation = ref(false)
const scanResult = ref(null)
const sessionId = ref('')
const currentLocation = ref(null)

// 获取会话ID
onMounted(() => {
  sessionId.value = route.params.sessionId
  if (!sessionId.value) {
    ElMessage.error('无效的签到链接')
    router.push('/')
  }
})

// 获取当前位置
const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('浏览器不支持地理位置'))
      return
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        })
      },
      (error) => {
        reject(error)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    )
  })
}

// 确认签到
const confirmAttendance = async () => {
  submitting.value = true
  
  try {
    let location = null
    
    // 如果启用位置验证，获取当前位置
    if (enableLocation.value) {
      try {
        location = await getCurrentLocation()
      } catch (error) {
        ElMessage.warning('获取位置失败，将继续签到但不验证位置')
      }
    }
    
    // 调用签到API
    const response = await scanQRCodeAttendance({
      sessionId: sessionId.value,
      location
    })
    
    scanResult.value = {
      success: true,
      message: response.message || '签到成功',
      data: response
    }
    
    ElMessage.success(response.message || '签到成功')
    
  } catch (error) {
    scanResult.value = {
      success: false,
      message: error.response?.data?.message || '签到失败',
      data: null
    }
    
    ElMessage.error(error.response?.data?.message || '签到失败')
  } finally {
    submitting.value = false
  }
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

// 返回
const goBack = () => {
  router.go(-1)
}
</script>

<style scoped>
.attendance-scan-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 20px;
  background-color: #f5f5f5;
}

.scan-card {
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
}

.card-header {
  text-align: center;
}

.card-header h3 {
  margin: 0;
  color: #303133;
}

.scan-content {
  text-align: center;
  padding: 20px;
}

.loading-section {
  padding: 40px 0;
}

.loading-section .el-icon {
  font-size: 48px;
  color: #409eff;
  margin-bottom: 16px;
}

.result-section {
  padding: 40px 0;
}

.result-icon {
  margin-bottom: 20px;
}

.success-icon {
  font-size: 64px;
  color: #67c23a;
}

.error-icon {
  font-size: 64px;
  color: #f56c6c;
}

.success-text {
  color: #67c23a;
  margin-bottom: 20px;
}

.error-text {
  color: #f56c6c;
  margin-bottom: 20px;
}

.attendance-info {
  background-color: #f0f9ff;
  border: 1px solid #b3d8ff;
  border-radius: 4px;
  padding: 16px;
  margin-top: 20px;
  text-align: left;
}

.attendance-info p {
  margin: 8px 0;
  color: #606266;
}

.scan-section {
  padding: 20px 0;
}

.scan-info {
  margin-bottom: 30px;
}

.scan-icon {
  font-size: 48px;
  color: #409eff;
  margin-bottom: 16px;
}

.scan-info h4 {
  margin: 16px 0 8px 0;
  color: #303133;
}

.scan-info p {
  color: #909399;
  margin: 0;
}

.location-section {
  margin: 30px 0;
  padding: 20px;
  background-color: #fafafa;
  border-radius: 4px;
}

.location-tip {
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
}

.action-buttons {
  margin-top: 30px;
}

.action-buttons .el-button {
  margin: 0 8px;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .attendance-scan-container {
    padding: 10px;
  }
  
  .scan-card {
    margin: 0;
  }
  
  .scan-content {
    padding: 15px;
  }
  
  .action-buttons .el-button {
    display: block;
    width: 100%;
    margin: 8px 0;
  }
}
</style>