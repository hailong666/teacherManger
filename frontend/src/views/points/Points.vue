<template>
  <div class="points-container">
    <!-- 添加积分卡片 -->
    <el-card class="points-card">
      <template #header>
        <div class="card-header">
          <h3>添加积分</h3>
        </div>
      </template>
      <div class="add-points-section">
        <el-form :model="addForm" :rules="addRules" ref="addFormRef" label-width="100px" inline>
          <el-form-item label="选择班级" prop="classId">
            <el-select v-model="addForm.classId" placeholder="请选择班级" @change="getStudentsForClass" :loading="loadingClasses">
              <el-option
                v-for="cls in classList"
                :key="cls.id"
                :label="cls.name"
                :value="cls.id">
              </el-option>
            </el-select>
          </el-form-item>
          <el-form-item label="选择学生" prop="studentId">
            <el-select v-model="addForm.studentId" placeholder="请选择学生" :loading="loadingStudents">
              <el-option
                v-for="student in studentList"
                :key="student.id"
                :label="student.name"
                :value="student.id">
              </el-option>
            </el-select>
          </el-form-item>
          <el-form-item label="积分" prop="points">
            <el-input-number v-model="addForm.points" :min="-100" :max="100" placeholder="积分值"></el-input-number>
          </el-form-item>
          <el-form-item label="原因" prop="reason">
            <el-input v-model="addForm.reason" placeholder="积分原因" style="width: 200px;"></el-input>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="submitAddPoints" :loading="adding">添加积分</el-button>
          </el-form-item>
        </el-form>
      </div>
    </el-card>

    <!-- 班级积分排行榜 -->
    <el-card class="points-card">
      <template #header>
        <div class="card-header">
          <h3>班级积分排行榜</h3>
          <div>
            <el-select v-model="selectedClassId" placeholder="选择班级" @change="getLeaderboard" style="margin-right: 10px;">
              <el-option
                v-for="cls in classList"
                :key="cls.id"
                :label="cls.name"
                :value="cls.id">
              </el-option>
            </el-select>
            <el-button @click="getLeaderboard" :loading="loadingLeaderboard">刷新</el-button>
          </div>
        </div>
      </template>
      <div class="leaderboard-section">
        <el-table :data="leaderboardList" v-loading="loadingLeaderboard" style="width: 100%">
          <el-table-column label="排名" width="80">
            <template #default="scope">
              <span class="rank" :class="getRankClass(scope.$index + 1)">{{ scope.$index + 1 }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="studentName" label="学生姓名" width="150"></el-table-column>
          <el-table-column prop="totalPoints" label="总积分" width="120">
            <template #default="scope">
              <el-tag :type="scope.row.totalPoints >= 0 ? 'success' : 'danger'">{{ scope.row.totalPoints }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="recordCount" label="积分记录数" width="120"></el-table-column>
          <el-table-column label="操作">
            <template #default="scope">
              <el-button size="small" @click="viewStudentPoints(scope.row)">查看详情</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>

    <!-- 积分记录列表 -->
    <el-card class="points-card">
      <template #header>
        <div class="card-header">
          <h3>积分记录</h3>
          <div>
            <el-select v-model="filterForm.classId" placeholder="选择班级" @change="getPointsRecords" style="margin-right: 10px;">
              <el-option label="全部班级" value=""></el-option>
              <el-option
                v-for="cls in classList"
                :key="cls.id"
                :label="cls.name"
                :value="cls.id">
              </el-option>
            </el-select>
            <el-button @click="getPointsRecords" :loading="loadingRecords">刷新</el-button>
          </div>
        </div>
      </template>
      <div class="records-section">
        <el-table :data="recordsList" v-loading="loadingRecords" style="width: 100%">
          <el-table-column prop="studentName" label="学生姓名" width="120"></el-table-column>
          <el-table-column prop="className" label="班级" width="120"></el-table-column>
          <el-table-column prop="points" label="积分" width="100">
            <template #default="scope">
              <el-tag :type="scope.row.points >= 0 ? 'success' : 'danger'">{{ scope.row.points > 0 ? '+' : '' }}{{ scope.row.points }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="reason" label="原因" show-overflow-tooltip></el-table-column>
          <el-table-column prop="awardedBy.name" label="操作人" width="120"></el-table-column>
          <el-table-column prop="createdAt" label="时间" width="180"></el-table-column>
          <el-table-column label="操作" width="100">
            <template #default="scope">
              <el-button size="small" type="danger" @click="deleteRecord(scope.row)">删除</el-button>
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
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { addPoints, getStudentPoints, getClassLeaderboard, deletePointsRecord } from '@/api/points'
import { getClasses } from '@/api/class'
import { getStudentsByClass } from '@/api/randomCall'

// 响应式数据
const loading = ref(false)
const adding = ref(false)
const loadingClasses = ref(false)
const loadingStudents = ref(false)
const loadingLeaderboard = ref(false)
const loadingRecords = ref(false)
const addFormRef = ref()

const classList = ref([])
const studentList = ref([])
const leaderboardList = ref([])
const recordsList = ref([])
const selectedClassId = ref('')

// 表单数据
const addForm = reactive({
  classId: '',
  studentId: '',
  points: 1,
  reason: ''
})

const filterForm = reactive({
  classId: ''
})

// 分页数据
const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0
})

// 表单验证规则
const addRules = {
  classId: [{ required: true, message: '请选择班级', trigger: 'change' }],
  studentId: [{ required: true, message: '请选择学生', trigger: 'change' }],
  points: [{ required: true, message: '请输入积分', trigger: 'blur' }],
  reason: [{ required: true, message: '请输入积分原因', trigger: 'blur' }]
}

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

// 根据班级获取学生列表
const getStudentsForClass = async () => {
  if (!addForm.classId) {
    studentList.value = []
    return
  }
  
  loadingStudents.value = true
  try {
    const response = await getStudentsByClass(addForm.classId)
    if (response && response.students) {
      studentList.value = response.students
    } else {
      studentList.value = []
    }
  } catch (error) {
    ElMessage.error('获取学生列表失败：' + (error.response?.data?.message || error.message))
    studentList.value = []
  } finally {
    loadingStudents.value = false
  }
}

// 添加积分
const submitAddPoints = () => {
  addFormRef.value.validate(async (valid) => {
    if (valid) {
      adding.value = true
      try {
        await addPoints(addForm)
        ElMessage.success('积分添加成功')
        // 重置表单
        addFormRef.value.resetFields()
        studentList.value = []
        // 刷新数据
        getPointsRecords()
        if (selectedClassId.value === addForm.classId) {
          getLeaderboard()
        }
      } catch (error) {
        ElMessage.error('添加积分失败：' + (error.response?.data?.message || error.message))
      } finally {
        adding.value = false
      }
    }
  })
}

// 获取班级积分排行榜
const getLeaderboard = async () => {
  if (!selectedClassId.value) {
    ElMessage.warning('请选择班级')
    return
  }
  
  loadingLeaderboard.value = true
  try {
    const response = await getClassLeaderboard(selectedClassId.value)
    if (response && response.leaderboard) {
      leaderboardList.value = response.leaderboard
    } else {
      leaderboardList.value = []
    }
  } catch (error) {
    ElMessage.error('获取排行榜失败：' + (error.response?.data?.message || error.message))
    leaderboardList.value = []
  } finally {
    loadingLeaderboard.value = false
  }
}

// 获取积分记录列表
const getPointsRecords = async () => {
  loadingRecords.value = true
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit
    }
    if (filterForm.classId) {
      params.classId = filterForm.classId
    }
    
    const response = await getStudentPoints(params)
    if (response && response.pointsRecords) {
      recordsList.value = response.pointsRecords
      pagination.total = response.pagination?.total || 0
    } else {
      recordsList.value = []
      pagination.total = 0
    }
  } catch (error) {
    ElMessage.error('获取积分记录失败：' + (error.response?.data?.message || error.message))
    recordsList.value = []
    pagination.total = 0
  } finally {
    loadingRecords.value = false
  }
}

