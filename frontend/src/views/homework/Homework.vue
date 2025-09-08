<template>
  <div class="homework-container">
    <!-- 创建作业卡片 -->
    <el-card class="homework-card">
      <template #header>
        <div class="card-header">
          <h3>创建作业</h3>
        </div>
      </template>
      <div class="create-homework-section">
        <el-form :model="createForm" :rules="createRules" ref="createFormRef" label-width="100px">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="作业标题" prop="title">
                <el-input v-model="createForm.title" placeholder="请输入作业标题"></el-input>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="选择班级" prop="classId">
                <el-select v-model="createForm.classId" placeholder="请选择班级" style="width: 100%;" :loading="loadingClasses">
                  <el-option
                    v-for="cls in classList"
                    :key="cls.id"
                    :label="cls.name"
                    :value="cls.id">
                  </el-option>
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="作业描述" prop="description">
            <el-input
              v-model="createForm.description"
              type="textarea"
              :rows="4"
              placeholder="请输入作业描述">
            </el-input>
          </el-form-item>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="截止时间" prop="dueDate">
                <el-date-picker
                  v-model="createForm.dueDate"
                  type="datetime"
                  placeholder="选择截止时间"
                  style="width: 100%;"
                  format="YYYY-MM-DD HH:mm:ss"
                  value-format="YYYY-MM-DD HH:mm:ss">
                </el-date-picker>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="总分" prop="totalScore">
                <el-input-number v-model="createForm.totalScore" :min="1" :max="100" style="width: 100%;"></el-input-number>
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item>
            <el-button type="primary" @click="submitCreateHomework" :loading="creating">创建作业</el-button>
            <el-button @click="resetCreateForm">重置</el-button>
          </el-form-item>
        </el-form>
      </div>
    </el-card>

    <!-- 作业列表 -->
    <el-card class="homework-card">
      <template #header>
        <div class="card-header">
          <h3>作业列表</h3>
          <div>
            <el-select v-model="filterForm.classId" placeholder="选择班级" @change="getHomeworkList" style="margin-right: 10px;">
              <el-option label="全部班级" value=""></el-option>
              <el-option
                v-for="cls in classList"
                :key="cls.id"
                :label="cls.name"
                :value="cls.id">
              </el-option>
            </el-select>
            <el-select v-model="filterForm.status" placeholder="作业状态" @change="getHomeworkList" style="margin-right: 10px;">
              <el-option label="全部状态" value=""></el-option>
              <el-option label="进行中" value="active"></el-option>
              <el-option label="已截止" value="expired"></el-option>
              <el-option label="已完成" value="completed"></el-option>
            </el-select>
            <el-button @click="getHomeworkList" :loading="loadingHomework">刷新</el-button>
          </div>
        </div>
      </template>
      <div class="homework-list-section">
        <el-table :data="homeworkList" v-loading="loadingHomework" style="width: 100%">
          <el-table-column prop="title" label="作业标题" show-overflow-tooltip></el-table-column>
          <el-table-column prop="className" label="班级" width="120"></el-table-column>
          <el-table-column prop="totalScore" label="总分" width="80"></el-table-column>
          <el-table-column prop="submissionCount" label="提交数" width="80"></el-table-column>
          <el-table-column prop="dueDate" label="截止时间" width="180"></el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="scope">
              <el-tag :type="getStatusType(scope.row.status)">{{ getStatusText(scope.row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="createdAt" label="创建时间" width="180"></el-table-column>
          <el-table-column label="操作" width="200">
            <template #default="scope">
              <el-button size="small" @click="viewHomework(scope.row)">查看</el-button>
              <el-button size="small" @click="viewSubmissions(scope.row)">提交情况</el-button>
              <el-button size="small" type="danger" @click="deleteHomework(scope.row)">删除</el-button>
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

    <!-- 作业详情对话框 -->
    <el-dialog v-model="homeworkDetailVisible" title="作业详情" width="60%">
      <div v-if="selectedHomework">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="作业标题">{{ selectedHomework.title }}</el-descriptions-item>
          <el-descriptions-item label="班级">{{ selectedHomework.className }}</el-descriptions-item>
          <el-descriptions-item label="总分">{{ selectedHomework.totalScore }}</el-descriptions-item>
          <el-descriptions-item label="截止时间">{{ selectedHomework.dueDate }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(selectedHomework.status)">{{ getStatusText(selectedHomework.status) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ selectedHomework.createdAt }}</el-descriptions-item>
          <el-descriptions-item label="作业描述" :span="2">
            <div style="white-space: pre-wrap;">{{ selectedHomework.description }}</div>
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>

    <!-- 提交情况对话框 -->
    <el-dialog v-model="submissionsVisible" title="提交情况" width="80%">
      <div v-if="selectedHomework">
        <div style="margin-bottom: 20px;">
          <el-statistic title="总提交数" :value="submissionsList.length" suffix="份" style="display: inline-block; margin-right: 40px;"></el-statistic>
          <el-statistic title="已评分" :value="gradedCount" suffix="份" style="display: inline-block; margin-right: 40px;"></el-statistic>
          <el-statistic title="待评分" :value="submissionsList.length - gradedCount" suffix="份" style="display: inline-block;"></el-statistic>
        </div>
        
        <el-table :data="submissionsList" v-loading="loadingSubmissions" style="width: 100%">
          <el-table-column prop="studentName" label="学生姓名" width="120"></el-table-column>
          <el-table-column prop="submittedAt" label="提交时间" width="180"></el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="scope">
              <el-tag :type="scope.row.score !== null ? 'success' : 'warning'">
                {{ scope.row.score !== null ? '已评分' : '待评分' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="score" label="得分" width="80">
            <template #default="scope">
              <span v-if="scope.row.score !== null">{{ scope.row.score }}</span>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column prop="content" label="作业内容" show-overflow-tooltip></el-table-column>
          <el-table-column label="操作" width="120">
            <template #default="scope">
              <el-button size="small" @click="gradeSubmission(scope.row)">评分</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>

    <!-- 评分对话框 -->
    <el-dialog v-model="gradeVisible" title="作业评分" width="50%">
      <div v-if="selectedSubmission">
        <el-form :model="gradeForm" :rules="gradeRules" ref="gradeFormRef" label-width="100px">
          <el-form-item label="学生姓名">
            <el-input v-model="selectedSubmission.studentName" disabled></el-input>
          </el-form-item>
          <el-form-item label="作业内容">
            <el-input
              v-model="selectedSubmission.content"
              type="textarea"
              :rows="4"
              disabled>
            </el-input>
          </el-form-item>
          <el-form-item label="得分" prop="score">
            <el-input-number
              v-model="gradeForm.score"
              :min="0"
              :max="selectedHomework?.totalScore || 100"
              style="width: 100%;"
              placeholder="请输入得分">
            </el-input-number>
          </el-form-item>
          <el-form-item label="评语" prop="feedback">
            <el-input
              v-model="gradeForm.feedback"
              type="textarea"
              :rows="3"
              placeholder="请输入评语">
            </el-input>
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="gradeVisible = false">取消</el-button>
          <el-button type="primary" @click="submitGrade" :loading="grading">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getClasses } from '@/api/class'

// 响应式数据
const loading = ref(false)
const creating = ref(false)
const loadingClasses = ref(false)
const loadingHomework = ref(false)
const loadingSubmissions = ref(false)
const grading = ref(false)
const createFormRef = ref()
const gradeFormRef = ref()

const classList = ref([])
const homeworkList = ref([])
const submissionsList = ref([])
const selectedHomework = ref(null)
const selectedSubmission = ref(null)

// 对话框显示状态
const homeworkDetailVisible = ref(false)
const submissionsVisible = ref(false)
const gradeVisible = ref(false)

// 表单数据
const createForm = reactive({
  title: '',
  description: '',
  classId: '',
  dueDate: '',
  totalScore: 100
})

const filterForm = reactive({
  classId: '',
  status: ''
})

const gradeForm = reactive({
  score: null,
  feedback: ''
})

// 分页数据
const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0
})

// 表单验证规则
const createRules = {
  title: [{ required: true, message: '请输入作业标题', trigger: 'blur' }],
  description: [{ required: true, message: '请输入作业描述', trigger: 'blur' }],
  classId: [{ required: true, message: '请选择班级', trigger: 'change' }],
  dueDate: [{ required: true, message: '请选择截止时间', trigger: 'change' }],
  totalScore: [{ required: true, message: '请输入总分', trigger: 'blur' }]
}

const gradeRules = {
  score: [{ required: true, message: '请输入得分', trigger: 'blur' }]
}

// 计算属性
const gradedCount = computed(() => {
  return submissionsList.value.filter(item => item.score !== null).length
})

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

// 创建作业
const submitCreateHomework = () => {
  createFormRef.value.validate(async (valid) => {
    if (valid) {
      creating.value = true
      try {
        // 这里应该调用创建作业的API
        // await createHomework(createForm)
        ElMessage.success('作业创建成功')
        resetCreateForm()
        getHomeworkList()
      } catch (error) {
        ElMessage.error('创建作业失败：' + (error.response?.data?.message || error.message))
      } finally {
        creating.value = false
      }
    }
  })
}

// 重置创建表单
const resetCreateForm = () => {
  createFormRef.value.resetFields()
}

// 获取作业列表
const getHomeworkList = async () => {
  loadingHomework.value = true
  try {
    // 模拟数据，实际应该调用API
    const mockData = {
      homeworks: [
        {
          id: 1,
          title: '数学作业1',
          description: '完成第一章练习题',
          className: '高一(1)班',
          classId: 1,
          totalScore: 100,
          submissionCount: 25,
          dueDate: '2024-01-20 23:59:59',
          status: 'active',
          createdAt: '2024-01-15 10:00:00'
        },
        {
          id: 2,
          title: '语文作业1',
          description: '背诵古诗词',
          className: '高一(2)班',
          classId: 2,
          totalScore: 50,
          submissionCount: 30,
          dueDate: '2024-01-18 23:59:59',
          status: 'expired',
          createdAt: '2024-01-10 14:30:00'
        }
      ],
      pagination: {
        total: 2,
        page: 1,
        limit: 10
      }
    }
    
    homeworkList.value = mockData.homeworks
    pagination.total = mockData.pagination.total
  } catch (error) {
    ElMessage.error('获取作业列表失败：' + (error.response?.data?.message || error.message))
    homeworkList.value = []
    pagination.total = 0
  } finally {
    loadingHomework.value = false
  }
}

// 查看作业详情
const viewHomework = (homework) => {
  selectedHomework.value = homework
  homeworkDetailVisible.value = true
}

// 查看提交情况
const viewSubmissions = async (homework) => {
  selectedHomework.value = homework
  submissionsVisible.value = true
  
  loadingSubmissions.value = true
  try {
    // 模拟数据，实际应该调用API
    const mockSubmissions = [
      {
        id: 1,
        studentId: 1,
        studentName: '张三',
        content: '这是我的作业内容...',
        submittedAt: '2024-01-19 15:30:00',
        score: 85,
        feedback: '完成得不错'
      },
      {
        id: 2,
        studentId: 2,
        studentName: '李四',
        content: '这是我的作业内容...',
        submittedAt: '2024-01-19 20:15:00',
        score: null,
        feedback: null
      }
    ]
    
    submissionsList.value = mockSubmissions
  } catch (error) {
    ElMessage.error('获取提交情况失败：' + (error.response?.data?.message || error.message))
    submissionsList.value = []
  } finally {
    loadingSubmissions.value = false
  }
}

// 评分
const gradeSubmission = (submission) => {
  selectedSubmission.value = submission
  gradeForm.score = submission.score
  gradeForm.feedback = submission.feedback || ''
  gradeVisible.value = true
}

// 提交评分
const submitGrade = () => {
  gradeFormRef.value.validate(async (valid) => {
    if (valid) {
      grading.value = true
      try {
        // 这里应该调用评分API
        // await gradeHomeworkSubmission(selectedSubmission.value.id, gradeForm)
        ElMessage.success('评分成功')
        
        // 更新本地数据
        const index = submissionsList.value.findIndex(item => item.id === selectedSubmission.value.id)
        if (index !== -1) {
          submissionsList.value[index].score = gradeForm.score
          submissionsList.value[index].feedback = gradeForm.feedback
        }
        
        gradeVisible.value = false
      } catch (error) {
        ElMessage.error('评分失败：' + (error.response?.data?.message || error.message))
      } finally {
        grading.value = false
      }
    }
  })
}

// 删除作业
const deleteHomework = (homework) => {
  ElMessageBox.confirm('确定要删除这个作业吗？删除后无法恢复！', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      // 这里应该调用删除API
      // await deleteHomework(homework.id)
      ElMessage.success('删除成功')
      getHomeworkList()
    } catch (error) {
      ElMessage.error('删除失败：' + (error.response?.data?.message || error.message))
    }
  }).catch(() => {})
}

// 获取状态类型
const getStatusType = (status) => {
  switch (status) {
    case 'active': return 'success'
    case 'expired': return 'warning'
    case 'completed': return 'info'
    default: return ''
  }
}

// 获取状态文本
const getStatusText = (status) => {
  switch (status) {
    case 'active': return '进行中'
    case 'expired': return '已截止'
    case 'completed': return '已完成'
    default: return '未知'
  }
}

// 分页处理
const handleSizeChange = (val) => {
  pagination.limit = val
  pagination.page = 1
  getHomeworkList()
}

const handleCurrentChange = (val) => {
  pagination.page = val
  getHomeworkList()
}

// 组件挂载时获取数据
onMounted(() => {
  getClassList()
  getHomeworkList()
})
</script>

<style scoped>
.homework-container {
  padding: 20px;
}

.homework-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.create-homework-section {
  padding: 10px 0;
}

.homework-list-section {
  padding: 10px 0;
}

.dialog-footer {
  text-align: right;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .homework-container {
    padding: 10px;
  }
  
  .card-header {
    flex-direction: column;
    gap: 10px;
  }
  
  .el-col {
    margin-bottom: 10px;
  }
}
</style>