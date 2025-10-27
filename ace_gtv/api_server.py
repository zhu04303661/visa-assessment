#!/usr/bin/env python3
"""
ACE GTV API服务器
提供REST API接口供Next.js应用调用
"""

import json
import os
import sys
from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
from datetime import datetime

# 添加当前目录到Python路径
sys.path.append(os.path.dirname(__file__))

from gtv_ace_agent import GTVACEAgent

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # 允许跨域请求

# 全局ACE代理实例
ace_agent = None

def get_ace_agent():
    """获取ACE代理实例（单例模式）"""
    global ace_agent
    if ace_agent is None:
        ace_agent = GTVACEAgent()
        logger.info("ACE代理已初始化")
    return ace_agent

@app.route('/health', methods=['GET'])
def health_check():
    """健康检查接口"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "GTV ACE Agent API"
    })

@app.route('/api/ace/chat', methods=['POST'])
def ace_chat():
    """ACE聊天接口"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "请求数据不能为空"}), 400
        
        question = data.get('message', '')
        context = data.get('context', '')
        conversation_history = data.get('conversationHistory', [])
        
        if not question:
            return jsonify({"error": "问题不能为空"}), 400
        
        # 获取ACE代理
        agent = get_ace_agent()
        
        # 处理问题
        result = agent.process_question(question, context)
        
        # 构建响应
        response = {
            "success": result.get("success", False),
            "message": result.get("answer", "处理失败"),
            "reasoning": result.get("reasoning", ""),
            "score": result.get("score", 0),
            "feedback": result.get("feedback", ""),
            "assessmentData": result.get("assessment_data", {}),
            "playbookStats": result.get("playbook_stats", {}),
            "evolutionInsights": result.get("evolution_insights", {}),
            "timestamp": datetime.now().isoformat()
        }
        
        if not result.get("success", False):
            response["error"] = result.get("error", "未知错误")
        
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"ACE聊天接口错误: {e}")
        return jsonify({
            "success": False,
            "error": f"服务器内部错误: {str(e)}",
            "message": "抱歉，处理您的请求时出现了问题。请稍后重试。"
        }), 500

@app.route('/api/ace/playbook', methods=['GET'])
def get_playbook():
    """获取知识库状态"""
    try:
        agent = get_ace_agent()
        status = agent.get_playbook_status()
        
        return jsonify({
            "success": True,
            "playbook": status
        })
        
    except Exception as e:
        logger.error(f"获取知识库状态错误: {e}")
        return jsonify({
            "success": False,
            "error": f"获取知识库状态失败: {str(e)}"
        }), 500

@app.route('/api/ace/reset', methods=['POST'])
def reset_assessment():
    """重置评估"""
    try:
        agent = get_ace_agent()
        agent.reset_assessment()
        
        return jsonify({
            "success": True,
            "message": "评估已重置"
        })
        
    except Exception as e:
        logger.error(f"重置评估错误: {e}")
        return jsonify({
            "success": False,
            "error": f"重置评估失败: {str(e)}"
        }), 500

@app.route('/api/ace/evolve', methods=['POST'])
def evolve_playbook():
    """手动触发知识库进化"""
    try:
        data = request.get_json()
        question = data.get('question', '')
        context = data.get('context', '')
        
        if not question:
            return jsonify({"error": "问题不能为空"}), 400
        
        agent = get_ace_agent()
        result = agent.process_question(question, context)
        
        return jsonify({
            "success": result.get("success", False),
            "evolution": result.get("evolution_insights", {}),
            "playbookStats": result.get("playbook_stats", {})
        })
        
    except Exception as e:
        logger.error(f"知识库进化错误: {e}")
        return jsonify({
            "success": False,
            "error": f"知识库进化失败: {str(e)}"
        }), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "接口不存在"}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "服务器内部错误"}), 500

if __name__ == '__main__':
    print("🚀 启动GTV ACE API服务器...")
    print("📡 API地址: http://0.0.0.0:5000")
    print("🔗 健康检查: http://0.0.0.0:5000/health")
    print("💬 聊天接口: http://0.0.0.0:5000/api/ace/chat")
    print("📚 知识库状态: http://0.0.0.0:5000/api/ace/playbook")
    
    app.run(host='0.0.0.0', port=5000, debug=True)
