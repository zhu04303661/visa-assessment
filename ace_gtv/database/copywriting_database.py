#!/usr/bin/env python3
"""
GTV签证文案系统本地数据库
使用SQLite存储项目、文档、案例等数据
"""

import sqlite3
import json
import os
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional
from contextlib import contextmanager
from pathlib import Path

from utils.logger_config import setup_module_logger

logger = setup_module_logger("copywriting_database", os.getenv("LOG_LEVEL", "INFO"))


class CopywritingDatabase:
    """文案系统本地SQLite数据库"""
    
    def __init__(self, db_path: str = None):
        """
        初始化数据库
        
        Args:
            db_path: 数据库文件路径
        """
        self.db_path = db_path or os.getenv("COPYWRITING_DB_PATH", "copywriting.db")
        self._init_database()
        logger.info(f"文案数据库初始化完成: {self.db_path}")
    
    @contextmanager
    def _get_connection(self):
        """获取数据库连接的上下文管理器"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()
    
    def _init_database(self):
        """初始化数据库表结构"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                # ==================== 项目表 ====================
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS projects (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        project_id TEXT UNIQUE NOT NULL,
                        case_id TEXT,
                        client_name TEXT NOT NULL,
                        visa_type TEXT DEFAULT 'GTV',
                        folder_name TEXT,
                        folder_path TEXT,
                        status TEXT DEFAULT 'created',
                        overall_progress INTEGER DEFAULT 0,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        metadata TEXT
                    )
                ''')
                
                # ==================== 材料包表 ====================
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS material_packages (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        project_id TEXT NOT NULL,
                        package_type TEXT NOT NULL,
                        name TEXT NOT NULL,
                        name_en TEXT,
                        description TEXT,
                        required INTEGER DEFAULT 1,
                        status TEXT DEFAULT 'pending',
                        progress INTEGER DEFAULT 0,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (project_id) REFERENCES projects (project_id),
                        UNIQUE(project_id, package_type)
                    )
                ''')
                
                # ==================== 原始材料表 ====================
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS raw_materials (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        project_id TEXT NOT NULL,
                        category TEXT NOT NULL,
                        filename TEXT NOT NULL,
                        file_path TEXT,
                        content TEXT,
                        file_size INTEGER DEFAULT 0,
                        file_type TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (project_id) REFERENCES projects (project_id)
                    )
                ''')
                
                # ==================== 生成文档表 ====================
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS generated_documents (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        project_id TEXT NOT NULL,
                        package_type TEXT NOT NULL,
                        stage TEXT NOT NULL,
                        filename TEXT NOT NULL,
                        file_path TEXT,
                        content TEXT,
                        version INTEGER DEFAULT 1,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (project_id) REFERENCES projects (project_id)
                    )
                ''')
                
                # ==================== 分析报告表 ====================
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS analysis_reports (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        project_id TEXT NOT NULL,
                        report_type TEXT NOT NULL,
                        filename TEXT NOT NULL,
                        file_path TEXT,
                        content TEXT,
                        analysis_data TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (project_id) REFERENCES projects (project_id)
                    )
                ''')
                
                # ==================== 工作流历史表 ====================
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS workflow_history (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        project_id TEXT NOT NULL,
                        action TEXT NOT NULL,
                        status TEXT,
                        details TEXT,
                        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (project_id) REFERENCES projects (project_id)
                    )
                ''')
                
                # ==================== 成功案例表 ====================
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS success_cases (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        case_id TEXT UNIQUE NOT NULL,
                        industry TEXT,
                        experience_level TEXT,
                        pathway TEXT,
                        education TEXT,
                        achievements TEXT,
                        applicant_profile TEXT,
                        background_summary TEXT,
                        success_factors TEXT,
                        key_takeaways TEXT,
                        document_samples TEXT,
                        tags TEXT,
                        match_keywords TEXT,
                        verified INTEGER DEFAULT 0,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                ''')
                
                # ==================== 案例匹配记录表 ====================
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS case_matches (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        project_id TEXT NOT NULL,
                        case_id TEXT NOT NULL,
                        match_score REAL,
                        match_number INTEGER,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (project_id) REFERENCES projects (project_id),
                        FOREIGN KEY (case_id) REFERENCES success_cases (case_id)
                    )
                ''')
                
                # ==================== 文档版本历史表 ====================
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS document_versions (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        project_id TEXT NOT NULL,
                        package_type TEXT NOT NULL,
                        version INTEGER NOT NULL,
                        content TEXT,
                        edit_type TEXT DEFAULT 'manual',
                        edit_summary TEXT,
                        editor TEXT DEFAULT 'user',
                        word_count INTEGER DEFAULT 0,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (project_id) REFERENCES projects (project_id),
                        UNIQUE(project_id, package_type, version)
                    )
                ''')
                
                # ==================== 材料包内容表 ====================
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS package_contents (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        project_id TEXT NOT NULL,
                        package_type TEXT NOT NULL,
                        current_version INTEGER DEFAULT 1,
                        content TEXT,
                        status TEXT DEFAULT 'draft',
                        last_edited_by TEXT DEFAULT 'user',
                        ai_generated INTEGER DEFAULT 0,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (project_id) REFERENCES projects (project_id),
                        UNIQUE(project_id, package_type)
                    )
                ''')
                
                # 创建索引
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_projects_status ON projects (status)')
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_projects_client ON projects (client_name)')
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_materials_project ON raw_materials (project_id)')
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_documents_project ON generated_documents (project_id)')
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_cases_industry ON success_cases (industry)')
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_cases_pathway ON success_cases (pathway)')
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_versions_project ON document_versions (project_id, package_type)')
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_package_contents ON package_contents (project_id, package_type)')
                
                conn.commit()
                logger.info("数据库表结构初始化完成")
                
        except Exception as e:
            logger.error(f"初始化数据库失败: {e}")
            raise
    
    # ==================== 项目管理 ====================
    
    def create_project(self, project_id: str, case_id: str, client_name: str,
                      visa_type: str, folder_name: str, folder_path: str,
                      metadata: Dict = None) -> Dict[str, Any]:
        """创建项目"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT INTO projects (project_id, case_id, client_name, visa_type, 
                                         folder_name, folder_path, metadata)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (project_id, case_id, client_name, visa_type, 
                      folder_name, folder_path, json.dumps(metadata or {})))
                
                logger.info(f"项目创建成功: {project_id}")
                return {"success": True, "project_id": project_id}
                
        except sqlite3.IntegrityError:
            return {"success": False, "error": "项目ID已存在"}
        except Exception as e:
            logger.error(f"创建项目失败: {e}")
            return {"success": False, "error": str(e)}
    
    def get_project(self, project_id: str = None, case_id: str = None) -> Dict[str, Any]:
        """获取项目"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                if project_id:
                    cursor.execute('SELECT * FROM projects WHERE project_id = ?', (project_id,))
                elif case_id:
                    cursor.execute('SELECT * FROM projects WHERE case_id = ?', (case_id,))
                else:
                    return {"success": False, "error": "需要提供project_id或case_id"}
                
                row = cursor.fetchone()
                if row:
                    data = dict(row)
                    if data.get('metadata'):
                        data['metadata'] = json.loads(data['metadata'])
                    
                    # 获取材料包状态
                    cursor.execute('SELECT * FROM material_packages WHERE project_id = ?', (data['project_id'],))
                    packages = {}
                    for pkg_row in cursor.fetchall():
                        pkg = dict(pkg_row)
                        packages[pkg['package_type']] = {
                            "name": pkg['name'],
                            "name_en": pkg['name_en'],
                            "description": pkg['description'],
                            "required": bool(pkg['required']),
                            "status": pkg['status'],
                            "progress": pkg['progress']
                        }
                    data['material_packages'] = packages
                    
                    # 获取最近的工作流历史
                    cursor.execute('''
                        SELECT action, status, details, timestamp 
                        FROM workflow_history 
                        WHERE project_id = ? 
                        ORDER BY timestamp DESC LIMIT 20
                    ''', (data['project_id'],))
                    data['workflow_history'] = [dict(h) for h in cursor.fetchall()]
                    
                    return {"success": True, "data": data, "path": data.get('folder_path')}
                
                return {"success": False, "error": "项目不存在"}
                
        except Exception as e:
            logger.error(f"获取项目失败: {e}")
            return {"success": False, "error": str(e)}
    
    def list_projects(self, limit: int = 100, status: str = None) -> Dict[str, Any]:
        """列出项目"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                if status:
                    cursor.execute('''
                        SELECT * FROM projects WHERE status = ? 
                        ORDER BY created_at DESC LIMIT ?
                    ''', (status, limit))
                else:
                    cursor.execute('''
                        SELECT * FROM projects ORDER BY created_at DESC LIMIT ?
                    ''', (limit,))
                
                projects = []
                for row in cursor.fetchall():
                    data = dict(row)
                    if data.get('metadata'):
                        data['metadata'] = json.loads(data['metadata'])
                    projects.append(data)
                
                return {"success": True, "data": projects, "total": len(projects)}
                
        except Exception as e:
            logger.error(f"列出项目失败: {e}")
            return {"success": False, "error": str(e), "data": []}
    
    def update_project_status(self, project_id: str, status: str, 
                             progress: int = None) -> Dict[str, Any]:
        """更新项目状态"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                if progress is not None:
                    cursor.execute('''
                        UPDATE projects 
                        SET status = ?, overall_progress = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE project_id = ?
                    ''', (status, progress, project_id))
                else:
                    cursor.execute('''
                        UPDATE projects 
                        SET status = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE project_id = ?
                    ''', (status, project_id))
                
                return {"success": True}
                
        except Exception as e:
            logger.error(f"更新项目状态失败: {e}")
            return {"success": False, "error": str(e)}
    
    # ==================== 材料包管理 ====================
    
    def init_material_packages(self, project_id: str, packages: Dict[str, Dict]) -> Dict[str, Any]:
        """初始化项目的材料包"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                for pkg_type, pkg_info in packages.items():
                    cursor.execute('''
                        INSERT OR REPLACE INTO material_packages 
                        (project_id, package_type, name, name_en, description, required)
                        VALUES (?, ?, ?, ?, ?, ?)
                    ''', (project_id, pkg_type, pkg_info.get('name'), 
                          pkg_info.get('name_en'), pkg_info.get('description'),
                          1 if pkg_info.get('required') else 0))
                
                return {"success": True}
                
        except Exception as e:
            logger.error(f"初始化材料包失败: {e}")
            return {"success": False, "error": str(e)}
    
    def update_package_status(self, project_id: str, package_type: str,
                             status: str, progress: int) -> Dict[str, Any]:
        """更新材料包状态"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    UPDATE material_packages 
                    SET status = ?, progress = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE project_id = ? AND package_type = ?
                ''', (status, progress, project_id, package_type))
                
                # 更新项目整体进度
                cursor.execute('''
                    SELECT AVG(progress) as avg_progress 
                    FROM material_packages 
                    WHERE project_id = ? AND required = 1
                ''', (project_id,))
                row = cursor.fetchone()
                if row and row['avg_progress']:
                    cursor.execute('''
                        UPDATE projects SET overall_progress = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE project_id = ?
                    ''', (int(row['avg_progress']), project_id))
                
                return {"success": True}
                
        except Exception as e:
            logger.error(f"更新材料包状态失败: {e}")
            return {"success": False, "error": str(e)}
    
    # ==================== 原始材料管理 ====================
    
    def add_raw_material(self, project_id: str, category: str, filename: str,
                        file_path: str = None, content: str = None,
                        file_size: int = 0, file_type: str = None) -> Dict[str, Any]:
        """添加原始材料"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT INTO raw_materials 
                    (project_id, category, filename, file_path, content, file_size, file_type)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (project_id, category, filename, file_path, content, file_size, file_type))
                
                material_id = cursor.lastrowid
                logger.info(f"原始材料添加成功: {filename}")
                return {"success": True, "material_id": material_id}
                
        except Exception as e:
            logger.error(f"添加原始材料失败: {e}")
            return {"success": False, "error": str(e)}
    
    def get_raw_materials(self, project_id: str) -> Dict[str, Any]:
        """获取项目的原始材料"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    SELECT * FROM raw_materials WHERE project_id = ? ORDER BY category, created_at
                ''', (project_id,))
                
                materials = {}
                for row in cursor.fetchall():
                    data = dict(row)
                    category = data['category']
                    if category not in materials:
                        materials[category] = []
                    materials[category].append({
                        "id": data['id'],
                        "name": data['filename'],
                        "path": data['file_path'],
                        "content": data['content'],
                        "size": data['file_size'],
                        "modified": data['created_at']
                    })
                
                return {"success": True, "data": materials}
                
        except Exception as e:
            logger.error(f"获取原始材料失败: {e}")
            return {"success": False, "error": str(e)}
    
    # ==================== 生成文档管理 ====================
    
    def save_document(self, project_id: str, package_type: str, stage: str,
                     filename: str, file_path: str, content: str) -> Dict[str, Any]:
        """保存生成的文档"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                # 检查是否存在，如果存在则更新版本
                cursor.execute('''
                    SELECT id, version FROM generated_documents 
                    WHERE project_id = ? AND package_type = ? AND stage = ? AND filename = ?
                ''', (project_id, package_type, stage, filename))
                
                existing = cursor.fetchone()
                if existing:
                    new_version = existing['version'] + 1
                    cursor.execute('''
                        UPDATE generated_documents 
                        SET content = ?, file_path = ?, version = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    ''', (content, file_path, new_version, existing['id']))
                    doc_id = existing['id']
                else:
                    cursor.execute('''
                        INSERT INTO generated_documents 
                        (project_id, package_type, stage, filename, file_path, content)
                        VALUES (?, ?, ?, ?, ?, ?)
                    ''', (project_id, package_type, stage, filename, file_path, content))
                    doc_id = cursor.lastrowid
                
                # 更新材料包状态
                progress_map = {"draft": 33, "optimized": 66, "final": 100}
                status_map = {"draft": "draft", "optimized": "optimized", "final": "completed"}
                
                if stage in progress_map:
                    self.update_package_status(
                        project_id, package_type,
                        status_map[stage], progress_map[stage]
                    )
                
                logger.info(f"文档保存成功: {filename}")
                return {"success": True, "document_id": doc_id}
                
        except Exception as e:
            logger.error(f"保存文档失败: {e}")
            return {"success": False, "error": str(e)}
    
    def get_documents(self, project_id: str, stage: str = None) -> Dict[str, Any]:
        """获取项目的文档"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                if stage:
                    cursor.execute('''
                        SELECT * FROM generated_documents 
                        WHERE project_id = ? AND stage = ?
                        ORDER BY package_type, created_at
                    ''', (project_id, stage))
                else:
                    cursor.execute('''
                        SELECT * FROM generated_documents 
                        WHERE project_id = ?
                        ORDER BY stage, package_type, created_at
                    ''', (project_id,))
                
                documents = {}
                for row in cursor.fetchall():
                    data = dict(row)
                    stage_name = data['stage']
                    pkg_type = data['package_type']
                    
                    if stage_name not in documents:
                        documents[stage_name] = {}
                    if pkg_type not in documents[stage_name]:
                        documents[stage_name][pkg_type] = []
                    
                    documents[stage_name][pkg_type].append({
                        "id": data['id'],
                        "name": data['filename'],
                        "path": data['file_path'],
                        "content": data['content'],
                        "version": data['version'],
                        "modified": data['updated_at']
                    })
                
                return {"success": True, "data": documents}
                
        except Exception as e:
            logger.error(f"获取文档失败: {e}")
            return {"success": False, "error": str(e)}
    
    def get_document_content(self, project_id: str, doc_path: str) -> Dict[str, Any]:
        """获取文档内容"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                # 解析路径
                parts = doc_path.split('/')
                if len(parts) >= 3:
                    stage = parts[0]
                    package_type = parts[1]
                    filename = parts[2]
                    
                    cursor.execute('''
                        SELECT * FROM generated_documents 
                        WHERE project_id = ? AND stage = ? AND package_type = ? AND filename = ?
                    ''', (project_id, stage, package_type, filename))
                else:
                    cursor.execute('''
                        SELECT * FROM generated_documents 
                        WHERE project_id = ? AND filename LIKE ?
                    ''', (project_id, f'%{doc_path}%'))
                
                row = cursor.fetchone()
                if row:
                    return {
                        "success": True,
                        "data": {
                            "path": doc_path,
                            "content": row['content'],
                            "version": row['version'],
                            "modified": row['updated_at']
                        }
                    }
                
                return {"success": False, "error": "文档不存在"}
                
        except Exception as e:
            logger.error(f"获取文档内容失败: {e}")
            return {"success": False, "error": str(e)}
    
    # ==================== 分析报告管理 ====================
    
    def save_analysis_report(self, project_id: str, report_type: str,
                            filename: str, file_path: str, content: str,
                            analysis_data: Dict = None) -> Dict[str, Any]:
        """保存分析报告"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT INTO analysis_reports 
                    (project_id, report_type, filename, file_path, content, analysis_data)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (project_id, report_type, filename, file_path, content,
                      json.dumps(analysis_data or {})))
                
                report_id = cursor.lastrowid
                return {"success": True, "report_id": report_id}
                
        except Exception as e:
            logger.error(f"保存分析报告失败: {e}")
            return {"success": False, "error": str(e)}
    
    def get_analysis_reports(self, project_id: str, 
                            report_type: str = None) -> Dict[str, Any]:
        """获取分析报告"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                if report_type:
                    cursor.execute('''
                        SELECT * FROM analysis_reports 
                        WHERE project_id = ? AND report_type = ?
                        ORDER BY created_at DESC
                    ''', (project_id, report_type))
                else:
                    cursor.execute('''
                        SELECT * FROM analysis_reports 
                        WHERE project_id = ?
                        ORDER BY report_type, created_at DESC
                    ''', (project_id,))
                
                reports = []
                for row in cursor.fetchall():
                    data = dict(row)
                    if data.get('analysis_data'):
                        data['analysis_data'] = json.loads(data['analysis_data'])
                    reports.append(data)
                
                return {"success": True, "data": reports}
                
        except Exception as e:
            logger.error(f"获取分析报告失败: {e}")
            return {"success": False, "error": str(e)}
    
    # ==================== 工作流历史 ====================
    
    def log_workflow_action(self, project_id: str, action: str,
                           status: str = None, details: str = None) -> Dict[str, Any]:
        """记录工作流操作"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT INTO workflow_history (project_id, action, status, details)
                    VALUES (?, ?, ?, ?)
                ''', (project_id, action, status, details))
                
                return {"success": True}
                
        except Exception as e:
            logger.error(f"记录工作流操作失败: {e}")
            return {"success": False, "error": str(e)}
    
    # ==================== 成功案例管理 ====================
    
    def add_success_case(self, case_data: Dict[str, Any]) -> Dict[str, Any]:
        """添加成功案例"""
        try:
            case_id = case_data.get('id') or str(uuid.uuid4())[:12].upper()
            
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT INTO success_cases 
                    (case_id, industry, experience_level, pathway, education, 
                     achievements, applicant_profile, background_summary, 
                     success_factors, key_takeaways, document_samples, 
                     tags, match_keywords, verified)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    case_id,
                    case_data.get('industry'),
                    case_data.get('experience_level'),
                    case_data.get('pathway'),
                    case_data.get('education'),
                    json.dumps(case_data.get('achievements', [])),
                    json.dumps(case_data.get('applicant_profile', {})),
                    case_data.get('background_summary'),
                    case_data.get('success_factors'),
                    case_data.get('key_takeaways'),
                    json.dumps(case_data.get('document_samples', {})),
                    json.dumps(case_data.get('tags', [])),
                    json.dumps(case_data.get('match_keywords', [])),
                    1 if case_data.get('verified') else 0
                ))
                
                logger.info(f"成功案例添加: {case_id}")
                return {"success": True, "case_id": case_id}
                
        except sqlite3.IntegrityError:
            return {"success": False, "error": "案例ID已存在"}
        except Exception as e:
            logger.error(f"添加成功案例失败: {e}")
            return {"success": False, "error": str(e)}
    
    def get_success_case(self, case_id: str) -> Dict[str, Any]:
        """获取成功案例"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                cursor.execute('SELECT * FROM success_cases WHERE case_id = ?', (case_id,))
                row = cursor.fetchone()
                
                if row:
                    data = self._parse_case_row(row)
                    return {"success": True, "data": data}
                
                return {"success": False, "error": "案例不存在"}
                
        except Exception as e:
            logger.error(f"获取成功案例失败: {e}")
            return {"success": False, "error": str(e)}
    
    def _parse_case_row(self, row) -> Dict[str, Any]:
        """解析案例行数据"""
        data = dict(row)
        data['id'] = data.pop('case_id')
        
        # 解析JSON字段
        for field in ['achievements', 'applicant_profile', 'document_samples', 'tags', 'match_keywords']:
            if data.get(field):
                try:
                    data[field] = json.loads(data[field])
                except:
                    pass
        
        data['verified'] = bool(data.get('verified'))
        return data
    
    def search_cases(self, filters: Dict = None, keywords: List[str] = None,
                    limit: int = 10) -> Dict[str, Any]:
        """搜索案例"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                query = 'SELECT * FROM success_cases WHERE 1=1'
                params = []
                
                if filters:
                    if filters.get('industry'):
                        query += ' AND industry = ?'
                        params.append(filters['industry'])
                    if filters.get('pathway'):
                        query += ' AND pathway = ?'
                        params.append(filters['pathway'])
                    if filters.get('experience_level'):
                        query += ' AND experience_level = ?'
                        params.append(filters['experience_level'])
                    if filters.get('education'):
                        query += ' AND education = ?'
                        params.append(filters['education'])
                
                if keywords:
                    keyword_conditions = []
                    for kw in keywords:
                        keyword_conditions.append('(match_keywords LIKE ? OR tags LIKE ?)')
                        params.extend([f'%{kw}%', f'%{kw}%'])
                    if keyword_conditions:
                        query += ' AND (' + ' OR '.join(keyword_conditions) + ')'
                
                query += ' LIMIT ?'
                params.append(limit)
                
                cursor.execute(query, params)
                
                cases = [self._parse_case_row(row) for row in cursor.fetchall()]
                return {"success": True, "data": cases, "total": len(cases)}
                
        except Exception as e:
            logger.error(f"搜索案例失败: {e}")
            return {"success": False, "error": str(e), "data": []}
    
    def list_cases(self, page: int = 1, page_size: int = 20) -> Dict[str, Any]:
        """列出案例"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                # 获取总数
                cursor.execute('SELECT COUNT(*) as count FROM success_cases')
                total = cursor.fetchone()['count']
                
                # 分页查询
                offset = (page - 1) * page_size
                cursor.execute('''
                    SELECT * FROM success_cases 
                    ORDER BY created_at DESC 
                    LIMIT ? OFFSET ?
                ''', (page_size, offset))
                
                cases = [self._parse_case_row(row) for row in cursor.fetchall()]
                
                return {
                    "success": True,
                    "data": cases,
                    "page": page,
                    "page_size": page_size,
                    "total": total,
                    "total_pages": (total + page_size - 1) // page_size
                }
                
        except Exception as e:
            logger.error(f"列出案例失败: {e}")
            return {"success": False, "error": str(e), "data": []}
    
    def get_case_statistics(self) -> Dict[str, Any]:
        """获取案例统计"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                # 总数
                cursor.execute('SELECT COUNT(*) as count FROM success_cases')
                total = cursor.fetchone()['count']
                
                # 按行业统计
                cursor.execute('''
                    SELECT industry, COUNT(*) as count 
                    FROM success_cases 
                    GROUP BY industry
                ''')
                by_industry = {row['industry']: row['count'] for row in cursor.fetchall()}
                
                # 按路径统计
                cursor.execute('''
                    SELECT pathway, COUNT(*) as count 
                    FROM success_cases 
                    GROUP BY pathway
                ''')
                by_pathway = {row['pathway']: row['count'] for row in cursor.fetchall()}
                
                # 按经验统计
                cursor.execute('''
                    SELECT experience_level, COUNT(*) as count 
                    FROM success_cases 
                    GROUP BY experience_level
                ''')
                by_experience = {row['experience_level']: row['count'] for row in cursor.fetchall()}
                
                # 按教育统计
                cursor.execute('''
                    SELECT education, COUNT(*) as count 
                    FROM success_cases 
                    GROUP BY education
                ''')
                by_education = {row['education']: row['count'] for row in cursor.fetchall()}
                
                return {
                    "success": True,
                    "data": {
                        "total_count": total,
                        "statistics": {
                            "by_industry": by_industry,
                            "by_pathway": by_pathway,
                            "by_experience": by_experience,
                            "by_education": by_education
                        }
                    }
                }
                
        except Exception as e:
            logger.error(f"获取案例统计失败: {e}")
            return {"success": False, "error": str(e)}
    
    def save_case_match(self, project_id: str, case_id: str, 
                       match_score: float, match_number: int) -> Dict[str, Any]:
        """保存案例匹配记录"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT INTO case_matches (project_id, case_id, match_score, match_number)
                    VALUES (?, ?, ?, ?)
                ''', (project_id, case_id, match_score, match_number))
                
                return {"success": True}
                
        except Exception as e:
            logger.error(f"保存案例匹配失败: {e}")
            return {"success": False, "error": str(e)}
    
    def get_matched_cases(self, project_id: str) -> Dict[str, Any]:
        """获取项目匹配的案例"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    SELECT cm.*, sc.*
                    FROM case_matches cm
                    JOIN success_cases sc ON cm.case_id = sc.case_id
                    WHERE cm.project_id = ?
                    ORDER BY cm.match_number
                ''', (project_id,))
                
                cases = []
                for row in cursor.fetchall():
                    case = self._parse_case_row(row)
                    case['match_score'] = row['match_score']
                    cases.append(case)
                
                return {"success": True, "data": cases}
                
        except Exception as e:
            logger.error(f"获取匹配案例失败: {e}")
            return {"success": False, "error": str(e), "data": []}
    
    # ==================== 材料包内容和版本管理 ====================
    
    def get_package_content(self, project_id: str, package_type: str) -> Dict[str, Any]:
        """获取材料包当前内容"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    SELECT * FROM package_contents 
                    WHERE project_id = ? AND package_type = ?
                ''', (project_id, package_type))
                
                row = cursor.fetchone()
                if row:
                    return {
                        "success": True,
                        "data": {
                            "id": row['id'],
                            "project_id": row['project_id'],
                            "package_type": row['package_type'],
                            "current_version": row['current_version'],
                            "content": row['content'],
                            "status": row['status'],
                            "last_edited_by": row['last_edited_by'],
                            "ai_generated": bool(row['ai_generated']),
                            "created_at": row['created_at'],
                            "updated_at": row['updated_at']
                        }
                    }
                
                return {"success": True, "data": None}
                
        except Exception as e:
            logger.error(f"获取材料包内容失败: {e}")
            return {"success": False, "error": str(e)}
    
    def save_package_content(self, project_id: str, package_type: str, content: str,
                            edit_type: str = "manual", edit_summary: str = None,
                            editor: str = "user") -> Dict[str, Any]:
        """保存材料包内容（自动创建新版本）"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                # 获取当前版本
                cursor.execute('''
                    SELECT current_version, content FROM package_contents 
                    WHERE project_id = ? AND package_type = ?
                ''', (project_id, package_type))
                
                row = cursor.fetchone()
                
                if row:
                    # 如果内容相同，不创建新版本
                    if row['content'] == content:
                        return {"success": True, "message": "内容未变化", "version": row['current_version']}
                    
                    new_version = row['current_version'] + 1
                    
                    # 更新当前内容
                    cursor.execute('''
                        UPDATE package_contents 
                        SET content = ?, current_version = ?, last_edited_by = ?,
                            ai_generated = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE project_id = ? AND package_type = ?
                    ''', (content, new_version, editor, 1 if edit_type == "ai" else 0,
                          project_id, package_type))
                else:
                    new_version = 1
                    
                    # 创建新记录
                    cursor.execute('''
                        INSERT INTO package_contents 
                        (project_id, package_type, current_version, content, last_edited_by, ai_generated)
                        VALUES (?, ?, ?, ?, ?, ?)
                    ''', (project_id, package_type, new_version, content, editor,
                          1 if edit_type == "ai" else 0))
                
                # 保存版本历史
                word_count = len(content.split()) if content else 0
                cursor.execute('''
                    INSERT INTO document_versions 
                    (project_id, package_type, version, content, edit_type, edit_summary, editor, word_count)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (project_id, package_type, new_version, content, edit_type, 
                      edit_summary or f"版本 {new_version}", editor, word_count))
                
                # 更新材料包状态
                self.update_package_status(project_id, package_type, "draft", 
                                          min(33 + new_version * 10, 100))
                
                logger.info(f"材料包内容保存成功: {project_id}/{package_type} v{new_version}")
                
                return {
                    "success": True,
                    "version": new_version,
                    "message": f"已保存为版本 {new_version}"
                }
                
        except Exception as e:
            logger.error(f"保存材料包内容失败: {e}")
            return {"success": False, "error": str(e)}
    
    def get_version_history(self, project_id: str, package_type: str) -> Dict[str, Any]:
        """获取版本历史"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    SELECT * FROM document_versions 
                    WHERE project_id = ? AND package_type = ?
                    ORDER BY version DESC
                ''', (project_id, package_type))
                
                versions = []
                for row in cursor.fetchall():
                    versions.append({
                        "id": row['id'],
                        "version": row['version'],
                        "edit_type": row['edit_type'],
                        "edit_summary": row['edit_summary'],
                        "editor": row['editor'],
                        "word_count": row['word_count'],
                        "created_at": row['created_at'],
                        "content_preview": row['content'][:200] + "..." if row['content'] and len(row['content']) > 200 else row['content']
                    })
                
                return {"success": True, "data": versions, "total": len(versions)}
                
        except Exception as e:
            logger.error(f"获取版本历史失败: {e}")
            return {"success": False, "error": str(e), "data": []}
    
    def get_version_content(self, project_id: str, package_type: str, 
                           version: int) -> Dict[str, Any]:
        """获取特定版本的内容"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    SELECT * FROM document_versions 
                    WHERE project_id = ? AND package_type = ? AND version = ?
                ''', (project_id, package_type, version))
                
                row = cursor.fetchone()
                if row:
                    return {
                        "success": True,
                        "data": {
                            "version": row['version'],
                            "content": row['content'],
                            "edit_type": row['edit_type'],
                            "edit_summary": row['edit_summary'],
                            "editor": row['editor'],
                            "word_count": row['word_count'],
                            "created_at": row['created_at']
                        }
                    }
                
                return {"success": False, "error": "版本不存在"}
                
        except Exception as e:
            logger.error(f"获取版本内容失败: {e}")
            return {"success": False, "error": str(e)}
    
    def rollback_to_version(self, project_id: str, package_type: str, 
                           version: int) -> Dict[str, Any]:
        """回滚到特定版本"""
        try:
            # 获取目标版本内容
            version_result = self.get_version_content(project_id, package_type, version)
            if not version_result.get("success"):
                return version_result
            
            content = version_result["data"]["content"]
            
            # 保存为新版本（回滚操作也创建新版本）
            return self.save_package_content(
                project_id, package_type, content,
                edit_type="rollback",
                edit_summary=f"回滚到版本 {version}",
                editor="user"
            )
            
        except Exception as e:
            logger.error(f"版本回滚失败: {e}")
            return {"success": False, "error": str(e)}
    
    def get_all_package_contents(self, project_id: str) -> Dict[str, Any]:
        """获取项目所有材料包的内容概览"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    SELECT pc.*, 
                           (SELECT COUNT(*) FROM document_versions dv 
                            WHERE dv.project_id = pc.project_id 
                            AND dv.package_type = pc.package_type) as version_count
                    FROM package_contents pc
                    WHERE pc.project_id = ?
                ''', (project_id,))
                
                packages = {}
                for row in cursor.fetchall():
                    packages[row['package_type']] = {
                        "current_version": row['current_version'],
                        "status": row['status'],
                        "last_edited_by": row['last_edited_by'],
                        "ai_generated": bool(row['ai_generated']),
                        "updated_at": row['updated_at'],
                        "version_count": row['version_count'],
                        "has_content": bool(row['content']),
                        "word_count": len(row['content'].split()) if row['content'] else 0
                    }
                
                return {"success": True, "data": packages}
                
        except Exception as e:
            logger.error(f"获取材料包概览失败: {e}")
            return {"success": False, "error": str(e), "data": {}}

    def add_sample_cases(self) -> Dict[str, Any]:
        """添加示例案例"""
        sample_cases = [
            {
                "industry": "人工智能/机器学习",
                "experience_level": "高级（5-10年）",
                "pathway": "Exceptional Talent",
                "education": "硕士",
                "achievements": ["开源项目贡献", "技术发明/专利", "学术论文发表"],
                "applicant_profile": {"nationality": "中国", "age_range": "25-30", "current_role": "高级软件工程师"},
                "background_summary": "申请人是一位在AI/ML领域有8年经验的资深工程师。\n- 在知名科技公司担任技术负责人\n- 参与多个开源AI项目，获得2000+ GitHub Stars\n- 发表3篇机器学习相关论文\n- 拥有2项AI相关专利",
                "success_factors": "1. 强大的技术影响力：开源项目被广泛使用\n2. 学术和产业双重背景：论文发表+产品落地\n3. 清晰的职业发展规划：展示了在英国的具体发展计划\n4. 高质量推荐信：来自行业知名人士",
                "key_takeaways": "- 个人陈述重点突出技术创新和社区贡献\n- 推荐信强调国际影响力和领导能力\n- 证据材料包括代码贡献、论文引用、专利证书\n- 展示了对英国AI生态的了解和贡献计划",
                "tags": ["AI", "机器学习", "开源", "高级工程师"],
                "match_keywords": ["人工智能", "机器学习", "软件工程", "开源贡献", "论文发表"],
                "verified": True
            },
            {
                "industry": "金融科技",
                "experience_level": "高级（5-10年）",
                "pathway": "Exceptional Promise",
                "education": "MBA",
                "achievements": ["创业经历", "产品影响力", "领导力/管理"],
                "applicant_profile": {"nationality": "印度", "age_range": "30-35", "current_role": "创业者/CTO"},
                "background_summary": "申请人是一位金融科技创业者，联合创办了一家支付科技公司。\n- 公司获得A轮融资500万美元\n- 产品服务超过10万用户\n- 团队规模从2人发展到30人",
                "success_factors": "1. 创业成功经历：融资和用户增长\n2. 领导力证明：团队扩张和管理\n3. 行业影响力：被行业媒体报道\n4. 明确的英国发展计划",
                "key_takeaways": "- 强调创业成就和商业影响\n- 推荐信来自投资人和行业顾问\n- 展示产品数据和用户反馈\n- 商业计划书清晰可行",
                "tags": ["金融科技", "创业", "支付", "CTO"],
                "match_keywords": ["fintech", "创业者", "融资", "产品管理", "团队管理"],
                "verified": True
            },
            {
                "industry": "数据科学/大数据",
                "experience_level": "中级（3-5年）",
                "pathway": "Exceptional Promise",
                "education": "硕士",
                "achievements": ["学术论文发表", "开源项目贡献", "行业奖项"],
                "applicant_profile": {"nationality": "中国", "age_range": "25-30", "current_role": "数据科学家"},
                "background_summary": "申请人是数据科学领域的新锐人才。\n- 发表2篇顶级会议论文（NeurIPS, ICML）\n- Kaggle Master称号\n- 参与多个开源数据科学项目",
                "success_factors": "1. 学术成就突出：顶会论文\n2. 实践能力强：Kaggle比赛成绩\n3. 社区活跃：开源贡献和技术分享\n4. 发展潜力：年轻但成就显著",
                "key_takeaways": "- Promise路径适合早期职业阶段\n- 重点展示潜力和发展轨迹\n- 学术成就+实践能力结合\n- 推荐信强调成长速度",
                "tags": ["数据科学", "机器学习", "Kaggle", "学术"],
                "match_keywords": ["数据科学", "机器学习", "论文", "Kaggle", "研究"],
                "verified": True
            }
        ]
        
        results = []
        for case_data in sample_cases:
            result = self.add_success_case(case_data)
            results.append(result)
        
        added_count = sum(1 for r in results if r.get("success"))
        return {
            "success": True,
            "added_count": added_count,
            "results": results
        }


# 测试代码
if __name__ == "__main__":
    db = CopywritingDatabase("test_copywriting.db")
    
    # 测试添加示例案例
    result = db.add_sample_cases()
    print(f"添加示例案例: {result['added_count']} 个")
    
    # 测试创建项目
    project_result = db.create_project(
        project_id="TEST001",
        case_id="case-001",
        client_name="测试用户",
        visa_type="GTV",
        folder_name="test_folder",
        folder_path="/tmp/test"
    )
    print(f"创建项目: {project_result}")
    
    # 测试获取统计
    stats = db.get_case_statistics()
    print(f"案例统计: {stats}")
