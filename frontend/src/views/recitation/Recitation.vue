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
            <el-button v-if="userRole === 'teacher' || userRole === 'admin'" type="success" @click="showManualCheckDialog = true">
              <el-icon><Plus /></el-icon>
              手动打卡
            </el-button>
            <el-button v-if="userRole === 'teacher' || userRole === 'admin'" type="primary" @click="showQuickMarkDialog = true">
              <el-icon><Check /></el-icon>
              快速标记完成
            </el-button>
          </div>
        </div>
      </template>
      
      <el-table :data="recitations" v-loading="loading" style="width: 100%">
        <el-table-column prop="studentName" label="学生" width="120" v-if="userRole === 'teacher' || userRole === 'admin'" />
        <el-table-column prop="className" label="班级" width="120" />
        <el-table-column label="课文" width="150">
          <template #default="{ row }">
            <div v-if="row.article">
              <div style="font-weight: 500;">{{ row.article.title }}</div>
              <el-tag size="small" style="margin-top: 4px;">{{ row.article.category }}</el-tag>
            </div>
            <span v-else>自由背诵</span>
          </template>
        </el-table-column>
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
        <el-table-column label="操作" width="160">
          <template #default="{ row }">
            <el-button size="small" @click="viewRecitation(row)">查看</el-button>
            <el-button v-if="row.article" size="small" type="info" @click="viewArticle(row.article)">课文</el-button>
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

    <!-- 快速标记完成对话框 -->
    <el-dialog v-model="showQuickMarkDialog" title="快速标记完成" width="900px">
      <div class="quick-mark-container">
        <!-- 班级选择 -->
        <div class="step-section">
          <h3>1. 选择班级</h3>
          <el-select v-model="quickMarkForm.classId" placeholder="请选择班级" style="width: 300px;" @change="loadStudentsForQuickMark">
            <el-option v-for="cls in classes" :key="cls.id" :label="cls.name" :value="cls.id" />
          </el-select>
        </div>

        <!-- 学生选择 -->
        <div class="step-section" v-if="quickMarkForm.classId">
          <h3>2. 选择学生</h3>
          <div class="student-grid">
            <div 
              v-for="student in quickMarkStudents" 
              :key="student.id" 
              class="student-card"
              :class="{ 'selected': quickMarkForm.studentId === student.id }"
              @click="selectStudent(student.id)"
            >
              <div class="student-avatar">{{ student.name.charAt(0) }}</div>
              <div class="student-name">{{ student.name }}</div>
            </div>
          </div>
        </div>

        <!-- 课文选择 -->
        <div class="step-section" v-if="quickMarkForm.studentId">
          <h3>3. 选择课文</h3>
          <div class="article-grid">
            <div 
              v-for="article in articles" 
              :key="article.id" 
              class="article-card"
              :class="{ 'selected': quickMarkForm.articleId === article.id }"
              @click="selectArticle(article.id)"
            >
              <div class="article-title">{{ article.title }}</div>
              <div class="article-meta">
                <el-tag size="small">{{ article.category }}</el-tag>
                <el-tag size="small" type="warning">难度: {{ article.difficulty }}</el-tag>
              </div>
            </div>
          </div>
        </div>

        <!-- 备注 -->
        <div class="step-section" v-if="quickMarkForm.articleId">
          <h3>4. 添加备注（可选）</h3>
          <el-input v-model="quickMarkForm.remark" type="textarea" :rows="2" placeholder="请输入备注" style="width: 100%;" />
        </div>
      </div>
      <template #footer>
        <el-button @click="showQuickMarkDialog = false">取消</el-button>
        <el-button type="primary" @click="handleQuickMark" :loading="quickMarking">确认标记</el-button>
      </template>
    </el-dialog>

    <!-- 手动打卡对话框 -->
    <el-dialog v-model="showManualCheckDialog" title="手动打卡" width="600px">
      <el-form :model="manualCheckForm" :rules="manualCheckRules" ref="manualCheckFormRef" label-width="100px">
        <el-form-item label="选择班级" prop="classId">
          <el-select v-model="manualCheckForm.classId" placeholder="请选择班级" style="width: 100%;" @change="loadStudentsForManualCheck">
            <el-option v-for="cls in classes" :key="cls.id" :label="cls.name" :value="cls.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="选择学生" prop="studentId">
          <el-select v-model="manualCheckForm.studentId" placeholder="请选择学生" style="width: 100%;" :disabled="!manualCheckForm.classId">
            <el-option v-for="student in manualCheckStudents" :key="student.id" :label="student.name" :value="student.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="选择课文" prop="articleId">
          <el-select v-model="manualCheckForm.articleId" placeholder="请选择课文" style="width: 100%;" @change="onManualCheckArticleChange">
            <el-option v-for="article in articles" :key="article.id" :label="article.title" :value="article.id" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="manualCheckSelectedArticle" label="课文内容">
          <div class="article-content">
            <h4>{{ manualCheckSelectedArticle.title }}</h4>
            <p class="article-text">{{ manualCheckSelectedArticle.content }}</p>
            <div class="article-meta">
              <el-tag>{{ manualCheckSelectedArticle.category }}</el-tag>
              <el-tag type="warning">难度: {{ manualCheckSelectedArticle.difficulty }}</el-tag>
            </div>
          </div>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="manualCheckForm.remark" type="textarea" :rows="3" placeholder="请输入备注（可选）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showManualCheckDialog = false">取消</el-button>
        <el-button type="primary" @click="handleManualCheck" :loading="manualChecking">确认打卡</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Check } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { 
  getRecitationList, 
  submitRecitation,
  gradeRecitation,
  getRecitationStats,
  getClasses,
  markRecitationComplete
} from '@/api/recitation'
import { getArticleList } from '@/api/article'
import { getUserList, getUsersByClass } from '@/api/user'