// 查看学生积分详情
const viewStudentPoints = (student) => {
  // 这里可以实现查看学生详细积分记录的功能
  ElMessage.info(`查看 ${student.studentName} 的积分详情`)
}

// 删除积分记录
const deleteRecord = (record) => {
  ElMessageBox.confirm('确定要删除这条积分记录吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await deletePointsRecord(record.id)
      ElMessage.success('删除成功')
      getPointsRecords()
      if (selectedClassId.value) {
        getLeaderboard()
      }
    } catch (error) {
      ElMessage.error('删除失败：' + (error.response?.data?.message || error.message))
    }
  }).catch(() => {})
}

// 分页处理
const handleSizeChange = (val) => {
  pagination.limit = val
  pagination.page = 1
  getPointsRecords()
}

const handleCurrentChange = (val) => {
  pagination.page = val
  getPointsRecords()
}

// 获取排名样式
const getRankClass = (rank) => {
  if (rank === 1) return 'rank-first'
  if (rank === 2) return 'rank-second'
  if (rank === 3) return 'rank-third'
  return ''
}

// 组件挂载时获取数据
onMounted(() => {
  getClassList()
  getPointsRecords()
})
</script>

<style scoped>
.points-container {
  padding: 20px;
}

.points-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.add-points-section {
  padding: 10px 0;
}

.leaderboard-section {
  padding: 10px 0;
}

.records-section {
  padding: 10px 0;
}

.rank {
  font-weight: bold;
  padding: 4px 8px;
  border-radius: 4px;
}

.rank-first {
  background-color: #ffd700;
  color: #fff;
}

.rank-second {
  background-color: #c0c0c0;
  color: #fff;
}

.rank-third {
  background-color: #cd7f32;
  color: #fff;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .points-container {
    padding: 10px;
  }
  
  .card-header {
    flex-direction: column;
    gap: 10px;
  }
}
</style>