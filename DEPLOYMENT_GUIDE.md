# 教师管理系统部署指南

## 项目架构概述

### 技术栈
- **后端**: Node.js + Express + TypeORM + MySQL
- **前端**: Vue 3 + Vite + Element Plus + Pinia
- **数据库**: MySQL 8.0+
- **Web服务器**: Nginx (推荐)
- **进程管理**: PM2

### 项目结构
```
teacherManager/
├── backend/          # 后端API服务
│   ├── src/
│   ├── package.json
│   └── .env.example
├── frontend/         # 前端Vue应用
│   ├── src/
│   ├── package.json
│   └── vite.config.js
└── database_migration.sql  # 数据库迁移脚本
```

## 服务器环境要求

### 系统要求
- **操作系统**: CentOS 7+ / CentOS Stream 8+
- **内存**: 最低2GB，推荐4GB+
- **存储**: 最低20GB可用空间
- **网络**: 公网IP地址（如需外网访问）

### 软件依赖
- Node.js 16.x+
- MySQL 8.0+
- Nginx 1.18+
- PM2 (全局安装)
- Git

## 第一步：Ubuntu服务器环境准备

### 1.1 更新系统包
```bash
# Ubuntu 22.04
sudo apt update && sudo apt upgrade -y

# 安装基础工具
sudo apt install -y wget curl git vim unzip software-properties-common
```

### 1.2 安装Node.js

**方法一：使用NodeSource仓库（推荐）**
```bash
# Ubuntu 22.04 - 使用NodeSource仓库安装Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node --version
npm --version
```

**方法二：使用Ubuntu官方仓库**
```bash
# 安装Node.js和npm
sudo apt install -y nodejs npm

# 如果版本过低，可以使用snap安装最新版本
sudo snap install node --classic

# 验证安装
node --version
npm --version
```

**方法三：使用NVM安装（开发环境推荐）**
```bash
# 安装NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# 重新加载环境变量
source ~/.bashrc

# 安装Node.js 18
nvm install 18
nvm use 18
nvm alias default 18

# 验证安装
node --version
npm --version
```

### 1.3 安装MySQL 8.0
```bash
# Ubuntu 22.04 - 安装MySQL 8.0
sudo apt update
sudo apt install -y mysql-server

# 启动MySQL服务
sudo systemctl start mysql
sudo systemctl enable mysql

# 安全配置
sudo mysql_secure_installation

# 创建数据库用户（可选）
sudo mysql -e "CREATE USER 'teacher_admin'@'localhost' IDENTIFIED BY 'your_password';"
sudo mysql -e "GRANT ALL PRIVILEGES ON *.* TO 'teacher_admin'@'localhost' WITH GRANT OPTION;"
sudo mysql -e "FLUSH PRIVILEGES;"
```

### 1.4 安装Nginx
```bash
# Ubuntu 22.04 - 安装Nginx
sudo apt install -y nginx

# 启动Nginx服务
sudo systemctl start nginx
sudo systemctl enable nginx

# 配置防火墙
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### 1.5 安装PM2和其他依赖
```bash
# 安装Git
sudo apt install -y git

# 安装构建工具
sudo apt install -y build-essential python3 python3-pip

# 全局安装PM2
sudo npm install -g pm2

# 设置PM2开机自启
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME
```

## 第二步：数据库配置

### 2.1 创建数据库和用户
```sql
-- 登录MySQL
sudo mysql -u root -p

-- 创建数据库
CREATE DATABASE teacher_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建用户
CREATE USER 'teacher_user'@'localhost' IDENTIFIED BY 'your_secure_password';

-- 授权
GRANT ALL PRIVILEGES ON teacher_manager.* TO 'teacher_user'@'localhost';
FLUSH PRIVILEGES;

-- 退出
EXIT;
```

### 2.2 导入数据库结构
```bash
# 如果有数据库迁移脚本
mysql -u teacher_user -p teacher_manager < database_migration.sql
```

## 第三步：部署后端服务

### 3.1 上传代码到服务器
```bash
# 创建项目目录
sudo mkdir -p /var/www/teacher-manager
sudo chown $USER:$USER /var/www/teacher-manager

# 克隆代码（或上传代码包）
cd /var/www/teacher-manager
git clone <your-repository-url> .

# 或者使用scp上传
# scp -r ./teacherManager user@server:/var/www/teacher-manager/
```

### 3.2 配置后端环境
```bash
# 进入后端目录
cd /var/www/teacher-manager/backend

