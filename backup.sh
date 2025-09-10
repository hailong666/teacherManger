#!/bin/bash

# 教师管理系统备份脚本
# 使用方法：chmod +x backup.sh && ./backup.sh
# 定时备份：crontab -e 添加 0 2 * * * /var/www/teacher-manager/backup.sh

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置变量
PROJECT_DIR="/var/www/teacher-manager"
BACKEND_DIR="$PROJECT_DIR/backend"
BACKUP_DIR="/var/backups/teacher-manager"
DATE=$(date +%Y%m%d_%H%M%S)
DATE_SIMPLE=$(date +%Y%m%d)
RETENTION_DAYS=7
MAX_BACKUPS=30

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# 创建备份目录
create_backup_dir() {
    if [ ! -d "$BACKUP_DIR" ]; then
        mkdir -p "$BACKUP_DIR"
        log_info "创建备份目录: $BACKUP_DIR"
    fi
    
    # 创建按日期分类的子目录
    mkdir -p "$BACKUP_DIR/$DATE_SIMPLE"
}

# 备份数据库
backup_database() {
    log_info "开始备份数据库..."
    
    # 检查配置文件（优先使用生产环境配置）
    local env_file="$BACKEND_DIR/.env"
    if [ -f "$BACKEND_DIR/.env.production" ]; then
        env_file="$BACKEND_DIR/.env.production"
    fi
    
    # 读取数据库配置
    if [ -f "$env_file" ]; then
        source "$env_file"
        
        if [ -z "$DB_DATABASE" ] || [ -z "$DB_USERNAME" ] || [ -z "$DB_PASSWORD" ]; then
            log_error "数据库配置不完整"
            return 1
        fi
        
        # 检查MySQL服务状态（Ubuntu使用mysql服务名）
        if ! systemctl is-active --quiet mysql; then
            log_error "MySQL服务未运行，尝试启动服务..."
            if systemctl start mysql; then
                log_info "MySQL服务启动成功"
                sleep 2
            else
                log_error "MySQL服务启动失败，无法备份数据库"
                return 1
            fi
        fi
        
        local backup_file="$BACKUP_DIR/$DATE_SIMPLE/database_$DATE.sql"
        local compressed_file="$BACKUP_DIR/$DATE_SIMPLE/database_$DATE.sql.gz"
        
        # 执行数据库备份
        if mysqldump -u "$DB_USERNAME" -p"$DB_PASSWORD" \
            -h "${DB_HOST:-localhost}" \
            -P "${DB_PORT:-3306}" \
            --single-transaction \
            --routines \
            --triggers \
            --events \
            --hex-blob \
            --default-character-set=utf8mb4 \
            "$DB_DATABASE" > "$backup_file" 2>/dev/null; then
            
            # 压缩备份文件
            gzip "$backup_file"
            
            local file_size=$(du -h "$compressed_file" | cut -f1)
            log_success "数据库备份完成: $compressed_file ($file_size)"
        else
            log_error "数据库备份失败"
            return 1
        fi
    else
        log_error "未找到数据库配置文件: $env_file"
        return 1
    fi
}

# 备份上传文件
backup_uploads() {
    log_info "开始备份上传文件..."
    
    local uploads_dir="$BACKEND_DIR/uploads"
    local backup_file="$BACKUP_DIR/$DATE_SIMPLE/uploads_$DATE.tar.gz"
    
    if [ -d "$uploads_dir" ] && [ "$(ls -A $uploads_dir)" ]; then
        if tar -czf "$backup_file" -C "$BACKEND_DIR" uploads/ 2>/dev/null; then
            local file_size=$(du -h "$backup_file" | cut -f1)
            log_success "上传文件备份完成: $backup_file ($file_size)"
        else
            log_error "上传文件备份失败"
            return 1
        fi
    else
        log_warning "上传目录为空或不存在，跳过备份"
    fi
}

