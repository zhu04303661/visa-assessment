#!/usr/bin/env python3
"""
GTV签证文案制作系统 - API服务
提供REST API接口供前端调用
"""

import os
import json
import logging
import sqlite3
from datetime import datetime
from typing import Dict, Any
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename
from pathlib import Path

# 加载环境变量 - 在其他导入之前
try:
    from dotenv import load_dotenv
    # 尝试加载 .env.local (项目根目录)
    env_path = Path(__file__).parent.parent / '.env.local'
    if env_path.exists():
        load_dotenv(env_path)
        print(f"已加载环境变量: {env_path}")
    else:
        # 尝试加载当前目录的 .env
        load_dotenv()
except ImportError:
    print("警告: python-dotenv 未安装，请手动设置环境变量")

from utils.logger_config import setup_module_logger
from services.copywriting_project_manager import CopywritingProjectManager
from services.success_case_library import SuccessCaseLibrary
from agents.copywriting_agent import CopywritingAgent
from services.copywriting_workflow import CopywritingWorkflow
from database.copywriting_database import CopywritingDatabase
from processors.material_processor import MaterialProcessor
from services.raw_material_manager import RawMaterialManager
from processors.material_analyzer import MaterialAnalyzer
from agents.content_extraction_agent import ContentExtractionAgent
from agents.framework_building_agent import FrameworkBuildingAgent

logger = setup_module_logger("copywriting_api", os.getenv("LOG_LEVEL", "INFO"))

app = Flask(__name__)
CORS(app)

# 配置
UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", "./uploads")
PROJECTS_PATH = os.getenv("COPYWRITING_PROJECTS_PATH", "./copywriting_projects")
CASES_PATH = os.getenv("CASE_LIBRARY_PATH", "./success_cases")
DB_PATH = os.getenv("COPYWRITING_DB_PATH", "./copywriting.db")

# 支持的文件类型（扩展支持）
ALLOWED_EXTENSIONS = {
    # 文档类
    'txt', 'pdf', 'doc', 'docx', 'md', 'json', 'rtf',
    # 图片类
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'heic',
    # 数据类
    'csv', 'xlsx', 'xls',
    # 压缩包
    'zip'
}

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # 500MB max (支持大型zip文件)

# 确保目录存在
Path(UPLOAD_FOLDER).mkdir(parents=True, exist_ok=True)

# 初始化服务
workflow = None
project_manager = None
case_library = None
agent = None
db = None  # 本地数据库
material_processor = None  # 材料处理器
raw_material_manager = None  # 原始材料管理器

try:
    # 初始化本地数据库
    db = CopywritingDatabase(DB_PATH)
    logger.info(f"本地数据库初始化成功: {DB_PATH}")
    
    # 初始化材料处理器
    material_processor = MaterialProcessor(UPLOAD_FOLDER)
    logger.info("材料处理器初始化成功")
    
    # 初始化原始材料管理器
    raw_material_manager = RawMaterialManager(DB_PATH, UPLOAD_FOLDER)
    logger.info("原始材料管理器初始化成功")
    
    # 初始化材料分析器
    material_analyzer = MaterialAnalyzer(DB_PATH)
    logger.info("材料分析器初始化成功")
    
    # 初始化内容提取Agent
    content_extraction_agent = ContentExtractionAgent(DB_PATH, UPLOAD_FOLDER)
    logger.info("内容提取Agent初始化成功")
    
    # 初始化框架构建Agent
    framework_building_agent = FrameworkBuildingAgent(DB_PATH)
    logger.info("框架构建Agent初始化成功")
    
    workflow = CopywritingWorkflow(PROJECTS_PATH, CASES_PATH)
    project_manager = workflow.project_manager
    case_library = workflow.case_library
    agent = workflow.agent
    logger.info("文案系统服务初始化成功")
except Exception as e:
    logger.error(f"服务初始化失败: {e}")


def allowed_file(filename):
    """检查文件类型是否允许"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def _outline_to_context(outline: dict) -> str:
    """
    将内容大纲转换为上下文格式，用于生成GTV框架
    
    大纲格式更精简，避免上下文被截断的问题
    """
    parts = []
    
    # 1. 申请人概况
    applicant = outline.get("applicant_profile", {})
    if applicant:
        parts.append("=== 申请人概况 ===")
        if applicant.get("name"):
            parts.append(f"姓名: {applicant['name']}")
        if applicant.get("current_position"):
            parts.append(f"职位: {applicant['current_position']}")
        if applicant.get("domain"):
            parts.append(f"领域: {applicant['domain']}")
        if applicant.get("experience_years"):
            parts.append(f"经验: {applicant['experience_years']}年")
        parts.append("")
    
    # 2. 文件摘要
    file_summaries = outline.get("file_summaries", [])
    if file_summaries:
        parts.append("=== 材料清单 ===")
        for fs in file_summaries:
            filename = fs.get("filename", "未知")
            summary = fs.get("summary", "")
            file_type = fs.get("type") or fs.get("content_type", "")
            relevance = fs.get("relevance", "")
            
            parts.append(f"【{filename}】({file_type}) - {relevance}")
            parts.append(f"  摘要: {summary}")
            
            key_points = fs.get("key_points", [])
            if key_points:
                parts.append(f"  要点: {'; '.join(key_points)}")
            parts.append("")
    
    # 3. 关键词
    keywords = outline.get("keywords", [])
    if keywords:
        parts.append("=== 关键词 ===")
        parts.append(", ".join(keywords))
        parts.append("")
    
    # 4. 职业时间线
    timeline = outline.get("career_timeline", [])
    if timeline:
        parts.append("=== 职业经历 ===")
        for item in timeline:
            period = item.get("period", "")
            event = item.get("event", "")
            parts.append(f"- {period}: {event}")
        parts.append("")
    
    # 5. 成就分类
    achievements = outline.get("achievement_categories", {})
    if achievements:
        parts.append("=== 成就分类 ===")
        for category, items in achievements.items():
            if items:
                parts.append(f"【{category}】")
                for item in items:
                    parts.append(f"  - {item}")
        parts.append("")
    
    # 6. 证据覆盖评估
    coverage = outline.get("evidence_coverage", {})
    if coverage:
        parts.append("=== 证据覆盖评估 ===")
        for standard_type, standards in coverage.items():
            if isinstance(standards, dict):
                parts.append(f"【{standard_type}】")
                for key, value in standards.items():
                    parts.append(f"  {key}: {value}")
        parts.append("")
    
    # 7. 材料缺口
    gaps = outline.get("material_gaps", [])
    if gaps:
        parts.append("=== 材料缺口 ===")
        for gap in gaps:
            parts.append(f"- {gap}")
        parts.append("")
    
    # 8. 整体评估
    assessment = outline.get("overall_assessment", "")
    if assessment:
        parts.append("=== 整体评估 ===")
        parts.append(assessment)
    
    return "\n".join(parts)


@app.route('/health', methods=['GET'])
def health_check():
    """健康检查接口"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "Copywriting API",
        "database": "SQLite (local)",
        "db_path": DB_PATH,
        "components": {
            "database": db is not None,
            "material_processor": material_processor is not None,
            "workflow": workflow is not None,
            "project_manager": project_manager is not None,
            "case_library": case_library is not None,
            "agent": agent is not None and agent.client is not None
        },
        "supported_file_types": list(ALLOWED_EXTENSIONS) if material_processor else []
    })


# ==================== 项目管理 API ====================

@app.route('/api/projects', methods=['GET'])
def list_projects():
    """获取项目列表"""
    # 优先使用本地数据库
    if db:
        limit = request.args.get('limit', 100, type=int)
        status = request.args.get('status')
        result = db.list_projects(limit=limit, status=status)
        return jsonify(result)
    
    if not project_manager:
        return jsonify({"success": False, "error": "服务未初始化"}), 500
    
    limit = request.args.get('limit', 100, type=int)
    status = request.args.get('status')
    
    result = project_manager.list_projects(limit=limit, status=status)
    return jsonify(result)


@app.route('/api/projects', methods=['POST'])
def create_project():
    """创建新项目"""
    if not workflow:
        return jsonify({"success": False, "error": "服务未初始化"}), 500
    
    data = request.get_json()
    case_id = data.get('case_id', f"case-{datetime.now().strftime('%Y%m%d%H%M%S')}")
    client_name = data.get('client_name', '未命名客户')
    visa_type = data.get('visa_type', 'GTV')
    
    # 创建文件夹结构
    result = workflow.start_new_project(case_id, client_name, visa_type)
    
    # 同时保存到本地数据库
    if result["success"] and db:
        db.create_project(
            project_id=result["project_id"],
            case_id=case_id,
            client_name=client_name,
            visa_type=visa_type,
            folder_name=result.get("folder_name", ""),
            folder_path=result.get("project_path", "")
        )
        # 初始化材料包
        db.init_material_packages(result["project_id"], CopywritingProjectManager.MATERIAL_PACKAGES)
        db.log_workflow_action(result["project_id"], "project_created", "completed", "项目创建成功")
    
    if result["success"]:
        return jsonify(result), 201
    return jsonify(result), 400


@app.route('/api/projects/<project_id>', methods=['GET'])
def get_project(project_id):
    """获取项目详情"""
    # 优先使用本地数据库
    if db:
        result = db.get_project(project_id=project_id)
        if result["success"]:
            return jsonify(result)
    
    if not project_manager:
        return jsonify({"success": False, "error": "服务未初始化"}), 500
    
    result = project_manager.get_project(project_id=project_id)
    if result["success"]:
        return jsonify(result)
    return jsonify(result), 404


@app.route('/api/projects/<project_id>/progress', methods=['GET'])
def get_project_progress(project_id):
    """获取项目进度"""
    if not project_manager:
        return jsonify({"success": False, "error": "服务未初始化"}), 500
    
    result = project_manager.get_project_progress(project_id)
    return jsonify(result)


@app.route('/api/projects/<project_id>/workflow', methods=['GET'])
def get_workflow_status(project_id):
    """获取工作流状态"""
    if not workflow:
        return jsonify({"success": False, "error": "服务未初始化"}), 500
    
    result = workflow.get_workflow_status(project_id)
    return jsonify(result)


@app.route('/api/projects/<project_id>/status', methods=['PUT'])
def update_project_status(project_id):
    """更新项目状态"""
    if not project_manager:
        return jsonify({"success": False, "error": "服务未初始化"}), 500
    
    data = request.get_json()
    status = data.get('status')
    details = data.get('details')
    
    result = project_manager.update_project_status(project_id, status, details)
    return jsonify(result)


# ==================== 材料管理 API ====================

@app.route('/api/projects/<project_id>/materials', methods=['GET'])
def get_materials(project_id):
    """获取项目原始材料"""
    # 优先使用本地数据库
    if db:
        result = db.get_raw_materials(project_id)
        return jsonify(result)
    
    if not project_manager:
        return jsonify({"success": False, "error": "服务未初始化"}), 500
    
    result = project_manager.get_raw_materials(project_id)
    return jsonify(result)