const userStore = useUserStore()
const userRole = computed(() => userStore.userRole)

// 数据状态
const loading = ref(false)
const grading = ref(false)
const submitting = ref(false)
const manualChecking = ref(false)
const quickMarking = ref(false)
const recitations = ref([])
const classes = ref([])
const studentClasses = ref([])
const articles = ref([])
const classStudents = ref([])
const manualCheckStudents = ref([])
const quickMarkStudents = ref([])
const selectedArticle = ref(null)
const manualCheckSelectedArticle = ref(null)
const quickMarkSelectedArticle = ref(null)
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const filterStatus = ref('')
const filterClassId = ref('')
const todaySubmitted = ref(false)

// 对话框状态
const showGradeDialog = ref(false)
const showSubmitDialog = ref(false)
const showManualCheckDialog = ref(false)
const showQuickMarkDialog = ref(false)
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

const manualCheckForm = reactive({
  classId: '',
  studentId: '',
  articleId: '',
  remark: ''
})

const quickMarkForm = reactive({
  classId: '',
  studentId: '',
  articleId: '',
  remark: ''
})

// 表单验证规则
const gradeRules = {
  score: [{ required: true, message: '请输入分数', trigger: 'blur' }]
}

const submitRules = {
  classId: [{ required: true, message: '请选择班级', trigger: 'change' }],
  content: [{ required: true, message: '请输入背诵内容', trigger: 'blur' }]
}

const manualCheckRules = {
  classId: [{ required: true, message: '请选择班级', trigger: 'change' }],
  studentId: [{ required: true, message: '请选择学生', trigger: 'change' }],
  articleId: [{ required: true, message: '请选择课文', trigger: 'change' }]
}

const quickMarkRules = {
  classId: [{ required: true, message: '请选择班级', trigger: 'change' }],
  studentId: [{ required: true, message: '请选择学生', trigger: 'change' }],
  articleId: [{ required: true, message: '请选择课文', trigger: 'change' }]
}

