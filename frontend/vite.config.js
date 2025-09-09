import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import history from 'connect-history-api-fallback'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true
      }
    }
  },
  // 配置开发服务器中间件处理SPA路由
  configureServer(server) {
    server.middlewares.use(
      history({
        rewrites: [
          { from: /^\/api\/.*$/, to: function(context) {
            return context.parsedUrl.pathname;
          }}
        ]
      })
    )
  }
})