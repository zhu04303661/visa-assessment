#!/usr/bin/env python3
"""
GTV签证文案制作系统 - API服务
提供REST API接口供前端调用
"""

import os
import json
import logging
from datetime import datetime
from typing import Dict, Any
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename
from pathlib import Path

from utils.logger_config import setup_module_logger
from services.copywriting_project_manager import CopywritingProjectManager
from services.success_case_library import SuccessCaseLibrary
from agents.copywriting_agent import CopywritingAgent
from services.copywriting_workflow import CopywritingWorkflow
from database.copywriting_database import CopywritingDatabase
from processors.material_processor import MaterialProcessor
from services.raw_material_manager import RawMaterialManager
from processors.material_analyzer import MaterialAnalyzer

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
    
    # 获取原始材料
    materials_result = project_manager.get_raw_materials(project_id)
    raw_materials = materials_result.get("data", {}) if materials_result.get("success") else {}
    
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
