<template>
  <div class="class-management-container">
    <!-- 创建班级卡片 -->
    <el-card class="class-card">
      <template #header>
        <div class="card-header">
          <h3>创建班级</h3>
        </div>
      </template>
      <div class="create-class-section">
        <el-form :model="createForm" :rules="createRules" ref="createFormRef" label-width="100px">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="班级名称" prop="name">
                <el-input v-model="createForm.name" placeholder="请输入班级名称"></el-input>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="班主任" prop="teacherId">
                <el-select v-model="createForm.teacherId" placeholder="请选择班主任" style="width: 100%;" :loading="loadingTeachers">
                  <el-option
                    v-for="teacher in teacherList"
                    :key="teacher.id"
                    :label="teacher.name"
                    :value="teacher.id">
                  </el-option>
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="班级描述" prop="description">
            <el-input
              v-model="createForm.description"
              type="textarea"
              :rows="3"
              placeholder="请输入班级描述">
            </el-input>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="submitCreateClass" :loading="creating">创建班级</el-button>
            <el-button @click="resetCreateForm">重置</el-button>
          </el-form-item>
        </el-form>
      </div>
    </el-card>

    <!-- 班级列表卡片 -->
    <el-card class="class-card">
      <template #header>
        <div class="card-header">
          <h3>班级列表</h3>
          <div class="header-actions">
            <el-input
              v-model="searchKeyword"
              placeholder="搜索班级名称"
              style="width: 200px; margin-right: 10px;"
              @keyup.enter="getClassList"
            />
            <el-button @click="getClassList" :loading="loading">刷新</el-button>
          </div>
        </div>
      </template>
      <div class="class-list-section">
        <el-table :data="classList" v-loading="loading" style="width: 100%" empty-text="暂无班级数据">
          <el-table-column prop="name" label="班级名称" width="150" show-overflow-tooltip>
            <template #default="scope">
              <el-text class="class-name" type="primary">{{ scope.row.name }}</el-text>
            </template>
          </el-table-column>
          <el-table-column prop="description" label="班级描述" show-overflow-tooltip min-width="200">
            <template #default="scope">
              <el-text class="class-description">{{ scope.row.description || '暂无描述' }}</el-text>
            </template>
          </el-table-column>
          <el-table-column prop="teacherName" label="班主任" width="120">
            <template #default="scope">
              <el-tag :type="scope.row.teacherName === '未分配' ? 'warning' : 'success'" size="small">
                {{ scope.row.teacherName }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="studentCount" label="学生人数" width="100">
            <template #default="scope">
              <el-tag type="info" size="small">{{ scope.row.studentCount }}人</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="createdAt" label="创建时间" width="180">
            <template #default="scope">
              <el-text size="small">{{ scope.row.createdAt }}</el-text>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="250">
            <template #default="scope">
              <el-button size="small" @click="viewClass(scope.row)">查看</el-button>
              <el-button size="small" @click="editClass(scope.row)">编辑</el-button>
              <el-button size="small" @click="manageStudents(scope.row)">管理学生</el-button>
              <el-button size="small" type="danger" @click="handleDeleteClass(scope.row)">删除</el-button>
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

    <!-- 编辑班级对话框 -->
    <el-dialog v-model="editDialogVisible" title="编辑班级" width="50%">
      <el-form :model="editForm" :rules="editRules" ref="editFormRef" label-width="100px">
        <el-form-item label="班级名称" prop="name">
          <el-input v-model="editForm.name" placeholder="请输入班级名称"></el-input>
        </el-form-item>
        <el-form-item label="班主任" prop="teacherId">
          <el-select v-model="editForm.teacherId" placeholder="请选择班主任" style="width: 100%;">
            <el-option
              v-for="teacher in teacherList"
              :key="teacher.id"
              :label="teacher.name"
              :value="teacher.id">
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="班级描述" prop="description">
          <el-input
            v-model="editForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入班级描述">
          </el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="editDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitEditClass" :loading="updating">确定</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 班级详情对话框 -->
    <el-dialog v-model="detailDialogVisible" title="班级详情" width="60%">
      <div v-if="selectedClass">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="班级名称">{{ selectedClass.name }}</el-descriptions-item>
          <el-descriptions-item label="班主任">{{ selectedClass.teacherName }}</el-descriptions-item>
          <el-descriptions-item label="学生人数">{{ selectedClass.studentCount }}人</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ selectedClass.createdAt }}</el-descriptions-item>
          <el-descriptions-item label="班级描述" :span="2">{{ selectedClass.description || '暂无描述' }}</el-descriptions-item>
        </el-descriptions>
        
        <div v-if="classStudents.length > 0" style="margin-top: 20px;">
          <h4>班级学生</h4>
          <el-table :data="classStudents" style="width: 100%">
            <el-table-column prop="name" label="姓名" width="120"></el-table-column>
            <el-table-column prop="username" label="用户名" width="120"></el-table-column>
            <el-table-column prop="email" label="邮箱"></el-table-column>
          </el-table>
        </div>
      </div>
    </el-dialog>

    <!-- 管理学生对话框 -->
    <el-dialog v-model="studentsDialogVisible" title="管理学生" width="70%">
      <div class="students-management">
        <div class="add-students-section">
          <h4>添加学生到班级</h4>
          <el-select
            v-model="selectedStudentIds"
            multiple
            placeholder="选择学生"
            style="width: 100%; margin-bottom: 10px;"
            :loading="loadingStudents"
          >
            <el-option
              v-for="student in availableStudents"
              :key="student.id"
              :label="`${student.name} (${student.username})`"
              :value="student.id">
            </el-option>
          </el-select>
          <el-button type="primary" @click="addStudentsToClass" :loading="addingStudents">添加学生</el-button>
        </div>
        
        <div v-if="classStudents.length > 0" class="current-students-section">
          <h4>当前班级学生</h4>
          <el-table :data="classStudents" style="width: 100%">
            <el-table-column prop="name" label="姓名" width="120"></el-table-column>
            <el-table-column prop="username" label="用户名" width="120"></el-table-column>
            <el-table-column prop="email" label="邮箱"></el-table-column>
            <el-table-column label="操作" width="100">
              <template #default="scope">
                <el-button size="small" type="danger" @click="removeStudentFromClass(scope.row)">移除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getClasses, createClass, updateClass, deleteClass, addStudentsToClass as addStudentsAPI, removeStudentFromClass as removeStudentAPI, getClassById } from '@/api/class'
