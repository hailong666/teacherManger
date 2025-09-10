#!/bin/bash

# 教师管理系统监控脚本
# 使用方法：chmod +x monitor.sh && ./monitor.sh
# 定时监控：crontab -e 添加 */5 * * * * /var/www/teacher-manager/monitor.sh

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
LOG_DIR="/var/log/teacher-manager"
MONITOR_LOG="$LOG_DIR/monitor.log"
ALERT_LOG="$LOG_DIR/alerts.log"
PID_FILE="/tmp/teacher-manager-monitor.pid"

# 阈值配置
CPU_THRESHOLD=80
MEMORY_THRESHOLD=80
DISK_THRESHOLD=85
LOAD_THRESHOLD=5.0
RESPONSE_TIME_THRESHOLD=5000  # 毫秒

# 通知配置
ALERT_EMAIL="admin@example.com"
WEBHOOK_URL=""  # Slack/钉钉等webhook地址

# 日志函数
log_info() {
    local message="[INFO] $(date '+%Y-%m-%d %H:%M:%S') - $1"
    echo -e "${BLUE}$message${NC}"
    echo "$message" >> "$MONITOR_LOG"
}

log_success() {
    local message="[SUCCESS] $(date '+%Y-%m-%d %H:%M:%S') - $1"
    echo -e "${GREEN}$message${NC}"
    echo "$message" >> "$MONITOR_LOG"
}

log_warning() {
    local message="[WARNING] $(date '+%Y-%m-%d %H:%M:%S') - $1"
    echo -e "${YELLOW}$message${NC}"
    echo "$message" >> "$MONITOR_LOG"
    echo "$message" >> "$ALERT_LOG"
}

log_error() {
    local message="[ERROR] $(date '+%Y-%m-%d %H:%M:%S') - $1"
    echo -e "${RED}$message${NC}"
    echo "$message" >> "$MONITOR_LOG"
    echo "$message" >> "$ALERT_LOG"
}

# 创建必要目录
init_monitoring() {
    mkdir -p "$LOG_DIR"
    touch "$MONITOR_LOG" "$ALERT_LOG"
    
    # 检查是否已有监控进程在运行
    if [ -f "$PID_FILE" ]; then
        local old_pid=$(cat "$PID_FILE")
        if ps -p "$old_pid" > /dev/null 2>&1; then
            log_warning "监控进程已在运行 (PID: $old_pid)"
            exit 0
        else
            rm -f "$PID_FILE"
        fi
    fi
    
    # 记录当前进程PID
    echo $$ > "$PID_FILE"
}

# 清理函数
cleanup() {
    rm -f "$PID_FILE"
    exit 0
}

# 捕获退出信号
trap cleanup EXIT INT TERM

# 检查系统资源
check_system_resources() {
    log_info "检查系统资源使用情况..."
    
    # 检查CPU使用率
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')
    cpu_usage=${cpu_usage%.*}  # 去掉小数部分
    
    if [ "$cpu_usage" -gt "$CPU_THRESHOLD" ]; then
        log_error "CPU使用率过高: ${cpu_usage}% (阈值: ${CPU_THRESHOLD}%)"
        send_alert "CPU使用率告警" "CPU使用率达到 ${cpu_usage}%，超过阈值 ${CPU_THRESHOLD}%"
    else
        log_success "CPU使用率正常: ${cpu_usage}%"
    fi
    
    # 检查内存使用率
    local memory_info=$(free | grep Mem)
    local total_mem=$(echo $memory_info | awk '{print $2}')
    local used_mem=$(echo $memory_info | awk '{print $3}')
    local memory_usage=$((used_mem * 100 / total_mem))
    
    if [ "$memory_usage" -gt "$MEMORY_THRESHOLD" ]; then
        log_error "内存使用率过高: ${memory_usage}% (阈值: ${MEMORY_THRESHOLD}%)"
        send_alert "内存使用率告警" "内存使用率达到 ${memory_usage}%，超过阈值 ${MEMORY_THRESHOLD}%"
    else
        log_success "内存使用率正常: ${memory_usage}%"
    fi
    
    # 检查磁盘使用率
    local disk_usage=$(df "$PROJECT_DIR" | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ "$disk_usage" -gt "$DISK_THRESHOLD" ]; then
        log_error "磁盘使用率过高: ${disk_usage}% (阈值: ${DISK_THRESHOLD}%)"
        send_alert "磁盘使用率告警" "磁盘使用率达到 ${disk_usage}%，超过阈值 ${DISK_THRESHOLD}%"
    else
        log_success "磁盘使用率正常: ${disk_usage}%"
    fi
    
    # 检查系统负载
    local load_avg=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
    local load_check=$(echo "$load_avg > $LOAD_THRESHOLD" | bc -l)
    
    if [ "$load_check" -eq 1 ]; then
        log_error "系统负载过高: $load_avg (阈值: $LOAD_THRESHOLD)"
        send_alert "系统负载告警" "系统负载达到 $load_avg，超过阈值 $LOAD_THRESHOLD"
    else
        log_success "系统负载正常: $load_avg"
    fi
}

