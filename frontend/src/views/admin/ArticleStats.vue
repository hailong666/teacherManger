<template>
  <div class="article-stats-container">
    <el-card class="stats-card">
      <template #header>
        <div class="card-header">
          <span>课文背诵统计</span>
          <div class="header-actions">
            <el-select v-model="filterClassId" placeholder="筛选班级" clearable style="width: 200px; margin-right: 10px;">
              <el-option v-for="cls in classes" :key="cls.id" :label="cls.name" :value="cls.id" />
            </el-select>
            <el-button @click="loadStats" :loading="loading">刷新</el-button>
          </div>
        </div>
      </template>

      <!-- 总体统计 -->
      <div class="overview-stats">
        <el-row :gutter="20">
          <el-col :span="6">
            <el-statistic title="总课文数" :value="overviewStats.totalArticles" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="总学生数" :value="overviewStats.totalStudents" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="总打卡次数" :value="overviewStats.totalRecitations" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="平均完成率" :value="overviewStats.averageCompletionRate" suffix="%" :precision="1" />
          </el-col>
        </el-row>
      </div>

      <!-- 课文统计表格 -->
      <el-table :data="articleStats" v-loading="loading" style="width: 100%; margin-top: 20px;">
        <el-table-column prop="title" label="课文标题" min-width="200" />
        <el-table-column prop="category" label="分类" width="120">
          <template #default="{ row }">
            <el-tag>{{ row.category }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="difficulty" label="难度" width="100">
          <template #default="{ row }">
            <el-tag type="warning">{{ row.difficulty }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="totalStudents" label="应背诵人数" width="120" />
        <el-table-column prop="completedCount" label="已完成人数" width="120" />
        <el-table-column prop="pendingCount" label="待评分人数" width="120" />
        <el-table-column label="完成率" width="120">
          <template #default="{ row }">
            <el-progress 
              :percentage="row.completionRate" 
              :color="getProgressColor(row.completionRate)"
              :stroke-width="8"
            />
          </template>
        </el-table-column>
        <el-table-column prop="averageScore" label="平均分" width="100">
          <template #default="{ row }">
            <span v-if="row.averageScore !== null">{{ row.averageScore.toFixed(1) }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button size="small" @click="viewArticleDetail(row)">查看详情</el-button>
            <el-button size="small" type="warning" @click="viewUncompletedStudents(row)">未完成学生</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="loadStats"
        @current-change="loadStats"
        style="margin-top: 20px; text-align: right;"
      />
    </el-card>

    <!-- 课文详情对话框 -->
    <el-dialog v-model="showDetailDialog" title="课文详情" width="600px">
      <div v-if="currentArticle" class="article-detail">
        <h3>{{ currentArticle.title }}</h3>
        <div class="article-meta">
          <el-tag>{{ currentArticle.category }}</el-tag>
          <el-tag type="warning">难度: {{ currentArticle.difficulty }}</el-tag>
        </div>
        <div class="article-content">{{ currentArticle.content }}</div>
        
        <div class="stats-detail">
          <h4>背诵统计</h4>
          <el-row :gutter="20">
            <el-col :span="8">
              <el-statistic title="应背诵人数" :value="currentArticle.totalStudents" />
            </el-col>
            <el-col :span="8">
              <el-statistic title="已完成人数" :value="currentArticle.completedCount" />
            </el-col>
            <el-col :span="8">
              <el-statistic title="完成率" :value="currentArticle.completionRate" suffix="%" :precision="1" />
            </el-col>
          </el-row>
        </div>
      </div>
      <template #footer>
        <el-button @click="showDetailDialog = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 未完成学生列表对话框 -->
    <el-dialog v-model="showUncompletedDialog" title="未完成背诵的学生" width="500px">
      <div v-if="uncompletedStudents.length > 0">
        <el-table :data="uncompletedStudents" style="width: 100%;">
          <el-table-column prop="name" label="学生姓名" />
          <el-table-column prop="className" label="班级" />
          <el-table-column prop="studentId" label="学号" />
        </el-table>
      </div>
      <div v-else class="no-data">
        <el-empty description="所有学生都已完成背诵" />
      </div>
      <template #footer>
        <el-button @click="showUncompletedDialog = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getArticleStats, getUncompletedStudents } from '@/api/article'
import { getClasses } from '@/api/recitation'

// 数据状态
const loading = ref(false)
const articleStats = ref([])
const classes = ref([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const filterClassId = ref('')

// 对话框状态
const showDetailDialog = ref(false)
const showUncompletedDialog = ref(false)
const currentArticle = ref(null)
const uncompletedStudents = ref([])

// 总体统计
const overviewStats = reactive({
  totalArticles: 0,
  totalStudents: 0,
  totalRecitations: 0,
  averageCompletionRate: 0
})

// 方法
const loadStats = async () => {
  try {
    loading.value = true
    const params = {
      page: currentPage.value,
      limit: pageSize.value,
      classId: filterClassId.value || undefined
    }
    const response = await getArticleStats(params)
    articleStats.value = response.stats || []
    total.value = response.pagination?.total || 0
    
    // 更新总体统计
    Object.assign(overviewStats, response.overview || {})
  } catch (error) {
    console.error('加载课文统计失败:', error)
    ElMessage.error('加载课文统计失败')
  } finally {
    loading.value = false
  }
}

const loadClasses = async () => {
  try {
    const response = await getClasses()
    classes.value = response.classes || []
  } catch (error) {
    console.error('加载班级列表失败:', error)
    ElMessage.error('加载班级列表失败')
  }
}

const viewArticleDetail = (article) => {
  currentArticle.value = article
  showDetailDialog.value = true
}

const viewUncompletedStudents = async (article) => {
  try {
    loading.value = true
    const response = await getUncompletedStudents({
      articleId: article.id,
      classId: filterClassId.value || undefined
    })
    uncompletedStudents.value = response.students || []
    showUncompletedDialog.value = true
  } catch (error) {
    console.error('加载未完成学生列表失败:', error)
    ElMessage.error('加载未完成学生列表失败')
  } finally {
    loading.value = false
  }
}

const getProgressColor = (percentage) => {
  if (percentage >= 80) return '#67c23a'
  if (percentage >= 60) return '#e6a23c'
  return '#f56c6c'
}

// 生命周期
onMounted(() => {
  loadStats()
  loadClasses()
})
</script>

<style scoped>
.article-stats-container {
  padding: 20px;
}

.stats-card {
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

.overview-stats {
  padding: 20px 0;
  border-bottom: 1px solid #e8e8e8;
  margin-bottom: 20px;
}

.article-detail h3 {
  margin: 0 0 15px 0;
  color: #333;
}

.article-meta {
  margin-bottom: 15px;
  display: flex;
  gap: 10px;
}

.article-content {
  background-color: #f8f9fa;
  padding: 15px;
  border-radius: 6px;
  line-height: 1.8;
  white-space: pre-wrap;
  max-height: 300px;
  overflow-y: auto;
  margin-bottom: 20px;
}

.stats-detail h4 {
  margin: 0 0 15px 0;
  color: #333;
}

.no-data {
  text-align: center;
  padding: 40px 0;
}

@media (max-width: 768px) {
  .article-stats-container {
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