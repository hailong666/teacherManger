#!/bin/bash

# SSL证书自动续期脚本
# 使用方法：chmod +x ssl_renew.sh && ./ssl_renew.sh
# 定时续期：crontab -e 添加 0 2 * * 0 /var/www/teacher-manager/ssl_renew.sh

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置变量
DOMAIN="your-domain.com"  # 替换为实际域名
EMAIL="admin@your-domain.com"  # 替换为实际邮箱
WEBROOT="/var/www/teacher-manager/frontend/dist"
NGINX_CONFIG="/etc/nginx/sites-available/teacher-manager"
SSL_DIR="/etc/letsencrypt/live/$DOMAIN"
LOG_FILE="/var/log/ssl-renew.log"
BACKUP_DIR="/var/backups/ssl"

# 通知配置
ALERT_EMAIL="admin@example.com"
WEBHOOK_URL=""  # Slack/钉钉等webhook地址

# 日志函数
log_info() {
    local message="[INFO] $(date '+%Y-%m-%d %H:%M:%S') - $1"
    echo -e "${BLUE}$message${NC}"
    echo "$message" >> "$LOG_FILE"
}

log_success() {
    local message="[SUCCESS] $(date '+%Y-%m-%d %H:%M:%S') - $1"
    echo -e "${GREEN}$message${NC}"
    echo "$message" >> "$LOG_FILE"
}

log_warning() {
    local message="[WARNING] $(date '+%Y-%m-%d %H:%M:%S') - $1"
    echo -e "${YELLOW}$message${NC}"
    echo "$message" >> "$LOG_FILE"
}

log_error() {
    local message="[ERROR] $(date '+%Y-%m-%d %H:%M:%S') - $1"
    echo -e "${RED}$message${NC}"
    echo "$message" >> "$LOG_FILE"
}

# 发送通知
send_notification() {
    local title="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # 发送邮件通知
    if command -v mail &> /dev/null && [ ! -z "$ALERT_EMAIL" ]; then
        echo "时间: $timestamp\n域名: $DOMAIN\n标题: $title\n内容: $message\n主机: $(hostname)" | \
            mail -s "[SSL证书] $title" "$ALERT_EMAIL"
    fi
    
    # 发送Webhook通知
    if [ ! -z "$WEBHOOK_URL" ]; then
        local payload='{"text":"'"SSL证书 - $title: $message ($DOMAIN - $timestamp)"'"}'
        curl -X POST -H 'Content-type: application/json' \
            --data "$payload" "$WEBHOOK_URL" &>/dev/null || true
    fi
    
    # 写入系统日志
    logger -t "ssl-renew" "$title: $message (Domain: $DOMAIN)"
}

# 检查依赖
check_dependencies() {
    log_info "检查依赖项..."
    
    # 检查certbot
    if ! command -v certbot &> /dev/null; then
        log_error "certbot未安装"
        log_info "安装certbot..."
        
        if command -v apt-get &> /dev/null; then
            sudo apt-get update
            sudo apt-get install -y certbot python3-certbot-nginx
        else
            log_error "无法自动安装certbot，请手动安装"
            exit 1
        fi
    fi
    
    # 检查nginx
    if ! command -v nginx &> /dev/null; then
        log_error "nginx未安装"
        exit 1
    fi
    
    # 检查nginx是否运行
    if ! systemctl is-active --quiet nginx; then
        log_warning "nginx服务未运行，尝试启动..."
        if systemctl start nginx; then
            log_success "nginx服务启动成功"
        else
            log_error "nginx服务启动失败"
            exit 1
        fi
    fi
    
    # 检查防火墙状态（Ubuntu UFW）
    if command -v ufw &> /dev/null; then
        ufw_status=$(ufw status | head -1)
        if [[ "$ufw_status" == *"active"* ]]; then
            if ! ufw status | grep -q "80\|443\|Nginx"; then
                log_warning "防火墙可能阻止HTTP/HTTPS访问，请确保80和443端口已开放"
                log_info "开放端口命令: sudo ufw allow 'Nginx Full'"
            fi
        fi
    fi
    
    # 检查AppArmor状态
    if command -v aa-status &> /dev/null && aa-status --enabled &>/dev/null; then
        log_warning "AppArmor已启用，可能影响证书操作"
        log_info "如遇问题，请检查AppArmor配置"
    fi
    
    # 检查openssl
    if ! command -v openssl &> /dev/null; then
        log_error "openssl未安装"
        exit 1
    fi
    
    log_success "依赖检查完成"
}

