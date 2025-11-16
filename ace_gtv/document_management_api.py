#!/usr/bin/env python3
"""
英国GTV签证移民律师文案管理系统 - API服务
提供REST API接口供前端调用
"""

import os
import json
import logging
from datetime import datetime
from typing import Dict, Any
from flask import Flask, request, jsonify
from flask_cors import CORS
from logger_config import setup_module_logger

from document_management_db import DocumentManagementDB
from document_llm_assistant import DocumentLLMAssistant

logger = setup_module_logger("document_management_api", os.getenv("LOG_LEVEL", "INFO"))

app = Flask(__name__)
CORS(app)

# 初始化数据库和LLM助手
db = None
llm_assistant = None

try:
    db = DocumentManagementDB()
    logger.info("数据库连接成功")
except Exception as e:
    logger.error(f"数据库初始化失败: {e}")

try:
    llm_assistant = DocumentLLMAssistant()
    logger.info("LLM助手初始化成功")
except Exception as e:
    logger.warning(f"LLM助手初始化失败: {e}")


@app.route('/health', methods=['GET'])
def health_check():
    """健康检查接口"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "Document Management API",
        "db_connected": db is not None,
        "llm_available": llm_assistant is not None and llm_assistant.client is not None
    })


# ==================== 客户管理 API ====================

@app.route('/api/clients', methods=['GET'])
def get_clients():
    """获取客户列表"""
    if not db:
        return jsonify({"success": False, "error": "数据库未初始化"}), 500
    
    limit = request.args.get('limit', 100, type=int)
    offset = request.args.get('offset', 0, type=int)
    
    result = db.get_clients(limit=limit, offset=offset)
    if result["success"]:
        return jsonify(result), 200
    return jsonify(result), 500


@app.route('/api/clients', methods=['POST'])
def create_client():
    """创建新客户"""
    if not db:
        return jsonify({"success": False, "error": "数据库未初始化"}), 500
    
    data = request.get_json()
    result = db.create_client(data)
    
    if result["success"]:
        return jsonify(result), 201
    return jsonify(result), 400


@app.route('/api/clients/<client_id>', methods=['GET'])
def get_client(client_id):
    """获取单个客户信息"""
    if not db:
        return jsonify({"success": False, "error": "数据库未初始化"}), 500
    
    result = db.get_client(client_id)
    if result["success"]:
        return jsonify(result), 200
    return jsonify(result), 404


@app.route('/api/clients/<client_id>', methods=['PUT'])
def update_client(client_id):
    """更新客户信息"""
    if not db:
        return jsonify({"success": False, "error": "数据库未初始化"}), 500
    
    data = request.get_json()
    result = db.update_client(client_id, data)
    
    if result["success"]:
        return jsonify(result), 200
    return jsonify(result), 400


@app.route('/api/clients/<client_id>', methods=['DELETE'])
def delete_client(client_id):
    """删除客户"""
    if not db:
        return jsonify({"success": False, "error": "数据库未初始化"}), 500
    
    result = db.delete_client(client_id)
    if result["success"]:
        return jsonify(result), 200
    return jsonify(result), 400


# ==================== 案件管理 API ====================

@app.route('/api/cases', methods=['GET'])
def get_cases():
    """获取案件列表"""
    if not db:
        return jsonify({"success": False, "error": "数据库未初始化"}), 500
    
    client_id = request.args.get('client_id')
    limit = request.args.get('limit', 100, type=int)
    offset = request.args.get('offset', 0, type=int)
    
    result = db.get_cases(client_id=client_id, limit=limit, offset=offset)
    if result["success"]:
        return jsonify(result), 200
    return jsonify(result), 500


@app.route('/api/cases', methods=['POST'])
def create_case():
    """创建新案件"""
    if not db:
        return jsonify({"success": False, "error": "数据库未初始化"}), 500
    
    data = request.get_json()
    result = db.create_case(data)
    
    if result["success"]:
        return jsonify(result), 201
    return jsonify(result), 400


@app.route('/api/cases/<case_id>', methods=['GET'])
def get_case(case_id):
    """获取单个案件信息"""
    if not db:
        return jsonify({"success": False, "error": "数据库未初始化"}), 500
    
    result = db.get_case(case_id)
    if result["success"]:
        return jsonify(result), 200
    return jsonify(result), 404


@app.route('/api/cases/<case_id>', methods=['PUT'])
def update_case(case_id):
    """更新案件信息"""
    if not db:
        return jsonify({"success": False, "error": "数据库未初始化"}), 500
    
    data = request.get_json()
    result = db.update_case(case_id, data)
    
    if result["success"]:
        return jsonify(result), 200
    return jsonify(result), 400


# ==================== 文档管理 API ====================

@app.route('/api/documents', methods=['GET'])
def get_documents():
    """获取文档列表"""
    if not db:
        return jsonify({"success": False, "error": "数据库未初始化"}), 500
    
    case_id = request.args.get('case_id')
    document_type = request.args.get('document_type')
    
    result = db.get_documents(case_id=case_id, document_type=document_type)
    if result["success"]:
        return jsonify(result), 200
    return jsonify(result), 500


@app.route('/api/documents', methods=['POST'])
def create_document():
    """创建文档记录"""
    if not db:
        return jsonify({"success": False, "error": "数据库未初始化"}), 500
    
    data = request.get_json()
    result = db.create_document(data)
    
    if result["success"]:
        return jsonify(result), 201
    return jsonify(result), 400


@app.route('/api/documents/<document_id>', methods=['PUT'])
def update_document(document_id):
    """更新文档"""
    if not db:
        return jsonify({"success": False, "error": "数据库未初始化"}), 500
    
    data = request.get_json()
    result = db.update_document(document_id, data)
    
    if result["success"]:
        return jsonify(result), 200
    return jsonify(result), 400


@app.route('/api/documents/<document_id>', methods=['DELETE'])
def delete_document(document_id):
    """删除文档"""
    if not db:
        return jsonify({"success": False, "error": "数据库未初始化"}), 500
    
    result = db.delete_document(document_id)
    if result["success"]:
        return jsonify(result), 200
    return jsonify(result), 400


# ==================== LLM辅助功能 API ====================

@app.route('/api/llm/process-raw', methods=['POST'])
def process_raw_document():
    """使用LLM处理原始文档"""
    if not llm_assistant or not llm_assistant.client:
        return jsonify({"success": False, "error": "LLM服务不可用"}), 503
    
    data = request.get_json()
    raw_content = data.get('content', '')
    document_type = data.get('document_type', 'resume')
    
    result = llm_assistant.process_raw_document(raw_content, document_type)
    if result["success"]:
        return jsonify(result), 200
    return jsonify(result), 500


@app.route('/api/llm/generate-document', methods=['POST'])
def generate_document():
    """使用LLM生成申请文档"""
    if not llm_assistant or not llm_assistant.client:
        return jsonify({"success": False, "error": "LLM服务不可用"}), 503
    
    if not db:
        return jsonify({"success": False, "error": "数据库未初始化"}), 500
    
    data = request.get_json()
    case_id = data.get('case_id')
    
    # 获取案件信息
    case_result = db.get_case(case_id)
    if not case_result["success"]:
        return jsonify({"success": False, "error": "案件不存在"}), 404
    
    case_info = case_result["data"]
    
    # 获取客户信息
    client_result = db.get_client(case_info.get('client_id'))
    client_name = client_result.get("data", {}).get("name", "") if client_result.get("success") else ""
    
    # 获取原始文档
    docs_result = db.get_documents(case_id=case_id, document_type="raw")
    raw_documents = docs_result.get("data", []) if docs_result.get("success") else []
    
    # 构建案件信息
    case_info_with_client = {
        **case_info,
        "client_name": client_name
    }
    
    result = llm_assistant.generate_application_document(case_info_with_client, raw_documents)
    if result["success"]:
        return jsonify(result), 200
    return jsonify(result), 500


@app.route('/api/llm/optimize', methods=['POST'])
def optimize_document():
    """使用LLM优化文档"""
    if not llm_assistant or not llm_assistant.client:
        return jsonify({"success": False, "error": "LLM服务不可用"}), 503
    
    data = request.get_json()
    content = data.get('content', '')
    optimization_type = data.get('type', 'grammar')
    
    result = llm_assistant.optimize_document(content, optimization_type)
    if result["success"]:
        return jsonify(result), 200
    return jsonify(result), 500


@app.route('/api/llm/check-completeness', methods=['POST'])
def check_completeness():
    """使用LLM检查材料完整性"""
    if not llm_assistant or not llm_assistant.client:
        return jsonify({"success": False, "error": "LLM服务不可用"}), 503
    
    if not db:
        return jsonify({"success": False, "error": "数据库未初始化"}), 500
    
    data = request.get_json()
    case_id = data.get('case_id')
    
    # 获取案件信息
    case_result = db.get_case(case_id)
    if not case_result["success"]:
        return jsonify({"success": False, "error": "案件不存在"}), 404
    
    case_info = case_result["data"]
    
    # 获取所有文档
    docs_result = db.get_documents(case_id=case_id)
    documents = docs_result.get("data", []) if docs_result.get("success") else []
    
    result = llm_assistant.check_completeness(case_info, documents)
    if result["success"]:
        return jsonify(result), 200
    return jsonify(result), 500


# ==================== 进度管理 API ====================

@app.route('/api/progress/<case_id>', methods=['GET'])
def get_progress(case_id):
    """获取案件进度"""
    if not db:
        return jsonify({"success": False, "error": "数据库未初始化"}), 500
    
    result = db.get_progress(case_id)
    if result["success"]:
        return jsonify(result), 200
    return jsonify(result), 500


@app.route('/api/progress', methods=['POST'])
def create_progress():
    """创建进度记录"""
    if not db:
        return jsonify({"success": False, "error": "数据库未初始化"}), 500
    
    data = request.get_json()
    result = db.create_progress(data)
    
    if result["success"]:
        return jsonify(result), 201
    return jsonify(result), 400


@app.route('/api/progress/<progress_id>', methods=['PUT'])
def update_progress(progress_id):
    """更新进度"""
    if not db:
        return jsonify({"success": False, "error": "数据库未初始化"}), 500
    
    data = request.get_json()
    result = db.update_progress(progress_id, data)
    
    if result["success"]:
        return jsonify(result), 200
    return jsonify(result), 400


# ==================== 时间规划 API ====================

@app.route('/api/timeline/<case_id>', methods=['GET'])
def get_timeline(case_id):
    """获取时间规划"""
    if not db:
        return jsonify({"success": False, "error": "数据库未初始化"}), 500
    
    result = db.get_timeline(case_id)
    if result["success"]:
        return jsonify(result), 200
    return jsonify(result), 500


@app.route('/api/timeline', methods=['POST'])
def create_timeline():
    """创建时间规划"""
    if not db:
        return jsonify({"success": False, "error": "数据库未初始化"}), 500
    
    data = request.get_json()
    result = db.create_timeline(data)
    
    if result["success"]:
        return jsonify(result), 201
    return jsonify(result), 400


@app.route('/api/timeline/<timeline_id>', methods=['PUT'])
def update_timeline(timeline_id):
    """更新时间规划"""
    if not db:
        return jsonify({"success": False, "error": "数据库未初始化"}), 500
    
    data = request.get_json()
    result = db.update_timeline(timeline_id, data)
    
    if result["success"]:
        return jsonify(result), 200
    return jsonify(result), 400


if __name__ == '__main__':
    port = int(os.getenv('DOCUMENT_MANAGEMENT_PORT', '5003'))
    app.run(host='0.0.0.0', port=port, debug=True)

