#!/usr/bin/env python3
"""
Simple GTV API Server - Standalone version without ACE framework dependency
提供REST API接口供Next.js应用调用
"""

import json
import os
import sys
from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
from datetime import datetime

app = Flask(__name__)
CORS(app)  # 允许跨域请求

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.route('/health', methods=['GET'])
def health_check():
    """健康检查接口"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "GTV Simple API Server"
    })

@app.route('/api/ace/chat', methods=['POST'])
def ace_chat():
    """ACE聊天接口 - 简化版"""
    try:
        data = request.get_json()
        if not data or 'message' not in data:
            return jsonify({"error": "缺少message字段"}), 400

        message = data['message']
        logger.info(f"收到消息: {message}")

        # 简化版响应 - 模拟GTV评估
        response = {
            "response": f"收到您的消息: {message}",
            "suggestions": [
                "建议1: 请提供更多详细信息",
                "建议2: 考虑申请技术移民类别",
                "建议3: 检查您的资格评分"
            ],
            "confidence": 0.8,
            "timestamp": datetime.now().isoformat()
        }

        return jsonify(response)

    except Exception as e:
        logger.error(f"处理消息时出错: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/ace/evaluate', methods=['POST'])
def ace_evaluate():
    """GTV评估接口 - 简化版"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "缺少请求数据"}), 400

        logger.info(f"收到评估请求: {data}")

        # 简化版评估响应
        evaluation = {
            "score": 75,
            "category": "技术移民",
            "recommendations": [
                "您的条件符合技术移民基本要求",
                "建议提高语言成绩以增加成功率",
                "考虑获得加拿大工作经验"
            ],
            "requirements_check": {
                "age": True,
                "education": True,
                "work_experience": True,
                "language": False,  # 需要提高
                "adaptability": True
            },
            "timestamp": datetime.now().isoformat()
        }

        return jsonify(evaluation)

    except Exception as e:
        logger.error(f"评估时出错: {e}")
        return jsonify({"error": str(e)}), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "接口不存在"}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "服务器内部错误"}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    debug = os.environ.get('DEBUG', 'False').lower() == 'true'

    logger.info(f"启动GTV简单API服务器，端口: {port}, 调试模式: {debug}")
    app.run(host='0.0.0.0', port=port, debug=debug)