import { getAllUsers } from '@/api/user'

// 响应式数据
const loading = ref(false)
const creating = ref(false)
const updating = ref(false)
const loadingTeachers = ref(false)
const loadingStudents = ref(false)
const addingStudents = ref(false)
const createFormRef = ref()
const editFormRef = ref()

const classList = ref([])
const teacherList = ref([])
const availableStudents = ref([])
const classStudents = ref([])
const selectedClass = ref(null)
const selectedStudentIds = ref([])
const searchKeyword = ref('')

// 对话框状态
const editDialogVisible = ref(false)
const detailDialogVisible = ref(false)
const studentsDialogVisible = ref(false)

// 表单数据
const createForm = reactive({
  name: '',
  description: '',
  teacherId: ''
})

const editForm = reactive({
  id: '',
  name: '',
  description: '',
  teacherId: ''
})

// 分页数据
const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0
})

// 表单验证规则
const createRules = {
  name: [
    { required: true, message: '请输入班级名称', trigger: 'blur' },
    { min: 2, max: 50, message: '班级名称长度在 2 到 50 个字符', trigger: 'blur' },
    { pattern: /^[\u4e00-\u9fa5a-zA-Z0-9\s]+$/, message: '班级名称只能包含中文、英文、数字和空格', trigger: 'blur' }
  ],
  teacherId: [{ required: true, message: '请选择班主任', trigger: 'change' }],
  description: [
    { max: 200, message: '班级描述不能超过200个字符', trigger: 'blur' }
  ]
}

