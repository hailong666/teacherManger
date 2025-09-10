module.exports = {
  apps: [{
    name: 'teacher-manager-backend',
    script: 'src/app.js',
    cwd: '/var/www/teacher-manager/backend',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'development',
      PORT: 3002
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3002
    },
    // 日志配置
    error_file: '/var/log/teacher-manager/backend-error.log',
    out_file: '/var/log/teacher-manager/backend-out.log',
    log_file: '/var/log/teacher-manager/backend.log',
    time: true,
    
    // 重启配置
    max_restarts: 10,
    min_uptime: '10s',
    max_memory_restart: '1G',
    
    // 监控配置
    watch: false,
    ignore_watch: ['node_modules', 'uploads', 'logs'],
    
    // 其他配置
    autorestart: true,
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000
  }]
};