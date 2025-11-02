#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import json
import logging
import sys
from pathlib import Path
import threading
import time
from datetime import datetime
from typing import Dict, Any, Optional, Tuple
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
from openai import OpenAI
try:
    from openai import AzureOpenAI
except Exception:
    AzureOpenAI = None  # type: ignore
 

# 导入PDF报告生成器
try:
    from pdf_report_generator import generate_gtv_pdf_report
    print("✅ PDF报告生成器导入成功")
except Exception as e:
    print(f"❌ PDF报告生成器导入失败: {e}")
    generate_gtv_pdf_report = None

# 导入数据库管理器
try:
    from assessment_database import save_assessment_to_database, load_assessment_from_database, list_all_assessments
    print("✅ 评估数据库管理器导入成功")
except Exception as e:
    print(f"❌ 评估数据库管理器导入失败: {e}")
    save_assessment_to_database = None
    load_assessment_from_database = None
    list_all_assessments = None

# 导入Markdown保存器（保留作为备用）
try:
    from markdown_saver import save_assessment_to_markdown, GTVMarkdownSaver
    print("✅ Markdown保存器导入成功")
except Exception as e:
    print(f"❌ Markdown保存器导入失败: {e}")
    save_assessment_to_markdown = None
    GTVMarkdownSaver = None

# 导入专家知识库管理器
try:
    from expert_kb_manager import load_expert_kb, ExpertKnowledgeBase
    print("✅ 专家知识库管理器导入成功")
    expert_kb = load_expert_kb()
except Exception as e:
    print(f"❌ 专家知识库管理器导入失败: {e}")
    expert_kb = None

# 可选依赖的占位导入（在运行环境安装后启用）
try:
    from pdfminer.high_level import extract_text as pdf_extract_text
    print(f"✅ pdfminer.six 导入成功")
except Exception as e:
    print(f"❌ pdfminer.six 导入失败: {e}")
    pdf_extract_text = None  # type: ignore

try:
    import docx  # python-docx
    print(f"✅ python-docx 导入成功，版本: {docx.__version__}")
except Exception as e:
    print(f"❌ python-docx 导入失败: {e}")
    docx = None  # type: ignore

# 加载环境变量（优先加载项目根目录的.env.local，然后.env）
project_root = Path(__file__).parent.parent
env_local_path = project_root / ".env.local"
if env_local_path.exists():
    load_dotenv(env_local_path)
    print(f"✅ 已加载配置文件: {env_local_path}")
else:
    print(f"⚠️  配置文件不存在: {env_local_path}")

load_dotenv('.env.local')
load_dotenv('.env')
load_dotenv()

# 配置日志（支持环境变量 LOG_LEVEL）
_level_name = os.getenv("LOG_LEVEL", "INFO").upper()
_level = getattr(logging, _level_name, logging.INFO)
# 统一日志（UTF-8、文件+控制台、包含文件与行号）
logger = logging.getLogger("resume_processor")
logger.setLevel(_level)

# 清理重复handler
if logger.handlers:
    for h in list(logger.handlers):
        logger.removeHandler(h)

_fmt = logging.Formatter('%(asctime)s %(levelname)s %(filename)s:%(lineno)d %(message)s')

try:
    _log_file = Path(__file__).with_name('resume_processor.log')
    _fh = logging.FileHandler(_log_file, encoding='utf-8')
    _fh.setLevel(_level)
    _fh.setFormatter(_fmt)
    logger.addHandler(_fh)
except Exception:
    pass

_sh = logging.StreamHandler(sys.stdout)
_sh.setLevel(_level)
_sh.setFormatter(_fmt)
logger.addHandler(_sh)

try:
    wz = logging.getLogger('werkzeug')
    wz.setLevel(_level)
    for h in list(wz.handlers):
        wz.removeHandler(h)
    wz.addHandler(_fh) if '_fh' in globals() else None
    wz.addHandler(_sh)
except Exception:
    pass

def safe_preview(value: Any, max_len: int = 200) -> str:
    """生成安全可读的预览，替换不可打印字符，限制长度。"""
    try:
        text = str(value)
    except Exception:
        return "<unprintable>"
    printable = []
    for ch in text:
        code = ord(ch)
        # 支持ASCII可打印字符、Unicode字符、以及常见的空白字符
        if (32 <= code <= 126 or  # ASCII可打印字符
            code >= 128 or        # Unicode字符（包括中文）
            ch in '\n\r\t '):     # 常见空白字符
            printable.append(ch)
        else:
            printable.append('.')
    result = ''.join(printable)
    if len(result) > max_len:
        result = result[:max_len] + '...'
    return result

app = Flask(__name__)
CORS(app)  # 启用CORS支持

# 配置
UPLOAD_FOLDER = 'resumes'
ALLOWED_EXTENSIONS = {'txt', 'pdf', 'doc', 'docx'}
MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB

# 超时配置（可用环境变量覆盖）
PARSE_TIMEOUT_SEC = int(os.getenv('PARSE_TIMEOUT_SEC', '15'))
LLM_TIMEOUT_SEC = int(os.getenv('LLM_TIMEOUT_SEC', '45'))
TOTAL_TIMEOUT_SEC = int(os.getenv('TOTAL_TIMEOUT_SEC', '60'))

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

# 确保上传目录存在
try:
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    logger.info(f"上传目录已创建/确认存在: {os.path.abspath(UPLOAD_FOLDER)}")
except Exception as e:
    logger.error(f"创建上传目录失败: {e}")
    raise

