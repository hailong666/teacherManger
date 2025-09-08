<template>
  <div class="app-container">
    <el-config-provider>
      <router-view />
    </el-config-provider>
  </div>
</template>

<script setup>
// 组合式API，无需导出
</script>

<style>
/* 全局样式 */
html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', Arial, sans-serif;
}

.app-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

/* 移动端适配 */
@media (max-width: 768px) {
  html {
    font-size: 14px;
  }
}
</style>