// 统计数据
const recitationStats = ref({ total: 0, pending: 0, graded: 0, averageScore: 0 })

// 表单引用
const gradeFormRef = ref()
const submitFormRef = ref()
const manualCheckFormRef = ref()
const quickMarkFormRef = ref()

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
    // 后端API已经根据用户权限过滤了班级，直接使用返回的数据
    classes.value = response.classes || []
    
    // 学生角色需要单独设置studentClasses
    if (userRole.value === 'student') {
      studentClasses.value = classes.value
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

const viewArticle = (article) => {
  // 查看课文详情
  const content = `
    <div style="text-align: left;">
      <h3 style="margin-bottom: 15px; color: #333;">${article.title}</h3>
      <div style="margin-bottom: 10px;">
        <span style="background: #f0f2f5; padding: 4px 8px; border-radius: 4px; margin-right: 8px; font-size: 12px;">${article.category}</span>
        <span style="background: #fff7e6; color: #fa8c16; padding: 4px 8px; border-radius: 4px; font-size: 12px;">难度: ${article.difficulty}</span>
      </div>
      <div style="line-height: 1.8; color: #555; white-space: pre-wrap; max-height: 400px; overflow-y: auto; border: 1px solid #e8e8e8; padding: 15px; border-radius: 6px; background: #fafafa;">${article.content}</div>
    </div>
  `
  
  ElMessageBox({
    title: '课文详情',
    message: content,
    dangerouslyUseHTMLString: true,
    confirmButtonText: '确定',
    customStyle: {
      width: '600px'
    }
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

const resetTeacherSubmitForm = () => {
  Object.assign(teacherSubmitForm, {
    classId: '',
    studentId: '',
    articleId: '',
    remark: ''
  })
  classStudents.value = []
  selectedArticle.value = null
}

const loadArticles = async () => {
  try {
    const response = await getArticleList()
    articles.value = response.articles || []
  } catch (error) {
    console.error('加载课文列表失败:', error)
    ElMessage.error('加载课文列表失败')
  }
}

const loadStudentsForManualCheck = async () => {
  if (!manualCheckForm.classId) {
    manualCheckStudents.value = []
    return
  }
  
  try {
    const response = await getUsersByClass(manualCheckForm.classId)
    // 后端返回结构是 { class: { students: [...] } }
    manualCheckStudents.value = response.class?.students || []
    manualCheckForm.studentId = '' // 重置学生选择
  } catch (error) {
    console.error('加载学生列表失败:', error)
    ElMessage.error('加载学生列表失败')
  }
}

const onManualCheckArticleChange = () => {
  if (manualCheckForm.articleId) {
    manualCheckSelectedArticle.value = articles.value.find(article => article.id === manualCheckForm.articleId)
  } else {
    manualCheckSelectedArticle.value = null
  }
}

const handleManualCheck = async () => {
  try {
    await manualCheckFormRef.value.validate()
    manualChecking.value = true
    
    const checkData = {
      studentId: manualCheckForm.studentId,
      articleId: manualCheckForm.articleId,
      classId: manualCheckForm.classId,
      remark: manualCheckForm.remark
    }
    
    await markRecitationComplete(checkData)
    ElMessage.success('手动打卡成功')
    
    showManualCheckDialog.value = false
    resetManualCheckForm()
    loadRecitations()
    loadStats()
  } catch (error) {
    console.error('手动打卡失败:', error)
    ElMessage.error('手动打卡失败')
  } finally {
    manualChecking.value = false
  }
}

const resetManualCheckForm = () => {
  Object.assign(manualCheckForm, {
    classId: '',
    studentId: '',
    articleId: '',
    remark: ''
  })
  manualCheckStudents.value = []
  manualCheckSelectedArticle.value = null
}

// 快速标记相关方法
const loadStudentsForQuickMark = async () => {
  if (!quickMarkForm.classId) {
    quickMarkStudents.value = []
    return
  }
  
  try {
    const response = await getUserList({ classId: quickMarkForm.classId, role: 'student' })
    quickMarkStudents.value = response.users || []
  } catch (error) {
    console.error('加载学生列表失败:', error)
    ElMessage.error('加载学生列表失败')
  }
}

const onQuickMarkArticleChange = () => {
  if (quickMarkForm.articleId) {
    quickMarkSelectedArticle.value = articles.value.find(article => article.id === quickMarkForm.articleId)
  } else {
    quickMarkSelectedArticle.value = null
  }
}

const resetQuickMarkForm = () => {
  Object.assign(quickMarkForm, {
    classId: '',
    studentId: '',
    articleId: '',
    remark: ''
  })
  quickMarkStudents.value = []
  quickMarkSelectedArticle.value = null
}

const selectStudent = (studentId) => {
  quickMarkForm.studentId = studentId
  // 重置课文选择
  quickMarkForm.articleId = ''
  quickMarkSelectedArticle.value = null
}

const selectArticle = (articleId) => {
  quickMarkForm.articleId = articleId
  quickMarkSelectedArticle.value = articles.value.find(article => article.id === articleId)
}

const handleQuickMark = async () => {
  try {
    await quickMarkFormRef.value.validate()
    quickMarking.value = true
    
    const markData = {
      studentId: quickMarkForm.studentId,
      articleId: quickMarkForm.articleId,
      remark: quickMarkForm.remark
    }
    
    await markRecitationComplete(markData)
    ElMessage.success('标记背诵完成成功')
    
    showQuickMarkDialog.value = false
    resetQuickMarkForm()
    loadRecitations()
    loadStats()
  } catch (error) {
    console.error('标记背诵完成失败:', error)
    ElMessage.error(error.response?.data?.message || '标记背诵完成失败')
  } finally {
    quickMarking.value = false
  }
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
  loadArticles()
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

.article-content {
  background-color: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.article-content h4 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 18px;
  font-weight: 600;
}

.article-text {
  margin: 0 0 15px 0;
  line-height: 1.8;
  color: #555;
  font-size: 14px;
  white-space: pre-wrap;
  max-height: 200px;
  overflow-y: auto;
}

.article-meta {
  display: flex;
  gap: 10px;
  align-items: center;
}

.article-preview {
  background-color: #f8f9fa;
  padding: 15px;
  border-radius: 6px;
  border: 1px solid #e9ecef;
}

.article-preview h4 {
  margin: 0 0 10px 0;
  color: #333;
  font-size: 16px;
  font-weight: 600;
}

.article-preview .article-meta {
  margin-top: 8px;
}

/* 快速标记样式 */
.quick-mark-container {
  padding: 20px 0;
}

.step-section {
  margin-bottom: 30px;
}

.step-section h3 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 16px;
  font-weight: 600;
}

.student-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 15px;
  margin-top: 10px;
}

.student-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 15px;
  border: 2px solid #e4e7ed;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: #fff;
}

.student-card:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
}

.student-card.selected {
  border-color: #409eff;
  background-color: #ecf5ff;
}

.student-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 16px;
  margin-bottom: 8px;
}

.student-name {
  font-size: 14px;
  color: #333;
  text-align: center;
  font-weight: 500;
}

.article-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 15px;
  margin-top: 10px;
}

.article-card {
  padding: 20px;
  border: 2px solid #e4e7ed;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: #fff;
}

.article-card:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
}

.article-card.selected {
  border-color: #409eff;
  background-color: #ecf5ff;
}

.article-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 10px;
  line-height: 1.4;
}

.article-card .article-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

@media (max-width: 768px) {
  .recitation-container {
    padding: 10px;
  }
  
  .student-grid {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 10px;
  }
  
  .article-grid {
    grid-template-columns: 1fr;
  }
  
  .quick-mark-container {
    padding: 10px 0;
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