<template>
  <div class="recitation-container">
    <!-- 学生提交背诵打卡卡片 -->
    <el-card class="recitation-card" v-if="userRole === 'student'">
      <template #header>
        <div class="card-header">
          <h3>今日背诵打卡</h3>
          <el-button type="primary" @click="showSubmitDialog = true" :disabled="todaySubmitted">
            <el-icon><Plus /></el-icon>
            {{ todaySubmitted ? '今日已打卡' : '提交打卡' }}
          </el-button>
        </div>
      </template>
      <div class="task-stats">
        <el-row :gutter="20">
          <el-col :span="8">
            <el-statistic title="总打卡数" :value="recitationStats.total" />
          </el-col>
          <el-col :span="8">
            <el-statistic title="已评分" :value="recitationStats.graded" />
          </el-col>
          <el-col :span="8">
            <el-statistic title="平均分" :value="recitationStats.averageScore" />
          </el-col>
        </el-row>
      </div>
    </el-card>

    <!-- 教师统计卡片 -->
    <el-card class="recitation-card" v-if="userRole === 'teacher' || userRole === 'admin'">
      <template #header>
        <div class="card-header">
          <h3>背诵打卡统计</h3>
          <el-button @click="loadStats">刷新统计</el-button>
        </div>
      </template>
      <div class="task-stats">
        <el-row :gutter="20">
          <el-col :span="6">
            <el-statistic title="总打卡数" :value="recitationStats.total" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="待评分" :value="recitationStats.pending" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="已评分" :value="recitationStats.graded" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="平均分" :value="recitationStats.averageScore" />
          </el-col>
        </el-row>
      </div>
    </el-card>

    <!-- 背诵打卡记录列表 -->
    <el-card class="recitation-card">
      <template #header>
        <div class="card-header">
          <h3>背诵打卡记录</h3>
          <div class="header-actions">
            <el-select v-model="filterStatus" placeholder="筛选状态" style="width: 120px; margin-right: 10px;">
              <el-option label="全部" value="" />
              <el-option label="待评分" value="pending" />
              <el-option label="已评分" value="graded" />
            </el-select>
            <el-select v-if="userRole === 'teacher' || userRole === 'admin'" v-model="filterClassId" placeholder="筛选班级" style="width: 120px; margin-right: 10px;">
              <el-option label="全部班级" value="" />
              <el-option v-for="cls in classes" :key="cls.id" :label="cls.name" :value="cls.id" />
            </el-select>
            <el-button @click="loadRecitations">刷新</el-button>
          </div>
        </div>
      </template>
      
      <el-table :data="recitations" v-loading="loading" style="width: 100%">
        <el-table-column prop="studentName" label="学生" width="120" v-if="userRole === 'teacher' || userRole === 'admin'" />
        <el-table-column prop="className" label="班级" width="120" />
        <el-table-column prop="content" label="背诵内容" min-width="200" show-overflow-tooltip />
        <el-table-column prop="audioUrl" label="音频" width="100">
          <template #default="{ row }">
            <el-button v-if="row.audioUrl" size="small" @click="playAudio(row.audioUrl)">播放</el-button>
            <span v-else>无音频</span>
          </template>
        </el-table-column>
        <el-table-column prop="score" label="分数" width="80">
          <template #default="{ row }">
            <span v-if="row.score !== null">{{ row.score }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">{{ getStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="提交时间" width="180" />
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button size="small" @click="viewRecitation(row)">查看</el-button>
            <el-button v-if="(userRole === 'teacher' || userRole === 'admin') && row.status === 'pending'" size="small" type="primary" @click="startGrading(row)">评分</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="loadRecitations"
        @current-change="loadRecitations"
        style="margin-top: 20px; text-align: right;"
      />
    </el-card>

    <!-- 评分对话框 -->
    <el-dialog v-model="showGradeDialog" title="评分背诵" width="500px">
      <el-form :model="gradeForm" :rules="gradeRules" ref="gradeFormRef" label-width="80px">
        <el-form-item label="学生">
          <span>{{ currentRecitation?.studentName }}</span>
        </el-form-item>
        <el-form-item label="背诵内容">
          <div class="recitation-content">{{ currentRecitation?.content }}</div>
        </el-form-item>
        <el-form-item label="分数" prop="score">
          <el-input-number v-model="gradeForm.score" :min="0" :max="100" placeholder="请输入分数" style="width: 100%;" />
        </el-form-item>
        <el-form-item label="评语">
          <el-input v-model="gradeForm.feedback" type="textarea" :rows="3" placeholder="请输入评语（可选）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showGradeDialog = false">取消</el-button>
        <el-button type="primary" @click="handleGrade" :loading="grading">提交评分</el-button>
      </template>
    </el-dialog>

    <!-- 提交背诵打卡对话框 -->
    <el-dialog v-model="showSubmitDialog" title="提交背诵打卡" width="500px">
      <el-form :model="submitForm" :rules="submitRules" ref="submitFormRef" label-width="100px">
        <el-form-item label="选择班级" prop="classId">
          <el-select v-model="submitForm.classId" placeholder="请选择班级" style="width: 100%;">
            <el-option v-for="cls in studentClasses" :key="cls.id" :label="cls.name" :value="cls.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="背诵内容" prop="content">
          <el-input v-model="submitForm.content" type="textarea" :rows="4" placeholder="请输入您的背诵内容" />
        </el-form-item>
        <el-form-item label="音频文件">
          <el-input v-model="submitForm.audioUrl" placeholder="请输入音频文件URL（可选）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showSubmitDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { 
  getRecitationList, 
  submitRecitation,
  gradeRecitation,
  getRecitationStats,
  getClasses
} from '@/api/recitation'