@app.route('/api/projects/<project_id>/materials', methods=['POST'])
def upload_material(project_id):
    """
    上传材料（支持多种类型）
    支持：PDF、Word、图片、文本等
    """
    if not material_processor:
        return jsonify({"success": False, "error": "材料处理器未初始化"}), 500
    
    # 支持文件上传
    if 'file' in request.files:
        file = request.files['file']
        category = request.form.get('category')  # 可选，会自动推断
        
        if file.filename == '':
            return jsonify({"success": False, "error": "未选择文件"}), 400
        
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            file_data = file.read()
            
            # 使用材料处理器处理文件
            result = material_processor.process_material(file_data, filename, category)
            
            if result.get("success"):
                # 保存到数据库
                if db:
                    db.add_raw_material(
                        project_id, 
                        result.get("category", "其他"),
                        filename, 
                        result.get("saved_path"),
                        result.get("content", ""),
                        len(file_data),
                        result.get("file_type")
                    )
                    db.log_workflow_action(
                        project_id, 
                        "material_uploaded", 
                        "completed", 
                        f"上传并处理: {filename} ({result.get('file_type')})"
                    )
                
                # 同时保存到文件系统项目目录
                if workflow:
                    workflow.upload_material(
                        project_id, 
                        result.get("category", "其他"),
                        filename, 
                        result.get("content", "")
                    )
            
            return jsonify(result)
        else:
            return jsonify({
                "success": False, 
                "error": f"不支持的文件类型，支持: {', '.join(ALLOWED_EXTENSIONS)}"
            }), 400
    else:
        # JSON方式上传（文本内容或URL）
        data = request.get_json()
        
        # 检查是否是URL
        if data.get('url'):
            result = material_processor.process_url(data['url'], data.get('category'))
            
            if result.get("success") and db:
                db.add_raw_material(
                    project_id,
                    result.get("category", "其他"),
                    result.get("url"),
                    None,
                    result.get("content", ""),
                    len(result.get("content", "")),
                    "webpage"
                )
                db.log_workflow_action(
                    project_id, 
                    "url_processed", 
                    "completed", 
                    f"处理URL: {data['url']}"
                )
            
            return jsonify(result)
        
        # 普通文本内容
        category = data.get('category', '其他')
        filename = data.get('filename', 'unnamed.txt')
        content = data.get('content', '')
        
        # 保存到文件系统
        if workflow:
            result = workflow.upload_material(project_id, category, filename, content)
        else:
            result = {"success": True, "filename": filename}
        
        # 保存到数据库
        if result.get("success") and db:
            db.add_raw_material(project_id, category, filename, 
                               result.get("file_path"), content, len(content), "text")
            db.log_workflow_action(project_id, "material_uploaded", "completed", f"上传: {filename}")
        
        return jsonify(result)


@app.route('/api/projects/<project_id>/materials/url', methods=['POST'])
def upload_url_material(project_id):
    """
    处理网站链接
    从URL提取内容作为原始材料
    """
    if not material_processor:
        return jsonify({"success": False, "error": "材料处理器未初始化"}), 500
    
    data = request.get_json()
    url = data.get('url')
    category = data.get('category')
    
    if not url:
        return jsonify({"success": False, "error": "请提供URL"}), 400
    
    # 处理URL
    result = material_processor.process_url(url, category)
    
    if result.get("success") and db:
        db.add_raw_material(
            project_id,
            result.get("category", "其他"),
            url,
            None,
            result.get("content", ""),
            len(result.get("content", "")),
            "webpage"
        )
        db.log_workflow_action(
            project_id, 
            "url_processed", 
            "completed", 
            f"处理URL: {url}"
        )
    
    return jsonify(result)


@app.route('/api/projects/<project_id>/materials/batch', methods=['POST'])
def batch_upload_materials(project_id):
    """
    批量上传多个文件
    """
    if not material_processor:
        return jsonify({"success": False, "error": "材料处理器未初始化"}), 500
    
    files = request.files.getlist('files')
    if not files:
        return jsonify({"success": False, "error": "未选择文件"}), 400
    
    results = []
    success_count = 0
    
    for file in files:
        if file.filename and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            file_data = file.read()
            
            result = material_processor.process_material(file_data, filename)
            
            if result.get("success"):
                success_count += 1
                if db:
                    db.add_raw_material(
                        project_id,
                        result.get("category", "其他"),
                        filename,
                        result.get("saved_path"),
                        result.get("content", ""),
                        len(file_data),
                        result.get("file_type")
                    )
            
            results.append({
                "filename": filename,
                "success": result.get("success"),
                "category": result.get("category"),
                "file_type": result.get("file_type"),
                "error": result.get("error")
            })
    
    if db and success_count > 0:
        db.log_workflow_action(
            project_id, 
            "batch_upload", 
            "completed", 
            f"批量上传: {success_count}/{len(files)} 成功"
        )
    
    return jsonify({
        "success": True,
        "total": len(files),
        "success_count": success_count,
        "failed_count": len(files) - success_count,
        "results": results
    })


@app.route('/api/projects/<project_id>/materials/consolidate', methods=['POST'])
def consolidate_materials(project_id):
    """
    整合项目所有材料，生成综合报告
    """
    if not material_processor or not db:
        return jsonify({"success": False, "error": "服务未初始化"}), 500
    
    # 获取项目所有材料
    materials_result = db.get_raw_materials(project_id)
    
    if not materials_result.get("success"):
        return jsonify(materials_result), 400
    
    # 整理材料数据
    all_materials = []
    for category, items in materials_result.get("data", {}).items():
        for item in items:
            all_materials.append({
                "success": True,
                "filename": item.get("name"),
                "category": category,
                "file_type": item.get("file_type", "unknown"),
                "content": item.get("content", ""),
                "summary": item.get("content", "")[:500] if item.get("content") else ""
            })
    
    # 生成整合报告
    consolidated = material_processor.consolidate_materials(all_materials)
    
    # 保存报告到数据库
    if db:
        db.save_analysis_report(
            project_id,
            "material_consolidation",
            "材料整理报告.md",
            None,
            consolidated.get("summary_report", ""),
            consolidated
        )
        db.log_workflow_action(
            project_id,
            "materials_consolidated",
            "completed",
            f"整理 {consolidated.get('total_materials', 0)} 份材料"
        )
    
    return jsonify({
        "success": True,
        "data": consolidated
    })


# ==================== 工作流执行 API ====================

