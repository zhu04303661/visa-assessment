#!/usr/bin/env python3
"""
GTV签证评估结果数据库管理器
使用SQLite轻量级数据库存储评估结果
"""

import sqlite3
import json
import logging
import os
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple
from contextlib import contextmanager

# 配置日志
# 日志已由 logger_config 统一配置
from utils.logger_config import setup_module_logger
logger = setup_module_logger(__name__.split(".")[-1], __import__("os").getenv("LOG_LEVEL", "INFO"))

class GTVAssessmentDatabase:
    """GTV签证评估结果数据库管理器"""
    
    def __init__(self, db_path: str = "assessments.db"):
        self.db_path = db_path
        self._init_database()
    
    def _init_database(self):
        """初始化数据库表结构（简化版：只有 assessments 和 uploaded_files 表）"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                # 创建评估结果主表（所有详细数据存储在 raw_data JSON 中）
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS assessments (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        assessment_id TEXT UNIQUE NOT NULL,
                        applicant_name TEXT NOT NULL,
                        applicant_email TEXT,
                        field TEXT,
                        current_position TEXT,
                        company TEXT,
                        years_of_experience INTEGER,
                        overall_score INTEGER,
                        gtv_pathway TEXT,
                        eligibility_level TEXT,
                        pathway_analysis TEXT,
                        final_recommendation TEXT,
                        timeline TEXT,
                        estimated_budget_min INTEGER,
                        estimated_budget_max INTEGER,
                        estimated_budget_currency TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        raw_data TEXT
                    )
                ''')
                
                # 创建上传文件记录表
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS uploaded_files (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        assessment_id TEXT,
                        project_id TEXT,
                        file_name TEXT NOT NULL,
                        file_type TEXT,
                        file_size INTEGER DEFAULT 0,
                        storage_type TEXT DEFAULT 'local',
                        local_path TEXT,
                        object_bucket TEXT,
                        object_key TEXT,
                        category TEXT,
                        description TEXT,
                        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (assessment_id) REFERENCES assessments (assessment_id)
                    )
                ''')
                
                # 创建索引
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_assessments_id ON assessments (assessment_id)')
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_uploaded_files_assessment ON uploaded_files (assessment_id)')
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_uploaded_files_project ON uploaded_files (project_id)')
                
                conn.commit()
                logger.info("数据库表结构初始化完成")
                
        except Exception as e:
            logger.error(f"数据库初始化失败: {e}")
            raise
    
    @contextmanager
    def _get_connection(self):
        """获取数据库连接"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row  # 使结果可以按列名访问
        try:
            yield conn
        finally:
            conn.close()
    
    def save_assessment(self, assessment_data: Dict[str, Any], assessment_id: str = None) -> str:
        """保存评估结果到数据库（所有详细数据存储在 raw_data JSON 中）"""
        try:
            if not assessment_id:
                assessment_id = f"GTV_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                # 提取基本信息
                applicant_info = assessment_data.get('applicantInfo', {})
                gtv_pathway = assessment_data.get('gtvPathway', {})
                estimated_budget = assessment_data.get('estimatedBudget', {})
                
                # 插入主表数据（所有详细信息存储在 raw_data JSON 中）
                cursor.execute('''
                    INSERT OR REPLACE INTO assessments (
                        assessment_id, applicant_name, applicant_email, field,
                        current_position, company, years_of_experience,
                        overall_score, gtv_pathway, eligibility_level,
                        pathway_analysis, final_recommendation, timeline,
                        estimated_budget_min, estimated_budget_max,
                        estimated_budget_currency, raw_data
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    assessment_id,
                    applicant_info.get('name', ''),
                    applicant_info.get('email', ''),
                    applicant_info.get('field', ''),
                    applicant_info.get('currentPosition', ''),
                    applicant_info.get('company', ''),
                    applicant_info.get('yearsOfExperience', 0),
                    assessment_data.get('overallScore', 0),
                    gtv_pathway.get('recommendedRoute', ''),
                    gtv_pathway.get('eligibilityLevel', ''),
                    gtv_pathway.get('analysis', ''),
                    assessment_data.get('recommendation', ''),
                    assessment_data.get('timeline', ''),
                    estimated_budget.get('min', 0),
                    estimated_budget.get('max', 0),
                    estimated_budget.get('currency', 'GBP'),
                    json.dumps(assessment_data, ensure_ascii=False)
                ))
                
                conn.commit()
                logger.info(f"评估结果已保存到数据库: {assessment_id}")
                return assessment_id
                
        except Exception as e:
            logger.error(f"保存评估结果到数据库失败: {e}")
            raise
    
    def get_assessment(self, assessment_id: str) -> Optional[Dict[str, Any]]:
        """从数据库获取评估结果（从 raw_data JSON 读取完整数据）"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                # 获取主表数据
                cursor.execute('SELECT * FROM assessments WHERE assessment_id = ?', (assessment_id,))
                assessment_row = cursor.fetchone()
                
                if not assessment_row:
                    return None
                
                # 优先从 raw_data 读取完整数据
                raw_data = assessment_row['raw_data']
                if raw_data:
                    try:
                        assessment_data = json.loads(raw_data)
                        # 添加数据库字段
                        assessment_data['assessment_id'] = assessment_row['assessment_id']
                        assessment_data['created_at'] = assessment_row['created_at']
                        assessment_data['updated_at'] = assessment_row['updated_at']
                        return assessment_data
                    except json.JSONDecodeError:
                        pass
                
                # 如果 raw_data 解析失败，从字段构建基本数据
                assessment_data = {
                    'assessment_id': assessment_row['assessment_id'],
                    'applicantInfo': {
                        'name': assessment_row['applicant_name'],
                        'email': assessment_row['applicant_email'],
                        'field': assessment_row['field'],
                        'currentPosition': assessment_row['current_position'],
                        'company': assessment_row['company'],
                        'yearsOfExperience': assessment_row['years_of_experience']
                    },
                    'overallScore': assessment_row['overall_score'],
                    'gtvPathway': {
                        'recommendedRoute': assessment_row['gtv_pathway'],
                        'eligibilityLevel': assessment_row['eligibility_level'],
                        'analysis': assessment_row['pathway_analysis']
                    },
                    'recommendation': assessment_row['final_recommendation'],
                    'timeline': assessment_row['timeline'],
                    'estimatedBudget': {
                        'min': assessment_row['estimated_budget_min'],
                        'max': assessment_row['estimated_budget_max'],
                        'currency': assessment_row['estimated_budget_currency']
                    },
                    'created_at': assessment_row['created_at'],
                    'updated_at': assessment_row['updated_at']
                }
                
                return assessment_data
                
        except Exception as e:
            logger.error(f"从数据库获取评估结果失败: {e}")
            raise
    
    def list_assessments(self, limit: int = 50) -> List[Dict[str, Any]]:
        """列出所有评估结果"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    SELECT assessment_id, applicant_name, field, overall_score, 
                           gtv_pathway, created_at, updated_at
                    FROM assessments 
                    ORDER BY created_at DESC 
                    LIMIT ?
                ''', (limit,))
                
                rows = cursor.fetchall()
                return [
                    {
                        'assessment_id': row['assessment_id'],
                        'applicant_name': row['applicant_name'],
                        'field': row['field'],
                        'overall_score': row['overall_score'],
                        'gtv_pathway': row['gtv_pathway'],
                        'created_at': row['created_at'],
                        'updated_at': row['updated_at']
                    }
                    for row in rows
                ]
                
        except Exception as e:
            logger.error(f"列出评估结果失败: {e}")
            return []
    
    def delete_assessment(self, assessment_id: str) -> bool:
        """删除评估结果"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                # 删除主表数据
                cursor.execute('DELETE FROM assessments WHERE assessment_id = ?', (assessment_id,))
                
                conn.commit()
                logger.info(f"评估结果已删除: {assessment_id}")
                return True
                
        except Exception as e:
            logger.error(f"删除评估结果失败: {e}")
            return False
    
    def get_assessment_count(self) -> int:
        """获取评估结果总数"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute('SELECT COUNT(*) FROM assessments')
                return cursor.fetchone()[0]
        except Exception as e:
            logger.error(f"获取评估结果总数失败: {e}")
            return 0
    
    # ==================== 文件上传记录管理 ====================
    
    def save_uploaded_file(
        self,
        file_name: str,
        file_type: str = None,
        file_size: int = 0,
        storage_type: str = "local",
        local_path: str = None,
        object_bucket: str = None,
        object_key: str = None,
        minio_url: str = None,
        category: str = None,
        description: str = None,
        assessment_id: str = None,
        project_id: str = None
    ) -> Dict[str, Any]:
        """
        保存上传文件记录
        
        Args:
            file_name: 文件名
            file_type: 文件类型
            file_size: 文件大小
            storage_type: 存储类型 (local/minio)
            local_path: 本地路径
            object_bucket: MinIO bucket 名称
            object_key: MinIO 对象名称
            minio_url: MinIO 访问 URL
            category: 文件分类
            description: 描述
            assessment_id: 关联的评估 ID
            project_id: 关联的项目 ID
        
        Returns:
            保存结果
        """
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT INTO uploaded_files (
                        assessment_id, project_id, file_name, file_type, file_size,
                        storage_type, local_path, object_bucket, object_key, 
                        minio_url, category, description
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    assessment_id, project_id, file_name, file_type, file_size,
                    storage_type, local_path, object_bucket, object_key,
                    minio_url, category, description
                ))
                
                file_id = cursor.lastrowid
                conn.commit()
                
                logger.info(f"文件记录保存成功: {file_name} (id={file_id})")
                return {
                    "success": True,
                    "file_id": file_id,
                    "message": "文件记录保存成功"
                }
                
        except Exception as e:
            logger.error(f"保存文件记录失败: {e}")
            return {"success": False, "error": str(e)}
    
    def get_uploaded_files(
        self,
        assessment_id: str = None,
        project_id: str = None,
        category: str = None
    ) -> List[Dict[str, Any]]:
        """
        获取上传的文件列表
        
        Args:
            assessment_id: 评估 ID（可选）
            project_id: 项目 ID（可选）
            category: 文件分类（可选）
        
        Returns:
            文件列表
        """
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                query = 'SELECT * FROM uploaded_files WHERE 1=1'
                params = []
                
                if assessment_id:
                    query += ' AND assessment_id = ?'
                    params.append(assessment_id)
                
                if project_id:
                    query += ' AND project_id = ?'
                    params.append(project_id)
                
                if category:
                    query += ' AND category = ?'
                    params.append(category)
                
                query += ' ORDER BY uploaded_at DESC'
                
                cursor.execute(query, params)
                rows = cursor.fetchall()
                
                return [
                    {
                        'id': row['id'],
                        'assessment_id': row['assessment_id'],
                        'project_id': row['project_id'],
                        'file_name': row['file_name'],
                        'file_type': row['file_type'],
                        'file_size': row['file_size'],
                        'storage_type': row['storage_type'],
                        'local_path': row['local_path'],
                        'object_bucket': row['object_bucket'],
                        'object_key': row['object_key'],
                        'object_url': row['object_url'],
                        'category': row['category'],
                        'description': row['description'],
                        'uploaded_at': row['uploaded_at']
                    }
                    for row in rows
                ]
                
        except Exception as e:
            logger.error(f"获取文件列表失败: {e}")
            return []
    
    def get_uploaded_file(self, file_id: int) -> Optional[Dict[str, Any]]:
        """获取单个文件记录"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute('SELECT * FROM uploaded_files WHERE id = ?', (file_id,))
                row = cursor.fetchone()
                
                if row:
                    return {
                        'id': row['id'],
                        'assessment_id': row['assessment_id'],
                        'project_id': row['project_id'],
                        'file_name': row['file_name'],
                        'file_type': row['file_type'],
                        'file_size': row['file_size'],
                        'storage_type': row['storage_type'],
                        'local_path': row['local_path'],
                        'object_bucket': row['object_bucket'],
                        'object_key': row['object_key'],
                        'object_url': row['object_url'],
                        'category': row['category'],
                        'description': row['description'],
                        'uploaded_at': row['uploaded_at']
                    }
                return None
                
        except Exception as e:
            logger.error(f"获取文件记录失败: {e}")
            return None
    
    def delete_uploaded_file(self, file_id: int) -> Dict[str, Any]:
        """删除文件记录"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute('DELETE FROM uploaded_files WHERE id = ?', (file_id,))
                conn.commit()
                
                if cursor.rowcount > 0:
                    logger.info(f"文件记录删除成功: id={file_id}")
                    return {"success": True, "message": "文件记录删除成功"}
                else:
                    return {"success": False, "error": "文件记录不存在"}
                
        except Exception as e:
            logger.error(f"删除文件记录失败: {e}")
            return {"success": False, "error": str(e)}

# 全局实例
assessment_db = GTVAssessmentDatabase()

def save_assessment_to_database(assessment_data: Dict[str, Any], assessment_id: str = None) -> str:
    """保存评估结果到数据库的便捷函数"""
    return assessment_db.save_assessment(assessment_data, assessment_id)

def load_assessment_from_database(assessment_id: str) -> Optional[Dict[str, Any]]:
    """从数据库加载评估结果的便捷函数"""
    return assessment_db.get_assessment(assessment_id)

def list_all_assessments(limit: int = 50) -> List[Dict[str, Any]]:
    """列出所有评估结果的便捷函数"""
    return assessment_db.list_assessments(limit)
