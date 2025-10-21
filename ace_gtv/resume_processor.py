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
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
from openai import OpenAI
from anthropic import Anthropic

# 可选依赖的占位导入（在运行环境安装后启用）
try:
    from pdfminer.high_level import extract_text as pdf_extract_text
except Exception:
    pdf_extract_text = None  # type: ignore

try:
    import docx  # python-docx
except Exception:
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
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

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
    """获取配置的LLM客户端实例。"""
    # 兼容性处理：支持AI_PROVIDER和LLM_PROVIDER两种配置方式
    ai_provider = os.getenv("AI_PROVIDER", "").lower()
    llm_provider = os.getenv("LLM_PROVIDER", "").upper()
    
    if ai_provider:
        # 优先使用AI_PROVIDER的值，覆盖LLM_PROVIDER
        if ai_provider == "openai":
            os.environ["LLM_PROVIDER"] = "OPENAI"
        elif ai_provider == "azure":
            os.environ["LLM_PROVIDER"] = "AZURE"
        elif ai_provider == "anthropic":
            os.environ["LLM_PROVIDER"] = "ANTHROPIC"
        print(f"🔄 使用AI_PROVIDER={ai_provider} -> LLM_PROVIDER={os.environ['LLM_PROVIDER']}")
    
    # 兼容性处理：支持AZURE_API_KEY和AZURE_OPENAI_API_KEY
    azure_api_key = os.getenv("AZURE_API_KEY")
    azure_openai_api_key = os.getenv("AZURE_OPENAI_API_KEY")
    if azure_api_key and not azure_openai_api_key:
        os.environ["AZURE_OPENAI_API_KEY"] = azure_api_key
        logger.info("自动映射AZURE_API_KEY -> AZURE_OPENAI_API_KEY")
    
    # 兼容性处理：支持AZURE_OPENAI_DEPLOYMENT_NAME和AZURE_OPENAI_DEPLOYMENT
    azure_deployment_name = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME")
    azure_deployment = os.getenv("AZURE_OPENAI_DEPLOYMENT")
    if azure_deployment_name and not azure_deployment:
        os.environ["AZURE_OPENAI_DEPLOYMENT"] = azure_deployment_name
        logger.info(f"自动映射AZURE_OPENAI_DEPLOYMENT_NAME -> AZURE_OPENAI_DEPLOYMENT")
    
    provider = os.getenv("LLM_PROVIDER", "OPENAI").upper()
    
    if provider == "OPENAI":
        api_key = os.getenv("OPENAI_API_KEY")
        base_url = os.getenv("OPENAI_API_BASE", "https://api.openai.com/v1")
        if not api_key:
            logger.warning("未配置OPENAI_API_KEY，跳过LLM提取")
            return None
        return OpenAI(api_key=api_key, base_url=base_url)
    
    elif provider == "AZURE":
        endpoint = os.getenv("AZURE_OPENAI_ENDPOINT", "").rstrip("/")
        api_key = os.getenv("AZURE_OPENAI_API_KEY", "")
        api_version = os.getenv("AZURE_OPENAI_API_VERSION", "2024-02-15-preview")
        if not (endpoint and api_key):
            logger.warning("未配置Azure OpenAI参数，跳过LLM提取")
            return None
        return OpenAI(
            api_key=api_key,
            base_url=f"{endpoint}/openai/deployments/{os.getenv('AZURE_OPENAI_DEPLOYMENT', '')}",
            default_query={"api-version": api_version}
        )
    
    elif provider == "ANTHROPIC":
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            logger.warning("未配置ANTHROPIC_API_KEY，跳过LLM提取")
            return None
        return Anthropic(api_key=api_key)
    
    else:
        logger.warning(f"不支持的LLM提供商: {provider}")
        return None


def _parse_llm_json(text: str) -> Dict[str, Any]:
    cleaned = text.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    if cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    try:
        return json.loads(cleaned)
    except Exception as e:
        logger.error(f"LLM JSON解析失败: {e}; 预览: {safe_preview(cleaned)}")
        raise


