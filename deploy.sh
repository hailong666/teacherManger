#!/bin/bash

# 教师管理系统自动化部署脚本
# 使用方法：chmod +x deploy.sh && ./deploy.sh

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置变量
PROJECT_NAME="teacher-manager"
PROJECT_DIR="/var/www/teacher-manager"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
NGINX_CONFIG="/etc/nginx/sites-available/teacher-manager"
LOG_DIR="/var/log/teacher-manager"
BACKUP_DIR="/var/backups/teacher-manager"
DATE=$(date +%Y%m%d_%H%M%S)

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否为root用户
check_root() {
    if [[ $EUID -eq 0 ]]; then
        log_error "请不要使用root用户运行此脚本！"
        exit 1
    fi
}

# 检查系统类型
check_system() {
    if [ -f /etc/lsb-release ]; then
        . /etc/lsb-release
        if [ "$DISTRIB_ID" = "Ubuntu" ]; then
            SYSTEM="ubuntu"
            PKG_MANAGER="apt"
            log_info "检测到 Ubuntu 系统 ($DISTRIB_RELEASE)"
        else
            log_error "此脚本仅支持 Ubuntu 系统"
            exit 1
        fi
    elif [ -f /etc/debian_version ]; then
        SYSTEM="debian"
        PKG_MANAGER="apt"
        log_info "检测到 Debian 系统"
    else
        log_error "此脚本仅支持Ubuntu/Debian系统"
        exit 1
    fi
    
    log_info "检测到系统类型: $SYSTEM, 包管理器: $PKG_MANAGER"
}

# 安装系统依赖
install_dependencies() {
    log_info "安装系统依赖..."
    
    # 更新系统包
    sudo $PKG_MANAGER update -y
    sudo $PKG_MANAGER upgrade -y
    
    # 安装基础依赖
    sudo $PKG_MANAGER install -y curl wget git gcc g++ make python3 python3-pip
    
    # 安装开发工具
    sudo $PKG_MANAGER install -y build-essential
    
    # 安装其他必要工具
    sudo $PKG_MANAGER install -y software-properties-common apt-transport-https ca-certificates gnupg lsb-release
    
    log_success "系统依赖安装完成"
}

# 检查系统兼容性
check_system_compatibility() {
    log_info "检查系统兼容性..."
    
    # 检查Ubuntu版本
    if [ -f /etc/lsb-release ]; then
        . /etc/lsb-release
        UBUNTU_VERSION=$(echo $DISTRIB_RELEASE | cut -d. -f1)
        
        if [ "$UBUNTU_VERSION" -ge 18 ]; then
            log_success "Ubuntu版本兼容: $DISTRIB_RELEASE"
            return 0
        else
            log_warning "Ubuntu版本可能过低: $DISTRIB_RELEASE (推荐 >= 18.04)"
            return 1
        fi
    fi
    
    return 0
}