# 检查证书状态
check_certificate_status() {
    log_info "检查当前证书状态..."
    
    if [ ! -f "$SSL_DIR/cert.pem" ]; then
        log_warning "证书文件不存在: $SSL_DIR/cert.pem"
        return 1
    fi
    
    # 获取证书到期时间
    local expiry_date=$(openssl x509 -enddate -noout -in "$SSL_DIR/cert.pem" | cut -d= -f2)
    local expiry_timestamp=$(date -d "$expiry_date" +%s)
    local current_timestamp=$(date +%s)
    local days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))
    
    log_info "证书到期时间: $expiry_date"
    log_info "距离到期还有: $days_until_expiry 天"
    
    # 检查是否需要续期（30天内到期）
    if [ "$days_until_expiry" -le 30 ]; then
        log_warning "证书即将到期，需要续期"
        return 0
    else
        log_success "证书有效期充足，无需续期"
        return 1
    fi
}

# 备份当前证书
backup_certificate() {
    log_info "备份当前证书..."
    
    mkdir -p "$BACKUP_DIR"
    local backup_file="$BACKUP_DIR/ssl_backup_$(date +%Y%m%d_%H%M%S).tar.gz"
    
    if [ -d "$SSL_DIR" ]; then
        tar -czf "$backup_file" -C "/etc/letsencrypt" "live/$DOMAIN" "archive/$DOMAIN" "renewal/$DOMAIN.conf" 2>/dev/null || {
            log_warning "证书备份失败，但继续执行续期"
            return 0
        }
        
        log_success "证书已备份到: $backup_file"
        
        # 清理超过30天的备份
        find "$BACKUP_DIR" -name "ssl_backup_*.tar.gz" -mtime +30 -delete 2>/dev/null || true
    else
        log_warning "SSL目录不存在，跳过备份"
    fi
}

# 续期证书
renew_certificate() {
    log_info "开始续期SSL证书..."
    
    # 测试nginx配置
    if ! nginx -t &>/dev/null; then
        log_error "Nginx配置测试失败"
        return 1
    fi
    
    # 执行续期
    if certbot renew --nginx --quiet --no-self-upgrade; then
        log_success "证书续期成功"
        
        # 重新加载nginx
        if nginx -t && systemctl reload nginx; then
            log_success "Nginx配置重新加载成功"
        else
            log_error "Nginx配置重新加载失败"
            return 1
        fi
        
        # 发送成功通知
        send_notification "证书续期成功" "域名 $DOMAIN 的SSL证书已成功续期"
        
        return 0
    else
        log_error "证书续期失败"
        
        # 发送失败通知
        send_notification "证书续期失败" "域名 $DOMAIN 的SSL证书续期失败，请检查日志"
        
        return 1
    fi
}

# 强制续期证书
force_renew_certificate() {
    log_info "强制续期SSL证书..."
    
    # 备份当前证书
    backup_certificate
    
    # 强制续期
    if certbot renew --nginx --force-renewal --quiet --no-self-upgrade; then
        log_success "强制证书续期成功"
        
        # 重新加载nginx
        if nginx -t && systemctl reload nginx; then
            log_success "Nginx配置重新加载成功"
        else
            log_error "Nginx配置重新加载失败"
            return 1
        fi
        
        # 发送成功通知
        send_notification "强制证书续期成功" "域名 $DOMAIN 的SSL证书已强制续期成功"
        
        return 0
    else
        log_error "强制证书续期失败"
        
        # 尝试恢复备份
        restore_certificate
        
        # 发送失败通知
        send_notification "强制证书续期失败" "域名 $DOMAIN 的SSL证书强制续期失败，已尝试恢复备份"
        
        return 1
    fi
}

