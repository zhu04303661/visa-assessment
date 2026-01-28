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


@copywriting_bp.route('/material-collection/categories', methods=['PUT'])
def update_material_categories():
    """更新材料分类配置"""
    import json
    logger = _get_logger()
    
    data = request.get_json()
    categories = data.get('categories')
    
    if not categories:
        return jsonify({"success": False, "error": "缺少分类数据"}), 400
    
    try:
        # 更新内存中的分类配置（更新全局变量）
        from services import raw_material_manager as rmm
        rmm.MATERIAL_CATEGORIES = categories
        
        # 保存到配置文件
        config_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'material_categories.json')
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(categories, f, ensure_ascii=False, indent=2)
        
        logger.info(f"材料分类配置已更新并保存到: {config_path}")
        return jsonify({"success": True, "message": "分类配置已保存"})
    except Exception as e:
        logger.error(f"保存分类配置失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@copywriting_bp.route('/material-collection/forms', methods=['GET'])
def get_form_templates():
    """获取所有表单模板"""
    raw_material_manager = get_service('raw_material_manager')
    if not raw_material_manager:
        return jsonify({"success": False, "error": "服务未初始化"}), 500
    
    result = raw_material_manager.get_all_form_templates()
    return jsonify(result)


@copywriting_bp.route('/material-collection/forms/<form_type>', methods=['GET'])
def get_form_template(form_type):
    """获取特定表单模板"""
    raw_material_manager = get_service('raw_material_manager')
    if not raw_material_manager:
        return jsonify({"success": False, "error": "服务未初始化"}), 500
    
    result = raw_material_manager.get_form_template(form_type)
    return jsonify(result)


@copywriting_bp.route('/material-collection/templates/<form_type>/download', methods=['GET'])
def download_form_template(form_type):
    """下载采集表模板"""
    raw_material_manager = get_service('raw_material_manager')
    if not raw_material_manager:
        return jsonify({"success": False, "error": "服务未初始化"}), 500
    
    result = raw_material_manager.generate_form_template(form_type)
    
    if result.get("success"):
        file_path = result["data"]["file_path"]
        filename = result["data"]["filename"]
        return send_file(file_path, as_attachment=True, download_name=filename)
    else:
        return jsonify(result), 400


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


@copywriting_bp.route('/projects/<project_id>/materials/<int:file_id>/tags', methods=['PUT'])
def update_material_tags(project_id, file_id):
    """更新材料文件的分类标签"""
    raw_material_manager = get_service('raw_material_manager')
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

@copywriting_bp.route('/files/preview/<int:file_id>', methods=['GET'])
def preview_file_by_id(file_id):
    """通过文件ID预览文件"""
    import sqlite3
    logger = _get_logger()
    db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'copywriting.db')
    
    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('SELECT file_path, file_name FROM material_files WHERE id = ?', (file_id,))
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            return jsonify({"success": False, "error": "文件不存在"}), 404
        
        file_path = row['file_path']
        file_name = row['file_name']
        
        # 检查文件是否存在
        if not os.path.exists(file_path):
            # 尝试在 uploads 目录下查找
            alt_path = os.path.join(UPLOAD_FOLDER, file_path.lstrip('./'))
            if os.path.exists(alt_path):
                file_path = alt_path
            else:
                return jsonify({"success": False, "error": f"文件不存在: {file_path}"}), 404
        
        # 返回文件
        return send_file(file_path, as_attachment=False, download_name=file_name)
        
    except Exception as e:
        logger.error(f"文件预览失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


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


# ==================== 项目上下文 API ====================

@copywriting_bp.route('/projects/<project_id>/context', methods=['GET'])
def get_project_context(project_id):
    """获取项目完整上下文"""
    logger = _get_logger()
    try:
        content_extraction_agent = get_service('content_extraction_agent')
        if not content_extraction_agent:
            return jsonify({"success": False, "error": "内容提取器未初始化"}), 500
        
        with_sources = request.args.get('with_sources', 'false').lower() == 'true'
        result = content_extraction_agent.get_project_context(project_id, with_sources=with_sources)
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"获取上下文失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@copywriting_bp.route('/projects/<project_id>/outline', methods=['GET'])
def get_content_outline(project_id):
    """获取项目的内容大纲"""
    logger = _get_logger()
    try:
        content_extraction_agent = get_service('content_extraction_agent')
        if not content_extraction_agent:
            return jsonify({"success": False, "error": "内容提取器未初始化"}), 500
        
        result = content_extraction_agent.get_content_outline(project_id)
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"获取大纲失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@copywriting_bp.route('/projects/<project_id>/outline/generate', methods=['POST'])
def generate_content_outline(project_id):
    """生成内容大纲"""
    logger = _get_logger()
    try:
        content_extraction_agent = get_service('content_extraction_agent')
        if not content_extraction_agent:
            return jsonify({"success": False, "error": "内容提取器未初始化"}), 500
        
        result = content_extraction_agent.generate_outline(project_id)
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"生成大纲失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@copywriting_bp.route('/projects/<project_id>/extract', methods=['POST'])
def extract_project_content(project_id):
    """执行内容提取"""
    logger = _get_logger()
    try:
        content_extraction_agent = get_service('content_extraction_agent')
        if not content_extraction_agent:
            return jsonify({"success": False, "error": "内容提取器未初始化"}), 500
        
        result = content_extraction_agent.extract_content(project_id)
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"内容提取失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@copywriting_bp.route('/projects/<project_id>/extraction-logs', methods=['GET'])
def get_extraction_logs(project_id):
    """获取内容提取日志"""
    logger = _get_logger()
    try:
        content_extraction_agent = get_service('content_extraction_agent')
        if not content_extraction_agent:
            return jsonify({"success": False, "error": "内容提取器未初始化"}), 500
        
        limit = request.args.get('limit', 50, type=int)
        result = content_extraction_agent.get_extraction_logs(project_id, limit)
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"获取提取日志失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@copywriting_bp.route('/projects/<project_id>/deduplicate', methods=['POST'])
def deduplicate_content(project_id):
    """内容去重"""
    logger = _get_logger()
    try:
        content_extraction_agent = get_service('content_extraction_agent')
        if not content_extraction_agent:
            return jsonify({"success": False, "error": "内容提取器未初始化"}), 500
        
        result = content_extraction_agent.deduplicate_content(project_id)
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"内容去重失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@copywriting_bp.route('/projects/<project_id>/classify', methods=['POST'])
def classify_content(project_id):
    """内容分类"""
    logger = _get_logger()
    try:
        content_extraction_agent = get_service('content_extraction_agent')
        if not content_extraction_agent:
            return jsonify({"success": False, "error": "内容提取器未初始化"}), 500
        
        result = content_extraction_agent.classify_content(project_id)
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"内容分类失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@copywriting_bp.route('/projects/<project_id>/classifications', methods=['GET'])
def get_classifications(project_id):
    """获取内容分类结果"""
    logger = _get_logger()
    try:
        content_extraction_agent = get_service('content_extraction_agent')
        if not content_extraction_agent:
            return jsonify({"success": False, "error": "内容提取器未初始化"}), 500
        
        result = content_extraction_agent.get_classifications(project_id)
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"获取分类结果失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@copywriting_bp.route('/projects/<project_id>/classification-summary', methods=['GET'])
def get_classification_summary(project_id):
    """获取分类汇总"""
    logger = _get_logger()
    try:
        content_extraction_agent = get_service('content_extraction_agent')
        if not content_extraction_agent:
            return jsonify({"success": False, "error": "内容提取器未初始化"}), 500
        
        result = content_extraction_agent.get_classification_summary(project_id)
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"获取分类汇总失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@copywriting_bp.route('/projects/<project_id>/classification-progress', methods=['GET'])
def get_classification_progress(project_id):
    """获取分类进度"""
    logger = _get_logger()
    try:
        content_extraction_agent = get_service('content_extraction_agent')
        if not content_extraction_agent:
            return jsonify({"success": False, "error": "内容提取器未初始化"}), 500
        
        result = content_extraction_agent.get_classification_progress(project_id)
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"获取分类进度失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@copywriting_bp.route('/projects/<project_id>/classifications/<int:classification_id>', methods=['PUT'])
def update_classification(project_id, classification_id):
    """更新分类"""
    logger = _get_logger()
    try:
        content_extraction_agent = get_service('content_extraction_agent')
        if not content_extraction_agent:
            return jsonify({"success": False, "error": "内容提取器未初始化"}), 500
        
        data = request.get_json()
        result = content_extraction_agent.update_classification(project_id, classification_id, data)
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"更新分类失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@copywriting_bp.route('/projects/<project_id>/classifications/<int:classification_id>', methods=['DELETE'])
def delete_classification(project_id, classification_id):
    """删除分类"""
    logger = _get_logger()
    try:
        content_extraction_agent = get_service('content_extraction_agent')
        if not content_extraction_agent:
            return jsonify({"success": False, "error": "内容提取器未初始化"}), 500
        
        result = content_extraction_agent.delete_classification(project_id, classification_id)
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"删除分类失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@copywriting_bp.route('/projects/<project_id>/classifications', methods=['POST'])
def add_classification(project_id):
    """添加分类"""
    logger = _get_logger()
    try:
        content_extraction_agent = get_service('content_extraction_agent')
        if not content_extraction_agent:
            return jsonify({"success": False, "error": "内容提取器未初始化"}), 500
        
        data = request.get_json()
        result = content_extraction_agent.add_classification(project_id, data)
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"添加分类失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@copywriting_bp.route('/projects/<project_id>/content-blocks', methods=['GET'])
def get_content_blocks(project_id):
    """获取内容块"""
    logger = _get_logger()
    try:
        content_extraction_agent = get_service('content_extraction_agent')
        if not content_extraction_agent:
            return jsonify({"success": False, "error": "内容提取器未初始化"}), 500
        
        result = content_extraction_agent.get_content_blocks(project_id)
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"获取内容块失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@copywriting_bp.route('/projects/<project_id>/content/search', methods=['GET'])
def search_content(project_id):
    """搜索内容"""
    logger = _get_logger()
    try:
        content_extraction_agent = get_service('content_extraction_agent')
        if not content_extraction_agent:
            return jsonify({"success": False, "error": "内容提取器未初始化"}), 500
        
        query = request.args.get('q', '')
        category = request.args.get('category', '')
        result = content_extraction_agent.search_content(project_id, query, category)
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"搜索内容失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


# ==================== 框架构建 API ====================

@copywriting_bp.route('/projects/<project_id>/analyze-profile', methods=['POST'])
def analyze_client_profile(project_id):
    """分析客户画像"""
    logger = _get_logger()
    try:
        framework_building_agent = get_service('framework_building_agent')
        if not framework_building_agent:
            return jsonify({"success": False, "error": "框架构建器未初始化"}), 500
        
        result = framework_building_agent.analyze_client_profile(project_id)
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"分析客户画像失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@copywriting_bp.route('/projects/<project_id>/profile-map', methods=['GET'])
def get_profile_map(project_id):
    """获取客户画像"""
    logger = _get_logger()
    try:
        framework_building_agent = get_service('framework_building_agent')
        if not framework_building_agent:
            return jsonify({"success": False, "error": "框架构建器未初始化"}), 500
        
        result = framework_building_agent.get_profile_map(project_id)
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"获取客户画像失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@copywriting_bp.route('/projects/<project_id>/build-framework', methods=['POST'])
def build_gtv_framework(project_id):
    """构建GTV框架"""
    logger = _get_logger()
    try:
        framework_building_agent = get_service('framework_building_agent')
        content_extraction_agent = get_service('content_extraction_agent')
        
        if not framework_building_agent:
            return jsonify({"success": False, "error": "框架构建器未初始化"}), 500
        
        # 获取项目上下文
        context = ""
        if content_extraction_agent:
            context_result = content_extraction_agent.get_project_context(project_id)
            if context_result.get("success"):
                context = context_result.get("data", {}).get("context", "")
        
        # 获取客户画像（可选）
        profile_data = None
        try:
            profile_result = framework_building_agent.get_profile_map(project_id)
            if profile_result.get("success"):
                profile_data = profile_result.get("data")
        except Exception:
            pass
        
        # 构建框架
        result = framework_building_agent.build_framework(project_id, context, profile_data)
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"构建GTV框架失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@copywriting_bp.route('/projects/<project_id>/framework', methods=['GET'])
def get_gtv_framework(project_id):
    """获取GTV框架"""
    logger = _get_logger()
    try:
        framework_building_agent = get_service('framework_building_agent')
        if not framework_building_agent:
            return jsonify({"success": False, "error": "框架构建器未初始化"}), 500
        
        result = framework_building_agent.get_framework(project_id)
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"获取GTV框架失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@copywriting_bp.route('/projects/<project_id>/framework', methods=['PUT'])
def update_gtv_framework(project_id):
    """更新GTV框架"""
    logger = _get_logger()
    try:
        framework_building_agent = get_service('framework_building_agent')
        if not framework_building_agent:
            return jsonify({"success": False, "error": "框架构建器未初始化"}), 500
        
        data = request.get_json()
        result = framework_building_agent.update_framework(project_id, data)
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"更新GTV框架失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@copywriting_bp.route('/projects/<project_id>/framework/export', methods=['GET'])
def export_gtv_framework(project_id):
    """导出GTV框架"""
    logger = _get_logger()
    try:
        framework_building_agent = get_service('framework_building_agent')
        if not framework_building_agent:
            return jsonify({"success": False, "error": "框架构建器未初始化"}), 500
        
        format_type = request.args.get('format', 'json')
        result = framework_building_agent.export_framework(project_id, format_type)
        
        if result.get("success") and format_type != 'json':
            file_path = result["data"]["file_path"]
            filename = result["data"]["filename"]
            return send_file(file_path, as_attachment=True, download_name=filename)
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"导出GTV框架失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@copywriting_bp.route('/projects/<project_id>/framework-logs', methods=['GET'])
def get_framework_logs(project_id):
    """获取框架构建日志"""
    logger = _get_logger()
    try:
        framework_building_agent = get_service('framework_building_agent')
        if not framework_building_agent:
            return jsonify({"success": False, "error": "框架构建器未初始化"}), 500
        
        # get_framework_logs 方法只接收 project_id 参数
        result = framework_building_agent.get_framework_logs(project_id)
        
        # 返回格式化的结果
        if isinstance(result, list):
            return jsonify({"success": True, "data": result})
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"获取框架日志失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@copywriting_bp.route('/projects/<project_id>/prompt-context', methods=['GET'])
def get_prompt_context(project_id):
    """获取提示词上下文"""
    logger = _get_logger()
    try:
        content_extraction_agent = get_service('content_extraction_agent')
        if not content_extraction_agent:
            return jsonify({"success": False, "error": "内容提取器未初始化"}), 500
        
        result = content_extraction_agent.get_prompt_context(project_id)
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"获取提示词上下文失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


# ==================== 数据清理 API ====================

@copywriting_bp.route('/projects/<project_id>/extraction/clear', methods=['POST'])
def clear_extraction_data(project_id):
    """清理项目的所有提取数据，可以重新提取"""
    logger = _get_logger()
    try:
        content_extraction_agent = get_service('content_extraction_agent')
        if not content_extraction_agent:
            return jsonify({"success": False, "error": "内容提取器未初始化"}), 500
        
        result = content_extraction_agent.clear_all_extraction_data(project_id)
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"清理提取数据失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@copywriting_bp.route('/projects/<project_id>/framework/clear', methods=['POST'])
def clear_framework_data(project_id):
    """清理项目的所有框架数据，可以重新构建"""
    logger = _get_logger()
    try:
        framework_building_agent = get_service('framework_building_agent')
        if not framework_building_agent:
            return jsonify({"success": False, "error": "框架构建器未初始化"}), 500
        
        result = framework_building_agent.clear_all_framework_data(project_id)
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"清理框架数据失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


# ==================== 文档管理 API ====================

@copywriting_bp.route('/projects/<project_id>/documents', methods=['GET'])
def list_documents(project_id):
    """列出项目文档"""
    from pathlib import Path
    from datetime import datetime
    logger = _get_logger()
    
    project_manager = get_service('project_manager')
    if not project_manager:
        return jsonify({"success": False, "error": "服务未初始化"}), 500
    
    project = project_manager.get_project(project_id=project_id)
    if not project.get("success"):
        return jsonify(project), 404
    
    project_path = Path(project.get("path", ""))
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


@copywriting_bp.route('/projects/<project_id>/documents/<path:doc_path>', methods=['GET'])
def get_document_content(project_id, doc_path):
    """获取文档内容"""
    from pathlib import Path
    from datetime import datetime
    logger = _get_logger()
    
    project_manager = get_service('project_manager')
    if not project_manager:
        return jsonify({"success": False, "error": "服务未初始化"}), 500
    
    project = project_manager.get_project(project_id=project_id)
    if not project.get("success"):
        return jsonify(project), 404
    
    project_path = Path(project.get("path", ""))
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
        logger.error(f"读取文档失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@copywriting_bp.route('/projects/<project_id>/documents/<path:doc_path>', methods=['PUT'])
def update_document_content(project_id, doc_path):
    """更新文档内容"""
    from pathlib import Path
    logger = _get_logger()
    
    project_manager = get_service('project_manager')
    if not project_manager:
        return jsonify({"success": False, "error": "服务未初始化"}), 500
    
    project = project_manager.get_project(project_id=project_id)
    if not project.get("success"):
        return jsonify(project), 404
    
    project_path = Path(project.get("path", ""))
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
        logger.error(f"更新文档失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


# ==================== 提示词管理 API ====================

def _get_db_path():
    """获取数据库路径"""
    return os.path.join(os.path.dirname(os.path.dirname(__file__)), 'copywriting.db')

def _ensure_system_prompts_table():
    """确保系统提示词表存在并初始化默认数据"""
    import sqlite3
    logger = _get_logger()
    db_path = _get_db_path()
    
    try:
        conn = sqlite3.connect(db_path)
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
        
        # 检查是否需要添加 version 列
        cursor.execute("PRAGMA table_info(system_prompts)")
        columns = [row[1] for row in cursor.fetchall()]
        if 'version' not in columns:
            cursor.execute('ALTER TABLE system_prompts ADD COLUMN version INTEGER DEFAULT 1')
        
        # 默认提示词
        default_prompts = [
            {
                "name": "框架构建提示词",
                "type": "framework",
                "description": "用于构建GTV申请框架的主提示词",
                "content": """你是一位专业的GTV签证申请顾问，请根据以下材料为申请人构建申请框架。

## 申请人信息
{client_info}

## 材料内容
{context}

请按照MC/OC标准分析材料，输出JSON格式的框架。"""
            },
            {
                "name": "内容提取提示词",
                "type": "extraction",
                "description": "用于从材料中提取关键内容",
                "content": """请从以下材料中提取GTV申请相关的关键信息。

## 材料内容
{content}

请识别并提取：
1. 申请人的成就和贡献
2. 行业认可和奖项
3. 专业技能和经验
4. 推荐人信息"""
            },
            {
                "name": "英文翻译提示词",
                "type": "translation",
                "description": "将英文内容翻译为中文",
                "content": """请将以下英文内容翻译成中文。

## 英文原文
{content}

请返回翻译后的中文内容。"""
            }
        ]
        
        # 检查并插入默认提示词
        cursor.execute("SELECT COUNT(*) FROM system_prompts")
        if cursor.fetchone()[0] == 0:
            for p in default_prompts:
                cursor.execute('''
                    INSERT OR IGNORE INTO system_prompts (name, type, description, content, version)
                    VALUES (?, ?, ?, ?, 1)
                ''', (p['name'], p['type'], p['description'], p['content']))
        
        conn.commit()
        conn.close()
        logger.info("系统提示词表初始化完成")
    except Exception as e:
        logger.error(f"初始化系统提示词表失败: {e}")


@copywriting_bp.route('/agent-prompts', methods=['GET'])
def get_system_prompts():
    """获取所有系统提示词"""
    import sqlite3
    logger = _get_logger()
    db_path = _get_db_path()
    
    try:
        _ensure_system_prompts_table()
        
        conn = sqlite3.connect(db_path)
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


@copywriting_bp.route('/agent-prompts/<int:prompt_id>', methods=['GET'])
def get_system_prompt(prompt_id):
    """获取单个系统提示词"""
    import sqlite3
    logger = _get_logger()
    db_path = _get_db_path()
    
    try:
        conn = sqlite3.connect(db_path)
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


@copywriting_bp.route('/agent-prompts/<int:prompt_id>', methods=['PUT'])
def update_system_prompt(prompt_id):
    """更新系统提示词"""
    import sqlite3
    logger = _get_logger()
    db_path = _get_db_path()
    
    try:
        data = request.get_json()
        
        conn = sqlite3.connect(db_path)
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


@copywriting_bp.route('/agent-prompts', methods=['POST'])
def create_system_prompt():
    """创建新的系统提示词"""
    import sqlite3
    logger = _get_logger()
    db_path = _get_db_path()
    
    try:
        data = request.get_json()
        
        conn = sqlite3.connect(db_path)
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


@copywriting_bp.route('/agent-prompts/sync', methods=['POST'])
def sync_system_prompts():
    """同步系统默认提示词"""
    logger = _get_logger()
    
    try:
        _ensure_system_prompts_table()
        
        import sqlite3
        db_path = _get_db_path()
        
        conn = sqlite3.connect(db_path)
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


@copywriting_bp.route('/agent-prompts/debug', methods=['POST'])
def debug_prompt():
    """调试提示词"""
    import re
    logger = _get_logger()
    
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
        
        # 检查未替换的变量
        remaining_vars = re.findall(r'\{(\w+)\}', final_prompt)
        if remaining_vars:
            for var in remaining_vars:
                final_prompt = final_prompt.replace(f"{{{var}}}", f"[未提供: {var}]")
        
        # 调用LLM
        from anthropic import Anthropic
        client = Anthropic()
        
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4000,
            messages=[{"role": "user", "content": final_prompt}]
        )
        
        output = response.content[0].text if response.content else ""
        tokens_used = response.usage.input_tokens + response.usage.output_tokens
        
        return jsonify({
            "success": True,
            "data": {
                "input": final_prompt[:500] + "..." if len(final_prompt) > 500 else final_prompt,
                "output": output,
                "tokens_used": tokens_used
            }
        })
        
    except Exception as e:
        logger.error(f"调试提示词失败: {e}")
        return jsonify({"success": False, "error": str(e)}), 500
