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
    <el-dialog v-model="showQuickMarkDialog" title="快速标记完成" width="1200px" top="5vh">
      <div class="quick-mark-container">
        <!-- 班级选择和操作栏 -->
        <div class="quick-mark-header">
          <div class="class-selector">
            <el-select v-model="quickMarkForm.classId" placeholder="请选择班级" style="width: 200px;" @change="loadStudentsForQuickMark">
              <el-option v-for="cls in classes" :key="cls.id" :label="cls.name" :value="cls.id" />
            </el-select>
          </div>
          <div class="batch-actions" v-if="quickMarkForm.classId">
            <el-button type="success" size="small" @click="batchMarkAll" :disabled="!hasSelectedItems">批量标记选中</el-button>
            <el-button type="warning" size="small" @click="clearAllSelections">清空选择</el-button>
            <span class="selection-count">已选择: {{ selectedCount }} 项</span>
          </div>
        </div>

        <!-- 快速标记表格 -->
        <div class="quick-mark-table" v-if="quickMarkForm.classId && quickMarkStudents.length > 0">
          <el-table 
            :data="quickMarkTableData" 
            border 
            stripe
            max-height="500px"
            @selection-change="handleSelectionChange"
          >
            <el-table-column type="selection" width="55" align="center" />
            <el-table-column prop="studentName" label="学生姓名" width="120" fixed="left">
              <template #default="{ row }">
                <div class="student-info">
                  <div class="student-avatar-small">{{ row.studentName.charAt(0) }}</div>
                  <span>{{ row.studentName }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column 
              v-for="article in articles" 
              :key="article.id" 
              :label="article.title" 
              :width="150"
              align="center"
            >
              <template #header>
                <div class="article-header">
                  <div class="article-title-small">{{ article.title }}</div>
                  <el-tag size="small" :type="getCategoryType(article.category)">{{ article.category }}</el-tag>
                </div>
              </template>
              <template #default="{ row }">
                <el-button 
                  :type="isMarked(row.studentId, article.id) ? 'success' : 'primary'"
                  :icon="isMarked(row.studentId, article.id) ? 'Check' : 'Plus'"
                  size="small"
                  @click="toggleMark(row.studentId, article.id)"
                  :disabled="quickMarking"
                >
                  {{ isMarked(row.studentId, article.id) ? '已标记' : '标记' }}
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 空状态 -->
        <div v-if="quickMarkForm.classId && quickMarkStudents.length === 0" class="empty-state">
          <el-empty description="该班级暂无学生" />
        </div>
        
        <div v-if="!quickMarkForm.classId" class="empty-state">
          <el-empty description="请先选择班级" />
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <div class="footer-info">
            <span v-if="quickMarkForm.classId">共 {{ quickMarkStudents.length }} 名学生，{{ articles.length }} 篇课文</span>
          </div>
          <div class="footer-actions">
            <el-button @click="showQuickMarkDialog = false">关闭</el-button>
            <el-button type="primary" @click="saveAllMarks" :loading="quickMarking" :disabled="!hasAnyMarks">保存所有标记</el-button>
          </div>
        </div>
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
  classId: ''
})

// 快速标记状态管理
const quickMarkData = ref(new Map()) // 存储标记状态: key为"studentId-articleId", value为true
const selectedTableRows = ref([]) // 表格选中的行
const quickMarkTableData = ref([]) // 表格数据

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
    quickMarkTableData.value = []
    return
  }
  
  try {
    const response = await getUsersByClass(quickMarkForm.classId)
    quickMarkStudents.value = response.class?.students || []
    
    // 构建表格数据
    quickMarkTableData.value = quickMarkStudents.value.map(student => ({
      studentId: student.id,
      studentName: student.name
    }))
    
    // 清空之前的标记状态
    quickMarkData.value.clear()
    selectedTableRows.value = []
  } catch (error) {
    console.error('加载学生列表失败:', error)
    ElMessage.error('加载学生列表失败')
  }
}

