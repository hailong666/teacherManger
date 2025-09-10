<template>
  <div class="article-management">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>课文管理</h2>
      <el-button type="primary" @click="showCreateDialog">新增课文</el-button>
    </div>

    <!-- 搜索筛选 -->
    <el-card class="filter-card">
      <el-form :model="filterForm" inline>
        <el-form-item label="课文标题">
          <el-input v-model="filterForm.search" placeholder="请输入课文标题" clearable style="width: 200px;"></el-input>
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="filterForm.category" placeholder="选择分类" clearable style="width: 150px;">
            <el-option label="全部" value=""></el-option>
            <el-option label="古诗词" value="古诗词"></el-option>
            <el-option label="现代诗" value="现代诗"></el-option>
            <el-option label="散文" value="散文"></el-option>
            <el-option label="文言文" value="文言文"></el-option>
            <el-option label="其他" value="其他"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="难度">
          <el-select v-model="filterForm.difficulty" placeholder="选择难度" clearable style="width: 120px;">
            <el-option label="全部" value=""></el-option>
            <el-option label="简单" value="easy"></el-option>
            <el-option label="中等" value="medium"></el-option>
            <el-option label="困难" value="hard"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadArticles">搜索</el-button>
          <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 课文列表 -->
    <el-card class="table-card">
      <el-table :data="articles" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="80"></el-table-column>
        <el-table-column prop="title" label="课文标题" min-width="200"></el-table-column>
        <el-table-column prop="category" label="分类" width="120">
          <template #default="scope">
            <el-tag :type="getCategoryTagType(scope.row.category)">{{ scope.row.category }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="difficulty" label="难度" width="100">
          <template #default="scope">
            <el-tag :type="getDifficultyTagType(scope.row.difficulty)">{{ getDifficultyText(scope.row.difficulty) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="author" label="作者" width="120"></el-table-column>
        <el-table-column prop="createdBy.name" label="创建者" width="120"></el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="scope">
            {{ formatDateTime(scope.row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="scope">
            <el-button size="small" @click="viewArticle(scope.row)">查看</el-button>
            <el-button size="small" @click="editArticle(scope.row)">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDeleteArticle(scope.row)">删除</el-button>
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
          @size-change="loadArticles"
          @current-change="loadArticles">
        </el-pagination>
      </div>
    </el-card>

    <!-- 创建/编辑课文对话框 -->
    <el-dialog 
      v-model="articleDialogVisible" 
      :title="isEdit ? '编辑课文' : '新增课文'"
      width="800px"
      :close-on-click-modal="false">
      <el-form :model="articleForm" :rules="articleRules" ref="articleFormRef" label-width="80px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="课文标题" prop="title">
              <el-input v-model="articleForm.title" placeholder="请输入课文标题"></el-input>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="作者" prop="author">
              <el-input v-model="articleForm.author" placeholder="请输入作者"></el-input>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="分类" prop="category">
              <el-select v-model="articleForm.category" placeholder="选择分类" style="width: 100%;">
                <el-option label="古诗词" value="古诗词"></el-option>
                <el-option label="现代诗" value="现代诗"></el-option>
                <el-option label="散文" value="散文"></el-option>
                <el-option label="文言文" value="文言文"></el-option>
                <el-option label="其他" value="其他"></el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="难度" prop="difficulty">
              <el-select v-model="articleForm.difficulty" placeholder="选择难度" style="width: 100%;">
                <el-option label="简单" value="easy"></el-option>
                <el-option label="中等" value="medium"></el-option>
                <el-option label="困难" value="hard"></el-option>
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="课文内容" prop="content">
          <el-input 
            v-model="articleForm.content" 
            type="textarea" 
            :rows="10"
            placeholder="请输入课文内容"
            style="width: 100%;"></el-input>
        </el-form-item>
        <el-form-item label="描述">
          <el-input 
            v-model="articleForm.description" 
            type="textarea" 
            :rows="3"
            placeholder="请输入课文描述（可选）"
            style="width: 100%;"></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="articleDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveArticle" :loading="saving">保存</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 查看课文对话框 -->
    <el-dialog 
      v-model="viewDialogVisible" 
      title="查看课文"
      width="800px">
      <div v-if="currentArticle">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="课文标题">{{ currentArticle.title }}</el-descriptions-item>
          <el-descriptions-item label="作者">{{ currentArticle.author }}</el-descriptions-item>
          <el-descriptions-item label="分类">
            <el-tag :type="getCategoryTagType(currentArticle.category)">{{ currentArticle.category }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="难度">
            <el-tag :type="getDifficultyTagType(currentArticle.difficulty)">{{ getDifficultyText(currentArticle.difficulty) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="创建者">{{ currentArticle.createdBy?.name }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDateTime(currentArticle.createdAt) }}</el-descriptions-item>
        </el-descriptions>
        <div style="margin-top: 20px;">
          <h4>课文内容：</h4>
          <div class="article-content">{{ currentArticle.content }}</div>
        </div>
        <div v-if="currentArticle.description" style="margin-top: 20px;">
          <h4>课文描述：</h4>
          <p>{{ currentArticle.description }}</p>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getArticles, createArticle, updateArticle, deleteArticle } from '@/api/article'

// 响应式数据
const loading = ref(false)
const saving = ref(false)
const articles = ref([])
const articleDialogVisible = ref(false)
const viewDialogVisible = ref(false)
const isEdit = ref(false)
const articleFormRef = ref(null)
const currentArticle = ref(null)

// 筛选表单
const filterForm = reactive({
  search: '',
  category: '',
  difficulty: ''
})

// 分页数据
const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0
})

// 课文表单
const articleForm = reactive({
  id: null,
  title: '',
  author: '',
  category: '',
  difficulty: '',
  content: '',
  description: ''
})

// 表单验证规则
const articleRules = {
  title: [
    { required: true, message: '请输入课文标题', trigger: 'blur' },
    { min: 1, max: 100, message: '标题长度在 1 到 100 个字符', trigger: 'blur' }
  ],
  author: [
    { required: true, message: '请输入作者', trigger: 'blur' }
  ],
  category: [
    { required: true, message: '请选择分类', trigger: 'change' }
  ],
  difficulty: [
    { required: true, message: '请选择难度', trigger: 'change' }
  ],
  content: [
    { required: true, message: '请输入课文内容', trigger: 'blur' },
    { min: 10, message: '课文内容至少 10 个字符', trigger: 'blur' }
  ]
}

// 获取课文列表
const loadArticles = async () => {
  try {
    loading.value = true
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      ...filterForm
    }
    
    const response = await getArticles(params)
    articles.value = response.articles || []
    pagination.total = response.pagination?.total || 0
  } catch (error) {
    console.error('获取课文列表失败:', error)
    ElMessage.error('获取课文列表失败')
  } finally {
    loading.value = false
  }
}

// 显示创建对话框
const showCreateDialog = () => {
  isEdit.value = false
  resetForm()
  articleDialogVisible.value = true
}

// 编辑课文
const editArticle = (article) => {
  isEdit.value = true
  Object.assign(articleForm, {
    id: article.id,
    title: article.title,
    author: article.author,
    category: article.category,
    difficulty: article.difficulty,
    content: article.content,
    description: article.description || ''
  })
  articleDialogVisible.value = true
}

// 查看课文
const viewArticle = (article) => {
  currentArticle.value = article
  viewDialogVisible.value = true
}

// 保存课文
const saveArticle = async () => {
  try {
    await articleFormRef.value.validate()
    saving.value = true
    
    const articleData = {
      title: articleForm.title,
      author: articleForm.author,
      category: articleForm.category,
      difficulty: articleForm.difficulty,
      content: articleForm.content,
      description: articleForm.description
    }
    
    if (isEdit.value) {
      await updateArticle(articleForm.id, articleData)
      ElMessage.success('课文更新成功')
    } else {
      await createArticle(articleData)
      ElMessage.success('课文创建成功')
    }
    
    articleDialogVisible.value = false
    await loadArticles()
  } catch (error) {
    console.error('保存课文失败:', error)
    ElMessage.error(isEdit.value ? '更新课文失败' : '创建课文失败')
  } finally {
    saving.value = false
  }
}

// 删除课文
const handleDeleteArticle = (article) => {
  ElMessageBox.confirm(
    `确定要删除课文「${article.title}」吗？此操作不可恢复。`,
    '确认删除',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      await deleteArticle(article.id)
      ElMessage.success('课文删除成功')
      await loadArticles()
    } catch (error) {
      console.error('删除课文失败:', error)
      ElMessage.error('删除课文失败')
    }
  }).catch(() => {})
}

// 重置表单
const resetForm = () => {
  Object.assign(articleForm, {
    id: null,
    title: '',
    author: '',
    category: '',
    difficulty: '',
    content: '',
    description: ''
  })
  articleFormRef.value?.clearValidate()
}

// 重置筛选
const resetFilter = () => {
  Object.assign(filterForm, {
    search: '',
    category: '',
    difficulty: ''
  })
  pagination.page = 1
  loadArticles()
}

// 获取分类标签类型
const getCategoryTagType = (category) => {
  const typeMap = {
    '古诗词': 'primary',
    '现代诗': 'success',
    '散文': 'info',
    '文言文': 'warning',
    '其他': 'default'
  }
  return typeMap[category] || 'default'
}

// 获取难度标签类型
const getDifficultyTagType = (difficulty) => {
  const typeMap = {
    'easy': 'success',
    'medium': 'warning',
    'hard': 'danger'
  }
  return typeMap[difficulty] || 'default'
}

// 获取难度文本
const getDifficultyText = (difficulty) => {
  const textMap = {
    'easy': '简单',
    'medium': '中等',
    'hard': '困难'
  }
  return textMap[difficulty] || difficulty
}

// 格式化日期时间
const formatDateTime = (dateTime) => {
  if (!dateTime) return '-'
  return new Date(dateTime).toLocaleString('zh-CN')
}

// 组件挂载时加载数据
onMounted(() => {
  loadArticles()
})
</script>

<style scoped>
.article-management {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  color: #303133;
}

.filter-card {
  margin-bottom: 20px;
}

.table-card {
  margin-bottom: 20px;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.dialog-footer {
  text-align: right;
}

.article-content {
  background-color: #f5f7fa;
  padding: 15px;
  border-radius: 4px;
  white-space: pre-wrap;
  line-height: 1.6;
  max-height: 400px;
  overflow-y: auto;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .el-form--inline .el-form-item {
    display: block;
    margin-bottom: 10px;
  }
}
</style>