const userStore = useUserStore()
const userRole = computed(() => userStore.user?.role)

// 数据状态
const loading = ref(false)
const grading = ref(false)
const submitting = ref(false)
const recitations = ref([])
const classes = ref([])
const studentClasses = ref([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const filterStatus = ref('')
const filterClassId = ref('')
const todaySubmitted = ref(false)

// 对话框状态
const showGradeDialog = ref(false)
const showSubmitDialog = ref(false)
const currentRecitation = ref(null)

// 表单数据
const gradeForm = reactive({
  score: null,
  feedback: ''
})

const submitForm = reactive({
  classId: '',
  content: '',
  audioUrl: ''
})

// 表单验证规则
const gradeRules = {
  score: [{ required: true, message: '请输入分数', trigger: 'blur' }]
}

const submitRules = {
  classId: [{ required: true, message: '请选择班级', trigger: 'change' }],
  content: [{ required: true, message: '请输入背诵内容', trigger: 'blur' }]
}

// 统计数据
const recitationStats = ref({ total: 0, pending: 0, graded: 0, averageScore: 0 })

// 表单引用
const gradeFormRef = ref()
const submitFormRef = ref()

// 方法
const loadRecitations = async () => {
  try {
    loading.value = true
    const params = {
      page: currentPage.value,
      limit: pageSize.value,
      status: filterStatus.value,
      classId: filterClassId.value || undefined
    }
    const response = await getRecitationList(params)
    recitations.value = response.recitations || []
    total.value = response.pagination?.total || 0
    
    // 检查学生今日是否已提交
    if (userRole.value === 'student') {
      const today = new Date().toDateString()
      todaySubmitted.value = recitations.value.some(r => 
        r.studentId === userStore.user.id && 
        new Date(r.createdAt).toDateString() === today
      )
    }
  } catch (error) {
    console.error('加载背诵记录失败:', error)
    ElMessage.error('加载背诵记录失败')
  } finally {
    loading.value = false
  }
}

const loadClasses = async () => {
  try {
    const response = await getClasses()
    classes.value = response.classes || []
    
    // 学生只能看到自己的班级
    if (userRole.value === 'student') {
      studentClasses.value = classes.value.filter(cls => 
        userStore.user.classIds?.includes(cls.id)
      )
    }
  } catch (error) {
    console.error('加载班级列表失败:', error)
    ElMessage.error('加载班级列表失败')
  }
}

const loadStats = async () => {
  try {
    const response = await getRecitationStats()
    recitationStats.value = response.stats || { total: 0, pending: 0, graded: 0, averageScore: 0 }
  } catch (error) {
    console.error('加载统计数据失败:', error)
    ElMessage.error('加载统计数据失败')
  }
}

const handleGrade = async () => {
  try {
    await gradeFormRef.value.validate()
    grading.value = true
    
    await gradeRecitation(currentRecitation.value.id, gradeForm)
    ElMessage.success('评分成功')
    
    showGradeDialog.value = false
    resetGradeForm()
    loadRecitations()
    loadStats()
  } catch (error) {
    ElMessage.error('评分失败')
  } finally {
    grading.value = false
  }
}

const startGrading = (recitation) => {
  currentRecitation.value = recitation
  Object.assign(gradeForm, {
    score: null,
    feedback: ''
  })
  showGradeDialog.value = true
}

const handleSubmit = async () => {
  try {
    await submitFormRef.value.validate()
    submitting.value = true
    
    await submitRecitation(submitForm)
    ElMessage.success('提交成功')
    
    showSubmitDialog.value = false
    resetSubmitForm()
    loadRecitations()
    loadStats()
  } catch (error) {
    ElMessage.error('提交失败')
  } finally {
    submitting.value = false
  }
}

const viewRecitation = (recitation) => {
  // 查看背诵详情
  ElMessageBox.alert(recitation.content, '背诵内容', {
    confirmButtonText: '确定'
  })
}

const resetGradeForm = () => {
  Object.assign(gradeForm, {
    score: null,
    feedback: ''
  })
  currentRecitation.value = null
}

const resetSubmitForm = () => {
  Object.assign(submitForm, {
    classId: '',
    content: '',
    audioUrl: ''
  })
}

const playAudio = (audioUrl) => {
  if (audioUrl) {
    const audio = new Audio(audioUrl)
    audio.play().catch(() => {
      ElMessage.error('音频播放失败')
    })
  }
}

const getStatusType = (status) => {
  const types = {
    pending: 'warning',
    graded: 'success'
  }
  return types[status] || 'info'
}

const getStatusText = (status) => {
  const texts = {
    pending: '待评分',
    graded: '已评分'
  }
  return texts[status] || '未知'
}

// 生命周期
onMounted(() => {
  loadRecitations()
  loadClasses()
  loadStats()
})
</script>

<style scoped>
.recitation-container {
  padding: 20px;
}

.recitation-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  align-items: center;
}

.task-stats {
  padding: 10px 0;
}

.recitation-content {
  background-color: #f5f7fa;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 15px;
  line-height: 1.6;
}

@media (max-width: 768px) {
  .recitation-container {
    padding: 10px;
  }
  
  .card-header {
    flex-direction: column;
    gap: 10px;
  }
  
  .header-actions {
    width: 100%;
    justify-content: space-between;
  }
}
</style>