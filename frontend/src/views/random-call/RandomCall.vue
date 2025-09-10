<template>
  <div class="random-call-container">
    <!-- 点名设置卡片 -->
    <el-card class="random-call-card">
      <template #header>
        <div class="card-header">
          <h3>随机点名设置</h3>
          <el-button type="primary" @click="startRandomCall" :disabled="!selectedClassId || isRolling" :loading="isRolling">
            <el-icon><Refresh /></el-icon>
            {{ isRolling ? '点名中...' : '开始点名' }}
          </el-button>
        </div>
      </template>
      <div class="call-settings">
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="选择班级">
              <el-select v-model="selectedClassId" placeholder="请选择班级" style="width: 100%;">
                <el-option v-for="cls in classes" :key="cls.id" :label="cls.name" :value="cls.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="点名人数">
              <el-input-number v-model="callCount" :min="1" :max="10" placeholder="点名人数" style="width: 100%;" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="排除已点名">
              <el-switch v-model="excludeCalled" active-text="是" inactive-text="否" />
            </el-form-item>
          </el-col>
        </el-row>
      </div>
    </el-card>

    <!-- 点名结果卡片 -->
    <el-card class="random-call-card" v-if="calledStudents.length > 0">
      <template #header>
        <div class="card-header">
          <h3>点名结果</h3>
          <el-button @click="saveCallRecord" :loading="saving">保存记录</el-button>
        </div>
      </template>
      <div class="call-result">
        <div class="rolling-display" v-if="isRolling">
          <div class="rolling-name">{{ rollingName }}</div>
          <div class="rolling-text">正在随机选择...</div>
        </div>
        <div class="result-list" v-else>
          <el-row :gutter="20">
            <el-col :span="8" v-for="(student, index) in calledStudents" :key="index">
              <div class="student-card">
                <div class="student-avatar">
                  <el-avatar :size="60">{{ student.name.charAt(0) }}</el-avatar>
                </div>
                <div class="student-info">
                  <h4>{{ student.name }}</h4>
                  <p>学号: {{ student.studentNumber }}</p>
                  <p>班级: {{ student.className }}</p>
                </div>
              </div>
            </el-col>
          </el-row>
        </div>
      </div>
    </el-card>

    <!-- 点名历史记录 -->
    <el-card class="random-call-card">
      <template #header>
        <div class="card-header">
          <h3>点名历史</h3>
          <div class="header-actions">
            <el-select v-model="filterClassId" placeholder="筛选班级" style="width: 120px; margin-right: 10px;">
              <el-option label="全部班级" value="" />
              <el-option v-for="cls in classes" :key="cls.id" :label="cls.name" :value="cls.id" />
            </el-select>
            <el-button type="warning" @click="handleResetCallStatus" :loading="resetting">重置点名状态</el-button>
            <el-button @click="loadCallHistory">刷新</el-button>
          </div>
        </div>
      </template>
      
      <el-table :data="callHistory" v-loading="loading" style="width: 100%">
        <el-table-column prop="className" label="班级" width="120" />
        <el-table-column prop="studentNames" label="被点名学生" min-width="200" show-overflow-tooltip />
        <el-table-column prop="teacherName" label="点名教师" width="120" />
        <el-table-column prop="createdAt" label="点名时间" width="180" />
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button size="small" @click="viewCallDetail(row)">查看</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="loadCallHistory"
        @current-change="loadCallHistory"
        style="margin-top: 20px; text-align: right;"
      />
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { 
  getRandomCallHistory, 
  createRandomCall,
  getClasses,
  getStudentsByClass,
  resetCallStatus
} from '@/api/randomCall'

const userStore = useUserStore()
const userRole = computed(() => userStore.user?.role)

// 响应式数据
const loading = ref(false)
const saving = ref(false)
const isRolling = ref(false)
const resetting = ref(false)
const classes = ref([])
const callHistory = ref([])
const calledStudents = ref([])
const availableStudents = ref([])
const rollingName = ref('')

// 设置参数
const selectedClassId = ref('')
const callCount = ref(1)
const excludeCalled = ref(true)
const filterClassId = ref('')

// 分页参数
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

// 加载班级列表
const loadClasses = async () => {
  try {
    const response = await getClasses()
    classes.value = response.classes || []
  } catch (error) {
    ElMessage.error('加载班级列表失败')
    console.error('加载班级列表失败:', error)
  }
}

// 加载点名历史
const loadCallHistory = async () => {
  try {
    loading.value = true
    const params = {
      page: currentPage.value,
      limit: pageSize.value,
      classId: filterClassId.value || undefined
    }
    const response = await getRandomCallHistory(params)
    callHistory.value = response.calls || []
    total.value = response.pagination?.total || 0
  } catch (error) {
    ElMessage.error('加载点名历史失败')
    console.error('加载点名历史失败:', error)
  } finally {
    loading.value = false
  }
}

// 获取班级学生列表
const loadStudents = async (classId) => {
  try {
    const response = await getStudentsByClass(classId)
    availableStudents.value = response.students || []
  } catch (error) {
    ElMessage.error('加载学生列表失败')
    console.error('加载学生列表失败:', error)
    availableStudents.value = []
  }
}

