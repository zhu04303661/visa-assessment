#!/usr/bin/env python3
"""
评估记录管理路由
提供评估记录的保存、查询等功能
"""

import os
import logging
from flask import Blueprint, request, jsonify
from supabase_client import get_supabase_manager

from logger_config import setup_module_logger
logger = setup_module_logger("assessment_routes", os.getenv("LOG_LEVEL", "INFO"))

# 创建蓝图
assessment_bp = Blueprint('assessment', __name__, url_prefix='/api/assessments')
supabase = get_supabase_manager()


@assessment_bp.route('/', methods=['POST'])
async def save_assessment():
    """
    保存评估记录
    
    POST /api/assessments/
    Body: {
        "user_id": "user-uuid",
        "assessment_data": { ... }
    }
    """
    try:
        data = request.get_json()
        
        # 验证必填字段
        if not data.get('user_id') or not data.get('assessment_data'):
            return jsonify({
                "error": "用户ID和评估数据不能为空"
            }), 400
        
        # 保存评估记录
        result = await supabase.save_assessment(
            user_id=data['user_id'],
            assessment_data=data['assessment_data']
        )
        
        if result.get('error'):
            return jsonify({
                "error": result['error']
            }), 400
        
        logger.info(f"✅ 评估记录保存成功: {data['user_id']}")
        return jsonify({
            "success": True,
            "message": "评估记录保存成功",
            "data": result.get('data')
        })
    
    except Exception as e:
        logger.error(f"❌ 评估记录保存失败: {e}")
        return jsonify({
            "error": str(e)
        }), 500


@assessment_bp.route('/user/<user_id>', methods=['GET'])
async def get_user_assessments(user_id: str):
    """
    获取用户的评估记录列表
    
    GET /api/assessments/user/<user_id>?limit=10
    """
    try:
        limit = request.args.get('limit', 10, type=int)
        
        # 获取评估记录
        assessments = await supabase.get_user_assessments(
            user_id=user_id,
            limit=limit
        )
        
        logger.info(f"✅ 获取评估记录成功: {user_id}, 数量: {len(assessments)}")
        return jsonify({
            "success": True,
            "assessments": assessments,
            "count": len(assessments)
        })
    
    except Exception as e:
        logger.error(f"❌ 获取评估记录失败: {e}")
        return jsonify({
            "error": str(e)
        }), 500


@assessment_bp.route('/<assessment_id>', methods=['GET'])
async def get_assessment(assessment_id: str):
    """
    获取单个评估记录
    
    GET /api/assessments/<assessment_id>
    """
    try:
        # 获取评估记录
        assessment = await supabase.get_assessment_by_id(assessment_id)
        
        if not assessment:
            return jsonify({
                "error": "评估记录不存在"
            }), 404
        
        return jsonify({
            "success": True,
            "assessment": assessment
        })
    
    except Exception as e:
        logger.error(f"❌ 获取评估记录失败: {e}")
        return jsonify({
            "error": str(e)
        }), 500