# 使用NVM安装Node.js
install_nodejs_with_nvm() {
    log_info "使用NVM安装Node.js..."
    
    # 卸载可能存在的Node.js
    sudo $PKG_MANAGER remove -y nodejs npm 2>/dev/null || true
    
    # 安装NVM
    if ! command -v nvm &> /dev/null; then
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
        [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
    fi
    
    # 安装Node.js 18
    nvm install 18
    nvm use 18
    nvm alias default 18
    
    # 验证安装
    if command -v node &> /dev/null && command -v npm &> /dev/null; then
        log_success "Node.js安装成功: $(node --version)"
        log_success "npm版本: $(npm --version)"
        return 0
    else
        log_error "Node.js安装失败"
        return 1
    fi
}

# 使用Snap安装Node.js
install_nodejs_snap() {
    log_info "使用Snap安装Node.js..."
    
    # 安装snapd（如果未安装）
    if ! command -v snap &> /dev/null; then
        sudo apt update
        sudo apt install -y snapd
    fi
    
    # 使用snap安装Node.js
    if sudo snap install node --classic; then
        log_success "Node.js (via Snap) 安装成功"
        log_success "Node.js版本: $(node --version)"
        log_success "npm版本: $(npm --version)"
        return 0
    else
        log_error "Snap安装Node.js失败"
        return 1
    fi
}

# 安装Node.js
install_nodejs() {
    if command -v node &> /dev/null; then
        local node_version=$(node --version 2>/dev/null || echo "unknown")
        if [ "$node_version" != "unknown" ]; then
            local major_version=$(echo $node_version | cut -d'v' -f2 | cut -d'.' -f1)
            if [ "$major_version" -ge 16 ]; then
                log_success "Node.js已安装，版本: $(node --version)"
                return 0
            else
                log_warning "Node.js版本过低，需要升级"
            fi
        else
            log_warning "Node.js存在但无法正常运行"
        fi
    fi
    
    # 检查系统兼容性
    check_system_compatibility
    
    # 尝试使用NodeSource仓库安装
    log_info "尝试使用NodeSource仓库安装Node.js 18..."
    # 添加NodeSource仓库
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo $PKG_MANAGER install -y nodejs
    
    # 验证安装
    if command -v node &> /dev/null && node --version &> /dev/null; then
        log_success "Node.js安装完成: $(node --version), npm: $(npm --version)"
        return 0
    fi
    
    # 如果NodeSource安装失败，尝试NVM
    log_warning "NodeSource安装失败，尝试使用NVM安装Node.js 18..."
    if install_nodejs_with_nvm; then
        return 0
    fi
    
    # 如果NVM也失败，尝试Snap安装
    log_warning "NVM安装失败，尝试使用Snap安装..."
    if install_nodejs_snap; then
        return 0
    fi
    
    log_error "所有Node.js安装方法都失败了"
    exit 1
}

# 安装MySQL
install_mysql() {
    if systemctl is-active --quiet mysql; then
        log_success "MySQL已安装并运行"
        return 0
    fi
    
    log_info "安装MySQL 8.0..."
    
    # 更新包列表
    sudo apt update
    
    # 安装MySQL服务器
    sudo apt install -y mysql-server
    
    # 启动MySQL服务
    sudo systemctl start mysql
    sudo systemctl enable mysql
    
    # 检查MySQL状态
    if sudo systemctl is-active --quiet mysql; then
        log_success "MySQL服务启动成功"
        
        # Ubuntu的MySQL默认使用auth_socket插件，需要配置
        log_info "配置MySQL root用户..."
        sudo mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'root123456';"
        sudo mysql -e "FLUSH PRIVILEGES;"
        
        log_success "MySQL安装完成"
        log_warning "MySQL root密码已设置为: root123456"
        log_warning "建议运行 'sudo mysql_secure_installation' 进行安全配置"
    else
        log_error "MySQL服务启动失败"
        return 1
    fi
}

# 安装Nginx
install_nginx() {
    if systemctl is-active --quiet nginx; then
        log_success "Nginx已安装并运行"
        return 0
    fi
    
    log_info "安装Nginx..."
    
    # 安装Nginx
    sudo $PKG_MANAGER install -y nginx
    
    # 启动并启用Nginx服务
    sudo systemctl start nginx
    sudo systemctl enable nginx
    
    # 检查Nginx状态
    if sudo systemctl is-active --quiet nginx; then
        log_success "Nginx安装并启动成功"
        
        # 检查Nginx配置目录
        sudo mkdir -p /etc/nginx/sites-available
        sudo mkdir -p /etc/nginx/sites-enabled
        
        # 确保sites-enabled目录被包含在主配置中
        if ! grep -q "sites-enabled" /etc/nginx/nginx.conf; then
            sudo sed -i '/include \/etc\/nginx\/conf.d\/\*.conf;/a\    include /etc/nginx/sites-enabled/*;' /etc/nginx/nginx.conf
        fi
    else
        log_error "Nginx启动失败"
        return 1
    fi
    
    log_success "Nginx安装完成"
}

# 配置防火墙
configure_firewall() {
    log_info "配置防火墙..."
    
    # 检查ufw是否安装
    if ! command -v ufw &> /dev/null; then
        sudo apt install -y ufw
    fi
    
    # 配置ufw规则
    sudo ufw --force reset
    sudo ufw default deny incoming
    sudo ufw default allow outgoing
    
    # 开放必要端口
    sudo ufw allow ssh
    sudo ufw allow 'Nginx Full'
    sudo ufw allow 3002/tcp  # 后端API端口
    sudo ufw allow 3306/tcp  # MySQL端口
    
    # 启用防火墙
    sudo ufw --force enable
    
    # 显示当前规则
    sudo ufw status verbose
    
    log_success "防火墙配置完成"
    
    # 配置系统安全
    log_info "配置系统安全..."
    
    # 检查AppArmor状态
    if command -v aa-status &> /dev/null; then
        log_info "AppArmor状态:"
        sudo aa-status
    fi
    
    # 设置合适的文件权限
    sudo chmod 755 /var/www
    
    log_success "系统安全配置完成"
}

# 检查系统依赖
check_dependencies() {
    log_info "检查系统依赖..."
    
    local deps=("node" "npm" "mysqld" "nginx" "pm2")
    local missing_deps=()
    
    for dep in "${deps[@]}"; do
        if [ "$dep" = "mysqld" ]; then
            if ! systemctl is-active --quiet mysqld; then
                missing_deps+=("mysql")
            fi
        else
            if ! command -v "$dep" &> /dev/null; then
                missing_deps+=("$dep")
            fi
        fi
    done
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_warning "缺少以下依赖：${missing_deps[*]}"
        log_info "正在自动安装缺少的依赖..."
        
        # 自动安装缺少的依赖
        for dep in "${missing_deps[@]}"; do
            case "$dep" in
                "node"|"npm")
                    install_nodejs
                    ;;
                "mysql")
                    install_mysql
                    ;;
                "nginx")
                    install_nginx
                    ;;
                "pm2")
                    npm install -g pm2
                    ;;
            esac
        done
    fi
    
    log_success "所有依赖检查通过"
}

