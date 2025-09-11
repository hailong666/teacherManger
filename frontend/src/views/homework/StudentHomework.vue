<template>
  <div class="student-homework-container">
    <!-- 作业列表 -->
    <el-card class="homework-card">
      <template #header>
        <div class="card-header">
          <h3>班级作业</h3>
          <div>
            <el-select v-model="filterForm.status" placeholder="作业状态" @change="getHomeworkList" style="margin-right: 10px;">
              <el-option label="全部状态" value=""></el-option>
              <el-option label="未提交" value="pending"></el-option>
              <el-option label="已提交" value="submitted"></el-option>
              <el-option label="已截止" value="expired"></el-option>
            </el-select>
            <el-button @click="getHomeworkList" :loading="loadingHomework">刷新</el-button>
          </div>
        </div>
      </template>
      <div class="homework-list-section">
        <el-table :data="homeworkList" v-loading="loadingHomework" style="width: 100%">
          <el-table-column prop="title" label="作业标题" show-overflow-tooltip></el-table-column>
          <el-table-column prop="teacherName" label="布置老师" width="120"></el-table-column>
          <el-table-column prop="subject" label="科目" width="100"></el-table-column>
          <el-table-column prop="dueDate" label="截止时间" width="180">
            <template #default="scope">
              {{ formatDateTime(scope.row.dueDate) }}
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="scope">
              <el-tag :type="getStatusType(scope.row.submissionStatus)">{{ getStatusText(scope.row.submissionStatus) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="得分" width="80">
            <template #default="scope">
              <span v-if="scope.row.score !== null">{{ scope.row.score }}/{{ scope.row.maxScore }}</span>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200">
            <template #default="scope">
              <el-button size="small" @click="viewHomework(scope.row)">查看详情</el-button>
              <el-button 
                v-if="scope.row.submissionStatus === 'pending' && !isExpired(scope.row.dueDate)"
                size="small" 
                type="primary" 
                @click="submitHomework(scope.row)">提交作业</el-button>
              <el-button 
                v-else-if="scope.row.submissionStatus === 'submitted'"
                size="small" 
                type="success" 
                @click="viewSubmission(scope.row)">查看提交</el-button>
            </template>
          </el-table-column>
        </el-table>
        
        <div class="pagination-wrapper">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.limit"
            :page-sizes="[10, 20, 50]"
            :total="pagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </div>
    </el-card>

    <!-- 作业详情对话框 -->
    <el-dialog v-model="homeworkDetailVisible" title="作业详情" width="60%">
      <div v-if="selectedHomework" class="homework-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="作业标题">{{ selectedHomework.title }}</el-descriptions-item>
          <el-descriptions-item label="布置老师">{{ selectedHomework.teacherName }}</el-descriptions-item>
          <el-descriptions-item label="科目">{{ selectedHomework.subject || '语文' }}</el-descriptions-item>
          <el-descriptions-item label="总分">{{ selectedHomework.maxScore }}</el-descriptions-item>
          <el-descriptions-item label="截止时间">{{ formatDateTime(selectedHomework.dueDate) }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(selectedHomework.submissionStatus)">{{ getStatusText(selectedHomework.submissionStatus) }}</el-tag>
          </el-descriptions-item>
        </el-descriptions>
        
        <div class="homework-description">
          <h4>作业描述</h4>
          <p>{{ selectedHomework.description }}</p>
        </div>
        
        <div v-if="selectedHomework.instructions" class="homework-instructions">
          <h4>作业说明</h4>
          <p>{{ selectedHomework.instructions }}</p>
        </div>
      </div>
    </el-dialog>

    <!-- 提交作业对话框 -->
    <el-dialog v-model="submitVisible" title="提交作业" width="60%">
      <div v-if="selectedHomework">
        <h4>{{ selectedHomework.title }}</h4>
        <p class="due-date-warning" v-if="isNearDeadline(selectedHomework.dueDate)">
          ⚠️ 距离截止时间不足24小时，请尽快提交！
        </p>
        
        <el-form :model="submitForm" :rules="submitRules" ref="submitFormRef" label-width="100px">
          <el-form-item label="作业内容" prop="content">
            <el-input
              v-model="submitForm.content"
              type="textarea"
              :rows="6"
              placeholder="请输入作业内容或说明">
            </el-input>
          </el-form-item>
          <el-form-item label="上传文件">
            <el-upload
              ref="uploadRef"
              :action="uploadUrl"
              :headers="uploadHeaders"
              :on-success="handleUploadSuccess"
              :on-error="handleUploadError"
              :file-list="fileList"
              :limit="3"
              :before-upload="beforeUpload"
              drag
              multiple>
              <el-icon class="el-icon--upload"><upload-filled /></el-icon>
              <div class="el-upload__text">
                将文件拖到此处，或<em>点击上传</em>
              </div>
              <template #tip>
                <div class="el-upload__tip">
                  支持上传jpg/png/pdf/doc/docx文件，且不超过10MB，最多3个文件
                </div>
              </template>
            </el-upload>
          </el-form-item>
        </el-form>
      </div>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="submitVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmSubmit" :loading="submitting">提交作业</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 查看提交对话框 -->
    <el-dialog v-model="viewSubmissionVisible" title="我的提交" width="60%">
      <div v-if="currentSubmission">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="提交时间">{{ formatDateTime(currentSubmission.submissionTime) }}</el-descriptions-item>
          <el-descriptions-item label="是否迟交">
            <el-tag :type="currentSubmission.isLate ? 'danger' : 'success'">
              {{ currentSubmission.isLate ? '是' : '否' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getSubmissionStatusType(currentSubmission.status)">{{ getSubmissionStatusText(currentSubmission.status) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="得分" v-if="currentSubmission.score !== null">
            {{ currentSubmission.score }}/{{ selectedHomework.maxScore }}
          </el-descriptions-item>
        </el-descriptions>
        
        <div class="submission-content">
          <h4>提交内容</h4>
          <p>{{ currentSubmission.content }}</p>
        </div>
        
        <div v-if="currentSubmission.attachments && currentSubmission.attachments.length > 0" class="submission-files">
          <h4>提交文件</h4>
          <el-list>
            <el-list-item v-for="file in currentSubmission.attachments" :key="file.name">
              <el-link :href="file.url" target="_blank">{{ file.name }}</el-link>
            </el-list-item>
          </el-list>
        </div>
        
        <div v-if="currentSubmission.feedback" class="teacher-feedback">
          <h4>教师反馈</h4>
          <p>{{ currentSubmission.feedback }}</p>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { getStudentHomeworks, submitStudentHomework, getSubmissionDetail } from '@/api/homework'

// 用户store
const userStore = useUserStore()

// 响应式数据
const loading = ref(false)
const loadingHomework = ref(false)
const submitting = ref(false)
const submitFormRef = ref()
const uploadRef = ref()

const homeworkList = ref([])
const selectedHomework = ref(null)
const currentSubmission = ref(null)
const fileList = ref([])

// 对话框显示状态
const homeworkDetailVisible = ref(false)
const submitVisible = ref(false)
const viewSubmissionVisible = ref(false)

// 表单数据
const filterForm = reactive({
  status: ''
})

const submitForm = reactive({
  content: '',
  attachments: []
})

// 分页数据
const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0
})

// 表单验证规则
const submitRules = {
  content: [{ required: true, message: '请输入作业内容', trigger: 'blur' }]
}

// 上传配置
const uploadUrl = computed(() => `${import.meta.env.VITE_API_BASE_URL}/homework/upload`)
const uploadHeaders = computed(() => ({
  'Authorization': `Bearer ${userStore.token}`
}))

// 获取作业列表
const getHomeworkList = async () => {
  try {
    loadingHomework.value = true
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      status: filterForm.status
    }
    
    const response = await getStudentHomeworks(params)
    homeworkList.value = response.homeworks || []
    pagination.total = response.total || 0
  } catch (error) {
    console.error('获取作业列表失败:', error)
    ElMessage.error('获取作业列表失败')
  } finally {
    loadingHomework.value = false
  }
}

// 查看作业详情
const viewHomework = (homework) => {
  selectedHomework.value = homework
  homeworkDetailVisible.value = true
}

// 提交作业
const submitHomework = (homework) => {
  selectedHomework.value = homework
  submitForm.content = ''
  submitForm.attachments = []
  fileList.value = []
  submitVisible.value = true
}

// 查看提交详情
const viewSubmission = async (homework) => {
  try {
    selectedHomework.value = homework
    const response = await getSubmissionDetail(homework.id)
    currentSubmission.value = response.submission
    viewSubmissionVisible.value = true
  } catch (error) {
    console.error('获取提交详情失败:', error)
    ElMessage.error('获取提交详情失败')
  }
}

// 确认提交作业
const confirmSubmit = async () => {
  try {
    await submitFormRef.value.validate()
    
    submitting.value = true
    const submitData = {
      content: submitForm.content,
      attachments: submitForm.attachments
    }
    
    await submitStudentHomework(selectedHomework.value.id, submitData)
    ElMessage.success('作业提交成功')
    submitVisible.value = false
    getHomeworkList()
  } catch (error) {
    console.error('提交作业失败:', error)
    ElMessage.error('提交作业失败')
  } finally {
    submitting.value = false
  }
}

// 文件上传成功
const handleUploadSuccess = (response, file) => {
  if (response.success) {
    submitForm.attachments.push({
      name: file.name,
      url: response.data.url,
      path: response.data.path
    })
    ElMessage.success('文件上传成功')
  } else {
    ElMessage.error('文件上传失败')
  }
}

// 文件上传失败
const handleUploadError = (error) => {
  console.error('文件上传失败:', error)
  ElMessage.error('文件上传失败')
}

// 上传前检查
const beforeUpload = (file) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  const isAllowedType = allowedTypes.includes(file.type)
  const isLt10M = file.size / 1024 / 1024 < 10

  if (!isAllowedType) {
    ElMessage.error('只能上传jpg/png/pdf/doc/docx格式的文件!')
    return false
  }
  if (!isLt10M) {
    ElMessage.error('上传文件大小不能超过10MB!')
    return false
  }
  return true
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

// 工具函数
const formatDateTime = (dateTime) => {
  if (!dateTime) return '-'
  return new Date(dateTime).toLocaleString('zh-CN')
}

const isExpired = (dueDate) => {
  return new Date() > new Date(dueDate)
}

const isNearDeadline = (dueDate) => {
  const now = new Date()
  const due = new Date(dueDate)
  const diff = due.getTime() - now.getTime()
  return diff > 0 && diff < 24 * 60 * 60 * 1000 // 24小时内
}

const getStatusType = (status) => {
  const statusMap = {
    'pending': 'warning',
    'submitted': 'success',
    'expired': 'danger',
    'graded': 'info'
  }
  return statusMap[status] || 'info'
}

const getStatusText = (status) => {
  const statusMap = {
    'pending': '未提交',
    'submitted': '已提交',
    'expired': '已截止',
    'graded': '已评分'
  }
  return statusMap[status] || '未知'
}

const getSubmissionStatusType = (status) => {
  const statusMap = {
    'submitted': 'success',
    'graded': 'info',
    'returned': 'warning',
    'resubmitted': 'primary'
  }
  return statusMap[status] || 'info'
}

const getSubmissionStatusText = (status) => {
  const statusMap = {
    'submitted': '已提交',
    'graded': '已评分',
    'returned': '已退回',
    'resubmitted': '重新提交'
  }
  return statusMap[status] || '未知'
}

// 组件挂载时获取数据
onMounted(() => {
  getHomeworkList()
})
</script>

<style scoped>
.student-homework-container {
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

.card-header h3 {
  margin: 0;
}

.homework-list-section {
  margin-top: 20px;
}

.pagination-wrapper {
  margin-top: 20px;
  text-align: center;
}

.homework-detail {
  margin-bottom: 20px;
}

.homework-description,
.homework-instructions {
  margin-top: 20px;
}

.homework-description h4,
.homework-instructions h4 {
  margin-bottom: 10px;
  color: #303133;
}

.homework-description p,
.homework-instructions p {
  line-height: 1.6;
  color: #606266;
}

.due-date-warning {
  color: #E6A23C;
  background-color: #FDF6EC;
  border: 1px solid #F5DAB1;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.submission-content,
.submission-files,
.teacher-feedback {
  margin-top: 20px;
}

.submission-content h4,
.submission-files h4,
.teacher-feedback h4 {
  margin-bottom: 10px;
  color: #303133;
}

.submission-content p,
.teacher-feedback p {
  line-height: 1.6;
  color: #606266;
  background-color: #F5F7FA;
  padding: 15px;
  border-radius: 4px;
}

.dialog-footer {
  text-align: right;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .student-homework-container {
    padding: 10px;
  }
  
  .card-header {
    flex-direction: column;
    gap: 10px;
  }
}
</style>