def call_ai_for_extraction(content: str) -> Dict[str, Any]:
    """优先调用LLM进行信息提取；失败则回退本地规则。"""
    logger.info(f"开始AI信息提取，输入内容长度: {len(content)} 字符")
    
    client = _get_llm_client()
    if not client:
        logger.info("未配置LLM客户端，回退到本地规则提取")
        return _extract_with_local_rules(content)
    
    try:
        provider = os.getenv("LLM_PROVIDER", "OPENAI").upper()
        logger.info(f"调用LLM提供商: {provider}")
        
        system_prompt = (
            "你是资深签证顾问，请从简历全文中提炼结构化信息。"
            "严格返回JSON对象，不要包含多余说明或Markdown围栏。"
        )
        user_prompt = (
            "请从以下简历内容中提取: name, email, phone, experience(连续文本),"
            "education(连续文本), skills(数组), achievements(数组), projects(数组),"
            "languages(数组), certifications(数组), summary(摘要)。\n\n简历全文:\n" + content
        )

        if provider in ["OPENAI", "AZURE"]:
            # 使用OpenAI客户端
            model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
            if provider == "AZURE":
                deployment = os.getenv("AZURE_OPENAI_DEPLOYMENT", "")
                if not deployment:
                    raise ValueError("Azure OpenAI需要配置AZURE_OPENAI_DEPLOYMENT")
                model = deployment
            
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.2,
                timeout=LLM_TIMEOUT_SEC
            )
            llm_text = response.choices[0].message.content
            
        elif provider == "ANTHROPIC":
            # 使用Anthropic客户端
            response = client.messages.create(
                model="claude-3-sonnet-20240229",
                max_tokens=1500,
                temperature=0.2,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}],
                timeout=LLM_TIMEOUT_SEC
            )
            llm_text = response.content[0].text
        else:
            raise ValueError(f"不支持的LLM提供商: {provider}")

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
        provider = os.getenv("LLM_PROVIDER", "OPENAI").upper()
        logger.info(f"调用LLM提供商进行GTV评估: {provider}")
        
        # 构建评估提示
        system_prompt = (
            "你是英国Global Talent Visa (GTV) 的资深评估专家。"
            "请基于申请人的简历信息，进行全面的GTV资格评估。"
            "评估标准包括：杰出人才、创新贡献、行业影响力、领导力等。"
            "严格返回JSON对象，不要包含多余说明或Markdown围栏。"
        )
        
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
    "analysis": "教育背景分析"
  }},
  "industryBackground": {{
    "sector": "行业领域",
    "yearsInIndustry": "行业经验年数",
    "keyCompanies": ["关键公司列表"],
    "industryImpact": 行业影响力评分(1-10),
    "analysis": "行业背景分析"
  }},
  "workExperience": {{
    "positions": ["职位列表"],
    "keyAchievements": ["关键成就列表"],
    "leadershipRoles": ["领导角色列表"],
    "projectImpact": ["项目影响列表"],
    "analysis": "工作经验分析"
  }},
  "technicalExpertise": {{
    "coreSkills": ["核心技能列表"],
    "specializations": ["专业领域列表"],
    "innovations": ["创新成果列表"],
    "industryRecognition": ["行业认可列表"],
    "analysis": "技术专长分析"
  }},
  "gtvPathway": {{
    "recommendedRoute": "推荐路径(Exceptional Talent/Exceptional Promise)",
    "eligibilityLevel": "资格等级(Strong/Good/Weak)",
    "yearsOfExperience": "相关经验年数",
    "analysis": "GTV路径分析"
  }},
  "strengths": [
    {{
      "area": "优势领域",
      "description": "优势描述",
      "evidence": "证据支撑"
    }}
  ],
  "weaknesses": [
    {{
      "area": "需要改进的领域",
      "description": "改进描述",
      "improvement": "改进建议",
      "priority": "优先级(High/Medium/Low)"
    }}
  ],
  "criteriaAssessment": [
    {{
      "name": "评估标准名称",
      "status": "状态(Met/Partially Met/Not Met)",
      "score": 评分(0-100),
      "evidence": "评估证据"
    }}
  ],
  "overallScore": 总体评分(0-100),
  "recommendation": "申请建议",
  "professionalAdvice": ["专业建议列表"],
  "timeline": "申请时间线",
  "requiredDocuments": ["所需文档列表"],
  "estimatedBudget": {{
    "min": 最低预算,
    "max": 最高预算,
    "currency": "货币单位"
  }}
}}
"""

        if provider in ["OPENAI", "AZURE"]:
            # 使用OpenAI客户端
            model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
            if provider == "AZURE":
                deployment = os.getenv("AZURE_OPENAI_DEPLOYMENT", "")
                if not deployment:
                    raise ValueError("Azure OpenAI需要配置AZURE_OPENAI_DEPLOYMENT")
                model = deployment
            
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.3,
                timeout=LLM_TIMEOUT_SEC
            )
            llm_text = response.choices[0].message.content
            
        elif provider == "ANTHROPIC":
            # 使用Anthropic客户端
            response = client.messages.create(
                model="claude-3-sonnet-20240229",
                max_tokens=2000,
                temperature=0.3,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}],
                timeout=LLM_TIMEOUT_SEC
            )
            llm_text = response.content[0].text
        else:
            raise ValueError(f"不支持的LLM提供商: {provider}")

        logger.info(f"GTV评估LLM返回文本长度: {len(llm_text)}; 预览: {safe_preview(llm_text)}")
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
    
    return {
        "applicantInfo": {
            "name": extracted_info.get("name", "N/A"),
            "field": field_mapping.get(field, "Digital Technology"),
            "currentPosition": "待确定",
            "company": "待确定",
            "yearsOfExperience": "待确定"
        },
        "educationBackground": {
            "degrees": [extracted_info.get("education", "待确定")],
            "institutions": ["待确定"],
            "analysis": "教育背景需要进一步分析"
        },
        "industryBackground": {
            "sector": "待确定",
            "yearsInIndustry": "待确定",
            "keyCompanies": ["待确定"],
            "industryImpact": 5,
            "analysis": "行业背景需要进一步分析"
        },
        "workExperience": {
            "positions": [extracted_info.get("experience", "待确定")],
            "keyAchievements": extracted_info.get("achievements", []),
            "leadershipRoles": ["待确定"],
            "projectImpact": extracted_info.get("projects", []),
            "analysis": "工作经验需要进一步分析"
        },
        "technicalExpertise": {
            "coreSkills": extracted_info.get("skills", []),
            "specializations": ["待确定"],
            "innovations": extracted_info.get("projects", []),
            "industryRecognition": extracted_info.get("achievements", []),
            "analysis": "技术专长需要进一步分析"
        },
        "gtvPathway": {
            "recommendedRoute": "待评估",
            "eligibilityLevel": "待评估",
            "yearsOfExperience": "待确定",
            "analysis": "需要LLM进行详细评估"
        },
        "strengths": [
            {
                "area": "技能专长",
                "description": "具备相关技能",
                "evidence": "简历中的技能列表"
            }
        ],
        "weaknesses": [
            {
                "area": "评估完整性",
                "description": "需要更详细的评估",
                "improvement": "建议配置LLM进行智能评估",
                "priority": "High"
            }
        ],
        "criteriaAssessment": [
            {
                "name": "基础资格",
                "status": "Partially Met",
                "score": 50,
                "evidence": "基础信息已提取，需要进一步评估"
            }
        ],
        "overallScore": 50,
        "recommendation": "建议配置LLM进行详细评估以获得更准确的结果",
        "professionalAdvice": [
            "配置LLM服务以获得智能评估",
            "提供更详细的简历信息",
            "准备相关支持文档"
        ],
        "timeline": "待评估",
        "requiredDocuments": [
            "简历/CV",
            "学历证明",
            "工作证明",
            "推荐信"
        ],
        "estimatedBudget": {
            "min": 50000,
            "max": 100000,
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
            
        # 获取姓名
        name = extracted_info.get("name", "未知用户")
        logger.info(f"[{request_id}] 提取的姓名: {name}")
        
        # 创建个人知识库
        logger.info(f"[{request_id}] 开始创建个人知识库")
        personal_kb_path = create_personal_knowledge_base(name, extracted_info)
        if not personal_kb_path:
            logger.error(f"[{request_id}] 错误: 创建个人知识库失败")
            return jsonify({"success": False, "error": "创建个人知识库失败"}), 500
            
        logger.info(f"[{request_id}] 个人知识库创建成功: {personal_kb_path}")
            
        # 更新主知识库
        logger.info(f"[{request_id}] 开始更新主知识库，个人知识库路径: {personal_kb_path}")
        update_result = update_main_knowledge_base(personal_kb_path, name)
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
            "message": f"简历分析完成，已为 {name} 创建个人知识库"
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
        name = data.get('name', '')
        email = data.get('email', '')
        
        logger.info(f"[{request_id}] 评估参数 - 姓名: {name}, 邮箱: {email}, 领域: {field}")
        logger.info(f"[{request_id}] 提取的信息: {extracted_info}")
        
        # 使用AI进行GTV评估
        logger.info(f"[{request_id}] 开始AI GTV评估")
        gtv_analysis = call_ai_for_gtv_assessment(extracted_info, field)
        
        logger.info(f"[{request_id}] GTV评估完成")
        logger.info(f"[{request_id}] 评估结果预览: {safe_preview(str(gtv_analysis))}")
        
        return jsonify({
            "success": True,
            "gtvAnalysis": gtv_analysis,
            "message": f"GTV资格评估完成"
        })
        
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

if __name__ == '__main__':
    logger.info("🚀 启动简历处理服务...")
    logger.info("📡 API地址: http://localhost:5002")
    logger.info("🔗 健康检查: http://localhost:5002/health")
    logger.info("📄 简历上传: http://localhost:5002/api/resume/upload")
    logger.info("📚 个人知识库: http://localhost:5002/api/resume/personal/<name>")
    
    app.run(host='0.0.0.0', port=5002, debug=True)