# 检查服务状态
check_services() {
    log_info "检查服务状态..."
    
    # 检查PM2进程
    if command -v pm2 &> /dev/null; then
        local pm2_status=$(pm2 jlist | jq -r '.[] | select(.name=="teacher-manager-backend") | .pm2_env.status' 2>/dev/null || echo "not_found")
        
        if [ "$pm2_status" = "online" ]; then
            log_success "后端服务运行正常"
        else
            log_error "后端服务异常: $pm2_status"
            send_alert "后端服务告警" "后端服务状态异常: $pm2_status"
            
            # 尝试重启服务
            log_info "尝试重启后端服务..."
            pm2 restart teacher-manager-backend
        fi
    else
        log_error "PM2未安装或不可用"
    fi
    
    # 检查Nginx服务
    if systemctl is-active --quiet nginx; then
        log_success "Nginx服务运行正常"
    else
        log_error "Nginx服务异常"
        send_alert "Nginx服务告警" "Nginx服务未运行"
        
        # 尝试重启Nginx
        log_info "尝试重启Nginx服务..."
        sudo systemctl restart nginx
    fi
    
    # 检查MySQL服务
    if systemctl is-active --quiet mysql; then
        log_success "MySQL服务运行正常"
    else
        log_error "MySQL服务异常"
        send_alert "MySQL服务告警" "MySQL服务未运行"
        
        # 尝试重启MySQL
        log_info "尝试重启MySQL服务..."
        sudo systemctl restart mysql
    fi
}

# 检查数据库连接
check_database() {
    log_info "检查数据库连接..."
    
    # 检查配置文件
    local env_file="$BACKEND_DIR/.env"
    if [ -f "$BACKEND_DIR/.env.production" ]; then
        env_file="$BACKEND_DIR/.env.production"
    fi
    
    if [ -f "$env_file" ]; then
        source "$env_file"
        
        # 测试数据库连接
        if mysql -u "$DB_USERNAME" -p"$DB_PASSWORD" -h "${DB_HOST:-localhost}" -P "${DB_PORT:-3306}" -e "SELECT 1" "$DB_DATABASE" &>/dev/null; then
            log_success "数据库连接正常"
        else
            log_error "数据库连接失败"
            send_alert "数据库连接告警" "无法连接到数据库 $DB_DATABASE"
            
            # 检查MySQL服务状态
            if ! systemctl is-active --quiet mysql; then
                log_error "MySQL服务未运行"
                sudo systemctl start mysql
            fi
        fi
    else
        log_error "未找到数据库配置文件: $env_file"
    fi
}

# 检查API响应
check_api_response() {
    log_info "检查API响应时间..."
    
    local api_url="http://localhost:3002/api/health"
    local start_time=$(date +%s%3N)
    
    if curl -f -s --max-time 10 "$api_url" > /dev/null 2>&1; then
        local end_time=$(date +%s%3N)
        local response_time=$((end_time - start_time))
        
        if [ "$response_time" -gt "$RESPONSE_TIME_THRESHOLD" ]; then
            log_warning "API响应时间较慢: ${response_time}ms (阈值: ${RESPONSE_TIME_THRESHOLD}ms)"
        else
            log_success "API响应正常: ${response_time}ms"
        fi
    else
        log_error "API无响应或响应异常"
        send_alert "API响应告警" "API无法正常响应"
    fi
}

