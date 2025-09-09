<template>
  <div class="user-management">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>用户管理</h2>
      <el-button type="primary" @click="showCreateDialog">新增用户</el-button>
    </div>

    <!-- 搜索筛选 -->
    <el-card class="filter-card">
      <el-form :model="filterForm" inline>
        <el-form-item label="用户名">
          <el-input v-model="filterForm.search" placeholder="请输入用户名或姓名" clearable style="width: 200px;"></el-input>
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="filterForm.role" placeholder="选择角色" clearable style="width: 150px;">
            <el-option label="全部" value=""></el-option>
            <el-option
              v-for="role in roles"
              :key="role.id"
              :label="role.name"
              :value="role.name">
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filterForm.status" placeholder="选择状态" clearable style="width: 120px;">
            <el-option label="全部" value=""></el-option>
            <el-option label="激活" value="active"></el-option>
            <el-option label="禁用" value="inactive"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadUsers">搜索</el-button>
          <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 用户列表 -->
    <el-card class="table-card">
      <el-table :data="users" v-loading="loading" style="width: 100%">
        <el-table-column prop="id" label="ID" width="80"></el-table-column>
        <el-table-column prop="username" label="用户名" width="120"></el-table-column>
        <el-table-column prop="real_name" label="真实姓名" width="120"></el-table-column>
        <el-table-column prop="email" label="邮箱" width="200"></el-table-column>
        <el-table-column label="角色" width="120">
          <template #default="scope">
            <el-tag :type="getRoleTagType(scope.row.role?.name)">
              {{ scope.row.role?.name || '无角色' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.status === 'active' ? 'success' : 'danger'">
              {{ scope.row.status === 'active' ? '激活' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="180">
          <template #default="scope">
            {{ formatDate(scope.row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200">
          <template #default="scope">
            <el-button size="small" @click="editUser(scope.row)">编辑</el-button>
            <el-button 
              size="small" 
              :type="scope.row.status === 'active' ? 'warning' : 'success'"
              @click="toggleUserStatus(scope.row)">
              {{ scope.row.status === 'active' ? '禁用' : '启用' }}
            </el-button>
            <el-button size="small" type="danger" @click="handleDeleteUser(scope.row)">删除</el-button>
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
          @size-change="loadUsers"
          @current-change="loadUsers">
        </el-pagination>
      </div>
    </el-card>

    <!-- 创建/编辑用户对话框 -->
    <el-dialog 
      v-model="userDialogVisible" 
      :title="isEdit ? '编辑用户' : '新增用户'"
      width="500px">
      <el-form :model="userForm" :rules="userRules" ref="userFormRef" label-width="80px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="userForm.username" :disabled="isEdit"></el-input>
        </el-form-item>
        <el-form-item label="真实姓名" prop="real_name">
          <el-input v-model="userForm.real_name"></el-input>
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="userForm.email"></el-input>
        </el-form-item>
        <el-form-item label="角色" prop="role_id">
          <el-select v-model="userForm.role_id" placeholder="选择角色" style="width: 100%;">
            <el-option
              v-for="role in roles"
              :key="role.id"
              :label="role.name"
              :value="role.id">
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item v-if="!isEdit" label="密码" prop="password">
          <el-input v-model="userForm.password" type="password" show-password></el-input>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="userForm.status" style="width: 100%;">
            <el-option label="激活" value="active"></el-option>
            <el-option label="禁用" value="inactive"></el-option>
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="userDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveUser" :loading="saving">保存</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getAllUsers, createUser, updateUser, deleteUser, getAllRoles } from '@/api/user'

// 响应式数据
const loading = ref(false)
const saving = ref(false)
const users = ref([])
const roles = ref([])
const userDialogVisible = ref(false)
const isEdit = ref(false)
const userFormRef = ref(null)

// 筛选表单
const filterForm = reactive({
  search: '',
  role: '',
  status: ''
})

// 分页数据
const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0
})

// 用户表单
const userForm = reactive({
  id: null,
  username: '',
  real_name: '',
  email: '',
  role_id: null,
  password: '',
  status: 'active'
})

// 表单验证规则
const userRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度在 3 到 20 个字符', trigger: 'blur' }
  ],
  real_name: [
    { required: true, message: '请输入真实姓名', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  role_id: [
    { required: true, message: '请选择角色', trigger: 'change' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少 6 个字符', trigger: 'blur' }
  ],
  status: [
    { required: true, message: '请选择状态', trigger: 'change' }
  ]
}

// 加载用户列表
const loadUsers = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      search: filterForm.search,
      role: filterForm.role,
      status: filterForm.status
    }
    
    const response = await getAllUsers(params)
    users.value = response.users || []
    pagination.total = response.total || 0
  } catch (error) {
    console.error('加载用户列表失败:', error)
    ElMessage.error('加载用户列表失败')
  } finally {
    loading.value = false
  }
}

// 加载角色列表
const loadRoles = async () => {
  try {
    const response = await getAllRoles()
    roles.value = response.roles || []
  } catch (error) {
    console.error('加载角色列表失败:', error)
    ElMessage.error('加载角色列表失败')
  }
}

// 重置筛选
const resetFilter = () => {
  filterForm.search = ''
  filterForm.role = ''
  filterForm.status = ''
  pagination.page = 1
  loadUsers()
}

// 显示创建对话框
const showCreateDialog = () => {
  isEdit.value = false
  resetUserForm()
  userDialogVisible.value = true
}

// 编辑用户
const editUser = (user) => {
  isEdit.value = true
  userForm.id = user.id
  userForm.username = user.username
  userForm.real_name = user.real_name
  userForm.email = user.email
  userForm.role_id = user.role?.id
  userForm.status = user.status
  userDialogVisible.value = true
}

// 保存用户
const saveUser = async () => {
  if (!userFormRef.value) return
  
  try {
    await userFormRef.value.validate()
    saving.value = true
    
    if (isEdit.value) {
      await updateUser(userForm.id, {
        real_name: userForm.real_name,
        email: userForm.email,
        role_id: userForm.role_id,
        status: userForm.status
      })
      ElMessage.success('用户更新成功')
    } else {
      await createUser(userForm)
      ElMessage.success('用户创建成功')
    }
    
    userDialogVisible.value = false
    loadUsers()
  } catch (error) {
    console.error('保存用户失败:', error)
    ElMessage.error('保存用户失败')
  } finally {
    saving.value = false
  }
}

// 切换用户状态
const toggleUserStatus = async (user) => {
  const newStatus = user.status === 'active' ? 'inactive' : 'active'
  const action = newStatus === 'active' ? '启用' : '禁用'
  
  try {
    await ElMessageBox.confirm(`确定要${action}用户 "${user.real_name}" 吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await updateUser(user.id, { status: newStatus })
    ElMessage.success(`用户${action}成功`)
    loadUsers()
  } catch (error) {
    if (error !== 'cancel') {
      console.error(`${action}用户失败:`, error)
      ElMessage.error(`${action}用户失败`)
    }
  }
}

// 删除用户
const handleDeleteUser = async (user) => {
  try {
    await ElMessageBox.confirm(`确定要删除用户 "${user.real_name}" 吗？此操作不可恢复！`, '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await deleteUser(user.id)
    ElMessage.success('用户删除成功')
    loadUsers()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除用户失败:', error)
      ElMessage.error('删除用户失败')
    }
  }
}

// 重置用户表单
const resetUserForm = () => {
  userForm.id = null
  userForm.username = ''
  userForm.real_name = ''
  userForm.email = ''
  userForm.role_id = null
  userForm.password = ''
  userForm.status = 'active'
  
  if (userFormRef.value) {
    userFormRef.value.resetFields()
  }
}

// 获取角色标签类型
const getRoleTagType = (roleName) => {
  const typeMap = {
    'admin': 'danger',
    'teacher': 'warning',
    'student': 'success'
  }
  return typeMap[roleName] || 'info'
}

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('zh-CN')
}

// 组件挂载时加载数据
onMounted(() => {
  loadUsers()
  loadRoles()
})
</script>

<style scoped>
.user-management {
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