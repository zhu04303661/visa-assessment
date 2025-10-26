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
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class GTVAssessmentDatabase:
    """GTV签证评估结果数据库管理器"""
    
    def __init__(self, db_path: str = "assessments.db"):
        self.db_path = db_path
        self._init_database()
    
    def _init_database(self):
        """初始化数据库表结构"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                # 创建评估结果主表
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
                
                # 创建评估标准详情表
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS criteria_assessments (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        assessment_id TEXT NOT NULL,
                        criterion_name TEXT NOT NULL,
                        score INTEGER,
                        comments TEXT,
                        FOREIGN KEY (assessment_id) REFERENCES assessments (assessment_id)
                    )
                ''')
                
                # 创建优势分析表
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS strengths (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        assessment_id TEXT NOT NULL,
                        description TEXT NOT NULL,
                        FOREIGN KEY (assessment_id) REFERENCES assessments (assessment_id)
                    )
                ''')
                
                # 创建需要改进的地方表
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS weaknesses (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        assessment_id TEXT NOT NULL,
                        description TEXT NOT NULL,
                        FOREIGN KEY (assessment_id) REFERENCES assessments (assessment_id)
                    )
                ''')
                
                # 创建专业建议表
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS professional_advice (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        assessment_id TEXT NOT NULL,
                        advice TEXT NOT NULL,
                        FOREIGN KEY (assessment_id) REFERENCES assessments (assessment_id)
                    )
                ''')
                
                # 创建所需文件表
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS required_documents (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        assessment_id TEXT NOT NULL,
                        document TEXT NOT NULL,
                        FOREIGN KEY (assessment_id) REFERENCES assessments (assessment_id)
                    )
                ''')
                
                # 创建教育背景表
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS education_background (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        assessment_id TEXT NOT NULL,
                        degree TEXT,
                        institution TEXT,
                        field_of_study TEXT,
                        graduation_year INTEGER,
                        FOREIGN KEY (assessment_id) REFERENCES assessments (assessment_id)
                    )
                ''')
                
                # 创建工作经历表
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS work_experience (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        assessment_id TEXT NOT NULL,
                        position TEXT,
                        company TEXT,
                        start_date TEXT,
                        end_date TEXT,
                        description TEXT,
                        FOREIGN KEY (assessment_id) REFERENCES assessments (assessment_id)
                    )
                ''')
                
                # 创建技能专长表
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS skills (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        assessment_id TEXT NOT NULL,
                        skill TEXT NOT NULL,
                        FOREIGN KEY (assessment_id) REFERENCES assessments (assessment_id)
                    )
                ''')
                
                # 创建成就荣誉表
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS achievements (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        assessment_id TEXT NOT NULL,
                        achievement TEXT NOT NULL,
                        FOREIGN KEY (assessment_id) REFERENCES assessments (assessment_id)
                    )
                ''')
                
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
        """保存评估结果到数据库"""
        try:
            if not assessment_id:
                assessment_id = f"GTV_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                # 提取基本信息
                applicant_info = assessment_data.get('applicantInfo', {})
                gtv_pathway = assessment_data.get('gtvPathway', {})
                estimated_budget = assessment_data.get('estimatedBudget', {})
                
                # 插入主表数据
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
                
                # 保存评估标准详情
                criteria_assessment = assessment_data.get('criteriaAssessment', [])
                for criterion in criteria_assessment:
                    cursor.execute('''
                        INSERT INTO criteria_assessments (assessment_id, criterion_name, score, comments)
                        VALUES (?, ?, ?, ?)
                    ''', (
                        assessment_id,
                        criterion.get('name', ''),
                        criterion.get('score', 0),
                        criterion.get('comments', '')
                    ))
                
                # 保存优势分析
                strengths = assessment_data.get('strengths', [])
                for strength in strengths:
                    cursor.execute('''
                        INSERT INTO strengths (assessment_id, description)
                        VALUES (?, ?)
                    ''', (assessment_id, strength.get('description', '')))
                
                # 保存需要改进的地方
                weaknesses = assessment_data.get('weaknesses', [])
                for weakness in weaknesses:
                    cursor.execute('''
                        INSERT INTO weaknesses (assessment_id, description)
                        VALUES (?, ?)
                    ''', (assessment_id, weakness.get('description', '')))
                
                # 保存专业建议
                professional_advice = assessment_data.get('professionalAdvice', [])
                for advice in professional_advice:
                    cursor.execute('''
                        INSERT INTO professional_advice (assessment_id, advice)
                        VALUES (?, ?)
                    ''', (assessment_id, advice))
                
                # 保存所需文件
                required_documents = assessment_data.get('requiredDocuments', [])
                for document in required_documents:
                    cursor.execute('''
                        INSERT INTO required_documents (assessment_id, document)
                        VALUES (?, ?)
                    ''', (assessment_id, document))
                
                # 保存教育背景
                education_background = assessment_data.get('educationBackground', {})
                if education_background:
                    cursor.execute('''
                        INSERT INTO education_background (
                            assessment_id, degree, institution, field_of_study, graduation_year
                        ) VALUES (?, ?, ?, ?, ?)
                    ''', (
                        assessment_id,
                        education_background.get('degree', ''),
                        education_background.get('institution', ''),
                        education_background.get('fieldOfStudy', ''),
                        education_background.get('graduationYear', 0)
                    ))
                
                # 保存工作经历
                work_experience = assessment_data.get('workExperience', [])
                for work in work_experience:
                    cursor.execute('''
                        INSERT INTO work_experience (
                            assessment_id, position, company, start_date, end_date, description
                        ) VALUES (?, ?, ?, ?, ?, ?)
                    ''', (
                        assessment_id,
                        work.get('position', ''),
                        work.get('company', ''),
                        work.get('startDate', ''),
                        work.get('endDate', ''),
                        work.get('description', '')
                    ))
                
                # 保存技能专长
                skills = assessment_data.get('skills', [])
                for skill in skills:
                    cursor.execute('''
                        INSERT INTO skills (assessment_id, skill)
                        VALUES (?, ?)
                    ''', (assessment_id, skill))
                
                # 保存成就荣誉
                achievements = assessment_data.get('achievements', [])
                for achievement in achievements:
                    cursor.execute('''
                        INSERT INTO achievements (assessment_id, achievement)
                        VALUES (?, ?)
                    ''', (assessment_id, achievement))
                
                conn.commit()
                logger.info(f"评估结果已保存到数据库: {assessment_id}")
                return assessment_id
                
        except Exception as e:
            logger.error(f"保存评估结果到数据库失败: {e}")
            raise
    
    def get_assessment(self, assessment_id: str) -> Optional[Dict[str, Any]]:
        """从数据库获取评估结果"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                # 获取主表数据
                cursor.execute('SELECT * FROM assessments WHERE assessment_id = ?', (assessment_id,))
                assessment_row = cursor.fetchone()
                
                if not assessment_row:
                    return None
                
                # 构建评估数据
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
                
                # 获取评估标准详情
                cursor.execute('SELECT * FROM criteria_assessments WHERE assessment_id = ?', (assessment_id,))
                criteria_rows = cursor.fetchall()
                assessment_data['criteriaAssessment'] = [
                    {
                        'name': row['criterion_name'],
                        'score': row['score'],
                        'comments': row['comments']
                    }
                    for row in criteria_rows
                ]
                
                # 获取优势分析
                cursor.execute('SELECT * FROM strengths WHERE assessment_id = ?', (assessment_id,))
                strength_rows = cursor.fetchall()
                assessment_data['strengths'] = [
                    {'description': row['description']}
                    for row in strength_rows
                ]
                
                # 获取需要改进的地方
                cursor.execute('SELECT * FROM weaknesses WHERE assessment_id = ?', (assessment_id,))
                weakness_rows = cursor.fetchall()
                assessment_data['weaknesses'] = [
                    {'description': row['description']}
                    for row in weakness_rows
                ]
                
                # 获取专业建议
                cursor.execute('SELECT * FROM professional_advice WHERE assessment_id = ?', (assessment_id,))
                advice_rows = cursor.fetchall()
                assessment_data['professionalAdvice'] = [row['advice'] for row in advice_rows]
                
                # 获取所需文件
                cursor.execute('SELECT * FROM required_documents WHERE assessment_id = ?', (assessment_id,))
                document_rows = cursor.fetchall()
                assessment_data['requiredDocuments'] = [row['document'] for row in document_rows]
                
                # 获取教育背景
                cursor.execute('SELECT * FROM education_background WHERE assessment_id = ?', (assessment_id,))
                education_row = cursor.fetchone()
                if education_row:
                    assessment_data['educationBackground'] = {
                        'degree': education_row['degree'],
                        'institution': education_row['institution'],
                        'fieldOfStudy': education_row['field_of_study'],
                        'graduationYear': education_row['graduation_year']
                    }
                
                # 获取工作经历
                cursor.execute('SELECT * FROM work_experience WHERE assessment_id = ?', (assessment_id,))
                work_rows = cursor.fetchall()
                assessment_data['workExperience'] = [
                    {
                        'position': row['position'],
                        'company': row['company'],
                        'startDate': row['start_date'],
                        'endDate': row['end_date'],
                        'description': row['description']
                    }
                    for row in work_rows
                ]
                
                # 获取技能专长
                cursor.execute('SELECT * FROM skills WHERE assessment_id = ?', (assessment_id,))
                skill_rows = cursor.fetchall()
                assessment_data['skills'] = [row['skill'] for row in skill_rows]
                
                # 获取成就荣誉
                cursor.execute('SELECT * FROM achievements WHERE assessment_id = ?', (assessment_id,))
                achievement_rows = cursor.fetchall()
                assessment_data['achievements'] = [row['achievement'] for row in achievement_rows]
                
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
                
                # 删除相关表数据
                tables = [
                    'criteria_assessments', 'strengths', 'weaknesses',
                    'professional_advice', 'required_documents',
                    'education_background', 'work_experience',
                    'skills', 'achievements'
                ]
                
                for table in tables:
                    cursor.execute(f'DELETE FROM {table} WHERE assessment_id = ?', (assessment_id,))
                
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
