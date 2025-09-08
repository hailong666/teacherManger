<template>
  <div class="dashboard-container">
    <el-card class="welcome-card">
      <template #header>
        <div class="card-header">
          <h3>欢迎使用语文教学管理系统</h3>
        </div>
      </template>
      <div class="dashboard-content">
        <p>这是一个专为语文教师设计的教学管理系统，帮助您更高效地管理教学工作。</p>
        <el-row :gutter="20" class="feature-list">
          <el-col :span="8">
            <el-card class="feature-card">
              <h4>学生签到</h4>
              <p>轻松管理学生出勤记录</p>
            </el-card>
          </el-col>
          <el-col :span="8">
            <el-card class="feature-card">
              <h4>背诵打卡</h4>
              <p>记录学生背诵情况</p>
            </el-card>
          </el-col>
          <el-col :span="8">
            <el-card class="feature-card">
              <h4>随机点名</h4>
              <p>公平、随机的课堂点名</p>
            </el-card>
          </el-col>
        </el-row>
      </div>
    </el-card>
  </div>
</template>

<script setup>
// 仪表盘组件逻辑
</script>

<style scoped>
.dashboard-container {
  padding: 20px;
}

.welcome-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dashboard-content {
  padding: 10px 0;
}

.feature-list {
  margin-top: 20px;
}

.feature-card {
  height: 150px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  transition: all 0.3s;
}

.feature-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}
</style>