def allowed_file(filename):
    """检查文件类型是否允许"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def _extract_text_from_pdf(file_path: str) -> str:
    if not pdf_extract_text:
        logger.error("未安装 pdfminer.six，无法解析PDF。请在 ace_gtv/requirements.txt 中安装 pdfminer.six")
        return ""
    try:
        text = pdf_extract_text(file_path) or ""
        logger.info(f"PDF解析完成，字符数: {len(text)}")
        return text
    except Exception as e:
        logger.error(f"PDF解析失败: {e}")
        return ""


def _extract_text_from_docx(file_path: str) -> str:
    if not docx:
        logger.error("未安装 python-docx，无法解析DOCX。请在 ace_gtv/requirements.txt 中安装 python-docx")
        return ""
    try:
        d = docx.Document(file_path)
        paragraphs = [p.text for p in d.paragraphs if p.text is not None]
        text = "\n".join(paragraphs)
        logger.info(f"DOCX解析完成，段落数: {len(paragraphs)}，字符数: {len(text)}")
        return text
    except Exception as e:
        logger.error(f"DOCX解析失败: {e}")
        return ""


def _run_with_timeout(func, args=(), kwargs=None, timeout_sec=10) -> Optional[Any]:
    """在单独线程执行函数，超时返回None并记录警告。"""
    if kwargs is None:
        kwargs = {}
    result_container = {"value": None, "error": None}

    def _target():
        try:
            result_container["value"] = func(*args, **kwargs)
        except Exception as e:
            result_container["error"] = e

    t = threading.Thread(target=_target, daemon=True)
    t.start()
    t.join(timeout=timeout_sec)
    if t.is_alive():
        logger.warning(f"任务超时({timeout_sec}s): {func.__name__}")
        return None
    if result_container["error"] is not None:
        logger.error(f"任务异常: {func.__name__}: {result_container['error']}")
        return None
    return result_container["value"]


def _to_markdown(text: str) -> str:
    if not text:
        return ""
    # 基础Markdown化：
    lines = [ln.strip() for ln in text.splitlines()]
    md_lines = []
    for ln in lines:
        if not ln:
            md_lines.append("")
            continue
        # 简单规则：看似标题的行做二级标题
        if len(ln) <= 30 and any(k in ln for k in ["姓名", "教育", "教育背景", "经验", "工作经验", "技能", "成就", "项目", "联系方式", "电话", "邮箱"]):
            md_lines.append(f"## {ln}")
        else:
            md_lines.append(ln)
    return "\n".join(md_lines)


def _save_markdown_alongside(src_path: str, markdown_text: str) -> Optional[str]:
    try:
        md_path = str(Path(src_path).with_suffix('.md'))
        with open(md_path, 'w', encoding='utf-8') as f:
            f.write(markdown_text)
        logger.info(f"已保存Markdown内容: {md_path}")
        return md_path
    except Exception as e:
        logger.error(f"保存Markdown失败: {e}")
        return None


def extract_text_from_file(file_path: str) -> str:
    """从文件中提取文本内容"""
    logger.info(f"开始提取文件文本内容: {file_path}")
    
    # 检查文件是否存在
    if not os.path.exists(file_path):
        logger.error(f"文件不存在: {file_path}")
        return ""
    
    # 获取文件大小
    file_size = os.path.getsize(file_path)
    logger.info(f"文件大小: {file_size} bytes")
    
    # 根据扩展名优先使用专用解析器
    suffix = Path(file_path).suffix.lower()
    if suffix == '.pdf':
        logger.info("检测到PDF文件，使用pdfminer解析")
        text_pdf = _run_with_timeout(_extract_text_from_pdf, args=(file_path,), timeout_sec=PARSE_TIMEOUT_SEC)
        if text_pdf is None:
            logger.error("PDF解析超时或失败，建议转换为文本型PDF/上传TXT。")
            return ""
        md_pdf = _to_markdown(text_pdf)
        _save_markdown_alongside(file_path, md_pdf)
        return text_pdf
    if suffix == '.docx':
        logger.info("检测到DOCX文件，使用python-docx解析")
        text_docx = _run_with_timeout(_extract_text_from_docx, args=(file_path,), timeout_sec=PARSE_TIMEOUT_SEC)
        if text_docx is None:
            logger.error("DOCX解析超时或失败，建议转换为DOCX(文本)或PDF/TXT。")
            return ""
        md_docx = _to_markdown(text_docx)
        _save_markdown_alongside(file_path, md_docx)
        return text_docx
    if suffix == '.doc':
        logger.warning("检测到DOC(97-2003)文件，当前未内置解析器。建议转换为DOCX或PDF后再上传。尝试按文本读取。")

    # 尝试多种编码格式（用于txt/未知场景）
    encodings = ['utf-8', 'gbk', 'gb2312', 'latin-1', 'cp1252', 'iso-8859-1']
    logger.info(f"尝试使用 {len(encodings)} 种编码格式读取文件")
    
    for i, encoding in enumerate(encodings, 1):
        try:
            logger.debug(f"尝试编码 {i}/{len(encodings)}: {encoding}")
            with open(file_path, 'r', encoding=encoding) as f:
                content = f.read()
                logger.info(f"成功使用 {encoding} 编码读取文件，内容长度: {len(content)} 字符")
                # 简单健康检查：检测疑似二进制/Office包签名
                if '\u0000' in content[:200] or 'PK\x03\x04' in content[:200]:
                    logger.warning("检测到疑似二进制/Office压缩格式签名，内容可能不是纯文本。建议转换为TXT/PDF后再上传。")
                # 文本->Markdown并保存
                _save_markdown_alongside(file_path, _to_markdown(content))
                return content
        except UnicodeDecodeError as e:
            logger.debug(f"编码 {encoding} 失败 (UnicodeDecodeError): {e}")
            continue
        except Exception as e:
            logger.error(f"使用 {encoding} 编码读取文件失败: {e}")
            continue
    
    # 如果所有编码都失败，尝试以二进制方式读取并忽略错误
    logger.warning("所有编码方式都失败，尝试使用UTF-8编码并忽略错误字符")
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
            logger.warning(f"使用UTF-8编码并忽略错误字符读取文件成功，内容长度: {len(content)} 字符")
            _save_markdown_alongside(file_path, _to_markdown(content))
            return content
    except Exception as e:
        logger.error(f"所有编码方式都失败: {e}")
        return ""

def _get_llm_client() -> Optional[Any]:
    """返回 Azure OpenAI 客户端（仅支持 Azure）。"""
    # 兼容变量映射
    if os.getenv("AZURE_API_KEY") and not os.getenv("AZURE_OPENAI_API_KEY"):
        os.environ["AZURE_OPENAI_API_KEY"] = os.getenv("AZURE_API_KEY", "")
        logger.info("自动映射AZURE_API_KEY -> AZURE_OPENAI_API_KEY")
    if os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME") and not os.getenv("AZURE_OPENAI_DEPLOYMENT"):
        os.environ["AZURE_OPENAI_DEPLOYMENT"] = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME", "")
        logger.info("自动映射AZURE_OPENAI_DEPLOYMENT_NAME -> AZURE_OPENAI_DEPLOYMENT")
    if os.getenv("AZURE_OPENAI_ENDPOINT") and not os.getenv("ENDPOINT_URL"):
        os.environ["ENDPOINT_URL"] = os.getenv("AZURE_OPENAI_ENDPOINT", "")
        logger.info("自动映射AZURE_OPENAI_ENDPOINT -> ENDPOINT_URL")
    if os.getenv("AZURE_OPENAI_DEPLOYMENT") and not os.getenv("DEPLOYMENT_NAME"):
        os.environ["DEPLOYMENT_NAME"] = os.getenv("AZURE_OPENAI_DEPLOYMENT", "")
        logger.info("自动映射AZURE_OPENAI_DEPLOYMENT -> DEPLOYMENT_NAME")

    # httpx 版本守护（与 openai 客户端兼容）
    try:
        import httpx
        httpx_version = getattr(httpx, "__version__", "0.0.0").split(".")
        major = int(httpx_version[0]) if len(httpx_version) > 0 and httpx_version[0].isdigit() else 0
        minor = int(httpx_version[1]) if len(httpx_version) > 1 and httpx_version[1].isdigit() else 0
        if major == 0 and minor >= 28:
            msg = (
                "检测到 httpx>=0.28，与当前 openai 版本可能不兼容（移除了 proxies）。"
                "请固定 httpx 到 0.27.x（如 0.27.2）或升级 openai 到兼容版本。"
            )
            logger.error(msg)
            raise RuntimeError(msg)
    except RuntimeError:
        raise
    except Exception as _e:
        logger.debug(f"httpx 版本检查跳过: {_e}")

    endpoint = os.getenv("ENDPOINT_URL", "").rstrip("/")
    api_key = os.getenv("AZURE_OPENAI_API_KEY", "")
    api_version = os.getenv("AZURE_OPENAI_API_VERSION", "2025-01-01-preview")
    if not (endpoint and api_key):
        logger.warning("未配置 Azure OpenAI 参数，跳过LLM提取")
        return None
    if AzureOpenAI is None:
        raise RuntimeError("当前 openai 版本不支持 AzureOpenAI，请升级 openai 到支持 Azure 的版本")
    return AzureOpenAI(
        azure_endpoint=endpoint,
        api_key=api_key,
        api_version=api_version,
    )


def _parse_llm_json(text: str) -> Dict[str, Any]:
    cleaned = text.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    if cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()

    # 额外的清理步骤：移除可能的BOM标记
    if cleaned.startswith('\ufeff'):
        cleaned = cleaned[1:]

    # 尝试多次修复常见的JSON问题
    # 1. 移除末尾的逗号（在对象/数组的最后一个元素之后）
    import re
    cleaned = re.sub(r',(\s*[}\]])', r'\1', cleaned)

    # 2. 处理未终止的字符串（截断的JSON）
    # 如果JSON看起来被截断了，尝试修复它
    if cleaned.count('"') % 2 != 0:  # 奇数个引号，说明有未终止的字符串
        # 找到最后一个开始的引号位置
        last_quote_pos = cleaned.rfind('"')
        if last_quote_pos != -1:
            # 检查这个引号是否在正确的上下文中（不在转义序列中）
            escape_count = 0
            pos = last_quote_pos - 1
            while pos >= 0 and cleaned[pos] == '\\':
                escape_count += 1
                pos -= 1
            # 如果是偶数个反斜杠，说明引号没有被转义，需要修复
            if escape_count % 2 == 0:
                # 尝试找到可以安全结束JSON的位置
                if cleaned.rfind('{') > cleaned.rfind('}'):
                    # 最后有未闭合的对象，尝试闭合它
                    cleaned = cleaned[:last_quote_pos] + '"}'
                elif cleaned.rfind('[') > cleaned.rfind(']'):
                    # 最后有未闭合的数组，尝试闭合它
                    cleaned = cleaned[:last_quote_pos] + '"]'
                else:
                    # 简单地在引号后闭合
                    cleaned = cleaned[:last_quote_pos + 1] + '}'

    # 3. 检查未闭合的括号结构
    open_braces = cleaned.count('{')
    close_braces = cleaned.count('}')
    if open_braces > close_braces:
        # 缺少闭合括号，尝试添加
        cleaned += '}' * (open_braces - close_braces)
    elif close_braces > open_braces:
        # 多余的闭合括号，移除一些
        for _ in range(close_braces - open_braces):
            pos = cleaned.rfind('}')
            if pos != -1:
                cleaned = cleaned[:pos] + cleaned[pos+1:]

    open_brackets = cleaned.count('[')
    close_brackets = cleaned.count(']')
    if open_brackets > close_brackets:
        cleaned += ']' * (open_brackets - close_brackets)
    elif close_brackets > open_brackets:
        for _ in range(close_brackets - open_brackets):
            pos = cleaned.rfind(']')
            if pos != -1:
                cleaned = cleaned[:pos] + cleaned[pos+1:]

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        logger.error(f"LLM JSON解析失败: {e}; 预览: {safe_preview(cleaned)}")
        logger.debug(f"完整JSON文本: {cleaned[:1000]}")  # 记录前1000个字符用于调试

        # 如果仍然失败，尝试返回一个最小的有效JSON对象
        logger.warning("JSON解析失败，尝试返回最小有效对象")
        try:
            # 尝试提取有效的JSON片段 - 从里到外逐层恢复
            # 策略1：寻找第一个完整的JSON对象
            start_pos = cleaned.find('{')
            if start_pos != -1:
                bracket_count = 0
                last_valid_pos = -1
                in_string = False
                escape_next = False
                
                for i, char in enumerate(cleaned[start_pos:], start_pos):
                    if escape_next:
                        escape_next = False
                        continue
                    
                    if char == '\\':
                        escape_next = True
                        continue
                    
                    if char == '"':
                        in_string = not in_string
                        continue
                    
                    if not in_string:
                        if char == '{':
                            bracket_count += 1
                        elif char == '}':
                            bracket_count -= 1
                            if bracket_count == 0:
                                # 找到一个完整的JSON对象
                                partial_json = cleaned[start_pos:i+1]
                                try:
                                    return json.loads(partial_json)
                                except:
                                    last_valid_pos = i
                
                # 如果找不到完整对象，尝试从最后一个有效位置截断
                if last_valid_pos > start_pos:
                    # 从最后一个关闭的括号处截断并补全
                    partial_json = cleaned[start_pos:last_valid_pos+1]
                    # 补全任何未关闭的括号
                    open_b = partial_json.count('{') - partial_json.count('}')
                    partial_json += '}' * open_b
                    try:
                        return json.loads(partial_json)
                    except:
                        pass
        except Exception as extract_error:
            logger.error(f"提取JSON片段也失败: {extract_error}")

        # 策略2：尝试从数组中恢复
        try:
            start_pos = cleaned.find('[')
            if start_pos != -1:
                bracket_count = 0
                for i, char in enumerate(cleaned[start_pos:], start_pos):
                    if char == '[':
                        bracket_count += 1
                    elif char == ']':
                        bracket_count -= 1
                        if bracket_count == 0:
                            partial_json = cleaned[start_pos:i+1]
                            return json.loads(partial_json)
        except Exception as arr_error:
            logger.debug(f"数组恢复失败: {arr_error}")

        # 最后手段：返回一个空对象
        logger.error("无法解析任何有效的JSON，返回空对象")
        return {"error": "JSON parsing failed", "original_error": str(e)}


def call_ai_for_extraction(content: str) -> Dict[str, Any]:
    """优先调用LLM进行信息提取；失败则回退本地规则。"""
    logger.info(f"开始AI信息提取，输入内容长度: {len(content)} 字符")
    
    client = _get_llm_client()
    if not client:
        logger.info("未配置LLM客户端，回退到本地规则提取")
        return _extract_with_local_rules(content)
    
    try:
        system_prompt = (
            "你是资深签证顾问，请从简历全文中提炼结构化信息。"
            "严格返回JSON对象，不要包含多余说明或Markdown围栏。"
        )
        user_prompt = (
            "请从以下简历内容中提取: name, email, phone, experience(连续文本),"
            "education(连续文本), skills(数组), achievements(数组), projects(数组),"
            "languages(数组), certifications(数组), summary(摘要)。\n\n简历全文:\n" + content
        )

        deployment = os.getenv("DEPLOYMENT_NAME", os.getenv("AZURE_OPENAI_DEPLOYMENT", ""))
        if not deployment:
            raise ValueError("Azure OpenAI 需要配置 DEPLOYMENT_NAME 或 AZURE_OPENAI_DEPLOYMENT")

        messages = [
            {
                "role": "system",
                "content": [
                    {"type": "text", "text": system_prompt}
                ]
            },
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": user_prompt}
                ]
            }
        ]

        response = client.chat.completions.create(
            model=deployment,
            messages=messages,
            max_tokens=2048,
            temperature=0.7,
            top_p=0.95,
            frequency_penalty=0,
            presence_penalty=0,
            stop=None,
            stream=False,
            timeout=LLM_TIMEOUT_SEC
        )
        llm_text = response.choices[0].message.content

        logger.info(f"LLM返回文本长度: {len(llm_text)}; 预览: {safe_preview(llm_text)}")
        parsed = _parse_llm_json(llm_text)

        # 兜底填充与类型规整
        extracted = {
            "name": parsed.get("name") or "",
            "email": parsed.get("email") or "",
            "phone": parsed.get("phone") or "",
            "experience": parsed.get("experience") or "",
            "education": parsed.get("education") or "",
            "skills": parsed.get("skills") or [],
            "achievements": parsed.get("achievements") or [],
            "projects": parsed.get("projects") or [],
            "languages": parsed.get("languages") or [],
            "certifications": parsed.get("certifications") or [],
            "summary": parsed.get("summary") or "",
        }
        logger.info("LLM信息提取成功")
        return extracted
    except Exception as e:
        logger.error(f"LLM调用失败，回退本地规则: {e}", exc_info=True)
        return _extract_with_local_rules(content)


def call_ai_for_gtv_assessment(extracted_info: Dict[str, Any], field: str) -> Dict[str, Any]:
    """使用LLM进行GTV资格评估"""
    logger.info(f"开始GTV资格评估，领域: {field}")
    
    client = _get_llm_client()
    if not client:
        logger.warning("未配置LLM客户端，使用默认GTV评估")
        return _get_default_gtv_assessment(extracted_info, field)
    
    try:
        
        # 构建评估提示
        system_prompt = """