const editRules = {
  name: [{ required: true, message: '请输入班级名称', trigger: 'blur' }],
  teacherId: [{ required: true, message: '请选择班主任', trigger: 'change' }]
}

// 获取班级列表
const getClassList = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit
    }
    if (searchKeyword.value?.trim()) {
      params.search = searchKeyword.value.trim()
    }
    
    const response = await getClasses(params)
    
    // 确保数据格式正确
    if (response) {
      classList.value = Array.isArray(response.classes) ? response.classes : []
      pagination.total = response.pagination?.total || classList.value.length
      
      // 格式化班级数据，确保显示完整信息
      classList.value = classList.value.map(classItem => ({
        ...classItem,
        studentCount: classItem.studentCount || 0,
        teacherName: classItem.teacherName || classItem.teacher?.name || '未分配',
        createdAt: classItem.createdAt ? new Date(classItem.createdAt).toLocaleString() : '未知'
      }))
      
      if (classList.value.length === 0 && searchKeyword.value) {
        ElMessage.info('未找到匹配的班级')
      }
    } else {
      classList.value = []
      pagination.total = 0
    }
  } catch (error) {
    console.error('获取班级列表失败:', error)
    ElMessage.error(error.response?.data?.message || '获取班级列表失败，请稍后重试')
    classList.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

// 获取教师列表
const getTeacherList = async () => {
  loadingTeachers.value = true
  try {
    const response = await getAllUsers({ role: 'teacher', limit: 100 })
    teacherList.value = response.data?.users || []
  } catch (error) {
    console.error('获取教师列表失败:', error)
    ElMessage.error(error.response?.data?.message || '获取教师列表失败，请稍后重试')
    teacherList.value = []
  } finally {
    loadingTeachers.value = false
  }
}

// 获取学生列表
const getStudentList = async () => {
  loadingStudents.value = true
  try {
    const response = await getAllUsers({ role: 'student', limit: 1000 })
    availableStudents.value = response.data?.users || []
  } catch (error) {
    console.error('获取学生列表失败:', error)
    ElMessage.error(error.response?.data?.message || '获取学生列表失败，请稍后重试')
    availableStudents.value = []
  } finally {
    loadingStudents.value = false
  }
}

// 创建班级
const submitCreateClass = async () => {
  if (!createFormRef.value) return
  
  await createFormRef.value.validate(async (valid) => {
    if (valid) {
      creating.value = true
      try {
        // 验证班级名称是否重复
        const existingClass = classList.value.find(c => c.name === createForm.name.trim())
        if (existingClass) {
          ElMessage.warning('班级名称已存在，请使用其他名称')
          return
        }
        
        const response = await createClass({
          ...createForm,
          name: createForm.name.trim(),
          description: createForm.description?.trim() || ''
        })
        
        ElMessage.success(`班级「${createForm.name}」创建成功！`)
        resetCreateForm()
        await getClassList() // 刷新列表
        
        // 滚动到班级列表顶部
        const classListElement = document.querySelector('.class-list-section')
        if (classListElement) {
          classListElement.scrollIntoView({ behavior: 'smooth' })
        }
      } catch (error) {
        console.error('创建班级失败:', error)
        const errorMsg = error.response?.data?.message || '创建班级失败，请检查网络连接后重试'
        ElMessage.error(errorMsg)
      } finally {
        creating.value = false
      }
    } else {
      ElMessage.warning('请完善班级信息后再提交')
    }
  })
}

// 重置创建表单
const resetCreateForm = () => {
  if (createFormRef.value) {
    createFormRef.value.resetFields()
  }
  Object.assign(createForm, {
    name: '',
    description: '',
    teacherId: ''
  })
}

// 查看班级详情
const viewClass = async (classItem) => {
  try {
    const response = await getClassById(classItem.id)
    selectedClass.value = response.class
    classStudents.value = response.class.students || []
    detailDialogVisible.value = true
  } catch (error) {
    ElMessage.error('获取班级详情失败')
  }
}

// 编辑班级
const editClass = (classItem) => {
  Object.assign(editForm, {
    id: classItem.id,
    name: classItem.name,
    description: classItem.description,
    teacherId: classItem.teacherId
  })
  editDialogVisible.value = true
}

// 提交编辑
const submitEditClass = async () => {
  if (!editFormRef.value) return
  
  await editFormRef.value.validate(async (valid) => {
    if (valid) {
      updating.value = true
      try {
        await updateClass(editForm.id, {
          name: editForm.name,
          description: editForm.description,
          teacherId: editForm.teacherId
        })
        ElMessage.success('班级更新成功')
        editDialogVisible.value = false
        getClassList()
      } catch (error) {
        ElMessage.error(error.response?.data?.message || '更新班级失败')
      } finally {
        updating.value = false
      }
    }
  })
}

// 管理学生
const manageStudents = async (classItem) => {
  selectedClass.value = classItem
  selectedStudentIds.value = []
  
  // 获取班级详情和学生列表
  try {
    const [classResponse] = await Promise.all([
      getClassById(classItem.id),
      getStudentList()
    ])
    
    classStudents.value = classResponse.class.students || []
    
    // 过滤出不在当前班级的学生
    const currentStudentIds = classStudents.value.map(s => s.id)
    availableStudents.value = availableStudents.value.filter(s => !currentStudentIds.includes(s.id))
    
    studentsDialogVisible.value = true
  } catch (error) {
    ElMessage.error('获取班级信息失败')
  }
}

// 添加学生到班级
const addStudentsToClass = async () => {
  if (selectedStudentIds.value.length === 0) {
    ElMessage.warning('请选择要添加的学生')
    return
  }
  
  addingStudents.value = true
  try {
    await addStudentsAPI(selectedClass.value.id, selectedStudentIds.value)
    ElMessage.success('学生添加成功')
    selectedStudentIds.value = []
    
    // 刷新班级学生列表
    const response = await getClassById(selectedClass.value.id)
    classStudents.value = response.class.students || []
    
    // 更新可选学生列表
    const currentStudentIds = classStudents.value.map(s => s.id)
    await getStudentList()
    availableStudents.value = availableStudents.value.filter(s => !currentStudentIds.includes(s.id))
    
    getClassList()
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '添加学生失败')
  } finally {
    addingStudents.value = false
  }
}

