#!/usr/bin/env python3
"""
文档分析API - Flask服务器
提供文件上传、解析和知识提取的REST API接口
"""

import os
import logging
import tempfile
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename

from processors.document_analyzer import KnowledgeExtractor, DocumentExtractor

# 配置
ALLOWED_EXTENSIONS = {'xlsx', 'xls', 'docx', 'doc', 'txt'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
UPLOAD_TEMP_DIR = tempfile.gettempdir()

# 日志配置
# 日志已由 logger_config 统一配置
from utils.logger_config import setup_module_logger
logger = setup_module_logger(__name__.split(".")[-1], __import__("os").getenv("LOG_LEVEL", "INFO"))

# Flask应用
app = Flask(__name__)
CORS(app)

# 初始化知识提取器
knowledge_extractor = KnowledgeExtractor()

def allowed_file(filename):
    """检查文件是否允许"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/health', methods=['GET'])
def health():
    """健康检查"""
    return jsonify({
        'status': 'healthy',
        'service': 'document-analyzer',
        'version': '1.0.0'
    }), 200

@app.route('/api/documents/analyze', methods=['POST'])
def analyze_document():
    """
    分析上传的文档
    
    请求体:
    {
        "file": <binary file>,
        "extractOnly": boolean (可选，仅提取内容不分析)
    }
    
    响应:
    {
        "success": boolean,
        "file": string,
        "items": [知识条目],
        "analysis_time": string,
        ...
    }
    """
    logger.info("📥 收到文档分析请求...")
    
    try:
        # 检查文件
        if 'file' not in request.files:
            logger.error("❌ 未上传文件")
            return jsonify({'error': '未提供文件'}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            logger.error("❌ 文件名为空")
            return jsonify({'error': '文件名为空'}), 400
        
        if not allowed_file(file.filename):
            logger.error(f"❌ 不支持的文件格式: {file.filename}")
            return jsonify({'error': f'不支持的文件格式。支持: {",".join(ALLOWED_EXTENSIONS)}'}), 400
        
        # 检查文件大小
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)
        
        if file_size > MAX_FILE_SIZE:
            logger.error(f"❌ 文件过大: {file_size} > {MAX_FILE_SIZE}")
            return jsonify({'error': f'文件过大（最大{MAX_FILE_SIZE//1024//1024}MB）'}), 400
        
        # 保存临时文件
        filename = secure_filename(file.filename)
        temp_path = os.path.join(UPLOAD_TEMP_DIR, f"analysis_{filename}")
        file.save(temp_path)
        logger.info(f"✅ 文件保存到: {temp_path}")
        
        # 选择处理方式
        extract_only = request.form.get('extractOnly', 'false').lower() == 'true'
        
        if extract_only:
            # 仅提取文本内容，不进行LLM分析
            logger.info("📄 模式: 仅提取文本内容")
            content = DocumentExtractor.extract_from_file(temp_path)
            result = {
                'success': True,
                'file': filename,
                'content': content,
                'content_length': len(content),
                'mode': 'extract_only'
            }
        else:
            # 完整分析流程
            logger.info("🔍 模式: 完整分析")
            result = knowledge_extractor.analyze_and_extract(temp_path)
        
        # 清理临时文件
        try:
            os.remove(temp_path)
            logger.info("🗑️  临时文件已删除")
        except:
            pass
        
        return jsonify(result), 200
    
    except Exception as e:
        logger.error(f"❌ 处理失败: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/documents/extract', methods=['POST'])
def extract_text():
    """
    仅提取文件文本内容
    
    请求体: 同 /analyze
    响应: 包含提取的文本内容
    """
    logger.info("📥 收到文本提取请求...")
    
    # 重用analyze_document但设置extractOnly标志
    request.form = request.form.to_dict()
    request.form['extractOnly'] = 'true'
    
    return analyze_document()

@app.route('/api/documents/validate', methods=['POST'])
def validate_file():
    """
    验证文件是否有效
    
    请求体:
    {
        "file": <binary file>
    }
    
    响应:
    {
        "valid": boolean,
        "format": string,
        "size": integer,
        "message": string
    }
    """
    logger.info("✅ 验证文件...")
    
    try:
        if 'file' not in request.files:
            return jsonify({
                'valid': False,
                'message': '未提供文件'
            }), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({
                'valid': False,
                'message': '文件名为空'
            }), 400
        
        filename = secure_filename(file.filename)
        
        # 检查格式
        if not allowed_file(filename):
            return jsonify({
                'valid': False,
                'format': filename.rsplit('.', 1)[1].lower() if '.' in filename else 'unknown',
                'message': f'不支持的文件格式。支持: {",".join(ALLOWED_EXTENSIONS)}'
            }), 400
        
        # 检查大小
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)
        
        if file_size > MAX_FILE_SIZE:
            return jsonify({
                'valid': False,
                'size': file_size,
                'message': f'文件过大（最大{MAX_FILE_SIZE//1024//1024}MB）'
            }), 400
        
        return jsonify({
            'valid': True,
            'format': filename.rsplit('.', 1)[1].lower(),
            'size': file_size,
            'message': '文件有效'
        }), 200
    
    except Exception as e:
        logger.error(f"❌ 验证失败: {e}")
        return jsonify({
            'valid': False,
            'message': f'验证失败: {str(e)}'
        }), 500

@app.route('/api/documents/formats', methods=['GET'])
def supported_formats():
    """获取支持的文件格式"""
    return jsonify({
        'formats': list(ALLOWED_EXTENSIONS),
        'max_size_mb': MAX_FILE_SIZE // 1024 // 1024,
        'description': {
            'xlsx': 'Excel 工作簿 (2007+)',
            'xls': 'Excel 工作簿 (97-2003)',
            'docx': 'Word 文档 (2007+)',
            'doc': 'Word 文档 (97-2003)',
            'txt': '纯文本文件'
        }
    }), 200

if __name__ == '__main__':
    logger.info("\n" + "="*80)
    logger.info("启动文档分析API服务器...")
    logger.info("="*80)
    logger.info(f"📚 支持的文件格式: {', '.join(ALLOWED_EXTENSIONS)}")
    logger.info(f"📦 最大文件大小: {MAX_FILE_SIZE//1024//1024}MB")
    logger.info(f"🚀 API运行在: http://localhost:5004")
    logger.info("="*80 + "\n")
    
    app.run(host='0.0.0.0', port=5004, debug=True)
