#!/usr/bin/env python3
"""
GTV后端服务监控守护程序
提供进程监控、健康检查、自动重启、日志分析等功能
"""

import os
import sys
import time
import json
import signal
import psutil
import logging
import subprocess
import requests
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import threading
from pathlib import Path

class BackendMonitor:
    def __init__(self, config_file: str = "backend_monitor_config.json"):
        self.config = self.load_config(config_file)
        self.root_dir = os.path.dirname(os.path.abspath(__file__))

        # 配置日志
        self.setup_logging()
        self.logger = logging.getLogger(__name__)

        # 状态管理
        self.running = True
        self.restart_count = 0
        self.last_health_check = datetime.now()
        self.start_time = datetime.now()

        # 进程管理
        self.processes = {}
        self.pid_file = os.path.join(self.root_dir, "backend.pid")
        self.status_file = os.path.join(self.root_dir, "backend_status.json")

        self.logger.info("GTV后端服务监控守护程序启动")

    def load_config(self, config_file: str) -> Dict:
        """加载配置文件"""
        default_config = {
            "api_port": 5005,
            "health_check_interval": 30,
            "restart_interval": 10,
            "max_restarts_per_hour": 5,
            "max_restarts_per_day": 20,
            "startup_timeout": 60,
            "memory_threshold": 2048,  # MB
            "cpu_threshold": 80,  # percentage
            "log_file": "logs/backend_monitor.log",
            "status_check_url": "http://localhost:5005/health",
            "auto_restart": True,
            "log_analysis": True,
            "alert_threshold": {
                "error_rate": 10,  # 错误率阈值 (百分比)
                "response_time": 5000,  # 响应时间阈值 (ms)
                "down_time": 300  # 停机时间阈值 (秒)
            },
            "notification": {
                "enabled": False,
                "webhook_url": "",
                "email": ""
            }
        }

        if os.path.exists(config_file):
            try:
                with open(config_file, 'r', encoding='utf-8') as f:
                    user_config = json.load(f)
                    default_config.update(user_config)
            except Exception as e:
                print(f"加载配置文件失败: {e}")

        return default_config

    def setup_logging(self):
        """设置日志配置"""
        log_file = os.path.join(self.root_dir, self.config["log_file"])
        log_dir = os.path.dirname(log_file)
        if not os.path.exists(log_dir):
            os.makedirs(log_dir)

        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
            handlers=[
                logging.FileHandler(log_file, encoding='utf-8'),
                logging.StreamHandler(sys.stdout)
            ]
        )

    def signal_handler(self, signum, frame):
        """信号处理"""
        self.logger.info(f"收到信号 {signum}，准备优雅退出...")
        self.running = False
        self.cleanup()

    def cleanup(self):
        """清理资源"""
        self.logger.info("正在清理资源...")

        # 停止所有监控的进程
        for name, info in self.processes.items():
            if info.get('pid'):
                self.stop_process(info['pid'], name)

        # 删除PID文件
        if os.path.exists(self.pid_file):
            os.remove(self.pid_file)

        self.logger.info("资源清理完成")

    def stop_process(self, pid: int, name: str):
        """优雅停止进程"""
        try:
            process = psutil.Process(pid)
            self.logger.info(f"正在停止进程 {name} (PID: {pid})...")

            # 尝试优雅终止
            process.terminate()
            process.wait(timeout=10)
            self.logger.info(f"进程 {name} 已优雅停止")

        except psutil.NoSuchProcess:
            self.logger.warning(f"进程 {name} (PID: {pid}) 不存在")
        except psutil.TimeoutExpired:
            self.logger.warning(f"进程 {name} (PID: {pid}) 终止超时，强制杀死")
            try:
                process.kill()
            except:
                pass
        except Exception as e:
            self.logger.error(f"停止进程 {name} 失败: {e}")

    def get_process_info(self, pid: int) -> Optional[Dict]:
        """获取进程信息"""
        try:
            process = psutil.Process(pid)
            info = {
                'pid': pid,
                'name': process.name(),
                'status': process.status(),
                'memory_mb': process.memory_info().rss / 1024 / 1024,
                'cpu_percent': process.cpu_percent(),
                'create_time': datetime.fromtimestamp(process.create_time()),
                'uptime_seconds': time.time() - process.create_time()
            }
            return info
        except psutil.NoSuchProcess:
            return None
        except Exception as e:
            self.logger.error(f"获取进程信息失败: {e}")
            return None

    def health_check(self) -> Dict:
        """执行健康检查"""
        self.last_health_check = datetime.now()

        # 检查进程是否存在
        if os.path.exists(self.pid_file):
            try:
                with open(self.pid_file, 'r') as f:
                    pid = int(f.read().strip())

                process_info = self.get_process_info(pid)
                if not process_info:
                    self.logger.warning("后端进程不存在")
                    return {'status': 'down', 'reason': 'process_not_found'}

                # 检查HTTP服务
                try:
                    response = requests.get(
                        self.config['status_check_url'],
                        timeout=10,
                        headers={'User-Agent': 'GTV-Monitor/1.0'}
                    )

                    if response.status_code == 200:
                        response_data = response.json()

                        # 记录性能指标
                        response_time = response.elapsed.total_seconds() * 1000

                        result = {
                            'status': 'healthy',
                            'pid': pid,
                            'response_time_ms': response_time,
                            'memory_mb': process_info['memory_mb'],
                            'cpu_percent': process_info['cpu_percent'],
                            'uptime_seconds': process_info['uptime_seconds'],
                            'service_info': response_data
                        }

                        # 检查资源使用
                        if process_info['memory_mb'] > self.config['memory_threshold']:
                            self.logger.warning(f"内存使用过高: {process_info['memory_mb']:.1f}MB")

                        if process_info['cpu_percent'] > self.config['cpu_threshold']:
                            self.logger.warning(f"CPU使用过高: {process_info['cpu_percent']:.1f}%")

                        return result
                    else:
                        self.logger.warning(f"HTTP服务返回错误: {response.status_code}")
                        return {'status': 'unhealthy', 'reason': 'http_error', 'code': response.status_code}

                except requests.exceptions.Timeout:
                    self.logger.warning("HTTP服务超时")
                    return {'status': 'unhealthy', 'reason': 'timeout'}
                except requests.exceptions.ConnectionError:
                    self.logger.warning("无法连接HTTP服务")
                    return {'status': 'unhealthy', 'reason': 'connection_error'}
                except Exception as e:
                    self.logger.warning(f"健康检查失败: {e}")
                    return {'status': 'unhealthy', 'reason': 'check_error'}

            except (FileNotFoundError, ValueError) as e:
                self.logger.error(f"PID文件错误: {e}")
                return {'status': 'error', 'reason': 'pid_file_error'}
        else:
            self.logger.warning("PID文件不存在")
            return {'status': 'down', 'reason': 'no_pid_file'}

    def analyze_logs(self) -> Dict:
        """分析日志文件"""
        if not self.config['log_analysis']:
            return {}

        try:
            log_files = [
                'logs/api_server_unified.log',
                'logs/backend_startup.log'
            ]

            analysis = {
                'error_count': 0,
                'warning_count': 0,
                'last_error': None,
                'last_warning': None,
                'error_rate': 0,
                'status_changes': []
            }

            for log_file in log_files:
                full_path = os.path.join(self.root_dir, 'ace_gtv', log_file) if 'api_server' in log_file else os.path.join(self.root_dir, log_file)

                if not os.path.exists(full_path):
                    continue

                try:
                    with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                        # 只分析最近1小时的日志
                        one_hour_ago = datetime.now() - timedelta(hours=1)
                        lines = f.readlines()[-10000:]  # 最多分析1万行

                        for line in lines:
                            try:
                                if 'ERROR' in line or '错误' in line:
                                    analysis['error_count'] += 1
                                    analysis['last_error'] = line.strip()
                                elif 'WARN' in line or '警告' in line:
                                    analysis['warning_count'] += 1
                                    analysis['last_warning'] = line.strip()
                                elif 'status' in line.lower() and 'changed' in line.lower():
                                    analysis['status_changes'].append(line.strip())
                            except:
                                continue

                except Exception as e:
                    self.logger.warning(f"分析日志文件 {log_file} 失败: {e}")

            # 计算错误率（基于最后1000行）
            total_lines = len(lines[-1000:]) if 'lines' in locals() else 1
            analysis['error_rate'] = (analysis['error_count'] / total_lines) * 100 if total_lines > 0 else 0

            return analysis

        except Exception as e:
            self.logger.error(f"日志分析失败: {e}")
            return {}

    def restart_service(self) -> bool:
        """重启后端服务"""
        self.logger.info("准备重启后端服务...")

        try:
            # 运行重启脚本
            restart_script = os.path.join(self.root_dir, "start_backend_optimized.sh")
            if os.path.exists(restart_script):
                result = subprocess.run(
                    ["bash", restart_script, "--background", "--port", str(self.config['api_port'])],
                    capture_output=True,
                    text=True,
                    timeout=self.config['startup_timeout']
                )

                if result.returncode == 0:
                    self.logger.info("服务重启成功")
                    self.restart_count += 1
                    time.sleep(5)  # 等待服务稳定
                    return True
                else:
                    self.logger.error(f"服务重启失败: {result.stderr}")
                    return False
            else:
                self.logger.error(f"重启脚本不存在: {restart_script}")
                return False

        except subprocess.TimeoutExpired:
            self.logger.error("服务重启超时")
            return False
        except Exception as e:
            self.logger.error(f"重启服务失败: {e}")
            return False

    def send_alert(self, message: str, level: str = "warning"):
        """发送告警"""
        if not self.config['notification']['enabled']:
            return

        try:
            # Webhook告警
            webhook_url = self.config['notification']['webhook_url']
            if webhook_url:
                import requests
                payload = {
                    "text": f"GTV后端监控告警 [{level.upper()}]: {message}",
                    "timestamp": datetime.now().isoformat(),
                    "hostname": os.uname().nodename,
                    "service": "gtv-backend"
                }
                requests.post(webhook_url, json=payload, timeout=5)

        except Exception as e:
            self.logger.error(f"发送告警失败: {e}")

    def save_status(self, status: Dict):
        """保存服务状态到文件"""
        try:
            status['timestamp'] = datetime.now().isoformat()
            with open(self.status_file, 'w', encoding='utf-8') as f:
                json.dump(status, f, indent=2, ensure_ascii=False, default=str)
        except Exception as e:
            self.logger.error(f"保存状态失败: {e}")

    def monitor_loop(self):
        """主监控循环"""
        self.logger.info("开始监控循环")

        consecutive_failures = 0
        consecutive_starts = 0
        check_count = 0

        while self.running:
            try:
                # 检查服务状态
                health_result = self.health_check()
                check_count += 1

                # 分析日志
                if check_count % 10 == 0:  # 每10次检查分析一次日志
                    log_analysis = self.analyze_logs()
                    health_result['log_analysis'] = log_analysis

                # 保存状态
                self.save_status(health_result)

                # 根据状态处理
                if health_result['status'] == 'healthy':
                    consecutive_failures = 0

                    # 发送状态报告 (每小时一次)
                    if check_count % (3600 // self.config['health_check_interval']) == 0:
                        self.logger.info(f"服务运行正常 - 内存: {health_result.get('memory_mb', 0):.1f}MB, CPU: {health_result.get('cpu_percent', 0):.1f}%, 响应时间: {health_result.get('response_time_ms', 0):.0f}ms")

                elif health_result['status'] in ['unhealthy', 'down']:
                    consecutive_failures += 1

                    if consecutive_failures == 2:
                        self.logger.warning(f"连续2次健康检查失败，原因: {health_result.get('reason', 'unknown')}")
                        self.send_alert(f"服务健康检查失败，原因: {health_result.get('reason', 'unknown')}", "warning")

                        if self.config['auto_restart']:
                            self.logger.info("准备自动重启服务...")
                            if self.restart_service():
                                consecutive_failures = 0
                                consecutive_starts += 1

                                if consecutive_starts > 3:
                                    self.logger.error("服务连续重启超过3次，可能存在严重问题")
                                    self.send_alert("服务连续重启超过3次，可能存在严重问题", "error")
                                    time.sleep(300)  # 等待5分钟再继续监控
                            else:
                                self.logger.error("自动重启失败")
                                self.send_alert("服务自动重启失败", "error")
                                time.sleep(60)  # 等待1分钟后重试

                else:  # error状态
                    self.logger.error(f"服务状态异常: {health_result.get('reason', 'unknown')}")
                    self.send_alert(f"服务状态异常: {health_result.get('reason', 'unknown')}", "error")

                    if consecutive_failures > 0:
                        time.sleep(120)  # 错误状态下等待更长时间

                # 等待下一次检查
                time.sleep(self.config['health_check_interval'])

            except KeyboardInterrupt:
                self.logger.info("收到中断信号，准备退出...")
                break
            except Exception as e:
                self.logger.error(f"监控循环出错: {e}")
                time.sleep(60)  # 出错后等待1分钟继续

        self.logger.info("监控循环结束")

    def show_history(self, hours: int = 24) -> List[Dict]:
        """显示历史状态"""
        history = []
        cutoff_time = datetime.now() - timedelta(hours=hours)

        try:
            if os.path.exists(self.status_file):
                with open(self.status_file, 'r', encoding='utf-8') as f:
                    current_status = json.load(f)
                    if 'timestamp' in current_status:
                        timestamp = datetime.fromisoformat(current_status['timestamp'])
                        if timestamp >= cutoff_time:
                            history.append(current_status)
        except Exception as e:
            self.logger.error(f"读取历史状态失败: {e}")

        return history

def main():
    """主函数"""
    if len(sys.argv) < 2:
        print("语音: backend_monitor.py [start|status|history] [hours]")
        return

    command = sys.argv[1]
    monitor = BackendMonitor()

    if command == "start":
        # 设置信号处理
        signal.signal(signal.SIGINT, monitor.signal_handler)
        signal.signal(signal.SIGTERM, monitor.signal_handler)

        # 启动监控
        monitor.monitor_loop()

    elif command == "status":
        if os.path.exists(monitor.status_file):
            with open(monitor.status_file, 'r', encoding='utf-8') as f:
                status = json.load(f)
                print(json.dumps(status, indent=2, ensure_ascii=False))
        else:
            print(json.dumps({"status": "stopped"}, indent=2))

    elif command == "history":
        hours = int(sys.argv[2]) if len(sys.argv) > 2 else 24
        history = monitor.show_history(hours)
        print(f"最近{hours}小时的历史状态 ({len(history)}条记录):")
        print(json.dumps(history, indent=2, ensure_ascii=False))

    else:
        print(f"未知命令: {command}")
        print("可用命令: start, status, history")

if __name__ == "__main__":
    main()