# 恢复证书备份
restore_certificate() {
    log_info "尝试恢复最新的证书备份..."
    
    local latest_backup=$(ls -t "$BACKUP_DIR"/ssl_backup_*.tar.gz 2>/dev/null | head -n1)
    
    if [ -n "$latest_backup" ] && [ -f "$latest_backup" ]; then
        log_info "找到备份文件: $latest_backup"
        
        # 停止nginx
        systemctl stop nginx
        
        # 恢复备份
        if tar -xzf "$latest_backup" -C "/etc/letsencrypt"; then
            log_success "证书备份恢复成功"
            
            # 重启nginx
            if systemctl start nginx; then
                log_success "Nginx重启成功"
            else
                log_error "Nginx重启失败"
            fi
        else
            log_error "证书备份恢复失败"
            
            # 尝试重启nginx
            systemctl start nginx || log_error "Nginx启动失败"
        fi
    else
        log_warning "未找到可用的证书备份"
    fi
}

# 初始化SSL证书
init_certificate() {
    log_info "初始化SSL证书..."
    
    if [ -z "$DOMAIN" ] || [ "$DOMAIN" = "your-domain.com" ]; then
        log_error "请先配置正确的域名"
        exit 1
    fi
    
    if [ -z "$EMAIL" ] || [ "$EMAIL" = "admin@your-domain.com" ]; then
        log_error "请先配置正确的邮箱地址"
        exit 1
    fi
    
    # 检查域名解析
    if ! nslookup "$DOMAIN" &>/dev/null; then
        log_error "域名 $DOMAIN 无法解析"
        exit 1
    fi
    
    # 检查webroot目录
    if [ ! -d "$WEBROOT" ]; then
        log_error "Webroot目录不存在: $WEBROOT"
        exit 1
    fi
    
    # 获取证书
    log_info "为域名 $DOMAIN 获取SSL证书..."
    
    if certbot certonly --webroot -w "$WEBROOT" -d "$DOMAIN" --email "$EMAIL" --agree-tos --non-interactive; then
        log_success "SSL证书获取成功"
        
        # 配置nginx SSL
        configure_nginx_ssl
        
        # 重新加载nginx
        if systemctl reload nginx; then
            log_success "Nginx SSL配置生效"
        else
            log_error "Nginx重新加载失败"
        fi
        
        # 发送成功通知
        send_notification "SSL证书初始化成功" "域名 $DOMAIN 的SSL证书已成功获取并配置"
    else
        log_error "SSL证书获取失败"
        exit 1
    fi
}

# 配置Nginx SSL
configure_nginx_ssl() {
    log_info "配置Nginx SSL..."
    
    if [ ! -f "$NGINX_CONFIG" ]; then
        log_error "Nginx配置文件不存在: $NGINX_CONFIG"
        return 1
    fi
    
    # 备份nginx配置
    cp "$NGINX_CONFIG" "$NGINX_CONFIG.backup.$(date +%Y%m%d_%H%M%S)"
    
    # 更新SSL配置
    cat > "$NGINX_CONFIG" << EOF
server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;
    
    # SSL配置
    ssl_certificate $SSL_DIR/fullchain.pem;
    ssl_certificate_key $SSL_DIR/privkey.pem;
    ssl_trusted_certificate $SSL_DIR/chain.pem;
    
    # SSL安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_stapling on;
    ssl_stapling_verify on;
    
    # 安全头
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # 前端静态文件
    location / {
        root $WEBROOT;
        index index.html;
        try_files \$uri \$uri/ /index.html;
        
        # 缓存配置
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)\$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # 后端API代理
    location /api/ {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }
    
    # 文件上传目录
    location /uploads/ {
        alias /var/www/teacher-manager/uploads/;
        expires 1y;
        add_header Cache-Control "public";
    }
    
    # Let's Encrypt验证
    location /.well-known/acme-challenge/ {
        root $WEBROOT;
    }
}
EOF
    
    # 测试nginx配置
    if nginx -t; then
        log_success "Nginx SSL配置更新成功"
    else
        log_error "Nginx SSL配置有误，恢复备份"
        mv "$NGINX_CONFIG.backup.$(date +%Y%m%d_%H%M%S)" "$NGINX_CONFIG"
        return 1
    fi
}