# 创建必要目录
create_directories() {
    log_info "创建必要目录..."
    
    sudo mkdir -p "$PROJECT_DIR"
    sudo mkdir -p "$LOG_DIR"
    sudo mkdir -p "$BACKUP_DIR"
    sudo mkdir -p "$BACKEND_DIR/uploads"
    
    # 设置目录权限
    sudo chown -R $USER:$USER "$PROJECT_DIR"
    sudo chown -R $USER:$USER "$LOG_DIR"
    sudo chown -R $USER:$USER "$BACKUP_DIR"
    
    log_success "目录创建完成"
}

# 备份现有部署
backup_existing() {
    if [ -d "$PROJECT_DIR" ] && [ "$(ls -A $PROJECT_DIR)" ]; then
        log_info "备份现有部署..."
        
        # 备份代码
        tar -czf "$BACKUP_DIR/code_backup_$DATE.tar.gz" -C "$PROJECT_DIR" . 2>/dev/null || true
        
        # 备份数据库
        if [ -f "$BACKEND_DIR/.env" ]; then
            source "$BACKEND_DIR/.env"
            if [ ! -z "$DB_DATABASE" ] && [ ! -z "$DB_USERNAME" ]; then
                log_info "备份数据库..."
                mysqldump -u "$DB_USERNAME" -p"$DB_PASSWORD" "$DB_DATABASE" > "$BACKUP_DIR/database_backup_$DATE.sql" 2>/dev/null || true
            fi
        fi
        
        log_success "备份完成"
    fi
}

# 部署代码
deploy_code() {
    log_info "部署代码..."
    
    # 如果是Git仓库，拉取最新代码
    if [ -d "$PROJECT_DIR/.git" ]; then
        cd "$PROJECT_DIR"
        git pull origin main || git pull origin master
    else
        log_warning "不是Git仓库，请手动上传代码到 $PROJECT_DIR"
        read -p "代码已上传完成？(y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_error "请先上传代码到 $PROJECT_DIR"
            exit 1
        fi
    fi
    
    log_success "代码部署完成"
}

# 配置后端
setup_backend() {
    log_info "配置后端服务..."
    
    cd "$BACKEND_DIR"
    
    # 安装依赖
    npm install --production
    
    # 检查环境变量文件
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env
            log_warning "已创建.env文件，请编辑数据库配置"
        else
            log_error "缺少.env配置文件"
            exit 1
        fi
    fi
    
    # 创建上传目录
    mkdir -p uploads
    chmod 755 uploads
    
    log_success "后端配置完成"
}

# 配置前端
setup_frontend() {
    log_info "配置前端应用..."
    
    cd "$FRONTEND_DIR"
    
    # 安装依赖
    npm install
    
    # 构建生产版本
    npm run build
    
    # 检查构建结果
    if [ ! -d "dist" ]; then
        log_error "前端构建失败"
        exit 1
    fi
    
    log_success "前端配置完成"
}

# 配置数据库
setup_database() {
    log_info "配置数据库..."
    
    # 读取数据库配置
    if [ -f "$BACKEND_DIR/.env" ]; then
        source "$BACKEND_DIR/.env"
        
        # 检查数据库连接
        if mysql -u "$DB_USERNAME" -p"$DB_PASSWORD" -e "USE $DB_DATABASE;" 2>/dev/null; then
            log_success "数据库连接正常"
            
            # 检查是否需要初始化
            table_count=$(mysql -u "$DB_USERNAME" -p"$DB_PASSWORD" -D "$DB_DATABASE" -e "SHOW TABLES;" 2>/dev/null | wc -l)
            if [ "$table_count" -le 1 ]; then
                log_info "初始化数据库..."
                if [ -f "$PROJECT_DIR/database_init.sql" ]; then
                    mysql -u "$DB_USERNAME" -p"$DB_PASSWORD" "$DB_DATABASE" < "$PROJECT_DIR/database_init.sql"
                    log_success "数据库初始化完成"
                else
                    log_warning "未找到数据库初始化脚本"
                fi
            fi
        else
            log_error "数据库连接失败，请检查配置"
            exit 1
        fi
    else
        log_error "未找到数据库配置文件"
        exit 1
    fi
}