# 安装依赖
npm install --production

# 复制环境变量配置
cp .env.example .env
```

### 3.3 编辑后端环境变量
```bash
# 编辑.env文件
nano .env
```

```env
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=teacher_user
DB_PASSWORD=your_secure_password
DB_DATABASE=teacher_manager

# 服务器配置
PORT=3002
NODE_ENV=production

# JWT密钥
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=24h

# 文件上传路径
UPLOAD_PATH=/var/www/teacher-manager/backend/uploads
```

### 3.4 创建上传目录
```bash
mkdir -p /var/www/teacher-manager/backend/uploads
chmod 755 /var/www/teacher-manager/backend/uploads
```

### 3.5 使用PM2启动后端服务
```bash
# 创建PM2配置文件
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'teacher-manager-backend',
    script: 'src/app.js',
    cwd: '/var/www/teacher-manager/backend',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3002
    },
    error_file: '/var/log/teacher-manager/backend-error.log',
    out_file: '/var/log/teacher-manager/backend-out.log',
    log_file: '/var/log/teacher-manager/backend.log',
    time: true,
    max_restarts: 10,
    min_uptime: '10s',
    max_memory_restart: '1G'
  }]
};
EOF

# 创建日志目录
sudo mkdir -p /var/log/teacher-manager
sudo chown $USER:$USER /var/log/teacher-manager

# 启动后端服务
pm2 start ecosystem.config.js

# 保存PM2配置
pm2 save
```

## 第四步：部署前端应用

### 4.1 构建前端应用
```bash
# 进入前端目录
cd /var/www/teacher-manager/frontend

# 安装依赖
npm install