# 检查日志错误
check_logs() {
    log_info "检查应用日志..."
    
    # 检查PM2日志中的错误
    if [ -f "$LOG_DIR/backend-error.log" ]; then
        local error_count=$(tail -n 100 "$LOG_DIR/backend-error.log" | grep -c "ERROR\|Error\|error" || echo "0")
        
        if [ "$error_count" -gt 5 ]; then
            log_warning "后端日志中发现 $error_count 个错误"
            send_alert "应用错误告警" "后端日志中发现大量错误: $error_count 个"
        else
            log_success "后端日志正常"
        fi
    fi
    
    # 检查Nginx错误日志
    if [ -f "/var/log/nginx/teacher-manager-error.log" ]; then
        local nginx_errors=$(tail -n 50 "/var/log/nginx/teacher-manager-error.log" | grep -c "error" || echo "0")
        
        if [ "$nginx_errors" -gt 3 ]; then
            log_warning "Nginx日志中发现 $nginx_errors 个错误"
        else
            log_success "Nginx日志正常"
        fi
    fi
}

# 检查磁盘空间
check_disk_space() {
    log_info "检查关键目录磁盘空间..."
    
    local directories=("$PROJECT_DIR" "$LOG_DIR" "/var/backups")
    
    for dir in "${directories[@]}"; do
        if [ -d "$dir" ]; then
            local usage=$(df "$dir" | awk 'NR==2 {print $5}' | sed 's/%//')
            local available=$(df -h "$dir" | awk 'NR==2 {print $4}')
            
            if [ "$usage" -gt 90 ]; then
                log_error "$dir 磁盘空间不足: ${usage}% (可用: $available)"
                send_alert "磁盘空间告警" "$dir 磁盘使用率达到 ${usage}%"
            elif [ "$usage" -gt 80 ]; then
                log_warning "$dir 磁盘空间紧张: ${usage}% (可用: $available)"
            else
                log_success "$dir 磁盘空间正常: ${usage}% (可用: $available)"
            fi
        fi
    done
}

# 检查网络连接
check_network() {
    log_info "检查网络连接..."
    
    # 检查外网连接
    if ping -c 1 8.8.8.8 &>/dev/null; then
        log_success "外网连接正常"
    else
        log_error "外网连接异常"
        send_alert "网络连接告警" "无法连接到外网"
    fi
    
    # 检查DNS解析
    if nslookup google.com &>/dev/null; then
        log_success "DNS解析正常"
    else
        log_error "DNS解析异常"
        send_alert "DNS告警" "DNS解析失败"
    fi
    
    # 检查防火墙状态
    if command -v ufw &> /dev/null; then
        local ufw_status=$(ufw status | head -1)
        if [[ "$ufw_status" == *"active"* ]]; then
            log_success "UFW防火墙运行正常"
            
            # 检查关键端口是否开放
            local ports=("80" "443" "22")
            for port in "${ports[@]}"; do
                if ufw status | grep -q "$port"; then
                    log_success "端口 $port 已开放"
                else
                    log_warning "端口 $port 可能未开放"
                fi
            done
        else
            log_warning "UFW防火墙未激活"
        fi
    else
        log_warning "UFW防火墙未安装"
    fi
}

# 发送告警通知
send_alert() {
    local title="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # 记录告警
    echo "[$timestamp] $title: $message" >> "$ALERT_LOG"
    
    # 发送邮件通知（如果配置了邮件）
    if command -v mail &> /dev/null && [ ! -z "$ALERT_EMAIL" ]; then
        echo "时间: $timestamp\n标题: $title\n内容: $message\n主机: $(hostname)" | \
            mail -s "[教师管理系统] $title" "$ALERT_EMAIL"
    fi
    
    # 发送Webhook通知（如果配置了）
    if [ ! -z "$WEBHOOK_URL" ]; then
        local payload='{"text":"'"$title: $message ($(hostname) - $timestamp)"'"}'
        curl -X POST -H 'Content-type: application/json' \
            --data "$payload" "$WEBHOOK_URL" &>/dev/null || true
    fi
    
    # 写入系统日志
    logger -t "teacher-manager-monitor" "$title: $message"
}

