<template>
  <div class="role-management">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>角色管理</h2>
      <el-button type="primary" @click="showCreateDialog">新增角色</el-button>
    </div>

    <!-- 角色列表 -->
    <el-card class="table-card">
      <el-table :data="roles" v-loading="loading" style="width: 100%">
        <el-table-column prop="id" label="ID" width="80"></el-table-column>
        <el-table-column prop="name" label="角色名称" width="150"></el-table-column>
        <el-table-column prop="description" label="描述" min-width="200"></el-table-column>
        <el-table-column label="权限" min-width="300">
          <template #default="scope">
            <div class="permissions-tags">
              <el-tag 
                v-for="permission in scope.row.permissions" 
                :key="permission.id"
                size="small"
                style="margin-right: 5px; margin-bottom: 5px;">
                {{ permission.name }}
              </el-tag>
              <span v-if="!scope.row.permissions || scope.row.permissions.length === 0" class="no-permissions">
                无权限
              </span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="180">
          <template #default="scope">
            {{ formatDate(scope.row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="scope">
            <el-button size="small" @click="editRole(scope.row)">编辑</el-button>
            <el-button 
              size="small" 
              type="danger" 
              @click="handleDeleteRole(scope.row)"
              :disabled="scope.row.name === 'admin'">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 创建/编辑角色对话框 -->
    <el-dialog 
      v-model="roleDialogVisible" 
      :title="isEdit ? '编辑角色' : '新增角色'"
      width="600px">
      <el-form :model="roleForm" :rules="roleRules" ref="roleFormRef" label-width="80px">
        <el-form-item label="角色名称" prop="name">
          <el-input v-model="roleForm.name" :disabled="isEdit && roleForm.name === 'admin'"></el-input>
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="roleForm.description" type="textarea" :rows="3"></el-input>
        </el-form-item>
        <el-form-item label="权限" prop="permissions">
          <div class="permissions-selection">
            <el-checkbox-group v-model="roleForm.permission_ids">
              <div class="permission-category" v-for="category in permissionCategories" :key="category.name">
                <h4>{{ category.name }}</h4>
                <div class="permission-items">
                  <el-checkbox 
                    v-for="permission in category.permissions" 
                    :key="permission.id"
                    :label="permission.id"
                    :value="permission.id">
                    {{ permission.name }}
                    <span class="permission-desc">{{ permission.description }}</span>
                  </el-checkbox>
                </div>
              </div>
            </el-checkbox-group>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="roleDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveRole" :loading="saving">保存</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 权限管理卡片 -->
    <el-card class="permissions-card" style="margin-top: 20px;">
      <template #header>
        <div class="card-header">
          <h3>系统权限</h3>
          <el-button type="primary" size="small" @click="loadPermissions">刷新权限</el-button>
        </div>
      </template>
      <div class="permissions-list">
        <div class="permission-category" v-for="category in permissionCategories" :key="category.name">
          <h4>{{ category.name }}</h4>
          <div class="permission-items">
            <el-tag 
              v-for="permission in category.permissions" 
              :key="permission.id"
              size="small"
              style="margin-right: 10px; margin-bottom: 5px;">
              {{ permission.name }}
              <span class="permission-desc">{{ permission.description }}</span>
            </el-tag>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getAllRoles, createRole, updateRole, deleteRole, getAllPermissions } from '@/api/user'

// 响应式数据
const loading = ref(false)
const saving = ref(false)
const roles = ref([])
const permissions = ref([])
const roleDialogVisible = ref(false)
const isEdit = ref(false)
const roleFormRef = ref(null)

// 角色表单
const roleForm = reactive({
  id: null,
  name: '',
  description: '',
  permission_ids: []
})

// 表单验证规则
const roleRules = {
  name: [
    { required: true, message: '请输入角色名称', trigger: 'blur' },
    { min: 2, max: 20, message: '角色名称长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  description: [
    { required: true, message: '请输入角色描述', trigger: 'blur' }
  ]
}

// 权限分类
const permissionCategories = computed(() => {
  const categories = {
    '用户管理': [],
    '班级管理': [],
    '考勤管理': [],
    '作业管理': [],
    '系统管理': [],
    '其他': []
  }
  
  permissions.value.forEach(permission => {
    const name = permission.name
    if (name.includes('user') || name.includes('用户')) {
      categories['用户管理'].push(permission)
    } else if (name.includes('class') || name.includes('班级')) {
      categories['班级管理'].push(permission)
    } else if (name.includes('attendance') || name.includes('考勤')) {
      categories['考勤管理'].push(permission)
    } else if (name.includes('assignment') || name.includes('homework') || name.includes('作业')) {
      categories['作业管理'].push(permission)
    } else if (name.includes('admin') || name.includes('system') || name.includes('系统')) {
      categories['系统管理'].push(permission)
    } else {
      categories['其他'].push(permission)
    }
  })
  
  // 过滤掉空分类
  return Object.entries(categories)
    .filter(([_, perms]) => perms.length > 0)
    .map(([name, perms]) => ({ name, permissions: perms }))
})

// 加载角色列表
const loadRoles = async () => {
  loading.value = true
  try {
    const response = await getAllRoles()
    roles.value = response.roles || []
  } catch (error) {
    console.error('加载角色列表失败:', error)
    ElMessage.error('加载角色列表失败')
  } finally {
    loading.value = false
  }
}

// 加载权限列表
const loadPermissions = async () => {
  try {
    const response = await getAllPermissions()
    permissions.value = response.permissions || []
  } catch (error) {
    console.error('加载权限列表失败:', error)
    ElMessage.error('加载权限列表失败')
  }
}

// 显示创建对话框
const showCreateDialog = () => {
  isEdit.value = false
  resetRoleForm()
  roleDialogVisible.value = true
}

// 编辑角色
const editRole = (role) => {
  isEdit.value = true
  roleForm.id = role.id
  roleForm.name = role.name
  roleForm.description = role.description
  roleForm.permission_ids = role.permissions ? role.permissions.map(p => p.id) : []
  roleDialogVisible.value = true
}

// 保存角色
const saveRole = async () => {
  if (!roleFormRef.value) return
  
  try {
    await roleFormRef.value.validate()
    saving.value = true
    
    const roleData = {
      name: roleForm.name,
      description: roleForm.description,
      permission_ids: roleForm.permission_ids
    }
    
    if (isEdit.value) {
      await updateRole(roleForm.id, roleData)
      ElMessage.success('角色更新成功')
    } else {
      await createRole(roleData)
      ElMessage.success('角色创建成功')
    }
    
    roleDialogVisible.value = false
    loadRoles()
  } catch (error) {
    console.error('保存角色失败:', error)
    ElMessage.error('保存角色失败')
  } finally {
    saving.value = false
  }
}

// 删除角色
const handleDeleteRole = async (role) => {
  if (role.name === 'admin') {
    ElMessage.warning('管理员角色不能删除')
    return
  }
  
  try {
    await ElMessageBox.confirm(`确定要删除角色 "${role.name}" 吗？此操作不可恢复！`, '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await deleteRole(role.id)
    ElMessage.success('角色删除成功')
    loadRoles()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除角色失败:', error)
      ElMessage.error('删除角色失败')
    }
  }
}

// 重置角色表单
const resetRoleForm = () => {
  roleForm.id = null
  roleForm.name = ''
  roleForm.description = ''
  roleForm.permission_ids = []
  
  if (roleFormRef.value) {
    roleFormRef.value.resetFields()
  }
}

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('zh-CN')
}

// 组件挂载时加载数据
onMounted(() => {
  loadRoles()
  loadPermissions()
})
</script>

<style scoped>
.role-management {
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

.table-card {
  margin-bottom: 20px;
}

.permissions-tags {
  max-width: 300px;
}

.no-permissions {
  color: #909399;
  font-style: italic;
}

.permissions-selection {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 15px;
}

.permission-category {
  margin-bottom: 20px;
}

.permission-category h4 {
  margin: 0 0 10px 0;
  color: #409eff;
  font-size: 14px;
  border-bottom: 1px solid #e4e7ed;
  padding-bottom: 5px;
}

.permission-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.permission-items .el-checkbox {
  margin-right: 0;
  margin-bottom: 0;
}

.permission-desc {
  color: #909399;
  font-size: 12px;
  margin-left: 8px;
}

.permissions-card .card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.permissions-card h3 {
  margin: 0;
  color: #303133;
}

.permissions-list .permission-category {
  margin-bottom: 15px;
}

.permissions-list .permission-items {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
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
  
  .permissions-selection {
    max-height: 300px;
  }
}
</style>