# 构建生产版本
npm run build
```

### 4.2 配置前端API地址
在构建前，确保前端配置正确的API地址：

```bash
# 编辑vite.config.js或创建.env.production文件
cat > .env.production << EOF
VITE_API_BASE_URL=http://your-domain.com/api
# 或者使用IP地址
# VITE_API_BASE_URL=http://your-server-ip/api
EOF
```

## 第五步：配置Nginx

### 5.1 创建Nginx配置文件
```bash
sudo nano /etc/nginx/sites-available/teacher-manager
```

```nginx
server {
    listen 80;
    server_name your-domain.com;  # 替换为你的域名或IP
    
    # 前端静态文件
    location / {
        root /var/www/teacher-manager/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
        
        # 缓存静态资源
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # 后端API代理
    location /api/ {
        proxy_pass http://localhost:3002/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # 文件上传目录
    location /uploads/ {
        alias /var/www/teacher-manager/backend/uploads/;
        expires 1y;
        add_header Cache-Control "public";
    }
    
    # 安全配置
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
```

### 5.2 启用站点配置
```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/teacher-manager /etc/nginx/sites-enabled/

# 测试Nginx配置
sudo nginx -t

# 重启Nginx
sudo systemctl restart nginx
```

## 第六步：配置防火墙和SELinux

### 6.1 配置防火墙
```bash
# Ubuntu ufw
sudo ufw enable

# 开放必要端口
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw allow 3002/tcp  # 后端API端口（可选）

# 查看防火墙状态
sudo ufw status
```

### 6.2 系统优化
```bash
# Ubuntu默认不使用SELinux，使用AppArmor
# 检查AppArmor状态
sudo systemctl status apparmor

# 增加文件描述符限制
echo "* soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "* hard nofile 65536" | sudo tee -a /etc/security/limits.conf

# 优化内核参数
echo "net.core.somaxconn = 65535" | sudo tee -a /etc/sysctl.conf
echo "net.ipv4.tcp_max_syn_backlog = 65535" | sudo tee -a /etc/sysctl.conf
echo "vm.swappiness = 10" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## 第七步：SSL证书配置（可选）

### 7.1 使用Let's Encrypt免费证书
```bash
# Ubuntu 22.04 - 安装Certbot
sudo apt install -y certbot python3-certbot-nginx

# 获取SSL证书（替换your-domain.com为实际域名）
sudo certbot --nginx -d your-domain.com

# 设置自动续期
sudo crontab -e
# 添加以下行：
# 0 12 * * * /usr/bin/certbot renew --quiet

# 测试自动续期
sudo certbot renew --dry-run
```

## 第八步：CentOS系统优化

### 8.1 调整系统参数
```bash
# 增加文件描述符限制
echo "* soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "* hard nofile 65536" | sudo tee -a /etc/security/limits.conf

# 调整内核参数
echo "net.core.somaxconn = 65535" | sudo tee -a /etc/sysctl.conf
echo "net.ipv4.tcp_max_syn_backlog = 65535" | sudo tee -a /etc/sysctl.conf
echo "vm.swappiness = 10" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# 禁用不必要的服务（可选）
sudo systemctl disable postfix
sudo systemctl stop postfix
```

### 8.2 配置日志轮转
```bash
# 创建应用日志轮转配置
sudo tee /etc/logrotate.d/teacher-manager << EOF
/var/log/teacher-manager/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        /bin/systemctl reload nginx.service > /dev/null 2>/dev/null || true
        /bin/systemctl reload mysqld.service > /dev/null 2>/dev/null || true
    endscript
}
EOF

# 测试日志轮转配置
sudo logrotate -d /etc/logrotate.d/teacher-manager
```

## 第九步：部署脚本

### 9.1 创建部署脚本
```bash
cat > /var/www/teacher-manager/deploy.sh << 'EOF'
#!/bin/bash

# 教师管理系统部署脚本
set -e

PROJECT_DIR="/var/www/teacher-manager"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

echo "开始部署教师管理系统..."

# 拉取最新代码
echo "拉取最新代码..."
cd $PROJECT_DIR
git pull origin main

# 部署后端
echo "部署后端服务..."
cd $BACKEND_DIR
npm install --production
pm2 restart teacher-manager-backend

# 部署前端
echo "构建前端应用..."
cd $FRONTEND_DIR
npm install
npm run build

# 重启Nginx
echo "重启Nginx..."
sudo systemctl restart nginx

echo "部署完成！"
echo "后端服务状态："
pm2 status teacher-manager-backend
echo "Nginx状态："
sudo systemctl status nginx --no-pager -l
EOF

# 添加执行权限
chmod +x /var/www/teacher-manager/deploy.sh
```

## 第十步：CentOS监控和维护

### 10.1 设置系统监控
```bash
# 安装监控工具
sudo apt install -y htop iotop

# 安装系统状态工具
sudo apt install -y sysstat

# 启用sysstat服务
sudo systemctl enable sysstat
sudo systemctl start sysstat

# 设置定时任务监控
crontab -e
# 添加以下内容：
# */5 * * * * /var/www/teacher-manager/monitor.sh
# 0 2 * * * /var/www/teacher-manager/backup.sh
# 0 3 * * 0 /var/www/teacher-manager/ssl_renew.sh
```

### 10.2 CentOS性能监控命令
```bash
# 查看系统资源使用情况
top
htop
free -h
df -h
iostat -x 1 5  # 磁盘I/O监控
sar -u 1 5     # CPU使用率监控

# 查看网络连接
netstat -tulpn
ss -tulpn

# 查看进程状态
ps aux | grep node
ps aux | grep nginx
ps aux | grep mysqld

# 查看服务状态
sudo systemctl status nginx
sudo systemctl status mysqld
sudo systemctl status firewalld

# PM2 监控
pm2 status
pm2 logs
pm2 monit
pm2 show teacher-manager-backend
```

### 10.3 查看服务状态
```bash
# 查看PM2进程
pm2 status
pm2 logs teacher-manager-backend

# 查看Nginx状态
sudo systemctl status nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# 查看系统资源
htop
df -h
free -h
```

### 10.4 备份脚本
```bash
cat > /var/www/teacher-manager/backup.sh << 'EOF'
#!/bin/bash

# 备份脚本
BACKUP_DIR="/var/backups/teacher-manager"
DATE=$(date +%Y%m%d_%H%M%S)

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份数据库
mysqldump -u teacher_user -p teacher_manager > $BACKUP_DIR/database_$DATE.sql

# 备份上传文件
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /var/www/teacher-manager/backend/uploads/

# 删除7天前的备份
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "备份完成：$DATE"
EOF

chmod +x /var/www/teacher-manager/backup.sh

# 设置定时备份
(crontab -l 2>/dev/null; echo "0 2 * * * /var/www/teacher-manager/backup.sh") | crontab -
```

## Ubuntu故障排除

### 常见问题

### 问题1：Node.js版本问题
**问题现象：**
```
node: command not found
或者 Node.js版本过低
```

**解决方案：**
```bash
# 方案1：检查当前Node.js版本
node --version
npm --version

# 方案2：使用NodeSource仓库安装最新版本
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 方案3：使用NVM管理Node.js版本
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18

# 方案4：使用snap安装
sudo snap install node --classic
```

### 问题2：端口被占用
```bash
# 查看端口占用
sudo netstat -tulpn | grep :3002
sudo ss -tulpn | grep :3002
sudo lsof -i :3002

# 杀死占用进程
sudo kill -9 <PID>

# 或者使用fuser
sudo fuser -k 3002/tcp

# 检查防火墙是否阻止端口
sudo ufw status
sudo ufw allow 3002/tcp
```

### 问题3：数据库连接失败
```bash
# 检查MySQL服务状态
sudo systemctl status mysql

# 重启MySQL服务
sudo systemctl restart mysql

# 查看MySQL错误日志
sudo tail -f /var/log/mysql/error.log

# 测试数据库连接
mysql -u root -p -e "SELECT 1;"

# 检查MySQL配置
sudo cat /etc/mysql/mysql.conf.d/mysqld.cnf

# Ubuntu特有：如果使用auth_socket插件
sudo mysql
# ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'password';

# 重置MySQL root密码
sudo systemctl stop mysql
sudo mysqld_safe --skip-grant-tables &
mysql -u root
# 在MySQL中执行：
# ALTER USER 'root'@'localhost' IDENTIFIED BY 'new_password';
# FLUSH PRIVILEGES;
# EXIT;
sudo systemctl restart mysql
```

### 问题4：Nginx配置错误
```bash
# 测试Nginx配置
sudo nginx -t

# 重新加载Nginx配置
sudo systemctl reload nginx

# 查看Nginx错误日志
sudo tail -f /var/log/nginx/error.log

# 查看Nginx访问日志
sudo tail -f /var/log/nginx/access.log

# 检查Nginx配置文件
sudo cat /etc/nginx/sites-available/teacher-manager
sudo cat /etc/nginx/sites-enabled/teacher-manager

# 检查防火墙设置
sudo ufw status
sudo ufw allow 'Nginx Full'

# 检查Nginx进程
sudo ps aux | grep nginx
sudo netstat -tlnp | grep nginx
```

### 问题5：PM2进程异常
```bash
# 查看PM2进程状态
pm2 status
pm2 logs teacher-manager-backend
pm2 show teacher-manager-backend

# 重启PM2进程
pm2 restart teacher-manager-backend

# 删除并重新启动
pm2 delete teacher-manager-backend
pm2 start ecosystem.config.js

# 查看PM2日志
pm2 logs --lines 100
pm2 flush  # 清空日志

# 检查PM2守护进程状态
pm2 ping
pm2 kill
pm2 resurrect

# 检查Node.js进程
sudo ps aux | grep node
sudo netstat -tulpn | grep node

# 查看系统资源使用情况
pm2 monit
```

### 常见问题

1. **后端服务无法启动**
   - 检查数据库连接配置
   - 查看PM2日志：`pm2 logs teacher-manager-backend`
   - 检查端口是否被占用：`netstat -tlnp | grep 3002`
   - 检查SELinux设置：`sudo getsebool -a | grep httpd`

2. **前端页面无法访问**
   - 检查Nginx配置：`sudo nginx -t`
   - 查看Nginx错误日志：`sudo tail -f /var/log/nginx/error.log`
   - 确认前端文件已正确构建到dist目录
   - 检查防火墙设置：`sudo firewall-cmd --list-all`

3. **API请求失败**
   - 检查Nginx代理配置
   - 确认后端服务正在运行
   - 检查防火墙设置
   - 验证SELinux策略

4. **数据库连接失败**
   - 检查MySQL服务状态：`sudo systemctl status mysqld`
   - 验证数据库用户权限
   - 检查.env文件中的数据库配置
   - 检查SELinux是否阻止数据库连接

### 性能优化建议

1. **数据库优化**
   - 定期优化数据库表
   - 添加适当的索引
   - 配置MySQL缓存

2. **前端优化**
   - 启用Gzip压缩
   - 配置CDN加速
   - 优化图片资源

3. **服务器优化**
   - 调整PM2进程数量
   - 配置Nginx缓存
   - 监控服务器资源使用情况

## 总结

通过以上步骤，你的教师管理系统应该已经成功部署到服务器上。记住定期备份数据、监控系统状态，并及时更新系统和依赖包以确保安全性。

如果遇到问题，请检查相关日志文件，并根据错误信息进行排查。