你是英国 Global Talent Visa (GTV) 评估委员会的首席审核官，需要依据官方杰出人才标准，对候选人的背景进行全面、可执行的深度诊断。

请遵循以下原则：
1. 对教育、行业、工作经验、技术专长等分析段落必须写成 2-3 段中文或英文说明，给出具体事实、量化指标或案例并指出优势与风险。
2. 对行业影响力、公司贡献、行业地位分别给出 1-10 分评分，并解释评分依据。
3. 在优势与不足部分，明确证据来源、潜在风险、改进优先级与时间规划。
4. 在 GTV 路径分析中，对 Exceptional Talent / Promise 的可行性、所需补强材料及下一步行动做出判断。
5. 输出必须是 UTF-8 JSON，字段名与结构必须严格按照提供的模版，禁止输出额外文本或 Markdown 代码块。
""".strip()
        
        # 根据领域调整评估重点
        field_focus = {
            "digital-technology": "数字技术、人工智能、软件工程、技术创新",
            "arts-culture": "艺术创作、文化贡献、创意产业、文化影响力",
            "research-academia": "学术研究、科学发现、教育贡献、学术声誉"
        }
        
        field_description = field_focus.get(field, "综合领域")
        
        user_prompt = f"""
请基于以下申请人信息进行GTV资格评估：

申请人信息：
- 姓名: {extracted_info.get('name', 'N/A')}
- 教育背景: {extracted_info.get('education', 'N/A')}
- 工作经验: {extracted_info.get('experience', 'N/A')}
- 技能专长: {', '.join(extracted_info.get('skills', []))}
- 主要成就: {', '.join(extracted_info.get('achievements', []))}
- 项目经验: {', '.join(extracted_info.get('projects', []))}
- 认证资质: {', '.join(extracted_info.get('certifications', []))}
- 个人总结: {extracted_info.get('summary', 'N/A')}

评估领域: {field_description}

