#!/usr/bin/env python3
"""
统一日志配置模块
为所有 Agent 和服务提供集中化的日志管理
支持文件和控制台输出，自动创建日志文件
"""

import os
import sys
import logging
from pathlib import Path
from datetime import datetime

# 日志目录配置
LOG_DIR = Path(__file__).parent / "logs"
LOG_DIR.mkdir(exist_ok=True)

# 日志级别配置
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
LOG_FILE_LEVEL = os.getenv("LOG_FILE_LEVEL", "DEBUG").upper()

# 日志文件
UNIFIED_LOG_FILE = LOG_DIR / "gtv_unified.log"
OC_AGENT_LOG_FILE = LOG_DIR / "oc_agent.log"
SCORING_AGENT_LOG_FILE = LOG_DIR / "scoring_agent.log"
RESUME_PROCESSOR_LOG_FILE = LOG_DIR / "resume_processor.log"
API_SERVER_LOG_FILE = LOG_DIR / "api_server.log"

# 日志格式
DETAILED_FORMAT = logging.Formatter(
    '%(asctime)s | %(levelname)-8s | %(name)-20s | [%(filename)s:%(lineno)d] | %(funcName)s | %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

SIMPLE_FORMAT = logging.Formatter(
    '%(asctime)s | %(levelname)-8s | %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)


def setup_logger(
    name: str,
    log_file: Path = UNIFIED_LOG_FILE,
    level: str = LOG_LEVEL,
    add_file_handler: bool = True,
    add_console_handler: bool = True
) -> logging.Logger:
    """
    设置和配置日志记录器
    
    Args:
        name: 日志记录器名称
        log_file: 日志文件路径
        level: 日志级别
        add_file_handler: 是否添加文件处理器
        add_console_handler: 是否添加控制台处理器
    
    Returns:
        配置好的日志记录器
    """
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, level, logging.INFO))
    
    # 移除已存在的处理器，防止重复
    for handler in list(logger.handlers):
        logger.removeHandler(handler)
    
    # 文件处理器
    if add_file_handler:
        try:
            file_handler = logging.FileHandler(log_file, encoding='utf-8')
            file_handler.setLevel(getattr(logging, LOG_FILE_LEVEL, logging.DEBUG))
            file_handler.setFormatter(DETAILED_FORMAT)
            logger.addHandler(file_handler)
        except Exception as e:
            print(f"⚠️ 无法创建文件日志处理器: {e}")
    
    # 控制台处理器
    if add_console_handler:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(getattr(logging, level, logging.INFO))
        console_handler.setFormatter(DETAILED_FORMAT)
        logger.addHandler(console_handler)
    
    return logger


def setup_unified_logger(name: str, level: str = LOG_LEVEL) -> logging.Logger:
    """
    设置统一日志记录器（所有日志输出到 gtv_unified.log）
    
    Args:
        name: 日志记录器名称
        level: 日志级别
    
    Returns:
        配置好的日志记录器
    """
    return setup_logger(name, UNIFIED_LOG_FILE, level)


def setup_module_logger(module_name: str, level: str = LOG_LEVEL) -> logging.Logger:
    """
    为特定模块设置日志记录器
    
    Args:
        module_name: 模块名称 (oc_agent, scoring_agent, resume_processor, api_server)
        level: 日志级别
    
    Returns:
        配置好的日志记录器
    """
    log_files = {
        "oc_agent": OC_AGENT_LOG_FILE,
        "scoring_agent": SCORING_AGENT_LOG_FILE,
        "resume_processor": RESUME_PROCESSOR_LOG_FILE,
        "api_server": API_SERVER_LOG_FILE,
    }
    
    log_file = log_files.get(module_name, UNIFIED_LOG_FILE)
    return setup_logger(module_name, log_file, level)


def log_execution_time(logger: logging.Logger, operation: str, start_time: datetime, details: str = ""):
    """
    记录操作执行时间
    
    Args:
        logger: 日志记录器
        operation: 操作名称
        start_time: 开始时间
        details: 额外详情
    """
    elapsed = (datetime.now() - start_time).total_seconds()
    if details:
        logger.info(f"⏱️ {operation} 完成，耗时: {elapsed:.2f}秒 | {details}")
    else:
        logger.info(f"⏱️ {operation} 完成，耗时: {elapsed:.2f}秒")


def log_step(logger: logging.Logger, step: int, total: int, message: str, status: str = ""):
    """
    记录步骤进度
    
    Args:
        logger: 日志记录器
        step: 当前步骤
        total: 总步骤数
        message: 步骤消息
        status: 状态（成功/失败/处理中）
    """
    progress = f"[{step}/{total}]"
    if status == "success":
        logger.info(f"✅ {progress} {message}")
    elif status == "error":
        logger.error(f"❌ {progress} {message}")
    elif status == "warning":
        logger.warning(f"⚠️ {progress} {message}")
    else:
        logger.info(f"🔄 {progress} {message}")


def log_oc_assessment_start(logger: logging.Logger, request_id: str, applicant_name: str, oc_count: int):
    """
    记录 OC 评估开始
    
    Args:
        logger: 日志记录器
        request_id: 请求ID
        applicant_name: 申请人名字
        oc_count: OC 总数
    """
    logger.info(f"🚀 [{request_id}] 开始 OC 评估 | 申请人: {applicant_name} | 总OC数: {oc_count}")


def log_oc_assessment_complete(logger: logging.Logger, request_id: str, elapsed: float, results_count: int, errors: int = 0):
    """
    记录 OC 评估完成
    
    Args:
        logger: 日志记录器
        request_id: 请求ID
        elapsed: 耗时（秒）
        results_count: 结果数
        errors: 错误数
    """
    if errors == 0:
        logger.info(f"✅ [{ request_id}] OC 评估完成 | 耗时: {elapsed:.2f}秒 | 结果数: {results_count}")
    else:
        logger.warning(f"⚠️ [{request_id}] OC 评估完成(含错误) | 耗时: {elapsed:.2f}秒 | 结果: {results_count} | 错误: {errors}")


def log_llm_call(logger: logging.Logger, provider: str, model: str, tokens_estimated: int = 0, response_time: float = 0):
    """
    记录 LLM 调用
    
    Args:
        logger: 日志记录器
        provider: LLM 提供商 (OpenAI, Anthropic 等)
        model: 模型名称
        tokens_estimated: 预估 tokens
        response_time: 响应时间（秒）
    """
    if response_time > 0:
        logger.debug(f"🤖 LLM 调用 | 提供商: {provider} | 模型: {model} | 耗时: {response_time:.2f}秒 | Tokens: {tokens_estimated}")
    else:
        logger.debug(f"🤖 LLM 调用 | 提供商: {provider} | 模型: {model}")


# 向后兼容：创建默认记录器
logger = setup_logger(__name__, UNIFIED_LOG_FILE)