# 检查证书健康状态
check_certificate_health() {
    log_info "检查证书健康状态..."
    
    if [ ! -f "$SSL_DIR/cert.pem" ]; then
        log_error "证书文件不存在"
        return 1
    fi
    
    # 检查证书有效性
    if openssl x509 -checkend 86400 -noout -in "$SSL_DIR/cert.pem"; then
        log_success "证书在24小时内有效"
    else
        log_warning "证书将在24小时内到期"
    fi
    
    # 检查证书链
    if openssl verify -CAfile "$SSL_DIR/chain.pem" "$SSL_DIR/cert.pem" &>/dev/null; then
        log_success "证书链验证通过"
    else
        log_error "证书链验证失败"
    fi
    
    # 检查私钥匹配
    local cert_hash=$(openssl x509 -noout -modulus -in "$SSL_DIR/cert.pem" | openssl md5)
    local key_hash=$(openssl rsa -noout -modulus -in "$SSL_DIR/privkey.pem" | openssl md5)
    
    if [ "$cert_hash" = "$key_hash" ]; then
        log_success "证书和私钥匹配"
    else
        log_error "证书和私钥不匹配"
    fi
    
    # 检查HTTPS连接
    if curl -f -s --max-time 10 "https://$DOMAIN" > /dev/null 2>&1; then
        log_success "HTTPS连接正常"
    else
        log_error "HTTPS连接失败"
        
        # 额外的诊断信息
        log_info "诊断信息:"
        log_info "  Nginx状态: $(systemctl is-active nginx)"
        if command -v ufw &> /dev/null; then
            log_info "  防火墙状态: $(ufw status | head -1)"
            log_info "  Nginx规则: $(ufw status | grep -i nginx || echo '未配置')"
        fi
        if command -v aa-status &> /dev/null; then
            log_info "  AppArmor状态: $(aa-status --enabled &>/dev/null && echo '启用' || echo '禁用')"
        fi
    fi
}

# 主函数
main() {
    local action="${1:-check}"
    
    echo "=== SSL证书管理脚本 ==="
    echo "域名: $DOMAIN"
    echo "开始时间: $(date '+%Y-%m-%d %H:%M:%S')"
    echo
    
    case "$action" in
        "check")
            check_dependencies
            if check_certificate_status; then
                backup_certificate
                if renew_certificate; then
                    check_certificate_health
                fi
            else
                log_info "证书无需续期"
                check_certificate_health
            fi
            ;;
        "force")
            check_dependencies
            force_renew_certificate
            check_certificate_health
            ;;
        "init")
            check_dependencies
            init_certificate
            ;;
        "status")
            check_certificate_health
            ;;
        "backup")
            backup_certificate
            ;;
        "restore")
            restore_certificate
            ;;
        *)
            echo "使用方法: $0 [check|force|init|status|backup|restore]"
            echo "  check   - 检查并自动续期证书（默认）"
            echo "  force   - 强制续期证书"
            echo "  init    - 初始化SSL证书"
            echo "  status  - 检查证书状态"
            echo "  backup  - 备份当前证书"
            echo "  restore - 恢复证书备份"
            echo
            echo "配置说明："
            echo "  请修改脚本顶部的DOMAIN和EMAIL变量"
            echo "  DOMAIN: 你的域名"
            echo "  EMAIL: 用于Let's Encrypt的邮箱"
            exit 1
            ;;
    esac
    
    echo
    echo "=== SSL证书管理完成 ==="
    echo "结束时间: $(date '+%Y-%m-%d %H:%M:%S')"
}

# 执行主函数
main "$@"