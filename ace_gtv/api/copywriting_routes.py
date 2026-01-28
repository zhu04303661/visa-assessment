#!/usr/bin/env python3
"""
GTV签证文案制作系统 - API路由模块
提供材料收集、信息提取、框架构建等功能的REST API接口
"""

import os
import json
import sqlite3
from datetime import datetime
from typing import Dict, Any
from flask import Blueprint, request, jsonify, send_file
from werkzeug.utils import secure_filename
from pathlib import Path

# 创建 Blueprint
copywriting_bp = Blueprint('copywriting', __name__)

# 配置
UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", "./uploads")
PROJECTS_PATH = os.getenv("COPYWRITING_PROJECTS_PATH", "./copywriting_projects")
CASES_PATH = os.getenv("CASE_LIBRARY_PATH", "./success_cases")
DB_PATH = os.getenv("COPYWRITING_DB_PATH", "./copywriting.db")

# 支持的文件类型
ALLOWED_EXTENSIONS = {
    'txt', 'pdf', 'doc', 'docx', 'md', 'json', 'rtf',
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'heic',
    'csv', 'xlsx', 'xls',
    'zip'
}

# 全局服务实例（延迟初始化）
_services = {}

def _get_logger():
    """获取日志器"""
    if 'logger' not in _services:
        try:
            from utils.logger_config import setup_module_logger
            _services['logger'] = setup_module_logger("copywriting_routes", os.getenv("LOG_LEVEL", "INFO"))
        except ImportError:
            import logging
            logging.basicConfig(level=logging.INFO)
            _services['logger'] = logging.getLogger("copywriting_routes")
    return _services['logger']

def _init_services():
    """初始化所有服务（延迟加载）"""
    if _services.get('initialized'):
        return
    
    logger = _get_logger()
    
    try:
        from database.copywriting_database import CopywritingDatabase
        from processors.material_processor import MaterialProcessor
        from services.raw_material_manager import RawMaterialManager
        from processors.material_analyzer import MaterialAnalyzer
        from agents.content_extraction_agent import ContentExtractionAgent
        from agents.framework_building_agent import FrameworkBuildingAgent
        from services.copywriting_workflow import CopywritingWorkflow
        
        # 确保目录存在
        Path(UPLOAD_FOLDER).mkdir(parents=True, exist_ok=True)
        
        # 初始化服务
        _services['db'] = CopywritingDatabase(DB_PATH)
        logger.info(f"本地数据库初始化成功: {DB_PATH}")
        
        _services['material_processor'] = MaterialProcessor(UPLOAD_FOLDER)
        logger.info("材料处理器初始化成功")
        
        _services['raw_material_manager'] = RawMaterialManager(DB_PATH, UPLOAD_FOLDER)
        logger.info("原始材料管理器初始化成功")
        
        _services['material_analyzer'] = MaterialAnalyzer(DB_PATH)
        logger.info("材料分析器初始化成功")
        
        _services['content_extraction_agent'] = ContentExtractionAgent(DB_PATH, UPLOAD_FOLDER)
        logger.info("内容提取Agent初始化成功")
        
        _services['framework_building_agent'] = FrameworkBuildingAgent(DB_PATH)
        logger.info("框架构建Agent初始化成功")
        
        _services['workflow'] = CopywritingWorkflow(PROJECTS_PATH, CASES_PATH)
        _services['project_manager'] = _services['workflow'].project_manager
        _services['case_library'] = _services['workflow'].case_library
        _services['agent'] = _services['workflow'].agent
        logger.info("文案系统服务初始化成功")
        
        _services['initialized'] = True
        
    except Exception as e:
        logger.error(f"服务初始化失败: {e}")
        _services['initialized'] = False

def get_service(name):
    """获取服务实例"""
    _init_services()
    return _services.get(name)