// 从班级移除学生
const removeStudentFromClass = async (student) => {
  try {
    await ElMessageBox.confirm(
      `确定要将学生 ${student.name} 从班级中移除吗？`,
      '确认移除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await removeStudentAPI(selectedClass.value.id, student.id)
    ElMessage.success('学生移除成功')
    
    // 刷新班级学生列表
    const response = await getClassById(selectedClass.value.id)
    classStudents.value = response.class.students || []
    
    // 更新可选学生列表
    availableStudents.value.push(student)
    
    getClassList()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.message || '移除学生失败')
    }
  }
}

// 删除班级
const handleDeleteClass = async (classItem) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除班级 ${classItem.name} 吗？此操作不可恢复！`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await deleteClass(classItem.id)
    ElMessage.success('班级删除成功')
    getClassList()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.message || '删除班级失败')
    }
  }
}

// 分页处理
const handleSizeChange = (val) => {
  pagination.limit = val
  pagination.page = 1
  getClassList()
}

const handleCurrentChange = (val) => {
  pagination.page = val
  getClassList()
}

// 组件挂载时获取数据
onMounted(() => {
  getClassList()
  getTeacherList()
})
</script>

<style scoped>
.class-management-container {
  padding: 20px;
}

.class-card {
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

.create-class-section {
  padding: 10px 0;
}

.class-list-section {
  padding: 10px 0;
}

.dialog-footer {
  text-align: right;
}

.students-management {
  padding: 10px 0;
}

.add-students-section {
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #ebeef5;
}

.current-students-section h4,
.add-students-section h4 {
  margin-bottom: 15px;
  color: #303133;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .class-management-container {
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
  
  .el-col {
    margin-bottom: 10px;
  }
}
</style>