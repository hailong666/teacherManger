<template>
  <div class="article-stats-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>课文背诵统计</h2>
    </div>

    <!-- 筛选条件 -->
    <el-card class="filter-card">
      <el-form :model="filterForm" inline>
        <el-form-item label="班级">
          <el-select v-model="filterForm.classId" placeholder="选择班级" clearable style="width: 200px;" @change="loadStats">
            <el-option label="全部班级" value=""></el-option>
            <el-option
              v-for="cls in classes"
              :key="cls.id"
              :label="cls.name"
              :value="cls.id">
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadStats">刷新数据</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 提醒通知 -->
    <el-alert
      v-if="hasUncompletedTasks"
      title="背诵提醒"
      type="warning"
      :description="reminderMessage"
      show-icon
      :closable="false"
      class="reminder-alert">
      <template #default>
        <div class="reminder-content">
          <p>{{ reminderMessage }}</p>
          <el-button type="warning" size="small" @click="showAllUncompletedStudents">查看所有未完成学生</el-button>
        </div>
      </template>
    </el-alert>

    <!-- 总体统计 -->
    <el-row :gutter="20" class="stats-overview">
      <el-col :span="6">
        <el-card class="stats-card">
          <div class="stats-item">
            <div class="stats-value">{{ summary.totalArticles }}</div>
            <div class="stats-label">总课文数</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stats-card">
          <div class="stats-item">
            <div class="stats-value">{{ summary.totalStudents }}</div>
            <div class="stats-label">学生总数</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stats-card">
          <div class="stats-item">
            <div class="stats-value">{{ summary.averageCompletionRate }}%</div>
            <div class="stats-label">平均完成率</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stats-card">
          <div class="stats-item">
            <div class="stats-value">{{ completedArticles }}</div>
            <div class="stats-label">已完成课文</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 数据可视化图表 -->
    <el-row :gutter="20" class="charts-section">
      <el-col :span="12">
        <el-card class="chart-card">
          <template #header>
            <div class="card-header">
              <span>课文完成率分布</span>
            </div>
          </template>
          <div ref="completionRateChart" class="chart-container"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card class="chart-card">
          <template #header>
            <div class="card-header">
              <span>课文分类统计</span>
            </div>
          </template>
          <div ref="categoryChart" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 完成率趋势图 -->
    <el-card class="chart-card">
      <template #header>
        <div class="card-header">
          <span>各课文背诵完成情况</span>
        </div>
      </template>
      <div ref="trendChart" class="chart-container-large"></div>
    </el-card>

    <!-- 课文统计表格 -->
    <el-card class="table-card">
      <template #header>
        <div class="card-header">
          <span>课文详细统计</span>
        </div>
      </template>
      <el-table :data="paginatedStats" v-loading="loading" stripe>
        <el-table-column prop="title" label="课文标题" min-width="200"></el-table-column>
        <el-table-column prop="category" label="分类" width="120">
          <template #default="scope">
            <el-tag :type="getCategoryTagType(scope.row.category)">{{ scope.row.category }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="difficulty_level" label="难度" width="100">
          <template #default="scope">
            <el-tag :type="getDifficultyTagType(scope.row.difficulty_level)">{{ getDifficultyText(scope.row.difficulty_level) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="totalStudents" label="学生总数" width="100"></el-table-column>
        <el-table-column prop="completedCount" label="已完成" width="100">
          <template #default="scope">
            <span class="completed-count">{{ scope.row.completedCount }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="uncompletedCount" label="未完成" width="100">
          <template #default="scope">
            <span class="uncompleted-count">{{ scope.row.uncompletedCount }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="completionRate" label="完成率" width="120">
          <template #default="scope">
            <el-progress :percentage="scope.row.completionRate" :color="getProgressColor(scope.row.completionRate)"></el-progress>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="scope">
            <el-button type="primary" size="small" @click="viewDetails(scope.row)">查看详情</el-button>
            <el-button type="info" size="small" @click="viewUncompletedStudents(scope.row)">未完成学生</el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange">
        </el-pagination>
      </div>
    </el-card>

    <!-- 课文详情对话框 -->
    <el-dialog v-model="showDetailDialog" title="课文详情" width="600px">
      <div v-if="selectedArticle" class="article-detail">
        <h3>{{ selectedArticle.title }}</h3>
        <p><strong>分类：</strong>{{ selectedArticle.category }}</p>
        <p><strong>难度：</strong>{{ getDifficultyText(selectedArticle.difficulty_level) }}</p>
        <p><strong>完成情况：</strong>{{ selectedArticle.completedCount }}/{{ selectedArticle.totalStudents }} ({{ selectedArticle.completionRate }}%)</p>
      </div>
    </el-dialog>

    <!-- 未完成学生列表对话框 -->
    <el-dialog v-model="showUncompletedDialog" title="未完成背诵的学生" width="500px">
      <el-table :data="uncompletedStudents" v-loading="uncompletedLoading" max-height="400">
        <el-table-column prop="name" label="学生姓名" width="120"></el-table-column>
        <el-table-column prop="studentId" label="学号" width="120"></el-table-column>
        <el-table-column prop="className" label="班级" width="120"></el-table-column>
      </el-table>
      <div v-if="uncompletedStudents.length === 0 && !uncompletedLoading" class="no-data">
        <p>所有学生都已完成背诵！</p>
      </div>
    </el-dialog>

    <!-- 所有未完成学生汇总对话框 -->
    <el-dialog v-model="showAllUncompletedDialog" title="所有未完成背诵的学生汇总" width="800px">
      <div class="all-uncompleted-header">
        <el-tag type="warning" size="large">共 {{ allUncompletedStudents.length }} 人次未完成背诵任务</el-tag>
      </div>
      <el-table :data="allUncompletedStudents" v-loading="allUncompletedLoading" max-height="500">
        <el-table-column prop="studentName" label="学生姓名" width="120"></el-table-column>
        <el-table-column prop="studentId" label="学号" width="120"></el-table-column>
        <el-table-column prop="className" label="班级" width="120"></el-table-column>
        <el-table-column prop="articleTitle" label="未完成课文" min-width="200"></el-table-column>
        <el-table-column prop="articleCategory" label="课文分类" width="100">
          <template #default="scope">
            <el-tag :type="getCategoryTagType(scope.row.articleCategory)" size="small">{{ scope.row.articleCategory }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="difficultyLevel" label="难度" width="80">
          <template #default="scope">
            <el-tag :type="getDifficultyTagType(scope.row.difficultyLevel)" size="small">{{ getDifficultyText(scope.row.difficultyLevel) }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
      <div v-if="allUncompletedStudents.length === 0 && !allUncompletedLoading" class="no-data">
        <p>所有学生都已完成背诵！</p>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showAllUncompletedDialog = false">关闭</el-button>
          <el-button type="primary" @click="exportUncompletedList">导出名单</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getArticleStats, getUncompletedStudents } from '@/api/article'
import { getClasses } from '@/api/class'
import * as echarts from 'echarts'

// 数据状态
const loading = ref(false)
const uncompletedLoading = ref(false)
const allUncompletedLoading = ref(false)
const stats = ref([])
const classes = ref([])
const uncompletedStudents = ref([])
const allUncompletedStudents = ref([])
const selectedArticle = ref(null)

// 对话框状态
const showDetailDialog = ref(false)
const showUncompletedDialog = ref(false)
const showAllUncompletedDialog = ref(false)

// 筛选表单
const filterForm = reactive({
  classId: ''
})

// 总体统计
const summary = reactive({
  totalArticles: 0,
  totalStudents: 0,
  averageCompletionRate: 0
})

// 分页数据
const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0
})

// 图表实例
const completionRateChart = ref(null)
const categoryChart = ref(null)
const trendChart = ref(null)
let completionRateChartInstance = null
let categoryChartInstance = null
let trendChartInstance = null

// 计算属性
const completedArticles = computed(() => {
  return stats.value.filter(item => item.completionRate === 100).length
})

const paginatedStats = computed(() => {
  const start = (pagination.page - 1) * pagination.limit
  const end = start + pagination.limit
  return stats.value.slice(start, end)
})

// 提醒相关计算属性
const hasUncompletedTasks = computed(() => {
  return stats.value.some(item => item.completionRate < 100)
})

const reminderMessage = computed(() => {
  const uncompletedArticles = stats.value.filter(item => item.completionRate < 100)
  const totalUncompletedStudents = uncompletedArticles.reduce((sum, item) => sum + item.uncompletedCount, 0)
  
  if (uncompletedArticles.length === 0) {
    return '所有课文背诵任务已完成！'
  }
  
  return `当前有 ${uncompletedArticles.length} 篇课文未全部完成背诵，共 ${totalUncompletedStudents} 人次未完成。请及时提醒学生完成背诵任务。`
})

// 加载统计数据
const loadStats = async () => {
  try {
    loading.value = true
    const params = {}
    if (filterForm.classId) {
      params.classId = filterForm.classId
    }
    
    const response = await getArticleStats(params)
    stats.value = response.stats || []
    
    if (response.summary) {
      Object.assign(summary, response.summary)
    }
    
    pagination.total = stats.value.length
    
    // 更新图表
    await nextTick()
    updateCharts()
  } catch (error) {
    console.error('获取课文统计失败:', error)
    ElMessage.error('获取课文统计失败')
  } finally {
    loading.value = false
  }
}

// 加载班级列表
const loadClasses = async () => {
  try {
    const response = await getClasses()
    classes.value = response.classes || []
  } catch (error) {
    console.error('获取班级列表失败:', error)
  }
}

// 更新图表
const updateCharts = () => {
  updateCompletionRateChart()
  updateCategoryChart()
  updateTrendChart()
}

// 更新完成率分布图
const updateCompletionRateChart = () => {
  if (!completionRateChart.value) return
  
  if (!completionRateChartInstance) {
    completionRateChartInstance = echarts.init(completionRateChart.value)
  }
  
  // 按完成率区间统计
  const ranges = [
    { name: '0-20%', min: 0, max: 20 },
    { name: '21-40%', min: 21, max: 40 },
    { name: '41-60%', min: 41, max: 60 },
    { name: '61-80%', min: 61, max: 80 },
    { name: '81-100%', min: 81, max: 100 }
  ]
  
  const data = ranges.map(range => {
    const count = stats.value.filter(item => 
      item.completionRate >= range.min && item.completionRate <= range.max
    ).length
    return { name: range.name, value: count }
  })
  
  const option = {
    title: {
      text: '完成率分布',
      left: 'center'
    },
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    series: [{
      name: '课文数量',
      type: 'pie',
      radius: '60%',
      data: data,
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }]
  }
  
  completionRateChartInstance.setOption(option)
}

// 更新分类统计图
const updateCategoryChart = () => {
  if (!categoryChart.value) return
  
  if (!categoryChartInstance) {
    categoryChartInstance = echarts.init(categoryChart.value)
  }
  
  // 按分类统计
  const categoryMap = {}
  stats.value.forEach(item => {
    const category = item.category || '未分类'
    if (!categoryMap[category]) {
      categoryMap[category] = { total: 0, completed: 0 }
    }
    categoryMap[category].total++
    if (item.completionRate === 100) {
      categoryMap[category].completed++
    }
  })
  
  const categories = Object.keys(categoryMap)
  const totalData = categories.map(cat => categoryMap[cat].total)
  const completedData = categories.map(cat => categoryMap[cat].completed)
  
  const option = {
    title: {
      text: '分类统计',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    legend: {
      data: ['总数', '已完成'],
      top: 30
    },
    xAxis: {
      type: 'category',
      data: categories
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: '总数',
        type: 'bar',
        data: totalData,
        itemStyle: {
          color: '#409EFF'
        }
      },
      {
        name: '已完成',
        type: 'bar',
        data: completedData,
        itemStyle: {
          color: '#67C23A'
        }
      }
    ]
  }
  
  categoryChartInstance.setOption(option)
}

// 更新趋势图
const updateTrendChart = () => {
  if (!trendChart.value) return
  
  if (!trendChartInstance) {
    trendChartInstance = echarts.init(trendChart.value)
  }
  
  const titles = stats.value.map(item => item.title.length > 10 ? item.title.substring(0, 10) + '...' : item.title)
  const completionRates = stats.value.map(item => item.completionRate)
  
  const option = {
    title: {
      text: '各课文完成情况',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      formatter: function(params) {
        const dataIndex = params[0].dataIndex
        const article = stats.value[dataIndex]
        return `${article.title}<br/>完成率: ${article.completionRate}%<br/>已完成: ${article.completedCount}人<br/>未完成: ${article.uncompletedCount}人`
      }
    },
    xAxis: {
      type: 'category',
      data: titles,
      axisLabel: {
        rotate: 45
      }
    },
    yAxis: {
      type: 'value',
      name: '完成率(%)',
      min: 0,
      max: 100
    },
    series: [{
      name: '完成率',
      type: 'line',
      data: completionRates,
      smooth: true,
      itemStyle: {
        color: '#409EFF'
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [{
            offset: 0, color: 'rgba(64, 158, 255, 0.3)'
          }, {
            offset: 1, color: 'rgba(64, 158, 255, 0.1)'
          }]
        }
      }
    }]
  }
  
  trendChartInstance.setOption(option)
}

// 查看课文详情
const viewDetails = (article) => {
  selectedArticle.value = article
  showDetailDialog.value = true
}

// 查看未完成学生
const viewUncompletedStudents = async (article) => {
  try {
    uncompletedLoading.value = true
    showUncompletedDialog.value = true
    
    const params = {
      articleId: article.id
    }
    if (filterForm.classId) {
      params.classId = filterForm.classId
    }
    
    const response = await getUncompletedStudents(params)
    uncompletedStudents.value = response.students || []
  } catch (error) {
    console.error('获取未完成学生列表失败:', error)
    ElMessage.error('获取未完成学生列表失败')
  } finally {
    uncompletedLoading.value = false
  }
}

// 查看所有未完成学生
const showAllUncompletedStudents = async () => {
  try {
    allUncompletedLoading.value = true
    showAllUncompletedDialog.value = true
    
    // 获取所有未完成的课文和学生信息
    const allUncompletedData = []
    
    for (const article of stats.value) {
      if (article.completionRate < 100) {
        const params = {
          articleId: article.id
        }
        if (filterForm.classId) {
          params.classId = filterForm.classId
        }
        
        const response = await getUncompletedStudents(params)
        const students = response.students || []
        
        students.forEach(student => {
          allUncompletedData.push({
            studentName: student.name,
            studentId: student.studentId,
            className: student.className,
            articleTitle: article.title,
            articleCategory: article.category,
            difficultyLevel: article.difficulty_level
          })
        })
      }
    }
    
    allUncompletedStudents.value = allUncompletedData
  } catch (error) {
    console.error('获取所有未完成学生列表失败:', error)
    ElMessage.error('获取所有未完成学生列表失败')
  } finally {
    allUncompletedLoading.value = false
  }
}

// 导出未完成名单
const exportUncompletedList = () => {
  if (allUncompletedStudents.value.length === 0) {
    ElMessage.warning('没有未完成的学生数据可导出')
    return
  }
  
  // 创建CSV内容
  const headers = ['学生姓名', '学号', '班级', '未完成课文', '课文分类', '难度']
  const csvContent = [
    headers.join(','),
    ...allUncompletedStudents.value.map(student => [
      student.studentName,
      student.studentId,
      student.className,
      student.articleTitle,
      student.articleCategory,
      getDifficultyText(student.difficultyLevel)
    ].join(','))
  ].join('\n')
  
  // 创建下载链接
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `未完成背诵学生名单_${new Date().toLocaleDateString()}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  ElMessage.success('未完成学生名单已导出')
}

// 分页处理
const handleSizeChange = (val) => {
  pagination.limit = val
  pagination.page = 1
}

const handleCurrentChange = (val) => {
  pagination.page = val
}

// 工具函数
const getCategoryTagType = (category) => {
  const typeMap = {
    '古诗词': 'primary',
    '现代诗': 'success',
    '散文': 'info',
    '文言文': 'warning',
    '其他': 'danger'
  }
  return typeMap[category] || 'info'
}

const getDifficultyTagType = (difficulty) => {
  const typeMap = {
    'easy': 'success',
    'medium': 'warning',
    'hard': 'danger'
  }
  return typeMap[difficulty] || 'info'
}

const getDifficultyText = (difficulty) => {
  const textMap = {
    'easy': '简单',
    'medium': '中等',
    'hard': '困难'
  }
  return textMap[difficulty] || difficulty
}

const getProgressColor = (percentage) => {
  if (percentage >= 80) return '#67C23A'
  if (percentage >= 60) return '#E6A23C'
  if (percentage >= 40) return '#F56C6C'
  return '#909399'
}

// 组件挂载
onMounted(async () => {
  await loadClasses()
  await loadStats()
  
  // 监听窗口大小变化，重新调整图表
  window.addEventListener('resize', () => {
    if (completionRateChartInstance) completionRateChartInstance.resize()
    if (categoryChartInstance) categoryChartInstance.resize()
    if (trendChartInstance) trendChartInstance.resize()
  })
})
</script>

<style scoped>
.article-stats-container {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  color: #303133;
}

.filter-card {
  margin-bottom: 20px;
}

.stats-overview {
  margin-bottom: 20px;
}

.stats-card {
  text-align: center;
}

.stats-item {
  padding: 20px;
}

.stats-value {
  font-size: 32px;
  font-weight: bold;
  color: #409EFF;
  margin-bottom: 8px;
}

.stats-label {
  font-size: 14px;
  color: #606266;
}

.charts-section {
  margin-bottom: 20px;
}

.chart-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart-container {
  height: 300px;
  width: 100%;
}

.chart-container-large {
  height: 400px;
  width: 100%;
}

.table-card {
  margin-bottom: 20px;
}

.completed-count {
  color: #67C23A;
  font-weight: bold;
}

.uncompleted-count {
  color: #F56C6C;
  font-weight: bold;
}

.pagination-container {
  margin-top: 20px;
  text-align: center;
}

.article-detail {
  padding: 20px;
}

.article-detail h3 {
  margin-top: 0;
  color: #303133;
}

.article-detail p {
  margin: 10px 0;
  color: #606266;
}

.no-data {
  text-align: center;
  padding: 40px;
  color: #909399;
}

.reminder-alert {
  margin-bottom: 20px;
}

.reminder-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.reminder-content p {
  margin: 0;
  flex: 1;
}

.all-uncompleted-header {
  margin-bottom: 15px;
  text-align: center;
}

.dialog-footer {
  text-align: right;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .article-stats-container {
    padding: 10px;
  }
  
  .stats-overview .el-col {
    margin-bottom: 10px;
  }
  
  .charts-section .el-col {
    margin-bottom: 20px;
  }
  
  .chart-container,
  .chart-container-large {
    height: 250px;
  }
}
</style>