请返回以下结构的JSON评估结果：
{{
  "applicantInfo": {{
    "name": "申请人姓名",
    "field": "申请领域",
    "currentPosition": "当前职位",
    "company": "当前公司",
    "yearsOfExperience": "工作经验年数"
  }},
  "educationBackground": {{
    "degrees": ["学位列表"],
    "institutions": ["学校列表"],
    "analysis": "教育背景分析（至少两段，说明学术优势与补强点）"
  }},
  "industryBackground": {{
    "sector": "行业领域",
    "yearsInIndustry": "行业经验年数",
    "keyCompanies": ["关键公司列表"],
    "industryImpact": "行业影响力评分(1-10)",
    "analysis": "行业背景分析（阐述行业深度、影响范围及指标）"
  }},
  "workExperience": {{
    "positions": ["职位列表"],
    "keyAchievements": ["关键成就列表"],
    "leadershipRoles": ["领导角色列表"],
    "projectImpact": ["项目影响列表"],
    "analysis": "工作经验分析（突出领导力、成果数据与不足）"
  }},
  "technicalExpertise": {{
    "coreSkills": ["核心技能列表"],
    "specializations": ["专业领域列表"],
    "innovations": ["创新成果列表"],
    "industryRecognition": ["行业认可列表"],
    "analysis": "技术专长分析（强调技术深度、创新性与应用场景）"
  }},
  "industryAnalysis": {{
    "industryImpact": "行业影响力评分(1-10)",
    "sector": "细分行业描述",
    "marketPosition": "市场地位/竞争格局",
    "analysis": "行业影响力综合评估（给出指标、案例和潜在风险）"
  }},
  "companyContribution": {{
    "impact": "业务影响评分(1-10)",
    "achievements": ["推动业绩的关键成果"],
    "innovations": ["产品/流程创新或制度建设"],
    "analysis": "对所在公司的贡献分析（描述增长数据、团队影响与可复制性）"
  }},
  "industryStatus": {{
    "status": "行业地位评分(1-10)",
    "awards": ["奖项、媒体报道、评委经历"],
    "analysis": "行业声誉分析（媒体曝光、评审经历、同行认可）"
  }},
  "gtvPathway": {{
    "recommendedRoute": "推荐路径(Exceptional Talent/Exceptional Promise)",
    "eligibilityLevel": "资格等级(Strong/Good/Weak)",
    "yearsOfExperience": "相关经验年数",
    "analysis": "GTV路径分析（说明理由、差距与补强建议）"
  }},
  "strengths": [
    {{
      "area": "优势领域",
      "description": "优势描述",
      "evidence": "证据支撑（包含量化指标或案例）",
      "gtvRelevance": "与GTV评审标准的对应关系"
    }}
  ],
  "weaknesses": [
    {{
      "area": "需要改进的领域",
      "description": "问题根因说明",
      "improvement": "具体可执行的改进方案",
      "priority": "优先级(High/Medium/Low)",
      "timeframe": "预计完成时间（例如3个月内）"
    }}
  ],
  "criteriaAssessment": [
    {{
      "name": "评估标准名称",
      "status": "状态(Met/Partially Met/Not Met)",
      "score": "评分(0-100)",
      "evidence": "评估证据",
      "recommendations": "针对该标准的补强建议",
      "officialRequirement": "对应的官方要求或解释"
    }}
  ],
  "overallScore": "总体评分(0-100)",
  "recommendation": "申请建议（整体判断与定位）",
  "professionalAdvice": ["专家行动建议（句子形式）"],
  "timeline": "申请时间线（标注短期/中期行动）",
  "requiredDocuments": ["所需文档列表（含推荐信类型等）"],
  "estimatedBudget": {{
    "min": "最低预算",
    "max": "最高预算",
    "currency": "货币单位"
  }}
}}
"""

        deployment = os.getenv("DEPLOYMENT_NAME", os.getenv("AZURE_OPENAI_DEPLOYMENT", ""))
        if not deployment:
            raise ValueError("Azure OpenAI 需要配置 DEPLOYMENT_NAME 或 AZURE_OPENAI_DEPLOYMENT")

        messages = [
            {
                "role": "system",
                "content": [
                    {"type": "text", "text": system_prompt}
                ]
            },
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": user_prompt}
                ]
            }
        ]

        response = client.chat.completions.create(
            model=deployment,
            messages=messages,
            max_tokens=4096,
            temperature=0.7,
            top_p=0.95,
            frequency_penalty=0,
            presence_penalty=0,
            stop=None,
            stream=False,
            timeout=LLM_TIMEOUT_SEC
        )
        llm_text = response.choices[0].message.content

        logger.info(f"GTV评估LLM返回文本长度: {len(llm_text)}; 预览: {safe_preview(llm_text)}")
        logger.info(f"GTV评估LLM返回文本: {llm_text}")

        parsed = _parse_llm_json(llm_text)
        
        logger.info("GTV资格评估成功")
        return parsed
        
    except Exception as e:
        logger.error(f"GTV评估LLM调用失败，使用默认评估: {e}", exc_info=True)
        return _get_default_gtv_assessment(extracted_info, field)


def _get_default_gtv_assessment(extracted_info: Dict[str, Any], field: str) -> Dict[str, Any]:
    """默认GTV评估（当LLM不可用时）"""
    logger.info("使用默认GTV评估")
    
    field_mapping = {
        "digital-technology": "Digital Technology",
        "arts-culture": "Arts & Culture", 
        "research-academia": "Research & Academia"
    }
    
    name = extracted_info.get("name") or "该申请人"
    education = extracted_info.get("education") or "暂无明确教育信息"
    experience = extracted_info.get("experience") or "暂无详细的工作经历描述"
    skills = extracted_info.get("skills") or []
    achievements = extracted_info.get("achievements") or []
    projects = extracted_info.get("projects") or []
    certifications = extracted_info.get("certifications") or []

    skills_text = "、".join(skills[:5]) if skills else "核心技能尚待补充"
    achievements_text = "、".join(achievements[:3]) if achievements else "可补充具有说服力的业绩案例"
    projects_text = "、".join(projects[:3]) if projects else "需要补充代表性项目"

    industry_impact_score = min(9, 5 + len(achievements) // 2 + len(projects) // 2)
    company_impact_score = min(9, 5 + len(projects) // 2)
    industry_status_score = 5 if achievements else 4

    education_analysis = (
        f"{name} 的学历经历目前显示为 {education}。该背景为后续在 {field_mapping.get(field, 'Digital Technology')} 领域进一步证明学术基础提供了起点。"
        "建议整理毕业年份、排名/认证信息以及与目标领域相关的科研或课程项目，以便凸显学术深度。"
        "\n\n若拥有海外或顶尖院校经历、行业培训证书，请补充具体成果（如论文、专利、荣誉）。这将直接强化 Exceptional Talent/Promise 中关于学术或专业权威的佐证。"
    )

    industry_background_analysis = (
        f"根据已提供的经历描述，申请人在 {experience} 中积累了领域经验，目前行业定位仍需量化指标支持。"
        f"建议补充所在公司的规模、覆盖市场或用户量，以便评审理解其在行业中的深度参与。"
        "\n\n若具备跨区域、跨行业合作案例，请列出合作对象和业务影响指标；同时说明在产业链中的角色（如生态建设、标准制定贡献），以体现行业影响力。"
    )

    work_experience_analysis = (
        f"核心履历显示申请人负责/参与的项目包括：{projects_text}。需进一步明确个人角色、团队规模与量化成果，例如营收提升、用户增长、成本节约等。"
        "\n\n请梳理具备领导力的实例（如主导战略、建立团队、跨部门协调），并准备第三方背书或绩效评估报告，以支撑 GTV 对领导力与持续贡献的要求。"
    )

    tech_analysis = (
        f"技能图谱提到 {skills_text}，说明申请人具备相关技术能力。建议按『核心技术栈 + 场景化成果』整理案例，突出原创性或难以替代的技术积累。"
        "\n\n若存在开源贡献、专利、行业演讲或技术出版物，请列举链接及影响指标，以增强评审对技术深度与创新度的信任。"
    )

    gtv_pathway_analysis = (
        "当前材料尚不足以直判 Exceptional Talent。建议优先构建'领导力 + 国际影响力'的证据组合，"
        "例如：全球性奖项、跨国项目的核心贡献、顶级刊物/媒体报道、行业评审经历等。"
        "\n\n若目标是 Exceptional Promise，可重点强调近三年内高速成长的指标、创新成果的商业化落地，以及未来在英国建立业务或研究计划的可行性。"
    )

    industry_analysis_text = (
        f"从公开信息来看，申请人所在赛道为 {field_mapping.get(field, 'Digital Technology')}，影响力评分暂估为 {industry_impact_score}/10。"
        "需补充业务规模（GMV/ARR/用户数）或媒体引用次数，以量化行业覆盖度。"
        "\n\n请进一步说明在生态中的定位（如平台、供应链、技术标准），并提供行业专家或合作伙伴的第三方评价，强化其行业话语权。"
    )

    company_contribution_text = (
        f"候选人主导的项目 {projects_text}，为公司带来的核心成果尚需量化。"
        "建议整理关键指标（营收、成本、转化率等）以及团队贡献描述，"
        "并提供管理层推荐信或投资人证明，以支撑 {company_impact_score}/10 的业务影响评分。"
    )

    industry_status_text = (
        "目前资料中缺乏行业类荣誉或公开评审经历，暂给予 4/10 的行业地位评分。"
        "建议争取国际奖项、行业峰会演讲或顶级媒体报道，并记录获奖年份、主办方和影响范围，以快速提升权威度。"
    )

    strengths = []
    if skills:
        strengths.append({
            "area": "核心技术与技能结构",
            "description": f"掌握 {skills_text} 等技能，覆盖目标领域的关键技术栈。",
            "evidence": f"技能列表：{', '.join(skills)}",
            "gtvRelevance": "支撑 GTV 对创新能力与专业深度的评估"
        })
    if achievements:
        strengths.append({
            "area": "业务成果与影响",
            "description": f"已有 {achievements_text} 等成果，显示出一定的行业验证。",
            "evidence": f"关键成就：{', '.join(achievements)}",
            "gtvRelevance": "可用于证明持续贡献与行业影响力"
        })
    if not strengths:
        strengths.append({
            "area": "基础履历",
            "description": "具备与目标领域相关的经历，可作为后续补强的基础。",
            "evidence": "简历提供的教育与工作信息",
            "gtvRelevance": "为构建 GTV 申请的基本条件"
        })

    weaknesses = [
        {
            "area": "第三方权威认可",
            "description": "缺少国际奖项、行业背书或权威媒体报道，难以证明顶级影响力。",
            "improvement": "在未来 3-6 个月内争取行业大奖、受邀担任评委或在顶级媒体发布深度报道。",
            "priority": "High",
            "timeframe": "3-6个月"
        },
        {
            "area": "材料结构化程度",
            "description": "现有材料缺乏量化指标和第三方证明，证据链完整性不足。",
            "improvement": "整理业绩数据、团队规模、客户名单，并准备3封顶级推荐信。",
            "priority": "Medium",
            "timeframe": "1-3个月"
        }
    ]

    criteria_assessment = [
        {
            "name": "领导力 (Criterion 1)",
            "status": "Partially Met",
            "score": 55,
            "evidence": "已展示一定的项目负责经验，但缺少跨界领导或行业治理记录。",
            "recommendations": "补充团队规模、管理幅度、跨部门协作案例，以及领导层推荐信。",
            "officialRequirement": "需要证明在知名组织担任领导或关键决策角色。"
        },
        {
            "name": "对行业的杰出贡献 (Criterion 2)",
            "status": "Partially Met",
            "score": 60,
            "evidence": "存在若干项目成果，但缺乏国际化影响与可量化输出。",
            "recommendations": "准备项目商业指标、用户规模及业内引用数据，展示成果可复制性。",
            "officialRequirement": "需证明对行业产生重大影响的原创贡献。"
        },
        {
            "name": "媒体与公众认可 (Criterion 3)",
            "status": "Not Met",
            "score": 30,
            "evidence": "暂未看到顶级媒体报道或国际公开演讲记录。",
            "recommendations": "主动策划媒体曝光、参与国际峰会发表演讲，争取多语种报道。",
            "officialRequirement": "需要显著的媒体曝光或公共认可证据。"
        }
    ]

    recommendation_text = (
        "综合来看，申请人具备潜力，但当前材料更接近 Exceptional Promise 的基础。"
        "建议先完成第三方背书、量化业绩、国际媒体报道三大模块，再考虑提交 GTV 申请。"
    )

    professional_advice = [
        "建立证据矩阵：按照领导力、创新力、影响力分类收集案例和证明材料。",
        "尽快确定三位国际公认专家作为推荐人，准备结构化推荐信初稿。",
        "规划未来12个月在英国的业务或研究计划，形成商业或科研落地方案。"
    ]

    timeline_text = (
        "立即（0-3个月）：完成资料梳理、确定推荐人、量化业绩指标。\n"
        "短期（3-6个月）：争取行业奖项或高影响力演讲，启动媒体曝光与案例包装。\n"
        "中期（6-12个月）：准备正式背书材料、完善商业/科研计划，并评估是否递交申请。"
    )

    required_documents = [
        "3 封来自国际或行业权威的推荐信（含职位、合作关系、具体贡献）",
        "项目成果与业绩数据证明（营收、用户、影响力指标）",
        "媒体报道、奖项证书或评委邀请函的扫描件",
        "个人未来在英国的业务/科研计划书"
    ]
     
    return {
        "applicantInfo": {
            "name": extracted_info.get("name", "N/A"),
            "field": field_mapping.get(field, "Digital Technology"),
            "currentPosition": "待补充",
            "company": "待补充",
            "yearsOfExperience": "待补充"
        },
        "educationBackground": {
            "degrees": [education],
            "institutions": ["待补充"],
            "analysis": education_analysis
        },
        "industryBackground": {
            "sector": "待确定",
            "yearsInIndustry": "待确定",
            "keyCompanies": ["待确定"],
            "industryImpact": industry_impact_score,
            "analysis": industry_background_analysis
        },
        "workExperience": {
            "positions": [experience],
            "keyAchievements": achievements,
            "leadershipRoles": ["待补充"],
            "projectImpact": projects,
            "analysis": work_experience_analysis
        },
        "technicalExpertise": {
            "coreSkills": skills,
            "specializations": ["待补充"],
            "innovations": projects,
            "industryRecognition": achievements or certifications,
            "analysis": tech_analysis
        },
        "industryAnalysis": {
            "industryImpact": industry_impact_score,
            "sector": field_mapping.get(field, "Digital Technology"),
            "marketPosition": "待补充市场定位描述",
            "analysis": industry_analysis_text
        },
        "companyContribution": {
            "impact": company_impact_score,
            "achievements": achievements,
            "innovations": projects,
            "analysis": company_contribution_text
        },
        "industryStatus": {
            "status": industry_status_score,
            "awards": certifications or achievements,
            "analysis": industry_status_text
        },
        "gtvPathway": {
            "recommendedRoute": "待评估",
            "eligibilityLevel": "待评估",
            "yearsOfExperience": "待确定",
            "analysis": gtv_pathway_analysis
        },
        "strengths": strengths,
        "weaknesses": weaknesses,
        "criteriaAssessment": criteria_assessment,
        "overallScore": 58,
        "recommendation": recommendation_text,
        "professionalAdvice": professional_advice,
        "timeline": timeline_text,
        "requiredDocuments": required_documents,
        "estimatedBudget": {
            "min": 0,
            "max": 0,
            "currency": "GBP"
        }
    }

def _extract_with_local_rules(content: str) -> Dict[str, Any]:
    """本地规则信息提取（回退机制）"""
    logger.info("执行本地规则信息提取")
    try:
        lines = content.split('\n')
        logger.info(f"回退规则：将内容分割为 {len(lines)} 行进行处理")

        extracted_info = {
            "name": "",
            "email": "",
            "phone": "",
            "experience": "",
            "education": "",
            "skills": [],
            "achievements": [],
            "projects": [],
            "languages": [],
            "certifications": [],
            "summary": ""
        }

        processed_lines = 0
        for line_num, line in enumerate(lines, 1):
            line = line.strip()
            if not line:
                continue
            processed_lines += 1
            if not extracted_info["name"] and len(line) < 20 and not any(keyword in line.lower() for keyword in ['@', '电话', '邮箱', '技能', '经验', '教育']):
                extracted_info["name"] = line
            if '@' in line and 'email' not in line.lower():
                extracted_info["email"] = line
            if any(char.isdigit() for char in line) and ('电话' in line or '+' in line or '-' in line):
                extracted_info["phone"] = line
            if '技能' in line or 'skills' in line.lower():
                skills_text = line.replace('技能', '').replace('skills', '').replace(':', '').strip()
                if skills_text:
                    extracted_info["skills"] = [skill.strip() for skill in skills_text.split(',') if skill.strip()]
            if '成就' in line or 'achievements' in line.lower():
                achievements_text = line.replace('成就', '').replace('achievements', '').replace(':', '').strip()
                if achievements_text:
                    extracted_info["achievements"] = [ach.strip() for ach in achievements_text.split(',') if ach.strip()]

        # 简单段落提取
        experience_lines = []
        in_experience = False
        for line in lines:
            if '工作经验' in line or 'experience' in line.lower():
                in_experience = True
                continue
            elif in_experience and ('教育' in line or 'education' in line.lower() or '技能' in line or 'skills' in line.lower()):
                break
            elif in_experience and line:
                experience_lines.append(line)
        if experience_lines:
            extracted_info["experience"] = ' '.join(experience_lines)

        education_lines = []
        in_education = False
        for line in lines:
            if '教育' in line or 'education' in line.lower():
                in_education = True
                continue
            elif in_education and ('技能' in line or 'skills' in line.lower() or '成就' in line or 'achievements' in line.lower()):
                break
            elif in_education and line:
                education_lines.append(line)
        if education_lines:
            extracted_info["education"] = ' '.join(education_lines)

        logger.info("本地规则信息提取完成")
        return extracted_info
    except Exception as e:
        logger.error(f"本地规则提取失败: {e}", exc_info=True)
        return {}

def create_personal_knowledge_base(name: str, extracted_info: Dict[str, Any]) -> str:
    """为个人创建知识库"""
    logger.info(f"开始为 {name} 创建个人知识库")
    logger.info(f"提取的信息: {extracted_info}")
    
    try:
        # 创建个人知识库目录
        personal_dir = Path(f"personal_kb/{secure_filename(name)}")
        logger.info(f"创建个人知识库目录: {personal_dir}")
        personal_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"个人知识库目录创建成功")
        
        # 保存个人信息
        personal_info = {
            "name": name,
            "created_at": datetime.now().isoformat(),
            "last_updated": datetime.now().isoformat(),
            "extracted_info": extracted_info,
            "knowledge_bullets": []
        }
        logger.info(f"初始化个人信息结构")
        
        # 根据提取的信息创建知识条目
        knowledge_bullets = []
        logger.info("开始根据提取的信息创建知识条目")
        
        if extracted_info.get("experience"):
            bullet = {
                "id": f"{name}_exp_1",
                "section": "工作经验",
                "content": extracted_info["experience"],
                "helpful": True,
                "harmful": False,
                "metadata": {"source": "resume", "type": "experience"}
            }
            knowledge_bullets.append(bullet)
            logger.info(f"创建工作经验知识条目: {bullet['id']}")
            
        if extracted_info.get("education"):
            bullet = {
                "id": f"{name}_edu_1",
                "section": "教育背景",
                "content": extracted_info["education"],
                "helpful": True,
                "harmful": False,
                "metadata": {"source": "resume", "type": "education"}
            }
            knowledge_bullets.append(bullet)
            logger.info(f"创建教育背景知识条目: {bullet['id']}")
            
        if extracted_info.get("skills"):
            logger.info(f"创建技能知识条目，技能数量: {len(extracted_info['skills'])}")
            for i, skill in enumerate(extracted_info["skills"]):
                bullet = {
                    "id": f"{name}_skill_{i+1}",
                    "section": "技能专长",
                    "content": skill,
                    "helpful": True,
                    "harmful": False,
                    "metadata": {"source": "resume", "type": "skill"}
                }
                knowledge_bullets.append(bullet)
                logger.info(f"创建技能知识条目 {i+1}: {bullet['id']} - {skill}")
                
        if extracted_info.get("achievements"):
            logger.info(f"创建成就知识条目，成就数量: {len(extracted_info['achievements'])}")
            for i, achievement in enumerate(extracted_info["achievements"]):
                bullet = {
                    "id": f"{name}_ach_{i+1}",
                    "section": "成就荣誉",
                    "content": achievement,
                    "helpful": True,
                    "harmful": False,
                    "metadata": {"source": "resume", "type": "achievement"}
                }
                knowledge_bullets.append(bullet)
                logger.info(f"创建成就知识条目 {i+1}: {bullet['id']} - {achievement}")
        
        personal_info["knowledge_bullets"] = knowledge_bullets
        logger.info(f"知识条目创建完成，总计 {len(knowledge_bullets)} 个条目")
        
        # 保存到文件
        personal_file = personal_dir / "personal_info.json"
        logger.info(f"保存个人知识库到文件: {personal_file}")
        with open(personal_file, 'w', encoding='utf-8') as f:
            json.dump(personal_info, f, ensure_ascii=False, indent=2)
        logger.info(f"个人知识库文件保存成功")
            
        logger.info(f"为 {name} 创建了个人知识库，包含 {len(knowledge_bullets)} 个知识条目")
        return str(personal_dir)
        
    except Exception as e:
        logger.error(f"创建个人知识库失败: {e}", exc_info=True)
        return ""

def update_main_knowledge_base(personal_kb_path: str, name: str) -> bool:
    """将个人知识库更新到主知识库"""
    logger.info(f"开始更新主知识库，个人知识库路径: {personal_kb_path}, 姓名: {name}")
    
    try:
        # 读取个人知识库
        personal_file = Path(personal_kb_path) / "personal_info.json"
        logger.info(f"读取个人知识库文件: {personal_file}")
        
        if not personal_file.exists():
            logger.error(f"个人知识库文件不存在: {personal_file}")
            return False
            
        with open(personal_file, 'r', encoding='utf-8') as f:
            personal_info = json.load(f)
        logger.info(f"个人知识库文件读取成功，包含 {len(personal_info.get('knowledge_bullets', []))} 个知识条目")
            
        # 读取主知识库
        main_kb_file = Path("data/playbook.json")
        logger.info(f"读取主知识库文件: {main_kb_file}")
        
        if main_kb_file.exists():
            with open(main_kb_file, 'r', encoding='utf-8') as f:
                main_kb = json.load(f)
            logger.info(f"主知识库文件读取成功，当前包含 {len(main_kb.get('bullets', {}))} 个条目")
        else:
            main_kb = {"bullets": {}}
            logger.info("主知识库文件不存在，创建新的知识库结构")
            
        # 确保bullets是字典类型
        if not isinstance(main_kb.get("bullets"), dict):
            main_kb["bullets"] = {}
            logger.info("确保bullets字段为字典类型")
            
        # 确保sections字段存在
        if "sections" not in main_kb:
            main_kb["sections"] = {}
            logger.info("添加sections字段到主知识库")
            
        # 添加个人知识条目到主知识库
        logger.info(f"开始添加 {len(personal_info['knowledge_bullets'])} 个个人知识条目到主知识库")
        
        for i, bullet in enumerate(personal_info["knowledge_bullets"], 1):
            logger.info(f"处理知识条目 {i}/{len(personal_info['knowledge_bullets'])}: {bullet['id']}")
            
            # 创建兼容ACE框架的bullet数据，移除metadata字段
            ace_bullet = {
                "id": bullet["id"],
                "section": bullet["section"],
                "content": bullet["content"],
                "helpful": bullet["helpful"],
                "harmful": bullet["harmful"],
                "neutral": bullet.get("neutral", 0),
                "created_at": bullet.get("created_at", datetime.now().isoformat()),
                "updated_at": bullet.get("updated_at", datetime.now().isoformat())
            }
            logger.info(f"创建ACE兼容的bullet数据: {ace_bullet['id']}")
            
            # 直接使用id作为键添加到字典中
            main_kb["bullets"][bullet["id"]] = ace_bullet
            logger.info(f"添加bullet到主知识库: {bullet['id']}")
            
            # 同时更新sections字段
            section = bullet["section"]
            if section not in main_kb["sections"]:
                main_kb["sections"][section] = []
                logger.info(f"创建新的section: {section}")
            if bullet["id"] not in main_kb["sections"][section]:
                main_kb["sections"][section].append(bullet["id"])
                logger.info(f"添加bullet到section {section}: {bullet['id']}")
                
        logger.info(f"所有个人知识条目已添加到主知识库")
        logger.info(f"更新后的主知识库包含 {len(main_kb['bullets'])} 个条目")
        logger.info(f"更新后的sections: {list(main_kb['sections'].keys())}")
                
        # 保存更新后的主知识库
        logger.info(f"保存更新后的主知识库到文件: {main_kb_file}")
        with open(main_kb_file, 'w', encoding='utf-8') as f:
            json.dump(main_kb, f, ensure_ascii=False, indent=2)
        logger.info(f"主知识库文件保存成功")
            
        logger.info(f"已将 {name} 的个人知识库更新到主知识库")
        return True
        
    except Exception as e:
        logger.error(f"更新主知识库失败: {e}", exc_info=True)
        return False

@app.route('/health', methods=['GET'])
def health_check():
    """健康检查"""
    return jsonify({"status": "healthy", "service": "resume_processor"})

@app.route('/api/resume/upload', methods=['POST'])
def upload_resume():
    """处理简历上传"""
    request_id = datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:-3]  # 生成请求ID
    logger.info(f"[{request_id}] 开始处理简历上传请求")
    
    try:
        # 记录请求信息
        logger.info(f"[{request_id}] 请求来源: {request.remote_addr}")
        logger.info(f"[{request_id}] 请求头: {dict(request.headers)}")
        
        # 获取表单数据
        form_name = request.form.get('name', '').strip()
        form_email = request.form.get('email', '').strip()
        form_field = request.form.get('field', 'digital-technology').strip()
        form_additional_info = request.form.get('additionalInfo', '').strip()
        
        logger.info(f"[{request_id}] 表单数据 - 姓名: {form_name}, 邮箱: {form_email}, 领域: {form_field}")
        
        # 检查文件是否存在
        if 'resume' not in request.files:
            logger.error(f"[{request_id}] 错误: 没有上传文件")
            return jsonify({"success": False, "error": "没有上传文件"}), 400
            
        file = request.files['resume']
        if file.filename == '':
            logger.error(f"[{request_id}] 错误: 没有选择文件")
            return jsonify({"success": False, "error": "没有选择文件"}), 400
            
        logger.info(f"[{request_id}] 上传文件名: {file.filename}")
        logger.info(f"[{request_id}] 文件大小: {file.content_length} bytes")
        logger.info(f"[{request_id}] 文件类型: {file.content_type}")
        
        # 检查文件类型
        if not allowed_file(file.filename):
            logger.error(f"[{request_id}] 错误: 不支持的文件类型 {file.filename}")
            return jsonify({"success": False, "error": "不支持的文件类型"}), 400
            
        logger.info(f"[{request_id}] 文件类型检查通过")
        
        # 保存文件
        filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{timestamp}_{filename}"
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        # 再次确保目录存在
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        
        logger.info(f"[{request_id}] 保存文件到: {file_path}")
        file.save(file_path)
        logger.info(f"[{request_id}] 文件保存成功")
        
        # 提取文本内容
        logger.info(f"[{request_id}] 开始提取文件文本内容")
        content = extract_text_from_file(file_path)
        if not content:
            logger.error(f"[{request_id}] 错误: 无法读取文件内容")
            return jsonify({"success": False, "error": "无法读取文件内容"}), 400
            
        logger.info(f"[{request_id}] 文本提取成功，内容长度: {len(content)} 字符")
        logger.debug(f"[{request_id}] 提取的文本内容预览: {content[:200]}...")
            
        # 使用AI提取信息
        logger.info(f"[{request_id}] 开始AI信息提取")
        extracted_info = call_ai_for_extraction(content)
        if not extracted_info:
            logger.error(f"[{request_id}] 错误: AI信息提取失败")
            return jsonify({"success": False, "error": "信息提取失败"}), 500
            
        logger.info(f"[{request_id}] AI信息提取成功")
        logger.info(f"[{request_id}] 提取的信息: {extracted_info}")
        
        # 优先使用表单中的姓名，如果表单姓名为空则使用AI提取的姓名
        ai_name = extracted_info.get("name", "").strip()
        final_name = form_name if form_name else ai_name
        if not final_name:
            final_name = "未知用户"
            
        logger.info(f"[{request_id}] 最终使用的姓名: {final_name} (表单: {form_name}, AI提取: {ai_name})")
        
        # 如果表单提供了邮箱，也更新到提取信息中
        if form_email:
            extracted_info["email"] = form_email
            logger.info(f"[{request_id}] 使用表单邮箱: {form_email}")
        
        # 创建个人知识库
        logger.info(f"[{request_id}] 开始创建个人知识库")
        personal_kb_path = create_personal_knowledge_base(final_name, extracted_info)
        if not personal_kb_path:
            logger.error(f"[{request_id}] 错误: 创建个人知识库失败")
            return jsonify({"success": False, "error": "创建个人知识库失败"}), 500
            
        logger.info(f"[{request_id}] 个人知识库创建成功: {personal_kb_path}")
            
        # 更新主知识库
        logger.info(f"[{request_id}] 开始更新主知识库，个人知识库路径: {personal_kb_path}")
        update_result = update_main_knowledge_base(personal_kb_path, final_name)
        logger.info(f"[{request_id}] 主知识库更新结果: {update_result}")
        
        # 清理临时文件
        try:
            os.remove(file_path)
            logger.info(f"[{request_id}] 临时文件清理成功: {file_path}")
        except Exception as cleanup_error:
            logger.warning(f"[{request_id}] 临时文件清理失败: {cleanup_error}")
            
        logger.info(f"[{request_id}] 简历上传处理完成")
        return jsonify({
            "success": True,
            "analysis": extracted_info,
            "personal_kb_path": personal_kb_path,
            "message": f"简历分析完成，已为 {final_name} 创建个人知识库"
        })
        
    except Exception as e:
        logger.error(f"[{request_id}] 简历上传处理失败: {e}", exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/resume/gtv-assessment', methods=['POST'])
def gtv_assessment():
    """GTV资格评估"""
    request_id = datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:-3]  # 生成请求ID
    logger.info(f"[{request_id}] 开始GTV资格评估请求")
    
    try:
        # 获取请求数据
        data = request.get_json()
        if not data:
            logger.error(f"[{request_id}] 错误: 没有提供评估数据")
            return jsonify({"success": False, "error": "没有提供评估数据"}), 400
            
        # 提取必要参数
        extracted_info = data.get('extracted_info', {})
        field = data.get('field', 'digital-technology')
        form_name = data.get('name', '').strip()
        form_email = data.get('email', '').strip()
        
        # 优先使用表单中的姓名，如果表单姓名为空则使用AI提取的姓名
        ai_name = extracted_info.get("name", "").strip()
        final_name = form_name if form_name else ai_name
        if not final_name:
            final_name = "未知用户"
            
        logger.info(f"[{request_id}] 评估参数 - 最终姓名: {final_name} (表单: {form_name}, AI提取: {ai_name}), 邮箱: {form_email}, 领域: {field}")
        logger.info(f"[{request_id}] 提取的信息: {extracted_info}")
        
        # 如果表单提供了姓名，更新到提取信息中
        if form_name:
            extracted_info["name"] = form_name
            logger.info(f"[{request_id}] 使用表单姓名更新提取信息: {form_name}")
        
        # 如果表单提供了邮箱，也更新到提取信息中
        if form_email:
            extracted_info["email"] = form_email
            logger.info(f"[{request_id}] 使用表单邮箱更新提取信息: {form_email}")
        
        # 使用AI进行GTV评估
        logger.info(f"[{request_id}] 开始AI GTV评估")
        gtv_analysis = call_ai_for_gtv_assessment(extracted_info, field)
        
        logger.info(f"[{request_id}] GTV评估完成")
        logger.info(f"[{request_id}] 评估结果预览: {safe_preview(str(gtv_analysis))}")
        
        # 评估完成后自动生成PDF
        pdf_file_path = None
        pdf_filename = None
        try:
            logger.info(f"[{request_id}] 开始自动生成PDF报告...")
            if generate_gtv_pdf_report:
                pdf_file_path = generate_gtv_pdf_report(gtv_analysis)
                pdf_filename = os.path.basename(pdf_file_path)
                logger.info(f"[{request_id}] PDF报告自动生成成功: {pdf_filename}")
            else:
                logger.warning(f"[{request_id}] PDF报告生成器未安装，跳过自动生成")
        except Exception as pdf_error:
            logger.error(f"[{request_id}] 自动生成PDF报告失败: {pdf_error}")
            # PDF生成失败不影响评估结果返回
        
        # 构建响应数据
        response_data = {
            "success": True,
            "gtvAnalysis": gtv_analysis,
            "message": f"GTV资格评估完成"
        }
        
        # 如果PDF生成成功，添加到响应中
        if pdf_file_path and pdf_filename:
            response_data["pdf_file_path"] = pdf_file_path
            response_data["pdf_filename"] = pdf_filename
            response_data["message"] = f"GTV资格评估完成，PDF报告已自动生成"
        
        return jsonify(response_data)
        
    except Exception as e:
        logger.error(f"[{request_id}] GTV评估失败: {e}", exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/resume/personal/<name>', methods=['GET'])
def get_personal_kb(name):
    """获取个人知识库"""
    try:
        personal_file = Path(f"personal_kb/{secure_filename(name)}/personal_info.json")
        if not personal_file.exists():
            return jsonify({"success": False, "error": "个人知识库不存在"}), 404
            
        with open(personal_file, 'r', encoding='utf-8') as f:
            personal_info = json.load(f)
            
        return jsonify({
            "success": True,
            "personal_info": personal_info
        })
        
    except Exception as e:
        logger.error(f"获取个人知识库失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/resume/list', methods=['GET'])
def list_personal_kbs():
    """列出所有个人知识库"""
    try:
        personal_dir = Path("personal_kb")
        if not personal_dir.exists():
            return jsonify({"success": True, "personal_kbs": []})
            
        personal_kbs = []
        for kb_dir in personal_dir.iterdir():
            if kb_dir.is_dir():
                personal_file = kb_dir / "personal_info.json"
                if personal_file.exists():
                    with open(personal_file, 'r', encoding='utf-8') as f:
                        personal_info = json.load(f)
                        personal_kbs.append({
                            "name": personal_info["name"],
                            "created_at": personal_info["created_at"],
                            "last_updated": personal_info["last_updated"],
                            "knowledge_count": len(personal_info["knowledge_bullets"])
                        })
                        
        return jsonify({
            "success": True,
            "personal_kbs": personal_kbs
        })
        
    except Exception as e:
        logger.error(f"列出个人知识库失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/resume/generate-pdf', methods=['POST'])
def generate_pdf_report():
    """生成PDF评估报告"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                "success": False,
                "error": "请求数据不能为空"
            }), 400
        
        if not generate_gtv_pdf_report:
            return jsonify({
                "success": False,
                "error": "PDF报告生成器未安装"
            }), 500
        
        # 检查是否提供了评估ID
        assessment_id = data.get('assessment_id')
        markdown_filepath = None  # 初始化变量
        
        if assessment_id and load_assessment_from_database:
            # 如果提供了评估ID，从数据库加载数据生成PDF
            logger.info(f"从数据库加载评估数据生成PDF: {assessment_id}")
            try:
                assessment_data = load_assessment_from_database(assessment_id)
                if not assessment_data:
                    return jsonify({
                        "success": False,
                        "error": f"未找到评估ID: {assessment_id}"
                    }), 404
                
                output_path = generate_gtv_pdf_report(assessment_data)
                logger.info(f"从数据库数据生成PDF成功: {output_path}")
            except Exception as e:
                logger.error(f"从数据库生成PDF失败: {e}")
                return jsonify({
                    "success": False,
                    "error": f"从数据库生成PDF失败: {str(e)}"
                }), 500
        else:
            # 如果没有提供评估ID，检查是否有Markdown文件路径
            markdown_filepath = data.get('markdown_filepath')
            
            if markdown_filepath and os.path.exists(markdown_filepath):
                # 如果提供了Markdown文件路径且文件存在，从Markdown文件生成PDF
                logger.info(f"从Markdown文件生成PDF: {markdown_filepath}")
                try:
                    from pdf_report_generator import GTVPDFReportGenerator
                    generator = GTVPDFReportGenerator()
                    output_path = generator.generate_report_from_markdown(markdown_filepath)
                except Exception as e:
                    logger.error(f"从Markdown文件生成PDF失败: {e}")
                    return jsonify({
                        "success": False,
                        "error": f"从Markdown文件生成PDF失败: {str(e)}"
                    }), 500
            else:
                # 如果都没有提供，先保存到数据库，然后生成PDF
                logger.info("未提供评估ID或Markdown文件路径，先保存到数据库")
                if save_assessment_to_database:
                    try:
                        assessment_id = save_assessment_to_database(data)
                        logger.info(f"评估结果已保存到数据库: {assessment_id}")
                        # 从数据库重新加载数据生成PDF
                        assessment_data = load_assessment_from_database(assessment_id)
                        output_path = generate_gtv_pdf_report(assessment_data)
                    except Exception as e:
                        logger.warning(f"保存到数据库失败: {e}")
                        # 回退到直接生成PDF
                        output_path = generate_gtv_pdf_report(data)
                else:
                    # 直接生成PDF
                    output_path = generate_gtv_pdf_report(data)
        
        # 检查文件是否生成成功
        if os.path.exists(output_path):
            response_data = {
                "success": True,
                "message": "PDF报告生成成功",
                "file_path": output_path,
                "file_name": os.path.basename(output_path)
            }
            
            # 如果使用了评估ID，返回评估ID
            if assessment_id:
                response_data["assessment_id"] = assessment_id
            
            # 如果Markdown文件存在，也返回其路径（向后兼容）
            if markdown_filepath and os.path.exists(markdown_filepath):
                response_data["markdown_filepath"] = markdown_filepath
                response_data["markdown_filename"] = os.path.basename(markdown_filepath)
            
            return jsonify(response_data)
        else:
            return jsonify({
                "success": False,
                "error": "PDF文件生成失败"
            }), 500
            
    except Exception as e:
        logger.error(f"生成PDF报告失败: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/resume/download-pdf/<path:filename>', methods=['GET'])
def download_pdf_report(filename):
    """下载PDF报告"""
    try:
        # 解码URL编码的文件名
        import urllib.parse
        decoded_filename = urllib.parse.unquote(filename)
        
        # 确保文件名安全
        safe_filename = secure_filename(decoded_filename)
        file_path = os.path.join('reports', safe_filename)
        
        logger.info(f"尝试下载文件: {file_path}")
        
        if not os.path.exists(file_path):
            logger.error(f"文件不存在: {file_path}")
            return jsonify({
                "success": False,
                "error": "文件不存在"
            }), 404
        
        # 返回文件
        from flask import send_file
        return send_file(
            file_path,
            as_attachment=True,
            download_name=safe_filename,
            mimetype='application/pdf'
        )
        
    except Exception as e:
        logger.error(f"下载PDF报告失败: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/resume/generate-pdf-from-markdown', methods=['POST'])
def generate_pdf_from_markdown():
    """从Markdown文件生成PDF报告"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                "success": False,
                "error": "请求数据不能为空"
            }), 400
        
        markdown_filepath = data.get('markdown_filepath')
        if not markdown_filepath:
            return jsonify({
                "success": False,
                "error": "Markdown文件路径不能为空"
            }), 400
        
        if not generate_gtv_pdf_report:
            return jsonify({
                "success": False,
                "error": "PDF报告生成器未安装"
            }), 500
        
        # 检查Markdown文件是否存在
        if not os.path.exists(markdown_filepath):
            return jsonify({
                "success": False,
                "error": f"Markdown文件不存在: {markdown_filepath}"
            }), 404
        
        # 从Markdown文件生成PDF报告
        from pdf_report_generator import GTVPDFReportGenerator
        generator = GTVPDFReportGenerator()
        output_path = generator.generate_report_from_markdown(markdown_filepath)
        
        # 检查文件是否生成成功
        if os.path.exists(output_path):
            return jsonify({
                "success": True,
                "message": "PDF报告生成成功",
                "file_path": output_path,
                "file_name": os.path.basename(output_path)
            })
        else:
            return jsonify({
                "success": False,
                "error": "PDF文件生成失败"
            }), 500
            
    except Exception as e:
        logger.error(f"从Markdown生成PDF报告失败: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/resume/list-assessments', methods=['GET'])
def list_assessments():
    """列出所有评估结果"""
    try:
        if not list_all_assessments:
            return jsonify({
                "success": False,
                "error": "数据库管理器未安装"
            }), 500
        
        # 从数据库获取评估列表
        assessments = list_all_assessments()
        
        return jsonify({
            "success": True,
            "assessments": assessments
        })
        
    except Exception as e:
        logger.error(f"列出评估结果失败: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/resume/get-assessment/<assessment_id>', methods=['GET'])
def get_assessment(assessment_id):
    """获取指定评估ID的详细结果"""
    try:
        if not load_assessment_from_database:
            return jsonify({
                "success": False,
                "error": "数据库管理器未安装"
            }), 500
        
        assessment_data = load_assessment_from_database(assessment_id)
        if not assessment_data:
            return jsonify({
                "success": False,
                "error": f"未找到评估ID: {assessment_id}"
            }), 404
        
        return jsonify({
            "success": True,
            "assessment": assessment_data
        })
        
    except Exception as e:
        logger.error(f"获取评估结果失败: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/resume/delete-assessment/<assessment_id>', methods=['DELETE'])
def delete_assessment(assessment_id):
    """删除指定评估ID的结果"""
    try:
        from assessment_database import assessment_db
        
        success = assessment_db.delete_assessment(assessment_id)
        if success:
            return jsonify({
                "success": True,
                "message": f"评估结果 {assessment_id} 已删除"
            })
        else:
            return jsonify({
                "success": False,
                "error": f"删除评估结果 {assessment_id} 失败"
            }), 500
        
    except Exception as e:
        logger.error(f"删除评估结果失败: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

if __name__ == '__main__':
    import socket
    # 获取本地IP地址
    hostname = socket.gethostname()
    local_ip = socket.gethostbyname(hostname)

    logger.info("🚀 启动简历处理服务...")
    logger.info(f"📡 API地址: http://{local_ip}:5002")
    logger.info(f"🔗 健康检查: http://{local_ip}:5002/health")
    logger.info(f"📄 简历上传: http://{local_ip}:5002/api/resume/upload")
    logger.info(f"📚 个人知识库: http://{local_ip}:5002/api/resume/personal/<name>")
    logger.info(f"📊 PDF报告生成: http://{local_ip}:5002/api/resume/generate-pdf")
    logger.info(f"📥 PDF报告下载: http://{local_ip}:5002/api/resume/download-pdf/<filename>")
    logger.info(f"📝 从Markdown生成PDF: http://{local_ip}:5002/api/resume/generate-pdf-from-markdown")
    logger.info(f"📋 列出评估结果: http://{local_ip}:5002/api/resume/list-assessments")
    logger.info(f"🔍 获取评估详情: http://{local_ip}:5002/api/resume/get-assessment/<assessment_id>")
    logger.info(f"🗑️ 删除评估结果: http://{local_ip}:5002/api/resume/delete-assessment/<assessment_id>")

    app.run(host='0.0.0.0', port=5002, debug=True)
