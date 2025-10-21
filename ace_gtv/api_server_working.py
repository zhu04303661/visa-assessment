#!/usr/bin/env python3
"""
ACE GTV API服务器 - 工作版本
提供REST API接口供Next.js应用调用
"""

import json
import os
import sys
from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
import sys
from datetime import datetime

# 添加当前目录到Python路径
sys.path.append(os.path.dirname(__file__))

from gtv_ace_with_responses import GTVACEAgent

# 配置日志（支持环境变量 LOG_LEVEL）
_level_name = os.getenv("LOG_LEVEL", "INFO").upper()
_level = getattr(logging, _level_name, logging.INFO)
# 统一日志（UTF-8、文件+控制台、包含文件与行号）
logger = logging.getLogger("ace_api")
logger.setLevel(_level)

if logger.handlers:
    for h in list(logger.handlers):
        logger.removeHandler(h)

_fmt = logging.Formatter('%(asctime)s %(levelname)s %(filename)s:%(lineno)d %(message)s')

try:
    from pathlib import Path as _Path
    _log_file = _Path(__file__).with_name('ace_server.log')
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

app = Flask(__name__)
CORS(app)  # 允许跨域请求

# 全局ACE代理实例
ace_agent = None

def _get_fallback_response(question: str) -> str:
    """获取回退响应"""
    question_lower = question.lower()
    
    if "test" in question_lower or "测试" in question_lower:
        return "欢迎使用GTV签证评估系统！我是您的AI评估助手，可以帮您分析GTV签证申请条件。请告诉我您的专业背景、工作经验和具体问题。"
    elif "研发" in question_lower and "总监" in question_lower:
        return "作为AI领域的研发总监，您具备申请GTV Exceptional Talent签证的潜力。建议重点展示：1) 团队领导经验 2) 技术创新成果 3) 行业影响力 4) 未来发展规划"
    elif "ai" in question_lower or "人工智能" in question_lower:
        return "AI领域是GTV签证的热门申请领域。建议申请GTV Exceptional Promise签证，需要展示：1) 创新技术项目 2) 未来5-10年发展计划 3) 对AI领域的贡献潜力"
    else:
        return "GTV Exceptional Talent签证要求：1) 国际认可的杰出成就 2) 获奖记录或专利 3) 发表论文或作品 4) 行业领导地位 5) 未来贡献潜力"

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
        
        # 构建响应 - 支持新的结构化格式
        if result.get("knowledge_base"):
            # 新格式：返回结构化数据
            response = {
                "success": result.get("success", False),
                "knowledge_base": result.get("knowledge_base", {}),
                "reasoning": result.get("reasoning", {}),
                "context": result.get("context", {}),
                "timestamp": datetime.now().isoformat()
            }
        else:
            # 旧格式：兼容性处理
            answer = result.get("answer", result.get("final_answer", ""))
            if not answer or answer.strip() == "":
                answer = _get_fallback_response(question)
            
            response = {
                "success": result.get("success", False),
                "message": answer,
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

@app.route('/api/ace/bullets', methods=['GET'])
def get_all_bullets():
    """获取所有知识条目"""
    try:
        agent = get_ace_agent()
        bullets = agent.get_all_bullets()
        
        return jsonify({
            "success": True,
            "bullets": bullets
        })
        
    except Exception as e:
        logger.error(f"获取知识条目错误: {e}")
        return jsonify({
            "success": False,
            "error": f"获取知识条目失败: {str(e)}"
        }), 500

@app.route('/api/ace/bullets', methods=['POST'])
def add_bullet():
    """添加知识条目"""
    try:
        data = request.get_json()
        section = data.get('section', 'defaults')
        content = data.get('content', '')
        bullet_id = data.get('bullet_id')
        
        if not content:
            return jsonify({
                "success": False,
                "error": "内容不能为空"
            }), 400
        
        agent = get_ace_agent()
        result = agent.add_bullet_manual(section, content, bullet_id)
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"添加知识条目错误: {e}")
        return jsonify({
            "success": False,
            "error": f"添加知识条目失败: {str(e)}"
        }), 500

@app.route('/api/ace/bullets/<bullet_id>', methods=['PUT'])
def update_bullet(bullet_id):
    """更新知识条目"""
    try:
        data = request.get_json()
        content = data.get('content')
        section = data.get('section')
        
        agent = get_ace_agent()
        result = agent.update_bullet_manual(bullet_id, content, section)
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"更新知识条目错误: {e}")
        return jsonify({
            "success": False,
            "error": f"更新知识条目失败: {str(e)}"
        }), 500

@app.route('/api/ace/bullets/<bullet_id>', methods=['DELETE'])
def delete_bullet(bullet_id):
    """删除知识条目"""
    try:
        agent = get_ace_agent()
        result = agent.delete_bullet_manual(bullet_id)
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"删除知识条目错误: {e}")
        return jsonify({
            "success": False,
            "error": f"删除知识条目失败: {str(e)}"
        }), 500

@app.route('/api/ace/reset-playbook', methods=['POST'])
def reset_playbook():
    """重置知识库"""
    try:
        agent = get_ace_agent()
        result = agent.reset_playbook()
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"重置知识库错误: {e}")
        return jsonify({
            "success": False,
            "error": f"重置知识库失败: {str(e)}"
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

@app.route('/api/ace/reload', methods=['POST'])
def reload_playbook():
    """重新加载知识库"""
    try:
        global ace_agent
        ace_agent = None  # 重置代理实例
        agent = get_ace_agent()  # 重新创建代理，会重新加载知识库
        
        return jsonify({
            "success": True,
            "message": "知识库已重新加载",
            "bullet_count": len(agent.get_all_bullets())
        })
        
    except Exception as e:
        logger.error(f"重新加载知识库错误: {e}")
        return jsonify({
            "success": False,
            "error": f"重新加载知识库失败: {str(e)}"
        }), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "接口不存在"}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "服务器内部错误"}), 500

if __name__ == '__main__':
    print("🚀 启动GTV ACE API服务器...")
    print("📡 API地址: http://localhost:5001")
    print("🔗 健康检查: http://localhost:5001/health")
    print("💬 聊天接口: http://localhost:5001/api/ace/chat")
    print("📚 知识库状态: http://localhost:5001/api/ace/playbook")
    
    app.run(host='0.0.0.0', port=5001, debug=True)