// 开始随机点名
const startRandomCall = async () => {
  if (!selectedClassId.value) {
    ElMessage.warning('请先选择班级')
    return
  }

  try {
    // 加载学生列表
    await loadStudents(selectedClassId.value)
    
    if (availableStudents.value.length === 0) {
      ElMessage.warning('该班级没有学生')
      return
    }

    // 过滤已点名学生
    let candidateStudents = [...availableStudents.value]
    if (excludeCalled.value && callHistory.value.length > 0) {
      const calledStudentIds = new Set()
      callHistory.value.forEach(record => {
        if (record.students) {
          record.students.forEach(student => {
            calledStudentIds.add(student.id)
          })
        }
      })
      candidateStudents = candidateStudents.filter(student => !calledStudentIds.has(student.id))
    }

    if (candidateStudents.length === 0) {
      ElMessage.warning('没有可点名的学生')
      return
    }

    // 开始滚动动画
    isRolling.value = true
    calledStudents.value = []
    
    // 滚动动画
    const rollDuration = 2000 // 2秒
    const rollInterval = 100 // 100ms更新一次
    const rollTimes = rollDuration / rollInterval
    
    let rollCount = 0
    const rollTimer = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * candidateStudents.length)
      rollingName.value = candidateStudents[randomIndex].name
      
      rollCount++
      if (rollCount >= rollTimes) {
        clearInterval(rollTimer)
        finishRandomCall(candidateStudents)
      }
    }, rollInterval)
    
  } catch (error) {
    ElMessage.error('点名失败')
    isRolling.value = false
  }
}

// 完成随机点名
const finishRandomCall = (candidateStudents) => {
  const actualCallCount = Math.min(callCount.value, candidateStudents.length)
  const selectedStudents = []
  const usedIndices = new Set()
  
  // 获取当前选中班级的名称
  const selectedClass = classes.value.find(cls => cls.id === selectedClassId.value)
  const className = selectedClass ? selectedClass.name : '未知班级'
  
  // 随机选择学生
  while (selectedStudents.length < actualCallCount) {
    const randomIndex = Math.floor(Math.random() * candidateStudents.length)
    if (!usedIndices.has(randomIndex)) {
      usedIndices.add(randomIndex)
      const student = candidateStudents[randomIndex]
      selectedStudents.push({
        ...student,
        className: className
      })
    }
  }
  
  calledStudents.value = selectedStudents
  isRolling.value = false
  rollingName.value = ''
  
  ElMessage.success(`成功点名 ${selectedStudents.length} 位学生`)
}

// 保存点名记录
const saveCallRecord = async () => {
  if (calledStudents.value.length === 0) {
    ElMessage.warning('没有点名结果可保存')
    return
  }
  
  try {
    saving.value = true
    const callData = {
      classId: selectedClassId.value,
      studentIds: calledStudents.value.map(student => student.id),
      callType: 'random'
    }
    
    await createRandomCall(callData)
    ElMessage.success('点名记录保存成功')
    
    // 重新加载历史记录
    loadCallHistory()
    
    // 清空结果
    calledStudents.value = []
  } catch (error) {
    console.error('保存点名记录失败:', error)
    ElMessage.error(`保存点名记录失败: ${error.response?.data?.message || error.message || '未知错误'}`)
  } finally {
    saving.value = false
  }
}

// 查看点名详情
const viewCallDetail = (record) => {
  const studentNames = record.studentNames || (record.students ? record.students.map(s => s.name).join('、') : '无')
  ElMessageBox.alert(
    `班级：${record.className}\n被点名学生：${studentNames}\n点名教师：${record.teacherName}\n点名时间：${record.createdAt}`,
    '点名详情',
    { confirmButtonText: '确定' }
  )
}

// 重置点名状态
const handleResetCallStatus = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要重置所有点名状态吗？重置后所有学生都可以重新被点名。',
      '确认重置',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    resetting.value = true
    await resetCallStatus()
    ElMessage.success('点名状态重置成功')
    
    // 重新加载历史记录
    loadCallHistory()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('重置点名状态失败:', error)
      ElMessage.error(`重置点名状态失败: ${error.response?.data?.message || error.message || '未知错误'}`)
    }
  } finally {
    resetting.value = false
  }
}

// 组件挂载时加载数据
onMounted(() => {
  loadClasses()
  loadCallHistory()
})
</script>

<style scoped>
.random-call-container {
  padding: 20px;
}

.random-call-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.call-settings {
  padding: 10px 0;
}

.call-result {
  padding: 20px 0;
}

.rolling-display {
  text-align: center;
  padding: 40px 0;
}

.rolling-name {
  font-size: 48px;
  font-weight: bold;
  color: #409eff;
  margin-bottom: 20px;
  animation: pulse 1s infinite;
}

.rolling-text {
  font-size: 18px;
  color: #666;
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
}

.result-list {
  padding: 20px 0;
}

.student-card {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  margin-bottom: 20px;
  transition: all 0.3s ease;
  border: 2px solid #e9ecef;
}

.student-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
  border-color: #409eff;
}

.student-avatar {
  margin-bottom: 15px;
}

.student-info h4 {
  margin: 10px 0 5px 0;
  color: #303133;
  font-size: 18px;
}

.student-info p {
  margin: 5px 0;
  color: #606266;
  font-size: 14px;
}

.header-actions {
  display: flex;
  align-items: center;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .random-call-container {
    padding: 10px;
  }
  
  .call-settings .el-col {
    margin-bottom: 15px;
  }
  
  .rolling-name {
    font-size: 36px;
  }
  
  .student-card {
    margin-bottom: 15px;
  }
  
  .header-actions {
    flex-direction: column;
    gap: 10px;
  }
  
  .header-actions .el-select {
    margin-right: 0 !important;
    margin-bottom: 10px;
  }
}
</style>