# 备份配置文件
backup_config() {
    log_info "开始备份配置文件..."
    
    local config_backup_dir="$BACKUP_DIR/$DATE_SIMPLE/config"
    mkdir -p "$config_backup_dir"
    
    # 备份重要配置文件
    local config_files=(
        "$BACKEND_DIR/.env"
        "$BACKEND_DIR/ecosystem.config.js"
        "$PROJECT_DIR/nginx.conf"
        "/etc/nginx/sites-available/teacher-manager"
    )
    
    for config_file in "${config_files[@]}"; do
        if [ -f "$config_file" ]; then
            local filename=$(basename "$config_file")
            cp "$config_file" "$config_backup_dir/$filename" 2>/dev/null || true
            log_info "已备份配置文件: $filename"
        fi
    done
    
    # 压缩配置文件
    if [ "$(ls -A $config_backup_dir)" ]; then
        tar -czf "$BACKUP_DIR/$DATE_SIMPLE/config_$DATE.tar.gz" -C "$BACKUP_DIR/$DATE_SIMPLE" config/
        rm -rf "$config_backup_dir"
        log_success "配置文件备份完成"
    fi
}

# 备份代码（可选）
backup_code() {
    log_info "开始备份代码..."
    
    local code_backup_file="$BACKUP_DIR/$DATE_SIMPLE/code_$DATE.tar.gz"
    
    # 排除不需要备份的目录和文件
    local exclude_patterns=(
        "--exclude=node_modules"
        "--exclude=.git"
        "--exclude=dist"
        "--exclude=uploads"
        "--exclude=logs"
        "--exclude=*.log"
        "--exclude=.env"
        "--exclude=.DS_Store"
    )
    
    if tar -czf "$code_backup_file" "${exclude_patterns[@]}" -C "$(dirname $PROJECT_DIR)" "$(basename $PROJECT_DIR)" 2>/dev/null; then
        local file_size=$(du -h "$code_backup_file" | cut -f1)
        log_success "代码备份完成: $code_backup_file ($file_size)"
    else
        log_error "代码备份失败"
        return 1
    fi
}

# 清理旧备份
cleanup_old_backups() {
    log_info "清理旧备份文件..."
    
    # 删除超过保留天数的备份目录
    find "$BACKUP_DIR" -maxdepth 1 -type d -name "[0-9]*" -mtime +$RETENTION_DAYS -exec rm -rf {} \; 2>/dev/null || true
    
    # 如果备份数量超过最大限制，删除最旧的备份
    local backup_count=$(find "$BACKUP_DIR" -maxdepth 1 -type d -name "[0-9]*" | wc -l)
    if [ "$backup_count" -gt "$MAX_BACKUPS" ]; then
        local excess_count=$((backup_count - MAX_BACKUPS))
        find "$BACKUP_DIR" -maxdepth 1 -type d -name "[0-9]*" -printf '%T@ %p\n' | sort -n | head -n "$excess_count" | cut -d' ' -f2- | xargs rm -rf
        log_info "删除了 $excess_count 个旧备份"
    fi
    
    log_success "旧备份清理完成"
}

# 生成备份报告
generate_report() {
    local report_file="$BACKUP_DIR/$DATE_SIMPLE/backup_report_$DATE.txt"
    
    cat > "$report_file" << EOF
教师管理系统备份报告
=====================

备份时间: $(date '+%Y-%m-%d %H:%M:%S')
备份目录: $BACKUP_DIR/$DATE_SIMPLE

备份文件列表:
EOF
    
    # 列出备份文件
    if [ -d "$BACKUP_DIR/$DATE_SIMPLE" ]; then
        ls -lh "$BACKUP_DIR/$DATE_SIMPLE"/ >> "$report_file" 2>/dev/null || true
    fi
    
    cat >> "$report_file" << EOF

磁盘使用情况:
$(df -h "$BACKUP_DIR")

备份目录大小:
$(du -sh "$BACKUP_DIR/$DATE_SIMPLE" 2>/dev/null || echo "计算失败")

系统信息:
主机名: $(hostname)
系统: $(uname -a)
Ubuntu版本: $(lsb_release -d 2>/dev/null | cut -f2 || cat /etc/os-release | grep PRETTY_NAME | cut -d'"' -f2 || echo "未知")
MySQL版本: $(mysql --version 2>/dev/null || echo "未安装")
Node.js版本: $(node --version 2>/dev/null || echo "未安装")
AppArmor状态: $(aa-status 2>/dev/null | head -1 || echo "未启用")
防火墙状态: $(ufw status 2>/dev/null | head -1 || echo "未知")

备份完成时间: $(date '+%Y-%m-%d %H:%M:%S')
EOF
    
    log_success "备份报告生成完成: $report_file"
}