# 配置Nginx
setup_nginx() {
    log_info "配置Nginx..."
    
    # 复制Nginx配置
    if [ -f "$PROJECT_DIR/nginx.conf" ]; then
        sudo cp "$PROJECT_DIR/nginx.conf" "$NGINX_CONFIG"
        
        # 提示用户修改域名
        log_warning "请编辑 $NGINX_CONFIG 文件，修改域名配置"
        read -p "是否现在编辑Nginx配置？(y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            sudo nano "$NGINX_CONFIG"
        fi
        
        # 启用站点
        sudo ln -sf "$NGINX_CONFIG" "/etc/nginx/sites-enabled/teacher-manager"
        
        # 测试配置
        if sudo nginx -t; then
            sudo systemctl reload nginx
            log_success "Nginx配置完成"
        else
            log_error "Nginx配置错误"
            exit 1
        fi
    else
        log_warning "未找到Nginx配置文件"
    fi
}

# 启动服务
start_services() {
    log_info "启动服务..."
    
    cd "$BACKEND_DIR"
    
    # 停止现有PM2进程
    pm2 delete teacher-manager-backend 2>/dev/null || true
    
    # 启动后端服务
    if [ -f "ecosystem.config.js" ]; then
        pm2 start ecosystem.config.js --env production
    else
        pm2 start src/app.js --name teacher-manager-backend --env production
    fi
    
    # 保存PM2配置
    pm2 save
    
    # 等待服务启动
    sleep 5
    
    # 检查服务状态
    if pm2 list | grep -q "teacher-manager-backend.*online"; then
        log_success "后端服务启动成功"
    else
        log_error "后端服务启动失败"
        pm2 logs teacher-manager-backend --lines 20
        exit 1
    fi
}

# 健康检查
health_check() {
    log_info "执行健康检查..."
    
    # 检查后端API
    local api_url="http://localhost:3002/api/health"
    if curl -f -s "$api_url" > /dev/null 2>&1; then
        log_success "后端API健康检查通过"
    else
        log_warning "后端API健康检查失败，请检查服务状态"
    fi
    
    # 检查Nginx
    if systemctl is-active --quiet nginx; then
        log_success "Nginx服务运行正常"
    else
        log_error "Nginx服务异常"
    fi
    
    # 检查MySQL
    if systemctl is-active --quiet mysql; then
        log_success "MySQL服务运行正常"
    else
        log_error "MySQL服务异常"
    fi
}

# 显示部署信息
show_deployment_info() {
    log_success "部署完成！"
    echo
    echo "=== 部署信息 ==="
    echo "项目目录: $PROJECT_DIR"
    echo "日志目录: $LOG_DIR"
    echo "备份目录: $BACKUP_DIR"
    echo
    echo "=== 服务状态 ==="
    pm2 status
    echo
    echo "=== 访问地址 ==="
    echo "前端: http://your-domain.com"
    echo "后端API: http://your-domain.com/api"
    echo
    echo "=== 常用命令 ==="
    echo "查看后端日志: pm2 logs teacher-manager-backend"
    echo "重启后端: pm2 restart teacher-manager-backend"
    echo "查看Nginx日志: sudo tail -f /var/log/nginx/teacher-manager-error.log"
    echo "重启Nginx: sudo systemctl restart nginx"
    echo
    log_warning "请记得修改默认管理员密码！"
    echo "默认管理员账户: admin / admin123"
}

# 主函数
main() {
    echo "=== 教师管理系统自动化部署脚本 ==="
    echo
    
    check_root
    check_system
    install_dependencies
    install_nodejs
    install_mysql
    install_nginx
    configure_firewall
    check_dependencies
    create_directories
    backup_existing
    deploy_code
    setup_backend
    setup_frontend
    setup_database
    setup_nginx
    start_services
    health_check
    show_deployment_info
    
    log_success "部署脚本执行完成！"
}

# 错误处理
trap 'log_error "部署过程中发生错误，请检查日志"; exit 1' ERR

# 执行主函数
main "$@"