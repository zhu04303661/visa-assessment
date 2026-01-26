#!/usr/bin/env python3
"""
聊天记录管理路由
提供聊天消息的保存、查询等功能
"""

import os
import uuid
import logging
from flask import Blueprint, request, jsonify
from database.supabase_client import get_supabase_manager

from utils.logger_config import setup_module_logger
logger = setup_module_logger("chat_routes", os.getenv("LOG_LEVEL", "INFO"))

# 创建蓝图
chat_bp = Blueprint('chat', __name__, url_prefix='/api/chat')
supabase = get_supabase_manager()


@chat_bp.route('/message', methods=['POST'])
async def save_message():
    """
    保存聊天消息
    
    POST /api/chat/message
    Body: {
        "user_id": "user-uuid",
        "session_id": "session-uuid",
        "role": "user|assistant",
        "content": "消息内容",
        "metadata": { ... }
    }
    """
    try:
        data = request.get_json()
        
        # 验证必填字段
        required_fields = ['user_id', 'role', 'content']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    "error": f"{field} 不能为空"
                }), 400
        
        # 如果没有 session_id，生成一个新的
        session_id = data.get('session_id') or str(uuid.uuid4())
        
        # 保存消息
        result = await supabase.save_chat_message(
            user_id=data['user_id'],
            session_id=session_id,
            role=data['role'],
            content=data['content'],
            metadata=data.get('metadata')
        )
        
        if result.get('error'):
            return jsonify({
                "error": result['error']
            }), 400
        
        logger.info(f"✅ 聊天消息保存成功: {data['user_id']}")
        return jsonify({
            "success": True,
            "message": "消息保存成功",
            "session_id": session_id,
            "data": result.get('data')
        })
    
    except Exception as e:
        logger.error(f"❌ 聊天消息保存失败: {e}")
        return jsonify({
            "error": str(e)
        }), 500


@chat_bp.route('/history/<user_id>', methods=['GET'])
async def get_history(user_id: str):
    """
    获取用户的聊天历史
    
    GET /api/chat/history/<user_id>?session_id=xxx&limit=50
    """
    try:
        session_id = request.args.get('session_id')
        limit = request.args.get('limit', 50, type=int)
        
        # 获取聊天历史
        messages = await supabase.get_chat_history(
            user_id=user_id,
            session_id=session_id,
            limit=limit
        )
        
        logger.info(f"✅ 获取聊天历史成功: {user_id}, 数量: {len(messages)}")
        return jsonify({
            "success": True,
            "messages": messages,
            "count": len(messages)
        })
    
    except Exception as e:
        logger.error(f"❌ 获取聊天历史失败: {e}")
        return jsonify({
            "error": str(e)
        }), 500


@chat_bp.route('/sessions/<user_id>', methods=['GET'])
async def get_sessions(user_id: str):
    """
    获取用户的所有会话
    
    GET /api/chat/sessions/<user_id>
    """
    try:
        # 获取会话列表
        sessions = await supabase.get_user_sessions(user_id)
        
        logger.info(f"✅ 获取用户会话成功: {user_id}, 数量: {len(sessions)}")
        return jsonify({
            "success": True,
            "sessions": sessions,
            "count": len(sessions)
        })
    
    except Exception as e:
        logger.error(f"❌ 获取用户会话失败: {e}")
        return jsonify({
            "error": str(e)
        }), 500


@chat_bp.route('/session/new', methods=['POST'])
def create_session():
    """
    创建新的聊天会话
    
    POST /api/chat/session/new
    Body: {
        "user_id": "user-uuid",
        "title": "会话标题"
    }
    """
    try:
        data = request.get_json()
        
        # 生成新的 session_id
        session_id = str(uuid.uuid4())
        
        return jsonify({
            "success": True,
            "session_id": session_id,
            "message": "会话创建成功"
        })
    
    except Exception as e:
        logger.error(f"❌ 创建会话失败: {e}")
        return jsonify({
            "error": str(e)
        }), 500