# 生成监控报告
generate_report() {
    local report_file="$LOG_DIR/monitor_report_$(date +%Y%m%d).txt"
    
    cat > "$report_file" << EOF
教师管理系统监控报告
====================

报告时间: $(date '+%Y-%m-%d %H:%M:%S')
主机名: $(hostname)
系统信息: $(uname -a)

=== 系统资源 ===
CPU使用率: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')%
内存使用: $(free -h | grep Mem | awk '{print $3"/"$2}')
磁盘使用: $(df -h $PROJECT_DIR | awk 'NR==2 {print $5" ("$4" 可用)"}')
系统负载: $(uptime | awk -F'load average:' '{print $2}')

=== 服务状态 ===
PM2进程: $(pm2 jlist 2>/dev/null | jq -r '.[] | select(.name=="teacher-manager-backend") | .pm2_env.status' || echo "未知")
Nginx: $(systemctl is-active nginx)
MySQL: $(systemctl is-active mysql)
UFW: $(command -v ufw &> /dev/null && ufw status | head -1 || echo "未安装")
SELinux: $(getenforce 2>/dev/null || echo "未知")

=== 网络状态 ===
外网连接: $(ping -c 1 8.8.8.8 &>/dev/null && echo "正常" || echo "异常")
DNS解析: $(nslookup google.com &>/dev/null && echo "正常" || echo "异常")

=== 最近告警 ===
EOF
    
    # 添加最近的告警信息
    if [ -f "$ALERT_LOG" ]; then
        tail -n 10 "$ALERT_LOG" >> "$report_file" 2>/dev/null || echo "无告警记录" >> "$report_file"
    else
        echo "无告警记录" >> "$report_file"
    fi
    
    log_info "监控报告已生成: $report_file"
}

# 清理旧日志
cleanup_logs() {
    # 清理超过30天的监控日志
    find "$LOG_DIR" -name "monitor_report_*.txt" -mtime +30 -delete 2>/dev/null || true
    
    # 清理超过7天的告警日志
    if [ -f "$ALERT_LOG" ]; then
        tail -n 1000 "$ALERT_LOG" > "$ALERT_LOG.tmp" && mv "$ALERT_LOG.tmp" "$ALERT_LOG"
    fi
    
    # 清理超过7天的监控日志
    if [ -f "$MONITOR_LOG" ]; then
        tail -n 5000 "$MONITOR_LOG" > "$MONITOR_LOG.tmp" && mv "$MONITOR_LOG.tmp" "$MONITOR_LOG"
    fi
}

# 主函数
main() {
    local mode="${1:-check}"
    
    case "$mode" in
        "check")
            echo "=== 教师管理系统监控检查 ==="
            echo "开始时间: $(date '+%Y-%m-%d %H:%M:%S')"
            echo
            
            init_monitoring
            check_system_resources
            check_services
            check_database
            check_api_response
            check_logs
            check_disk_space
            check_network
            
            echo
            echo "=== 监控检查完成 ==="
            echo "结束时间: $(date '+%Y-%m-%d %H:%M:%S')"
            ;;
        "report")
            generate_report
            ;;
        "cleanup")
            cleanup_logs
            log_info "日志清理完成"
            ;;
        "status")
            echo "=== 系统状态概览 ==="
            echo "CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')%"
            echo "内存: $(free -h | grep Mem | awk '{print $3"/"$2}')"
            echo "磁盘: $(df -h $PROJECT_DIR | awk 'NR==2 {print $5" ("$4" 可用)"}')"
            echo "负载: $(uptime | awk -F'load average:' '{print $2}')"
            echo "PM2: $(pm2 jlist 2>/dev/null | jq -r '.[] | select(.name=="teacher-manager-backend") | .pm2_env.status' || echo "未知")"
            echo "Nginx: $(systemctl is-active nginx)"
            echo "MySQL: $(systemctl is-active mysql)"
            echo "UFW: $(command -v ufw &> /dev/null && ufw status | head -1 || echo "未安装")"
            echo "SELinux: $(getenforce 2>/dev/null || echo "未知")"
            ;;
        *)
            echo "使用方法: $0 [check|report|cleanup|status]"
            echo "  check   - 执行完整监控检查（默认）"
            echo "  report  - 生成监控报告"
            echo "  cleanup - 清理旧日志"
            echo "  status  - 显示系统状态概览"
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"