@app.route('/api/projects/<project_id>/analyze', methods=['POST'])
def run_analysis(project_id):
    """运行材料分析 - 使用新的材料分析器生成GTV框架"""
    try:
        if not material_analyzer:
            # 回退到旧的分析方法
            if workflow:
                result = workflow.run_material_analysis(project_id)
                return jsonify(result)
            return jsonify({"success": False, "error": "服务未初始化"}), 500
        
        logger.info(f"开始分析项目材料: {project_id}")
        result = material_analyzer.analyze_project_materials(project_id)
        
        if result.get("success"):
            # 生成思维导图数据
            framework = result["data"]["framework"]
            mindmap = material_analyzer.generate_mindmap_data(
                framework, 
                result["data"].get("project_name", "")
            )
            result["data"]["mindmap"] = mindmap
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"分析项目材料失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/projects/<project_id>/analysis', methods=['GET'])
def get_analysis(project_id):
    """获取已保存的分析结果"""
    try:
        if not material_analyzer:
            return jsonify({"success": False, "error": "服务未初始化"}), 500
        
        result = material_analyzer.get_analysis_result(project_id)
        if result:
            # 重新生成mindmap数据
            if result.get("framework"):
                mindmap = material_analyzer.generate_mindmap_data(
                    result["framework"],
                    ""
                )
                result["mindmap"] = mindmap
            
            return jsonify({"success": True, "data": result})
        else:
            return jsonify({"success": False, "error": "未找到分析结果"}), 404
            
    except Exception as e:
        logger.error(f"获取分析结果失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/projects/<project_id>/match-cases', methods=['POST'])
def run_case_matching(project_id):
    """运行案例匹配"""
    if not workflow:
        return jsonify({"success": False, "error": "服务未初始化"}), 500
    
    data = request.get_json() or {}
    applicant_profile = data.get('applicant_profile')
    
    result = workflow.run_case_matching(project_id, applicant_profile)
    return jsonify(result)


@app.route('/api/projects/<project_id>/generate-drafts', methods=['POST'])
def generate_drafts(project_id):
    """生成文档草稿"""
    if not workflow:
        return jsonify({"success": False, "error": "服务未初始化"}), 500
    
    data = request.get_json() or {}
    document_types = data.get('document_types')
    context = data.get('context')
    
    result = workflow.run_draft_generation(project_id, document_types, context)
    return jsonify(result)


@app.route('/api/projects/<project_id>/optimize', methods=['POST'])
def optimize_documents(project_id):
    """优化文档"""
    if not workflow:
        return jsonify({"success": False, "error": "服务未初始化"}), 500
    
    data = request.get_json() or {}
    document_types = data.get('document_types')
    
    result = workflow.run_optimization(project_id, document_types)
    return jsonify(result)


@app.route('/api/projects/<project_id>/review', methods=['POST'])
def final_review(project_id):
    """最终审核"""
    if not workflow:
        return jsonify({"success": False, "error": "服务未初始化"}), 500
    
    result = workflow.run_final_review(project_id)
    return jsonify(result)


@app.route('/api/projects/<project_id>/run-workflow', methods=['POST'])
def run_full_workflow(project_id):
    """运行完整工作流"""
    if not workflow:
        return jsonify({"success": False, "error": "服务未初始化"}), 500
    
    # 获取项目信息
    project = project_manager.get_project(project_id=project_id)
    if not project["success"]:
        return jsonify(project), 404
    
    project_data = project["data"]
    
    # 获取项目材料
    materials_result = project_manager.get_raw_materials(project_id)
    materials = materials_result.get("data", {}) if materials_result.get("success") else {}
    
    # 运行完整工作流（从分析开始）
    results = {
        "project_id": project_id,
        "stages": {}
    }
    
    # 1. 材料分析
    analysis_result = workflow.run_material_analysis(project_id)
    results["stages"]["analysis"] = analysis_result
    
    if analysis_result.get("success"):
        # 2. 案例匹配
        match_result = workflow.run_case_matching(project_id)
        results["stages"]["case_matching"] = match_result
        
        # 3. 生成草稿
        draft_result = workflow.run_draft_generation(project_id)
        results["stages"]["draft_generation"] = draft_result
        
        # 4. 优化
        opt_result = workflow.run_optimization(project_id)
        results["stages"]["optimization"] = opt_result
        
        # 5. 审核
        review_result = workflow.run_final_review(project_id)
        results["stages"]["final_review"] = review_result
        
        results["success"] = True
        results["final_status"] = review_result.get("status", "unknown")
    else:
        results["success"] = False
        results["error"] = "材料分析失败"
    
    return jsonify(results)


# ==================== 文档操作 API ====================

@app.route('/api/projects/<project_id>/documents', methods=['GET'])
def list_documents(project_id):
    """列出项目文档"""
    if not project_manager:
        return jsonify({"success": False, "error": "服务未初始化"}), 500
    
    project = project_manager.get_project(project_id=project_id)
    if not project["success"]:
        return jsonify(project), 404
    
    project_path = Path(project["path"])
    stage = request.args.get('stage', 'all')
    
    documents = {}
    
    stage_folders = {
        "draft": "03_文案草稿",
        "optimized": "04_优化版本",
        "final": "05_最终文档"
    }
    
    folders_to_scan = [stage_folders[stage]] if stage in stage_folders else list(stage_folders.values())
    
    for folder_name in folders_to_scan:
        folder_path = project_path / folder_name
        if folder_path.exists():
            folder_docs = {}
            for doc_type_folder in folder_path.iterdir():
                if doc_type_folder.is_dir():
                    files = []
                    for doc_file in doc_type_folder.glob("*.md"):
                        files.append({
                            "name": doc_file.name,
                            "path": str(doc_file),
                            "size": doc_file.stat().st_size,
                            "modified": datetime.fromtimestamp(doc_file.stat().st_mtime).isoformat()
                        })
                    if files:
                        folder_docs[doc_type_folder.name] = files
            if folder_docs:
                documents[folder_name] = folder_docs
    
    return jsonify({"success": True, "data": documents})


@app.route('/api/projects/<project_id>/documents/<path:doc_path>', methods=['GET'])
def get_document_content(project_id, doc_path):
    """获取文档内容"""
    if not project_manager:
        return jsonify({"success": False, "error": "服务未初始化"}), 500
    
    project = project_manager.get_project(project_id=project_id)
    if not project["success"]:
        return jsonify(project), 404
    
    project_path = Path(project["path"])
    file_path = project_path / doc_path
    
    if not file_path.exists():
        return jsonify({"success": False, "error": "文档不存在"}), 404
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        return jsonify({
            "success": True,
            "data": {
                "path": doc_path,
                "content": content,
                "size": file_path.stat().st_size,
                "modified": datetime.fromtimestamp(file_path.stat().st_mtime).isoformat()
            }
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/projects/<project_id>/documents/<path:doc_path>', methods=['PUT'])
def update_document_content(project_id, doc_path):
    """更新文档内容"""
    if not project_manager:
        return jsonify({"success": False, "error": "服务未初始化"}), 500
    
    project = project_manager.get_project(project_id=project_id)
    if not project["success"]:
        return jsonify(project), 404
    
    project_path = Path(project["path"])
    file_path = project_path / doc_path
    
    data = request.get_json()
    content = data.get('content', '')
    
    try:
        # 确保目录存在
        file_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        # 记录操作
        project_manager.log_action(project_id, "document_updated", f"更新文档: {doc_path}")
        
        return jsonify({
            "success": True,
            "message": "文档更新成功",
            "path": doc_path
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ==================== Agent功能 API ====================

@app.route('/api/agent/generate', methods=['POST'])
def generate_document():
    """使用Agent生成文档"""
    if not agent or not agent.client:
        return jsonify({"success": False, "error": "Agent服务不可用"}), 503
    
    data = request.get_json()
    document_type = data.get('document_type')
    context = data.get('context', {})
    reference_samples = data.get('reference_samples')
    
    if not document_type:
        return jsonify({"success": False, "error": "缺少document_type参数"}), 400
    
    result = agent.generate_document(document_type, context, reference_samples)
    return jsonify(result)


@app.route('/api/agent/optimize', methods=['POST'])
def optimize_content():
    """使用Agent优化内容"""
    if not agent or not agent.client:
        return jsonify({"success": False, "error": "Agent服务不可用"}), 503
    
    data = request.get_json()
    content = data.get('content', '')
    optimization_type = data.get('type', 'comprehensive')
    instructions = data.get('instructions')
    
    result = agent.optimize_document(content, optimization_type, instructions)
    return jsonify(result)


@app.route('/api/agent/review', methods=['POST'])
def review_content():
    """使用Agent审核内容"""
    if not agent or not agent.client:
        return jsonify({"success": False, "error": "Agent服务不可用"}), 503
    
    data = request.get_json()
    content = data.get('content', '')
    document_type = data.get('document_type', 'general')
    criteria = data.get('criteria')
    
    result = agent.review_document(content, document_type, criteria)
    return jsonify(result)


@app.route('/api/agent/translate', methods=['POST'])
def translate_content():
    """使用Agent翻译内容"""
    if not agent or not agent.client:
        return jsonify({"success": False, "error": "Agent服务不可用"}), 503
    
    data = request.get_json()
    content = data.get('content', '')
    source_lang = data.get('source_lang', 'zh')
    target_lang = data.get('target_lang', 'en')
    
    result = agent.translate_document(content, source_lang, target_lang)
    return jsonify(result)


@app.route('/api/agent/suggest', methods=['POST'])
def suggest_improvements():
    """使用Agent提供改进建议"""
    if not agent or not agent.client:
        return jsonify({"success": False, "error": "Agent服务不可用"}), 503
    
    data = request.get_json()
    analysis = data.get('analysis', {})
    target_pathway = data.get('target_pathway', 'Exceptional Talent')
    
    result = agent.suggest_improvements(analysis, target_pathway)
    return jsonify(result)


# ==================== 材料包内容和版本管理 API ====================

@app.route('/api/projects/<project_id>/packages/<package_type>', methods=['GET'])
def get_package_content(project_id, package_type):
    """获取材料包当前内容"""
    if not db:
        return jsonify({"success": False, "error": "数据库未初始化"}), 500
    
    result = db.get_package_content(project_id, package_type)
    return jsonify(result)


@app.route('/api/projects/<project_id>/packages/<package_type>', methods=['POST'])
def save_package_content(project_id, package_type):
    """保存材料包内容（创建新版本）"""
    if not db:
        return jsonify({"success": False, "error": "数据库未初始化"}), 500
    
    data = request.get_json()
    content = data.get('content', '')
    edit_type = data.get('edit_type', 'manual')
    edit_summary = data.get('edit_summary')
    editor = data.get('editor', 'user')
    
    result = db.save_package_content(
        project_id, package_type, content,
        edit_type=edit_type,
        edit_summary=edit_summary,
        editor=editor
    )
    
    if result.get("success") and db:
        db.log_workflow_action(
            project_id, 
            "package_saved", 
            "completed",
            f"保存 {package_type} 版本 {result.get('version')}"
        )
    
    return jsonify(result)


@app.route('/api/projects/<project_id>/packages/<package_type>/versions', methods=['GET'])
def get_package_versions(project_id, package_type):
    """获取材料包版本历史"""
    if not db:
        return jsonify({"success": False, "error": "数据库未初始化"}), 500
    
    result = db.get_version_history(project_id, package_type)
    return jsonify(result)


@app.route('/api/projects/<project_id>/packages/<package_type>/versions/<int:version>', methods=['GET'])
def get_package_version_content(project_id, package_type, version):
    """获取特定版本内容"""
    if not db:
        return jsonify({"success": False, "error": "数据库未初始化"}), 500
    
    result = db.get_version_content(project_id, package_type, version)
    return jsonify(result)


@app.route('/api/projects/<project_id>/packages/<package_type>/rollback', methods=['POST'])
def rollback_package_version(project_id, package_type):
    """回滚到特定版本"""
    if not db:
        return jsonify({"success": False, "error": "数据库未初始化"}), 500
    
    data = request.get_json()
    version = data.get('version')
    
    if not version:
        return jsonify({"success": False, "error": "请指定版本号"}), 400
    
    result = db.rollback_to_version(project_id, package_type, version)
    
    if result.get("success") and db:
        db.log_workflow_action(
            project_id,
            "version_rollback",
            "completed",
            f"回滚 {package_type} 到版本 {version}"
        )
    
    return jsonify(result)


@app.route('/api/projects/<project_id>/packages/<package_type>/generate', methods=['POST'])
def generate_package_content(project_id, package_type):
    """使用AI生成材料包内容"""
    if not agent or not agent.client:
        return jsonify({"success": False, "error": "AI服务不可用，请配置OPENAI_API_KEY或ANTHROPIC_API_KEY"}), 503
    
    data = request.get_json() or {}
    reference_doc_id = data.get('reference_doc_id')
    
    # 获取项目信息和原始材料
    project_result = db.get_project(project_id=project_id) if db else None
    materials_result = db.get_raw_materials(project_id) if db else None
    
    # 获取参考文档（如果提供）
    reference_doc_info = None
    reference_content = None
    if reference_doc_id and reference_doc_id != "none" and db:
        try:
            with db._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    SELECT pc.content, pc.package_type, p.client_name 
                    FROM package_contents pc
                    JOIN projects p ON pc.project_id = p.project_id
                    WHERE pc.id = ?
                ''', (reference_doc_id,))
                row = cursor.fetchone()
                if row:
                    reference_content = row['content']
                    reference_doc_info = {
                        "client_name": row['client_name'],
                        "package_type": row['package_type']
                    }
        except Exception as e:
            logger.warning(f"获取参考文档失败: {e}")
    
    # 构建上下文
    context = {
        "project": project_result.get("data", {}) if project_result else {},
        "materials": materials_result.get("data", {}) if materials_result else {},
        "package_type": package_type,
        "reference_case": reference_case,
        "reference_content": reference_content
    }
    
    # 映射package_type到document_type
    doc_type_map = {
        "personal_statement": "personal_statement",
        "cv_resume": "cv",
        "recommendation_letters": "recommendation_letter",
        "cover_letter": "cover_letter",
        "business_plan": "business_plan",
        "evidence_portfolio": "evidence_summary",
        "endorsement_letter": "endorsement_application"
    }
    document_type = doc_type_map.get(package_type, "general")
    
    # 生成内容（传入参考案例）
    reference_samples = [reference_content] if reference_content else None
    result = agent.generate_document(document_type, context, reference_samples=reference_samples)
    
    if result.get("success"):
        content = result.get("content", "")
        
        # 构建编辑摘要
        edit_summary = "AI自动生成"
        if reference_doc_info:
            edit_summary += f"（参考: {reference_doc_info.get('client_name', '未知')}的{reference_doc_info.get('package_type', '')}）"
        
        # 保存生成的内容
        if db:
            save_result = db.save_package_content(
                project_id, package_type, content,
                edit_type="ai",
                edit_summary=edit_summary,
                editor="AI Agent"
            )
            
            db.log_workflow_action(
                project_id,
                "ai_generation",
                "completed",
                f"AI生成 {package_type}" + (f"，参考文档ID: {reference_doc_id}" if reference_doc_id and reference_doc_id != "none" else "")
            )
            
            return jsonify({
                "success": True,
                "content": content,
                "version": save_result.get("version", 1),
                "message": "AI生成完成"
            })
        
        return jsonify({
            "success": True,
            "content": content,
            "message": "AI生成完成（未保存）"
        })
    
    return jsonify(result)


@app.route('/api/projects/<project_id>/packages/<package_type>/upload', methods=['POST'])
def upload_package_file(project_id, package_type):
    """上传文件并创建新版本"""
    if not db:
        return jsonify({"success": False, "error": "数据库未初始化"}), 500
    
    if 'file' not in request.files:
        return jsonify({"success": False, "error": "没有上传文件"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"success": False, "error": "文件名为空"}), 400
    
    filename = file.filename.lower()
    content = ""
    
    try:
        # 根据文件类型提取内容
        if filename.endswith('.txt') or filename.endswith('.md'):
            content = file.read().decode('utf-8')
        
        elif filename.endswith('.pdf'):
            # 使用 pdfminer 提取 PDF 内容
            try:
                from pdfminer.high_level import extract_text
                import tempfile
                with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
                    file.save(tmp.name)
                    content = extract_text(tmp.name)
                    import os
                    os.unlink(tmp.name)
            except ImportError:
                return jsonify({"success": False, "error": "PDF处理库未安装"}), 500
        
        elif filename.endswith('.doc') or filename.endswith('.docx'):
            # 使用 python-docx 提取 Word 内容
            try:
                from docx import Document
                import tempfile
                with tempfile.NamedTemporaryFile(delete=False, suffix='.docx') as tmp:
                    file.save(tmp.name)
                    doc = Document(tmp.name)
                    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
                    content = '\n\n'.join(paragraphs)
                    import os
                    os.unlink(tmp.name)
            except ImportError:
                return jsonify({"success": False, "error": "Word处理库未安装"}), 500
        
        else:
            return jsonify({"success": False, "error": "不支持的文件类型"}), 400
        
        if not content.strip():
            return jsonify({"success": False, "error": "文件内容为空"}), 400
        
        # 保存内容为新版本
        result = db.save_package_content(
            project_id, package_type, content,
            edit_type="upload",
            edit_summary=f"上传文件: {file.filename}",
            editor="用户上传"
        )
        
        db.log_workflow_action(
            project_id,
            "file_upload",
            "completed",
            f"上传文件到 {package_type}: {file.filename}"
        )
        
        return jsonify({
            "success": True,
            "content": content,
            "version": result.get("version", 1),
            "message": f"文件上传成功，已保存为版本 {result.get('version', 1)}"
        })
        
    except Exception as e:
        logger.error(f"上传文件失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/projects/<project_id>/packages', methods=['GET'])
def get_all_packages(project_id):
    """获取项目所有材料包概览"""
    if not db:
        return jsonify({"success": False, "error": "数据库未初始化"}), 500
    
    result = db.get_all_package_contents(project_id)
    return jsonify(result)


@app.route('/api/reference-documents/<package_type>', methods=['GET'])
def get_reference_documents(package_type):
    """获取指定材料包类型的所有参考文档（来自所有已完成项目）"""
    if not db:
        return jsonify({"success": False, "error": "数据库未初始化"}), 500
    
    try:
        with db._get_connection() as conn:
            cursor = conn.cursor()
            
            # 获取所有有内容的该类型材料包
            cursor.execute('''
                SELECT pc.id, pc.project_id, pc.package_type, pc.content, pc.current_version,
                       pc.updated_at, p.client_name, p.visa_type, p.status as project_status
                FROM package_contents pc
                JOIN projects p ON pc.project_id = p.project_id
                WHERE pc.package_type = ? 
                AND pc.content IS NOT NULL 
                AND pc.content != ''
                AND LENGTH(pc.content) > 100
                ORDER BY pc.updated_at DESC
                LIMIT 50
            ''', (package_type,))
            
            documents = []
            for row in cursor.fetchall():
                # 生成内容预览（前200字符）
                content = row['content'] or ""
                preview = content[:200] + "..." if len(content) > 200 else content
                
                documents.append({
                    "id": str(row['id']),
                    "project_id": row['project_id'],
                    "package_type": row['package_type'],
                    "client_name": row['client_name'],
                    "visa_type": row['visa_type'],
                    "version": row['current_version'],
                    "preview": preview,
                    "word_count": len(content.split()),
                    "updated_at": row['updated_at'],
                    "project_status": row['project_status']
                })
            
            return jsonify({
                "success": True,
                "data": documents,
                "package_type": package_type,
                "count": len(documents)
            })
            
    except Exception as e:
        logger.error(f"获取参考文档失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


# ==================== 案例库 API ====================

@app.route('/api/cases', methods=['GET'])
def list_cases():
    """获取案例列表"""
    # 优先使用本地数据库
    if db:
        page = request.args.get('page', 1, type=int)
        page_size = request.args.get('page_size', 20, type=int)
        result = db.list_cases(page=page, page_size=page_size)
        return jsonify(result)
    
    if not case_library:
        return jsonify({"success": False, "error": "服务未初始化"}), 500
    
    page = request.args.get('page', 1, type=int)
    page_size = request.args.get('page_size', 20, type=int)
    
    result = case_library.list_cases(page=page, page_size=page_size)
    return jsonify(result)


@app.route('/api/cases', methods=['POST'])
def add_case():
    """添加案例"""
    data = request.get_json()
    
    # 优先保存到本地数据库
    if db:
        result = db.add_success_case(data)
        if result["success"]:
            return jsonify(result), 201
        return jsonify(result), 400
    
    if not case_library:
        return jsonify({"success": False, "error": "服务未初始化"}), 500
    
    result = case_library.add_case(data)
    
    if result["success"]:
        return jsonify(result), 201
    return jsonify(result), 400


@app.route('/api/cases/<case_id>', methods=['GET'])
def get_case(case_id):
    """获取案例详情"""
    # 优先使用本地数据库
    if db:
        result = db.get_success_case(case_id)
        if result["success"]:
            return jsonify(result)
    
    if not case_library:
        return jsonify({"success": False, "error": "服务未初始化"}), 500
    
    result = case_library.get_case(case_id)
    if result["success"]:
        return jsonify(result)
    return jsonify(result), 404


@app.route('/api/cases/search', methods=['POST'])
def search_cases():
    """搜索案例"""
    data = request.get_json() or {}
    filters = data.get('filters')
    keywords = data.get('keywords')
    limit = data.get('limit', 10)
    
    # 优先使用本地数据库
    if db:
        result = db.search_cases(filters=filters, keywords=keywords, limit=limit)
        return jsonify(result)
    
    if not case_library:
        return jsonify({"success": False, "error": "服务未初始化"}), 500
    
    result = case_library.search_cases(filters=filters, keywords=keywords, limit=limit)
    return jsonify(result)


@app.route('/api/cases/match', methods=['POST'])
def match_cases():
    """匹配案例"""
    if not case_library:
        return jsonify({"success": False, "error": "服务未初始化"}), 500
    
    data = request.get_json()
    applicant_profile = data.get('applicant_profile', {})
    top_k = data.get('top_k', 3)
    
    result = case_library.match_cases(applicant_profile, top_k=top_k)
    return jsonify(result)


@app.route('/api/cases/statistics', methods=['GET'])
def get_case_statistics():
    """获取案例统计"""
    # 优先使用本地数据库
    if db:
        result = db.get_case_statistics()
        return jsonify(result)
    
    if not case_library:
        return jsonify({"success": False, "error": "服务未初始化"}), 500
    
    result = case_library.get_statistics()
    return jsonify(result)


@app.route('/api/cases/initialize', methods=['POST'])
def initialize_cases():
    """初始化示例案例"""
    # 优先使用本地数据库
    if db:
        result = db.add_sample_cases()
        return jsonify(result)
    
    if not case_library:
        return jsonify({"success": False, "error": "服务未初始化"}), 500
    
    result = case_library.add_sample_cases()
    return jsonify(result)


# ==================== 配置和工具 API ====================

@app.route('/api/config/document-types', methods=['GET'])
def get_document_types():
    """获取支持的文档类型"""
    return jsonify({
        "success": True,
        "data": list(CopywritingAgent.DOCUMENT_TEMPLATES.keys())
    })


@app.route('/api/config/material-packages', methods=['GET'])
def get_material_packages():
    """获取材料包类型"""
    return jsonify({
        "success": True,
        "data": CopywritingProjectManager.MATERIAL_PACKAGES
    })


@app.route('/api/config/workflow-stages', methods=['GET'])
def get_workflow_stages():
    """获取工作流阶段"""
    return jsonify({
        "success": True,
        "data": CopywritingWorkflow.WORKFLOW_STAGES
    })


@app.route('/api/config/case-dimensions', methods=['GET'])
def get_case_dimensions():
    """获取案例维度"""
    return jsonify({
        "success": True,
        "data": SuccessCaseLibrary.CASE_DIMENSIONS
    })


# ==================== 原始材料收集 API ====================

@app.route('/api/material-collection/categories', methods=['GET'])
def get_material_categories():
    """获取材料分类结构"""
    if not raw_material_manager:
        return jsonify({"success": False, "error": "服务未初始化"}), 500
    
    result = raw_material_manager.get_material_categories()
    return jsonify(result)


@app.route('/api/material-collection/forms', methods=['GET'])
def get_form_templates():
    """获取所有表单模板"""
    if not raw_material_manager:
        return jsonify({"success": False, "error": "服务未初始化"}), 500
    
    result = raw_material_manager.get_all_form_templates()
    return jsonify(result)


@app.route('/api/material-collection/forms/<form_type>', methods=['GET'])
def get_form_template(form_type):
    """获取特定表单模板"""
    if not raw_material_manager:
        return jsonify({"success": False, "error": "服务未初始化"}), 500
    
    result = raw_material_manager.get_form_template(form_type)
    return jsonify(result)


@app.route('/api/material-collection/categories', methods=['PUT'])
def update_material_categories():
    """更新材料分类配置"""
    # 导入模块
    from services import raw_material_manager as rmm
    
    data = request.get_json()
    categories = data.get('categories')
    
    if not categories:
        return jsonify({"success": False, "error": "缺少分类数据"}), 400
    
    try:
        # 更新内存中的分类配置（更新全局变量）
        rmm.MATERIAL_CATEGORIES = categories
        
        # 保存到配置文件
        config_path = os.path.join(os.path.dirname(__file__), 'material_categories.json')
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(categories, f, ensure_ascii=False, indent=2)
        
        logger.info(f"材料分类配置已更新并保存到: {config_path}")
        return jsonify({"success": True, "message": "分类配置已保存"})
    except Exception as e:
        logger.error(f"保存分类配置失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/projects/<project_id>/material-collection', methods=['GET'])
def get_project_material_status(project_id):
    """获取项目材料收集状态"""
    if not raw_material_manager:
        return jsonify({"success": False, "error": "服务未初始化"}), 500
    
    result = raw_material_manager.get_collection_status(project_id)
    return jsonify(result)


@app.route('/api/projects/<project_id>/material-collection/init', methods=['POST'])
def init_project_materials(project_id):
    """初始化项目材料收集清单"""
    if not raw_material_manager:
        return jsonify({"success": False, "error": "服务未初始化"}), 500
    
    result = raw_material_manager.init_project_materials(project_id)
    return jsonify(result)


@app.route('/api/projects/<project_id>/material-collection/upload', methods=['POST'])
def upload_raw_material(project_id):
    """上传原始材料文件"""
    if not raw_material_manager:
        return jsonify({"success": False, "error": "服务未初始化"}), 500
    
    if 'file' not in request.files:
        return jsonify({"success": False, "error": "未找到文件"}), 400
    
    file = request.files['file']
    category_id = request.form.get('category_id')
    item_id = request.form.get('item_id')
    description = request.form.get('description', '')
    
    if not category_id or not item_id:
        return jsonify({"success": False, "error": "缺少category_id或item_id"}), 400
    
    if file.filename == '':
        return jsonify({"success": False, "error": "文件名为空"}), 400
    
    if not allowed_file(file.filename):
        return jsonify({"success": False, "error": f"不支持的文件类型"}), 400
    
    # 保存文件
    filename = secure_filename(file.filename)
    # 使用中文原始文件名
    original_filename = file.filename
    
    # 创建项目目录
    project_upload_dir = os.path.join(UPLOAD_FOLDER, project_id, "raw_materials", category_id)
    Path(project_upload_dir).mkdir(parents=True, exist_ok=True)
    
    # 生成唯一文件名
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    unique_filename = f"{timestamp}_{filename}"
    file_path = os.path.join(project_upload_dir, unique_filename)
    
    file.save(file_path)
    file_size = os.path.getsize(file_path)
    file_type = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
    
    # 记录到数据库
    result = raw_material_manager.upload_material(
        project_id=project_id,
        category_id=category_id,
        item_id=item_id,
        file_path=file_path,
        file_name=original_filename,
        file_size=file_size,
        file_type=file_type,
        description=description
    )
    
    return jsonify(result)


@app.route('/api/projects/<project_id>/material-collection/upload-zip', methods=['POST'])
def upload_zip_material(project_id):
    """上传zip文件并自动解压分析归类"""
    import traceback
    
    logger.info(f"收到zip上传请求, project_id={project_id}")
    
    if not raw_material_manager:
        logger.error("raw_material_manager 未初始化")
        return jsonify({"success": False, "error": "服务未初始化"}), 500
    
    if 'file' not in request.files:
        logger.error("请求中未找到文件")
        return jsonify({"success": False, "error": "未找到文件"}), 400
    
    file = request.files['file']
    logger.info(f"收到文件: {file.filename}, content_type: {file.content_type}")
    
    if file.filename == '':
        return jsonify({"success": False, "error": "文件名为空"}), 400
    
    # 检查是否为zip文件
    if not file.filename.lower().endswith('.zip'):
        return jsonify({"success": False, "error": "请上传zip格式文件"}), 400
    
    # 保存zip文件到临时位置
    import tempfile
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.zip')
    try:
        file.save(temp_file.name)
        temp_file.close()
        
        file_size = os.path.getsize(temp_file.name)
        logger.info(f"zip文件已保存到临时位置: {temp_file.name}, 大小: {file_size} bytes")
        
        # 处理zip文件
        result = raw_material_manager.process_zip_upload(project_id, temp_file.name)
        
        logger.info(f"zip处理结果: success={result.get('success')}, files={len(result.get('data', {}).get('files', []))}")
        
        return jsonify(result)
        
    except Exception as e:
        error_msg = f"处理zip上传失败: {e}\n{traceback.format_exc()}"
        logger.error(error_msg)
        return jsonify({"success": False, "error": str(e)}), 500
    
    finally:
        # 清理临时文件
        try:
            os.unlink(temp_file.name)
        except:
            pass


@app.route('/api/projects/<project_id>/material-collection/files/<int:file_id>', methods=['DELETE'])
def delete_material_file(project_id, file_id):
    """删除材料文件"""
    if not raw_material_manager:
        return jsonify({"success": False, "error": "服务未初始化"}), 500
    
    result = raw_material_manager.delete_material_file(file_id)
    return jsonify(result)


@app.route('/api/projects/<project_id>/material-collection/download-all', methods=['GET'])
def download_all_materials(project_id):
    """
    打包下载项目所有材料
    按分类建立文件夹，将文件放入对应分类，打包成ZIP下载
    """
    import zipfile
    import tempfile
    import shutil
    import sqlite3
    
    if not raw_material_manager:
        return jsonify({"success": False, "error": "服务未初始化"}), 500
    
    try:
        # 获取项目信息
        project_result = db.get_project(project_id=project_id) if db else None
        client_name = "unknown"
        if project_result and project_result.get("success"):
            client_name = project_result.get("data", {}).get("client_name", project_id)
        
        # 安全处理客户名称（保留中文、字母、数字、空格、连字符、下划线）
        import re
        # 保留Unicode字母数字（包括中文）、空格、连字符、下划线
        safe_client_name = re.sub(r'[^\w\s\-]', '', client_name, flags=re.UNICODE).strip()
        # 替换文件名中不允许的字符
        safe_client_name = safe_client_name.replace('/', '_').replace('\\', '_')
        if not safe_client_name:
            safe_client_name = project_id
        
        # 获取材料分类结构
        from services.raw_material_manager import MATERIAL_CATEGORIES
        
        # 从数据库获取项目的所有材料文件
        conn = sqlite3.connect(raw_material_manager.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT mf.*, mc.item_id as mc_item_id
            FROM material_files mf
            LEFT JOIN material_collection mc 
            ON mf.project_id = mc.project_id 
            AND mf.category_id = mc.category_id 
            AND mf.item_id = mc.item_id
            WHERE mf.project_id = ?
        ''', (project_id,))
        
        files = cursor.fetchall()
        conn.close()
        
        if not files:
            return jsonify({"success": False, "error": "该项目暂无材料文件"}), 404
        
        # 创建临时目录
        temp_dir = tempfile.mkdtemp()
        zip_base_dir = os.path.join(temp_dir, f"{safe_client_name}_材料")
        os.makedirs(zip_base_dir, exist_ok=True)
        
        files_copied = 0
        errors = []
        
        # 遍历文件并按分类组织
        for file_row in files:
            category_id = file_row['category_id']
            item_id = file_row['item_id']
            file_path = file_row['file_path']
            file_name = file_row['file_name']
            
            # 获取标签名称（优先使用item名称，与页面显示一致）
            folder_name = "其他材料"
            
            if category_id in MATERIAL_CATEGORIES:
                cat = MATERIAL_CATEGORIES[category_id]
                category_name = cat.get('name', category_id)
                # 查找item名称作为文件夹名
                for item in cat.get('items', []):
                    if item.get('item_id') == item_id:
                        folder_name = item.get('name', category_name)
                        break
                else:
                    # 如果找不到对应的item，使用category名称
                    folder_name = category_name
            
            # 创建文件夹（使用item标签名称，如"护照"、"学历学位证书"）
            folder_path = os.path.join(zip_base_dir, folder_name)
            os.makedirs(folder_path, exist_ok=True)
            
            # 复制文件
            if os.path.exists(file_path):
                dest_path = os.path.join(folder_path, file_name)
                # 处理同名文件
                if os.path.exists(dest_path):
                    base, ext = os.path.splitext(file_name)
                    counter = 1
                    while os.path.exists(dest_path):
                        dest_path = os.path.join(folder_path, f"{base}_{counter}{ext}")
                        counter += 1
                
                shutil.copy2(file_path, dest_path)
                files_copied += 1
            else:
                errors.append(f"文件不存在: {file_name}")
        
        if files_copied == 0:
            shutil.rmtree(temp_dir)
            return jsonify({"success": False, "error": "没有可下载的文件"}), 404
        
        # 创建ZIP文件
        zip_filename = f"{safe_client_name}_材料_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"
        zip_path = os.path.join(temp_dir, zip_filename)
        
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files_in_dir in os.walk(zip_base_dir):
                for file in files_in_dir:
                    file_full_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_full_path, zip_base_dir)
                    zipf.write(file_full_path, arcname)
        
        logger.info(f"材料打包完成: {zip_path}, 共 {files_copied} 个文件")
        
        # 发送文件
        response = send_file(
            zip_path,
            mimetype='application/zip',
            as_attachment=True,
            download_name=zip_filename
        )
        
        # 注册清理回调（在响应发送后清理临时文件）
        @response.call_on_close
        def cleanup():
            try:
                shutil.rmtree(temp_dir)
            except Exception as e:
                logger.warning(f"清理临时目录失败: {e}")
        
        return response
        
    except Exception as e:
        logger.error(f"打包下载材料失败: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/projects/<project_id>/materials/<int:file_id>/tags', methods=['PUT'])
def update_material_tags(project_id, file_id):
    """更新材料文件的分类标签"""
    if not raw_material_manager:
        return jsonify({"success": False, "error": "服务未初始化"}), 500
    
    data = request.get_json()
    tags = data.get('tags', [])
    
    # 目前只支持单标签，取最后一个标签（最新添加的）
    if tags:
        category_id = tags[-1].get('category_id', '')
        item_id = tags[-1].get('item_id', '')
    else:
        category_id = ''
        item_id = ''
    
    result = raw_material_manager.update_material_tags(file_id, category_id, item_id)
    return jsonify(result)


@app.route('/api/projects/<project_id>/material-collection/forms/<form_type>', methods=['POST'])
def save_project_form(project_id, form_type):
    """保存项目采集表单"""
    if not raw_material_manager:
        return jsonify({"success": False, "error": "服务未初始化"}), 500
    
    data = request.get_json()
    form_data = data.get('form_data', {})
    form_index = data.get('form_index', 0)
    
    result = raw_material_manager.save_form_data(
        project_id=project_id,
        form_type=form_type,
        form_data=form_data,
        form_index=form_index
    )
    return jsonify(result)


@app.route('/api/files/preview/<int:file_id>', methods=['GET'])
def preview_material_file(file_id):
    """预览/下载材料文件"""
    if not raw_material_manager:
        return jsonify({"success": False, "error": "服务未初始化"}), 500
    
    try:
        # 从数据库获取文件信息
        import sqlite3
        conn = sqlite3.connect(raw_material_manager.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM material_files WHERE id = ?', (file_id,))
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            return jsonify({"success": False, "error": "文件不存在"}), 404
        
        file_path = row['file_path']
        file_name = row['file_name']
        file_type = row['file_type']
        
        if not os.path.exists(file_path):
            return jsonify({"success": False, "error": "文件已被删除"}), 404
        
        # 设置MIME类型
        mime_types = {
            'pdf': 'application/pdf',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'ppt': 'application/vnd.ms-powerpoint',
            'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'txt': 'text/plain',
        }
        
        mime_type = mime_types.get(file_type.lower(), 'application/octet-stream')
        
        # 返回文件
        return send_file(
            file_path,
            mimetype=mime_type,
            as_attachment=False,
            download_name=file_name
        )
        
    except Exception as e:
        logger.error(f"预览文件失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/projects/<project_id>/material-collection/forms/<form_type>', methods=['GET'])
def get_project_form(project_id, form_type):
    """获取项目采集表单数据"""
    if not raw_material_manager:
        return jsonify({"success": False, "error": "服务未初始化"}), 500
    
    form_index = request.args.get('form_index', 0, type=int)
    result = raw_material_manager.get_form_data(project_id, form_type, form_index)
    return jsonify(result)


@app.route('/api/projects/<project_id>/material-collection/forms', methods=['GET'])
def get_project_all_forms(project_id):
    """获取项目所有表单数据"""
    if not raw_material_manager:
        return jsonify({"success": False, "error": "服务未初始化"}), 500
    
    result = raw_material_manager.get_all_forms(project_id)
    return jsonify(result)


@app.route('/api/projects/<project_id>/material-collection/check', methods=['GET'])
def check_material_completeness(project_id):
    """检查材料完整性"""
    if not raw_material_manager:
        return jsonify({"success": False, "error": "服务未初始化"}), 500
    
    result = raw_material_manager.check_completeness(project_id)
    return jsonify(result)


@app.route('/api/projects/<project_id>/material-collection/export', methods=['GET'])
def export_material_checklist(project_id):
    """导出材料收集清单（Markdown格式）"""
    if not raw_material_manager:
        return jsonify({"success": False, "error": "服务未初始化"}), 500
    
    result = raw_material_manager.export_checklist(project_id)
    return jsonify(result)


@app.route('/api/projects/<project_id>/material-collection/export-word', methods=['GET'])
def export_material_checklist_word(project_id):
    """导出材料收集清单（Word文档，可打印）"""
    if not raw_material_manager:
        return jsonify({"success": False, "error": "服务未初始化"}), 500
    
    # 获取客户名称
    client_name = request.args.get('client_name', '')
    if not client_name and db:
        project_result = db.get_project(project_id=project_id)
        if project_result.get("success") and project_result.get("data"):
            client_name = project_result["data"].get("client_name", "")
    
    result = raw_material_manager.generate_checklist_document(project_id, client_name)
    
    if result.get("success"):
        file_path = result["data"]["file_path"]
        filename = result["data"]["filename"]
        return send_file(
            file_path,
            as_attachment=True,
            download_name=filename,
            mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
    
    return jsonify(result)


@app.route('/api/material-collection/templates/<form_type>/download', methods=['GET'])
def download_form_template(form_type):
    """下载采集表模板"""
    if not raw_material_manager:
        return jsonify({"success": False, "error": "服务未初始化"}), 500
    
    result = raw_material_manager.generate_form_template(form_type)
    
    if result.get("success"):
        file_path = result["data"]["file_path"]
        filename = result["data"]["filename"]
        return send_file(
            file_path,
            as_attachment=True,
            download_name=filename,
            mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
    
    return jsonify(result)


@app.route('/api/material-collection/templates/download-all', methods=['GET'])
def download_all_form_templates():
    """下载所有采集表模板（打包）"""
    if not raw_material_manager:
        return jsonify({"success": False, "error": "服务未初始化"}), 500
    
    import zipfile
    import tempfile
    
    result = raw_material_manager.generate_all_templates()
    
    if result.get("success"):
        output_dir = result["data"]["output_dir"]
        
        # 创建zip文件
        zip_filename = f'GTV采集表模板_{datetime.now().strftime("%Y%m%d")}.zip'
        zip_path = os.path.join(tempfile.gettempdir(), zip_filename)
        
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for r in result["data"]["results"]:
                if r.get("success") and r.get("filename"):
                    file_path = os.path.join(output_dir, r["filename"])
                    if os.path.exists(file_path):
                        zipf.write(file_path, r["filename"])
        
        return send_file(
            zip_path,
            as_attachment=True,
            download_name=zip_filename,
            mimetype='application/zip'
        )
    
    return jsonify(result)


# ==================== 材料分析 API ====================

@app.route('/api/projects/<project_id>/analysis', methods=['GET'])
def get_project_analysis(project_id):
    """获取项目分析结果"""
    try:
        if not material_analyzer:
            return jsonify({"success": False, "error": "分析服务未初始化"}), 500
        
        result = material_analyzer.get_analysis_result(project_id)
        
        if result:
            # 生成思维导图数据
            mindmap = material_analyzer.generate_mindmap_data(
                result["framework"],
                ""
            )
            return jsonify({
                "success": True,
                "data": {
                    **result,
                    "mindmap": mindmap
                }
            })
        else:
            return jsonify({"success": False, "error": "未找到分析结果，请先进行分析"})
            
    except Exception as e:
        logger.error(f"获取分析结果失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


# ==================== 内容提取 API ====================

@app.route('/api/projects/<project_id>/extract', methods=['POST'])
def extract_project_content(project_id):
    """提取项目所有文件内容"""
    try:
        if not content_extraction_agent:
            return jsonify({"success": False, "error": "内容提取器未初始化"}), 500
        
        result = content_extraction_agent.extract_project_files(project_id)
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"提取内容失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/projects/<project_id>/extraction-logs', methods=['GET'])
def get_extraction_logs(project_id):
    """获取项目的提取日志，包含提示词和过程详情"""
    try:
        if not content_extraction_agent:
            return jsonify({"success": False, "error": "内容提取器未初始化"}), 500
        
        logs = content_extraction_agent.get_extraction_logs(project_id)
        return jsonify({
            "success": True,
            "data": logs,
            "total": len(logs)
        })
        
    except Exception as e:
        logger.error(f"获取提取日志失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/projects/<project_id>/framework-logs', methods=['GET'])
def get_framework_logs(project_id):
    """获取项目的框架构建日志"""
    try:
        if not framework_building_agent:
            return jsonify({"success": False, "error": "框架构建Agent未初始化"}), 500
        
        # 尝试从 framework_building_agent 获取日志
        if hasattr(framework_building_agent, 'get_framework_logs'):
            logs = framework_building_agent.get_framework_logs(project_id)
        else:
            # 如果没有专门的日志方法，返回空数组
            logs = []
        
        return jsonify({
            "success": True,
            "data": logs,
            "total": len(logs)
        })
        
    except Exception as e:
        logger.error(f"获取框架日志失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/projects/<project_id>/context', methods=['GET'])
def get_project_context(project_id):
    """获取项目完整上下文"""
    try:
        if not content_extraction_agent:
            return jsonify({"success": False, "error": "内容提取器未初始化"}), 500
        
        with_sources = request.args.get('with_sources', 'false').lower() == 'true'
        result = content_extraction_agent.get_project_context(project_id, with_sources=with_sources)
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"获取上下文失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/projects/<project_id>/outline', methods=['GET'])
def get_content_outline(project_id):
    """
    获取项目的内容大纲
    
    内容大纲包含：
    - 文件清单：每个文件的主要内容摘要
    - 关键词云：所有材料的核心关键词
    - 信息脉络：申请人的主要经历、成就、证据线索
    - 材料评估：各类证据的覆盖情况
    """
    try:
        if not content_extraction_agent:
            return jsonify({"success": False, "error": "内容提取器未初始化"}), 500
        
        result = content_extraction_agent.get_content_outline(project_id)
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"获取内容大纲失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/projects/<project_id>/outline/generate', methods=['POST'])
def generate_content_outline(project_id):
    """
    重新生成项目的内容大纲
    
    当需要刷新大纲或修改材料后调用
    """
    try:
        if not content_extraction_agent:
            return jsonify({"success": False, "error": "内容提取器未初始化"}), 500
        
        result = content_extraction_agent.generate_content_outline(project_id)
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"生成内容大纲失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/projects/<project_id>/deduplicate', methods=['POST'])
def deduplicate_content(project_id):
    """
    清理项目中的重复内容
    
    检查并删除完全相同或高度相似的内容，减少上下文长度
    """
    try:
        if not content_extraction_agent:
            return jsonify({"success": False, "error": "内容提取器未初始化"}), 500
        
        result = content_extraction_agent.deduplicate_content(project_id)
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"清理重复内容失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


# ==================== 内容分类 API ====================

@app.route('/api/projects/<project_id>/classify', methods=['POST'])
def classify_content(project_id):
    """
    对项目提取的内容进行自动分类
    
    使用AI分析每个内容块，自动分类到MC/OC标准和推荐人信息类别
    """
    try:
        if not content_extraction_agent:
            return jsonify({"success": False, "error": "内容提取器未初始化"}), 500
        
        result = content_extraction_agent.classify_content(project_id)
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"内容分类失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/projects/<project_id>/classifications', methods=['GET'])
def get_classifications(project_id):
    """
    获取项目的分类结果
    
    可选参数：
    - category: 指定类别（MC/OC/RECOMMENDER）
    """
    try:
        if not content_extraction_agent:
            return jsonify({"success": False, "error": "内容提取器未初始化"}), 500
        
        category = request.args.get('category')
        result = content_extraction_agent.get_classifications(project_id, category)
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"获取分类结果失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/projects/<project_id>/classification-summary', methods=['GET'])
def get_classification_summary(project_id):
    """
    获取项目的分类统计摘要
    """
    try:
        if not content_extraction_agent:
            return jsonify({"success": False, "error": "内容提取器未初始化"}), 500
        
        result = content_extraction_agent.get_classification_summary(project_id)
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"获取分类摘要失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/projects/<project_id>/classification-progress', methods=['GET'])
def get_classification_progress(project_id):
    """
    获取分类进度
    """
    try:
        if not content_extraction_agent:
            return jsonify({"success": False, "error": "内容提取器未初始化"}), 500
        
        result = content_extraction_agent.get_classification_progress(project_id)
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"获取分类进度失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/projects/<project_id>/classifications/<int:classification_id>', methods=['PUT'])
def update_classification(project_id, classification_id):
    """
    更新单个分类项
    """
    try:
        if not content_extraction_agent:
            return jsonify({"success": False, "error": "内容提取器未初始化"}), 500
        
        data = request.get_json()
        result = content_extraction_agent.update_classification(project_id, classification_id, data)
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"更新分类失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/projects/<project_id>/classifications/<int:classification_id>', methods=['DELETE'])
def delete_classification(project_id, classification_id):
    """
    删除单个分类项
    """
    try:
        if not content_extraction_agent:
            return jsonify({"success": False, "error": "内容提取器未初始化"}), 500
        
        result = content_extraction_agent.delete_classification(project_id, classification_id)
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"删除分类失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/projects/<project_id>/classifications', methods=['POST'])
def add_classification(project_id):
    """
    手动添加分类项
    """
    try:
        if not content_extraction_agent:
            return jsonify({"success": False, "error": "内容提取器未初始化"}), 500
        
        data = request.get_json()
        result = content_extraction_agent.add_classification(project_id, data)
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"添加分类失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/projects/<project_id>/content-blocks', methods=['GET'])
def get_content_blocks(project_id):
    """获取项目内容块列表"""
    try:
        if not content_extraction_agent:
            return jsonify({"success": False, "error": "内容提取器未初始化"}), 500
        
        file_id = request.args.get('file_id', type=int)
        content_type = request.args.get('content_type')
        
        result = content_extraction_agent.get_content_blocks(project_id, file_id, content_type)
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"获取内容块失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/projects/<project_id>/content/search', methods=['GET'])
def search_content(project_id):
    """搜索项目内容"""
    try:
        if not content_extraction_agent:
            return jsonify({"success": False, "error": "内容提取器未初始化"}), 500
        
        keyword = request.args.get('keyword', '')
        if not keyword:
            return jsonify({"success": False, "error": "缺少搜索关键词"}), 400
        
        result = content_extraction_agent.search_content(project_id, keyword)
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"搜索内容失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


# ==================== 客户信息脉络图 API ====================

@app.route('/api/projects/<project_id>/analyze-profile', methods=['POST'])
def analyze_client_profile(project_id):
    """生成/更新客户信息脉络图"""
    try:
        if not framework_building_agent:
            return jsonify({"success": False, "error": "框架构建Agent未初始化"}), 500
        
        # 获取项目上下文
        context_result = content_extraction_agent.get_project_context(project_id, with_sources=True)
        if not context_result.get("success") or not context_result.get("data", {}).get("context"):
            # 如果没有上下文，先进行提取
            extract_result = content_extraction_agent.extract_project_files(project_id)
            if not extract_result.get("success"):
                return jsonify({"success": False, "error": "请先上传并提取材料内容"}), 400
            context_result = content_extraction_agent.get_project_context(project_id, with_sources=True)
        
        context = context_result.get("data", {}).get("context", "")
        
        # 使用框架构建Agent生成客户信息脉络图
        result = framework_building_agent.analyze_client_profile(project_id, context)
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"生成信息脉络图失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/projects/<project_id>/profile-map', methods=['GET'])
def get_profile_map(project_id):
    """获取客户信息脉络图"""
    try:
        if not framework_building_agent:
            return jsonify({"success": False, "error": "框架构建Agent未初始化"}), 500
        
        result = framework_building_agent.get_profile(project_id)
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"获取信息脉络图失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


# ==================== GTV框架 API ====================

@app.route('/api/projects/<project_id>/build-framework', methods=['POST'])
def build_gtv_framework(project_id):
    """
    生成GTV申请框架
    
    策略：
    1. 优先使用完整上下文（包含详细材料内容，AI能准确分析MC/OC证据）
    2. 如果完整上下文过长（>50000字符），则使用大纲+部分详细内容的混合模式
    3. 大纲只作为概览，不能替代详细的材料内容
    """
    try:
        if not framework_building_agent:
            return jsonify({"success": False, "error": "框架构建Agent未初始化"}), 500
        
        context = ""
        context_mode = "unknown"
        MAX_CONTEXT_LENGTH = 100000  # 最大上下文长度阈值（约100K字符，适合大多数LLM）
        
        # 首先获取完整上下文（包含详细材料内容）
        context_result = content_extraction_agent.get_project_context(project_id, with_sources=True)
        context_data = context_result.get("data") if context_result else {}
        full_context = context_data.get("context", "") if context_data else ""
        
        if full_context:
            if len(full_context) <= MAX_CONTEXT_LENGTH:
                # 完整上下文在合理范围内，直接使用
                context = full_context
                context_mode = "full"
                logger.info(f"使用完整上下文生成框架，长度: {len(context)} 字符")
            else:
                # 上下文过长，使用混合模式：大纲概览 + 截断的详细内容
                outline_result = content_extraction_agent.get_content_outline(project_id)
                if outline_result and outline_result.get("success") and outline_result.get("data"):
                    outline_data = outline_result.get("data", {}).get("outline", {})
                    if outline_data:
                        outline_context = _outline_to_context(outline_data)
                        # 混合模式：大纲 + 部分详细内容
                        remaining_length = MAX_CONTEXT_LENGTH - len(outline_context) - 500
                        if remaining_length > 5000:
                            context = f"""=== 材料概览（大纲）===
{outline_context}

=== 详细材料内容（部分）===
{full_context[:remaining_length]}
...[内容过长，已截断]..."""
                            context_mode = "hybrid"
                        else:
                            context = full_context[:MAX_CONTEXT_LENGTH]
                            context_mode = "truncated"
                else:
                    # 没有大纲，直接截断完整上下文
                    context = full_context[:MAX_CONTEXT_LENGTH]
                    context_mode = "truncated"
                logger.info(f"使用{context_mode}模式生成框架，长度: {len(context)} 字符")
        
        if not context:
            # 如果没有上下文，先进行提取
            extract_result = content_extraction_agent.extract_project_files(project_id)
            if extract_result and extract_result.get("success"):
                # 提取后重新获取完整上下文
                context_result = content_extraction_agent.get_project_context(project_id, with_sources=True)
                context_data = context_result.get("data") if context_result else {}
                context = context_data.get("context", "") if context_data else ""
                context_mode = "extracted"
                
                # 如果仍然太长，截断
                if len(context) > MAX_CONTEXT_LENGTH:
                    context = context[:MAX_CONTEXT_LENGTH]
                    context_mode = "extracted_truncated"
        
        # 获取信息脉络图
        profile_result = framework_building_agent.get_profile(project_id)
        profile_data = None
        if profile_result and profile_result.get("success"):
            profile_data_wrapper = profile_result.get("data")
            if profile_data_wrapper:
                profile_data = profile_data_wrapper.get("profile")
        
        # 生成框架
        result = framework_building_agent.build_framework(project_id, context, profile_data)
        
        # 在结果中添加上下文模式信息
        if result.get("success") and result.get("data"):
            result["data"]["_metadata"] = result["data"].get("_metadata", {})
            result["data"]["_metadata"]["context_mode"] = context_mode
            result["data"]["_metadata"]["context_length"] = len(context)
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"生成GTV框架失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/projects/<project_id>/framework', methods=['GET'])
def get_gtv_framework(project_id):
    """获取GTV框架"""
    try:
        if not framework_building_agent:
            return jsonify({"success": False, "error": "框架构建Agent未初始化"}), 500
        
        result = framework_building_agent.get_framework(project_id)
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"获取GTV框架失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/projects/<project_id>/framework', methods=['PUT'])
def update_gtv_framework(project_id):
    """更新GTV框架"""
    try:
        if not framework_building_agent:
            return jsonify({"success": False, "error": "框架构建Agent未初始化"}), 500
        
        updates = request.get_json() or {}
        result = framework_building_agent.update_framework(project_id, updates)
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"更新GTV框架失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/projects/<project_id>/framework/export', methods=['GET'])
def export_gtv_framework(project_id):
    """导出GTV框架"""
    try:
        if not framework_building_agent:
            return jsonify({"success": False, "error": "框架构建Agent未初始化"}), 500
        
        export_format = request.args.get('format', 'markdown')
        
        framework_result = framework_building_agent.get_framework(project_id)
        if not framework_result.get("success") or not framework_result.get("data"):
            return jsonify({"success": False, "error": "未找到框架数据"}), 404
        
        framework_data = framework_result["data"]["framework_data"]
        
        if export_format == 'markdown':
            markdown = framework_building_agent.export_markdown(framework_data)
            return jsonify({
                "success": True,
                "data": {"format": "markdown", "content": markdown}
            })
        else:
            return jsonify({"success": False, "error": f"不支持的导出格式: {export_format}"}), 400
        
    except Exception as e:
        logger.error(f"导出框架失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


# ==================== Agent配置 API ====================

@app.route('/api/projects/<project_id>/packages/<package_type>/agent-config', methods=['GET'])
def get_agent_config(project_id, package_type):
    """获取Agent配置"""
    try:
        result = db.get_agent_prompt(project_id, package_type)
        
        if result.get("success") and not result.get("data"):
            default_prompts = {
                "personal_statement": "你是一位专业的GTV签证个人陈述撰写专家...",
                "cv": "你是一位专业的简历优化专家...",
                "rl_1": "你是一位专业的推荐信撰写专家...",
            }
            result["data"] = {
                "project_id": project_id,
                "package_type": package_type,
                "system_prompt": default_prompts.get(package_type, "你是一位专业的文案撰写专家..."),
                "user_prompt_template": None,
                "custom_instructions": None
            }
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"获取Agent配置失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/projects/<project_id>/packages/<package_type>/agent-config', methods=['PUT'])
def update_agent_config(project_id, package_type):
    """更新Agent配置"""
    try:
        data = request.get_json() or {}
        result = db.save_agent_prompt(
            project_id, package_type,
            system_prompt=data.get("system_prompt"),
            user_prompt_template=data.get("user_prompt_template"),
            custom_instructions=data.get("custom_instructions")
        )
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"更新Agent配置失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


# ============ 系统提示词管理 ============

def _ensure_system_prompts_table():
    """确保系统提示词表存在并初始化默认数据"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS system_prompts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                type TEXT NOT NULL,
                description TEXT,
                content TEXT NOT NULL,
                version INTEGER DEFAULT 1,
                is_active INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # 检查是否需要添加 version 列（数据库迁移）
        cursor.execute("PRAGMA table_info(system_prompts)")
        columns = [row[1] for row in cursor.fetchall()]
        if 'version' not in columns:
            cursor.execute('ALTER TABLE system_prompts ADD COLUMN version INTEGER DEFAULT 1')
            logger.info("已添加 system_prompts.version 列")
        
        # 默认提示词列表（放在条件外以便两个分支都能访问）
        default_prompts = [
                {
                    "name": "英文翻译提示词",
                    "type": "translation",
                    "description": "将英文内容翻译为中文，同时保留英文原文",
                    "content": """请将以下英文内容翻译成中文。

来源文件: {source_file}

英文原文:
{content}

请按以下JSON格式返回：
{{
    "chinese_translation": "翻译后的中文内容",
    "key_info": {{
        "summary": "一句话中文摘要",
        "key_points": ["要点1", "要点2"],
        "achievements": ["成就/奖项"],
        "numbers": ["关键数据"]
    }}
}}

翻译要求：
1. 保持专业术语的准确性
2. 人名保留英文，公司名/学校名可添加中文注释
3. 保持原文的结构和层次
4. 只返回JSON格式，不要其他文字"""
                },
                {
                    "name": "内容增强提示词",
                    "type": "enhancement",
                    "description": "从提取的内容中识别关键信息和实体",
                    "content": """请分析以下文档内容，提取关键信息。

文档内容:
{content}

请按以下JSON格式返回：
{{
    "summary": "内容摘要（100字以内）",
    "key_entities": {{
        "persons": ["人名列表"],
        "organizations": ["机构/公司列表"],
        "achievements": ["成就/奖项列表"],
        "numbers": ["关键数字和日期"]
    }},
    "document_type": "文档类型（简历/推荐信/证书/其他）",
    "relevance_score": 0.8
}}

只返回JSON格式，不要其他文字。"""
                },
                {
                    "name": "GTV框架生成提示词",
                    "type": "framework",
                    "description": "根据材料生成GTV申请框架（主提示词）",
                    "content": """基于以下申请人材料，生成GTV签证申请框架。

申请人资料:
{profile}

材料摘要:
{materials_summary}

请分析申请人是否符合以下标准：
1. MC必选标准 - 杰出人才认可
2. OC可选标准（需选择2项）
   - OC1: 创新创业记录
   - OC2: 行业贡献证明
   - OC3: 专业成就认可
   - OC4: 学术/研究贡献

请返回详细的框架分析和建议。"""
                },
                # 框架构建 - 领域定位
                {
                    "name": "领域定位分析",
                    "type": "framework_domain",
                    "description": "分析申请人的专业领域和岗位定位",
                    "content": """你是GTV签证专家。请根据以下申请人材料，分析其领域定位。

申请人：{client_name}

材料内容：
{context}

请严格根据材料内容分析，不要杜撰信息。按以下JSON格式返回：
{{
    "评估机构": "Tech Nation",
    "细分领域": "根据材料确定的具体技术/商业领域（如AI、金融科技、数字健康等）",
    "岗位定位": "根据材料确定的专业定位（如技术领导者、创业者、研究专家）",
    "核心论点": "一句话概括申请人的独特价值，必须基于材料中的事实",
    "申请路径": "Exceptional Talent（5年+经验）或 Exceptional Promise（早期职业）",
    "source_files": ["用于判断的来源文件列表"]
}}

重要：所有结论必须基于材料中的实际内容，标注来源文件。"""
                },
                # 框架构建 - MC1
                {
                    "name": "MC1产品团队领导力分析",
                    "type": "framework_mc1",
                    "description": "分析MC1标准：领导产品导向的数字科技公司/产品/团队增长",
                    "content": """你是GTV签证专家。请根据以下申请人材料，分析其是否符合MC1标准。

标准描述：领导产品导向的数字科技公司/产品/团队增长的证据

申请人：{client_name}

材料内容：
{context}

请严格根据材料分析，按以下JSON格式返回：
{{
    "评分": "1-5分（5分最高）",
    "适用性": "高/中/低",
    "核心证据": [
        {{
            "证据描述": "具体证据内容，必须来自材料",
            "来源": "来源文件名",
            "强度": "强/中/弱"
        }}
    ],
    "缺失点": ["需要补充的证据"],
    "建议": "如何增强这个标准的建议",
    "source_files": ["所有相关来源文件"]
}}

重要：不要杜撰任何信息，所有内容必须有材料依据。"""
                },
                # 框架构建 - MC2
                {
                    "name": "MC2商业发展分析",
                    "type": "framework_mc2",
                    "description": "分析MC2标准：领导营销或业务开发，实现收入/客户增长",
                    "content": """你是GTV签证专家。请根据以下申请人材料，分析其是否符合MC2标准。

标准描述：领导营销或业务开发，实现收入/客户增长的证据

申请人：{client_name}

材料内容：
{context}

请严格根据材料分析，按以下JSON格式返回：
{{
    "评分": "1-5分（5分最高）",
    "适用性": "高/中/低",
    "核心证据": [
        {{
            "证据描述": "具体证据内容，必须来自材料",
            "来源": "来源文件名",
            "强度": "强/中/弱"
        }}
    ],
    "缺失点": ["需要补充的证据"],
    "建议": "如何增强这个标准的建议",
    "source_files": ["所有相关来源文件"]
}}

重要：不要杜撰任何信息，所有内容必须有材料依据。"""
                },
                # 框架构建 - MC3
                {
                    "name": "MC3非营利组织分析",
                    "type": "framework_mc3",
                    "description": "分析MC3标准：领导数字科技领域非营利组织或社会企业",
                    "content": """你是GTV签证专家。请根据以下申请人材料，分析其是否符合MC3标准。

标准描述：领导数字科技领域非营利组织或社会企业的证据

申请人：{client_name}

材料内容：
{context}

请严格根据材料分析，按以下JSON格式返回：
{{
    "评分": "1-5分（5分最高）",
    "适用性": "高/中/低",
    "核心证据": [
        {{
            "证据描述": "具体证据内容，必须来自材料",
            "来源": "来源文件名",
            "强度": "强/中/弱"
        }}
    ],
    "缺失点": ["需要补充的证据"],
    "建议": "如何增强这个标准的建议",
    "source_files": ["所有相关来源文件"]
}}

重要：不要杜撰任何信息，所有内容必须有材料依据。"""
                },
                # 框架构建 - MC4
                {
                    "name": "MC4专家评审分析",
                    "type": "framework_mc4",
                    "description": "分析MC4标准：担任评审同行工作的重要专家角色",
                    "content": """你是GTV签证专家。请根据以下申请人材料，分析其是否符合MC4标准。

标准描述：担任评审同行工作的重要专家角色的证据

申请人：{client_name}

材料内容：
{context}

请严格根据材料分析，按以下JSON格式返回：
{{
    "评分": "1-5分（5分最高）",
    "适用性": "高/中/低",
    "核心证据": [
        {{
            "证据描述": "具体证据内容，必须来自材料",
            "来源": "来源文件名",
            "强度": "强/中/弱"
        }}
    ],
    "缺失点": ["需要补充的证据"],
    "建议": "如何增强这个标准的建议",
    "source_files": ["所有相关来源文件"]
}}

重要：不要杜撰任何信息，所有内容必须有材料依据。"""
                },
                # 框架构建 - OC1
                {
                    "name": "OC1创新分析",
                    "type": "framework_oc1",
                    "description": "分析OC1标准：创新、创业或专利相关证据",
                    "content": """你是GTV签证专家。请根据以下申请人材料，分析其是否符合OC1标准。

标准描述：创新、创业记录，包括创办公司、专利发明、技术突破等

申请人：{client_name}

材料内容：
{context}

请严格根据材料分析，按以下JSON格式返回：
{{
    "评分": "1-5分（5分最高）",
    "适用性": "高/中/低",
    "核心证据": [
        {{
            "证据描述": "具体证据内容，必须来自材料",
            "来源": "来源文件名",
            "强度": "强/中/弱"
        }}
    ],
    "缺失点": ["需要补充的证据"],
    "建议": "如何增强这个标准的建议",
    "source_files": ["所有相关来源文件"]
}}

重要：不要杜撰任何信息，所有内容必须有材料依据。"""
                },
                # 框架构建 - OC2
                {
                    "name": "OC2行业认可分析",
                    "type": "framework_oc2",
                    "description": "分析OC2标准：行业认可、奖项、媒体报道",
                    "content": """你是GTV签证专家。请根据以下申请人材料，分析其是否符合OC2标准。

标准描述：行业认可的证据，包括奖项、媒体报道、行业排名等

申请人：{client_name}

材料内容：
{context}

请严格根据材料分析，按以下JSON格式返回：
{{
    "评分": "1-5分（5分最高）",
    "适用性": "高/中/低",
    "核心证据": [
        {{
            "证据描述": "具体证据内容，必须来自材料",
            "来源": "来源文件名",
            "强度": "强/中/弱"
        }}
    ],
    "缺失点": ["需要补充的证据"],
    "建议": "如何增强这个标准的建议",
    "source_files": ["所有相关来源文件"]
}}

重要：不要杜撰任何信息，所有内容必须有材料依据。"""
                },
                # 框架构建 - OC3
                {
                    "name": "OC3重大贡献分析",
                    "type": "framework_oc3",
                    "description": "分析OC3标准：对行业/公司/开源项目的重大贡献",
                    "content": """你是GTV签证专家。请根据以下申请人材料，分析其是否符合OC3标准。

标准描述：对行业、公司或开源项目的重大贡献

申请人：{client_name}

材料内容：
{context}

请严格根据材料分析，按以下JSON格式返回：
{{
    "评分": "1-5分（5分最高）",
    "适用性": "高/中/低",
    "核心证据": [
        {{
            "证据描述": "具体证据内容，必须来自材料",
            "来源": "来源文件名",
            "强度": "强/中/弱"
        }}
    ],
    "缺失点": ["需要补充的证据"],
    "建议": "如何增强这个标准的建议",
    "source_files": ["所有相关来源文件"]
}}

重要：不要杜撰任何信息，所有内容必须有材料依据。"""
                },
                # 框架构建 - OC4
                {
                    "name": "OC4学术贡献分析",
                    "type": "framework_oc4",
                    "description": "分析OC4标准：学术论文、研究成果、技术演讲",
                    "content": """你是GTV签证专家。请根据以下申请人材料，分析其是否符合OC4标准。

标准描述：学术/研究贡献，包括论文发表、会议演讲、技术分享等

申请人：{client_name}

材料内容：
{context}

请严格根据材料分析，按以下JSON格式返回：
{{
    "评分": "1-5分（5分最高）",
    "适用性": "高/中/低",
    "核心证据": [
        {{
            "证据描述": "具体证据内容，必须来自材料",
            "来源": "来源文件名",
            "强度": "强/中/弱"
        }}
    ],
    "缺失点": ["需要补充的证据"],
    "建议": "如何增强这个标准的建议",
    "source_files": ["所有相关来源文件"]
}}

重要：不要杜撰任何信息，所有内容必须有材料依据。"""
                },
                # 框架构建 - 推荐人分析
                {
                    "name": "推荐人分析",
                    "type": "framework_recommenders",
                    "description": "从材料中识别和分析潜在推荐人",
                    "content": """你是GTV签证专家。请根据以下申请人材料，识别潜在的推荐人。

申请人：{client_name}

材料内容：
{context}

请在材料中寻找：
1. 简历中提到的上级、合作者
2. 推荐信的作者
3. 材料中提到的行业专家、投资人

按以下JSON格式返回：
{{
    "推荐人列表": [
        {{
            "姓名": "推荐人姓名",
            "职位": "当前职位",
            "机构": "所在机构",
            "与申请人关系": "工作关系描述",
            "推荐价值": "高/中/低",
            "推荐角度": "可以从什么角度推荐申请人",
            "source_file": "信息来源文件"
        }}
    ],
    "推荐人缺口": ["还需要什么类型的推荐人"],
    "建议": "推荐人策略建议"
}}

重要：只列出材料中明确提到的人物，不要杜撰。"""
                },
                # 框架构建 - 个人陈述
                {
                    "name": "个人陈述要点生成",
                    "type": "framework_ps",
                    "description": "生成个人陈述的核心要点和大纲",
                    "content": """你是GTV签证专家。请根据以下申请人材料和框架分析，生成个人陈述要点。

申请人：{client_name}

材料内容：
{context}

框架分析：
{framework_summary}

请生成个人陈述大纲，按以下JSON格式返回：
{{
    "开篇引言": "用一句话概括申请人的核心价值主张",
    "背景介绍": ["关键背景点1", "关键背景点2"],
    "核心成就": [
        {{
            "成就": "具体成就描述",
            "影响": "该成就的影响和意义"
        }}
    ],
    "未来规划": "在英国的发展规划",
    "结语": "总结性陈述",
    "写作建议": ["写作建议1", "写作建议2"]
}}

重要：所有内容必须基于材料，突出与GTV标准的契合度。"""
                },
                # 框架构建 - 申请策略
                {
                    "name": "申请策略生成",
                    "type": "framework_strategy",
                    "description": "基于框架分析生成整体申请策略",
                    "content": """你是GTV签证专家。请根据以下框架分析，生成整体申请策略。

申请人：{client_name}

框架分析：
{framework_summary}

请生成申请策略，按以下JSON格式返回：
{{
    "overall_strength": "强/中/弱",
    "recommended_mc": "MC1/MC2/MC3/MC4 - 最佳MC选择",
    "recommended_ocs": ["推荐的2个OC标准"],
    "recommended_approach": "整体申请策略描述",
    "key_risks": ["风险点1", "风险点2"],
    "mitigation_strategies": ["风险应对策略1", "风险应对策略2"],
    "priority_actions": ["优先行动1", "优先行动2"],
    "timeline_suggestion": "建议时间规划"
}}

重要：策略必须基于框架中的实际证据和评分。"""
                }
        ]
        
        # 使用 INSERT OR IGNORE 同步所有提示词（已存在的不会重复插入）
        inserted_count = 0
        for p in default_prompts:
            cursor.execute('''
                INSERT OR IGNORE INTO system_prompts (name, type, description, content, version)
                VALUES (?, ?, ?, ?, 1)
            ''', (p['name'], p['type'], p['description'], p['content']))
            if cursor.rowcount > 0:
                inserted_count += 1
        
        conn.commit()
        
        # 统计总数
        cursor.execute("SELECT COUNT(*) FROM system_prompts")
        total_count = cursor.fetchone()[0]
        
        conn.close()
        
        if inserted_count > 0:
            logger.info(f"系统提示词表初始化完成，新增 {inserted_count} 个提示词，共 {total_count} 个")
        else:
            logger.info(f"系统提示词表已是最新，共 {total_count} 个提示词")
    except Exception as e:
        logger.error(f"初始化系统提示词表失败: {e}")

# 在启动时初始化
_ensure_system_prompts_table()


@app.route('/api/agent-prompts', methods=['GET'])
def get_system_prompts():
    """获取所有系统提示词"""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, name, type, description, content, version, is_active, created_at, updated_at
            FROM system_prompts
            ORDER BY type, name
        ''')
        
        prompts = []
        for row in cursor.fetchall():
            prompts.append({
                "id": row['id'],
                "name": row['name'],
                "type": row['type'],
                "description": row['description'],
                "content": row['content'],
                "version": row['version'] or 1,
                "is_active": bool(row['is_active']),
                "created_at": row['created_at'],
                "updated_at": row['updated_at']
            })
        
        conn.close()
        return jsonify({"success": True, "data": prompts})
        
    except Exception as e:
        logger.error(f"获取系统提示词失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/agent-prompts/<int:prompt_id>', methods=['GET'])
def get_system_prompt(prompt_id):
    """获取单个系统提示词"""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, name, type, description, content, version, is_active, created_at, updated_at
            FROM system_prompts WHERE id = ?
        ''', (prompt_id,))
        
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            return jsonify({"success": False, "error": "提示词不存在"}), 404
        
        return jsonify({
            "success": True,
            "data": {
                "id": row['id'],
                "name": row['name'],
                "type": row['type'],
                "description": row['description'],
                "content": row['content'],
                "version": row['version'] or 1,
                "is_active": bool(row['is_active']),
                "created_at": row['created_at'],
                "updated_at": row['updated_at']
            }
        })
        
    except Exception as e:
        logger.error(f"获取提示词失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/agent-prompts/<int:prompt_id>', methods=['PUT'])
def update_system_prompt(prompt_id):
    """更新系统提示词"""
    try:
        data = request.get_json()
        
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # 获取当前版本号
        cursor.execute('SELECT version FROM system_prompts WHERE id = ?', (prompt_id,))
        row = cursor.fetchone()
        current_version = (row['version'] or 1) if row else 1
        new_version = current_version + 1
        
        cursor.execute('''
            UPDATE system_prompts 
            SET name = ?, description = ?, content = ?, is_active = ?, 
                version = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (
            data.get('name'),
            data.get('description'),
            data.get('content'),
            1 if data.get('is_active', True) else 0,
            new_version,
            prompt_id
        ))
        
        conn.commit()
        conn.close()
        
        logger.info(f"提示词 {prompt_id} 已更新至版本 {new_version}")
        return jsonify({"success": True, "message": f"提示词已更新至版本 {new_version}", "version": new_version})
        
    except Exception as e:
        logger.error(f"更新提示词失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/agent-prompts', methods=['POST'])
def create_system_prompt():
    """创建新的系统提示词"""
    try:
        data = request.get_json()
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO system_prompts (name, type, description, content)
            VALUES (?, ?, ?, ?)
        ''', (
            data.get('name'),
            data.get('type', 'custom'),
            data.get('description', ''),
            data.get('content', '')
        ))
        
        prompt_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({"success": True, "data": {"id": prompt_id}})
        
    except Exception as e:
        logger.error(f"创建提示词失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/projects/<project_id>/prompt-context', methods=['GET'])
def get_prompt_context(project_id):
    """获取提示词调试所需的上下文变量"""
    try:
        result = {
            "success": True,
            "data": {
                "content": "",
                "profile": "",
                "context": "",
                "client_name": "",
                "materials_summary": "",
                "framework_summary": ""
            }
        }
        
        # 获取项目信息
        if db:
            project = db.get_project(project_id)
            if project:
                result["data"]["client_name"] = project.get("client_name", "")
        
        # 获取提取的内容
        if content_extraction_agent:
            context_result = content_extraction_agent.get_project_context(project_id, with_sources=True)
            if context_result and context_result.get("success"):
                ctx_data = context_result.get("data", {})
                result["data"]["context"] = ctx_data.get("context", "")
                result["data"]["content"] = ctx_data.get("context", "")  # content 和 context 相同
        
        # 获取客户信息脉络图
        if framework_building_agent:
            try:
                profile_result = framework_building_agent.get_profile(project_id)
                if profile_result and profile_result.get("success"):
                    profile_data_container = profile_result.get("data") or {}
                    profile_data = profile_data_container.get("profile") if isinstance(profile_data_container, dict) else None
                    if profile_data:
                        import json
                        result["data"]["profile"] = json.dumps(profile_data, ensure_ascii=False, indent=2)
            except Exception as e:
                logger.warning(f"获取客户信息脉络图失败: {e}")
            
            # 获取框架摘要
            try:
                framework_result = framework_building_agent.get_framework(project_id)
                if framework_result and framework_result.get("success"):
                    framework_data = framework_result.get("data") or {}
                    # 简化框架为摘要
                    summary_parts = []
                    domain_analysis = framework_data.get("domain_analysis")
                    if domain_analysis and isinstance(domain_analysis, dict):
                        summary_parts.append(f"领域: {domain_analysis.get('primary_domain', '')}")
                    if framework_data.get("recommended_mc"):
                        summary_parts.append(f"推荐MC: {framework_data['recommended_mc']}")
                    recommended_ocs = framework_data.get("recommended_ocs")
                    if recommended_ocs and isinstance(recommended_ocs, list):
                        summary_parts.append(f"推荐OC: {', '.join(recommended_ocs)}")
                    result["data"]["framework_summary"] = "\n".join(summary_parts)
            except Exception as e:
                logger.warning(f"获取框架摘要失败: {e}")
        
        # 获取材料摘要
        if raw_material_manager:
            try:
                collection_status = raw_material_manager.get_collection_status(project_id)
                if collection_status and collection_status.get("success"):
                    status_data = collection_status.get("data") or {}
                    summary_parts = []
                    summary_parts.append(f"总计: {status_data.get('total_items', 0)} 项")
                    summary_parts.append(f"已收集: {status_data.get('collected_items', 0)} 项")
                    result["data"]["materials_summary"] = ", ".join(summary_parts)
            except Exception as e:
                logger.warning(f"获取材料摘要失败: {e}")
                result["data"]["materials_summary"] = "暂无材料信息"
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"获取提示词上下文失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/agent-prompts/debug', methods=['POST'])
def debug_prompt():
    """调试提示词 - 不保存结果"""
    try:
        data = request.get_json()
        prompt_content = data.get('prompt_content', '')
        variables = data.get('variables', {})
        
        if not prompt_content:
            return jsonify({"success": False, "error": "提示词内容为空"}), 400
        
        # 替换变量
        final_prompt = prompt_content
        for key, value in variables.items():
            final_prompt = final_prompt.replace(f"{{{key}}}", str(value))
        
        # 检查是否还有未替换的变量
        import re
        remaining_vars = re.findall(r'\{(\w+)\}', final_prompt)
        if remaining_vars:
            # 将未替换的变量替换为空或提示
            for var in remaining_vars:
                final_prompt = final_prompt.replace(f"{{{var}}}", f"[变量 {var} 未提供]")
        
        # 调用 LLM
        if not framework_building_agent or not framework_building_agent.llm_client:
            return jsonify({"success": False, "error": "LLM 客户端未初始化"}), 500
        
        response = framework_building_agent.llm_client.chat.completions.create(
            model=framework_building_agent.model,
            messages=[
                {"role": "system", "content": "你是一个专业的GTV签证申请顾问助手。"},
                {"role": "user", "content": final_prompt}
            ],
            temperature=0.7,
            max_tokens=4000
        )
        
        result_content = response.choices[0].message.content
        
        return jsonify({
            "success": True,
            "data": {
                "input": final_prompt[:500] + "..." if len(final_prompt) > 500 else final_prompt,
                "output": result_content,
                "tokens_used": response.usage.total_tokens if response.usage else None
            }
        })
        
    except Exception as e:
        logger.error(f"调试提示词失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/agent-prompts/sync', methods=['POST'])
def sync_system_prompts():
    """同步系统默认提示词（添加缺失的提示词）"""
    try:
        # 重新初始化以同步缺失的提示词
        _ensure_system_prompts_table()
        
        # 返回更新后的提示词列表
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('SELECT COUNT(*) FROM system_prompts')
        count = cursor.fetchone()[0]
        
        conn.close()
        
        return jsonify({
            "success": True, 
            "message": f"提示词同步完成，共 {count} 个提示词",
            "count": count
        })
        
    except Exception as e:
        logger.error(f"同步提示词失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


# 错误处理
@app.errorhandler(404)
def not_found(error):
    return jsonify({"success": False, "error": "接口不存在"}), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({"success": False, "error": "服务器内部错误"}), 500


if __name__ == '__main__':
    port = int(os.getenv('COPYWRITING_API_PORT', '5004'))
    debug = os.getenv('FLASK_DEBUG', 'true').lower() == 'true'
    
    logger.info(f"启动文案系统API服务，端口: {port}")
    app.run(host='0.0.0.0', port=port, debug=debug)
