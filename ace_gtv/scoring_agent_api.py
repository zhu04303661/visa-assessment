#!/usr/bin/env python3
"""
GTV评分Agent API服务器
提供REST API接口用于评分项和维度分析
"""

import logging
import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from scoring_agent_lite import ScoringAgent

# ============================================================================
# 日志配置
# ============================================================================

log_level = os.getenv('LOG_LEVEL', 'INFO')
# 日志已由 logger_config 统一配置,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
from logger_config import setup_module_logger
logger = setup_module_logger(__name__.split(".")[-1], __import__("os").getenv("LOG_LEVEL", "INFO"))

# ============================================================================
# Flask应用初始化
# ============================================================================

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# 初始化评分Agent
agent = ScoringAgent()

# ============================================================================
# API端点
# ============================================================================

@app.route('/health', methods=['GET'])
def health():
    """健康检查端点"""
    return jsonify({
        'status': 'healthy',
        'service': 'scoring-agent',
        'version': '1.0.0'
    }), 200


@app.route('/api/scoring/analyze-item', methods=['POST'])
def analyze_item():
    """
    分析单个评分项
    
    请求体:
    {
        "item_name": "大学等级",
        "item_value": "top_country",
        "score": 5,
        "max_score": 5,
        "percentage": 100,
        "applicant_background": {
            "name": "张三",
            "education": {...},
            "work_experience": {...}
        }
    }
    """
    try:
        data = request.json or {}
        
        result = agent.analyze_item(
            item_name=data.get('item_name', ''),
            item_value=data.get('item_value'),
            score=data.get('score', 0),
            max_score=data.get('max_score', 5),
            percentage=data.get('percentage', 0),
            applicant_background=data.get('applicant_background', {})
        )
        
        logger.info(f"✅ 分析完成: {data.get('item_name')}")
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f"❌ 分析失败: {e}")
        return jsonify({
            'error': str(e),
            'status': 'failed'
        }), 400


@app.route('/api/scoring/analyze-dimension', methods=['POST'])
def analyze_dimension():
    """
    分析整个维度
    
    请求体:
    {
        "dimension_name": "教育背景",
        "items": [
            {
                "name": "大学等级",
                "value": "top_country",
                "score": 5,
                "maxScore": 5,
                "percentage": 100
            }
        ],
        "applicant_background": {...}
    }
    """
    try:
        data = request.json or {}
        
        result = agent.analyze_dimension(
            dimension_name=data.get('dimension_name', ''),
            items=data.get('items', []),
            applicant_background=data.get('applicant_background', {})
        )
        
        logger.info(f"✅ 维度分析完成: {data.get('dimension_name')}")
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f"❌ 维度分析失败: {e}")
        return jsonify({
            'error': str(e),
            'status': 'failed'
        }), 400


@app.route('/api/scoring/status', methods=['GET'])
def status():
    """
    获取服务状态
    """
    return jsonify({
        'status': 'running',
        'service': 'scoring-agent',
        'api_endpoints': [
            '/api/scoring/analyze-item',
            '/api/scoring/analyze-dimension',
            '/api/scoring/status'
        ],
        'llm_available': agent.llm is not None
    }), 200


# ============================================================================
# 错误处理
# ============================================================================

@app.errorhandler(400)
def bad_request(error):
    """处理400错误"""
    return jsonify({'error': 'Bad request'}), 400


@app.errorhandler(404)
def not_found(error):
    """处理404错误"""
    return jsonify({'error': 'Not found'}), 404


@app.errorhandler(500)
def internal_error(error):
    """处理500错误"""
    logger.error(f"Internal server error: {error}")
    return jsonify({'error': 'Internal server error'}), 500


# ============================================================================
# 主入口
# ============================================================================

if __name__ == '__main__':
    port = int(os.getenv('SCORING_AGENT_PORT', 5003))
    debug = os.getenv('DEBUG', 'False').lower() == 'true'
    
    logger.info('='*80)
    logger.info('🤖 GTV评分Agent API服务器')
    logger.info('='*80)
    logger.info(f'📡 启动地址: http://0.0.0.0:{port}')
    logger.info(f'🔍 调试模式: {debug}')
    logger.info(f'🧠 LLM可用: {agent.llm is not None}')
    logger.info('='*80)
    logger.info('可用API端点:')
    logger.info('  POST /api/scoring/analyze-item      - 分析单个评分项')
    logger.info('  POST /api/scoring/analyze-dimension - 分析整个维度')
    logger.info('  GET  /api/scoring/status           - 获取服务状态')
    logger.info('  GET  /health                        - 健康检查')
    logger.info('='*80)
    
    app.run(
        host='0.0.0.0',
        port=port,
        debug=debug,
        use_reloader=False
    )
