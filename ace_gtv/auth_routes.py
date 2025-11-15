#!/usr/bin/env python3
"""
用户认证和管理路由
提供注册、登录、会话管理等功能
"""

import os
import logging
from flask import Blueprint, request, jsonify
from supabase_client import get_supabase_manager

from logger_config import setup_module_logger
logger = setup_module_logger("auth_routes", os.getenv("LOG_LEVEL", "INFO"))

# 创建蓝图
auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')
supabase = get_supabase_manager()


@auth_bp.route('/register', methods=['POST'])
async def register():
    """
    用户注册
    
    POST /api/auth/register
    Body: {
        "email": "user@example.com",
        "password": "password123",
        "full_name": "用户名",
        "phone": "电话号码"
    }
    """
    try:
        data = request.get_json()
        
        # 验证必填字段
        if not data.get('email') or not data.get('password'):
            return jsonify({
                "error": "邮箱和密码不能为空"
            }), 400
        
        # 创建用户
        result = await supabase.create_user(
            email=data['email'],
            password=data['password'],
            user_data={
                "full_name": data.get('full_name', ''),
                "phone": data.get('phone', '')
            }
        )
        
        if result.get('error'):
            return jsonify({
                "error": result['error']
            }), 400
        
        logger.info(f"✅ 用户注册成功: {data['email']}")
        return jsonify({
            "success": True,
            "message": "注册成功",
            "user": result.get('user'),
            "session": result.get('session')
        })
    
    except Exception as e:
        logger.error(f"❌ 用户注册失败: {e}")
        return jsonify({
            "error": str(e)
        }), 500


@auth_bp.route('/login', methods=['POST'])
async def login():
    """
    用户登录
    
    POST /api/auth/login
    Body: {
        "email": "user@example.com",
        "password": "password123"
    }
    """
    try:
        data = request.get_json()
        
        # 验证必填字段
        if not data.get('email') or not data.get('password'):
            return jsonify({
                "error": "邮箱和密码不能为空"
            }), 400
        
        # 登录
        result = await supabase.login_user(
            email=data['email'],
            password=data['password']
        )
        
        if result.get('error'):
            return jsonify({
                "error": result['error']
            }), 401
        
        logger.info(f"✅ 用户登录成功: {data['email']}")
        return jsonify({
            "success": True,
            "message": "登录成功",
            "user": result.get('user'),
            "session": result.get('session')
        })
    
    except Exception as e:
        logger.error(f"❌ 用户登录失败: {e}")
        return jsonify({
            "error": str(e)
        }), 500


@auth_bp.route('/user/<user_id>', methods=['GET'])
async def get_user(user_id: str):
    """
    获取用户信息
    
    GET /api/auth/user/<user_id>
    """
    try:
        user = await supabase.get_user(user_id)
        
        if not user:
            return jsonify({
                "error": "用户不存在"
            }), 404
        
        return jsonify({
            "success": True,
            "user": user
        })
    
    except Exception as e:
        logger.error(f"❌ 获取用户信息失败: {e}")
        return jsonify({
            "error": str(e)
        }), 500


@auth_bp.route('/logout', methods=['POST'])
def logout():
    """
    用户登出
    
    POST /api/auth/logout
    """
    try:
        # Supabase 登出通常在客户端处理
        # 这里只是一个占位符
        return jsonify({
            "success": True,
            "message": "登出成功"
        })
    
    except Exception as e:
        logger.error(f"❌ 用户登出失败: {e}")
        return jsonify({
            "error": str(e)
        }), 500

