<template>
  <div class="profile-container">
    <el-card class="profile-card">
      <template #header>
        <div class="card-header">
          <h3>个人中心</h3>
        </div>
      </template>
      <div class="profile-content">
        <p>这里是个人中心页面，您可以在这里管理个人信息和设置。</p>
      </div>
    </el-card>
  </div>
</template>

<script setup>
// 个人中心组件逻辑
</script>

<style scoped>
.profile-container {
  padding: 20px;
}

.profile-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.profile-content {
  padding: 10px 0;
}
</style>