// 检查是否已标记
const isMarked = (studentId, articleId) => {
  return quickMarkData.value.has(`${studentId}-${articleId}`)
}

// 切换标记状态
const toggleMark = (studentId, articleId) => {
  const key = `${studentId}-${articleId}`
  if (quickMarkData.value.has(key)) {
    quickMarkData.value.delete(key)
  } else {
    quickMarkData.value.set(key, true)
  }
}

// 表格选择变化
const handleSelectionChange = (selection) => {
  selectedTableRows.value = selection
}

// 批量标记选中的学生和所有课文
const batchMarkAll = () => {
  selectedTableRows.value.forEach(row => {
    articles.value.forEach(article => {
      const key = `${row.studentId}-${article.id}`
      quickMarkData.value.set(key, true)
    })
  })
  ElMessage.success(`已为 ${selectedTableRows.value.length} 名学生标记所有课文`)
}

// 清空所有选择
const clearAllSelections = () => {
  quickMarkData.value.clear()
  selectedTableRows.value = []
  ElMessage.success('已清空所有标记')
}

// 保存所有标记
const saveAllMarks = async () => {
  if (quickMarkData.value.size === 0) {
    ElMessage.warning('请先进行标记')
    return
  }
  
  if (!quickMarkForm.classId) {
    ElMessage.warning('请先选择班级')
    return
  }
  
  try {
    quickMarking.value = true
    const markPromises = []
    
    // 批量提交所有标记
    for (const [key, _] of quickMarkData.value) {
      const [studentId, articleId] = key.split('-')
      markPromises.push(markRecitationComplete({
        studentId: parseInt(studentId),
        articleId: parseInt(articleId),
        classId: quickMarkForm.classId, // 添加必需的班级ID
        remark: '快速批量标记'
      }))
    }
    
    await Promise.all(markPromises)
    ElMessage.success(`成功标记 ${quickMarkData.value.size} 项背诵任务`)
    
    showQuickMarkDialog.value = false
    resetQuickMarkForm()
    loadRecitations()
    loadStats()
  } catch (error) {
    console.error('批量标记失败:', error)
    ElMessage.error('批量标记失败，请重试')
  } finally {
    quickMarking.value = false
  }
}

// 重置快速标记表单
const resetQuickMarkForm = () => {
  quickMarkForm.classId = ''
  quickMarkStudents.value = []
  quickMarkTableData.value = []
  quickMarkData.value.clear()
  selectedTableRows.value = []
}

// 获取分类标签类型
const getCategoryType = (category) => {
  const types = {
    '古诗词': 'success',
    '现代诗': 'primary',
    '散文': 'warning',
    '文言文': 'danger'
  }
  return types[category] || 'info'
}

// 计算属性
const hasSelectedItems = computed(() => selectedTableRows.value.length > 0)
const selectedCount = computed(() => selectedTableRows.value.length)
const hasAnyMarks = computed(() => quickMarkData.value.size > 0)

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
  padding: 0;
}

.quick-mark-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
}

.class-selector {
  display: flex;
  align-items: center;
  gap: 10px;
}

.batch-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.selection-count {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.quick-mark-table {
  margin-top: 20px;
}

.student-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.student-avatar-small {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 12px;
  flex-shrink: 0;
}

.article-header {
  text-align: center;
}

.article-title-small {
  font-size: 13px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
  line-height: 1.2;
  word-break: break-all;
}

.empty-state {
  padding: 40px 0;
  text-align: center;
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.footer-info {
  color: #666;
  font-size: 14px;
}

.footer-actions {
  display: flex;
  gap: 10px;
}

/* 表格样式优化 */
.quick-mark-table .el-table {
  border-radius: 8px;
  overflow: hidden;
}

.quick-mark-table .el-table th {
  background-color: #f8f9fa;
  font-weight: 600;
}

.quick-mark-table .el-button {
  min-width: 70px;
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