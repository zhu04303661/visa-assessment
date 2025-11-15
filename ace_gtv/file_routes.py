#!/usr/bin/env python3
"""
文件上传管理路由
提供文件上传到 Supabase Storage 的功能
"""

import os
import logging
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from supabase_client import get_supabase_manager

from logger_config import setup_module_logger
logger = setup_module_logger("file_routes", os.getenv("LOG_LEVEL", "INFO"))

# 创建蓝图
file_bp = Blueprint('files', __name__, url_prefix='/api/files')
supabase = get_supabase_manager()


@file_bp.route('/upload', methods=['POST'])
async def upload_file():
    """
    上传文件到 Supabase Storage
    
    POST /api/files/upload
    Form Data:
        file: 文件
        user_id: 用户ID
        file_type: 文件类型 (resume/document/report)
    """
    try:
        # 验证请求
        if 'file' not in request.files:
            return jsonify({
                "error": "未选择文件"
            }), 400
        
        file = request.files['file']
        user_id = request.form.get('user_id')
        file_type = request.form.get('file_type', 'document')
        
        if not user_id:
            return jsonify({
                "error": "用户ID不能为空"
            }), 400
        
        if file.filename == '':
            return jsonify({
                "error": "文件名为空"
            }), 400
        
        # 保存临时文件
        filename = secure_filename(file.filename)
        temp_path = os.path.join('/tmp', filename)
        file.save(temp_path)
        
        # 上传到 Supabase
        result = await supabase.upload_file(
            user_id=user_id,
            file_path=temp_path,
            bucket_name='resumes',
            file_type=file_type
        )
        
        # 删除临时文件
        if os.path.exists(temp_path):
            os.remove(temp_path)
        
        if result.get('error'):
            return jsonify({
                "error": result['error']
            }), 400
        
        logger.info(f"✅ 文件上传成功: {filename}")
        return jsonify({
            "success": True,
            "message": "文件上传成功",
            "file_path": result.get('file_path'),
            "file_url": result.get('file_url')
        })
    
    except Exception as e:
        logger.error(f"❌ 文件上传失败: {e}")
        return jsonify({
            "error": str(e)
        }), 500


@file_bp.route('/user/<user_id>', methods=['GET'])
async def get_user_files(user_id: str):
    """
    获取用户上传的文件列表
    
    GET /api/files/user/<user_id>?file_type=resume
    """
    try:
        file_type = request.args.get('file_type')
        
        # 获取文件列表
        files = await supabase.get_user_files(
            user_id=user_id,
            file_type=file_type
        )
        
        logger.info(f"✅ 获取用户文件成功: {user_id}, 数量: {len(files)}")
        return jsonify({
            "success": True,
            "files": files,
            "count": len(files)
        })
    
    except Exception as e:
        logger.error(f"❌ 获取用户文件失败: {e}")
        return jsonify({
            "error": str(e)
        }), 500