# 发送通知（可选）
send_notification() {
    # 这里可以添加邮件通知或其他通知方式
    # 例如：发送邮件、Slack通知、微信通知等
    
    local status="$1"
    local message="$2"
    
    # 示例：写入系统日志
    logger -t "teacher-manager-backup" "$status: $message"
    
    # 示例：发送邮件（需要配置邮件服务）
    # if command -v mail &> /dev/null; then
    #     echo "$message" | mail -s "教师管理系统备份通知" admin@example.com
    # fi
}

# 检查磁盘空间
check_disk_space() {
    local available_space=$(df "$BACKUP_DIR" | awk 'NR==2 {print $4}')
    local required_space=1048576  # 1GB in KB
    
    if [ "$available_space" -lt "$required_space" ]; then
        log_error "磁盘空间不足，可用空间: $(df -h "$BACKUP_DIR" | awk 'NR==2 {print $4}')，建议至少保留1GB空间"
        return 1
    fi
    
    log_info "磁盘空间检查通过，可用空间: $(df -h "$BACKUP_DIR" | awk 'NR==2 {print $4}')"
    
    # 检查备份目录权限
    if [ ! -w "$BACKUP_DIR" ]; then
        log_error "备份目录无写入权限: $BACKUP_DIR"
        return 1
    fi
    
    # 检查AppArmor状态（Ubuntu特有）
    if command -v aa-status &> /dev/null; then
        if aa-status --enabled &>/dev/null; then
            log_info "AppArmor已启用，检查MySQL相关配置"
        fi
    fi
}

# 验证备份完整性
verify_backup() {
    log_info "验证备份完整性..."
    
    local backup_day_dir="$BACKUP_DIR/$DATE_SIMPLE"
    local verification_passed=true
    
    # 检查数据库备份
    if [ -f "$backup_day_dir/database_$DATE.sql.gz" ]; then
        if gzip -t "$backup_day_dir/database_$DATE.sql.gz" 2>/dev/null; then
            log_success "数据库备份文件完整性验证通过"
        else
            log_error "数据库备份文件损坏"
            verification_passed=false
        fi
    fi
    
    # 检查其他压缩文件
    for file in "$backup_day_dir"/*.tar.gz; do
        if [ -f "$file" ]; then
            if tar -tzf "$file" >/dev/null 2>&1; then
                log_success "$(basename "$file") 完整性验证通过"
            else
                log_error "$(basename "$file") 文件损坏"
                verification_passed=false
            fi
        fi
    done
    
    if [ "$verification_passed" = true ]; then
        log_success "所有备份文件完整性验证通过"
        return 0
    else
        log_error "备份文件完整性验证失败"
        return 1
    fi
}

# 主函数
main() {
    echo "=== 教师管理系统备份脚本 ==="
    echo "开始时间: $(date '+%Y-%m-%d %H:%M:%S')"
    echo
    
    # 检查磁盘空间
    if ! check_disk_space; then
        send_notification "ERROR" "备份失败：磁盘空间不足"
        exit 1
    fi
    
    # 创建备份目录
    create_backup_dir
    
    # 执行备份
    local backup_success=true
    
    if ! backup_database; then
        backup_success=false
    fi
    
    if ! backup_uploads; then
        backup_success=false
    fi
    
    if ! backup_config; then
        backup_success=false
    fi
    
    # 可选：备份代码
    # if ! backup_code; then
    #     backup_success=false
    # fi
    
    # 验证备份
    if ! verify_backup; then
        backup_success=false
    fi
    
    # 生成报告
    generate_report
    
    # 清理旧备份
    cleanup_old_backups
    
    # 显示结果
    echo
    echo "=== 备份完成 ==="
    echo "结束时间: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "备份目录: $BACKUP_DIR/$DATE_SIMPLE"
    
    if [ "$backup_success" = true ]; then
        log_success "备份任务执行成功"
        send_notification "SUCCESS" "教师管理系统备份成功完成"
        
        # 显示备份文件信息
        echo
        echo "备份文件列表:"
        ls -lh "$BACKUP_DIR/$DATE_SIMPLE"/ 2>/dev/null || true
        
        echo
        echo "备份目录大小: $(du -sh "$BACKUP_DIR/$DATE_SIMPLE" 2>/dev/null | cut -f1)"
    else
        log_error "备份任务执行失败"
        send_notification "ERROR" "教师管理系统备份失败，请检查日志"
        exit 1
    fi
}

# 错误处理
trap 'log_error "备份过程中发生错误"; send_notification "ERROR" "备份过程中发生错误"; exit 1' ERR

# 执行主函数
main "$@"