def allowed_file(filename):
    """检查文件类型是否允许"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


# ==================== 健康检查 ====================

@copywriting_bp.route('/health', methods=['GET'])
def health_check():
    """健康检查接口"""
    db = get_service('db')
    material_processor = get_service('material_processor')
    raw_material_manager = get_service('raw_material_manager')
    workflow = get_service('workflow')
    agent = get_service('agent')
    case_library = get_service('case_library')
    project_manager = get_service('project_manager')
    
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
            "agent": agent is not None,
            "case_library": case_library is not None,
            "project_manager": project_manager is not None
        },
        "supported_file_types": list(ALLOWED_EXTENSIONS)
    })


# ==================== 项目管理 API ====================

@copywriting_bp.route('/projects', methods=['GET'])
def list_projects():
    """获取项目列表"""
    db = get_service('db')
    if not db:
        return jsonify({"success": False, "error": "服务未初始化"}), 500
    
    result = db.list_projects()
    return jsonify(result)


@copywriting_bp.route('/projects', methods=['POST'])
def create_project():
    """创建新项目"""
    db = get_service('db')
    if not db:
        return jsonify({"success": False, "error": "服务未初始化"}), 500
    
    data = request.get_json()
    client_name = data.get('client_name', 'Unknown')
    visa_type = data.get('visa_type', 'GTV')
    
    result = db.create_project(client_name, visa_type)
    return jsonify(result)


@copywriting_bp.route('/projects/<project_id>', methods=['GET'])
def get_project(project_id):
    """获取项目详情"""
    db = get_service('db')
    if not db:
        return jsonify({"success": False, "error": "服务未初始化"}), 500
    
    result = db.get_project(project_id=project_id)
    return jsonify(result)


@copywriting_bp.route('/projects/<project_id>', methods=['DELETE'])
def delete_project(project_id):
    """删除项目"""
    db = get_service('db')
    if not db:
        return jsonify({"success": False, "error": "服务未初始化"}), 500
    
    result = db.delete_project(project_id)
    return jsonify(result)


@copywriting_bp.route('/projects/<project_id>/materials', methods=['GET'])
def get_project_materials(project_id):
    """获取项目材料"""
    db = get_service('db')
    project_manager = get_service('project_manager')
    
    if db:
        result = db.get_raw_materials(project_id)
        return jsonify(result)
    
    if not project_manager:
        return jsonify({"success": False, "error": "服务未初始化"}), 500
    
    result = project_manager.get_raw_materials(project_id)
    return jsonify(result)


# ==================== 材料收集 API ====================

@copywriting_bp.route('/material-collection/categories', methods=['GET'])
def get_material_categories():
    """获取材料分类结构"""
    raw_material_manager = get_service('raw_material_manager')
    if not raw_material_manager:
        return jsonify({"success": False, "error": "服务未初始化"}), 500
    
    result = raw_material_manager.get_material_categories()
    return jsonify(result)


@copywriting_bp.route('/projects/<project_id>/material-collection', methods=['GET'])
def get_project_material_status(project_id):
    """获取项目材料收集状态"""
    raw_material_manager = get_service('raw_material_manager')
    if not raw_material_manager:
        return jsonify({"success": False, "error": "服务未初始化"}), 500
    
    result = raw_material_manager.get_collection_status(project_id)
    return jsonify(result)


@copywriting_bp.route('/projects/<project_id>/material-collection/init', methods=['POST'])
def init_project_materials(project_id):
    """初始化项目材料收集清单"""
    raw_material_manager = get_service('raw_material_manager')
    if not raw_material_manager:
        return jsonify({"success": False, "error": "服务未初始化"}), 500
    
    result = raw_material_manager.init_project_materials(project_id)
    return jsonify(result)


@copywriting_bp.route('/projects/<project_id>/material-collection/upload', methods=['POST'])
def upload_raw_material(project_id):
    """上传原始材料文件"""
    logger = _get_logger()
    raw_material_manager = get_service('raw_material_manager')
    
    if not raw_material_manager:
        return jsonify({"success": False, "error": "服务未初始化"}), 500
    
    if 'file' not in request.files:
        return jsonify({"success": False, "error": "未找到文件"}), 400
    
    file = request.files['file']
    category_id = request.form.get('category_id')
    item_id = request.form.get('item_id')
    description = request.form.get('description', '')
    
    if not category_id or not item_id:
        return jsonify({"success": False, "error": "缺少分类信息"}), 400
    
    if file.filename == '':
        return jsonify({"success": False, "error": "文件名为空"}), 400
    
    # 保存文件
    filename = secure_filename(file.filename)
    original_filename = file.filename
    
    project_upload_dir = os.path.join(UPLOAD_FOLDER, project_id, "raw_materials", category_id)
    Path(project_upload_dir).mkdir(parents=True, exist_ok=True)
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    unique_filename = f"{timestamp}_{filename}"
    file_path = os.path.join(project_upload_dir, unique_filename)
    
    file.save(file_path)
    file_size = os.path.getsize(file_path)
    file_type = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
    
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


@copywriting_bp.route('/projects/<project_id>/material-collection/files/<int:file_id>', methods=['DELETE'])
def delete_material_file(project_id, file_id):
    """删除材料文件"""
    raw_material_manager = get_service('raw_material_manager')
    if not raw_material_manager:
        return jsonify({"success": False, "error": "服务未初始化"}), 500
    
    result = raw_material_manager.delete_material_file(file_id)
    return jsonify(result)


# ==================== 内容提取 API ====================

@copywriting_bp.route('/projects/<project_id>/extraction/start', methods=['POST'])
def start_content_extraction(project_id):
    """启动内容提取任务"""
    content_extraction_agent = get_service('content_extraction_agent')
    if not content_extraction_agent:
        return jsonify({"success": False, "error": "内容提取Agent未初始化"}), 500
    
    result = content_extraction_agent.extract_and_classify(project_id)
    return jsonify(result)


@copywriting_bp.route('/projects/<project_id>/extraction/status', methods=['GET'])
def get_extraction_status(project_id):
    """获取提取进度"""
    content_extraction_agent = get_service('content_extraction_agent')
    if not content_extraction_agent:
        return jsonify({"success": False, "error": "内容提取Agent未初始化"}), 500
    
    result = content_extraction_agent.get_extraction_progress(project_id)
    return jsonify(result)


@copywriting_bp.route('/projects/<project_id>/extraction/results', methods=['GET'])
def get_extraction_results(project_id):
    """获取提取结果"""
    content_extraction_agent = get_service('content_extraction_agent')
    if not content_extraction_agent:
        return jsonify({"success": False, "error": "内容提取Agent未初始化"}), 500
    
    result = content_extraction_agent.get_classified_content(project_id)
    return jsonify(result)


# ==================== 框架构建 API ====================

@copywriting_bp.route('/projects/<project_id>/framework/build', methods=['POST'])
def build_framework(project_id):
    """构建申请框架"""
    framework_building_agent = get_service('framework_building_agent')
    if not framework_building_agent:
        return jsonify({"success": False, "error": "框架构建Agent未初始化"}), 500
    
    result = framework_building_agent.build_framework(project_id)
    return jsonify(result)


@copywriting_bp.route('/projects/<project_id>/framework', methods=['GET'])
def get_framework(project_id):
    """获取框架内容"""
    framework_building_agent = get_service('framework_building_agent')
    if not framework_building_agent:
        return jsonify({"success": False, "error": "框架构建Agent未初始化"}), 500
    
    result = framework_building_agent.get_framework(project_id)
    return jsonify(result)


@copywriting_bp.route('/projects/<project_id>/framework', methods=['PUT'])
def update_framework(project_id):
    """更新框架内容"""
    framework_building_agent = get_service('framework_building_agent')
    if not framework_building_agent:
        return jsonify({"success": False, "error": "框架构建Agent未初始化"}), 500
    
    data = request.get_json()
    result = framework_building_agent.update_framework(project_id, data)
    return jsonify(result)


# ==================== 文件预览 API ====================

@copywriting_bp.route('/files/preview', methods=['GET'])
def preview_file():
    """预览文件内容"""
    logger = _get_logger()
    file_path = request.args.get('path')
    
    if not file_path:
        return jsonify({"success": False, "error": "缺少文件路径"}), 400
    
    # 安全检查
    if '..' in file_path:
        return jsonify({"success": False, "error": "无效的文件路径"}), 400
    
    # 检查文件是否存在
    if not os.path.exists(file_path):
        # 尝试在 uploads 目录下查找
        if not file_path.startswith('/'):
            alt_path = os.path.join(UPLOAD_FOLDER, file_path)
            if os.path.exists(alt_path):
                file_path = alt_path
            else:
                return jsonify({"success": False, "error": f"文件不存在: {file_path}"}), 404
        else:
            return jsonify({"success": False, "error": f"文件不存在: {file_path}"}), 404
    
    try:
        return send_file(file_path, as_attachment=False)
    except Exception as e:
        logger.error(f"文件预览失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@copywriting_bp.route('/files/download', methods=['GET'])
def download_file():
    """下载文件"""
    logger = _get_logger()
    file_path = request.args.get('path')
    
    if not file_path:
        return jsonify({"success": False, "error": "缺少文件路径"}), 400
    
    if '..' in file_path:
        return jsonify({"success": False, "error": "无效的文件路径"}), 400
    
    if not os.path.exists(file_path):
        if not file_path.startswith('/'):
            alt_path = os.path.join(UPLOAD_FOLDER, file_path)
            if os.path.exists(alt_path):
                file_path = alt_path
            else:
                return jsonify({"success": False, "error": f"文件不存在"}), 404
        else:
            return jsonify({"success": False, "error": f"文件不存在"}), 404
    
    try:
        return send_file(file_path, as_attachment=True)
    except Exception as e:
        logger.error(f"文件下载失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500
